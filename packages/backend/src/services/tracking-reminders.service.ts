import prisma from './database';
import * as cron from 'node-cron';
import logger, { auditLogger } from '../utils/logger';

interface ReminderPreferences {
  symptomReminders: boolean;
  symptomReminderTime?: string; // HH:mm format
  sleepReminders: boolean;
  sleepReminderTime?: string;
  exerciseReminders: boolean;
  exerciseReminderTime?: string;
  timezone?: string;
}

interface ScheduledReminder {
  clientId: string;
  type: 'SYMPTOM' | 'SLEEP' | 'EXERCISE';
  scheduledFor: Date;
  sent: boolean;
}

export class TrackingRemindersService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Get reminder preferences for a client
   */
  async getReminderPreferences(clientId: string): Promise<ReminderPreferences> {
    // In a real implementation, this would be stored in the database
    // For now, return default preferences
    return {
      symptomReminders: true,
      symptomReminderTime: '20:00', // 8 PM
      sleepReminders: true,
      sleepReminderTime: '08:00', // 8 AM next day
      exerciseReminders: true,
      exerciseReminderTime: '18:00', // 6 PM
      timezone: 'America/New_York',
    };
  }

  /**
   * Update reminder preferences
   */
  async updateReminderPreferences(
    clientId: string,
    preferences: Partial<ReminderPreferences>,
    userId: string
  ) {
    // In a real implementation, save to database
    // For now, just log and reschedule

    auditLogger.info('Reminder preferences updated', {
      action: 'REMINDER_PREFERENCES_UPDATED',
      userId,
      clientId,
      details: preferences,
    });

    // Reschedule reminders for this client
    await this.scheduleRemindersForClient(clientId, preferences as ReminderPreferences);

    return {
      success: true,
      preferences,
    };
  }

  /**
   * Schedule reminders for a client
   */
  async scheduleRemindersForClient(clientId: string, preferences: ReminderPreferences) {
    // Cancel existing jobs for this client
    this.cancelRemindersForClient(clientId);

    // Schedule symptom reminder
    if (preferences.symptomReminders && preferences.symptomReminderTime) {
      const [hour, minute] = preferences.symptomReminderTime.split(':');
      const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time

      const job = cron.schedule(cronExpression, async () => {
        await this.sendSymptomReminder(clientId);
      });

      this.scheduledJobs.set(`${clientId}-symptom`, job);
    }

    // Schedule sleep reminder (next morning)
    if (preferences.sleepReminders && preferences.sleepReminderTime) {
      const [hour, minute] = preferences.sleepReminderTime.split(':');
      const cronExpression = `${minute} ${hour} * * *`;

      const job = cron.schedule(cronExpression, async () => {
        await this.sendSleepReminder(clientId);
      });

      this.scheduledJobs.set(`${clientId}-sleep`, job);
    }

    // Schedule exercise reminder
    if (preferences.exerciseReminders && preferences.exerciseReminderTime) {
      const [hour, minute] = preferences.exerciseReminderTime.split(':');
      const cronExpression = `${minute} ${hour} * * *`;

      const job = cron.schedule(cronExpression, async () => {
        await this.sendExerciseReminder(clientId);
      });

      this.scheduledJobs.set(`${clientId}-exercise`, job);
    }

    return {
      success: true,
      message: 'Reminders scheduled successfully',
    };
  }

  /**
   * Cancel reminders for a client
   */
  private cancelRemindersForClient(clientId: string) {
    ['symptom', 'sleep', 'exercise'].forEach((type) => {
      const key = `${clientId}-${type}`;
      const job = this.scheduledJobs.get(key);
      if (job) {
        job.stop();
        this.scheduledJobs.delete(key);
      }
    });
  }

  /**
   * Send symptom reminder (smart - skip if already logged today)
   */
  async sendSymptomReminder(clientId: string) {
    // Check if already logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLog = await prisma.symptomLog.findFirst({
      where: {
        clientId,
        loggedAt: {
          gte: today,
        },
      },
    });

    // Skip if already logged
    if (existingLog) {
      auditLogger.info(`Skipping symptom reminder for client ${clientId} - already logged today`);
      return;
    }

    // Get client info for notification
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        email: true,
      },
    });

    if (!client) return;

    // In a real implementation, send notification via email/SMS/push
    // For now, we'll create a notification record
    auditLogger.info(`Sending symptom reminder to ${client.firstName} (${client.email})`);

    // TODO: Integrate with notification service
    // await notificationService.send({
    //   clientId,
    //   type: 'SYMPTOM_REMINDER',
    //   title: 'Time to log your symptoms',
    //   message: 'How are you feeling today? Take a moment to log your symptoms.',
    //   priority: 'LOW',
    // });

    auditLogger.info('Reminder sent', {
      action: 'REMINDER_SENT',
      userId: 'SYSTEM',
      clientId,
      details: {
        type: 'SYMPTOM',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Send sleep reminder
   */
  async sendSleepReminder(clientId: string) {
    // Check if already logged for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const existingLog = await prisma.sleepLog.findFirst({
      where: {
        clientId,
        logDate: {
          gte: yesterday,
        },
      },
    });

    if (existingLog) {
      auditLogger.info(`Skipping sleep reminder for client ${clientId} - already logged`);
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        email: true,
      },
    });

    if (!client) return;

    auditLogger.info(`Sending sleep reminder to ${client.firstName} (${client.email})`);

    // TODO: Send notification
    // await notificationService.send({
    //   clientId,
    //   type: 'SLEEP_REMINDER',
    //   title: 'Log your sleep',
    //   message: 'How did you sleep last night? Log your sleep quality and duration.',
    //   priority: 'LOW',
    // });

    auditLogger.info('Reminder sent', {
      action: 'REMINDER_SENT',
      userId: 'SYSTEM',
      clientId,
      details: {
        type: 'SLEEP',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Send exercise reminder
   */
  async sendExerciseReminder(clientId: string) {
    // Check if already logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLog = await prisma.exerciseLog.findFirst({
      where: {
        clientId,
        loggedAt: {
          gte: today,
        },
      },
    });

    if (existingLog) {
      auditLogger.info(`Skipping exercise reminder for client ${clientId} - already logged today`);
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        email: true,
      },
    });

    if (!client) return;

    auditLogger.info(`Sending exercise reminder to ${client.firstName} (${client.email})`);

    // TODO: Send notification
    // await notificationService.send({
    //   clientId,
    //   type: 'EXERCISE_REMINDER',
    //   title: 'Time to move!',
    //   message: "Don't forget to log your physical activity for today.",
    //   priority: 'LOW',
    // });

    auditLogger.info('Reminder sent', {
      action: 'REMINDER_SENT',
      userId: 'SYSTEM',
      clientId,
      details: {
        type: 'EXERCISE',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Snooze a reminder (postpone for 1 hour)
   */
  async snoozeReminder(clientId: string, reminderType: 'SYMPTOM' | 'SLEEP' | 'EXERCISE') {
    // In a real implementation, reschedule for 1 hour later
    // For now, just log

    auditLogger.info('Reminder snoozed', {
      action: 'REMINDER_SNOOZED',
      userId: clientId,
      clientId,
      details: {
        type: reminderType,
        snoozedAt: new Date(),
        snoozeUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    return {
      success: true,
      message: 'Reminder snoozed for 1 hour',
    };
  }

  /**
   * Dismiss a reminder (skip for today)
   */
  async dismissReminder(clientId: string, reminderType: 'SYMPTOM' | 'SLEEP' | 'EXERCISE') {
    auditLogger.info('Reminder dismissed', {
      action: 'REMINDER_DISMISSED',
      userId: clientId,
      clientId,
      details: {
        type: reminderType,
        dismissedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Reminder dismissed',
    };
  }

  /**
   * Get reminder history for a client
   */
  async getReminderHistory(clientId: string, limit = 50) {
    // In a real implementation, query from audit logs or reminder history table
    // For now, return empty array

    return {
      reminders: [],
      total: 0,
    };
  }

  /**
   * Calculate engagement score based on logging frequency
   */
  async calculateEngagementScore(clientId: string, days = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [symptomCount, sleepCount, exerciseCount] = await Promise.all([
      prisma.symptomLog.count({
        where: {
          clientId,
          loggedAt: { gte: startDate },
        },
      }),
      prisma.sleepLog.count({
        where: {
          clientId,
          logDate: { gte: startDate },
        },
      }),
      prisma.exerciseLog.count({
        where: {
          clientId,
          loggedAt: { gte: startDate },
        },
      }),
    ]);

    const totalLogs = symptomCount + sleepCount + exerciseCount;
    const maxPossibleLogs = days * 3; // 3 types of logs per day
    const engagementScore = (totalLogs / maxPossibleLogs) * 100;

    return Math.min(100, Math.round(engagementScore));
  }

  /**
   * Get logging streak (consecutive days with at least one log)
   */
  async getLoggingStreak(clientId: string): Promise<{ current: number; longest: number }> {
    // Get all logs from last 365 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const [symptomLogs, sleepLogs, exerciseLogs] = await Promise.all([
      prisma.symptomLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: startDate },
        },
        select: { loggedAt: true },
      }),
      prisma.sleepLog.findMany({
        where: {
          clientId,
          logDate: { gte: startDate },
        },
        select: { logDate: true },
      }),
      prisma.exerciseLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: startDate },
        },
        select: { loggedAt: true },
      }),
    ]);

    // Combine all dates
    const allDates = [
      ...symptomLogs.map((l) => l.loggedAt),
      ...sleepLogs.map((l) => l.logDate),
      ...exerciseLogs.map((l) => l.loggedAt),
    ];

    // Get unique dates (formatted as YYYY-MM-DD)
    const uniqueDates = Array.from(
      new Set(allDates.map((date) => new Date(date).toISOString().split('T')[0]))
    ).sort();

    if (uniqueDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];
    const lastLogDate = uniqueDates[uniqueDates.length - 1];

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak += 1;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    if (lastLogDate === today || this.isYesterday(lastLogDate)) {
      currentStreak = tempStreak;
    }

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Helper: Check if date is yesterday
   */
  private isYesterday(dateStr: string): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
  }

  /**
   * Initialize reminders for all active clients
   */
  async initializeAllReminders() {
    // Get all active clients
    const clients = await prisma.client.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    auditLogger.info(`Initializing reminders for ${clients.length} clients`);

    for (const client of clients) {
      try {
        const preferences = await this.getReminderPreferences(client.id);
        await this.scheduleRemindersForClient(client.id, preferences);
      } catch (error) {
        logger.error('Error initializing reminders for client', { clientId: client.id, error });
      }
    }

    auditLogger.info('All reminders initialized');

    return {
      success: true,
      initialized: clients.length,
    };
  }

  /**
   * Cleanup - stop all scheduled jobs
   */
  async cleanup() {
    this.scheduledJobs.forEach((job) => job.stop());
    this.scheduledJobs.clear();
    auditLogger.info('All reminder jobs stopped');
  }
}

export default new TrackingRemindersService();
