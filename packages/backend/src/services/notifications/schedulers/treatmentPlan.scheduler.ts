/**
 * Treatment Plan Reminder Scheduler
 * Phase 5.x: Scheduler for treatment plan compliance notifications
 *
 * Business Rules:
 * - Each active client should have a treatment plan every 3 months (90 days)
 * - Notifications start at day 60 (30 days before deadline)
 * - Reminders sent every 7 days until plan is completed/renewed
 * - Dashboard shows upcoming/overdue with visual alerts
 */

import cron from 'node-cron';
import prisma from '../../database';
import logger from '../../../utils/logger';
import {
  INotificationScheduler,
  SchedulerStatus,
  SchedulerRunResult,
  SchedulerConfig,
} from '../types';
import { notificationService } from '../notification.service';

const DEFAULT_CONFIG: SchedulerConfig = {
  cronExpression: '0 8 * * *', // Daily at 8 AM
  enabled: true,
  batchSize: 100,
};

interface TreatmentPlanReminderConfig {
  /** Days before 90-day deadline to start notifications (default: 30 = day 60) */
  firstReminderDaysBefore: number;
  /** Days between reminders (default: 7) */
  reminderIntervalDays: number;
  /** Treatment plan validity period in days (default: 90) */
  validityPeriodDays: number;
}

const DEFAULT_REMINDER_CONFIG: TreatmentPlanReminderConfig = {
  firstReminderDaysBefore: 30, // Start at day 60
  reminderIntervalDays: 7,
  validityPeriodDays: 90, // 3 months
};

interface TreatmentPlanTrackingRecord {
  clientId: string;
  clinicianId: string;
  lastTreatmentPlanId: string | null;
  lastTreatmentPlanDate: Date | null;
  daysSincePlan: number;
  isOverdue: boolean;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  lastReminderSent: Date | null;
  reminderCount: number;
}

/**
 * Treatment Plan Reminder Scheduler
 * Handles reminders for treatment plan compliance
 */
export class TreatmentPlanReminderScheduler implements INotificationScheduler {
  private config: SchedulerConfig;
  private reminderConfig: TreatmentPlanReminderConfig;
  private job: ReturnType<typeof cron.schedule> | null = null;
  private isProcessing = false;
  private lastRunAt?: Date;
  private lastRunResult?: SchedulerRunResult;

  constructor(
    config: Partial<SchedulerConfig> = {},
    reminderConfig: Partial<TreatmentPlanReminderConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reminderConfig = { ...DEFAULT_REMINDER_CONFIG, ...reminderConfig };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.job) {
      logger.warn('Treatment plan reminder scheduler is already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Treatment plan reminder scheduler is disabled');
      return;
    }

