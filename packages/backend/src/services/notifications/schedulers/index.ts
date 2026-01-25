/**
 * Notification Schedulers
 * Phase 3.1: Export all notification schedulers
 */

export {
  AppointmentReminderScheduler,
  appointmentReminderScheduler,
} from './appointment.scheduler';

export {
  ClinicalNoteReminderScheduler,
  clinicalNoteReminderScheduler,
} from './clinical.scheduler';

import { appointmentReminderScheduler } from './appointment.scheduler';
import { clinicalNoteReminderScheduler } from './clinical.scheduler';
import logger from '../../../utils/logger';

/**
 * Start all notification schedulers
 */
export function startAllSchedulers(): void {
  logger.info('Starting all notification schedulers');

  appointmentReminderScheduler.start();
  clinicalNoteReminderScheduler.start();

  logger.info('All notification schedulers started');
}

/**
 * Stop all notification schedulers
 */
export function stopAllSchedulers(): void {
  logger.info('Stopping all notification schedulers');

  appointmentReminderScheduler.stop();
  clinicalNoteReminderScheduler.stop();

  logger.info('All notification schedulers stopped');
}

/**
 * Get status of all schedulers
 */
export function getAllSchedulerStatus() {
  return {
    appointmentReminder: appointmentReminderScheduler.getStatus(),
    clinicalNoteReminder: clinicalNoteReminderScheduler.getStatus(),
  };
}

/**
 * Run all schedulers immediately (useful for testing/manual trigger)
 */
export async function runAllSchedulersNow() {
  logger.info('Running all schedulers immediately');

  const results = await Promise.allSettled([
    appointmentReminderScheduler.runNow(),
    clinicalNoteReminderScheduler.runNow(),
  ]);

  return {
    appointmentReminder:
      results[0].status === 'fulfilled' ? results[0].value : { error: (results[0] as PromiseRejectedResult).reason },
    clinicalNoteReminder:
      results[1].status === 'fulfilled' ? results[1].value : { error: (results[1] as PromiseRejectedResult).reason },
  };
}
