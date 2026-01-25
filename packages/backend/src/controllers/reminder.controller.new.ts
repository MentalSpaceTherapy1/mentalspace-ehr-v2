import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 3.2: Removed direct PrismaClient import - using service methods instead
import prisma from '../services/database';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import logger, { auditLogger } from '../utils/logger';
import { ReminderService } from '../services/reminder.service.new';
import { TwilioReminderService } from '../services/twilio.reminder.service';
import { EmailReminderService } from '../services/email.reminder.service';
import { IcsGeneratorService } from '../services/icsGenerator.service';
import * as reminderConfigService from '../services/reminder-config.service';
import {
  triggerReminderProcessing,
  triggerFailedReminderRetry,
  getReminderJobStatus,
} from '../jobs/processReminders.job';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendPaginated, sendValidationError } from '../utils/apiResponse';

// Initialize services
const twilioService = new TwilioReminderService(prisma);
const emailService = new EmailReminderService(prisma);
const icsService = new IcsGeneratorService();
const reminderService = new ReminderService(
  prisma,
  twilioService,
  emailService,
  icsService
);

// Validation schemas
const configSchema = z.object({
  practiceSettingsId: z.string().uuid(),

  // SMS Configuration
  smsEnabled: z.boolean(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  smsTemplateReminder: z.string().optional(),
  smsTemplateConfirmation: z.string().optional(),

  // Email Configuration
  emailEnabled: z.boolean(),
  sesRegion: z.string().optional(),
  sesFromEmail: z.string().email().optional(),
  sesFromName: z.string().optional(),
  emailTemplateSubject: z.string().optional(),
  emailTemplateBody: z.string().optional(),
  includeIcsAttachment: z.boolean().optional(),

  // Voice Configuration
  voiceEnabled: z.boolean().optional(),
  voiceScriptUrl: z.string().url().optional(),
  voiceFromNumber: z.string().optional(),

  // Reminder Schedule
  enableOneWeekReminder: z.boolean().optional(),
  oneWeekOffset: z.number().int().positive().optional(),
  enableTwoDayReminder: z.boolean().optional(),
  twoDayOffset: z.number().int().positive().optional(),
  enableOneDayReminder: z.boolean().optional(),
  oneDayOffset: z.number().int().positive().optional(),
  enableDayOfReminder: z.boolean().optional(),
  dayOfOffset: z.number().int().positive().optional(),

  // Retry logic
  maxRetries: z.number().int().min(0).max(5).optional(),
  retryDelayMinutes: z.number().int().positive().optional(),

  // Operating hours
  sendStartHour: z.number().int().min(0).max(23).optional(),
  sendEndHour: z.number().int().min(0).max(23).optional(),
  sendOnWeekends: z.boolean().optional(),
});

const testSmsSchema = z.object({
  phoneNumber: z.string().min(10),
  fromNumber: z.string().min(10),
});

const testEmailSchema = z.object({
  email: z.string().email(),
  fromEmail: z.string().email(),
});

/**
 * Get reminder configuration
 */
export const getConfig = async (req: Request, res: Response) => {
  try {
    // Phase 3.2: Use service method instead of direct prisma call
    const config = await reminderConfigService.getReminderConfiguration();

    if (!config) {
      return sendNotFound(res, 'Reminder configuration');
    }

    // Mask sensitive credentials
    const safeConfig = {
      ...config,
      twilioAccountSid: config.twilioAccountSid
        ? `${config.twilioAccountSid.substring(0, 8)}...`
        : null,
      twilioAuthToken: config.twilioAuthToken ? '***HIDDEN***' : null,
    };

    return sendSuccess(res, safeConfig);
  } catch (error) {
    logger.error('Error getting reminder config', { error });
    return sendServerError(res, 'Failed to get reminder configuration');
  }
};

/**
 * Update reminder configuration
 */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const validatedData = configSchema.parse(req.body);

    // Phase 3.2: Use service method instead of direct prisma call
    const config = await reminderConfigService.upsertReminderConfiguration(validatedData);

    // Reinitialize services with new configuration
    await twilioService.reinitialize();
    await emailService.reinitialize();

    auditLogger.info('Reminder configuration updated', {
      configId: config.id,
      userId: req.user?.userId,
      action: 'REMINDER_CONFIG_UPDATED',
    });

    return sendSuccess(res, config, 'Reminder configuration updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    logger.error('Error updating reminder config', { error });
    return sendServerError(res, 'Failed to update reminder configuration');
  }
};

/**
 * Test SMS configuration
 */
