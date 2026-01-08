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
    // Get token from handshake auth, query params, or cookies
    let token =
      socket.handshake.auth.token ||
      socket.handshake.query.token;

    // If no token in auth/query, try to extract from cookies
    if (!token && socket.handshake.headers.cookie) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies[ACCESS_TOKEN_COOKIE];
    }

    if (!token || typeof token !== 'string') {
      logger.warn('Socket connection rejected - no token', {
        socketId: socket.id,
        hasCookies: !!socket.handshake.headers.cookie,
        hasAuthToken: !!socket.handshake.auth.token,
        hasQueryToken: !!socket.handshake.query.token,
      });
      return next(new Error('Authentication token required'));
    }

    // Try session-based authentication first (for httpOnly cookie tokens)
    try {
      const sessionService = (await import('../../services/session.service.js')).default;
      const sessionData = await sessionService.validateSession(token);

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

          logger.info('Socket authenticated via session', {
            socketId: socket.id,
            userId: user.id,
            email: user.email,
          });

          return next();
        }
      }
    } catch (sessionError) {
      // Session auth failed, try JWT auth
      logger.debug('Socket session auth failed, trying JWT', {
        socketId: socket.id,
        error: sessionError instanceof Error ? sessionError.message : 'Unknown',
      });
    }

    // Fall back to JWT authentication
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
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
