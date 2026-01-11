import cron from 'node-cron';
import logger from '../../utils/logger';
import { processReminders } from './reminder.service';

/**
 * Cron job scheduler for automated tasks
 */
export class NotificationScheduler {
  private reminderJob: ReturnType<typeof cron.schedule> | null = null;
  private isRunning: boolean = false;

  /**
   * Start the reminder processing cron job
   * Runs every 15 minutes to check for appointments needing reminders
   */
  startReminderJob() {
    if (this.reminderJob) {
      logger.warn('Reminder job is already running');
      return;
    }

    // Schedule: Every 15 minutes
    // Cron format: minute hour day month weekday
    // */15 * * * * = every 15 minutes
    this.reminderJob = cron.schedule('*/15 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Previous reminder job still running, skipping this cycle');
        return;
      }

      try {
        this.isRunning = true;
        logger.info('🔔 Starting scheduled reminder processing...');

        const results = await processReminders();

        logger.info('✅ Reminder processing completed', {
          total: results.total,
          emailSent: results.emailSent,
          smsSent: results.smsSent,
          failed: results.failed,
        });
      } catch (error) {
        logger.error('❌ Error in scheduled reminder processing', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('✅ Reminder cron job started (runs every 15 minutes)');
  }

  /**
   * Stop the reminder processing cron job
   */
  stopReminderJob() {
    if (this.reminderJob) {
      this.reminderJob.stop();
      this.reminderJob = null;
      logger.info('🛑 Reminder cron job stopped');
    }
  }

  /**
   * Get the status of the scheduler
   */
  getStatus() {
    return {
      reminderJobActive: this.reminderJob !== null,
      isProcessing: this.isRunning,
    };
  }

  /**
   * Run reminder processing immediately (for testing)
   */
  async runReminderJobNow() {
    if (this.isRunning) {
      throw new Error('Reminder job is already running');
    }

    try {
      this.isRunning = true;
      logger.info('🔔 Running reminder processing manually...');

      const results = await processReminders();

      logger.info('✅ Manual reminder processing completed', {
        total: results.total,
        emailSent: results.emailSent,
        smsSent: results.smsSent,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      logger.error('❌ Error in manual reminder processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

// Export a singleton instance
export const notificationScheduler = new NotificationScheduler();
