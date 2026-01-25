import { Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../../utils/apiResponse';

/**
 * Create a new symptom log entry
 * POST /api/v1/portal/symptom-diary
 */
export const createSymptomLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const {
      symptoms,
      severity,
      triggers,
      notes,
      mood,
      duration,
      medications,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate required fields
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return sendBadRequest(res, 'At least one symptom is required');
    }

    if (severity === undefined || severity === null) {
      return sendBadRequest(res, 'Severity is required');
    }

    // Validate severity range (1-10)
    if (severity < 1 || severity > 10) {
      return sendBadRequest(res, 'Severity must be between 1 and 10');
    }

    // Validate mood if provided
    const validMoods = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];
    if (mood && !validMoods.includes(mood)) {
      return sendBadRequest(res, 'Invalid mood value');
    }

    // Create symptom log
    const symptomLog = await prisma.symptomLog.create({
      data: {
        clientId,
        symptoms,
        severity,
        triggers: triggers || [],
        notes,
        mood,
        duration,
        medications: medications || [],
      },
    });

    logger.info(`Symptom log created for client ${clientId}: severity ${severity}`);

    return sendCreated(res, {
      id: symptomLog.id,
      symptoms: symptomLog.symptoms,
      severity: symptomLog.severity,
      triggers: symptomLog.triggers,
      notes: symptomLog.notes,
      mood: symptomLog.mood,
      duration: symptomLog.duration,
      medications: symptomLog.medications,
      loggedAt: symptomLog.loggedAt,
    }, 'Symptom log created successfully');
  } catch (error) {
    logger.error('Error creating symptom log:', error);
    return sendServerError(res, 'Failed to create symptom log');
  }
};

/**
 * Get symptom logs for client with optional date filtering
 * GET /api/v1/portal/symptom-diary?days=7
 */
export const getSymptomLogs = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { days, startDate, endDate } = req.query;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Build date filter
    let dateFilter: Prisma.SymptomLogWhereInput = {};
    if (days) {
      const daysNum = parseInt(days as string);
      const start = new Date();
      start.setDate(start.getDate() - daysNum);
      dateFilter = { gte: start };
    } else if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
    }

    // Get symptom logs
    const symptomLogs = await prisma.symptomLog.findMany({
      where: {
        clientId,
        ...(Object.keys(dateFilter).length > 0 && { loggedAt: dateFilter }),
      },
      orderBy: { loggedAt: 'desc' },
    });

    const formattedLogs = symptomLogs.map(log => ({
      id: log.id,
      symptoms: log.symptoms,
      severity: log.severity,
      triggers: log.triggers,
      notes: log.notes,
      mood: log.mood,
      duration: log.duration,
      medications: log.medications,
      loggedAt: log.loggedAt,
    }));

    logger.info(`Retrieved ${formattedLogs.length} symptom logs for client ${clientId}`);

    return sendSuccess(res, formattedLogs);
  } catch (error) {
    logger.error('Error fetching symptom logs:', error);
    return sendServerError(res, 'Failed to fetch symptom logs');
  }
};

/**
 * Get a single symptom log by ID
 * GET /api/v1/portal/symptom-diary/:logId
 */
export const getSymptomLogById = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const log = await prisma.symptomLog.findFirst({
      where: {
        id: logId,
        clientId, // Ensure client can only access their own logs
      },
    });

    if (!log) {
      return sendNotFound(res, 'Symptom log');
    }

    return sendSuccess(res, {
      id: log.id,
      symptoms: log.symptoms,
      severity: log.severity,
      triggers: log.triggers,
      notes: log.notes,
      mood: log.mood,
      duration: log.duration,
      medications: log.medications,
      loggedAt: log.loggedAt,
    });
  } catch (error) {
    logger.error('Error fetching symptom log:', error);
    return sendServerError(res, 'Failed to fetch symptom log');
  }
};

/**
 * Update a symptom log
 * PUT /api/v1/portal/symptom-diary/:logId
 */
