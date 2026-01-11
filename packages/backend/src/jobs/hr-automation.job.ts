import cron from 'node-cron';
import performanceReviewService from '../services/performance-review.service';
import ptoService from '../services/pto.service';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendEmail, EmailTemplates, isResendConfigured } from '../services/resend.service';
import config from '../config';

const prisma = new PrismaClient();

/**
 * HR Automation Cron Jobs
 *
 * This module contains automated jobs for HR functions:
 * 1. Performance review reminders (daily)
 * 2. PTO accrual processing (monthly)
 * 3. Attendance compliance checks (weekly)
 */

/**
 * Send reminders for upcoming performance reviews
 * Runs daily at 9:00 AM
 */
export const performanceReviewReminders = cron.schedule('0 9 * * *', async () => {
  try {
    logger.info('Running performance review reminders');

    // Get reviews due in next 30 days
    const upcomingReviews = await performanceReviewService.getUpcomingReviews();

    if (upcomingReviews.length === 0) {
      logger.info('No upcoming performance reviews');
      return;
    }

    // Group by time until due
    const reviewsIn7Days = upcomingReviews.filter(r => {
      const daysUntil = Math.ceil(
        (new Date(r.nextReviewDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 7 && daysUntil > 0;
    });

    const reviewsIn14Days = upcomingReviews.filter(r => {
      const daysUntil = Math.ceil(
        (new Date(r.nextReviewDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 14 && daysUntil > 7;
    });

    const reviewsIn30Days = upcomingReviews.filter(r => {
      const daysUntil = Math.ceil(
        (new Date(r.nextReviewDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 30 && daysUntil > 14;
    });

    // Send email reminders for upcoming reviews
    const dashboardUrl = `${config.frontendUrl}/hr/performance-reviews`;
    let emailsSent = 0;
    let emailsFailed = 0;

    // Send urgent emails for reviews due within 7 days
    for (const review of reviewsIn7Days) {
      const employeeName = `${review.user.firstName} ${review.user.lastName}`;
      const daysUntil = Math.ceil(
        (new Date(review.nextReviewDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get supervisor email (if available)
      const supervisor = await prisma.user.findFirst({
        where: {
          roles: { hasSome: ['SUPERVISOR', 'ADMINISTRATOR', 'SUPER_ADMIN'] },
        },
        select: { email: true, firstName: true },
      });

      if (supervisor?.email && isResendConfigured()) {
        const template = EmailTemplates.performanceReviewReminder(
          supervisor.firstName,
          employeeName,
          new Date(review.nextReviewDate!),
          daysUntil,
          dashboardUrl
        );

        const sent = await sendEmail({
          to: supervisor.email,
          subject: template.subject,
          html: template.html,
        });

        if (sent) {
          emailsSent++;
          logger.info('Performance review reminder sent', {
            employee: employeeName,
            supervisor: supervisor.email,
            daysUntil,
          });
        } else {
          emailsFailed++;
        }
      }
    }

    // Send emails for reviews due within 14 days
    for (const review of reviewsIn14Days) {
      const employeeName = `${review.user.firstName} ${review.user.lastName}`;
      const daysUntil = Math.ceil(
        (new Date(review.nextReviewDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const supervisor = await prisma.user.findFirst({
        where: {
          roles: { hasSome: ['SUPERVISOR', 'ADMINISTRATOR', 'SUPER_ADMIN'] },
        },
        select: { email: true, firstName: true },
      });

      if (supervisor?.email && isResendConfigured()) {
        const template = EmailTemplates.performanceReviewReminder(
          supervisor.firstName,
          employeeName,
          new Date(review.nextReviewDate!),
          daysUntil,
          dashboardUrl
        );

        const sent = await sendEmail({
          to: supervisor.email,
          subject: template.subject,
          html: template.html,
        });

        if (sent) {
          emailsSent++;
        } else {
          emailsFailed++;
        }
      }
    }

    // Log 30-day reviews without emailing
    if (reviewsIn30Days.length > 0) {
      logger.info('Performance reviews due within 30 days', { count: reviewsIn30Days.length });
    }

    logger.info('Performance review reminders completed', {
      totalUpcoming: upcomingReviews.length,
      urgent7Days: reviewsIn7Days.length,
      within14Days: reviewsIn14Days.length,
      within30Days: reviewsIn30Days.length,
      emailsSent,
      emailsFailed,
    });
  } catch (error) {
    logger.error('Error in performance review reminders', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Process PTO accruals for all employees
 * Runs on the 1st of every month at 12:00 AM
 */
export const processPTOAccruals = cron.schedule('0 0 1 * *', async () => {
  try {
    logger.info('Processing PTO accruals');

    const result = await ptoService.processAccruals();

    // Log sample of accruals
    const sampleAccruals = result.results.slice(0, 5).map(r => ({
      userId: r.userId,
      accrued: r.accrued,
      newBalance: r.newBalance
    }));

    logger.info('PTO accrual processing completed', {
      message: result.message,
      employeesProcessed: result.results.length,
      sampleAccruals
    });
  } catch (error) {
    logger.error('Error processing PTO accruals', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Check for attendance compliance issues
 * Runs every Monday at 8:00 AM
 */
export const attendanceComplianceCheck = cron.schedule('0 8 * * 1', async () => {
  try {
    logger.info('Running attendance compliance check');

    // Get date range for previous week
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 7);
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - 1);

    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        employmentStatus: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    logger.info('Checking attendance for active employees', { employeeCount: users.length });

    const issues: any[] = [];

    // Check each user's attendance for the week
    for (const user of users) {
      const records = await prisma.timeAttendance.findMany({
        where: {
          userId: user.id,
          date: {
            gte: lastMonday,
            lte: lastSunday,
          },
        },
      });

      // Expected 5 working days per week
      const expectedDays = 5;
      const recordedDays = records.length;

      if (recordedDays < expectedDays) {
        const missingDays = expectedDays - recordedDays;
        issues.push({
          user: `${user.firstName} ${user.lastName}`,
          issue: `Missing ${missingDays} attendance record(s)`,
          recordedDays,
          expectedDays,
        });
      }

      // Check for unapproved records
      const unapprovedRecords = records.filter(r => !r.approvedById);
      if (unapprovedRecords.length > 0) {
        issues.push({
          user: `${user.firstName} ${user.lastName}`,
          issue: `${unapprovedRecords.length} unapproved attendance record(s)`,
        });
      }

      // Check for missing clock-out
      const missingClockOut = records.filter(r => r.actualStart && !r.actualEnd && !r.isAbsent);
      if (missingClockOut.length > 0) {
        issues.push({
          user: `${user.firstName} ${user.lastName}`,
          issue: `${missingClockOut.length} record(s) missing clock-out time`,
        });
      }
    }

    // Report issues and send email alerts
    if (issues.length === 0) {
      logger.info('No attendance compliance issues found');
    } else {
      logger.warn('Attendance compliance issues found', {
        issueCount: issues.length,
        issues: issues
      });

      // Send email to HR/supervisors if configured
      if (isResendConfigured()) {
        const hrUsers = await prisma.user.findMany({
          where: {
            roles: { hasSome: ['ADMINISTRATOR', 'SUPER_ADMIN'] },
            employmentStatus: 'ACTIVE',
          },
          select: { email: true, firstName: true },
        });

        const dashboardUrl = `${config.frontendUrl}/hr/attendance`;
        const formattedIssues = issues.map(i => ({
          employeeName: i.user,
          issue: i.issue,
          details: i.recordedDays !== undefined ? `${i.recordedDays}/${i.expectedDays} days recorded` : undefined,
        }));

        for (const hrUser of hrUsers) {
          if (hrUser.email) {
            const template = EmailTemplates.attendanceIssueAlert(
              hrUser.firstName,
              lastMonday,
              lastSunday,
              formattedIssues,
              dashboardUrl
            );

            const sent = await sendEmail({
              to: hrUser.email,
              subject: template.subject,
              html: template.html,
            });

            if (sent) {
              logger.info('Attendance compliance alert sent', {
                recipient: hrUser.email,
                issueCount: issues.length,
              });
            }
          }
        }
      }
    }

    logger.info('Attendance compliance check completed');
  } catch (error) {
    logger.error('Error in attendance compliance check', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Check for expiring PTO balances and send alerts
 * Runs on the 15th of every month at 10:00 AM
 */
export const expiringPTOAlert = cron.schedule('0 10 15 * *', async () => {
  try {
    logger.info('Checking for expiring PTO balances');

    // Get all PTO balances
    const balances = await prisma.pTOBalance.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Check for high balances that might expire
    const alerts: any[] = [];

    balances.forEach(balance => {
      const totalBalance = balance.ptoBalance.toNumber() +
                          balance.vacationBalance.toNumber();

      // Alert if employee has more than 40 days combined (common expiration threshold)
      if (totalBalance > 40) {
        alerts.push({
          user: `${balance.user.firstName} ${balance.user.lastName}`,
          ptoBalance: balance.ptoBalance.toNumber(),
          vacationBalance: balance.vacationBalance.toNumber(),
          totalBalance,
          message: 'High PTO balance - consider using or may expire',
        });
      }
    });

    if (alerts.length === 0) {
      logger.info('No expiring PTO balance alerts');
    } else {
      logger.warn('High PTO balance alerts', {
        alertCount: alerts.length,
        alerts: alerts
      });

      // Send email alerts to employees with high PTO balances
      if (isResendConfigured()) {
        const portalUrl = `${config.frontendUrl}/staff/pto`;
        let emailsSent = 0;

        for (const alert of alerts) {
          const balance = balances.find(b =>
            `${b.user.firstName} ${b.user.lastName}` === alert.user
          );

          if (balance?.user.email) {
            const template = EmailTemplates.ptoBalanceAlert(
              `${balance.user.firstName}`,
              alert.ptoBalance,
              alert.vacationBalance,
              alert.totalBalance,
              'Unused PTO may expire at year end. Please review your company\'s PTO policy.',
              portalUrl
            );

            const sent = await sendEmail({
              to: balance.user.email,
              subject: template.subject,
              html: template.html,
            });

            if (sent) {
              emailsSent++;
              logger.info('PTO balance alert sent', {
                employee: alert.user,
                totalBalance: alert.totalBalance,
              });
            }
          }
        }

        logger.info('PTO balance alert emails completed', { emailsSent });
      }
    }

    logger.info('Expiring PTO alert check completed');
  } catch (error) {
    logger.error('Error checking expiring PTO', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Start all HR automation jobs
 */
export function startHRJobs() {
  logger.info('Starting HR automation jobs');

  performanceReviewReminders.start();
  logger.info('Scheduled: Performance review reminders (daily at 9:00 AM)');

  processPTOAccruals.start();
  logger.info('Scheduled: PTO accrual processing (1st of month at 12:00 AM)');

  attendanceComplianceCheck.start();
  logger.info('Scheduled: Attendance compliance check (Mondays at 8:00 AM)');

  expiringPTOAlert.start();
  logger.info('Scheduled: Expiring PTO alerts (15th of month at 10:00 AM)');

  logger.info('All HR automation jobs started');
}

/**
 * Stop all HR automation jobs
 */
export function stopHRJobs() {
  logger.info('Stopping HR automation jobs');

  performanceReviewReminders.stop();
  processPTOAccruals.stop();
  attendanceComplianceCheck.stop();
  expiringPTOAlert.stop();

  logger.info('All HR automation jobs stopped');
}

// Export individual jobs for manual triggering
export default {
  performanceReviewReminders,
  processPTOAccruals,
  attendanceComplianceCheck,
  expiringPTOAlert,
  startHRJobs,
  stopHRJobs,
};
