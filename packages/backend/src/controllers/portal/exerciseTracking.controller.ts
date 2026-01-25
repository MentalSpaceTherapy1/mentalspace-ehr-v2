import { Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../../utils/apiResponse';

// Valid activity types
const VALID_ACTIVITY_TYPES = [
  'WALKING',
  'RUNNING',
  'CYCLING',
  'SWIMMING',
  'YOGA',
  'PILATES',
  'WEIGHTLIFTING',
  'GYM',
  'SPORTS',
  'DANCING',
  'HIKING',
  'MARTIAL_ARTS',
  'STRETCHING',
  'OTHER',
];

// Valid intensity levels
const VALID_INTENSITIES = ['LOW', 'MODERATE', 'HIGH'];

// Valid moods
const VALID_MOODS = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];

/**
 * Create a new exercise log entry
 * POST /api/v1/portal/exercise-log
 */
export const createExerciseLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const {
      activityType,
      duration,
      intensity,
      notes,
      mood,
      loggedAt,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate required fields
    if (!activityType) {
      return sendBadRequest(res, 'Activity type is required');
    }

    if (!duration || duration <= 0) {
      return sendBadRequest(res, 'Duration must be greater than 0');
    }

    if (duration > 1440) {
      return sendBadRequest(res, 'Duration cannot exceed 1440 minutes (24 hours)');
    }

    if (!intensity) {
      return sendBadRequest(res, 'Intensity is required');
    }

    // Validate activity type
    if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
      return sendBadRequest(res, `Invalid activity type. Valid types: ${VALID_ACTIVITY_TYPES.join(', ')}`);
    }

    // Validate intensity
    if (!VALID_INTENSITIES.includes(intensity)) {
      return sendBadRequest(res, 'Intensity must be LOW, MODERATE, or HIGH');
    }

    // Validate mood if provided
    if (mood && !VALID_MOODS.includes(mood)) {
      return sendBadRequest(res, 'Invalid mood value');
    }

    // Create exercise log
    const exerciseLog = await prisma.exerciseLog.create({
      data: {
        clientId,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        activityType,
        duration,
        intensity,
        notes,
        mood,
      },
    });

    logger.info(`Exercise log created for client ${clientId}: ${activityType}, ${duration}min, ${intensity}`);

    return sendCreated(res, {
      id: exerciseLog.id,
      activityType: exerciseLog.activityType,
      duration: exerciseLog.duration,
      intensity: exerciseLog.intensity,
      notes: exerciseLog.notes,
      mood: exerciseLog.mood,
      loggedAt: exerciseLog.loggedAt,
    }, 'Exercise log created successfully');
  } catch (error) {
    logger.error('Error creating exercise log:', error);
    return sendServerError(res, 'Failed to create exercise log');
  }
};

/**
 * Get exercise logs for client with optional date filtering
 * GET /api/v1/portal/exercise-log?days=7
 */
export const getExerciseLogs = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { days, startDate, endDate, activityType, intensity } = req.query;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Build where clause
    const where: any = { clientId };

    // Date filter
    if (days) {
      const daysNum = parseInt(days as string);
      const start = new Date();
      start.setDate(start.getDate() - daysNum);
      where.loggedAt = { gte: start };
    } else if (startDate || endDate) {
      where.loggedAt = {};
      if (startDate) where.loggedAt.gte = new Date(startDate as string);
      if (endDate) where.loggedAt.lte = new Date(endDate as string);
    }

    // Activity type filter
    if (activityType) {
      where.activityType = activityType as string;
    }

    // Intensity filter
    if (intensity) {
      where.intensity = intensity as string;
    }

    // Get exercise logs
    const exerciseLogs = await prisma.exerciseLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
    });

    const formattedLogs = exerciseLogs.map(log => ({
      id: log.id,
      activityType: log.activityType,
      duration: log.duration,
      intensity: log.intensity,
      notes: log.notes,
      mood: log.mood,
      loggedAt: log.loggedAt,
    }));

    logger.info(`Retrieved ${formattedLogs.length} exercise logs for client ${clientId}`);

    return sendSuccess(res, formattedLogs);
  } catch (error) {
    logger.error('Error fetching exercise logs:', error);
    return sendServerError(res, 'Failed to fetch exercise logs');
  }
};

/**
 * Get a single exercise log by ID
 * GET /api/v1/portal/exercise-log/:logId
 */
export const getExerciseLogById = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const log = await prisma.exerciseLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!log) {
      return sendNotFound(res, 'Exercise log');
    }

    return sendSuccess(res, {
      id: log.id,
      activityType: log.activityType,
      duration: log.duration,
      intensity: log.intensity,
      notes: log.notes,
      mood: log.mood,
      loggedAt: log.loggedAt,
    });
  } catch (error) {
    logger.error('Error fetching exercise log:', error);
    return sendServerError(res, 'Failed to fetch exercise log');
  }
};

/**
 * Update an exercise log
 * PUT /api/v1/portal/exercise-log/:logId
 */
