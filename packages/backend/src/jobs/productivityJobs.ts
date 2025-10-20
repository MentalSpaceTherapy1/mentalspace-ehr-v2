import prisma from '../services/database';
// Productivity Module - Scheduled Jobs
// Phase 6 - Week 20 - Daily, Weekly, Monthly, and Hourly Jobs

import cron from 'node-cron';
import { metricService } from '../services/metrics/metricService';
import { alertService } from '../services/alerts/alertService';
import { georgiaComplianceService } from '../services/compliance/georgiaCompliance';
import logger from '../utils/logger';

/**
 * Daily Metric Calculation Job
 * Runs at midnight (00:00) every day
 * Calculates metrics for previous day and generates alerts
 */
export function startDailyMetricCalculation() {
  cron.schedule('0 0 * * *', async () => {
    logger.info('🔄 Starting daily metric calculation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const periodStart = yesterday;
      const periodEnd = new Date(yesterday);
      periodEnd.setHours(23, 59, 59, 999);

      // Get all active clinicians
      const clinicians = await prisma.user.findMany({
        where: { roles: { hasSome: ['CLINICIAN'] }, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      });

      logger.info(`Calculating metrics for ${clinicians.length} clinicians`);

      for (const clinician of clinicians) {
        try {
          // Calculate all metrics
          const results = await metricService.calculateAllMetrics(
            clinician.id,
            periodStart,
            periodEnd
          );

          // Save metrics to database
          await metricService.saveMetrics(clinician.id, periodStart, periodEnd, results);

          // Check thresholds and create alerts
          await alertService.checkThresholdsAndCreateAlerts(clinician.id, results);

          // Auto-resolve alerts if metrics improved
          await alertService.autoResolveAlerts(clinician.id, results);

          logger.debug(`Metrics calculated for ${clinician.firstName} ${clinician.lastName}`, {
            clinicianId: clinician.id,
            metricsCount: Object.keys(results).length,
          });
        } catch (error) {
          logger.error(`Error calculating metrics for clinician ${clinician.id}`, { error });
        }
      }

      logger.info('✅ Daily metric calculation complete', {
        cliniciansProcessed: clinicians.length,
      });
    } catch (error) {
      logger.error('❌ Daily metric calculation failed', { error });
    }
  });

  logger.info('✓ Daily metric calculation job scheduled (00:00 daily)');
}

/**
 * Weekly Aggregation Job
 * Runs every Sunday at 11:00 PM
 * Aggregates daily metrics into weekly summaries and sends performance reports
 */
export function startWeeklyAggregation() {
  cron.schedule('0 23 * * 0', async () => {
    logger.info('🔄 Starting weekly metric aggregation...');

    try {
      const endOfWeek = new Date();
      endOfWeek.setHours(23, 59, 59, 999);

      const startOfWeek = new Date(endOfWeek);
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const clinicians = await prisma.user.findMany({
        where: { roles: { hasSome: ['CLINICIAN'] }, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          emailNotifications: true,
        },
      });

      logger.info(`Aggregating weekly metrics for ${clinicians.length} clinicians`);

      for (const clinician of clinicians) {
        try {
          // Calculate weekly metrics
          const results = await metricService.calculateAllMetrics(
            clinician.id,
            startOfWeek,
            endOfWeek
          );

          // Save weekly aggregated metrics
          await metricService.saveMetrics(clinician.id, startOfWeek, endOfWeek, results);

          // TODO: Send weekly performance report email
          if (clinician.emailNotifications) {
            logger.info(`Weekly report email queued for ${clinician.email}`, {
              clinicianId: clinician.id,
            });
            // await emailService.sendWeeklyPerformanceReport(clinician, results);
          }

          logger.debug(`Weekly aggregation complete for ${clinician.firstName} ${clinician.lastName}`);
        } catch (error) {
          logger.error(`Error in weekly aggregation for clinician ${clinician.id}`, { error });
        }
      }

      logger.info('✅ Weekly aggregation complete', {
        cliniciansProcessed: clinicians.length,
      });
    } catch (error) {
      logger.error('❌ Weekly aggregation failed', { error });
    }
  });

  logger.info('✓ Weekly aggregation job scheduled (Sunday 23:00)');
}

/**
 * Monthly Aggregation Job
 * Runs on the 1st of every month at 01:00 AM
 * Aggregates weekly metrics into monthly summaries
 */
export function startMonthlyAggregation() {
  cron.schedule('0 1 1 * *', async () => {
    logger.info('🔄 Starting monthly metric aggregation...');

    try {
      const endOfMonth = new Date();
      endOfMonth.setDate(0); // Last day of previous month
      endOfMonth.setHours(23, 59, 59, 999);

      const startOfMonth = new Date(endOfMonth);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const clinicians = await prisma.user.findMany({
        where: { roles: { hasSome: ['CLINICIAN'] }, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      });

      logger.info(`Aggregating monthly metrics for ${clinicians.length} clinicians`);

      for (const clinician of clinicians) {
        try {
          // Calculate monthly metrics
          const results = await metricService.calculateAllMetrics(
            clinician.id,
            startOfMonth,
            endOfMonth
          );

          // Save monthly aggregated metrics
          await metricService.saveMetrics(clinician.id, startOfMonth, endOfMonth, results);

          logger.debug(`Monthly aggregation complete for ${clinician.firstName} ${clinician.lastName}`);
        } catch (error) {
          logger.error(`Error in monthly aggregation for clinician ${clinician.id}`, { error });
        }
      }

      logger.info('✅ Monthly aggregation complete', {
        cliniciansProcessed: clinicians.length,
        month: startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
    } catch (error) {
      logger.error('❌ Monthly aggregation failed', { error });
    }
  });

  logger.info('✓ Monthly aggregation job scheduled (1st of month 01:00)');
}

/**
 * Hourly Alert Processing Job
 * Runs every hour at the top of the hour
 * Processes stale alerts and generates reminders
 */
export function startHourlyAlertProcessing() {
  cron.schedule('0 * * * *', async () => {
    logger.info('🔄 Processing alerts...');

    try {
      // Process all pending alerts
      await alertService.processAllAlerts();

      logger.info('✅ Alert processing complete');
    } catch (error) {
      logger.error('❌ Alert processing failed', { error });
    }
  });

  logger.info('✓ Hourly alert processing job scheduled (every hour)');
}

/**
 * Daily Georgia Compliance Check Job
 * Runs every day at 06:00 AM
 * Checks all Georgia-specific compliance rules
 */
export function startDailyGeorgiaComplianceCheck() {
  cron.schedule('0 6 * * *', async () => {
    logger.info('🔄 Running Georgia compliance checks...');

    try {
      await georgiaComplianceService.runComplianceChecksForAll();

      // Get compliance summary
      const summary = await georgiaComplianceService.getPracticeComplianceSummary();

      logger.info('✅ Georgia compliance check complete', {
        totalClinicians: summary.totalClinicians,
        compliantClinicians: summary.compliantClinicians,
        criticalViolations: summary.violationsBySeverity.critical,
        warningViolations: summary.violationsBySeverity.warning,
      });

      // If there are critical violations, send alert to admins
      if (summary.violationsBySeverity.critical > 0) {
        logger.warn('🚨 Critical compliance violations detected', {
          critical: summary.violationsBySeverity.critical,
        });

        // TODO: Send alert email to administrators
        // await emailService.sendComplianceAlertToAdmins(summary);
      }
    } catch (error) {
      logger.error('❌ Georgia compliance check failed', { error });
    }
  });

  logger.info('✓ Georgia compliance check job scheduled (daily 06:00)');
}

/**
 * Start all productivity jobs
 */
export function startAllProductivityJobs() {
  logger.info('🚀 Starting all productivity module scheduled jobs...');

  startDailyMetricCalculation();
  startWeeklyAggregation();
  startMonthlyAggregation();
  startHourlyAlertProcessing();
  startDailyGeorgiaComplianceCheck();

  logger.info('✅ All productivity jobs started successfully');
  logger.info('📊 Job Schedule Summary:');
  logger.info('  • Daily Metrics: 00:00 (midnight)');
  logger.info('  • Weekly Aggregation: Sunday 23:00');
  logger.info('  • Monthly Aggregation: 1st of month 01:00');
  logger.info('  • Hourly Alerts: Every hour :00');
  logger.info('  • Georgia Compliance: Daily 06:00');
}

/**
 * Manual trigger for daily metric calculation (for testing)
 */
export async function triggerDailyMetricCalculationNow() {
  logger.info('🔄 Manually triggering daily metric calculation...');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const periodStart = yesterday;
  const periodEnd = new Date(yesterday);
  periodEnd.setHours(23, 59, 59, 999);

  const clinicians = await prisma.user.findMany({
    where: { roles: { hasSome: ['CLINICIAN'] }, isActive: true },
    select: { id: true },
  });

  for (const clinician of clinicians) {
    const results = await metricService.calculateAllMetrics(
      clinician.id,
      periodStart,
      periodEnd
    );
    await metricService.saveMetrics(clinician.id, periodStart, periodEnd, results);
    await alertService.checkThresholdsAndCreateAlerts(clinician.id, results);
  }

  logger.info('✅ Manual trigger complete');
}
