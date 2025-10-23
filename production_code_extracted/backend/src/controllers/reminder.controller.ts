import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import * as reminderService from '../services/reminder.service';

const reminderSettingsSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  enabled: z.boolean().optional(),
  emailRemindersEnabled: z.boolean().optional(),
  emailReminderTimings: z.array(z.number().int().positive()).optional(),
  emailTemplate: z.string().optional(),
  smsRemindersEnabled: z.boolean().optional(),
  smsReminderTimings: z.array(z.number().int().positive()).optional(),
  smsTemplate: z.string().optional(),
  requireConfirmation: z.boolean().optional(),
  includeRescheduleLink: z.boolean().optional(),
  includeCancelLink: z.boolean().optional(),
  includeTelehealthLink: z.boolean().optional(),
});

export const upsertReminderSettings = async (req: Request, res: Response) => {
  try {
    const validatedData = reminderSettingsSchema.parse(req.body);
    const settings = await reminderService.upsertReminderSettings(validatedData as any);

    res.status(200).json({
      success: true,
      message: 'Reminder settings saved successfully',
      data: settings,
    });
  } catch (error) {
    logger.error('Upsert reminder settings error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save reminder settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getReminderSettings = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const settings = await reminderService.getReminderSettings(clinicianId);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Get reminder settings error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reminder settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const processReminders = async (req: Request, res: Response) => {
  try {
    const results = await reminderService.processReminders();

    res.status(200).json({
      success: true,
      message: 'Reminders processed successfully',
      data: results,
    });
  } catch (error) {
    logger.error('Process reminders error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to process reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const sendImmediateReminder = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { reminderType } = req.body;

    if (!reminderType || !['email', 'sms'].includes(reminderType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid reminder type (email or sms) is required',
      });
    }

    const success = await reminderService.sendImmediateReminder(
      appointmentId,
      reminderType
    );

    res.status(200).json({
      success,
      message: success
        ? 'Reminder sent successfully'
        : 'Failed to send reminder',
    });
  } catch (error) {
    logger.error('Send immediate reminder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