    this.job = cron.schedule(this.config.cronExpression, async () => {
      if (this.isProcessing) {
        logger.warn('Previous treatment plan reminder job still running, skipping');
        return;
      }

      try {
        await this.runNow();
      } catch (error) {
        logger.error('Error in scheduled treatment plan reminder processing', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    logger.info('Treatment plan reminder scheduler started', {
      cronExpression: this.config.cronExpression,
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Treatment plan reminder scheduler stopped');
    }
  }

  /**
   * Run the scheduler immediately
   */
  async runNow(): Promise<SchedulerRunResult> {
    if (this.isProcessing) {
      throw new Error('Scheduler is already processing');
    }

    const startTime = Date.now();
    this.isProcessing = true;

    const result: SchedulerRunResult = {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      errors: [],
    };

    try {
      logger.info('Starting treatment plan reminder processing');

      // Process treatment plan reminders
      const upcomingResult = await this.processUpcomingReminders();
      const overdueResult = await this.processOverdueReminders();
      const supervisorResult = await this.processSupervisorAlerts();

      // Aggregate results
      result.total = upcomingResult.total + overdueResult.total + supervisorResult.total;
      result.sent = upcomingResult.sent + overdueResult.sent + supervisorResult.sent;
      result.failed = upcomingResult.failed + overdueResult.failed + supervisorResult.failed;
      result.skipped = upcomingResult.skipped + overdueResult.skipped + supervisorResult.skipped;

      result.durationMs = Date.now() - startTime;
      this.lastRunAt = new Date();
      this.lastRunResult = result;

      logger.info('Treatment plan reminder processing completed', {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        durationMs: result.durationMs,
      });

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.job !== null,
      isProcessing: this.isProcessing,
      lastRunAt: this.lastRunAt,
      lastRunResult: this.lastRunResult,
    };
  }

  /**
   * Get all clients needing treatment plan attention
   */
  private async getClientsNeedingAttention(): Promise<TreatmentPlanTrackingRecord[]> {
    const now = new Date();
    const { validityPeriodDays, firstReminderDaysBefore } = this.reminderConfig;

    // Get all active clients with their primary clinician and latest treatment plan
    const clients = await prisma.client.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryTherapistId: true,
        clinicalNotes: {
          where: {
            noteType: 'Treatment Plan',
            status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
          },
          orderBy: { signedDate: 'desc' },
          take: 1,
          select: {
            id: true,
            signedDate: true,
            clinicianId: true,
          },
        },
      },
      take: this.config.batchSize,
    });

    const records: TreatmentPlanTrackingRecord[] = [];

    for (const client of clients) {
      const latestPlan = client.clinicalNotes[0];
      const clinicianId = latestPlan?.clinicianId || client.primaryTherapistId;

      if (!clinicianId) continue;

      let daysSincePlan = validityPeriodDays + 1; // Default: overdue
      let isOverdue = true;
      let daysUntilDue: number | null = null;
      let daysOverdue: number | null = null;

      if (latestPlan?.signedDate) {
        const signedDate = new Date(latestPlan.signedDate);
        daysSincePlan = Math.floor(
          (now.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        isOverdue = daysSincePlan > validityPeriodDays;

        if (isOverdue) {
          daysOverdue = daysSincePlan - validityPeriodDays;
        } else {
          daysUntilDue = validityPeriodDays - daysSincePlan;
        }
      } else {
        // No treatment plan at all
        daysOverdue = validityPeriodDays; // Consider fully overdue
      }

      // Get last reminder sent from treatment plan reminder tracking
      const lastReminder = await prisma.treatmentPlanReminder.findFirst({
        where: { clientId: client.id },
        orderBy: { sentAt: 'desc' },
      });

      // Only include if needs attention (within reminder window or overdue)
      const needsReminder =
        isOverdue ||
        (daysUntilDue !== null && daysUntilDue <= firstReminderDaysBefore);

      if (needsReminder) {
        records.push({
          clientId: client.id,
          clinicianId,
          lastTreatmentPlanId: latestPlan?.id || null,
          lastTreatmentPlanDate: latestPlan?.signedDate || null,
          daysSincePlan,
          isOverdue,
          daysUntilDue,
          daysOverdue,
          lastReminderSent: lastReminder?.sentAt || null,
          reminderCount: lastReminder?.reminderCount || 0,
        });
      }
    }

    return records;
  }

  /**
   * Check if reminder should be sent based on interval
   */
  private shouldSendReminder(lastReminderSent: Date | null): boolean {
    if (!lastReminderSent) return true;

    const daysSinceLastReminder = Math.floor(
      (new Date().getTime() - new Date(lastReminderSent).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return daysSinceLastReminder >= this.reminderConfig.reminderIntervalDays;
  }

  /**
   * Process upcoming treatment plan reminders (day 60-90)
   */
  private async processUpcomingReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    const records = await this.getClientsNeedingAttention();
    const upcomingRecords = records.filter((r) => !r.isOverdue);

    // Group by clinician
    const recordsByClinician = new Map<string, typeof upcomingRecords>();
    for (const record of upcomingRecords) {
      const existing = recordsByClinician.get(record.clinicianId) || [];
      existing.push(record);
      recordsByClinician.set(record.clinicianId, existing);
    }

    for (const [clinicianId, clinicianRecords] of recordsByClinician) {
      // Filter to only those needing reminder
      const needsReminder = clinicianRecords.filter((r) =>
        this.shouldSendReminder(r.lastReminderSent)
      );

      if (needsReminder.length === 0) {
        result.skipped += clinicianRecords.length;
        continue;
      }

      result.total++;

      try {
        const clinician = await prisma.user.findUnique({
          where: { id: clinicianId },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

        if (!clinician) {
          result.skipped++;
          continue;
        }

        // Get client names
        const clientIds = needsReminder.map((r) => r.clientId);
        const clients = await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, firstName: true, lastName: true },
        });

        const clientMap = new Map(clients.map((c) => [c.id, c]));

        const templateData = {
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          clientCount: needsReminder.length,
          clients: needsReminder.map((r) => {
            const client = clientMap.get(r.clientId);
            return {
              clientName: client
                ? `${client.firstName} ${client.lastName}`
                : 'Unknown',
              daysUntilDue: r.daysUntilDue,
              lastPlanDate: r.lastTreatmentPlanDate
                ? new Date(r.lastTreatmentPlanDate).toLocaleDateString()
                : 'Never',
            };
          }),
          urgencyLevel: 'UPCOMING',
          dashboardLink: `${process.env.APP_URL}/clinical-notes?type=Treatment%20Plan`,
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'TREATMENT_PLAN_DUE_SOON',
          recipientId: clinicianId,
          recipientType: 'user',
          channels: ['email'],
          templateData,
        });

        if (sendResult.success) {
          result.sent++;

          // Update reminder tracking
          for (const record of needsReminder) {
            await this.updateReminderTracking(record.clientId, clinicianId, false);
          }
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send upcoming treatment plan reminder', {
          clinicianId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Process overdue treatment plan reminders
   */
  private async processOverdueReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    const records = await this.getClientsNeedingAttention();
    const overdueRecords = records.filter((r) => r.isOverdue);

    // Group by clinician
    const recordsByClinician = new Map<string, typeof overdueRecords>();
    for (const record of overdueRecords) {
      const existing = recordsByClinician.get(record.clinicianId) || [];
      existing.push(record);
      recordsByClinician.set(record.clinicianId, existing);
    }

    for (const [clinicianId, clinicianRecords] of recordsByClinician) {
      // Filter to only those needing reminder
      const needsReminder = clinicianRecords.filter((r) =>
        this.shouldSendReminder(r.lastReminderSent)
      );

      if (needsReminder.length === 0) {
        result.skipped += clinicianRecords.length;
        continue;
      }

      result.total++;

      try {
        const clinician = await prisma.user.findUnique({
          where: { id: clinicianId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supervisorId: true,
          },
        });

        if (!clinician) {
          result.skipped++;
          continue;
        }

        // Get client names
        const clientIds = needsReminder.map((r) => r.clientId);
        const clients = await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, firstName: true, lastName: true },
        });

        const clientMap = new Map(clients.map((c) => [c.id, c]));

        // Determine urgency level
        const maxDaysOverdue = Math.max(...needsReminder.map((r) => r.daysOverdue || 0));
        let urgencyLevel: 'WARNING' | 'CRITICAL' | 'URGENT' = 'WARNING';
        if (maxDaysOverdue >= 30) {
          urgencyLevel = 'URGENT';
        } else if (maxDaysOverdue >= 14) {
          urgencyLevel = 'CRITICAL';
        }

        const templateData = {
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          clientCount: needsReminder.length,
          clients: needsReminder.map((r) => {
            const client = clientMap.get(r.clientId);
            return {
              clientName: client
                ? `${client.firstName} ${client.lastName}`
                : 'Unknown',
              daysOverdue: r.daysOverdue,
              lastPlanDate: r.lastTreatmentPlanDate
                ? new Date(r.lastTreatmentPlanDate).toLocaleDateString()
                : 'Never',
            };
          }),
          urgencyLevel,
          maxDaysOverdue,
          dashboardLink: `${process.env.APP_URL}/clinical-notes?type=Treatment%20Plan`,
          complianceWarning:
            'Georgia Board requires treatment plans be reviewed every 90 days. Notes cannot be created for clients with overdue treatment plans.',
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'TREATMENT_PLAN_OVERDUE',
          recipientId: clinicianId,
          recipientType: 'user',
          channels: ['email'],
          templateData,
          priority: urgencyLevel === 'URGENT' ? 'high' : 'normal',
        });

        if (sendResult.success) {
          result.sent++;

          // Update reminder tracking
          for (const record of needsReminder) {
            await this.updateReminderTracking(record.clientId, clinicianId, true);
          }
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send overdue treatment plan reminder', {
          clinicianId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Process supervisor alerts for overdue treatment plans
   */
  private async processSupervisorAlerts(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    const records = await this.getClientsNeedingAttention();
    const criticalRecords = records.filter(
      (r) => r.isOverdue && (r.daysOverdue || 0) >= 14
    );

    if (criticalRecords.length === 0) {
      return result;
    }

    // Get unique supervisors
    const clinicianIds = [...new Set(criticalRecords.map((r) => r.clinicianId))];
    const clinicians = await prisma.user.findMany({
      where: { id: { in: clinicianIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        supervisorId: true,
      },
    });

    // Group by supervisor
    const recordsBySupervisor = new Map<
      string,
      { clinician: typeof clinicians[0]; records: typeof criticalRecords }[]
    >();

    for (const clinician of clinicians) {
      if (!clinician.supervisorId) continue;

      const clinicianRecords = criticalRecords.filter(
        (r) => r.clinicianId === clinician.id
      );

      if (clinicianRecords.length === 0) continue;

      const existing = recordsBySupervisor.get(clinician.supervisorId) || [];
      existing.push({ clinician, records: clinicianRecords });
      recordsBySupervisor.set(clinician.supervisorId, existing);
    }

    for (const [supervisorId, superviseeData] of recordsBySupervisor) {
      result.total++;

      try {
        const supervisor = await prisma.user.findUnique({
          where: { id: supervisorId },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

        if (!supervisor) {
          result.skipped++;
          continue;
        }

        // Get all client names
        const allClientIds = superviseeData.flatMap((s) =>
          s.records.map((r) => r.clientId)
        );
        const clients = await prisma.client.findMany({
          where: { id: { in: allClientIds } },
          select: { id: true, firstName: true, lastName: true },
        });
        const clientMap = new Map(clients.map((c) => [c.id, c]));

        const templateData = {
          supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
          totalOverdue: superviseeData.reduce((sum, s) => sum + s.records.length, 0),
          supervisees: superviseeData.map((s) => ({
            clinicianName: `${s.clinician.firstName} ${s.clinician.lastName}`,
            overdueCount: s.records.length,
            clients: s.records.map((r) => {
              const client = clientMap.get(r.clientId);
              return {
                clientName: client
                  ? `${client.firstName} ${client.lastName}`
                  : 'Unknown',
                daysOverdue: r.daysOverdue,
              };
            }),
          })),
          dashboardLink: `${process.env.APP_URL}/supervision/compliance`,
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'TREATMENT_PLAN_SUPERVISOR_ALERT',
          recipientId: supervisorId,
          recipientType: 'user',
          channels: ['email'],
          templateData,
          priority: 'high',
        });

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send supervisor treatment plan alert', {
          supervisorId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Update reminder tracking record
   */
  private async updateReminderTracking(
    clientId: string,
    clinicianId: string,
    isOverdue: boolean
  ): Promise<void> {
    try {
      const existing = await prisma.treatmentPlanReminder.findFirst({
        where: { clientId },
        orderBy: { sentAt: 'desc' },
      });

      if (existing) {
        await prisma.treatmentPlanReminder.update({
          where: { id: existing.id },
          data: {
            sentAt: new Date(),
            reminderCount: existing.reminderCount + 1,
            isOverdue,
          },
        });
      } else {
        await prisma.treatmentPlanReminder.create({
          data: {
            clientId,
            clinicianId,
            sentAt: new Date(),
            reminderCount: 1,
            isOverdue,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to update treatment plan reminder tracking', {
        clientId,
        clinicianId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const treatmentPlanReminderScheduler = new TreatmentPlanReminderScheduler();