export const updateExerciseLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;
    const {
      activityType,
      duration,
      intensity,
      notes,
      mood,
      loggedAt,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify ownership
    const existingLog = await prisma.exerciseLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!existingLog) {
      return sendNotFound(res, 'Exercise log');
    }

    // Validate duration if provided
    if (duration !== undefined && (duration <= 0 || duration > 1440)) {
      return sendBadRequest(res, 'Duration must be between 1 and 1440 minutes');
    }

    // Validate intensity if provided
    if (intensity && !VALID_INTENSITIES.includes(intensity)) {
      return sendBadRequest(res, 'Intensity must be LOW, MODERATE, or HIGH');
    }

    // Validate activity type if provided
    if (activityType && !VALID_ACTIVITY_TYPES.includes(activityType)) {
      return sendBadRequest(res, 'Invalid activity type');
    }

    // Validate mood if provided
    if (mood && !VALID_MOODS.includes(mood)) {
      return sendBadRequest(res, 'Invalid mood value');
    }

    const updatedLog = await prisma.exerciseLog.update({
      where: { id: logId },
      data: {
        ...(activityType && { activityType }),
        ...(duration !== undefined && { duration }),
        ...(intensity && { intensity }),
        ...(notes !== undefined && { notes }),
        ...(mood !== undefined && { mood }),
        ...(loggedAt && { loggedAt: new Date(loggedAt) }),
      },
    });

    logger.info(`Exercise log ${logId} updated for client ${clientId}`);

    return sendSuccess(res, updatedLog, 'Exercise log updated successfully');
  } catch (error) {
    logger.error('Error updating exercise log:', error);
    return sendServerError(res, 'Failed to update exercise log');
  }
};

/**
 * Delete an exercise log
 * DELETE /api/v1/portal/exercise-log/:logId
 */
export const deleteExerciseLog = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { logId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify ownership
    const existingLog = await prisma.exerciseLog.findFirst({
      where: {
        id: logId,
        clientId,
      },
    });

    if (!existingLog) {
      return sendNotFound(res, 'Exercise log');
    }

    await prisma.exerciseLog.delete({
      where: { id: logId },
    });

    logger.info(`Exercise log ${logId} deleted for client ${clientId}`);

    return sendSuccess(res, null, 'Exercise log deleted successfully');
  } catch (error) {
    logger.error('Error deleting exercise log:', error);
    return sendServerError(res, 'Failed to delete exercise log');
  }
};

/**
 * Get exercise statistics and trends
 * GET /api/v1/portal/exercise-log/stats
 */
export const getExerciseStats = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get exercise logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const exerciseLogs = await prisma.exerciseLog.findMany({
      where: {
        clientId,
        loggedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { loggedAt: 'asc' },
    });

    if (exerciseLogs.length === 0) {
      return sendSuccess(res, {
        totalMinutes: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        activeDays: 0,
        currentStreak: 0,
        longestStreak: 0,
        mostFrequentActivity: null,
        intensityDistribution: { LOW: 0, MODERATE: 0, HIGH: 0 },
        activityBreakdown: [],
        weeklyStats: [],
        exerciseTrend: 'stable',
      });
    }

    // Total minutes and sessions
    const totalMinutes = exerciseLogs.reduce((sum, log) => sum + log.duration, 0);
    const totalSessions = exerciseLogs.length;
    const averageSessionDuration = totalMinutes / totalSessions;

    // Count unique active days
    const uniqueDays = new Set(
      exerciseLogs.map(log => log.loggedAt.toISOString().split('T')[0])
    );
    const activeDays = uniqueDays.size;

    // Calculate streaks
    const dates = Array.from(uniqueDays).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastDate = dates[dates.length - 1];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak += 1;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    if (lastDate === today || lastDate === yesterday) {
      currentStreak = tempStreak;
    }

    // Most frequent activity
    const activityCounts = new Map<string, { count: number; totalMinutes: number }>();
    exerciseLogs.forEach(log => {
      const existing = activityCounts.get(log.activityType) || { count: 0, totalMinutes: 0 };
      existing.count += 1;
      existing.totalMinutes += log.duration;
      activityCounts.set(log.activityType, existing);
    });

    const activityBreakdown = Array.from(activityCounts.entries())
      .map(([activity, data]) => ({
        activity,
        sessions: data.count,
        totalMinutes: data.totalMinutes,
        averageMinutes: Math.round((data.totalMinutes / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    const mostFrequentActivity = activityBreakdown[0] || null;

    // Intensity distribution
    const intensityDistribution = {
      LOW: exerciseLogs.filter(log => log.intensity === 'LOW').length,
      MODERATE: exerciseLogs.filter(log => log.intensity === 'MODERATE').length,
      HIGH: exerciseLogs.filter(log => log.intensity === 'HIGH').length,
    };

    // Weekly stats
    const weeklyStats: { week: string; minutes: number; sessions: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekLogs = exerciseLogs.filter(log => {
        const logDate = new Date(log.loggedAt);
        return logDate >= weekStart && logDate < weekEnd;
      });

      const weekMinutes = weekLogs.reduce((sum, log) => sum + log.duration, 0);
      weeklyStats.unshift({
        week: `Week ${4 - i}`,
        minutes: weekMinutes,
        sessions: weekLogs.length,
      });
    }

    // Exercise trend
    const midPoint = Math.floor(exerciseLogs.length / 2);
    const firstHalf = exerciseLogs.slice(0, midPoint);
    const secondHalf = exerciseLogs.slice(midPoint);

    const firstHalfMinutes = firstHalf.reduce((sum, log) => sum + log.duration, 0);
    const secondHalfMinutes = secondHalf.reduce((sum, log) => sum + log.duration, 0);

    let exerciseTrend = 'stable';
    if (secondHalfMinutes > firstHalfMinutes * 1.2) exerciseTrend = 'increasing';
    else if (secondHalfMinutes < firstHalfMinutes * 0.8) exerciseTrend = 'decreasing';

    logger.info(`Calculated exercise stats for client ${clientId}`);

    return sendSuccess(res, {
      totalMinutes,
      totalSessions,
      averageSessionDuration: Math.round(averageSessionDuration * 10) / 10,
      activeDays,
      currentStreak,
      longestStreak,
      mostFrequentActivity,
      intensityDistribution,
      activityBreakdown,
      weeklyStats,
      exerciseTrend,
    });
  } catch (error) {
    logger.error('Error calculating exercise stats:', error);
    return sendServerError(res, 'Failed to calculate exercise stats');
  }
};
