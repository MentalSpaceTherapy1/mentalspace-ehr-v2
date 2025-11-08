/**
 * MentalSpace EHR - WebSocket Transcription Handler (Module 6 Phase 2)
 *
 * Real-time transcription streaming for telehealth sessions
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../../utils/logger';
import * as transcriptionService from '../../services/transcription.service';

/**
 * Setup transcription WebSocket handlers
 */
export function setupTranscriptionHandlers(io: SocketIOServer, socket: Socket) {
  const userId = socket.data.userId;

  /**
   * Join a session transcription room
   */
  socket.on('transcription:join-session', async (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('transcription:error', {
          message: 'Session ID is required',
        });
        return;
      }

      // Join the session-specific room
      socket.join(`session-${sessionId}`);

      logger.info('User joined transcription room', {
        userId,
        sessionId,
        socketId: socket.id,
      });

      socket.emit('transcription:joined', {
        sessionId,
        message: 'Successfully joined transcription session',
      });

      // Get current transcription status
      try {
        const status = await transcriptionService.getTranscriptionStatus(sessionId);
        socket.emit('transcription:status', status);
      } catch (err: any) {
        logger.warn('Failed to get initial transcription status', {
          error: err.message,
          sessionId,
        });
      }
    } catch (error: any) {
      logger.error('Error joining transcription session', {
        error: error.message,
        userId,
      });
      socket.emit('transcription:error', {
        message: error.message || 'Failed to join transcription session',
      });
    }
  });

  /**
   * Leave a session transcription room
   */
  socket.on('transcription:leave-session', (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        return;
      }

      socket.leave(`session-${sessionId}`);

      logger.info('User left transcription room', {
        userId,
        sessionId,
        socketId: socket.id,
      });

      socket.emit('transcription:left', {
        sessionId,
        message: 'Successfully left transcription session',
      });
    } catch (error: any) {
      logger.error('Error leaving transcription session', {
        error: error.message,
        userId,
      });
    }
  });

  /**
   * Stream audio chunks for transcription
   * Note: This is a simplified implementation. In production, you may need
   * to handle audio encoding, buffering, and proper streaming protocols.
   */
  socket.on('transcription:audio-chunk', async (data: {
    sessionId: string;
    audioData: Buffer;
    sampleRate?: number;
  }) => {
    try {
      const { sessionId, audioData, sampleRate } = data;

      if (!sessionId || !audioData) {
        socket.emit('transcription:error', {
          message: 'Session ID and audio data are required',
        });
        return;
      }

      // Note: In a real implementation, you would buffer audio chunks
      // and process them in batches rather than one at a time
      logger.debug('Received audio chunk for transcription', {
        sessionId,
        chunkSize: audioData.length,
        sampleRate,
      });

      // The actual transcription processing happens in the service
      // This is just a placeholder for the WebSocket handler
      socket.emit('transcription:chunk-received', {
        sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error processing audio chunk', {
        error: error.message,
        userId,
      });
      socket.emit('transcription:error', {
        message: 'Failed to process audio chunk',
      });
    }
  });

  /**
   * Request current transcript history
   */
  socket.on('transcription:get-history', async (data: {
    sessionId: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      const { sessionId, limit, offset } = data;

      if (!sessionId) {
        socket.emit('transcription:error', {
          message: 'Session ID is required',
        });
        return;
      }

      const transcripts = await transcriptionService.getTranscripts(sessionId, {
        includePartial: false,
        limit: limit || 100,
        offset: offset || 0,
      });

      socket.emit('transcription:history', {
        sessionId,
        transcripts,
        count: transcripts.length,
      });

      logger.debug('Sent transcript history', {
        userId,
        sessionId,
        count: transcripts.length,
      });
    } catch (error: any) {
      logger.error('Error getting transcript history', {
        error: error.message,
        userId,
      });
      socket.emit('transcription:error', {
        message: 'Failed to get transcript history',
      });
    }
  });

  /**
   * Ping to check if transcription is active
   */
  socket.on('transcription:ping', (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;

      socket.emit('transcription:pong', {
        sessionId,
        timestamp: new Date().toISOString(),
        connected: true,
      });
    } catch (error: any) {
      logger.error('Error handling transcription ping', {
        error: error.message,
        userId,
      });
    }
  });

  logger.debug('Transcription WebSocket handlers initialized', {
    userId,
    socketId: socket.id,
  });
}

/**
 * Emit transcription update to all clients in a session
 * Called from transcription service
 */
export function emitTranscriptUpdate(
  io: SocketIOServer,
  sessionId: string,
  transcript: any
) {
  io.to(`session-${sessionId}`).emit('transcript-update', {
    sessionId,
    transcript,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit transcription status change
 */
export function emitTranscriptionStatus(
  io: SocketIOServer,
  sessionId: string,
  status: any
) {
  io.to(`session-${sessionId}`).emit('transcription:status-change', {
    sessionId,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit transcription error
 */
export function emitTranscriptionError(
  io: SocketIOServer,
  sessionId: string,
  error: string
) {
  io.to(`session-${sessionId}`).emit('transcription:error', {
    sessionId,
    error,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get helper function to export socket instance
 */
export function getSocketIO(): SocketIOServer | null {
  // This will be imported from the main socket index
  const { io } = require('../index');
  return io;
}
