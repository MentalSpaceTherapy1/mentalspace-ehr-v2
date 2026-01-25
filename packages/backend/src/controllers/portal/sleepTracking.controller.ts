import { Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../../utils/apiResponse';

/**
 * Create a new sleep log entry
 * POST /api/v1/portal/sleep-diary
 */
export const createSleepLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const {
      logDate,
      bedtime,
      wakeTime,
      quality,
      disturbances,
      notes,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate required fields
    if (!logDate || !bedtime || !wakeTime) {
      return sendBadRequest(res, 'Log date, bedtime, and wake time are required');
    }

    if (quality === undefined || quality === null) {
      return sendBadRequest(res, 'Sleep quality is required');
    }

    // Validate quality range (1-5)
    if (quality < 1 || quality > 5) {
      return sendBadRequest(res, 'Quality must be between 1 and 5');
    }

    // Calculate hours slept
    const bedtimeDate = new Date(bedtime);
    const wakeTimeDate = new Date(wakeTime);
    let hoursSlept = (wakeTimeDate.getTime() - bedtimeDate.getTime()) / (1000 * 60 * 60);

    // Handle overnight sleep (negative difference)
    if (hoursSlept < 0) {
      hoursSlept += 24;
    }

    // Validate hours slept
    if (hoursSlept < 0 || hoursSlept > 24) {
      return sendBadRequest(res, 'Invalid bedtime or wake time');
    }

    // Validate disturbances if provided
    const validDisturbances = [
      'NIGHTMARES',
      'INSOMNIA',
      'WOKE_FREQUENTLY',
      'SLEEP_APNEA',
      'RESTLESS_LEGS',
      'NOISE',
      'PAIN',
      'BATHROOM',
      'ANXIETY',
      'OTHER',
    ];

    if (disturbances && Array.isArray(disturbances)) {
      const invalidDisturbances = disturbances.filter(d => !validDisturbances.includes(d));
      if (invalidDisturbances.length > 0) {
        return sendBadRequest(res, `Invalid disturbances: ${invalidDisturbances.join(', ')}`);
      }
    }

    // Create sleep log
    const sleepLog = await prisma.sleepLog.create({
      data: {
        clientId,
        logDate: new Date(logDate),
        bedtime: bedtimeDate,
        wakeTime: wakeTimeDate,
        hoursSlept: parseFloat(hoursSlept.toFixed(2)),
        quality,
        disturbances: disturbances || [],
        notes,
      },
    });

    logger.info(`Sleep log created for client ${clientId}: ${hoursSlept.toFixed(1)}h, quality ${quality}`);

    return sendCreated(res, {
      id: sleepLog.id,
      logDate: sleepLog.logDate,
      bedtime: sleepLog.bedtime,
      wakeTime: sleepLog.wakeTime,
      hoursSlept: sleepLog.hoursSlept,
      quality: sleepLog.quality,
      disturbances: sleepLog.disturbances,
      notes: sleepLog.notes,
    }, 'Sleep log created successfully');
  } catch (error) {
    logger.error('Error creating sleep log:', error);
    return sendServerError(res, 'Failed to create sleep log');
  }
};

/**
 * Get sleep logs for client with optional date filtering
 * GET /api/v1/portal/sleep-diary?days=7
 */
export const getSleepLogs = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { days, startDate, endDate } = req.query;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Build date filter
    let dateFilter: Prisma.SleepLogWhereInput = {};
    if (days) {
      const daysNum = parseInt(days as string);
      const start = new Date();
      start.setDate(start.getDate() - daysNum);
      dateFilter = { gte: start };
    } else if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
    }

    // Get sleep logs
    const sleepLogs = await prisma.sleepLog.findMany({
      where: {
        clientId,
        ...(Object.keys(dateFilter).length > 0 && { logDate: dateFilter }),
      },
      orderBy: { logDate: 'desc' },
    });

    const formattedLogs = sleepLogs.map(log => ({
      id: log.id,
      logDate: log.logDate,
      bedtime: log.bedtime,
      wakeTime: log.wakeTime,
      hoursSlept: log.hoursSlept,
      quality: log.quality,
      disturbances: log.disturbances,
      notes: log.notes,
    }));

    logger.info(`Retrieved ${formattedLogs.length} sleep logs for client ${clientId}`);

    return sendSuccess(res, formattedLogs);
  } catch (error) {
    logger.error('Error fetching sleep logs:', error);
    return sendServerError(res, 'Failed to fetch sleep logs');
  }
};