export const testSms = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, fromNumber } = testSmsSchema.parse(req.body);

    const success = await twilioService.testSms(phoneNumber, fromNumber);

    auditLogger.info('SMS test requested', {
      phoneNumber,
      success,
      userId: req.user?.userId,
    });

    return sendSuccess(res, { success }, success
      ? 'Test SMS sent successfully'
      : 'Failed to send test SMS. Check configuration.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    logger.error('Error testing SMS', { error });
    return sendServerError(res, 'Failed to test SMS');
  }
};

/**
 * Test email configuration
 */
export const testEmail = async (req: Request, res: Response) => {
  try {
    const { email, fromEmail } = testEmailSchema.parse(req.body);

    const success = await emailService.testEmail(email, fromEmail);

    auditLogger.info('Email test requested', {
      email,
      success,
      userId: req.user?.userId,
    });

    return sendSuccess(res, { success }, success
      ? 'Test email sent successfully'
      : 'Failed to send test email. Check configuration.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    logger.error('Error testing email', { error });
    return sendServerError(res, 'Failed to test email');
  }
};

/**
 * Twilio SMS webhook handler (for incoming SMS responses)
 */
export const twilioSmsWebhook = async (req: Request, res: Response) => {
  try {
    const { From, Body, MessageSid } = req.body;

    logger.info('Twilio SMS webhook received', {
      from: From,
      messageSid: MessageSid,
    });

    // Validate this is from Twilio (in production, use Twilio signature validation)
    // TODO: Add Twilio signature validation

    // Process the SMS response
    await reminderService.handleSmsResponse(From, Body, MessageSid);

    // Return TwiML response
    const twimlResponse = twilioService.handleIncomingSms(From, Body, MessageSid);

    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    logger.error('Error processing Twilio SMS webhook', { error });

    // Return error TwiML
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>We're sorry, but we couldn't process your response. Please contact our office.</Message>
</Response>`);
  }
};

/**
 * Twilio status webhook handler (for delivery status updates)
 */
export const twilioStatusWebhook = async (req: Request, res: Response) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    logger.info('Twilio status webhook received', {
      messageSid: MessageSid,
      status: MessageStatus,
    });

    // Process the status update
    await twilioService.handleStatusCallback(
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage
    );

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing Twilio status webhook', { error });
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
};

/**
 * Get reminders for a specific appointment
 */
export const getAppointmentReminders = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const reminders = await reminderService.getAppointmentReminders(appointmentId);

    return sendSuccess(res, reminders);
  } catch (error) {
    logger.error('Error getting appointment reminders', { error });
    return sendServerError(res, 'Failed to get reminders');
  }
};

/**
 * Resend a specific reminder
 */
export const resendReminder = async (req: Request, res: Response) => {
  try {
    const { reminderId } = req.params;

    await reminderService.resendReminder(reminderId);

    auditLogger.info('Reminder resent manually', {
      reminderId,
      userId: req.user?.userId,
    });

    return sendSuccess(res, null, 'Reminder resent successfully');
  } catch (error) {
    logger.error('Error resending reminder', { error });
    return sendServerError(res, 'Failed to resend reminder');
  }
};

/**
 * Schedule reminders for an appointment (manual trigger)
 */
export const scheduleReminders = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    await reminderService.scheduleRemindersForAppointment(appointmentId);

    auditLogger.info('Reminders scheduled manually', {
      appointmentId,
      userId: req.user?.userId,
    });

    return sendSuccess(res, null, 'Reminders scheduled successfully');
  } catch (error) {
    logger.error('Error scheduling reminders', { error });
    return sendServerError(res, 'Failed to schedule reminders');
  }
};

/**
 * Manually trigger reminder processing (admin only)
 */
export const processReminders = async (req: Request, res: Response) => {
  try {
    const results = await triggerReminderProcessing();

    auditLogger.info('Reminder processing triggered manually', {
      userId: req.user?.userId,
      results,
    });

    return sendSuccess(res, results, 'Reminder processing completed');
  } catch (error) {
    logger.error('Error processing reminders', { error });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to process reminders');
  }
};

/**
 * Manually trigger failed reminder retry (admin only)
 */
export const retryFailedReminders = async (req: Request, res: Response) => {
  try {
    await triggerFailedReminderRetry();

    auditLogger.info('Failed reminder retry triggered manually', {
      userId: req.user?.userId,
    });

    return sendSuccess(res, null, 'Failed reminder retry completed');
  } catch (error) {
    logger.error('Error retrying failed reminders', { error });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to retry reminders');
  }
};

/**
 * Get reminder job status
 */
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const status = getReminderJobStatus();

    return sendSuccess(res, status);
  } catch (error) {
    logger.error('Error getting job status', { error });
    return sendServerError(res, 'Failed to get job status');
  }
};

/**
 * Get reminder statistics
 */
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const stats = await reminderConfigService.getReminderStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error getting reminder statistics', { error });
    return sendServerError(res, 'Failed to get statistics');
  }
};
