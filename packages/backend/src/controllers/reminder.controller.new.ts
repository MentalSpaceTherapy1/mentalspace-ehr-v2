import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@mentalspace/database';
import logger, { auditLogger } from '../utils/logger';
import { ReminderService } from '../services/reminder.service.new';
import { TwilioReminderService } from '../services/twilio.reminder.service';
import { EmailReminderService } from '../services/email.reminder.service';
import { IcsGeneratorService } from '../services/icsGenerator.service';
import {
  triggerReminderProcessing,
  triggerFailedReminderRetry,
  getReminderJobStatus,
} from '../jobs/processReminders.job';

const prisma = new PrismaClient();

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
    const config = await prisma.reminderConfiguration.findFirst({
      include: {
        practiceSettings: {
          select: {
            id: true,
            practiceName: true,
          },
        },
      },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Reminder configuration not found',
      });
    }

    // Mask sensitive credentials
    const safeConfig = {
      ...config,
      twilioAccountSid: config.twilioAccountSid
        ? `${config.twilioAccountSid.substring(0, 8)}...`
        : null,
      twilioAuthToken: config.twilioAuthToken ? '***HIDDEN***' : null,
    };

    res.status(200).json({
      success: true,
      data: safeConfig,
    });
  } catch (error) {
    logger.error('Error getting reminder config', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update reminder configuration
 */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const validatedData = configSchema.parse(req.body);

    // Check if configuration exists
    const existingConfig = await prisma.reminderConfiguration.findFirst();

    let config;
    if (existingConfig) {
      config = await prisma.reminderConfiguration.update({
        where: { id: existingConfig.id },
        data: validatedData,
      });
    } else {
      config = await prisma.reminderConfiguration.create({
        data: validatedData,
      });
    }

    // Reinitialize services with new configuration
    await twilioService.reinitialize();
    await emailService.reinitialize();

    auditLogger.info('Reminder configuration updated', {
      configId: config.id,
      userId: (req as any).user?.id,
      action: 'REMINDER_CONFIG_UPDATED',
    });

    res.status(200).json({
      success: true,
      message: 'Reminder configuration updated successfully',
      data: config,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    logger.error('Error updating reminder config', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success,
      message: success
        ? 'Test SMS sent successfully'
        : 'Failed to send test SMS. Check configuration.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    logger.error('Error testing SMS', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to test SMS',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success,
      message: success
        ? 'Test email sent successfully'
        : 'Failed to send test email. Check configuration.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    logger.error('Error testing email', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to test email',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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

    res.status(200).json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    logger.error('Error getting appointment reminders', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      message: 'Reminder resent successfully',
    });
  } catch (error) {
    logger.error('Error resending reminder', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to resend reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      message: 'Reminders scheduled successfully',
    });
  } catch (error) {
    logger.error('Error scheduling reminders', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to schedule reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Manually trigger reminder processing (admin only)
 */
export const processReminders = async (req: Request, res: Response) => {
  try {
    const results = await triggerReminderProcessing();

    auditLogger.info('Reminder processing triggered manually', {
      userId: (req as any).user?.id,
      results,
    });

    res.status(200).json({
      success: true,
      message: 'Reminder processing completed',
      data: results,
    });
  } catch (error) {
    logger.error('Error processing reminders', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process reminders',
    });
  }
};

/**
 * Manually trigger failed reminder retry (admin only)
 */
export const retryFailedReminders = async (req: Request, res: Response) => {
  try {
    await triggerFailedReminderRetry();

    auditLogger.info('Failed reminder retry triggered manually', {
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      message: 'Failed reminder retry completed',
    });
  } catch (error) {
    logger.error('Error retrying failed reminders', { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retry reminders',
    });
  }
};

/**
 * Get reminder job status
 */
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const status = getReminderJobStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting job status', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
    });
  }
};

/**
 * Get reminder statistics
 */
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await prisma.appointmentReminder.groupBy({
      by: ['deliveryStatus', 'reminderType'],
      _count: {
        id: true,
      },
      _sum: {
        cost: true,
      },
      where: {
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting reminder statistics', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
};
