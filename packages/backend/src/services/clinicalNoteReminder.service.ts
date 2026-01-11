import { PrismaClient } from '@mentalspace/database';
import { EmailReminderService } from './email.reminder.service';
import logger from '../utils/logger';

// Define status and type enums locally since they don't exist in schema
enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

enum ReminderType {
  APPROACHING_DUE = 'APPROACHING_DUE',
  OVERDUE = 'OVERDUE',
  DAILY_DIGEST = 'DAILY_DIGEST',
}

const prisma = new PrismaClient();

// TODO: ClinicalNoteReminder model needs to be added to schema
// Using type assertion to allow compilation
const clinicalNoteReminderModel = prisma as any;
const emailService = new EmailReminderService(prisma);

interface ScheduleReminderData {
  noteId: string;
  reminderType: ReminderType;
  hoursBeforeDue: number;
  recipientUserId: string;
  recipientEmail: string;
}

interface ReminderTemplate {
  subject: string;
  html: string;
}

/**
 * Clinical Note Reminder Service
 * Handles scheduling and sending reminders for incomplete clinical notes
 */
export const clinicalNoteReminderService = {
  /**
   * Schedule a reminder for a clinical note
   */
  async scheduleReminder(data: ScheduleReminderData) {
    try {
      // Get the note to calculate due date
      const note = await prisma.clinicalNote.findUnique({
        where: { id: data.noteId },
        include: {
          client: true,
          clinician: true,
          appointment: true,
        },
      });

      if (!note) {
        throw new Error('Clinical note not found');
      }

      // Calculate scheduled time (due date - hours before due)
      if (!note.dueDate) {
        throw new Error('Clinical note does not have a due date');
      }
      const dueDate = new Date(note.dueDate);
      const scheduledFor = new Date(dueDate.getTime() - data.hoursBeforeDue * 60 * 60 * 1000);

      // Don't schedule reminders in the past
      if (scheduledFor < new Date()) {
        logger.warn('Cannot schedule reminder in the past', {
          noteId: data.noteId,
          scheduledFor,
          dueDate,
        });
        return null;
      }

      // Check if reminder already exists
      const existing = await clinicalNoteReminderModel.clinicalNoteReminder.findFirst({
        where: {
          noteId: data.noteId,
          hoursBeforeDue: data.hoursBeforeDue,
          recipientUserId: data.recipientUserId,
          status: ReminderStatus.PENDING,
        },
      });

      if (existing) {
        logger.info('Reminder already scheduled', {
          reminderId: existing.id,
          noteId: data.noteId,
        });
        return existing;
      }

      // Create reminder
      const reminder = await clinicalNoteReminderModel.clinicalNoteReminder.create({
        data: {
          noteId: data.noteId,
          reminderType: data.reminderType,
          scheduledFor,
          recipientEmail: data.recipientEmail,
          recipientUserId: data.recipientUserId,
          hoursBeforeDue: data.hoursBeforeDue,
          status: ReminderStatus.PENDING,
        },
        include: {
          note: {
            include: {
              client: true,
              clinician: true,
              appointment: true,
            },
          },
          recipientUser: true,
        },
      });

      logger.info('Reminder scheduled successfully', {
        reminderId: reminder.id,
        noteId: data.noteId,
        scheduledFor,
      });

      return reminder;
    } catch (error: any) {
      logger.error('Failed to schedule reminder', {
        error: error.message,
        noteId: data.noteId,
      });
      throw error;
    }
  },

  /**
   * Schedule all reminders for a clinical note based on practice settings
   */
  async scheduleAllReminders(noteId: string, userId: string) {
    try {
      // Get practice settings
      const practiceSettings = await prisma.practiceSettings.findFirst();

      if (!practiceSettings || !practiceSettings.enableNoteReminders) {
        logger.info('Note reminders are disabled', { noteId });
        return [];
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.email) {
        throw new Error('User not found or has no email');
      }

      // Get reminder schedule in days (default: 3, 2, 1, 0 days) and convert to hours
      const reminderScheduleDays = practiceSettings.noteReminderSchedule || [2, 1, 0];
      const reminderSchedule = reminderScheduleDays.map((days: number) => days * 24);

      // Schedule each reminder
      const reminders = [];
      for (const hoursBeforeDue of reminderSchedule) {
        const reminder = await this.scheduleReminder({
          noteId,
          reminderType: ReminderType.APPROACHING_DUE,
          hoursBeforeDue,
          recipientUserId: userId,
          recipientEmail: user.email,
        });

        if (reminder) {
          reminders.push(reminder);
        }
      }

      logger.info('All reminders scheduled', {
        noteId,
        count: reminders.length,
      });

      return reminders;
    } catch (error: any) {
      logger.error('Failed to schedule all reminders', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  },

  /**
   * Get pending reminders that are due to be sent
   */
  async getPendingReminders() {
    try {
      const now = new Date();

      const reminders = await clinicalNoteReminderModel.clinicalNoteReminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          note: {
            include: {
              client: true,
              clinician: true,
              appointment: true,
            },
          },
          recipientUser: true,
        },
        orderBy: {
          scheduledFor: 'asc',
        },
      });

      return reminders;
    } catch (error: any) {
      logger.error('Failed to get pending reminders', {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Send a reminder email
   */
  async sendReminder(reminderId: string) {
    try {
      const reminder = await clinicalNoteReminderModel.clinicalNoteReminder.findUnique({
        where: { id: reminderId },
        include: {
          note: {
            include: {
              client: true,
              clinician: true,
              appointment: true,
            },
          },
          recipientUser: true,
        },
      });

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.status !== ReminderStatus.PENDING) {
        logger.warn('Reminder is not in PENDING status', {
          reminderId,
          status: reminder.status,
        });
        return reminder;
      }

      // Skip if note is already completed
      if (reminder.note.status === 'SIGNED' || reminder.note.status === 'COMPLETED') {
        await clinicalNoteReminderModel.clinicalNoteReminder.update({
          where: { id: reminderId },
          data: {
            status: ReminderStatus.CANCELLED,
          },
        });

        logger.info('Reminder cancelled - note already completed', {
          reminderId,
          noteId: reminder.noteId,
        });

        return reminder;
      }

      // Generate email template
      const template = this.generateEmailTemplate(reminder);

      // Send email
      await emailService.sendEmail({
        to: reminder.recipientEmail,
        from: process.env.RESEND_FROM_EMAIL || 'CHC Therapy <support@chctherapy.com>',
        subject: template.subject,
        html: template.html,
      });

      // Update reminder status
      const updated = await clinicalNoteReminderModel.clinicalNoteReminder.update({
        where: { id: reminderId },
        data: {
          status: ReminderStatus.SENT,
          sentAt: new Date(),
        },
      });

      logger.info('Reminder sent successfully', {
        reminderId,
        noteId: reminder.noteId,
      });

      return updated;
    } catch (error: any) {
      logger.error('Failed to send reminder', {
        error: error.message,
        reminderId,
      });

      // Update reminder with error
      const maxRetries = 3;
      const reminder = await clinicalNoteReminderModel.clinicalNoteReminder.findUnique({
        where: { id: reminderId },
      });

      if (reminder && reminder.retryCount < maxRetries) {
        await clinicalNoteReminderModel.clinicalNoteReminder.update({
          where: { id: reminderId },
          data: {
            retryCount: reminder.retryCount + 1,
            lastRetryAt: new Date(),
            errorMessage: error.message,
          },
        });
      } else {
        await clinicalNoteReminderModel.clinicalNoteReminder.update({
          where: { id: reminderId },
          data: {
            status: ReminderStatus.FAILED,
            errorMessage: error.message,
          },
        });
      }

      throw error;
    }
  },

  /**
   * Process all pending reminders
   */
  async processPendingReminders() {
    try {
      const reminders = await this.getPendingReminders();

      logger.info('Processing pending reminders', {
        count: reminders.length,
      });

      const results = {
        sent: 0,
        failed: 0,
        cancelled: 0,
      };

      for (const reminder of reminders) {
        try {
          await this.sendReminder(reminder.id);
          results.sent++;
        } catch (error) {
          results.failed++;
        }
      }

      logger.info('Finished processing reminders', results);

      return results;
    } catch (error: any) {
      logger.error('Failed to process pending reminders', {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Generate email template for reminder
   */
  generateEmailTemplate(reminder: any): ReminderTemplate {
    const { note, recipientUser, hoursBeforeDue } = reminder;
    const client = note.client;
    const appointment = note.appointment;

    const dueDate = new Date(note.dueDate);
    const dueDateStr = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let urgencyLevel = 'reminder';
    let urgencyColor = '#3b82f6';
    let urgencyText = 'Reminder';

    if (hoursBeforeDue === 0) {
      urgencyLevel = 'overdue';
      urgencyColor = '#dc2626';
      urgencyText = 'URGENT - Due Today';
    } else if (hoursBeforeDue <= 24) {
      urgencyLevel = 'urgent';
      urgencyColor = '#f59e0b';
      urgencyText = 'Due Tomorrow';
    } else if (hoursBeforeDue <= 48) {
      urgencyLevel = 'warning';
      urgencyColor = '#eab308';
      urgencyText = 'Due in 2 Days';
    }

    const subject = `${urgencyText}: Clinical Note Due for ${client.firstName} ${client.lastName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Clinical Note Reminder
              </h1>
            </div>

            <!-- Urgency Badge -->
            <div style="padding: 20px; text-align: center; background-color: ${urgencyColor}20;">
              <div style="display: inline-block; padding: 10px 20px; background-color: ${urgencyColor}; color: #ffffff; border-radius: 20px; font-weight: bold; font-size: 16px;">
                ${urgencyText}
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hello ${recipientUser.firstName},
              </p>

              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
                This is a reminder that you have a clinical note due for:
              </p>

              <!-- Client Info Card -->
              <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">
                  ${client.firstName} ${client.lastName}
                </h3>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>Session Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>Note Type:</strong> ${note.noteType}
                </p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>Due Date:</strong> <span style="color: ${urgencyColor}; font-weight: bold;">${dueDateStr}</span>
                </p>
              </div>

              ${
                hoursBeforeDue === 0
                  ? `
                <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">
                    ⚠️ This note is due today. Please complete it as soon as possible to maintain compliance.
                  </p>
                </div>
              `
                  : ''
              }

              <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                Please log in to MentalSpace EHR to complete this clinical note.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/clinical-notes/${note.id}"
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Complete Clinical Note
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                This is an automated reminder from MentalSpace EHR.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                If you have already completed this note, please disregard this message.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    return { subject, html };
  },

  /**
   * Cancel all pending reminders for a note
   */
  async cancelReminders(noteId: string) {
    try {
      const result = await clinicalNoteReminderModel.clinicalNoteReminder.updateMany({
        where: {
          noteId,
          status: ReminderStatus.PENDING,
        },
        data: {
          status: ReminderStatus.CANCELLED,
        },
      });

      logger.info('Cancelled reminders for note', {
        noteId,
        count: result.count,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to cancel reminders', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  },

  /**
   * Get reminders for a specific note
   */
  async getRemindersForNote(noteId: string) {
    try {
      const reminders = await clinicalNoteReminderModel.clinicalNoteReminder.findMany({
        where: { noteId },
        include: {
          recipientUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          scheduledFor: 'asc',
        },
      });

      return reminders;
    } catch (error: any) {
      logger.error('Failed to get reminders for note', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  },

  /**
   * Get reminders for a specific user
   */
  async getRemindersForUser(userId: string, includeCompleted: boolean = false) {
    try {
      const where: any = { recipientUserId: userId };

      if (!includeCompleted) {
        where.status = {
          in: [ReminderStatus.PENDING, ReminderStatus.SENT],
        };
      }

      const reminders = await clinicalNoteReminderModel.clinicalNoteReminder.findMany({
        where,
        include: {
          note: {
            include: {
              client: true,
              appointment: true,
            },
          },
        },
        orderBy: {
          scheduledFor: 'desc',
        },
      });

      return reminders;
    } catch (error: any) {
      logger.error('Failed to get reminders for user', {
        error: error.message,
        userId,
      });
      throw error;
    }
  },
};
