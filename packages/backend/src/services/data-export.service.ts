import prisma from './database';
import progressAnalyticsService from './progress-analytics.service';
import { ValidationError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface ExportOptions {
  includeSymptoms?: boolean;
  includeSleep?: boolean;
  includeExercise?: boolean;
  format: 'CSV' | 'JSON';
}

export class DataExportService {
  /**
   * Export tracking data to CSV
   */
  async exportToCSV(clientId: string, dateRange: DateRange, options: ExportOptions = { format: 'CSV', includeSymptoms: true, includeSleep: true, includeExercise: true }) {
    const {
      includeSymptoms = true,
      includeSleep = true,
      includeExercise = true,
    } = options;

    const exports: { filename: string; content: string }[] = [];

    // Export symptom logs
    if (includeSymptoms) {
      const symptomLogs = await prisma.symptomLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      });

      const symptomCSV = this.generateSymptomCSV(symptomLogs);
      exports.push({
        filename: 'symptom_logs.csv',
        content: symptomCSV,
      });
    }

    // Export sleep logs
    if (includeSleep) {
      const sleepLogs = await prisma.sleepLog.findMany({
        where: {
          clientId,
          logDate: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { logDate: 'asc' },
      });

      const sleepCSV = this.generateSleepCSV(sleepLogs);
      exports.push({
        filename: 'sleep_logs.csv',
        content: sleepCSV,
      });
    }

    // Export exercise logs
    if (includeExercise) {
      const exerciseLogs = await prisma.exerciseLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      });

      const exerciseCSV = this.generateExerciseCSV(exerciseLogs);
      exports.push({
        filename: 'exercise_logs.csv',
        content: exerciseCSV,
      });
    }

    return exports;
  }

  /**
   * Generate symptom CSV
   */
  private generateSymptomCSV(logs: any[]): string {
    const headers = [
      'Date',
      'Time',
      'Symptoms',
      'Severity (1-10)',
      'Triggers',
      'Mood',
      'Duration',
      'Medications',
      'Notes',
    ];

    const rows = logs.map((log) => [
      this.formatDate(log.loggedAt),
      this.formatTime(log.loggedAt),
      log.symptoms.join('; '),
      log.severity,
      log.triggers.join('; '),
      log.mood || '',
      log.duration || '',
      log.medications.join('; '),
      this.escapeCSV(log.notes || ''),
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate sleep CSV
   */
  private generateSleepCSV(logs: any[]): string {
    const headers = [
      'Date',
      'Bedtime',
      'Wake Time',
      'Hours Slept',
      'Quality (1-5)',
      'Disturbances',
      'Notes',
    ];

    const rows = logs.map((log) => [
      this.formatDate(log.logDate),
      this.formatTime(log.bedtime),
      this.formatTime(log.wakeTime),
      log.hoursSlept,
      log.quality,
      log.disturbances.join('; '),
      this.escapeCSV(log.notes || ''),
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate exercise CSV
   */
  private generateExerciseCSV(logs: any[]): string {
    const headers = ['Date', 'Time', 'Activity Type', 'Duration (min)', 'Intensity', 'Mood', 'Notes'];

    const rows = logs.map((log) => [
      this.formatDate(log.loggedAt),
      this.formatTime(log.loggedAt),
      log.activityType,
      log.duration,
      log.intensity,
      log.mood || '',
      this.escapeCSV(log.notes || ''),
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Export to JSON format
   */
  async exportToJSON(clientId: string, dateRange: DateRange, options: ExportOptions) {
    const {
      includeSymptoms = true,
      includeSleep = true,
      includeExercise = true,
    } = options;

    const data: any = {
      exportDate: new Date(),
      dateRange,
    };

    if (includeSymptoms) {
      data.symptomLogs = await prisma.symptomLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      });
    }

    if (includeSleep) {
      data.sleepLogs = await prisma.sleepLog.findMany({
        where: {
          clientId,
          logDate: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { logDate: 'asc' },
      });
    }

    if (includeExercise) {
      data.exerciseLogs = await prisma.exerciseLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      });
    }

    return {
      filename: 'health_tracking_data.json',
      content: JSON.stringify(data, null, 2),
    };
  }

  /**
   * Generate PDF report (returns structured data for PDF generation)
   * Note: Actual PDF rendering should be done on frontend or with a PDF library
   */
  async generatePDFData(clientId: string, dateRange: DateRange) {
    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        email: true,
      },
    });

    if (!client) {
      throw new ValidationError('Client not found');
    }

    // Get comprehensive analytics
    const report = await progressAnalyticsService.generateProgressReport(clientId, dateRange);

    // Get all raw data for charts
    const [symptomLogs, sleepLogs, exerciseLogs] = await Promise.all([
      prisma.symptomLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.sleepLog.findMany({
        where: {
          clientId,
          logDate: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { logDate: 'asc' },
      }),
      prisma.exerciseLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    return {
      metadata: {
        title: 'Health Progress Report',
        generatedDate: new Date(),
        period: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      },
      client: {
        name: `${client.firstName} ${client.lastName}`,
        dateOfBirth: client.dateOfBirth,
        email: client.email,
      },
      summary: report.summary,
      healthScore: (report as any).healthScore,
      insights: report.insights,
      symptoms: {
        summary: report.symptoms,
        logs: symptomLogs,
        chartData: this.prepareSymptomChartData(symptomLogs),
      },
      sleep: {
        summary: report.sleep,
        logs: sleepLogs,
        chartData: this.prepareSleepChartData(sleepLogs),
      },
      exercise: {
        summary: report.exercise,
        logs: exerciseLogs,
        chartData: this.prepareExerciseChartData(exerciseLogs),
      },
      correlations: report.correlations,
      patterns: report.patterns,
    };
  }

  /**
   * Create secure, expiring download link
   */
  async createSecureDownloadLink(
    clientId: string,
    exportType: 'CSV' | 'JSON' | 'PDF',
    dateRange: DateRange,
    expiresInMinutes = 30
  ) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // In a real implementation, store this in Redis or a temporary table
    // For now, we'll return the token with metadata

    return {
      token,
      downloadUrl: `/api/tracking/export/download/${token}`,
      expiresAt,
      metadata: {
        clientId,
        exportType,
        dateRange,
      },
    };
  }

  /**
   * Helper: Convert array to CSV string
   */
  private arrayToCSV(data: any[][]): string {
    return data.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Helper: Escape CSV special characters
   */
  private escapeCSV(str: string): string {
    return str.replace(/"/g, '""');
  }

  /**
   * Helper: Format date
   */
  private formatDate(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * Helper: Format time
   */
  private formatTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Prepare symptom chart data
   */
  private prepareSymptomChartData(logs: any[]) {
    return {
      severityOverTime: logs.map((log) => ({
        date: this.formatDate(log.loggedAt),
        severity: log.severity,
      })),
      symptomFrequency: this.calculateFrequency(
        logs.flatMap((log) => log.symptoms)
      ),
      moodDistribution: this.calculateFrequency(
        logs.map((log) => log.mood).filter(Boolean)
      ),
    };
  }

  /**
   * Prepare sleep chart data
   */
  private prepareSleepChartData(logs: any[]) {
    return {
      hoursOverTime: logs.map((log) => ({
        date: this.formatDate(log.logDate),
        hours: log.hoursSlept,
      })),
      qualityOverTime: logs.map((log) => ({
        date: this.formatDate(log.logDate),
        quality: log.quality,
      })),
      disturbances: this.calculateFrequency(
        logs.flatMap((log) => log.disturbances)
      ),
    };
  }

  /**
   * Prepare exercise chart data
   */
  private prepareExerciseChartData(logs: any[]) {
    // Group by week
    const weeklyData = new Map<string, { minutes: number; sessions: number }>();

    logs.forEach((log) => {
      const week = this.getWeekKey(log.loggedAt);
      const existing = weeklyData.get(week) || { minutes: 0, sessions: 0 };
      existing.minutes += log.duration;
      existing.sessions += 1;
      weeklyData.set(week, existing);
    });

    return {
      weeklyActivity: Array.from(weeklyData.entries()).map(([week, data]) => ({
        week,
        minutes: data.minutes,
        sessions: data.sessions,
      })),
      activityTypes: this.calculateFrequency(logs.map((log) => log.activityType)),
      intensityDistribution: this.calculateFrequency(logs.map((log) => log.intensity)),
    };
  }

  /**
   * Helper: Calculate frequency distribution
   */
  private calculateFrequency(items: string[]) {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([item, count]) => ({ name: item, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Helper: Get week key
   */
  private getWeekKey(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }
}

export default new DataExportService();
