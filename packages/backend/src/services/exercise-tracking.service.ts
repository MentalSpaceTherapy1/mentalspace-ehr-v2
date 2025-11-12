import prisma from './database';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { auditLogger } from '../utils/logger';

interface ExerciseLogData {
  activityType: string;
  duration: number;
  intensity: string;
  notes?: string;
  mood?: string;
  loggedAt?: Date;
}

interface ExerciseFilters {
  startDate?: Date;
  endDate?: Date;
  activityType?: string;
  intensity?: string;
  page?: number;
  limit?: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class ExerciseTrackingService {
  /**
   * Log a new exercise entry
   */
  async logExercise(clientId: string, data: ExerciseLogData, userId: string) {
    // Validate duration
    if (data.duration <= 0 || data.duration > 1440) {
      throw new ValidationError('Duration must be between 1 and 1440 minutes (24 hours)');
    }

    // Validate intensity
    const validIntensities = ['LOW', 'MODERATE', 'HIGH'];
    if (!validIntensities.includes(data.intensity)) {
      throw new ValidationError('Intensity must be LOW, MODERATE, or HIGH');
    }

    // Validate activity type
    const validActivityTypes = [
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
    if (!validActivityTypes.includes(data.activityType)) {
      throw new ValidationError('Invalid activity type');
    }

    // Validate mood if provided
    const validMoods = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];
    if (data.mood && !validMoods.includes(data.mood)) {
      throw new ValidationError('Invalid mood value');
    }

    const exerciseLog = await prisma.exerciseLog.create({
      data: {
        clientId,
        loggedAt: data.loggedAt || new Date(),
        activityType: data.activityType,
        duration: data.duration,
        intensity: data.intensity,
        notes: data.notes,
        mood: data.mood,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    auditLogger.log({
      action: 'EXERCISE_LOG_CREATED',
      userId,
      clientId,
      resourceId: exerciseLog.id,
      details: {
        activityType: data.activityType,
        duration: data.duration,
        intensity: data.intensity,
      },
    });

    return exerciseLog;
  }

  /**
   * Get exercise logs with filtering and pagination
   */
  async getExerciseLogs(clientId: string, filters: ExerciseFilters = {}) {
    const {
      startDate,
      endDate,
      activityType,
      intensity,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = { clientId };

    // Date range filter
    if (startDate || endDate) {
      where.loggedAt = {};
      if (startDate) where.loggedAt.gte = startDate;
      if (endDate) where.loggedAt.lte = endDate;
    }

    // Activity type filter
    if (activityType) {
      where.activityType = activityType;
    }

    // Intensity filter
    if (intensity) {
      where.intensity = intensity;
    }

    const [logs, total] = await Promise.all([
      prisma.exerciseLog.findMany({
        where,
        orderBy: { loggedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.exerciseLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single exercise log by ID
   */
  async getExerciseLogById(logId: string, clientId?: string) {
    const log = await prisma.exerciseLog.findUnique({
      where: { id: logId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundError('Exercise log not found');
    }

    // If clientId provided, verify access
    if (clientId && log.clientId !== clientId) {
      throw new ForbiddenError('Access denied to this exercise log');
    }

    return log;
  }

  /**
   * Update an exercise log
   */
  async updateExerciseLog(logId: string, data: Partial<ExerciseLogData>, userId: string) {
    // Verify log exists
    const existingLog = await this.getExerciseLogById(logId);

    // Validate duration if provided
    if (data.duration !== undefined && (data.duration <= 0 || data.duration > 1440)) {
      throw new ValidationError('Duration must be between 1 and 1440 minutes');
    }

    // Validate intensity if provided
    const validIntensities = ['LOW', 'MODERATE', 'HIGH'];
    if (data.intensity && !validIntensities.includes(data.intensity)) {
      throw new ValidationError('Intensity must be LOW, MODERATE, or HIGH');
    }

    // Validate mood if provided
    const validMoods = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];
    if (data.mood && !validMoods.includes(data.mood)) {
      throw new ValidationError('Invalid mood value');
    }

    const updatedLog = await prisma.exerciseLog.update({
      where: { id: logId },
      data: {
        ...(data.activityType && { activityType: data.activityType }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.intensity && { intensity: data.intensity }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.mood !== undefined && { mood: data.mood }),
        ...(data.loggedAt && { loggedAt: data.loggedAt }),
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    auditLogger.log({
      action: 'EXERCISE_LOG_UPDATED',
      userId,
      clientId: existingLog.clientId,
      resourceId: logId,
      details: data,
    });

    return updatedLog;
  }

  /**
   * Delete an exercise log
   */
  async deleteExerciseLog(logId: string, userId: string) {
    const log = await this.getExerciseLogById(logId);

    await prisma.exerciseLog.delete({
      where: { id: logId },
    });

    auditLogger.log({
      action: 'EXERCISE_LOG_DELETED',
      userId,
      clientId: log.clientId,
      resourceId: logId,
    });

    return { success: true, message: 'Exercise log deleted successfully' };
  }

  /**
   * Get exercise statistics
   */
  async getExerciseStats(clientId: string, dateRange: DateRange) {
    const logs = await prisma.exerciseLog.findMany({
      where: {
        clientId,
        loggedAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { loggedAt: 'asc' },
    });

    if (logs.length === 0) {
      return {
        totalMinutes: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        activeDays: 0,
        mostFrequentActivity: null,
        intensityDistribution: {},
        moodDistribution: {},
      };
    }

    // Total minutes and sessions
    const totalMinutes = logs.reduce((sum, log) => sum + log.duration, 0);
    const totalSessions = logs.length;
    const averageSessionDuration = totalMinutes / totalSessions;

    // Count unique active days
    const uniqueDays = new Set(logs.map((log) => log.loggedAt.toISOString().split('T')[0]));
    const activeDays = uniqueDays.size;

    // Most frequent activity
    const activityCounts = new Map<string, number>();
    logs.forEach((log) => {
      activityCounts.set(log.activityType, (activityCounts.get(log.activityType) || 0) + 1);
    });

    const mostFrequentActivity = Array.from(activityCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Intensity distribution
    const intensityDistribution: Record<string, number> = {
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
    };
    logs.forEach((log) => {
      intensityDistribution[log.intensity] = (intensityDistribution[log.intensity] || 0) + 1;
    });

    // Mood distribution
    const moodDistribution: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.mood) {
        moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
      }
    });

    return {
      totalMinutes,
      totalSessions,
      averageSessionDuration: parseFloat(averageSessionDuration.toFixed(2)),
      activeDays,
      mostFrequentActivity: mostFrequentActivity
        ? { activity: mostFrequentActivity[0], count: mostFrequentActivity[1] }
        : null,
      intensityDistribution,
      moodDistribution,
    };
  }

  /**
   * Get exercise trends over time
   */
  async getExerciseTrends(clientId: string, dateRange: DateRange) {
    const logs = await prisma.exerciseLog.findMany({
      where: {
        clientId,
        loggedAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { loggedAt: 'asc' },
    });

    // Group by week
    const weeklyData = this.groupByWeek(logs);

    // Calculate streaks
    const streaks = this.calculateStreaks(logs);

    // Activity breakdown by type
    const activityBreakdown = new Map<string, { count: number; totalMinutes: number }>();
    logs.forEach((log) => {
      const existing = activityBreakdown.get(log.activityType) || { count: 0, totalMinutes: 0 };
      existing.count += 1;
      existing.totalMinutes += log.duration;
      activityBreakdown.set(log.activityType, existing);
    });

    const activitySummary = Array.from(activityBreakdown.entries())
      .map(([activity, data]) => ({
        activity,
        sessions: data.count,
        totalMinutes: data.totalMinutes,
        averageMinutes: parseFloat((data.totalMinutes / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Mood impact analysis (mood before vs after could be tracked separately)
    const moodCounts = new Map<string, number>();
    logs.forEach((log) => {
      if (log.mood) {
        moodCounts.set(log.mood, (moodCounts.get(log.mood) || 0) + 1);
      }
    });

    const moodImpact = Array.from(moodCounts.entries())
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);

    return {
      weekly: weeklyData,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      activityBreakdown: activitySummary,
      moodImpact,
    };
  }

  /**
   * Helper: Group logs by week
   */
  private groupByWeek(logs: any[]) {
    const weeklyData = new Map<string, { minutes: number; sessions: number; activities: Set<string> }>();

    logs.forEach((log) => {
      const date = new Date(log.loggedAt);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      const existing = weeklyData.get(weekKey) || {
        minutes: 0,
        sessions: 0,
        activities: new Set<string>(),
      };

      existing.minutes += log.duration;
      existing.sessions += 1;
      existing.activities.add(log.activityType);

      weeklyData.set(weekKey, existing);
    });

    return Array.from(weeklyData.entries()).map(([week, data]) => ({
      weekStarting: week,
      totalMinutes: data.minutes,
      sessions: data.sessions,
      uniqueActivities: data.activities.size,
    }));
  }

  /**
   * Helper: Calculate exercise streaks
   */
  private calculateStreaks(logs: any[]) {
    if (logs.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique dates with exercise
    const dates = Array.from(
      new Set(logs.map((log) => log.loggedAt.toISOString().split('T')[0]))
    ).sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Check if today has exercise
    const today = new Date().toISOString().split('T')[0];
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
    if (lastDate === today || this.isYesterday(lastDate)) {
      currentStreak = tempStreak;
    }

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Helper: Get start of week (Sunday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  /**
   * Helper: Check if date is yesterday
   */
  private isYesterday(dateStr: string): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
  }
}

export default new ExerciseTrackingService();
