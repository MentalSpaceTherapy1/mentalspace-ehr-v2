import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../../utils/logger';

/**
 * Setup notification-related WebSocket event handlers
 * For check-ins, alerts, messages, etc.
 */
export function setupNotificationHandlers(io: SocketIOServer, socket: Socket): void {
  const userId = socket.data.userId;

  // Client check-in notification
  socket.on('checkin:notify', (data: { appointmentId: string; clientId: string }) => {
    logger.info(`Check-in notification from user ${userId}`, data);
    // This would typically be called by reception/client portal
    // and notify the clinician
  });

  // Subscribe to appointment notifications
  socket.on('notifications:subscribe', (type: string) => {
    const room = `notifications:${type}:${userId}`;
    socket.join(room);
    logger.info(`User ${userId} subscribed to notifications: ${type}`);
  });

  // Unsubscribe from notifications
  socket.on('notifications:unsubscribe', (type: string) => {
    const room = `notifications:${type}:${userId}`;
    socket.leave(room);
    logger.info(`User ${userId} unsubscribed from notifications: ${type}`);
  });

  logger.info(`Notification handlers setup for socket ${socket.id}`, { userId });
}

/**
 * Emit client check-in notification to clinician
 */
export function emitCheckInNotification(
  io: SocketIOServer,
  clinicianId: string,
  data: {
    appointmentId: string;
    clientId: string;
    clientName: string;
    checkInTime: string;
  }
): void {
  io.to(`user:${clinicianId}`).emit('checkin:alert', {
    ...data,
    timestamp: new Date().toISOString(),
  });
  logger.info(`Check-in notification emitted to clinician: ${clinicianId}`, data);
}

/**
 * Emit general notification to user
 */
export function emitNotification(
  io: SocketIOServer,
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
): void {
  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString(),
  });
  logger.info(`Notification emitted to user: ${userId}`, { type: notification.type });
}
