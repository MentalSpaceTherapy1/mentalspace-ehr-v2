import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import config from '../config';
import logger from '../utils/logger';
import { authenticateSocket } from './middleware/auth';
import { setupProductivityHandlers } from './handlers/productivity';
import { setupCollaborationHandlers } from './handlers/collaboration';
import { setupNotificationHandlers } from './handlers/notifications';
import { setupTranscriptionHandlers } from './handlers/transcription';
import { setupChatHandlers } from './handlers/chat';

let io: SocketIOServer | null = null;
let pubClient: ReturnType<typeof createClient> | null = null;
let subClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis adapter for horizontal scaling
 * Required for multi-instance deployment (50,000+ users)
 */
async function initializeRedisAdapter(socketIO: SocketIOServer): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('REDIS_URL not set - Socket.IO will not scale across instances');
    }
    return;
  }

  try {
    pubClient = createClient({ url: redisUrl });
    subClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
    ]);

    socketIO.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter initialized for horizontal scaling');
  } catch (error) {
    logger.error('Failed to initialize Redis adapter', { error });
    // Continue without Redis - will work in single instance mode
  }
}

/**
 * Initialize Socket.IO server
 */
export async function initializeSocketIO(server: HTTPServer): Promise<SocketIOServer> {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
    // Add ping timeout and interval for connection stability
    pingTimeout: 60000,
    pingInterval: 25000,
    // Enable connection state recovery for better reconnection experience
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: false,
    },
  });

  // Initialize Redis adapter for horizontal scaling
  await initializeRedisAdapter(io);

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  const ioInstance = io; // Capture reference for TypeScript
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`WebSocket connected: ${socket.id}`, { userId });

    // Setup various event handlers
    setupProductivityHandlers(ioInstance, socket);
    setupCollaborationHandlers(ioInstance, socket);
    setupNotificationHandlers(ioInstance, socket);
    setupTranscriptionHandlers(ioInstance, socket);
    setupChatHandlers(ioInstance, socket);

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
 * Get the Socket.IO server instance (alias for compatibility)
 */
export function getSocketIO(): SocketIOServer | null {
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
