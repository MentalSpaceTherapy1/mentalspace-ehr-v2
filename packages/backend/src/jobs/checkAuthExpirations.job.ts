import cron from 'node-cron';
import * as PriorAuthService from '../services/priorAuthorization.service';
import logger from '../utils/logger';

/**
 * Prior Authorization Expiration Check Job
 * Module 2: Prior Authorizations
 *
 * Runs daily at 8:00 AM to check for:
 * - Expiring authorizations (30, 14, 7 days before end date)
 * - Expired authorizations that need status update
 *
 * Schedule: "0 8 * * *" (Every day at 8:00 AM)
 */

export function startAuthExpirationCheckJob() {
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('Starting prior authorization expiration check job');

    try {
      await PriorAuthService.checkExpiringAuthorizations();

      logger.info('Prior authorization expiration check completed successfully');
    } catch (error: any) {
      logger.error('Error in prior authorization expiration check job', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Prior authorization expiration check job scheduled (daily at 8:00 AM)');
}

/**
 * Manual trigger for testing
 * This can be called directly for immediate execution
 */
export async function runAuthExpirationCheckNow(): Promise<void> {
  logger.info('Manually triggering prior authorization expiration check');

  try {
    await PriorAuthService.checkExpiringAuthorizations();
    logger.info('Manual prior authorization expiration check completed successfully');
  } catch (error: any) {
    logger.error('Error in manual prior authorization expiration check', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
