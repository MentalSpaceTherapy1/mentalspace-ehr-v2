/**
 * Clinical Note Reminder Scheduler
 * Phase 3.1: Scheduler for processing clinical note reminders
 *
 * Replaces functionality from:
 * - clinicalNoteReminder.service.ts (processPendingReminders)
 * - emailReminder.service.ts (various reminder methods)
 */

import cron from 'node-cron';
import { UserRole } from '@prisma/client';
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
  batchSize: 50,
};

interface NoteReminderConfig {
  dueSoonHours: number;
  overdueEscalationDays: number[];
  enableDailyDigest: boolean;
  digestHour: number;
}

const DEFAULT_REMINDER_CONFIG: NoteReminderConfig = {
  dueSoonHours: 24,
  overdueEscalationDays: [1, 3, 7],
  enableDailyDigest: true,
  digestHour: 8,
};

/**
 * Clinical Note Reminder Scheduler
 * Handles reminders for note due dates, overdue notes, and co-sign requests
 */
export class ClinicalNoteReminderScheduler implements INotificationScheduler {
  private config: SchedulerConfig;
  private reminderConfig: NoteReminderConfig;
  private job: ReturnType<typeof cron.schedule> | null = null;
  private isProcessing = false;
  private lastRunAt?: Date;
  private lastRunResult?: SchedulerRunResult;

  constructor(
    config: Partial<SchedulerConfig> = {},
    reminderConfig: Partial<NoteReminderConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reminderConfig = { ...DEFAULT_REMINDER_CONFIG, ...reminderConfig };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.job) {
      logger.warn('Clinical note reminder scheduler is already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Clinical note reminder scheduler is disabled');
      return;
    }

