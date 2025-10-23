import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyToken } from '../../utils/jwt';
import logger from '../../utils/logger';

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user data to socket
 */
export async function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> {
  try {
    // Get token from handshake auth or query params
    const token =
      socket.handshake.auth.token ||
      socket.handshake.query.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return next(new Error('Invalid authentication token'));
    }

    // Attach user data to socket for later use
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    socket.data.roles = decoded.roles;

    logger.info('Socket authenticated', {
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
