import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../../utils/logger';

/**
 * Setup productivity-related WebSocket event handlers
 */
export function setupProductivityHandlers(io: SocketIOServer, socket: Socket): void {
  const userId = socket.data.userId;

  // Join user's personal room for productivity updates
  socket.on('join', (room: string) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room: ${room}`, { userId });
  });

  // Leave room
  socket.on('leave', (room: string) => {
    socket.leave(room);
    logger.info(`Socket ${socket.id} left room: ${room}`, { userId });
  });

  // Automatically join user's personal productivity room
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  logger.info(`Socket ${socket.id} auto-joined productivity room: ${userRoom}`, { userId });
}

/**
 * Emit KVR update to specific user
 * Called from backend when KVR changes (e.g., after appointment completion)
 */
export function emitKVRUpdate(
  io: SocketIOServer,
  userId: string,
  data: {
    kvr: number;
    numerator: number;
    denominator: number;
  }
): void {
  io.to(`user:${userId}`).emit('kvr:updated', {
    ...data,
    timestamp: new Date().toISOString(),
  });
  logger.info(`KVR update emitted to user: ${userId}`, data);
}

/**
 * Emit unsigned notes alert to user
 */
export function emitUnsignedNotesAlert(
  io: SocketIOServer,
  userId: string,
  unsignedCount: number
): void {
  io.to(`user:${userId}`).emit('unsigned-notes:alert', {
    count: unsignedCount,
    timestamp: new Date().toISOString(),
  });
  logger.info(`Unsigned notes alert emitted to user: ${userId}`, { unsignedCount });
}
