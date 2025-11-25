import cron from 'node-cron';
import { PrismaClient } from '@mentalspace/database';
import { ReminderService } from '../services/reminder.service.new';
import { TwilioReminderService } from '../services/twilio.reminder.service';
import { EmailReminderService } from '../services/email.reminder.service';
import { IcsGeneratorService } from '../services/icsGenerator.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Initialize services
const twilioService = new TwilioReminderService(prisma);
const emailService = new EmailReminderService(prisma);
const icsService = new IcsGeneratorService();
const reminderService = new ReminderService(
  prisma,
  twilioService,
  emailService,
  icsService
);

let isProcessingReminders = false;
let isRetryingFailedReminders = false;

/**
 * Process pending reminders every 5 minutes
 * Runs at: 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 minutes past each hour
 */
export const processRemindersJob = cron.schedule(
  '*/5 * * * *',
  async () => {
    // Prevent overlapping executions
    if (isProcessingReminders) {
      logger.warn('Reminder processing already in progress, skipping this run');
      return;
    }

    isProcessingReminders = true;

    try {
      logger.info('🔔 Starting reminder processing job...');

      const results = await reminderService.processPendingReminders();

      logger.info('✅ Reminder processing complete', {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        skipped: results.skipped,
      });

      // Log detailed metrics for monitoring
      if (results.total > 0) {
        const successRate = ((results.sent / results.total) * 100).toFixed(2);
        logger.info(`📊 Success rate: ${successRate}%`, {
          sent: results.sent,
          failed: results.failed,
          total: results.total,
        });
      }
    } catch (error) {
      logger.error('❌ Error in reminder processing job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      isProcessingReminders = false;
    }
  },
  {
    timezone: 'America/New_York', // TODO: Make this configurable
    // TODO: Call .start() manually to begin this cron task
  }
);

/**
 * Retry failed reminders every hour
 * Runs at the top of each hour
 */
export const retryFailedRemindersJob = cron.schedule(
  '0 * * * *',
  async () => {
    // Prevent overlapping executions
    if (isRetryingFailedReminders) {
      logger.warn('Failed reminder retry already in progress, skipping this run');
      return;
    }

    isRetryingFailedReminders = true;

    try {
      logger.info('🔄 Starting failed reminder retry job...');

      await reminderService.retryFailedReminders();

      logger.info('✅ Failed reminder retry complete');
    } catch (error) {
      logger.error('❌ Error in failed reminder retry job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      isRetryingFailedReminders = false;
    }
  },
  {
    timezone: 'America/New_York',
    // TODO: Call .start() manually to begin this cron task
  }
);

/**
 * Start all reminder jobs
 */
export function startReminderJobs(): void {
  try {
    processRemindersJob.start();
    retryFailedRemindersJob.start();

    logger.info('📅 Reminder jobs started successfully', {
      processRemindersSchedule: '*/5 * * * * (every 5 minutes)',
      retryFailedSchedule: '0 * * * * (every hour)',
    });
  } catch (error) {
    logger.error('Failed to start reminder jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Stop all reminder jobs
 */
export function stopReminderJobs(): void {
  try {
    processRemindersJob.stop();
    retryFailedRemindersJob.stop();

    logger.info('⏹️ Reminder jobs stopped');
  } catch (error) {
    logger.error('Failed to stop reminder jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get job status
 */
export function getReminderJobStatus(): {
  processReminders: {
    running: boolean;
    processing: boolean;
  };
  retryFailed: {
    running: boolean;
    processing: boolean;
  };
} {
  return {
    processReminders: {
      running: processRemindersJob.getStatus() === 'running',
      processing: isProcessingReminders,
    },
    retryFailed: {
      running: retryFailedRemindersJob.getStatus() === 'running',
      processing: isRetryingFailedReminders,
    },
  };
}

/**
 * Manually trigger reminder processing (for testing)
 */
export async function triggerReminderProcessing(): Promise<any> {
  if (isProcessingReminders) {
    throw new Error('Reminder processing already in progress');
  }

  isProcessingReminders = true;

  try {
    logger.info('🔔 Manually triggered reminder processing...');
    const results = await reminderService.processPendingReminders();
    logger.info('✅ Manual reminder processing complete', results);
    return results;
  } finally {
    isProcessingReminders = false;
  }
}

/**
 * Manually trigger failed reminder retry (for testing)
 */
export async function triggerFailedReminderRetry(): Promise<void> {
  if (isRetryingFailedReminders) {
    throw new Error('Failed reminder retry already in progress');
  }

  isRetryingFailedReminders = true;

  try {
    logger.info('🔄 Manually triggered failed reminder retry...');
    await reminderService.retryFailedReminders();
    logger.info('✅ Manual failed reminder retry complete');
  } finally {
    isRetryingFailedReminders = false;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping reminder jobs...');
  stopReminderJobs();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping reminder jobs...');
  stopReminderJobs();
});