    this.job = cron.schedule(this.config.cronExpression, async () => {
      if (this.isProcessing) {
        logger.warn('Previous clinical note reminder job still running, skipping');
        return;
      }

      try {
        await this.runNow();
      } catch (error) {
        logger.error('Error in scheduled clinical note reminder processing', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    logger.info('Clinical note reminder scheduler started', {
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
      logger.info('Clinical note reminder scheduler stopped');
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
      logger.info('Starting clinical note reminder processing');

      // Process different types of reminders
      const dueSoonResult = await this.processDueSoonReminders();
      const overdueResult = await this.processOverdueReminders();
      const cosignResult = await this.processCosignReminders();
      const digestResult = this.reminderConfig.enableDailyDigest
        ? await this.processDailyDigests()
        : { total: 0, sent: 0, failed: 0, skipped: 0 };

      // Aggregate results
      result.total =
        dueSoonResult.total +
        overdueResult.total +
        cosignResult.total +
        digestResult.total;
      result.sent =
        dueSoonResult.sent +
        overdueResult.sent +
        cosignResult.sent +
        digestResult.sent;
      result.failed =
        dueSoonResult.failed +
        overdueResult.failed +
        cosignResult.failed +
        digestResult.failed;
      result.skipped =
        dueSoonResult.skipped +
        overdueResult.skipped +
        cosignResult.skipped +
        digestResult.skipped;

      result.durationMs = Date.now() - startTime;
      this.lastRunAt = new Date();
      this.lastRunResult = result;

      logger.info('Clinical note reminder processing completed', {
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
   * Process due soon reminders
   */
  private async processDueSoonReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    const now = new Date();
    const dueSoonThreshold = new Date(
      now.getTime() + this.reminderConfig.dueSoonHours * 60 * 60 * 1000
    );

    // Find notes due within threshold
    const notes = await prisma.clinicalNote.findMany({
      where: {
        status: 'DRAFT',
        dueDate: {
          gt: now,
          lte: dueSoonThreshold,
        },
      },
      include: {
        clinician: true,
        client: true,
      },
      take: this.config.batchSize,
    });

    // Group by clinician
    const notesByClinician = new Map<string, typeof notes>();
    for (const note of notes) {
      const existing = notesByClinician.get(note.clinicianId) || [];
      existing.push(note);
      notesByClinician.set(note.clinicianId, existing);
    }

    // Send reminders to each clinician
    for (const [clinicianId, clinicianNotes] of notesByClinician) {
      result.total++;

      try {
        const clinician = clinicianNotes[0].clinician;
        if (!clinician) {
          result.skipped++;
          continue;
        }

        const templateData = {
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          noteCount: clinicianNotes.length,
          notes: clinicianNotes.map((n) => ({
            clientName: `${n.client.firstName} ${n.client.lastName}`,
            noteType: n.noteType,
            sessionDate: n.sessionDate?.toLocaleDateString() || 'N/A',
            dueDate: n.dueDate?.toLocaleDateString() || 'N/A',
            hoursRemaining: n.dueDate
              ? Math.round(
                  (n.dueDate.getTime() - now.getTime()) / (60 * 60 * 1000)
                )
              : 0,
          })),
          dashboardLink: `${process.env.APP_URL}/clinical-notes`,
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'NOTE_DUE_SOON',
          recipientId: clinicianId,
          recipientType: 'user',
          channels: ['email'],
          templateData,
        });

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send due soon reminder', {
          clinicianId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Process overdue reminders with escalation
   */
  private async processOverdueReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    const now = new Date();

    // Find overdue notes
    const notes = await prisma.clinicalNote.findMany({
      where: {
        status: 'DRAFT',
        dueDate: {
          lt: now,
        },
      },
      include: {
        clinician: {
          include: {
            supervisor: true,
          },
        },
        client: true,
      },
      take: this.config.batchSize,
    });

    // Group by clinician
    const notesByClinician = new Map<string, typeof notes>();
    for (const note of notes) {
      const existing = notesByClinician.get(note.clinicianId) || [];
      existing.push(note);
      notesByClinician.set(note.clinicianId, existing);
    }

    // Send overdue reminders
    for (const [clinicianId, clinicianNotes] of notesByClinician) {
      result.total++;

      try {
        const clinician = clinicianNotes[0].clinician;
        if (!clinician) {
          result.skipped++;
          continue;
        }

        // Determine escalation level based on max days overdue
        const maxDaysOverdue = Math.max(
          ...clinicianNotes.map((n) =>
            n.dueDate
              ? Math.floor(
                  (now.getTime() - n.dueDate.getTime()) / (24 * 60 * 60 * 1000)
                )
              : 0
          )
        );

        let escalationLevel: 'WARNING' | 'ESCALATED' | 'CRITICAL' = 'WARNING';
        if (maxDaysOverdue >= 7) {
          escalationLevel = 'CRITICAL';
        } else if (maxDaysOverdue >= 3) {
          escalationLevel = 'ESCALATED';
        }

        const templateData = {
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          noteCount: clinicianNotes.length,
          notes: clinicianNotes.map((n) => ({
            clientName: `${n.client.firstName} ${n.client.lastName}`,
            noteType: n.noteType,
            sessionDate: n.sessionDate?.toLocaleDateString() || 'N/A',
            dueDate: n.dueDate?.toLocaleDateString() || 'N/A',
            daysOverdue: n.dueDate
              ? Math.floor(
                  (now.getTime() - n.dueDate.getTime()) / (24 * 60 * 60 * 1000)
                )
              : 0,
          })),
          dashboardLink: `${process.env.APP_URL}/clinical-notes`,
          supervisorName: clinician.supervisor
            ? `${clinician.supervisor.firstName} ${clinician.supervisor.lastName}`
            : undefined,
          escalationLevel,
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'NOTE_OVERDUE',
          recipientId: clinicianId,
          recipientType: 'user',
          channels: ['email'],
          templateData,
        });

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send overdue reminder', {
          clinicianId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Process co-sign reminders for supervisors
   */
  private async processCosignReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    // Find notes pending co-sign
    const notes = await prisma.clinicalNote.findMany({
      where: {
        status: 'PENDING_COSIGN',
        cosignedBy: { not: null },
        cosignedDate: null,
      },
      include: {
        clinician: true,
        client: true,
      },
      take: this.config.batchSize,
    });

    // Group by supervisor
    const notesBySupervisor = new Map<string, typeof notes>();
    for (const note of notes) {
      if (!note.cosignedBy) continue;
      const existing = notesBySupervisor.get(note.cosignedBy) || [];
      existing.push(note);
      notesBySupervisor.set(note.cosignedBy, existing);
    }

    // Send reminders to supervisors
    for (const [supervisorId, supervisorNotes] of notesBySupervisor) {
      result.total++;

      try {
        // Get supervisor info
        const supervisor = await prisma.user.findUnique({
          where: { id: supervisorId },
        });

        if (!supervisor) {
          result.skipped++;
          continue;
        }

        // Get unique clinicians
        const clinicianNames = [
          ...new Set(
            supervisorNotes.map(
              (n) => `${n.clinician.firstName} ${n.clinician.lastName}`
            )
          ),
        ];

        const templateData = {
          supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
          clinicianName: clinicianNames.join(', '),
          noteCount: supervisorNotes.length,
          notes: supervisorNotes.map((n) => ({
            clientName: `${n.client.firstName} ${n.client.lastName}`,
            noteType: n.noteType,
            sessionDate: n.sessionDate?.toLocaleDateString() || 'N/A',
            submittedAt: n.signedDate?.toLocaleDateString() || 'N/A',
          })),
          reviewLink: `${process.env.APP_URL}/supervision/pending-cosigns`,
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'NOTE_PENDING_COSIGN',
          recipientId: supervisorId,
          recipientType: 'user',
          channels: ['email'],
          templateData,
        });

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send co-sign reminder', {
          supervisorId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Process daily digest emails
   */
  private async processDailyDigests(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const result = { total: 0, sent: 0, failed: 0, skipped: 0 };

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get all active clinicians
    const clinicians = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          hasSome: [UserRole.CLINICIAN, UserRole.SUPERVISOR, UserRole.ASSOCIATE],
        },
        emailNotifications: true,
      },
      take: this.config.batchSize,
    });

    for (const clinician of clinicians) {
      result.total++;

      try {
        // Get note counts for this clinician
        const [dueTodayCount, dueSoonCount, overdueCount, pendingCosignCount] =
          await Promise.all([
            prisma.clinicalNote.count({
              where: {
                clinicianId: clinician.id,
                status: 'DRAFT',
                dueDate: {
                  gte: now,
                  lte: todayEnd,
                },
              },
            }),
            prisma.clinicalNote.count({
              where: {
                clinicianId: clinician.id,
                status: 'DRAFT',
                dueDate: {
                  gt: todayEnd,
                  lte: new Date(
                    now.getTime() + 3 * 24 * 60 * 60 * 1000
                  ),
                },
              },
            }),
            prisma.clinicalNote.count({
              where: {
                clinicianId: clinician.id,
                status: 'DRAFT',
                dueDate: {
                  lt: now,
                },
              },
            }),
            prisma.clinicalNote.count({
              where: {
                cosignedBy: clinician.id,
                status: 'PENDING_COSIGN',
                cosignedDate: null,
              },
            }),
          ]);

        // Skip if nothing to report
        if (
          dueTodayCount === 0 &&
          dueSoonCount === 0 &&
          overdueCount === 0 &&
          pendingCosignCount === 0
        ) {
          result.skipped++;
          continue;
        }

        // Get due today notes
        const dueTodayNotes = await prisma.clinicalNote.findMany({
          where: {
            clinicianId: clinician.id,
            status: 'DRAFT',
            dueDate: {
              gte: now,
              lte: todayEnd,
            },
          },
          include: { client: true },
          take: 5,
        });

        // Get overdue notes
        const overdueNotes = await prisma.clinicalNote.findMany({
          where: {
            clinicianId: clinician.id,
            status: 'DRAFT',
            dueDate: {
              lt: now,
            },
          },
          include: { client: true },
          take: 5,
          orderBy: { dueDate: 'asc' },
        });

        const templateData = {
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          summary: {
            dueTodayCount,
            dueSoonCount,
            overdueCount,
            pendingCosignCount,
          },
          dueTodayNotes: dueTodayNotes.map((n) => ({
            clientName: `${n.client.firstName} ${n.client.lastName}`,
            noteType: n.noteType,
            sessionDate: n.sessionDate?.toLocaleDateString() || 'N/A',
          })),
          overdueNotes: overdueNotes.map((n) => ({
            clientName: `${n.client.firstName} ${n.client.lastName}`,
            noteType: n.noteType,
            daysOverdue: n.dueDate
              ? Math.floor(
                  (now.getTime() - n.dueDate.getTime()) / (24 * 60 * 60 * 1000)
                )
              : 0,
          })),
          dashboardLink: `${process.env.APP_URL}/clinical-notes`,
          practiceName: 'MentalSpace',
        };

        const sendResult = await notificationService.send({
          type: 'NOTE_DAILY_DIGEST',
          recipientId: clinician.id,
          recipientType: 'user',
          channels: ['email'],
          templateData,
        });

        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        logger.error('Failed to send daily digest', {
          clinicianId: clinician.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }
}

// Export singleton instance
export const clinicalNoteReminderScheduler = new ClinicalNoteReminderScheduler();
