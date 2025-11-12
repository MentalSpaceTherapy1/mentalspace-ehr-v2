import cron from 'node-cron';
import { PrismaClient } from '@mentalspace/database';
import { sendReportEmail } from './email-distribution.service';
import { trackDelivery, updateDeliveryStatus } from './delivery-tracker.service';
import { addMinutes, addDays, addWeeks, addMonths, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

interface ScheduleConfig {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cronExpression?: string;
  timezone: string;
}

export function startReportScheduler() {
  console.log('[Report Scheduler] Starting automated report scheduler...');

  // Check for scheduled reports every minute
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndExecuteSchedules();
    } catch (error) {
      console.error('[Report Scheduler] Error in scheduler:', error);
    }
  });

  console.log('[Report Scheduler] Scheduler started successfully');
}

async function checkAndExecuteSchedules() {
  const now = new Date();

  // Find all active schedules that are due
  const dueSchedules = await prisma.reportSchedule.findMany({
    where: {
      status: 'ACTIVE',
      nextRunDate: {
        lte: now
      }
    },
    include: {
      report: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  console.log(`[Report Scheduler] Found ${dueSchedules.length} due schedules`);

  for (const schedule of dueSchedules) {
    try {
      await executeScheduledReport(schedule.id);
    } catch (error) {
      console.error(`[Report Scheduler] Failed to execute schedule ${schedule.id}:`, error);
    }
  }
}

export async function executeScheduledReport(scheduleId: string) {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      report: true,
      user: true
    }
  });

  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} not found`);
  }

  console.log(`[Report Scheduler] Executing schedule ${scheduleId} for report ${schedule.reportType}`);

  // Create delivery log
  const deliveryLog = await trackDelivery({
    scheduleId: schedule.id,
    reportId: schedule.reportId,
    recipients: schedule.recipients as any,
    format: schedule.format,
    status: 'PENDING'
  });

  try {
    // Check conditional distribution if configured
    if (schedule.distributionCondition) {
      const shouldSend = await evaluateDistributionCondition(
        schedule.reportId,
        schedule.distributionCondition as any
      );

      if (!shouldSend) {
        console.log(`[Report Scheduler] Skipping distribution due to condition not met`);
        await updateDeliveryStatus(deliveryLog.id, 'SKIPPED', 'Condition not met');
        await updateNextRunDate(schedule);
        return;
      }
    }

    // Generate and send report
    const recipients = schedule.recipients as any;
    await sendReportEmail({
      reportId: schedule.reportId,
      reportType: schedule.reportType,
      recipients: recipients.to || [],
      cc: recipients.cc || [],
      bcc: recipients.bcc || [],
      format: schedule.format as any,
      scheduleName: `Scheduled Report - ${schedule.reportType}`,
      user: schedule.user
    });

    // Update delivery status
    await updateDeliveryStatus(deliveryLog.id, 'SENT', undefined, new Date());

    // Update schedule
    await updateNextRunDate(schedule);

    console.log(`[Report Scheduler] Successfully executed schedule ${scheduleId}`);
  } catch (error) {
    console.error(`[Report Scheduler] Failed to send report:`, error);
    await updateDeliveryStatus(
      deliveryLog.id,
      'FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

async function updateNextRunDate(schedule: any) {
  const now = new Date();
  let nextRun: Date;

  const timezone = schedule.timezone || 'America/New_York';

  switch (schedule.frequency) {
    case 'DAILY':
      nextRun = addDays(now, 1);
      break;
    case 'WEEKLY':
      nextRun = addWeeks(now, 1);
      break;
    case 'MONTHLY':
      nextRun = addMonths(now, 1);
      break;
    case 'CUSTOM':
      if (schedule.cronExpression) {
        // Parse cron expression to calculate next run
        nextRun = calculateNextCronRun(schedule.cronExpression, timezone);
      } else {
        nextRun = addDays(now, 1);
      }
      break;
    default:
      nextRun = addDays(now, 1);
  }

  await prisma.reportSchedule.update({
    where: { id: schedule.id },
    data: {
      lastRunDate: now,
      nextRunDate: nextRun
    }
  });
}

function calculateNextCronRun(cronExpression: string, timezone: string): Date {
  // Simple cron parser for common patterns
  // Format: minute hour day month dayOfWeek
  const parts = cronExpression.split(' ');

  const now = new Date();
  const zonedNow = utcToZonedTime(now, timezone);

  // For now, default to next day same time if complex cron
  // In production, use a proper cron parser library
  let nextRun = addDays(zonedNow, 1);

  // Convert back to UTC
  return zonedTimeToUtc(nextRun, timezone);
}

async function evaluateDistributionCondition(
  reportId: string,
  condition: any
): Promise<boolean> {
  try {
    const { type, threshold, metric } = condition;

    switch (type) {
      case 'THRESHOLD':
        // Check if metric exceeds threshold
        return await checkThresholdCondition(reportId, metric, threshold);

      case 'CHANGE_DETECTION':
        // Check if data has changed since last run
        return await checkChangeDetection(reportId);

      case 'EXCEPTION':
        // Check for anomalies or exceptions
        return await checkExceptionCondition(reportId, condition);

      case 'ALWAYS':
      default:
        return true;
    }
  } catch (error) {
    console.error('[Report Scheduler] Error evaluating condition:', error);
    return true; // Default to sending on error
  }
}

async function checkThresholdCondition(
  reportId: string,
  metric: string,
  threshold: number
): Promise<boolean> {
  // This would query the actual report data
  // For now, return true
  // TODO: Implement actual metric checking based on report type
  return true;
}

async function checkChangeDetection(reportId: string): Promise<boolean> {
  // Check if report data has changed since last delivery
  // Compare current data hash with previous delivery
  // For now, return true
  // TODO: Implement change detection logic
  return true;
}

async function checkExceptionCondition(reportId: string, condition: any): Promise<boolean> {
  // Check for anomalies or exceptions in the data
  // For now, return true
  // TODO: Implement exception detection logic
  return true;
}

export async function createSchedule(data: {
  reportId: string;
  reportType: string;
  userId: string;
  frequency: string;
  cronExpression?: string;
  timezone?: string;
  format: string;
  recipients: any;
  distributionCondition?: any;
}) {
  const now = new Date();
  const nextRun = calculateNextRunDate(data.frequency, data.cronExpression, data.timezone);

  return await prisma.reportSchedule.create({
    data: {
      reportId: data.reportId,
      reportType: data.reportType,
      userId: data.userId,
      frequency: data.frequency,
      cronExpression: data.cronExpression,
      timezone: data.timezone || 'America/New_York',
      format: data.format,
      recipients: data.recipients,
      distributionCondition: data.distributionCondition,
      nextRunDate: nextRun,
      status: 'ACTIVE'
    }
  });
}

function calculateNextRunDate(
  frequency: string,
  cronExpression?: string,
  timezone?: string
): Date {
  const now = new Date();
  const tz = timezone || 'America/New_York';

  switch (frequency) {
    case 'DAILY':
      return addDays(now, 1);
    case 'WEEKLY':
      return addWeeks(now, 1);
    case 'MONTHLY':
      return addMonths(now, 1);
    case 'CUSTOM':
      if (cronExpression) {
        return calculateNextCronRun(cronExpression, tz);
      }
      return addDays(now, 1);
    default:
      return addDays(now, 1);
  }
}

export async function updateSchedule(scheduleId: string, data: any) {
  return await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}

export async function deleteSchedule(scheduleId: string) {
  return await prisma.reportSchedule.delete({
    where: { id: scheduleId }
  });
}

export async function getSchedulesByUser(userId: string) {
  return await prisma.reportSchedule.findMany({
    where: { userId },
    include: {
      report: true,
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function pauseSchedule(scheduleId: string) {
  return await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: { status: 'PAUSED' }
  });
}

export async function resumeSchedule(scheduleId: string) {
  return await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: { status: 'ACTIVE' }
  });
}
