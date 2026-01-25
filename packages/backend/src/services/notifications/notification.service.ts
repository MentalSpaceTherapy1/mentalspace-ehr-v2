/**
 * Unified Notification Service
 * Phase 3.1: Core orchestrator for all notification delivery
 *
 * This service consolidates the functionality from:
 * - reminder.service.ts (appointment reminders)
 * - emailReminder.service.ts (clinical note reminders)
 * - clinicalNoteReminder.service.ts (note due date tracking)
 * - twilio.reminder.service.ts (SMS reminders)
 * - notifications/reminder.service.ts (Resend-based reminders)
 */

import { v4 as uuidv4 } from 'uuid';
import prisma from '../database';
import logger from '../../utils/logger';
import {
  NotificationRequest,
  NotificationResult,
  ScheduledNotification,
  ChannelResult,
  RecipientInfo,
  INotificationService,
  NotificationChannel,
  NotificationChannelName,
  NotificationConfig,
} from './types';
import { emailChannel, smsChannel, pushChannel, EmailChannel, SmsChannel, PushChannel } from './channels';
import { templateRenderer } from './templates';

// Default configuration
const DEFAULT_CONFIG: NotificationConfig = {
  defaultChannels: ['email'] as NotificationChannelName[],
  defaultPriority: 'normal',
  respectPreferences: true,
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Unified Notification Service
 * Handles all notification delivery across email, SMS, and push channels
 */
export class UnifiedNotificationService implements INotificationService {
  private config: NotificationConfig;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a notification immediately or schedule it for later
   */
  async send(request: NotificationRequest): Promise<NotificationResult> {
    const notificationId = uuidv4();
    const timestamp = new Date();

    // If scheduled for later, create scheduled notification
    if (request.scheduledFor && request.scheduledFor > new Date()) {
      const scheduled = await this.schedule(request);
      return {
        id: scheduled.id,
        success: true,
        channelResults: [],
        timestamp,
      };
    }

    try {
      // Get recipient information
      const recipient = await this.getRecipientInfo(
        request.recipientId,
        request.recipientType
      );

      if (!recipient) {
        logger.error('Recipient not found', {
          recipientId: request.recipientId,
          recipientType: request.recipientType,
        });
        return {
          id: notificationId,
          success: false,
          channelResults: [
            {
              channel: 'email',
              success: false,
              error: 'Recipient not found',
              status: 'failed',
            },
          ],
          timestamp,
        };
      }

      // Render template
      const template = await templateRenderer.render(
        request.type,
        request.templateData
      );

      // Determine channels to use
      const channels =
        request.channels.length > 0
          ? request.channels
          : this.config.defaultChannels;

      // Send through each channel
      const channelResults: ChannelResult[] = [];

      for (const channelName of channels) {
        const result = await this.sendViaChannel(
          channelName as 'email' | 'sms' | 'push',
          recipient,
          template,
          request
        );
        channelResults.push(result);
      }

      // Determine overall success (at least one channel succeeded)
      const success = channelResults.some((r) => r.success);

      // Log the notification
      await this.logNotification(notificationId, request, channelResults);

      logger.info('Notification sent', {
        notificationId,
        type: request.type,
        recipientId: request.recipientId,
        channels: channels,
        success,
      });

      return {
        id: notificationId,
        success,
        channelResults,
        timestamp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to send notification', {
        notificationId,
        type: request.type,
        recipientId: request.recipientId,
        error: errorMessage,
      });

      return {
        id: notificationId,
        success: false,
        channelResults: [
          {
            channel: 'email',
            success: false,
            error: errorMessage,
            status: 'failed',
          },
        ],
        timestamp,
      };
    }
  }

  /**
   * Schedule a notification for future delivery
   */
  async schedule(request: NotificationRequest): Promise<ScheduledNotification> {
    const id = uuidv4();
    const scheduledFor = request.scheduledFor || new Date();

    // Store in database for later processing
    // Note: This uses a generic approach - could be enhanced with a dedicated ScheduledNotification table
    try {
      // For now, we'll create an AppointmentReminder record if it's an appointment notification
      // This maintains backward compatibility while we transition
      if (
        request.type === 'APPOINTMENT_REMINDER' &&
        request.referenceType === 'appointment' &&
        request.referenceId
      ) {
        await prisma.appointmentReminder.create({
          data: {
            appointmentId: request.referenceId,
            reminderType: this.mapChannelToReminderType(request.channels[0] || 'email'),
            scheduledFor: scheduledFor,
            deliveryStatus: 'PENDING',
          },
        });
      }

      logger.info('Notification scheduled', {
        id,
        type: request.type,
        recipientId: request.recipientId,
        scheduledFor,
      });

      return {
        id,
        request,
        scheduledFor,
        status: 'pending',
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to schedule notification', {
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancel(scheduledId: string): Promise<boolean> {
    try {
      // Try to find and cancel in AppointmentReminder table
      const result = await prisma.appointmentReminder.updateMany({
        where: {
          id: scheduledId,
          deliveryStatus: 'PENDING',
        },
        data: {
          deliveryStatus: 'FAILED',
          failureReason: 'Cancelled by user',
        },
      });

      const cancelled = result.count > 0;

      if (cancelled) {
        logger.info('Notification cancelled', { scheduledId });
      }

      return cancelled;
    } catch (error) {
      logger.error('Failed to cancel notification', {
        scheduledId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get status of a notification
   */
  async getStatus(notificationId: string): Promise<NotificationResult | null> {
    // For now, we don't have a dedicated notification log table
    // This could be enhanced to query audit logs or a notification history table
    logger.debug('getStatus not fully implemented', { notificationId });
    return null;
  }

  /**
   * Get all pending scheduled notifications for a recipient
   */
  async getPendingForRecipient(
    recipientId: string,
    recipientType: 'user' | 'client'
  ): Promise<ScheduledNotification[]> {
    try {
      if (recipientType === 'client') {
        // Get pending appointment reminders for client
        const reminders = await prisma.appointmentReminder.findMany({
          where: {
            appointment: {
              clientId: recipientId,
            },
            deliveryStatus: 'PENDING',
            scheduledFor: {
              gt: new Date(),
            },
          },
          include: {
            appointment: true,
          },
        });

        return reminders.map((r) => ({
          id: r.id,
          request: {
            type: 'APPOINTMENT_REMINDER' as const,
            recipientId,
            recipientType: 'client' as const,
            channels: [this.mapReminderTypeToChannel(r.reminderType)],
            templateData: {
              appointmentId: r.appointmentId,
            },
          },
          scheduledFor: r.scheduledFor,
          status: 'pending' as const,
          createdAt: r.createdAt,
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to get pending notifications', {
        recipientId,
        recipientType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Send notification through a specific channel
   */
  private async sendViaChannel(
    channelName: 'email' | 'sms' | 'push',
    recipient: RecipientInfo,
    template: { subject?: string; textBody: string; htmlBody?: string; smsBody?: string },
    request: NotificationRequest
  ): Promise<ChannelResult> {
    const channel = this.getChannel(channelName);

    // Check if channel is available
    const isAvailable = await channel.isAvailable();
    if (!isAvailable) {
      return {
        channel: channelName,
        success: false,
        error: `${channelName} channel is not configured`,
        status: 'failed',
      };
    }

    // Send through channel
    return channel.send({
      recipient,
      template,
      priority: request.priority || this.config.defaultPriority,
      referenceId: request.referenceId,
    });
  }

  /**
   * Get channel implementation by name
   */
  private getChannel(name: 'email' | 'sms' | 'push'): EmailChannel | SmsChannel | PushChannel {
    switch (name) {
      case 'email':
        return emailChannel;
      case 'sms':
        return smsChannel;
      case 'push':
        return pushChannel;
      default:
        throw new Error(`Unknown channel: ${name}`);
    }
  }

  /**
   * Get recipient information from database
   */
  private async getRecipientInfo(
    recipientId: string,
    recipientType: 'user' | 'client'
  ): Promise<RecipientInfo | null> {
    try {
      if (recipientType === 'user') {
        const user = await prisma.user.findUnique({
          where: { id: recipientId },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            emailNotifications: true,
            smsNotifications: true,
          },
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          phone: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          preferences: {
            emailEnabled: user.emailNotifications,
            smsEnabled: user.smsNotifications,
          },
        };
      } else {
        const client = await prisma.client.findUnique({
          where: { id: recipientId },
          select: {
            id: true,
            email: true,
            primaryPhone: true,
            firstName: true,
            lastName: true,
            preferredContactMethod: true,
            okayToLeaveMessage: true,
          },
        });

        if (!client) return null;

        // Determine preferences based on contact method and message settings
        const prefersSms = client.preferredContactMethod === 'SMS' || client.preferredContactMethod === 'Phone';
        const prefersEmail = client.preferredContactMethod === 'Email';

        return {
          id: client.id,
          email: client.email,
          phone: client.primaryPhone,
          firstName: client.firstName,
          lastName: client.lastName,
          preferences: {
            emailEnabled: prefersEmail || !!client.email,
            smsEnabled: prefersSms && client.okayToLeaveMessage,
          },
        };
      }
    } catch (error) {
      logger.error('Failed to get recipient info', {
        recipientId,
        recipientType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Log notification to audit/tracking
   */
  private async logNotification(
    notificationId: string,
    request: NotificationRequest,
    results: ChannelResult[]
  ): Promise<void> {
    // Log to application logger for now
    // Could be enhanced to write to a NotificationLog table
    logger.debug('Notification logged', {
      notificationId,
      type: request.type,
      recipientId: request.recipientId,
      recipientType: request.recipientType,
      channels: results.map((r) => ({
        channel: r.channel,
        success: r.success,
        status: r.status,
      })),
    });
  }

  /**
   * Map channel name to reminder type enum
   */
  private mapChannelToReminderType(channel: string): 'EMAIL' | 'SMS' | 'VOICE' {
    switch (channel) {
      case 'sms':
        return 'SMS';
      case 'push':
        return 'VOICE'; // Closest equivalent
      default:
        return 'EMAIL';
    }
  }

  /**
   * Map reminder type to channel name
   */
  private mapReminderTypeToChannel(
    type: string
  ): 'email' | 'sms' | 'push' {
    switch (type) {
      case 'SMS':
        return 'sms';
      case 'VOICE':
        return 'push';
      default:
        return 'email';
    }
  }
}

// Export singleton instance
export const notificationService = new UnifiedNotificationService();

// Export convenience functions for common operations
export async function sendNotification(
  request: NotificationRequest
): Promise<NotificationResult> {
  return notificationService.send(request);
}

export async function scheduleNotification(
  request: NotificationRequest
): Promise<ScheduledNotification> {
  return notificationService.schedule(request);
}

export async function cancelNotification(
  scheduledId: string
): Promise<boolean> {
  return notificationService.cancel(scheduledId);
}
