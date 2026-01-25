import prisma from './database';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { auditLogger } from '../utils/logger';

interface SleepLogData {
  logDate: Date;
  bedtime: Date;
  wakeTime: Date;
  hoursSlept?: number;
  quality: number;
  disturbances?: string[];
  notes?: string;
}

interface SleepFilters {
  startDate?: Date;
  endDate?: Date;
  minQuality?: number;
  maxQuality?: number;
  page?: number;
  limit?: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class SleepTrackingService {
  /**
   * Log a new sleep entry
   */
  async logSleep(clientId: string, data: SleepLogData, userId: string) {
    // Validate quality
    if (data.quality < 1 || data.quality > 5) {
      throw new ValidationError('Quality must be between 1 and 5');
    }

    // Calculate hours slept if not provided
    let hoursSlept = data.hoursSlept;
    if (!hoursSlept) {
      const bedtime = new Date(data.bedtime);
      const wakeTime = new Date(data.wakeTime);
      const diffMs = wakeTime.getTime() - bedtime.getTime();
      hoursSlept = diffMs / (1000 * 60 * 60);

      // Handle overnight sleep (negative difference)
      if (hoursSlept < 0) {
        hoursSlept += 24;
      }
    }

    // Validate hours slept
    if (hoursSlept < 0 || hoursSlept > 24) {
      throw new ValidationError('Hours slept must be between 0 and 24');
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
    if (data.disturbances) {
      const invalidDisturbances = data.disturbances.filter((d) => !validDisturbances.includes(d));
      if (invalidDisturbances.length > 0) {
        throw new ValidationError(`Invalid disturbances: ${invalidDisturbances.join(', ')}`);
      }
    }

    const sleepLog = await prisma.sleepLog.create({
      data: {
        clientId,
        logDate: data.logDate,
        bedtime: data.bedtime,
        wakeTime: data.wakeTime,
        hoursSlept: parseFloat(hoursSlept.toFixed(2)),
        quality: data.quality,
        disturbances: data.disturbances || [],
        notes: data.notes,
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

    auditLogger.info('Sleep tracking event', {
      action: 'SLEEP_LOG_CREATED',
      userId,
      clientId,
      resourceId: sleepLog.id,
      details: {
        logDate: data.logDate,
        hoursSlept,
        quality: data.quality,
      },
    });

    return sleepLog;
  }

  /**
   * Get sleep logs with filtering and pagination
   */
  async getSleepLogs(clientId: string, filters: SleepFilters = {}) {
    const {
      startDate,
      endDate,
      minQuality,
      maxQuality,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.SleepLogWhereInput = { clientId };

    // Date range filter
    if (startDate || endDate) {
      where.logDate = {};
      if (startDate) where.logDate.gte = startDate;
      if (endDate) where.logDate.lte = endDate;
    }

    // Quality range filter
    if (minQuality !== undefined || maxQuality !== undefined) {
      where.quality = {};
      if (minQuality !== undefined) where.quality.gte = minQuality;
      if (maxQuality !== undefined) where.quality.lte = maxQuality;
    }

    const [logs, total] = await Promise.all([
      prisma.sleepLog.findMany({
        where,
        orderBy: { logDate: 'desc' },
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
      prisma.sleepLog.count({ where }),
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
   * Get a single sleep log by ID
   */
  async getSleepLogById(logId: string, clientId?: string) {
    const log = await prisma.sleepLog.findUnique({
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
      throw new NotFoundError('Sleep log not found');
    }

    // If clientId provided, verify access
    if (clientId && log.clientId !== clientId) {
      throw new ForbiddenError('Access denied to this sleep log');
    }

    return log;
  }

  /**
   * Update a sleep log
   */
  async updateSleepLog(logId: string, data: Partial<SleepLogData>, userId: string) {
    // Verify log exists
    const existingLog = await this.getSleepLogById(logId);

    // Validate quality if provided
    if (data.quality !== undefined && (data.quality < 1 || data.quality > 5)) {
      throw new ValidationError('Quality must be between 1 and 5');
    }

    // Recalculate hours slept if bedtime or wakeTime changed
    let hoursSlept = data.hoursSlept;
    if ((data.bedtime || data.wakeTime) && !hoursSlept) {
      const bedtime = new Date(data.bedtime || existingLog.bedtime);
      const wakeTime = new Date(data.wakeTime || existingLog.wakeTime);
      const diffMs = wakeTime.getTime() - bedtime.getTime();
      hoursSlept = diffMs / (1000 * 60 * 60);

      if (hoursSlept < 0) {
        hoursSlept += 24;
      }
    }

    const updatedLog = await prisma.sleepLog.update({
      where: { id: logId },
      data: {
        ...(data.logDate && { logDate: data.logDate }),
        ...(data.bedtime && { bedtime: data.bedtime }),
        ...(data.wakeTime && { wakeTime: data.wakeTime }),
        ...(hoursSlept !== undefined && { hoursSlept: parseFloat(hoursSlept.toFixed(2)) }),
        ...(data.quality !== undefined && { quality: data.quality }),
        ...(data.disturbances && { disturbances: data.disturbances }),
        ...(data.notes !== undefined && { notes: data.notes }),
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

    auditLogger.info('Sleep tracking event', {
      action: 'SLEEP_LOG_UPDATED',
      userId,
      clientId: existingLog.clientId,
      resourceId: logId,
      details: data,
    });

    return updatedLog;
  }

  /**
   * Delete a sleep log
   */
  async deleteSleepLog(logId: string, userId: string) {
    const log = await this.getSleepLogById(logId);

    await prisma.sleepLog.delete({
      where: { id: logId },
    });

    auditLogger.info('Sleep tracking event', {
      action: 'SLEEP_LOG_DELETED',
      userId,
      clientId: log.clientId,
      resourceId: logId,
    });

    return { success: true, message: 'Sleep log deleted successfully' };
  }

  /**
   * Calculate sleep metrics
   */
  async calculateSleepMetrics(clientId: string, dateRange: DateRange) {
    const logs = await prisma.sleepLog.findMany({
      where: {
        clientId,
        logDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { logDate: 'asc' },
    });

    if (logs.length === 0) {
      return {
        averageHoursSlept: 0,
        averageQuality: 0,
        totalNights: 0,
        sleepDebt: 0,
        consistencyScore: 0,
      };
    }

    // Calculate averages
    const totalHours = logs.reduce((sum, log) => sum + log.hoursSlept, 0);
    const totalQuality = logs.reduce((sum, log) => sum + log.quality, 0);
    const averageHoursSlept = totalHours / logs.length;
    const averageQuality = totalQuality / logs.length;

    // Calculate sleep debt (assuming 8 hours is optimal)
    const optimalHours = 8;
    const sleepDebt = logs.reduce((debt, log) => {
      const deficit = Math.max(0, optimalHours - log.hoursSlept);
      return debt + deficit;
    }, 0);

    // Calculate consistency score (based on standard deviation)
    const variance = logs.reduce((sum, log) => {
      return sum + Math.pow(log.hoursSlept - averageHoursSlept, 2);
    }, 0) / logs.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (stdDev * 20)); // Lower stdDev = higher score

    return {
      averageHoursSlept: parseFloat(averageHoursSlept.toFixed(2)),
      averageQuality: parseFloat(averageQuality.toFixed(2)),
      totalNights: logs.length,
      sleepDebt: parseFloat(sleepDebt.toFixed(2)),
      consistencyScore: parseFloat(consistencyScore.toFixed(2)),
    };
  }

  /**
   * Get sleep trends over time
   */
  async getSleepTrends(clientId: string, dateRange: DateRange) {
    const logs = await prisma.sleepLog.findMany({
      where: {
        clientId,
        logDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { logDate: 'asc' },
    });

    // Daily sleep data
    const dailyData = logs.map((log) => ({
      date: log.logDate.toISOString().split('T')[0],
      hoursSlept: log.hoursSlept,
      quality: log.quality,
      disturbances: log.disturbances.length,
      bedtime: log.bedtime,
      wakeTime: log.wakeTime,
    }));

    // Calculate 7-day rolling averages
    const weeklyAverages = this.calculateRollingAverages(dailyData, 7);

    // Calculate 30-day rolling averages
    const monthlyAverages = this.calculateRollingAverages(dailyData, 30);

    // Identify most common disturbances
    const disturbanceCounts = new Map<string, number>();
    logs.forEach((log) => {
      log.disturbances.forEach((disturbance) => {
        disturbanceCounts.set(disturbance, (disturbanceCounts.get(disturbance) || 0) + 1);
      });
    });

    const mostCommonDisturbances = Array.from(disturbanceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([disturbance, count]) => ({ disturbance, count }));

    // Calculate bedtime consistency
    const bedtimes = logs.map((log) => log.bedtime.getHours() + log.bedtime.getMinutes() / 60);
    const avgBedtime = bedtimes.reduce((sum, time) => sum + time, 0) / bedtimes.length;
    const bedtimeVariance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;

    // Recommended bedtime (based on wake time and 8 hours)
    const avgWakeHour = logs.reduce((sum, log) => sum + log.wakeTime.getHours(), 0) / logs.length;
    const recommendedBedtime = (avgWakeHour - 8 + 24) % 24;

    return {
      daily: dailyData,
      weekly: weeklyAverages,
      monthly: monthlyAverages,
      mostCommonDisturbances,
      bedtimeConsistency: parseFloat((100 - bedtimeVariance * 10).toFixed(2)),
      recommendedBedtime: this.formatHour(recommendedBedtime),
    };
  }

  /**
   * Helper: Calculate rolling averages
   */
  private calculateRollingAverages(
    data: Array<{ hoursSlept: number; quality: number; date?: string }>,
    windowSize: number
  ) {
    const result = [];

    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const avgHours = window.reduce((sum, d) => sum + d.hoursSlept, 0) / windowSize;
      const avgQuality = window.reduce((sum, d) => sum + d.quality, 0) / windowSize;

      result.push({
        endDate: data[i].date || '',
        averageHours: parseFloat(avgHours.toFixed(2)),
        averageQuality: parseFloat(avgQuality.toFixed(2)),
      });
    }

    return result;
  }

  /**
   * Helper: Format hour as time string
   */
  private formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;

    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  }
}

export default new SleepTrackingService();
