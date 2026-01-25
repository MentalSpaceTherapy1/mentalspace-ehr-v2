import { Request, Response } from 'express';
import { UserRoles } from '@mentalspace/shared';
import { clinicalNoteReminderService } from '../services/clinicalNoteReminder.service';
import { triggerNoteReminderJob } from '../jobs/processNoteReminders.job';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendForbidden, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Get reminders for a specific clinical note
 * GET /api/v1/clinical-note-reminders/note/:noteId
 */
export const getRemindersForNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;

    const reminders = await clinicalNoteReminderService.getRemindersForNote(noteId);

    return sendSuccess(res, reminders, `Retrieved ${reminders.length} reminders for note`);
  } catch (error) {
    logger.error('Error getting reminders for note', {
      error: getErrorMessage(error),
      noteId: req.params.noteId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve reminders for note');
  }
};

/**
 * Get reminders for the authenticated user
 * GET /api/v1/clinical-note-reminders/my-reminders
 */
export const getMyReminders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    const includeCompleted = req.query.includeCompleted === 'true';

    const reminders = await clinicalNoteReminderService.getRemindersForUser(
      userId,
      includeCompleted
    );

    return sendSuccess(res, reminders, `Retrieved ${reminders.length} reminders`);
  } catch (error) {
    logger.error('Error getting user reminders', {
      error: getErrorMessage(error),
      userId: req.user?.id,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve user reminders');
  }
};

/**
 * Schedule reminders for a clinical note
 * POST /api/v1/clinical-note-reminders/schedule
 */
export const scheduleReminders = async (req: Request, res: Response) => {
  try {
    const { noteId, userId } = req.body;

    if (!noteId || !userId) {
      return sendBadRequest(res, 'noteId and userId are required');
    }

    const reminders = await clinicalNoteReminderService.scheduleAllReminders(noteId, userId);

    return sendCreated(res, reminders, `Scheduled ${reminders.length} reminders`);
  } catch (error) {
    logger.error('Error scheduling reminders', {
      error: getErrorMessage(error),
      noteId: req.body.noteId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to schedule reminders');
  }
};

/**
 * Cancel all pending reminders for a clinical note
 * DELETE /api/v1/clinical-note-reminders/note/:noteId
 */
export const cancelReminders = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;

    const result = await clinicalNoteReminderService.cancelReminders(noteId);

    return sendSuccess(res, result, `Cancelled ${result.count} reminders`);
  } catch (error) {
    logger.error('Error cancelling reminders', {
      error: getErrorMessage(error),
      noteId: req.params.noteId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to cancel reminders');
  }
};

/**
 * Manually trigger reminder processing (for testing/admin)
 * POST /api/v1/clinical-note-reminders/process
 */
export const triggerReminderProcessing = async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    if (!req.user?.roles?.includes(UserRoles.ADMINISTRATOR)) {
      return sendForbidden(res, 'Only administrators can manually trigger reminder processing');
    }

    const results = await triggerNoteReminderJob();

    return sendSuccess(res, results, 'Reminder processing completed');
  } catch (error) {
    logger.error('Error manually triggering reminder processing', {
      error: getErrorMessage(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to trigger reminder processing');
  }
};

/**
 * Get pending reminders (admin only)
 * GET /api/v1/clinical-note-reminders/pending
 */
export const getPendingReminders = async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    if (!req.user?.roles?.includes(UserRoles.ADMINISTRATOR)) {
      return sendForbidden(res, 'Only administrators can view all pending reminders');
    }

    const reminders = await clinicalNoteReminderService.getPendingReminders();

    return sendSuccess(res, reminders, `Retrieved ${reminders.length} pending reminders`);
  } catch (error) {
    logger.error('Error getting pending reminders', {
      error: getErrorMessage(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve pending reminders');
  }
};
