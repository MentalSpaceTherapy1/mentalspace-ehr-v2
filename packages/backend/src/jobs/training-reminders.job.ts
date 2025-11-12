import cron from 'node-cron';
import trainingService from '../services/training.service';
import logger from '../utils/logger';

/**
 * Training Reminders Cron Jobs
 *
 * Manages scheduled tasks for training monitoring:
 * - Daily training expiration and overdue reminders
 * - Weekly compliance reports for managers
 */

/**
 * Daily Training Reminder Job
 *
 * Runs every day at 8:00 AM to check for:
 * - Training expiring within 30 days
 * - Overdue required training
 * Sends email notifications to affected staff and their supervisors.
 *
 * Schedule: 0 8 * * * (8:00 AM daily)
 */
export const dailyTrainingReminderJob = cron.schedule(
  '0 8 * * *',
  async () => {
    try {
      logger.info('[CRON] Starting daily training reminder job');

      await trainingService.sendTrainingReminders();

      logger.info('[CRON] Daily training reminder job completed');
    } catch (error) {
      logger.error('[CRON] Error in daily training reminder job:', error);
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
 * Runs every Monday at 9:00 AM to generate organization-wide
 * training compliance reports and send to administrators.
 *
 * Schedule: 0 9 * * 1 (9:00 AM every Monday)
 */
export const weeklyComplianceReportJob = cron.schedule(
  '0 9 * * 1',
  async () => {
    try {
      logger.info('[CRON] Starting weekly training compliance report job');

      // Generate comprehensive compliance report
      const report = await trainingService.getComplianceReport();

      logger.info('[CRON] Weekly training compliance report generated', {
        totalStaff: report.totalStaff,
        compliantStaff: report.compliantStaff,
        nonCompliantStaff: report.nonCompliantStaff,
        complianceRate: report.complianceRate,
        expiringWithin30Days: report.expiringWithin30Days,
      });

      // In production, send this report via email to administrators
      // await emailService.sendTrainingComplianceReport(report);

      // Log non-compliant staff for follow-up
      const nonCompliant = report.staffDetails.filter((s) => !s.compliant);
      if (nonCompliant.length > 0) {
        logger.warn('[CRON] Non-compliant staff members:', {
          count: nonCompliant.length,
          staff: nonCompliant.map((s) => ({
            name: s.userName,
            overdueTrainings: s.overdueTrainings,
            requiredTrainings: s.requiredTrainings,
            completedTrainings: s.completedTrainings,
          })),
        });
      }
    } catch (error) {
      logger.error('[CRON] Error in weekly training compliance report job:', error);
    }
  },
  {
    scheduled: false, // Start manually
    timezone: 'America/New_York', // Adjust to your timezone
  }
);

/**
 * Monthly CEU Summary Job
 *
 * Runs on the 1st of every month at 10:00 AM to generate CEU summaries
 * for all licensed staff members.
 *
 * Schedule: 0 10 1 * * (10:00 AM on the 1st of each month)
 */
export const monthlyCEUSummaryJob = cron.schedule(
  '0 10 1 * *',
  async () => {
    try {
      logger.info('[CRON] Starting monthly CEU summary job');

      // Get all licensed staff (would need to filter by role/license)
      // For now, just log that the job ran
      logger.info('[CRON] Monthly CEU summary job would generate reports here');

      // In production:
      // - Get all users with licenses that require CEUs
      // - Generate CEU reports for each
      // - Send summary emails with current CEU credits and requirements
      // - Alert users who are behind on CEU requirements

      logger.info('[CRON] Monthly CEU summary job completed');
    } catch (error) {
      logger.error('[CRON] Error in monthly CEU summary job:', error);
    }
  },
  {
    scheduled: false, // Start manually
    timezone: 'America/New_York', // Adjust to your timezone
  }
);

/**
 * Start all training cron jobs
 */
export function startTrainingJobs(): void {
  logger.info('[CRON] Starting training cron jobs');

  dailyTrainingReminderJob.start();
  weeklyComplianceReportJob.start();
  monthlyCEUSummaryJob.start();

  logger.info('[CRON] All training cron jobs started');
}

/**
 * Stop all training cron jobs
 */
export function stopTrainingJobs(): void {
  logger.info('[CRON] Stopping training cron jobs');

  dailyTrainingReminderJob.stop();
  weeklyComplianceReportJob.stop();
  monthlyCEUSummaryJob.stop();

  logger.info('[CRON] All training cron jobs stopped');
}

/**
 * Manual trigger functions for testing
 */

/**
 * Manually trigger training reminders (for testing)
 */
export async function triggerTrainingReminders(): Promise<void> {
  logger.info('[MANUAL] Triggering training reminders manually');
  try {
    await trainingService.sendTrainingReminders();
    logger.info('[MANUAL] Training reminders completed');
  } catch (error) {
    logger.error('[MANUAL] Error triggering training reminders:', error);
    throw error;
  }
}

/**
 * Manually trigger compliance report (for testing)
 */
export async function triggerComplianceReport(): Promise<any> {
  logger.info('[MANUAL] Triggering training compliance report manually');
  try {
    const report = await trainingService.getComplianceReport();
    logger.info('[MANUAL] Training compliance report generated', {
      totalStaff: report.totalStaff,
      compliantStaff: report.compliantStaff,
      nonCompliantStaff: report.nonCompliantStaff,
      complianceRate: report.complianceRate,
    });
    return report;
  } catch (error) {
    logger.error('[MANUAL] Error triggering compliance report:', error);
    throw error;
  }
}

/**
 * Manually trigger expiring training check (for testing)
 */
export async function triggerExpiringCheck(days: number = 30): Promise<any> {
  logger.info('[MANUAL] Triggering expiring training check manually', { days });
  try {
    const expiringTrainings = await trainingService.getExpiringTraining(days);
    logger.info('[MANUAL] Expiring training check completed', {
      count: expiringTrainings.length,
      days,
    });
    return expiringTrainings;
  } catch (error) {
    logger.error('[MANUAL] Error triggering expiring training check:', error);
    throw error;
  }
}

// Export individual jobs for selective control
export default {
  dailyTrainingReminderJob,
  weeklyComplianceReportJob,
  monthlyCEUSummaryJob,
  startTrainingJobs,
  stopTrainingJobs,
  triggerTrainingReminders,
  triggerComplianceReport,
  triggerExpiringCheck,
};
