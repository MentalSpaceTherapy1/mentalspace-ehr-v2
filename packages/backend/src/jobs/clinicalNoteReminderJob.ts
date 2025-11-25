import cron from 'node-cron';
import prisma from '../services/database';
import emailReminderService from '../services/emailReminder.service';
import * as reminderConfigService from '../services/reminderConfig.service';
import logger from '../utils/logger';
import { NoteStatus } from '@prisma/client';

/**
 * Clinical Note Reminder Job
 * Module 4 Phase 2.5: Automated Email Reminder System
 *
 * Scheduled jobs for sending email reminders about clinical notes:
 * - Hourly: Check for due soon and overdue notes
 * - Daily Digest: Send summary at configured time
 * - Sunday Warnings: Friday evening reminders about Sunday lockout
 *
 * NOTE: This job currently does NOT track sent reminders because the
 * ClinicalNoteReminder model is not implemented in the schema. It will
 * send reminder emails but may send duplicates.
 */

interface NoteWithRelations {
  id: string;
  noteType: string;
  sessionDate: Date;
  dueDate: Date;
  status: NoteStatus;
  clientId: string;
  clinicianId: string;
  client: {
    firstName: string;
    lastName: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Check for notes that need "due soon" reminders (72h, 48h, 24h before)
 */
async function checkDueSoonReminders() {
  try {
    if (!emailReminderService.isConfigured()) {
      logger.debug('Email service not configured, skipping due soon reminders');
      return;
    }

    logger.info('Checking for due soon reminders...');

    // Get all incomplete notes with upcoming due dates
    const now = new Date();
    const next72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const upcomingNotes = await prisma.clinicalNote.findMany({
      where: {
        status: {
          in: ['DRAFT', 'PENDING_COSIGN', 'RETURNED_FOR_REVISION'],
        },
        dueDate: {
          gte: now,
          lte: next72Hours,
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }) as NoteWithRelations[];

    logger.info(`Found ${upcomingNotes.length} upcoming notes to check`);

    for (const note of upcomingNotes) {
      try {
        // Get effective configuration for this clinician
        const config = await reminderConfigService.getEffectiveConfig(
          note.clinicianId,
          note.noteType
        );

        if (!config || !config.enabled) {
          continue;
        }

        // Calculate hours until due
        const hoursUntilDue = Math.floor(
          (note.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        // Check if we should send a reminder at this interval
        const shouldSendReminder = config.reminderIntervals.some(
          interval => Math.abs(hoursUntilDue - interval) < 1 // Within 1 hour of interval
        );

        if (!shouldSendReminder) {
          continue;
        }

        // TODO: Reminder tracking disabled - ClinicalNoteReminder model not implemented
        // This may result in duplicate reminders being sent
        // const existingReminder = await prisma.clinicalNoteReminder.findFirst({...});

        // Send the email
        const sent = await emailReminderService.sendDueSoonReminder({
          recipientEmail: note.clinician.email,
          recipientName: `${note.clinician.firstName} ${note.clinician.lastName}`,
          note: note as any, // Type assertion - NoteWithRelations simplified interface
          reminderType: 'DUE_SOON',
          hoursRemaining: hoursUntilDue,
        });

        logger.info('Due soon reminder sent', {
          noteId: note.id,
          clinicianId: note.clinicianId,
          hoursUntilDue,
        });
      } catch (error: any) {
        logger.error('Error sending due soon reminder', {
          error: error.message,
          noteId: note.id,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in checkDueSoonReminders job', {
      error: error.message,
    });
  }
}

/**
 * Check for overdue notes and send reminders
 */
async function checkOverdueReminders() {
  try {
    if (!emailReminderService.isConfigured()) {
      logger.debug('Email service not configured, skipping overdue reminders');
      return;
    }

    logger.info('Checking for overdue reminders...');

    const now = new Date();

    // Get all overdue notes
    const overdueNotes = await prisma.clinicalNote.findMany({
      where: {
        status: {
          in: ['DRAFT', 'PENDING_COSIGN', 'RETURNED_FOR_REVISION'],
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }) as NoteWithRelations[];

    logger.info(`Found ${overdueNotes.length} overdue notes to check`);

    for (const note of overdueNotes) {
      try {
        // Get effective configuration
        const config = await reminderConfigService.getEffectiveConfig(
          note.clinicianId,
          note.noteType
        );

        if (!config || !config.enabled || !config.sendOverdueReminders) {
          continue;
        }

        // Calculate hours overdue
        const hoursOverdue = Math.floor(
          (now.getTime() - note.dueDate.getTime()) / (1000 * 60 * 60)
        );

        // TODO: Reminder tracking disabled - ClinicalNoteReminder model not implemented
        // Cannot track reminder count or frequency without the model
        // This may result in duplicate reminders

        // Send overdue reminder
        const sent = await emailReminderService.sendOverdueReminder({
          recipientEmail: note.clinician.email,
          recipientName: `${note.clinician.firstName} ${note.clinician.lastName}`,
          note: note as any, // Type assertion - NoteWithRelations simplified interface
          reminderType: 'OVERDUE',
          hoursOverdue,
        });

        logger.info('Overdue reminder sent', {
          noteId: note.id,
          clinicianId: note.clinicianId,
          hoursOverdue,
        });

        // Check for escalation
        if (config.enableEscalation && hoursOverdue >= config.escalationAfterHours) {
          await sendEscalationReminder(note, hoursOverdue, config.escalateTo);
        }
      } catch (error: any) {
        logger.error('Error sending overdue reminder', {
          error: error.message,
          noteId: note.id,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in checkOverdueReminders job', {
      error: error.message,
    });
  }
}

/**
 * Send escalation reminder to supervisors/administrators
 */
async function sendEscalationReminder(
  note: NoteWithRelations,
  hoursOverdue: number,
  escalateTo: string[]
) {
  try {
    if (escalateTo.length === 0) {
      return;
    }

    // Get supervisor/admin users
    const recipients = await prisma.user.findMany({
      where: {
        id: {
          in: escalateTo,
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    for (const recipient of recipients) {
      // TODO: Escalation tracking disabled - ClinicalNoteReminder model not implemented
      // This may result in duplicate escalation emails

      const sent = await emailReminderService.sendEscalationReminder({
        recipientEmail: recipient.email,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        note: note as any, // Type assertion - NoteWithRelations simplified interface
        reminderType: 'ESCALATION',
        hoursOverdue,
      });

      if (sent) {
        logger.info('Escalation reminder sent', {
          noteId: note.id,
          recipientId: recipient.id,
          hoursOverdue,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error sending escalation reminder', {
      error: error.message,
      noteId: note.id,
    });
  }
}

/**
 * Send Sunday warning reminders (Friday evening)
 */
async function checkSundayWarnings() {
  try {
    if (!emailReminderService.isConfigured()) {
      logger.debug('Email service not configured, skipping Sunday warnings');
      return;
    }

    // Only run on Fridays
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek !== 5) { // 5 = Friday
      return;
    }

    logger.info('Checking for Sunday warning reminders...');

    // Get notes that are not complete
    const pendingNotes = await prisma.clinicalNote.findMany({
      where: {
        status: {
          in: ['DRAFT', 'PENDING_COSIGN', 'RETURNED_FOR_REVISION'],
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }) as NoteWithRelations[];

    logger.info(`Found ${pendingNotes.length} pending notes for Sunday warnings`);

    for (const note of pendingNotes) {
      try {
        const config = await reminderConfigService.getEffectiveConfig(
          note.clinicianId,
          note.noteType
        );

        if (!config || !config.enabled || !config.enableSundayWarnings) {
          continue;
        }

        // TODO: Sunday warning tracking disabled - ClinicalNoteReminder model not implemented
        // This may result in duplicate Sunday warning emails

        const sent = await emailReminderService.sendSundayWarningReminder({
          recipientEmail: note.clinician.email,
          recipientName: `${note.clinician.firstName} ${note.clinician.lastName}`,
          note: note as any, // Type assertion - NoteWithRelations simplified interface
          reminderType: 'SUNDAY_WARNING',
        });

        if (sent) {
          logger.info('Sunday warning sent', {
            noteId: note.id,
            clinicianId: note.clinicianId,
          });
        }
      } catch (error: any) {
        logger.error('Error sending Sunday warning', {
          error: error.message,
          noteId: note.id,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in checkSundayWarnings job', {
      error: error.message,
    });
  }
}

/**
 * Send daily digest emails
 */
async function sendDailyDigests() {
  try {
    if (!emailReminderService.isConfigured()) {
      logger.debug('Email service not configured, skipping daily digests');
      return;
    }

    logger.info('Sending daily digests...');

    // Get all clinicians with active notes
    const clinicians = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          hasSome: ['CLINICIAN', 'ASSOCIATE'],
        },
      },
      include: {
        clinicalNotesCreated: {
          where: {
            status: {
              in: ['DRAFT', 'PENDING_COSIGN', 'RETURNED_FOR_REVISION'],
            },
          },
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();

    for (const clinician of clinicians) {
      try {
        const config = await reminderConfigService.getEffectiveConfig(clinician.id);

        if (!config || !config.enabled || !config.enableDailyDigest) {
          continue;
        }

        const notes = clinician.clinicalNotesCreated as any[];

        // Separate overdue and upcoming
        const overdueNotes = notes.filter(note => new Date(note.dueDate) < now);
        const upcomingNotes = notes.filter(note => {
          const dueDate = new Date(note.dueDate);
          const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          return dueDate >= now && hoursUntilDue <= 72;
        });

        if (overdueNotes.length === 0 && upcomingNotes.length === 0) {
          continue;
        }

        const sent = await emailReminderService.sendDailyDigest({
          recipientEmail: clinician.email,
          recipientName: `${clinician.firstName} ${clinician.lastName}`,
          overdueNotes,
          upcomingNotes,
        });

        if (sent) {
          logger.info('Daily digest sent', {
            clinicianId: clinician.id,
            overdueCount: overdueNotes.length,
            upcomingCount: upcomingNotes.length,
          });
        }
      } catch (error: any) {
        logger.error('Error sending daily digest', {
          error: error.message,
          clinicianId: clinician.id,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in sendDailyDigests job', {
      error: error.message,
    });
  }
}

/**
 * Initialize and start all scheduled jobs
 */
export function startReminderJobs() {
  logger.info('Starting clinical note reminder jobs...');

  // Run hourly to check for due soon and overdue reminders
  cron.schedule('0 * * * *', async () => {
    logger.info('Running hourly reminder check');
    await checkDueSoonReminders();
    await checkOverdueReminders();
  });

  // Run daily digest at 9 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily digest');
    await sendDailyDigests();
  });

  // Run Sunday warnings on Friday at 5 PM
  cron.schedule('0 17 * * 5', async () => {
    logger.info('Running Sunday warning check');
    await checkSundayWarnings();
  });

  logger.info('Clinical note reminder jobs started successfully');
}

// Export individual functions for testing
export {
  checkDueSoonReminders,
  checkOverdueReminders,
  checkSundayWarnings,
  sendDailyDigests,
};
