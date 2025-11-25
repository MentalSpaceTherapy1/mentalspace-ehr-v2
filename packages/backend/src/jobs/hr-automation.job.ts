import cron from 'node-cron';
import performanceReviewService from '../services/performance-review.service';
import ptoService from '../services/pto.service';
import { PrismaClient } from '@prisma/client';

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
    console.log('[HR-JOB] Running performance review reminders...');

    // Get reviews due in next 30 days
    const upcomingReviews = await performanceReviewService.getUpcomingReviews();

    if (upcomingReviews.length === 0) {
      console.log('[HR-JOB] No upcoming performance reviews');
      return;
    }

    console.log(`[HR-JOB] Found ${upcomingReviews.length} upcoming performance reviews`);

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

    // Log reminders (in production, this would send emails)
    if (reviewsIn7Days.length > 0) {
      console.log(`[HR-JOB] URGENT: ${reviewsIn7Days.length} reviews due within 7 days`);
      reviewsIn7Days.forEach(r => {
        console.log(`  - ${r.user.firstName} ${r.user.lastName} (Due: ${new Date(r.nextReviewDate!).toLocaleDateString()})`);
      });
    }

    if (reviewsIn14Days.length > 0) {
      console.log(`[HR-JOB] ${reviewsIn14Days.length} reviews due within 14 days`);
      reviewsIn14Days.forEach(r => {
        console.log(`  - ${r.user.firstName} ${r.user.lastName} (Due: ${new Date(r.nextReviewDate!).toLocaleDateString()})`);
      });
    }

    if (reviewsIn30Days.length > 0) {
      console.log(`[HR-JOB] ${reviewsIn30Days.length} reviews due within 30 days`);
    }

    console.log('[HR-JOB] Performance review reminders completed');
  } catch (error) {
    console.error('[HR-JOB] Error in performance review reminders:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Process PTO accruals for all employees
 * Runs on the 1st of every month at 12:00 AM
 */
export const processPTOAccruals = cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('[HR-JOB] Processing PTO accruals...');

    const result = await ptoService.processAccruals();

    console.log(`[HR-JOB] ${result.message}`);
    console.log(`[HR-JOB] Accrued PTO for ${result.results.length} employees`);

    // Log sample of accruals
    result.results.slice(0, 5).forEach(r => {
      console.log(`  - User ${r.userId}: +${r.accrued} days (New balance: ${r.newBalance})`);
    });

    if (result.results.length > 5) {
      console.log(`  ... and ${result.results.length - 5} more`);
    }

    console.log('[HR-JOB] PTO accrual processing completed');
  } catch (error) {
    console.error('[HR-JOB] Error processing PTO accruals:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Check for attendance compliance issues
 * Runs every Monday at 8:00 AM
 */
export const attendanceComplianceCheck = cron.schedule('0 8 * * 1', async () => {
  try {
    console.log('[HR-JOB] Running attendance compliance check...');

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

    console.log(`[HR-JOB] Checking attendance for ${users.length} active employees`);

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

    // Report issues
    if (issues.length === 0) {
      console.log('[HR-JOB] No attendance compliance issues found');
    } else {
      console.log(`[HR-JOB] Found ${issues.length} attendance compliance issue(s):`);
      issues.forEach(issue => {
        console.log(`  - ${issue.user}: ${issue.issue}`);
      });
    }

    console.log('[HR-JOB] Attendance compliance check completed');
  } catch (error) {
    console.error('[HR-JOB] Error in attendance compliance check:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Check for expiring PTO balances and send alerts
 * Runs on the 15th of every month at 10:00 AM
 */
export const expiringPTOAlert = cron.schedule('0 10 15 * *', async () => {
  try {
    console.log('[HR-JOB] Checking for expiring PTO balances...');

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
      console.log('[HR-JOB] No expiring PTO balance alerts');
    } else {
      console.log(`[HR-JOB] Found ${alerts.length} PTO balance alert(s):`);
      alerts.forEach(alert => {
        console.log(`  - ${alert.user}: ${alert.totalBalance} days total (PTO: ${alert.ptoBalance}, Vacation: ${alert.vacationBalance})`);
      });
    }

    console.log('[HR-JOB] Expiring PTO alert check completed');
  } catch (error) {
    console.error('[HR-JOB] Error checking expiring PTO:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Start all HR automation jobs
 */
export function startHRJobs() {
  console.log('[HR-JOB] Starting HR automation jobs...');

  performanceReviewReminders.start();
  console.log('[HR-JOB] - Performance review reminders (daily at 9:00 AM)');

  processPTOAccruals.start();
  console.log('[HR-JOB] - PTO accrual processing (1st of month at 12:00 AM)');

  attendanceComplianceCheck.start();
  console.log('[HR-JOB] - Attendance compliance check (Mondays at 8:00 AM)');

  expiringPTOAlert.start();
  console.log('[HR-JOB] - Expiring PTO alerts (15th of month at 10:00 AM)');

  console.log('[HR-JOB] All HR automation jobs started');
}

/**
 * Stop all HR automation jobs
 */
export function stopHRJobs() {
  console.log('[HR-JOB] Stopping HR automation jobs...');

  performanceReviewReminders.stop();
  processPTOAccruals.stop();
  attendanceComplianceCheck.stop();
  expiringPTOAlert.stop();

  console.log('[HR-JOB] All HR automation jobs stopped');
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