export const updateSymptomLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;
    const {
      symptoms,
      severity,
      triggers,
      notes,
      mood,
      duration,
      medications,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify ownership
    const existingLog = await prisma.symptomLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!existingLog) {
      return sendNotFound(res, 'Symptom log');
    }

    // Validate severity if provided
    if (severity !== undefined && (severity < 1 || severity > 10)) {
      return sendBadRequest(res, 'Severity must be between 1 and 10');
    }

    // Validate mood if provided
    const validMoods = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];
    if (mood && !validMoods.includes(mood)) {
      return sendBadRequest(res, 'Invalid mood value');
    }

    const updatedLog = await prisma.symptomLog.update({
      where: { id: logId },
      data: {
        ...(symptoms && { symptoms }),
        ...(severity !== undefined && { severity }),
        ...(triggers && { triggers }),
        ...(notes !== undefined && { notes }),
        ...(mood !== undefined && { mood }),
        ...(duration !== undefined && { duration }),
        ...(medications && { medications }),
      },
    });

    logger.info(`Symptom log ${logId} updated for client ${clientId}`);

    return sendSuccess(res, updatedLog, 'Symptom log updated successfully');
  } catch (error) {
    logger.error('Error updating symptom log:', error);
    return sendServerError(res, 'Failed to update symptom log');
  }
};

/**
 * Delete a symptom log
 * DELETE /api/v1/portal/symptom-diary/:logId
 */
export const deleteSymptomLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify ownership
    const existingLog = await prisma.symptomLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!existingLog) {
      return sendNotFound(res, 'Symptom log');
    }

    await prisma.symptomLog.delete({
      where: { id: logId },
    });

    logger.info(`Symptom log ${logId} deleted for client ${clientId}`);

    return sendSuccess(res, null, 'Symptom log deleted successfully');
  } catch (error) {
    logger.error('Error deleting symptom log:', error);
    return sendServerError(res, 'Failed to delete symptom log');
  }
};

/**
 * Get symptom trends analysis
 * GET /api/v1/portal/symptom-diary/trends
 */
export const getSymptomTrends = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get symptom logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const symptomLogs = await prisma.symptomLog.findMany({
      where: {
        clientId,
        loggedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { loggedAt: 'asc' },
    });

    if (symptomLogs.length === 0) {
      return sendSuccess(res, {
        averageSeverity: 0,
        severityTrend: 'stable',
        totalEntries: 0,
        streakDays: 0,
        mostCommonSymptoms: [],
        mostCommonTriggers: [],
        weeklyAverage: [],
      });
    }

    // Calculate average severity
    const totalSeverity = symptomLogs.reduce((sum, log) => sum + log.severity, 0);
    const averageSeverity = totalSeverity / symptomLogs.length;

    // Calculate severity trend (comparing first half vs second half)
    const midPoint = Math.floor(symptomLogs.length / 2);
    const firstHalf = symptomLogs.slice(0, midPoint);
    const secondHalf = symptomLogs.slice(midPoint);

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, log) => sum + log.severity, 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, log) => sum + log.severity, 0) / secondHalf.length
      : 0;

    let severityTrend = 'stable';
    if (secondHalfAvg < firstHalfAvg - 0.5) severityTrend = 'improving'; // Lower severity is better
    else if (secondHalfAvg > firstHalfAvg + 0.5) severityTrend = 'worsening';

    // Calculate entry streak (consecutive days)
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasEntry = symptomLogs.some(log => {
        const logDate = new Date(log.loggedAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });

      if (hasEntry) {
        streakDays++;
      } else {
        break;
      }
    }

    // Most common symptoms
    const symptomCounts = new Map<string, number>();
    symptomLogs.forEach(log => {
      log.symptoms.forEach(symptom => {
        symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
      });
    });

    const mostCommonSymptoms = Array.from(symptomCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));

    // Most common triggers
    const triggerCounts = new Map<string, number>();
    symptomLogs.forEach(log => {
      log.triggers.forEach(trigger => {
        triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
      });
    });

    const mostCommonTriggers = Array.from(triggerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

    // Calculate weekly averages for chart
    const weeklyAverage: { week: string; average: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekLogs = symptomLogs.filter(log => {
        const logDate = new Date(log.loggedAt);
        return logDate >= weekStart && logDate < weekEnd;
      });

      if (weekLogs.length > 0) {
        const weekAvg = weekLogs.reduce((sum, log) => sum + log.severity, 0) / weekLogs.length;
        weeklyAverage.unshift({
          week: `Week ${4 - i}`,
          average: Math.round(weekAvg * 10) / 10,
        });
      }
    }

    logger.info(`Calculated symptom trends for client ${clientId}: ${severityTrend}`);

    return sendSuccess(res, {
      averageSeverity: Math.round(averageSeverity * 10) / 10,
      severityTrend,
      totalEntries: symptomLogs.length,
      streakDays,
      mostCommonSymptoms,
      mostCommonTriggers,
      weeklyAverage,
    });
  } catch (error) {
    logger.error('Error calculating symptom trends:', error);
    return sendServerError(res, 'Failed to calculate symptom trends');
  }
};
