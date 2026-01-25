/**
 * MentalSpace EHR - WebSocket Chat Handler
 *
 * Real-time chat messaging for telehealth sessions
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../../utils/logger';

interface ChatMessage {
  sessionId: string;
  userName: string;
  message: string;
  timestamp: string;
}

/**
 * Setup chat WebSocket handlers for telehealth sessions
 */
export function setupChatHandlers(io: SocketIOServer, socket: Socket) {
  const userId = socket.data.userId;

  /**
   * Join a session chat room
   */
  socket.on('chat:join', async (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('chat:error', {
          message: 'Session ID is required',
        });
        return;
      }

      // Join the session-specific room for chat
      socket.join(`session-${sessionId}`);

      logger.info('User joined chat room', {
        userId,
        sessionId,
        socketId: socket.id,
      });

      socket.emit('chat:joined', {
        sessionId,
        message: 'Successfully joined chat session',
      });
    } catch (error: unknown) {
      logger.error('Error joining chat session', {
        error: error.message,
        userId,
      });
      socket.emit('chat:error', {
        message: error.message || 'Failed to join chat session',
      });
    }
  });

  /**
   * Handle sending a chat message
   * Broadcasts to all participants in the session except the sender
   */
  socket.on('chat:send', async (data: ChatMessage) => {
    try {
      const { sessionId, userName, message, timestamp } = data;

      if (!sessionId) {
        socket.emit('chat:error', {
          message: 'Session ID is required',
        });
        return;
      }

      if (!message || message.trim() === '') {
        socket.emit('chat:error', {
          message: 'Message cannot be empty',
        });
        return;
      }

      // Ensure the socket is in the session room
      if (!socket.rooms.has(`session-${sessionId}`)) {
        // Auto-join the room if not already joined
        socket.join(`session-${sessionId}`);
        logger.debug('Auto-joined chat room', { userId, sessionId });
      }

      // Broadcast message to all other participants in the session
      socket.to(`session-${sessionId}`).emit('chat:message', {
        userName,
        message: message.trim(),
        timestamp: timestamp || new Date().toISOString(),
      });

      logger.debug('Chat message sent', {
        userId,
        sessionId,
        messageLength: message.length,
      });

      // Acknowledge message was sent
      socket.emit('chat:sent', {
        sessionId,
        timestamp: timestamp || new Date().toISOString(),
      });
    } catch (error: unknown) {
      logger.error('Error sending chat message', {
        error: error.message,
        userId,
      });
      socket.emit('chat:error', {
        message: 'Failed to send message',
      });
    }
  });

  /**
   * Leave a session chat room
   */
  socket.on('chat:leave', (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        return;
      }

      socket.leave(`session-${sessionId}`);

      logger.info('User left chat room', {
        userId,
        sessionId,
        socketId: socket.id,
      });

      socket.emit('chat:left', {
        sessionId,
        message: 'Successfully left chat session',
      });
    } catch (error: unknown) {
      logger.error('Error leaving chat session', {
        error: error.message,
        userId,
      });
    }
  });

  logger.debug('Chat WebSocket handlers initialized', {
    userId,
    socketId: socket.id,
  });
}

/**
 * Emit chat message to all clients in a session (for system messages)
 */
export function emitChatMessage(
  io: SocketIOServer,
  sessionId: string,
  userName: string,
  message: string
) {
  io.to(`session-${sessionId}`).emit('chat:message', {
    userName,
    message,
    timestamp: new Date().toISOString(),
  });
}