/**
 * Get a single sleep log by ID
 * GET /api/v1/portal/sleep-diary/:logId
 */
export const getSleepLogById = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const log = await prisma.sleepLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!log) {
      return sendNotFound(res, 'Sleep log');
    }

    return sendSuccess(res, {
      id: log.id,
      logDate: log.logDate,
      bedtime: log.bedtime,
      wakeTime: log.wakeTime,
      hoursSlept: log.hoursSlept,
      quality: log.quality,
      disturbances: log.disturbances,
      notes: log.notes,
    });
  } catch (error) {
    logger.error('Error fetching sleep log:', error);
    return sendServerError(res, 'Failed to fetch sleep log');
  }
};

/**
 * Update a sleep log
 * PUT /api/v1/portal/sleep-diary/:logId
 */
export const updateSleepLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;
    const {
      logDate,
      bedtime,
      wakeTime,
      quality,
      disturbances,
      notes,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify ownership
    const existingLog = await prisma.sleepLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!existingLog) {
      return sendNotFound(res, 'Sleep log');
    }

    // Validate quality if provided
    if (quality !== undefined && (quality < 1 || quality > 5)) {
      return sendBadRequest(res, 'Quality must be between 1 and 5');
    }

    // Recalculate hours slept if times changed
    let hoursSlept: number | undefined;
    if (bedtime || wakeTime) {
      const bedtimeDate = new Date(bedtime || existingLog.bedtime);
      const wakeTimeDate = new Date(wakeTime || existingLog.wakeTime);
      hoursSlept = (wakeTimeDate.getTime() - bedtimeDate.getTime()) / (1000 * 60 * 60);
      if (hoursSlept < 0) hoursSlept += 24;
    }

    const updatedLog = await prisma.sleepLog.update({
      where: { id: logId },
      data: {
        ...(logDate && { logDate: new Date(logDate) }),
        ...(bedtime && { bedtime: new Date(bedtime) }),
        ...(wakeTime && { wakeTime: new Date(wakeTime) }),
        ...(hoursSlept !== undefined && { hoursSlept: parseFloat(hoursSlept.toFixed(2)) }),
        ...(quality !== undefined && { quality }),
        ...(disturbances && { disturbances }),
        ...(notes !== undefined && { notes }),
      },
    });

    logger.info(`Sleep log ${logId} updated for client ${clientId}`);

    return sendSuccess(res, updatedLog, 'Sleep log updated successfully');
  } catch (error) {
    logger.error('Error updating sleep log:', error);
    return sendServerError(res, 'Failed to update sleep log');
  }
};

/**
 * Delete a sleep log
 * DELETE /api/v1/portal/sleep-diary/:logId
 */
export const deleteSleepLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify ownership
    const existingLog = await prisma.sleepLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!existingLog) {
      return sendNotFound(res, 'Sleep log');
    }

    await prisma.sleepLog.delete({
      where: { id: logId },
    });

    logger.info(`Sleep log ${logId} deleted for client ${clientId}`);

    return sendSuccess(res, null, 'Sleep log deleted successfully');
  } catch (error) {
    logger.error('Error deleting sleep log:', error);
    return sendServerError(res, 'Failed to delete sleep log');
  }
};

/**
 * Get sleep trends and metrics
 * GET /api/v1/portal/sleep-diary/trends
 */
