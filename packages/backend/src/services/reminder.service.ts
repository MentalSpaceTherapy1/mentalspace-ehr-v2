import { PrismaClient } from '@prisma/client';
import { auditLogger } from '../utils/logger';
// import sgMail from '@sendgrid/mail'; // Uncomment when SendGrid is configured
// import twilio from 'twilio'; // Uncomment when Twilio is configured

const prisma = new PrismaClient();

// TODO: Configure SendGrid
// sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// TODO: Configure Twilio
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID || '',
//   process.env.TWILIO_AUTH_TOKEN || ''
// );

interface ReminderSettingsData {
  clinicianId: string;
  enabled?: boolean;
  emailRemindersEnabled?: boolean;
  emailReminderTimings?: number[];
  emailTemplate?: string;
  smsRemindersEnabled?: boolean;
  smsReminderTimings?: number[];
  smsTemplate?: string;
  requireConfirmation?: boolean;
  includeRescheduleLink?: boolean;
  includeCancelLink?: boolean;
  includeTelehealthLink?: boolean;
}

/**
 * Create or update reminder settings for a clinician
 */
export async function upsertReminderSettings(data: ReminderSettingsData) {
  try {
    const settings = await prisma.reminderSettings.upsert({
      where: { clinicianId: data.clinicianId },
      create: {
        clinicianId: data.clinicianId,
        enabled: data.enabled ?? true,
        emailRemindersEnabled: data.emailRemindersEnabled ?? true,
        emailReminderTimings: data.emailReminderTimings || [24, 2], // 24 hours, 2 hours
        emailTemplate: data.emailTemplate,
        smsRemindersEnabled: data.smsRemindersEnabled ?? false,
        smsReminderTimings: data.smsReminderTimings || [24, 2],
        smsTemplate: data.smsTemplate,
        requireConfirmation: data.requireConfirmation ?? false,
        includeRescheduleLink: data.includeRescheduleLink ?? true,
        includeCancelLink: data.includeCancelLink ?? true,
        includeTelehealthLink: data.includeTelehealthLink ?? true,
      },
      update: {
        enabled: data.enabled,
        emailRemindersEnabled: data.emailRemindersEnabled,
        emailReminderTimings: data.emailReminderTimings,
        emailTemplate: data.emailTemplate,
        smsRemindersEnabled: data.smsRemindersEnabled,
        smsReminderTimings: data.smsReminderTimings,
        smsTemplate: data.smsTemplate,
        requireConfirmation: data.requireConfirmation,
        includeRescheduleLink: data.includeRescheduleLink,
        includeCancelLink: data.includeCancelLink,
        includeTelehealthLink: data.includeTelehealthLink,
      },
    });

    auditLogger.info('Reminder settings updated', {
      clinicianId: data.clinicianId,
      settingsId: settings.id,
      action: 'REMINDER_SETTINGS_UPDATED',
    });

    return settings;
  } catch (error) {
    auditLogger.error('Failed to update reminder settings', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clinicianId: data.clinicianId,
    });
    throw error;
  }
}

/**
 * Get reminder settings for clinician
 */
export async function getReminderSettings(clinicianId: string) {
  const settings = await prisma.reminderSettings.findUnique({
    where: { clinicianId },
  });

  // Return default settings if none exist
  if (!settings) {
    return {
      clinicianId,
      enabled: true,
      emailRemindersEnabled: true,
      emailReminderTimings: [24, 2],
      smsRemindersEnabled: false,
      smsReminderTimings: [24, 2],
      requireConfirmation: false,
      includeRescheduleLink: true,
      includeCancelLink: true,
      includeTelehealthLink: true,
    };
  }

  return settings;
}

/**
 * Get appointments that need reminders sent
 */
export async function getAppointmentsNeedingReminders() {
  const now = new Date();
  const maxHoursAhead = 72; // Look 72 hours ahead
  const futureDate = new Date(now.getTime() + maxHoursAhead * 60 * 60 * 1000);

  // Get all scheduled appointments in the next 72 hours
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: {
        gte: now,
        lte: futureDate,
      },
      status: 'Scheduled',
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryPhone: true,
          timezone: true,
        },
      },
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
    },
  });

  const appointmentsNeedingReminders: any[] = [];

  for (const appointment of appointments) {
    // Get clinician's reminder settings
    const settings = await getReminderSettings(appointment.clinicianId);

    if (!settings.enabled) continue;

    const appointmentDateTime = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check if email reminder should be sent
    if (settings.emailRemindersEnabled && appointment.client.email) {
      for (const timing of settings.emailReminderTimings) {
        // Check if we're within a 15-minute window of the reminder time
        if (
          Math.abs(hoursUntilAppointment - timing) <= 0.25 &&
          !hasReminderBeenSent(appointment.id, 'email', timing)
        ) {
          appointmentsNeedingReminders.push({
            appointment,
            reminderType: 'email',
            timing,
            settings,
          });
        }
      }
    }

    // Check if SMS reminder should be sent
    if (settings.smsRemindersEnabled && appointment.client.primaryPhone) {
      for (const timing of settings.smsReminderTimings) {
        if (
          Math.abs(hoursUntilAppointment - timing) <= 0.25 &&
          !hasReminderBeenSent(appointment.id, 'sms', timing)
        ) {
          appointmentsNeedingReminders.push({
            appointment,
            reminderType: 'sms',
            timing,
            settings,
          });
        }
      }
    }
  }

  return appointmentsNeedingReminders;
}

/**
 * Check if reminder has already been sent (using appointment notes or separate tracking table)
 * This is a placeholder - you should implement proper tracking
 */
