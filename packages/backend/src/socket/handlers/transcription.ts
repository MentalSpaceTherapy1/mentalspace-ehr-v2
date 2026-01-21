/**
 * MentalSpace EHR - WebSocket Transcription Handler (Module 6 Phase 2)
 *
 * Real-time transcription streaming for telehealth sessions
 * With audio capture and AWS Transcribe integration
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../../utils/logger';
import * as transcriptionService from '../../services/transcription.service';

// Audio streaming session tracking
interface AudioStreamSession {
  sessionId: string;
  sampleRate: number;
  encoding: string;
  audioChunks: Buffer[];
  isActive: boolean;
  resolvers: Array<(chunk: Buffer | null) => void>;
}

// Active audio streaming sessions - maps sessionId to stream state
const audioStreamSessions = new Map<string, AudioStreamSession>();

/**
 * Create an async generator that yields audio chunks from the session
 */
function createAudioChunkGenerator(sessionId: string): AsyncIterable<Buffer> {
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<Buffer>> {
          const session = audioStreamSessions.get(sessionId);

          if (!session || !session.isActive) {
            return { done: true, value: undefined as any };
          }

          // If there are buffered chunks, return one
          if (session.audioChunks.length > 0) {
            const chunk = session.audioChunks.shift()!;
            return { done: false, value: chunk };
          }

          // Wait for next chunk
          return new Promise<IteratorResult<Buffer>>((resolve) => {
            session.resolvers.push((chunk) => {
              if (chunk === null) {
                resolve({ done: true, value: undefined as any });
              } else {
                resolve({ done: false, value: chunk });
              }
            });
          });
        },
      };
    },
  };
}

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
   * Start audio streaming for a session (STAFF ONLY)
   * Initializes audio buffer and begins AWS Transcribe processing
   */
  socket.on('transcription:audio-start', async (data: {
    sessionId: string;
    sampleRate?: number;
    encoding?: string;
    channels?: number;
  }) => {
    try {
      const { sessionId, sampleRate = 16000, encoding = 'pcm' } = data;

      if (!sessionId) {
        socket.emit('transcription:error', {
          message: 'Session ID is required to start audio streaming',
        });
        return;
      }

      logger.info('🎤 [SOCKET] transcription:audio-start received', {
        sessionId,
        userId,
        sampleRate,
        encoding,
        socketId: socket.id,
      });

      // Initialize audio stream session
      const streamSession: AudioStreamSession = {
        sessionId,
        sampleRate,
        encoding,
        audioChunks: [],
        isActive: true,
        resolvers: [],
      };
      audioStreamSessions.set(sessionId, streamSession);

      // Create async audio chunk generator
      const audioGenerator = createAudioChunkGenerator(sessionId);

      // Start processing audio stream in background
      transcriptionService.processAudioStream(sessionId, audioGenerator, sampleRate)
        .then(() => {
          logger.info('Audio stream processing completed', { sessionId });
        })
        .catch((error: any) => {
          logger.error('Audio stream processing failed', {
            sessionId,
            error: error.message,
          });
          socket.emit('transcription:error', {
            sessionId,
            message: 'Audio stream processing failed: ' + error.message,
          });
        });

      socket.emit('transcription:audio-started', {
        sessionId,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Error starting audio streaming', {
        error: error.message,
        userId,
      });
      socket.emit('transcription:error', {
        message: 'Failed to start audio streaming',
      });
    }
  });

  /**
   * Stop audio streaming for a session
   * Closes the audio buffer and finalizes transcription
   */
  socket.on('transcription:audio-stop', async (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('transcription:error', {
          message: 'Session ID is required to stop audio streaming',
        });
        return;
      }

      const streamSession = audioStreamSessions.get(sessionId);
      if (streamSession) {
        streamSession.isActive = false;

        // Resolve any pending promises with null to signal end
        for (const resolver of streamSession.resolvers) {
          resolver(null);
        }

        audioStreamSessions.delete(sessionId);

        logger.info('Audio streaming stopped', {
          sessionId,
          userId,
          totalChunksReceived: streamSession.audioChunks.length,
        });
      }

      socket.emit('transcription:audio-stopped', {
        sessionId,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Error stopping audio streaming', {
        error: error.message,
        userId,
      });
      socket.emit('transcription:error', {
        message: 'Failed to stop audio streaming',
      });
    }
  });

  /**
   * Stream audio chunks for transcription
   * Buffers audio data and feeds it to AWS Transcribe
   */
  socket.on('transcription:audio-chunk', async (data: {
    sessionId: string;
    audioData: Buffer | ArrayBuffer;
    sampleRate?: number;
    timestamp?: number;
  }) => {
    try {
      const { sessionId, audioData, sampleRate, timestamp } = data;

      if (!sessionId || !audioData) {
        socket.emit('transcription:error', {
          message: 'Session ID and audio data are required',
        });
        return;
      }

      const streamSession = audioStreamSessions.get(sessionId);
      if (!streamSession || !streamSession.isActive) {
        // Log first time we receive chunks without active session
        logger.warn('🎤 [SOCKET] Received audio chunk but no active session', {
          sessionId,
          hasSession: !!streamSession,
          isActive: streamSession?.isActive,
        });
        return;
      }

      // Convert ArrayBuffer to Buffer if needed
      const audioBuffer = Buffer.isBuffer(audioData)
        ? audioData
        : Buffer.from(audioData);

      // Log first few chunks in detail
      const totalReceived = streamSession.audioChunks.length + streamSession.resolvers.length + 1;
      if (totalReceived <= 5) {
        logger.info('🎤 [SOCKET] Audio chunk received (first 5)', {
          sessionId,
          chunkNumber: totalReceived,
          chunkSize: audioBuffer.length,
          isBuffer: Buffer.isBuffer(audioData),
          dataType: typeof audioData,
          pendingResolvers: streamSession.resolvers.length,
        });
      }

      // If there are pending resolvers, immediately deliver the chunk
      if (streamSession.resolvers.length > 0) {
        const resolver = streamSession.resolvers.shift()!;
        resolver(audioBuffer);
      } else {
        // Buffer the chunk for later processing
        streamSession.audioChunks.push(audioBuffer);
      }

      // Periodic logging (every 50 chunks)
      const totalChunks = streamSession.audioChunks.length;
      if (totalChunks % 50 === 0) {
        logger.info('🎤 [SOCKET] Audio chunks buffered', {
          sessionId,
          bufferedChunks: totalChunks,
          pendingResolvers: streamSession.resolvers.length,
          lastChunkSize: audioBuffer.length,
        });
      }

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