export const getSleepTrends = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get sleep logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sleepLogs = await prisma.sleepLog.findMany({
      where: {
        clientId,
        logDate: { gte: thirtyDaysAgo },
      },
      orderBy: { logDate: 'asc' },
    });

    if (sleepLogs.length === 0) {
      return sendSuccess(res, {
        averageHoursSlept: 0,
        averageQuality: 0,
        sleepTrend: 'stable',
        totalNights: 0,
        sleepDebt: 0,
        consistencyScore: 0,
        streakDays: 0,
        mostCommonDisturbances: [],
        weeklyAverage: [],
      });
    }

    // Calculate averages
    const totalHours = sleepLogs.reduce((sum, log) => sum + log.hoursSlept, 0);
    const totalQuality = sleepLogs.reduce((sum, log) => sum + log.quality, 0);
    const averageHoursSlept = totalHours / sleepLogs.length;
    const averageQuality = totalQuality / sleepLogs.length;

    // Calculate sleep trend
    const midPoint = Math.floor(sleepLogs.length / 2);
    const firstHalf = sleepLogs.slice(0, midPoint);
    const secondHalf = sleepLogs.slice(midPoint);

    const firstHalfHours = firstHalf.length > 0
      ? firstHalf.reduce((sum, log) => sum + log.hoursSlept, 0) / firstHalf.length
      : 0;
    const secondHalfHours = secondHalf.length > 0
      ? secondHalf.reduce((sum, log) => sum + log.hoursSlept, 0) / secondHalf.length
      : 0;

    let sleepTrend = 'stable';
    if (secondHalfHours > firstHalfHours + 0.5) sleepTrend = 'improving';
    else if (secondHalfHours < firstHalfHours - 0.5) sleepTrend = 'declining';

    // Calculate sleep debt (assuming 8 hours is optimal)
    const optimalHours = 8;
    const sleepDebt = sleepLogs.reduce((debt, log) => {
      const deficit = Math.max(0, optimalHours - log.hoursSlept);
      return debt + deficit;
    }, 0);

    // Calculate consistency score (based on standard deviation)
    const variance = sleepLogs.reduce((sum, log) => {
      return sum + Math.pow(log.hoursSlept - averageHoursSlept, 2);
    }, 0) / sleepLogs.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (stdDev * 20));

    // Calculate streak days
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasEntry = sleepLogs.some(log => {
        const logDate = new Date(log.logDate);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });

      if (hasEntry) {
        streakDays++;
      } else {
        break;
      }
    }

    // Most common disturbances
    const disturbanceCounts = new Map<string, number>();
    sleepLogs.forEach(log => {
      log.disturbances.forEach(disturbance => {
        disturbanceCounts.set(disturbance, (disturbanceCounts.get(disturbance) || 0) + 1);
      });
    });

    const mostCommonDisturbances = Array.from(disturbanceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([disturbance, count]) => ({ disturbance, count }));

    // Calculate weekly averages for chart
    const weeklyAverage: { week: string; hours: number; quality: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekLogs = sleepLogs.filter(log => {
        const logDate = new Date(log.logDate);
        return logDate >= weekStart && logDate < weekEnd;
      });

      if (weekLogs.length > 0) {
        const weekHours = weekLogs.reduce((sum, log) => sum + log.hoursSlept, 0) / weekLogs.length;
        const weekQuality = weekLogs.reduce((sum, log) => sum + log.quality, 0) / weekLogs.length;
        weeklyAverage.unshift({
          week: `Week ${4 - i}`,
          hours: Math.round(weekHours * 10) / 10,
          quality: Math.round(weekQuality * 10) / 10,
        });
      }
    }

    logger.info(`Calculated sleep trends for client ${clientId}: ${sleepTrend}`);

    return sendSuccess(res, {
      averageHoursSlept: Math.round(averageHoursSlept * 10) / 10,
      averageQuality: Math.round(averageQuality * 10) / 10,
      sleepTrend,
      totalNights: sleepLogs.length,
      sleepDebt: Math.round(sleepDebt * 10) / 10,
      consistencyScore: Math.round(consistencyScore),
      streakDays,
      mostCommonDisturbances,
      weeklyAverage,
    });
  } catch (error) {
    logger.error('Error calculating sleep trends:', error);
    return sendServerError(res, 'Failed to calculate sleep trends');
  }
};
