import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyToken } from '../../utils/jwt';
import logger from '../../utils/logger';
import { parse as parseCookies } from 'cookie';

// Cookie name for access token (must match auth.ts)
const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Socket.IO authentication middleware
 * Supports both:
 * 1. JWT token from handshake auth or query params (legacy/explicit)
 * 2. Session token from httpOnly cookies (preferred for browser clients)
 */
export async function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> {
  try {
    // Detailed logging for debugging socket auth issues
    const authToken = socket.handshake.auth.token;
    const queryToken = socket.handshake.query.token;
    const cookieHeader = socket.handshake.headers.cookie;

    logger.info('🔌 [SOCKET AUTH] Connection attempt', {
      socketId: socket.id,
      hasAuthToken: !!authToken,
      authTokenType: typeof authToken,
      authTokenLength: authToken ? String(authToken).length : 0,
      hasQueryToken: !!queryToken,
      hasCookieHeader: !!cookieHeader,
      cookieHeaderLength: cookieHeader ? cookieHeader.length : 0,
      origin: socket.handshake.headers.origin,
    });

    // Get token from handshake auth, query params, or cookies
    let token = authToken || queryToken;
    let tokenSource = authToken ? 'auth' : (queryToken ? 'query' : 'none');

    // If no token in auth/query, try to extract from cookies
    if (!token && cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      token = cookies[ACCESS_TOKEN_COOKIE];
      if (token) {
        tokenSource = 'cookie';
        logger.info('🔌 [SOCKET AUTH] Token found in cookie', {
          socketId: socket.id,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 10) + '...',
          allCookieNames: Object.keys(cookies),
        });
      } else {
        logger.warn('🔌 [SOCKET AUTH] Cookie header present but no access_token', {
          socketId: socket.id,
          cookieNames: Object.keys(cookies),
          expectedCookie: ACCESS_TOKEN_COOKIE,
        });
      }
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
      tokenPreview: token.substring(0, 10) + '...',
    });

    // Try session-based authentication first (for httpOnly cookie tokens)
    logger.info('🔌 [SOCKET AUTH] Attempting session validation', {
      socketId: socket.id,
      tokenSource,
    });

    try {
      const sessionService = (await import('../../services/session.service.js')).default;
      const sessionData = await sessionService.validateSession(token);

      logger.info('🔌 [SOCKET AUTH] Session validation result', {
        socketId: socket.id,
        hasSessionData: !!sessionData,
        userId: sessionData?.userId,
      });

      if (sessionData && sessionData.userId) {
        // Session auth successful - get user details
        const prisma = (await import('../../services/database.js')).default;
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
            tokenSource,
          });

          return next();
        } else {
          logger.warn('🔌 [SOCKET AUTH] Session valid but user not found', {
            socketId: socket.id,
            userId: sessionData.userId,
          });
        }
      }
    } catch (sessionError) {
      // Session auth failed, try JWT auth
      logger.warn('🔌 [SOCKET AUTH] Session validation failed', {
        socketId: socket.id,
        error: sessionError instanceof Error ? sessionError.message : 'Unknown',
        tokenSource,
      });
    }

    // Fall back to JWT authentication
    logger.info('🔌 [SOCKET AUTH] Attempting JWT validation', {
      socketId: socket.id,
      tokenSource,
    });

    const decoded = verifyToken(token);

    logger.info('🔌 [SOCKET AUTH] JWT validation result', {
      socketId: socket.id,
      hasDecoded: !!decoded,
      hasUserId: !!decoded?.userId,
    });

    if (!decoded || !decoded.userId) {
      logger.error('🔌 [SOCKET AUTH] ❌ Both session and JWT auth failed', {
        socketId: socket.id,
        tokenSource,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 10) + '...',
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
