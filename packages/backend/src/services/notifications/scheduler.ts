/**
 * Notification Scheduler (Legacy Wrapper)
 * Phase 3.1: Updated to use unified notification architecture
 *
 * This file maintains backward compatibility with existing code
 * that imports from './scheduler'. It now delegates to the new
 * unified scheduler implementations.
 *
 * @deprecated Use the new unified schedulers from './schedulers' instead:
 * ```typescript
 * import {
 *   startAllSchedulers,
 *   stopAllSchedulers,
 *   getAllSchedulerStatus,
 * } from './schedulers';
 * ```
 */

import logger from '../../utils/logger';
import {
  appointmentReminderScheduler,
  clinicalNoteReminderScheduler,
  startAllSchedulers,
  stopAllSchedulers,
  getAllSchedulerStatus,
} from './schedulers';

/**
 * Legacy notification scheduler class
 * @deprecated Use startAllSchedulers(), stopAllSchedulers(), etc. from './schedulers'
 */
export class NotificationScheduler {
  private started = false;

  /**
   * Start the reminder processing cron job
   * Now delegates to the new unified schedulers
   * @deprecated Use startAllSchedulers() instead
   */
  startReminderJob() {
    if (this.started) {
      logger.warn('Scheduler already started');
      return;
    }

    startAllSchedulers();
    this.started = true;
  }

  /**
   * Stop the reminder processing cron job
   * @deprecated Use stopAllSchedulers() instead
   */
  stopReminderJob() {
    if (!this.started) {
      return;
    }

    stopAllSchedulers();
    this.started = false;
  }

  /**
   * Get the status of the scheduler
   * @deprecated Use getAllSchedulerStatus() instead
   */
  getStatus() {
    const status = getAllSchedulerStatus();

    // Return legacy format for backward compatibility
    return {
      reminderJobActive: status.appointmentReminder.isRunning || status.clinicalNoteReminder.isRunning,
      isProcessing: status.appointmentReminder.isProcessing || status.clinicalNoteReminder.isProcessing,
      // New fields for richer status info
      schedulers: status,
    };
  }

  /**
   * Run reminder processing immediately (for testing)
   * @deprecated Use appointmentReminderScheduler.runNow() or clinicalNoteReminderScheduler.runNow()
   */
  async runReminderJobNow() {
    logger.info('Running unified schedulers manually...');

    const results = await Promise.allSettled([
      appointmentReminderScheduler.runNow(),
      clinicalNoteReminderScheduler.runNow(),
    ]);

    const appointmentResult = results[0].status === 'fulfilled' ? results[0].value : null;
    const clinicalResult = results[1].status === 'fulfilled' ? results[1].value : null;

    // Return legacy format for backward compatibility
    const total = (appointmentResult?.total || 0) + (clinicalResult?.total || 0);
    const sent = (appointmentResult?.sent || 0) + (clinicalResult?.sent || 0);
    const failed = (appointmentResult?.failed || 0) + (clinicalResult?.failed || 0);

    return {
      total,
      emailSent: sent, // Legacy field - now combined across channels
      smsSent: 0, // Legacy field - SMS count now included in 'sent'
      failed,
      // New detailed results
      details: {
        appointmentReminder: appointmentResult,
        clinicalNoteReminder: clinicalResult,
      },
    };
  }
}

// Export singleton instance (for backward compatibility)
export const notificationScheduler = new NotificationScheduler();

// Re-export new unified exports for migration path
export {
  startAllSchedulers,
  stopAllSchedulers,
  getAllSchedulerStatus,
  appointmentReminderScheduler,
  clinicalNoteReminderScheduler,
};
