import prisma from './database';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { auditLogger } from '../utils/logger';

interface SymptomLogData {
  symptoms: string[];
  severity: number;
  triggers?: string[];
  notes?: string;
  mood?: string;
  duration?: string;
  medications?: string[];
}

interface SymptomFilters {
  startDate?: Date;
  endDate?: Date;
  symptomType?: string;
  minSeverity?: number;
  maxSeverity?: number;
  page?: number;
  limit?: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class SymptomTrackingService {
  /**
   * Log a new symptom entry
   */
  async logSymptom(clientId: string, data: SymptomLogData, userId: string) {
    // Validate severity
    if (data.severity < 1 || data.severity > 10) {
      throw new ValidationError('Severity must be between 1 and 10');
    }

    // Validate symptoms array
    if (!data.symptoms || data.symptoms.length === 0) {
      throw new ValidationError('At least one symptom must be specified');
    }

    // Validate mood if provided
    const validMoods = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];
    if (data.mood && !validMoods.includes(data.mood)) {
      throw new ValidationError('Invalid mood value');
    }

    const symptomLog = await prisma.symptomLog.create({
      data: {
        clientId,
        symptoms: data.symptoms,
        severity: data.severity,
        triggers: data.triggers || [],
        notes: data.notes,
        mood: data.mood,
        duration: data.duration,
        medications: data.medications || [],
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
      action: 'SYMPTOM_LOG_CREATED',
      userId,
      clientId,
      resourceId: symptomLog.id,
      details: {
        symptoms: data.symptoms,
        severity: data.severity,
      },
    });

    return symptomLog;
  }

  /**
   * Get symptom logs with filtering and pagination
   */
  async getSymptomLogs(clientId: string, filters: SymptomFilters = {}) {
    const {
      startDate,
      endDate,
      symptomType,
      minSeverity,
      maxSeverity,
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

    // Symptom type filter
    if (symptomType) {
      where.symptoms = {
        has: symptomType,
      };
    }

    // Severity range filter
    if (minSeverity !== undefined || maxSeverity !== undefined) {
      where.severity = {};
      if (minSeverity !== undefined) where.severity.gte = minSeverity;
      if (maxSeverity !== undefined) where.severity.lte = maxSeverity;
    }

    const [logs, total] = await Promise.all([
      prisma.symptomLog.findMany({
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
      prisma.symptomLog.count({ where }),
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
   * Get a single symptom log by ID
   */
  async getSymptomLogById(logId: string, clientId?: string) {
    const log = await prisma.symptomLog.findUnique({
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
      throw new NotFoundError('Symptom log not found');
    }

    // If clientId provided, verify access
    if (clientId && log.clientId !== clientId) {
      throw new ForbiddenError('Access denied to this symptom log');
    }

    return log;
  }

  /**
   * Update a symptom log
   */
  async updateSymptomLog(logId: string, data: Partial<SymptomLogData>, userId: string) {
    // Verify log exists
    const existingLog = await this.getSymptomLogById(logId);

    // Validate severity if provided
    if (data.severity !== undefined && (data.severity < 1 || data.severity > 10)) {
      throw new ValidationError('Severity must be between 1 and 10');
    }

    // Validate mood if provided
    const validMoods = ['VERY_POOR', 'POOR', 'NEUTRAL', 'GOOD', 'VERY_GOOD'];
    if (data.mood && !validMoods.includes(data.mood)) {
      throw new ValidationError('Invalid mood value');
    }

    const updatedLog = await prisma.symptomLog.update({
      where: { id: logId },
      data: {
        ...(data.symptoms && { symptoms: data.symptoms }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.triggers && { triggers: data.triggers }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.mood !== undefined && { mood: data.mood }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.medications && { medications: data.medications }),
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
      action: 'SYMPTOM_LOG_UPDATED',
      userId,
      clientId: existingLog.clientId,
      resourceId: logId,
      details: data,
    });

    return updatedLog;
  }

  /**
   * Delete a symptom log
   */
  async deleteSymptomLog(logId: string, userId: string) {
    const log = await this.getSymptomLogById(logId);

    await prisma.symptomLog.delete({
      where: { id: logId },
    });

    auditLogger.log({
      action: 'SYMPTOM_LOG_DELETED',
      userId,
      clientId: log.clientId,
      resourceId: logId,
    });

    return { success: true, message: 'Symptom log deleted successfully' };
  }

  /**
   * Get symptom trends over time
   */
  async getSymptomTrends(clientId: string, dateRange: DateRange) {
    const logs = await prisma.symptomLog.findMany({
      where: {
        clientId,
        loggedAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { loggedAt: 'asc' },
    });

    // Calculate daily averages
    const dailyData = new Map<string, { total: number; count: number; moods: string[] }>();

    logs.forEach((log) => {
      const date = log.loggedAt.toISOString().split('T')[0];
      const existing = dailyData.get(date) || { total: 0, count: 0, moods: [] };

      existing.total += log.severity;
      existing.count += 1;
      if (log.mood) existing.moods.push(log.mood);

      dailyData.set(date, existing);
    });

    const trends = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      averageSeverity: data.total / data.count,
      logCount: data.count,
      dominantMood: this.getMostCommon(data.moods),
    }));

    // Calculate weekly rolling average
    const weeklyTrends = this.calculateRollingAverage(trends, 7);

    // Identify trend direction (improving, worsening, stable)
    const trendDirection = this.calculateTrendDirection(trends);

    return {
      daily: trends,
      weekly: weeklyTrends,
      direction: trendDirection,
      totalLogs: logs.length,
    };
  }

  /**
   * Get symptom summary and statistics
   */
  async getSymptomSummary(clientId: string, dateRange: DateRange) {
    const logs = await prisma.symptomLog.findMany({
      where: {
        clientId,
        loggedAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    if (logs.length === 0) {
      return {
        totalLogs: 0,
        averageSeverity: 0,
        mostCommonSymptoms: [],
        mostCommonTriggers: [],
        moodDistribution: {},
        severityDistribution: {},
      };
    }

    // Calculate average severity
    const averageSeverity = logs.reduce((sum, log) => sum + log.severity, 0) / logs.length;

    // Get most common symptoms
    const symptomCounts = new Map<string, number>();
    logs.forEach((log) => {
      log.symptoms.forEach((symptom) => {
        symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
      });
    });

    const mostCommonSymptoms = Array.from(symptomCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symptom, count]) => ({ symptom, count }));

    // Get most common triggers
    const triggerCounts = new Map<string, number>();
    logs.forEach((log) => {
      log.triggers.forEach((trigger) => {
        triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
      });
    });

    const mostCommonTriggers = Array.from(triggerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([trigger, count]) => ({ trigger, count }));

    // Mood distribution
    const moodDistribution: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.mood) {
        moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
      }
    });

    // Severity distribution (group into ranges)
    const severityDistribution = {
      mild: logs.filter((l) => l.severity <= 3).length,
      moderate: logs.filter((l) => l.severity >= 4 && l.severity <= 6).length,
      severe: logs.filter((l) => l.severity >= 7 && l.severity <= 8).length,
      extreme: logs.filter((l) => l.severity >= 9).length,
    };

    return {
      totalLogs: logs.length,
      averageSeverity: parseFloat(averageSeverity.toFixed(2)),
      mostCommonSymptoms,
      mostCommonTriggers,
      moodDistribution,
      severityDistribution,
    };
  }

  /**
   * Helper: Get most common item from array
   */
  private getMostCommon(items: string[]): string | null {
    if (items.length === 0) return null;

    const counts = new Map<string, number>();
    items.forEach((item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Helper: Calculate rolling average
   */
  private calculateRollingAverage(
    data: Array<{ date: string; averageSeverity: number }>,
    windowSize: number
  ) {
    const result = [];

    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, d) => sum + d.averageSeverity, 0) / windowSize;

      result.push({
        date: data[i].date,
        rollingAverage: parseFloat(average.toFixed(2)),
      });
    }

    return result;
  }

  /**
   * Helper: Calculate trend direction
   */
  private calculateTrendDirection(data: Array<{ averageSeverity: number }>): string {
    if (data.length < 2) return 'INSUFFICIENT_DATA';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.averageSeverity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.averageSeverity, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change < -10) return 'IMPROVING'; // Severity decreasing
    if (change > 10) return 'WORSENING'; // Severity increasing
    return 'STABLE';
  }
}

export default new SymptomTrackingService();
