import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyToken } from '../../utils/jwt';
import logger from '../../utils/logger';
import { parse as parseCookies } from 'cookie';
import sessionService from '../../services/session.service';
import prisma from '../../services/database';

// Cookie name for access token (must match auth.ts)
const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Socket.IO authentication middleware
 * Supports multiple auth methods with proper fallback:
 * 1. Session token from handshake auth (localStorage token)
 * 2. JWT from httpOnly cookies (preferred for browser clients)
 * 3. JWT from handshake auth (if session fails)
 *
 * CRITICAL: When session token validation fails, we must also try the
 * httpOnly cookie JWT, not just retry JWT validation with the same token.
 */
export async function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> {
  try {
    // Extract all possible token sources upfront
    const authToken = socket.handshake.auth.token;
    const queryToken = socket.handshake.query.token;
    const cookieHeader = socket.handshake.headers.cookie;

    // Parse cookies to get httpOnly JWT (if available)
    let cookieJwt: string | undefined;
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      cookieJwt = cookies[ACCESS_TOKEN_COOKIE];
    }

    logger.info('🔌 [SOCKET AUTH] Connection attempt', {
      socketId: socket.id,
      hasAuthToken: !!authToken,
      authTokenType: typeof authToken,
      authTokenLength: authToken ? String(authToken).length : 0,
      hasQueryToken: !!queryToken,
      hasCookieHeader: !!cookieHeader,
      hasCookieJwt: !!cookieJwt,
      cookieJwtLength: cookieJwt ? cookieJwt.length : 0,
      origin: socket.handshake.headers.origin,
    });

    // Get primary token from handshake auth or query params
    let token = authToken || queryToken;
    let tokenSource = authToken ? 'auth' : (queryToken ? 'query' : 'none');

    // If no token in auth/query, use cookie JWT as primary token
    if (!token && cookieJwt) {
      token = cookieJwt;
      tokenSource = 'cookie';
      logger.info('🔌 [SOCKET AUTH] Using cookie JWT as primary token', {
        socketId: socket.id,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
      });
    }

    if (!token || typeof token !== 'string') {
      logger.warn('🔌 [SOCKET AUTH] Connection rejected - no token', {
        socketId: socket.id,
        hasCookies: !!cookieHeader,
        hasAuthToken: !!authToken,
        hasQueryToken: !!queryToken,
        tokenSource,
      });
      return next(new Error('Authentication token required'));
    }

    logger.info('🔌 [SOCKET AUTH] Token found', {
      socketId: socket.id,
      tokenSource,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    });

    // Try session-based authentication first (if token looks like a session token)
    // Session tokens are typically short base64 strings (43 chars), JWTs are much longer (100+)
    const looksLikeSessionToken = token.length < 100 && !token.includes('.');

    // Helper function to validate session token and get user
    const validateSessionToken = async (sessionToken: string, source: string): Promise<boolean> => {
      try {
        const sessionData = await sessionService.validateSession(sessionToken);

        logger.info('🔌 [SOCKET AUTH] Session validation result', {
          socketId: socket.id,
          source,
          hasSessionData: !!sessionData,
          userId: sessionData?.userId,
        });

        if (sessionData && sessionData.userId) {
          // Session auth successful - get user details
          const user = await prisma.user.findUnique({
            where: { id: sessionData.userId },
            select: {
              id: true,
              email: true,
              roles: true,
              firstName: true,
              lastName: true,
            },
          });

          if (user && user.id) {
            socket.data.userId = user.id;
            socket.data.email = user.email;
            socket.data.roles = user.roles;
            socket.data.authType = 'session';

            logger.info('🔌 [SOCKET AUTH] ✅ Authenticated via session', {
              socketId: socket.id,
              userId: user.id,
              email: user.email,
              source,
            });

            return true;
          } else {
            logger.warn('🔌 [SOCKET AUTH] Session valid but user not found', {
              socketId: socket.id,
              userId: sessionData.userId,
            });
          }
        }
      } catch (sessionError) {
        logger.warn('🔌 [SOCKET AUTH] Session validation failed', {
          socketId: socket.id,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown',
          source,
        });
      }
      return false;
    };

    if (looksLikeSessionToken) {
      logger.info('🔌 [SOCKET AUTH] Token looks like session token, attempting session validation', {
        socketId: socket.id,
        tokenSource,
        tokenLength: token.length,
      });

      // Try auth/query token first
      if (await validateSessionToken(token, tokenSource)) {
        return next();
      }

      // Try cookie session token as fallback (cookie also stores session token, not JWT!)
      if (cookieJwt && cookieJwt !== token) {
        const cookieLooksLikeSession = cookieJwt.length < 100 && !cookieJwt.includes('.');
        if (cookieLooksLikeSession) {
          logger.info('🔌 [SOCKET AUTH] Primary session failed, trying cookie session token', {
            socketId: socket.id,
            cookieTokenLength: cookieJwt.length,
          });

          if (await validateSessionToken(cookieJwt, 'cookie-session')) {
            return next();
          }
        }
        // If cookie doesn't look like session, try as JWT below
        token = cookieJwt;
        tokenSource = 'cookie-fallback';
      }
    }

    // Try JWT authentication (either primary JWT or fallback cookie JWT)
    logger.info('🔌 [SOCKET AUTH] Attempting JWT validation', {
      socketId: socket.id,
      tokenSource,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    });

    const decoded = verifyToken(token);

    logger.info('🔌 [SOCKET AUTH] JWT validation result', {
      socketId: socket.id,
      hasDecoded: !!decoded,
      hasUserId: !!decoded?.userId,
    });

    if (!decoded || !decoded.userId) {
      logger.error('🔌 [SOCKET AUTH] ❌ All auth methods failed', {
        socketId: socket.id,
        tokenSource,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
        hadCookieJwt: !!cookieJwt,
        triedCookieFallback: tokenSource === 'cookie-fallback',
      });
      return next(new Error('Invalid authentication token'));
    }

    // Attach user data to socket for later use
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    socket.data.roles = decoded.roles;
    socket.data.authType = 'jwt';

    logger.info('Socket authenticated via JWT', {
      socketId: socket.id,
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles
    });

    next();
  } catch (error) {
    logger.error('Socket authentication failed', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(new Error('Authentication failed'));
  }
}
