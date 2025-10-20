import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../../utils/logger';

/**
 * Setup collaboration-related WebSocket event handlers
 * For real-time collaborative editing of clinical notes
 */
export function setupCollaborationHandlers(io: SocketIOServer, socket: Socket): void {
  const userId = socket.data.userId;

  // Join a document/note editing session
  socket.on('collaboration:join', (noteId: string) => {
    const room = `note:${noteId}`;
    socket.join(room);
    logger.info(`User ${userId} joined collaboration room: ${room}`);

    // Notify others in the room
    socket.to(room).emit('collaboration:user-joined', {
      userId,
      email: socket.data.email,
      timestamp: new Date().toISOString(),
    });
  });

  // Leave a document/note editing session
  socket.on('collaboration:leave', (noteId: string) => {
    const room = `note:${noteId}`;
    socket.leave(room);
    logger.info(`User ${userId} left collaboration room: ${room}`);

    // Notify others in the room
    socket.to(room).emit('collaboration:user-left', {
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle real-time text changes
  socket.on('collaboration:change', (data: { noteId: string; changes: any }) => {
    const room = `note:${data.noteId}`;
    socket.to(room).emit('collaboration:change', {
      userId,
      changes: data.changes,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle cursor position updates
  socket.on('collaboration:cursor', (data: { noteId: string; position: any }) => {
    const room = `note:${data.noteId}`;
    socket.to(room).emit('collaboration:cursor', {
      userId,
      email: socket.data.email,
      position: data.position,
      timestamp: new Date().toISOString(),
    });
  });

  logger.info(`Collaboration handlers setup for socket ${socket.id}`, { userId });
}
