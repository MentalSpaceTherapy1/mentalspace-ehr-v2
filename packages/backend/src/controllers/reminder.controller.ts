import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import * as reminderService from '../services/reminder.service';
import { sendSuccess, sendBadRequest, sendServerError, sendValidationError } from '../utils/apiResponse';

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

    return sendSuccess(res, settings, 'Reminder settings saved successfully');
  } catch (error) {
    logger.error('Upsert reminder settings error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to save reminder settings');
  }
};

export const getReminderSettings = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const settings = await reminderService.getReminderSettings(clinicianId);

    return sendSuccess(res, settings);
  } catch (error) {
    logger.error('Get reminder settings error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve reminder settings');
  }
};

export const processReminders = async (req: Request, res: Response) => {
  try {
    const results = await reminderService.processReminders();

    return sendSuccess(res, results, 'Reminders processed successfully');
  } catch (error) {
    logger.error('Process reminders error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to process reminders');
  }
};

export const sendImmediateReminder = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { reminderType } = req.body;

    if (!reminderType || !['email', 'sms'].includes(reminderType)) {
      return sendBadRequest(res, 'Valid reminder type (email or sms) is required');
    }

    const success = await reminderService.sendImmediateReminder(
      appointmentId,
      reminderType
    );

    return sendSuccess(res, { success }, success ? 'Reminder sent successfully' : 'Failed to send reminder');
  } catch (error) {
    logger.error('Send immediate reminder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to send reminder');
  }
};
