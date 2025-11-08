import cron from 'node-cron';
import { clinicalNoteReminderService } from '../services/clinicalNoteReminder.service';
import logger from '../utils/logger';

/**
 * Cron job to process pending clinical note reminders
 * Runs every 15 minutes to check for reminders that need to be sent
 */
export function startNoteReminderJob() {
  // Run every 15 minutes: */15 * * * *
  const job = cron.schedule('*/15 * * * *', async () => {
    logger.info('Note reminder job started');

    try {
      const results = await clinicalNoteReminderService.processPendingReminders();

      logger.info('Note reminder job completed', {
        sent: results.sent,
        failed: results.failed,
        cancelled: results.cancelled,
      });
    } catch (error: any) {
      logger.error('Note reminder job failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Note reminder cron job initialized', {
    schedule: 'Every 15 minutes',
    pattern: '*/15 * * * *',
  });

  return job;
}

/**
 * Manual trigger for testing
 */
export async function triggerNoteReminderJob() {
  logger.info('Manually triggering note reminder job');

  try {
    const results = await clinicalNoteReminderService.processPendingReminders();

    logger.info('Manual note reminder job completed', results);

    return results;
  } catch (error: any) {
    logger.error('Manual note reminder job failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
