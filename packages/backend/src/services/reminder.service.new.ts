import { PrismaClient, Appointment, Client, User } from '@mentalspace/database';
import logger, { auditLogger } from '../utils/logger';
import { TwilioReminderService } from './twilio.reminder.service';
import { EmailReminderService } from './email.reminder.service';
import { IcsGeneratorService } from './icsGenerator.service';

interface ReminderSchedule {
  appointmentId: string;
  clientPhone?: string;
  clientEmail?: string;
  appointmentDate: Date;
  clinicianName: string;
  clientName: string;
}

interface ReminderConfig {
  id: string;
  practiceSettingsId: string;

  // SMS Configuration
  smsEnabled: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  smsTemplateReminder?: string;
  smsTemplateConfirmation?: string;

  // Email Configuration
  emailEnabled: boolean;
  sesRegion?: string;
  sesFromEmail?: string;
  sesFromName?: string;
  emailTemplateSubject?: string;
  emailTemplateBody?: string;
  includeIcsAttachment: boolean;

  // Voice Configuration
  voiceEnabled: boolean;
  voiceScriptUrl?: string;
  voiceFromNumber?: string;

  // Reminder Schedule
  enableOneWeekReminder: boolean;
  oneWeekOffset: number;
  enableTwoDayReminder: boolean;
  twoDayOffset: number;
  enableOneDayReminder: boolean;
  oneDayOffset: number;
  enableDayOfReminder: boolean;
  dayOfOffset: number;

  // Retry logic
  maxRetries: number;
  retryDelayMinutes: number;

  // Operating hours
  sendStartHour: number;
  sendEndHour: number;
  sendOnWeekends: boolean;
}

export class ReminderService {
  constructor(
    private prisma: PrismaClient,
    private twilioService: TwilioReminderService,
    private emailService: EmailReminderService,
    private icsService: IcsGeneratorService
  ) {}

  /**
   * Get reminder configuration from database
   */
  private async getReminderConfig(): Promise<ReminderConfig | null> {
    try {
      // For now, we assume there's a single practice settings record
      // In a multi-tenant system, you'd need to specify which practice
      const config = await this.prisma.reminderConfiguration.findFirst({
        include: {
          practiceSettings: true,
        },
      });

      return config as any;
    } catch (error) {
      logger.error('Failed to get reminder configuration', { error });
      return null;
    }
  }

  /**
   * Schedule all reminders for a new appointment
   */
  async scheduleRemindersForAppointment(appointmentId: string): Promise<void> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: true,
          clinician: true,
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check if appointment is in the future
      const appointmentDateTime = new Date(appointment.appointmentDate);
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      if (appointmentDateTime <= new Date()) {
        logger.info('Skipping reminder scheduling for past appointment', { appointmentId });
        return;
      }

      const config = await this.getReminderConfig();
      if (!config) {
        logger.warn('No reminder configuration found, skipping reminder scheduling');
        return;
      }

      const reminderSchedule = this.calculateReminderSchedule(
        appointmentDateTime,
        config
      );

      // Delete existing reminders for this appointment (in case of rescheduling)
      await this.prisma.appointmentReminder.deleteMany({
        where: { appointmentId },
      });

      // Create reminder records for each scheduled time
      for (const schedule of reminderSchedule) {
        await this.prisma.appointmentReminder.create({
          data: {
            appointmentId,
            reminderType: schedule.type,
            scheduledFor: schedule.sendAt,
            deliveryStatus: 'PENDING',
          },
        });
      }

