import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import config from '../config';
import logger from '../utils/logger';
import { authenticateSocket } from './middleware/auth';
import { setupProductivityHandlers } from './handlers/productivity';
import { setupCollaborationHandlers } from './handlers/collaboration';
import { setupNotificationHandlers } from './handlers/notifications';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
    // Add ping timeout and interval for connection stability
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`WebSocket connected: ${socket.id}`, { userId });

    // Setup various event handlers
    setupProductivityHandlers(io, socket);
    setupCollaborationHandlers(io, socket);
    setupNotificationHandlers(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${socket.id}`, { userId, reason });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error: ${socket.id}`, { userId, error });
    });
  });

  logger.info('✅ Socket.IO server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketIO first.');
  }
  return io;
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) {
    logger.warn('Attempted to emit event but Socket.IO not initialized');
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to specific room
 */
export function emitToRoom(room: string, event: string, data: any): void {
  if (!io) {
    logger.warn('Attempted to emit event but Socket.IO not initialized');
    return;
  }
  io.to(room).emit(event, data);
}

export { io };
