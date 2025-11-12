import cron from 'node-cron';
import credentialingService from '../services/credentialing.service';
import logger from '../utils/logger';

/**
 * Credentialing Alerts Cron Jobs
 *
 * Manages scheduled tasks for credential monitoring:
 * - Daily expiration alerts
 * - Monthly OIG/SAM re-screening
 */

/**
 * Daily Expiration Alert Job
 *
 * Runs every day at 9:00 AM to check for expiring credentials
 * and send email notifications to affected staff.
 *
 * Schedule: 0 9 * * * (9:00 AM daily)
 */
export const dailyExpirationAlertJob = cron.schedule(
  '0 9 * * *',
  async () => {
    try {
      logger.info('[CRON] Starting daily expiration alert job');

      const result = await credentialingService.sendExpirationAlerts();

      logger.info('[CRON] Daily expiration alert job completed', {
        alertsSent: result.alertsSent,
        errors: result.errors,
      });
    } catch (error) {
      logger.error('[CRON] Error in daily expiration alert job:', error);
    }
  },
  {
    scheduled: false, // Start manually
    timezone: 'America/New_York', // Adjust to your timezone
  }
);

/**
 * Monthly OIG/SAM Re-screening Job
 *
 * Runs on the 1st of every month at 2:00 AM to re-screen all credentials
 * against OIG and SAM databases for compliance.
 *
 * Schedule: 0 2 1 * * (2:00 AM on the 1st of each month)
 */
export const monthlyScreeningJob = cron.schedule(
  '0 2 1 * *',
  async () => {
    try {
      logger.info('[CRON] Starting monthly OIG/SAM screening job');

      // Get all verified credentials
      const result = await credentialingService.getCredentials({
        verificationStatus: 'VERIFIED' as any,
        limit: 1000,
      });

      let screened = 0;
      let errors = 0;

      for (const credential of result.credentials) {
        try {
          await credentialingService.runScreening(credential.id);
          screened++;

          // Add delay to avoid rate limiting (if using real API)
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error('[CRON] Error screening credential:', {
            credentialId: credential.id,
            error,
          });
          errors++;
        }
      }

      logger.info('[CRON] Monthly screening job completed', {
        screened,
        errors,
        total: result.credentials.length,
      });
    } catch (error) {
      logger.error('[CRON] Error in monthly screening job:', error);
    }
  },
  {
    scheduled: false, // Start manually
    timezone: 'America/New_York', // Adjust to your timezone
  }
);

/**
 * Weekly Compliance Report Job
 *
 * Runs every Monday at 8:00 AM to generate and send compliance reports
 * to administrators.
 *
 * Schedule: 0 8 * * 1 (8:00 AM every Monday)
 */
export const weeklyComplianceReportJob = cron.schedule(
  '0 8 * * 1',
  async () => {
    try {
      logger.info('[CRON] Starting weekly compliance report job');

      // Generate comprehensive report
      const report = await credentialingService.generateReport({
        limit: 1000,
      });

      logger.info('[CRON] Weekly compliance report generated', {
        total: report.summary.total,
        expired: report.summary.expired,
        expiringWithin30Days: report.summary.expiringWithin30Days,
        screeningFlagged: report.summary.screeningFlagged,
      });

      // In production, send this report via email to administrators
      // await emailService.sendComplianceReport(report);
    } catch (error) {
      logger.error('[CRON] Error in weekly compliance report job:', error);
    }
  },
  {
    scheduled: false, // Start manually
    timezone: 'America/New_York', // Adjust to your timezone
  }
);

/**
 * Start all credentialing cron jobs
 */
export function startCredentialingJobs(): void {
  logger.info('[CRON] Starting credentialing cron jobs');

  dailyExpirationAlertJob.start();
  monthlyScreeningJob.start();
  weeklyComplianceReportJob.start();

  logger.info('[CRON] All credentialing cron jobs started');
}

/**
 * Stop all credentialing cron jobs
 */
export function stopCredentialingJobs(): void {
  logger.info('[CRON] Stopping credentialing cron jobs');

  dailyExpirationAlertJob.stop();
  monthlyScreeningJob.stop();
  weeklyComplianceReportJob.stop();

  logger.info('[CRON] All credentialing cron jobs stopped');
}

/**
 * Manual trigger functions for testing
 */

/**
 * Manually trigger expiration alerts (for testing)
 */
export async function triggerExpirationAlerts(): Promise<void> {
  logger.info('[MANUAL] Triggering expiration alerts manually');
  try {
    const result = await credentialingService.sendExpirationAlerts();
    logger.info('[MANUAL] Expiration alerts completed', result);
  } catch (error) {
    logger.error('[MANUAL] Error triggering expiration alerts:', error);
    throw error;
  }
}

/**
 * Manually trigger screening (for testing)
 */
export async function triggerScreening(): Promise<void> {
  logger.info('[MANUAL] Triggering screening manually');
  try {
    const result = await credentialingService.getCredentials({
      verificationStatus: 'VERIFIED' as any,
      limit: 100,
    });

    let screened = 0;
    for (const credential of result.credentials) {
      try {
        await credentialingService.runScreening(credential.id);
        screened++;
      } catch (error) {
        logger.error('[MANUAL] Error screening credential:', {
          credentialId: credential.id,
          error,
        });
      }
    }

    logger.info('[MANUAL] Screening completed', { screened });
  } catch (error) {
    logger.error('[MANUAL] Error triggering screening:', error);
    throw error;
  }
}

/**
 * Manually trigger compliance report (for testing)
 */
export async function triggerComplianceReport(): Promise<any> {
  logger.info('[MANUAL] Triggering compliance report manually');
  try {
    const report = await credentialingService.generateReport({
      limit: 1000,
    });
    logger.info('[MANUAL] Compliance report generated', report.summary);
    return report;
  } catch (error) {
    logger.error('[MANUAL] Error triggering compliance report:', error);
    throw error;
  }
}

// Export individual jobs for selective control
export default {
  dailyExpirationAlertJob,
  monthlyScreeningJob,
  weeklyComplianceReportJob,
  startCredentialingJobs,
  stopCredentialingJobs,
  triggerExpirationAlerts,
  triggerScreening,
  triggerComplianceReport,
};