      logger.info('Reminders scheduled for appointment', {
        appointmentId,
        reminderCount: reminderSchedule.length,
      });
    } catch (error) {
      logger.error('Failed to schedule reminders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
      });
      throw error;
    }
  }

  /**
   * Process pending reminders (called by cron job)
   */
  async processPendingReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const now = new Date();
    const results = {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    try {
      const config = await this.getReminderConfig();
      if (!config) {
        logger.warn('No reminder configuration found, skipping processing');
        return results;
      }

      // Check if we're within operating hours
      if (!this.isWithinOperatingHours(now, config)) {
        logger.info('Outside operating hours, skipping reminder processing');
        return results;
      }

      const pendingReminders = await this.prisma.appointmentReminder.findMany({
        where: {
          deliveryStatus: 'PENDING',
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          appointment: {
            include: {
              client: true,
              clinician: true,
            },
          },
        },
      });

      results.total = pendingReminders.length;

      for (const reminder of pendingReminders) {
        try {
          await this.sendReminder(reminder as any, config);
          results.sent++;
        } catch (error) {
          logger.error('Failed to send reminder', {
            reminderId: reminder.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          results.failed++;
        }
      }

      logger.info('Reminder processing complete', results);
      return results;
    } catch (error) {
      logger.error('Error processing pending reminders', { error });
      throw error;
    }
  }

  /**
   * Retry failed reminders that haven't exceeded max retries
   */
  async retryFailedReminders(): Promise<void> {
    try {
      const config = await this.getReminderConfig();
      if (!config) return;

      const failedReminders = await this.prisma.appointmentReminder.findMany({
        where: {
          deliveryStatus: 'FAILED',
          retryCount: {
            lt: config.maxRetries,
          },
        },
        include: {
          appointment: {
            include: {
              client: true,
              clinician: true,
            },
          },
        },
      });

      for (const reminder of failedReminders) {
        // Check if enough time has passed since last attempt
        if (reminder.sentAt) {
          const minutesSinceLastAttempt =
            (new Date().getTime() - reminder.sentAt.getTime()) / (1000 * 60);

          if (minutesSinceLastAttempt < config.retryDelayMinutes) {
            continue; // Not enough time has passed
          }
        }

        await this.sendReminder(reminder as any, config);
      }

      logger.info('Failed reminder retry complete', {
        retriedCount: failedReminders.length,
      });
    } catch (error) {
      logger.error('Error retrying failed reminders', { error });
    }
  }

  /**
   * Send a single reminder
   */
  private async sendReminder(reminder: any, config: ReminderConfig): Promise<void> {
    const { appointment } = reminder;

    try {
      let success = false;

      switch (reminder.reminderType) {
        case 'SMS':
          if (config.smsEnabled && appointment.client.primaryPhone) {
            success = await this.sendSmsReminder(reminder, appointment, config);
          } else {
            logger.warn('SMS reminder skipped - SMS not enabled or no phone', {
              reminderId: reminder.id,
            });
            await this.updateReminderStatus(reminder.id, 'SKIPPED');
            return;
          }
          break;

        case 'EMAIL':
          if (config.emailEnabled && appointment.client.email) {
            success = await this.sendEmailReminder(reminder, appointment, config);
          } else {
            logger.warn('Email reminder skipped - email not enabled or no email', {
              reminderId: reminder.id,
            });
            await this.updateReminderStatus(reminder.id, 'SKIPPED');
            return;
          }
          break;

        case 'VOICE':
          if (config.voiceEnabled && appointment.client.primaryPhone) {
            success = await this.sendVoiceReminder(reminder, appointment, config);
          } else {
            logger.warn('Voice reminder skipped - voice not enabled or no phone', {
              reminderId: reminder.id,
            });
            await this.updateReminderStatus(reminder.id, 'SKIPPED');
            return;
          }
          break;

        case 'PORTAL':
          success = await this.sendPortalNotification(reminder, appointment);
          break;

        default:
          logger.warn('Unknown reminder type', {
            reminderId: reminder.id,
            type: reminder.reminderType,
          });
          return;
      }

      if (success) {
        await this.updateReminderStatus(reminder.id, 'SENT', new Date());
      } else {
        await this.handleReminderFailure(reminder);
      }
    } catch (error) {
      await this.handleReminderFailure(reminder, error);
    }
  }

  /**
   * Send SMS reminder via Twilio
   */
  private async sendSmsReminder(
    reminder: any,
    appointment: any,
    config: ReminderConfig
  ): Promise<boolean> {
    try {
      const message = this.formatSmsMessage(appointment, config);

      const result = await this.twilioService.sendSms({
        to: appointment.client.primaryPhone,
        from: config.twilioPhoneNumber!,
        body: message,
      });

      await this.prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          messageId: result.sid,
          deliveryStatus: result.status === 'sent' ? 'DELIVERED' : 'SENT',
          cost: parseFloat(result.price || '0'),
          sentAt: new Date(),
        },
      });

      auditLogger.info('SMS reminder sent', {
        reminderId: reminder.id,
        appointmentId: appointment.id,
        clientId: appointment.client.id,
        phone: appointment.client.primaryPhone,
        messageSid: result.sid,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send SMS reminder', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderId: reminder.id,
      });
      return false;
    }
  }

  /**
   * Send email reminder with .ics attachment
   */
  private async sendEmailReminder(
    reminder: any,
    appointment: any,
    config: ReminderConfig
  ): Promise<boolean> {
    try {
      const icsContent = config.includeIcsAttachment
        ? await this.icsService.generateIcsFile(appointment)
        : null;

      const emailHtml = this.formatEmailMessage(appointment, config);
      const subject = this.formatEmailSubject(appointment, config);

      await this.emailService.sendEmail({
        to: appointment.client.email,
        from: `${config.sesFromName} <${config.sesFromEmail}>`,
        subject,
        html: emailHtml,
        attachments: icsContent
          ? [
              {
                filename: 'appointment.ics',
                content: icsContent,
                contentType: 'text/calendar',
              },
            ]
          : [],
      });

      await this.updateReminderStatus(reminder.id, 'DELIVERED', new Date());

      auditLogger.info('Email reminder sent', {
        reminderId: reminder.id,
        appointmentId: appointment.id,
        clientId: appointment.client.id,
        email: appointment.client.email,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email reminder', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderId: reminder.id,
      });
      return false;
    }
  }

  /**
   * Send voice reminder via Twilio
   */
  private async sendVoiceReminder(
    reminder: any,
    appointment: any,
    config: ReminderConfig
  ): Promise<boolean> {
    try {
      if (!config.voiceScriptUrl || !config.voiceFromNumber) {
        throw new Error('Voice configuration incomplete');
      }

      const result = await this.twilioService.makeVoiceCall({
        to: appointment.client.primaryPhone,
        from: config.voiceFromNumber,
        url: config.voiceScriptUrl,
      });

      await this.prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          messageId: result.sid,
          deliveryStatus: 'SENT',
          cost: parseFloat(result.price || '0'),
          sentAt: new Date(),
        },
      });

      auditLogger.info('Voice reminder sent', {
        reminderId: reminder.id,
        appointmentId: appointment.id,
        clientId: appointment.client.id,
        phone: appointment.client.primaryPhone,
        callSid: result.sid,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send voice reminder', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderId: reminder.id,
      });
      return false;
    }
  }

  /**
   * Send portal notification
   */
  private async sendPortalNotification(
    reminder: any,
    appointment: any
  ): Promise<boolean> {
    try {
      // Create a portal notification/message for the client
      await this.prisma.portalMessage.create({
        data: {
          clientId: appointment.client.id,
          subject: 'Appointment Reminder',
          message: `You have an upcoming appointment on ${this.formatDate(
            appointment.appointmentDate
          )} at ${appointment.startTime} with ${
            appointment.clinician.firstName
          } ${appointment.clinician.lastName}.`,
          sentByClient: false,
          sentBy: 'SYSTEM',
          isRead: false,
        },
      });

      await this.updateReminderStatus(reminder.id, 'DELIVERED', new Date());

      auditLogger.info('Portal notification sent', {
        reminderId: reminder.id,
        appointmentId: appointment.id,
        clientId: appointment.client.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send portal notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderId: reminder.id,
      });
      return false;
    }
  }

  /**
   * Handle SMS response (Y/N confirmation)
   */
  async handleSmsResponse(
    from: string,
    body: string,
    messageId: string
  ): Promise<void> {
    try {
      // Find the most recent reminder sent to this phone number
      const reminder = await this.prisma.appointmentReminder.findFirst({
        where: {
          appointment: {
            client: {
              primaryPhone: from,
            },
          },
          reminderType: 'SMS',
          sentAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
          },
        },
        include: {
          appointment: true,
        },
        orderBy: {
          sentAt: 'desc',
        },
      });

      if (!reminder) {
        logger.warn('No recent reminder found for SMS response', { from, body });
        return;
      }

      const response = body.trim().toUpperCase();

      if (response === 'Y' || response === 'YES' || response === 'CONFIRM') {
        await this.confirmAppointment(reminder.appointment, 'CLIENT_SMS');
      } else if (response === 'C' || response === 'CANCEL' || response === 'N' || response === 'NO') {
        await this.markAppointmentForCancellation(reminder.appointment);
      }

      // Update reminder with response
      await this.prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          responseReceived: true,
          responseType: response.startsWith('Y') || response === 'CONFIRM' ? 'CONFIRMED' : 'CANCELLED',
          responseText: body,
        },
      });

      auditLogger.info('SMS response processed', {
        reminderId: reminder.id,
        appointmentId: reminder.appointmentId,
        response: response,
      });
    } catch (error) {
      logger.error('Error handling SMS response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        from,
        body,
      });
    }
  }

  /**
   * Confirm appointment
   */
  private async confirmAppointment(
    appointment: any,
    confirmationMethod: string
  ): Promise<void> {
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        confirmedAt: new Date(),
        confirmationMethod,
        status: 'CONFIRMED',
      },
    });

    logger.info('Appointment confirmed', {
      appointmentId: appointment.id,
      method: confirmationMethod,
    });
  }

  /**
   * Mark appointment for cancellation (requires staff review)
   */
  private async markAppointmentForCancellation(appointment: any): Promise<void> {
    // Don't automatically cancel - update the appointment with cancellation notes
    // TODO: AppointmentNote model doesn't exist - using appointment update instead
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        cancellationNotes: 'Client responded to reminder indicating they want to cancel. Please contact client.',
      },
    });

    logger.info('Appointment marked for cancellation review', {
      appointmentId: appointment.id,
    });
  }

  /**
   * Calculate when reminders should be sent
   */
  private calculateReminderSchedule(
    appointmentDate: Date,
    config: ReminderConfig
  ): Array<{ type: string; sendAt: Date }> {
    const schedule: Array<{ type: string; sendAt: Date }> = [];
    const apptTime = appointmentDate.getTime();

    if (config.enableOneWeekReminder) {
      const sendAt = new Date(apptTime - config.oneWeekOffset * 60 * 60 * 1000);
      if (sendAt > new Date()) {
        schedule.push({ type: 'SMS', sendAt });
      }
    }

    if (config.enableTwoDayReminder) {
      const sendAt = new Date(apptTime - config.twoDayOffset * 60 * 60 * 1000);
      if (sendAt > new Date()) {
        schedule.push({ type: 'EMAIL', sendAt });
      }
    }

    if (config.enableOneDayReminder) {
      const sendAt = new Date(apptTime - config.oneDayOffset * 60 * 60 * 1000);
      if (sendAt > new Date()) {
        schedule.push({ type: 'SMS', sendAt });
      }
    }

    if (config.enableDayOfReminder) {
      const sendAt = new Date(apptTime - config.dayOfOffset * 60 * 60 * 1000);
      if (sendAt > new Date()) {
        schedule.push({ type: 'SMS', sendAt });
      }
    }

    return schedule;
  }

  /**
   * Format SMS message with template variables
   */
  private formatSmsMessage(appointment: any, config: ReminderConfig): string {
    const template =
      config.smsTemplateReminder ||
      'Hi {{clientName}}, reminder: You have an appointment with {{clinicianName}} on {{date}} at {{time}}. Reply Y to confirm or C to cancel.';

    const appointmentDateTime = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    return template
      .replace('{{clientName}}', appointment.client.firstName)
      .replace('{{clinicianName}}', `${appointment.clinician.firstName} ${appointment.clinician.lastName}`)
      .replace('{{date}}', this.formatDate(appointmentDateTime))
      .replace('{{time}}', appointment.startTime)
      .replace('{{appointmentType}}', appointment.appointmentType || 'appointment')
      .replace('{{location}}', appointment.serviceLocation || 'office');
  }

  /**
   * Format email subject
   */
  private formatEmailSubject(appointment: any, config: ReminderConfig): string {
    const template =
      config.emailTemplateSubject ||
      'Appointment Reminder - {{date}} at {{time}}';

    const appointmentDateTime = new Date(appointment.appointmentDate);

    return template
      .replace('{{date}}', this.formatDate(appointmentDateTime))
      .replace('{{time}}', appointment.startTime)
      .replace('{{clinicianName}}', `${appointment.clinician.firstName} ${appointment.clinician.lastName}`);
  }

  /**
   * Format email message with template variables
   */
  private formatEmailMessage(appointment: any, config: ReminderConfig): string {
    const appointmentDateTime = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const template = config.emailTemplateBody || `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c5282;">Appointment Reminder</h2>
            <p>Dear {{clientName}},</p>
            <p>This is a reminder of your upcoming appointment:</p>
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> {{date}}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> {{time}}</p>
              <p style="margin: 5px 0;"><strong>Provider:</strong> {{clinicianName}}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> {{appointmentType}}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> {{location}}</p>
            </div>
            <p>If you need to reschedule or cancel this appointment, please contact our office as soon as possible.</p>
            <p>We look forward to seeing you!</p>
            <p style="margin-top: 30px; color: #718096; font-size: 0.9em;">
              This is an automated reminder. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    return template
      .replace('{{clientName}}', `${appointment.client.firstName} ${appointment.client.lastName}`)
      .replace('{{date}}', this.formatDate(appointmentDateTime))
      .replace('{{time}}', appointment.startTime)
      .replace('{{clinicianName}}', `${appointment.clinician.title || ''} ${appointment.clinician.firstName} ${appointment.clinician.lastName}`.trim())
      .replace('{{appointmentType}}', appointment.appointmentType || 'Therapy Session')
      .replace('{{location}}', appointment.serviceLocation || 'Office');
  }

  /**
   * Update reminder status
   */
  private async updateReminderStatus(
    reminderId: string,
    status: string,
    sentAt?: Date
  ): Promise<void> {
    await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        deliveryStatus: status,
        sentAt: sentAt || undefined,
      },
    });
  }

  /**
   * Handle reminder failure
   */
  private async handleReminderFailure(reminder: any, error?: any): Promise<void> {
    const retryCount = (reminder.retryCount || 0) + 1;

    await this.prisma.appointmentReminder.update({
      where: { id: reminder.id },
      data: {
        deliveryStatus: 'FAILED',
        retryCount,
        failureReason: error instanceof Error ? error.message : undefined,
      },
    });

    logger.error('Reminder delivery failed', {
      reminderId: reminder.id,
      retryCount,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  /**
   * Check if current time is within operating hours
   */
  private isWithinOperatingHours(date: Date, config: ReminderConfig): boolean {
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Check weekend restriction
    if (!config.sendOnWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    // Check hour restrictions
    return hour >= config.sendStartHour && hour < config.sendEndHour;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time for display
   */
  private formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Get reminders for an appointment
   */
  async getAppointmentReminders(appointmentId: string): Promise<any[]> {
    return await this.prisma.appointmentReminder.findMany({
      where: { appointmentId },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  /**
   * Resend a specific reminder
   */
  async resendReminder(reminderId: string): Promise<void> {
    const reminder = await this.prisma.appointmentReminder.findUnique({
      where: { id: reminderId },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
    });

    if (!reminder) {
      throw new Error('Reminder not found');
    }

    const config = await this.getReminderConfig();
    if (!config) {
      throw new Error('Reminder configuration not found');
    }

    // Reset the reminder status
    await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        deliveryStatus: 'PENDING',
        retryCount: 0,
        failureReason: null,
      },
    });

    // Send the reminder
    await this.sendReminder(reminder, config);
  }
}
