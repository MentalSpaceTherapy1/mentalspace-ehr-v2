/**
 * Appointment Reminder Scheduler
 * Phase 3.1: Scheduler for processing appointment reminders
 *
 * Replaces functionality from:
 * - reminder.service.ts (processReminders)
 * - notifications/scheduler.ts (NotificationScheduler)
 */

import cron from 'node-cron';
import prisma from '../../database';
import logger from '../../../utils/logger';
import {
  INotificationScheduler,
  SchedulerStatus,
  SchedulerRunResult,
  SchedulerConfig,
} from '../types';
import { notificationService } from '../notification.service';

const DEFAULT_CONFIG: SchedulerConfig = {
  cronExpression: '*/15 * * * *', // Every 15 minutes
  enabled: true,
  batchSize: 100,
};

/**
 * Appointment Reminder Scheduler
 * Processes pending appointment reminders based on configured timing
 */
export class AppointmentReminderScheduler implements INotificationScheduler {
  private config: SchedulerConfig;
  private job: ReturnType<typeof cron.schedule> | null = null;
  private isProcessing = false;
  private lastRunAt?: Date;
  private lastRunResult?: SchedulerRunResult;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.job) {
      logger.warn('Appointment reminder scheduler is already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Appointment reminder scheduler is disabled');
      return;
    }

    this.job = cron.schedule(this.config.cronExpression, async () => {
      if (this.isProcessing) {
        logger.warn('Previous appointment reminder job still running, skipping');
        return;
      }

      try {
        await this.runNow();
      } catch (error) {
        logger.error('Error in scheduled appointment reminder processing', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    logger.info('Appointment reminder scheduler started', {
      cronExpression: this.config.cronExpression,
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Appointment reminder scheduler stopped');
    }
  }

  /**
   * Run the scheduler immediately
   */
  async runNow(): Promise<SchedulerRunResult> {
    if (this.isProcessing) {
      throw new Error('Scheduler is already processing');
    }

    const startTime = Date.now();
    this.isProcessing = true;

    const result: SchedulerRunResult = {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      errors: [],
    };

    try {
      logger.info('Starting appointment reminder processing');

      // Get appointments needing reminders
      const reminders = await this.getPendingReminders();
      result.total = reminders.length;

      logger.info(`Found ${reminders.length} appointment reminders to process`);

      // Process each reminder
      for (const reminder of reminders) {
        try {
          const sent = await this.processReminder(reminder);

          if (sent) {
            result.sent++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.failed++;
          result.errors?.push({
            id: reminder.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      result.durationMs = Date.now() - startTime;
      this.lastRunAt = new Date();
      this.lastRunResult = result;

      logger.info('Appointment reminder processing completed', {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        durationMs: result.durationMs,
      });

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.job !== null,
      isProcessing: this.isProcessing,
      lastRunAt: this.lastRunAt,
      lastRunResult: this.lastRunResult,
    };
  }

  /**
   * Get pending appointment reminders that are ready to send
   */
  private async getPendingReminders() {
    const now = new Date();

    // Get scheduled reminders that are due
    const reminders = await prisma.appointmentReminder.findMany({
      where: {
        deliveryStatus: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
      take: this.config.batchSize,
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    return reminders;
  }

  /**
   * Process a single reminder
   */
  private async processReminder(
    reminder: any
  ): Promise<boolean> {
    const { appointment } = reminder;

    // Skip if appointment is cancelled or client doesn't exist
    if (!appointment || appointment.status === 'CANCELLED' || !appointment.client) {
      await this.markReminderStatus(
        reminder.id,
        'FAILED',
        undefined,
        !appointment
          ? 'Appointment not found'
          : appointment.status === 'CANCELLED'
            ? 'Appointment was cancelled'
            : 'Client not found'
      );
      return false;
    }

    // Format appointment data for template
    const appointmentDate = new Date(appointment.startTime);
    const templateData = {
      clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
      clinicianName: appointment.clinician
        ? `${appointment.clinician.firstName} ${appointment.clinician.lastName}`
        : 'Your Provider',
      appointmentDate: appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      appointmentTime: appointmentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      duration: appointment.duration || 60,
      locationType: appointment.locationType || 'IN_PERSON',
      locationDetails: appointment.location,
      telehealthLink: appointment.videoLink,
      practiceName: 'MentalSpace',
      practicePhone: process.env.PRACTICE_PHONE,
    };

    // Determine channels based on reminder type
    const channels: ('email' | 'sms')[] = [];
    if (reminder.reminderType === 'EMAIL' || reminder.reminderType === 'BOTH') {
      channels.push('email');
    }
    if (reminder.reminderType === 'SMS' || reminder.reminderType === 'BOTH') {
      channels.push('sms');
    }

    // Send notification
    const result = await notificationService.send({
      type: 'APPOINTMENT_REMINDER',
      recipientId: appointment.clientId,
      recipientType: 'client',
      channels,
      templateData,
      referenceId: appointment.id,
      referenceType: 'appointment',
    });

    // Update reminder status
    if (result.success) {
      await this.markReminderStatus(
        reminder.id,
        'SENT',
        result.channelResults[0]?.externalId
      );
      return true;
    } else {
      const errorMessage = result.channelResults
        .filter((r) => !r.success)
        .map((r) => r.error)
        .join('; ');
      await this.markReminderStatus(reminder.id, 'FAILED', undefined, errorMessage);
      return false;
    }
  }

  /**
   * Update reminder status in database
   */
  private async markReminderStatus(
    reminderId: string,
    deliveryStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED',
    messageId?: string,
    failureReason?: string
  ): Promise<void> {
    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        deliveryStatus,
        sentAt: deliveryStatus === 'SENT' || deliveryStatus === 'DELIVERED' ? new Date() : undefined,
        messageId,
        failureReason,
      },
    });
  }
}

// Export singleton instance
export const appointmentReminderScheduler = new AppointmentReminderScheduler();