function hasReminderBeenSent(
  appointmentId: string,
  type: string,
  timing: number
): boolean {
  // TODO: Implement proper reminder tracking
  // For now, return false to allow reminders
  return false;
}

/**
 * Send email reminder
 */
export async function sendEmailReminder(
  appointment: any,
  settings: any
): Promise<boolean> {
  try {
    const client = appointment.client;
    const clinician = appointment.clinician;
    const appointmentDate = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Build email content
    const subject = `Appointment Reminder - ${appointmentDate.toLocaleDateString()} at ${appointment.startTime}`;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const rescheduleLink = `${baseUrl}/appointments/${appointment.id}/reschedule`;
    const cancelLink = `${baseUrl}/appointments/${appointment.id}/cancel`;
    const telehealthLink = `${baseUrl}/telehealth/${appointment.id}`;

    let emailBody = settings.emailTemplate || `
      <h2>Appointment Reminder</h2>
      <p>Dear ${client.firstName} ${client.lastName},</p>
      <p>This is a reminder of your upcoming appointment:</p>
      <ul>
        <li><strong>Date:</strong> ${appointmentDate.toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${appointment.startTime}</li>
        <li><strong>Type:</strong> ${appointment.appointmentType}</li>
        <li><strong>Location:</strong> ${appointment.serviceLocation}</li>
        <li><strong>With:</strong> ${clinician.title} ${clinician.firstName} ${clinician.lastName}</li>
      </ul>
    `;

    if (appointment.serviceLocation === 'Telehealth' && settings.includeTelehealthLink) {
      emailBody += `<p><a href="${telehealthLink}">Join Telehealth Session</a></p>`;
    }

    if (settings.includeRescheduleLink) {
      emailBody += `<p><a href="${rescheduleLink}">Reschedule Appointment</a></p>`;
    }

    if (settings.includeCancelLink) {
      emailBody += `<p><a href="${cancelLink}">Cancel Appointment</a></p>`;
    }

    emailBody += `<p>If you have any questions, please contact our office.</p>`;

    // TODO: Uncomment when SendGrid is configured
    // const msg = {
    //   to: client.email,
    //   from: process.env.SENDGRID_FROM_EMAIL || 'noreply@mentalspace.com',
    //   subject,
    //   html: emailBody,
    // };
    // await sgMail.send(msg);

    // Log the reminder (for now, just log to console)
    console.log(`[EMAIL REMINDER] Sent to ${client.email} for appointment ${appointment.id}`);

    auditLogger.info('Email reminder sent', {
      appointmentId: appointment.id,
      clientId: client.id,
      email: client.email,
      action: 'EMAIL_REMINDER_SENT',
    });

    return true;
  } catch (error) {
    auditLogger.error('Failed to send email reminder', {
      error: error instanceof Error ? error.message : 'Unknown error',
      appointmentId: appointment.id,
    });
    return false;
  }
}

/**
 * Send SMS reminder
 */
export async function sendSMSReminder(
  appointment: any,
  settings: any
): Promise<boolean> {
  try {
    const client = appointment.client;
    const clinician = appointment.clinician;
    const appointmentDate = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    let smsBody =
      settings.smsTemplate ||
      `Appointment Reminder: ${appointmentDate.toLocaleDateString()} at ${
        appointment.startTime
      } with ${clinician.title} ${clinician.lastName}. Location: ${
        appointment.serviceLocation
      }`;

    if (settings.requireConfirmation) {
      smsBody += ' Reply C to confirm, R to reschedule.';
    }

    // TODO: Uncomment when Twilio is configured
    // await twilioClient.messages.create({
    //   body: smsBody,
    //   from: process.env.TWILIO_PHONE_NUMBER || '',
    //   to: client.primaryPhone,
    // });

    // Log the reminder (for now, just log to console)
    console.log(`[SMS REMINDER] Sent to ${client.primaryPhone} for appointment ${appointment.id}`);

    auditLogger.info('SMS reminder sent', {
      appointmentId: appointment.id,
      clientId: client.id,
      phone: client.primaryPhone,
      action: 'SMS_REMINDER_SENT',
    });

    return true;
  } catch (error) {
    auditLogger.error('Failed to send SMS reminder', {
      error: error instanceof Error ? error.message : 'Unknown error',
      appointmentId: appointment.id,
    });
    return false;
  }
}

/**
 * Process all pending reminders
 * This should be called by a cron job every 15 minutes
 */
export async function processReminders() {
  try {
    const appointmentsNeedingReminders = await getAppointmentsNeedingReminders();

    const results = {
      total: appointmentsNeedingReminders.length,
      emailSent: 0,
      smsSent: 0,
      failed: 0,
    };

    for (const { appointment, reminderType, timing, settings } of appointmentsNeedingReminders) {
      let success = false;

      if (reminderType === 'email') {
        success = await sendEmailReminder(appointment, settings);
        if (success) results.emailSent++;
      } else if (reminderType === 'sms') {
        success = await sendSMSReminder(appointment, settings);
        if (success) results.smsSent++;
      }

      if (!success) {
        results.failed++;
      }
    }

    auditLogger.info('Reminder processing completed', {
      results,
      action: 'REMINDERS_PROCESSED',
    });

    return results;
  } catch (error) {
    auditLogger.error('Failed to process reminders', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Send immediate reminder for a specific appointment
 */
export async function sendImmediateReminder(
  appointmentId: string,
  reminderType: 'email' | 'sms'
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryPhone: true,
          timezone: true,
        },
      },
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const settings = await getReminderSettings(appointment.clinicianId);

  if (reminderType === 'email') {
    return await sendEmailReminder(appointment, settings);
  } else {
    return await sendSMSReminder(appointment, settings);
  }
}
