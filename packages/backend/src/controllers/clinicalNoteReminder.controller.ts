import { Request, Response } from 'express';
import { clinicalNoteReminderService } from '../services/clinicalNoteReminder.service';
import { triggerNoteReminderJob } from '../jobs/processNoteReminders.job';
import logger from '../utils/logger';

/**
 * Get reminders for a specific clinical note
 * GET /api/v1/clinical-note-reminders/note/:noteId
 */
export const getRemindersForNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;

    const reminders = await clinicalNoteReminderService.getRemindersForNote(noteId);

    res.status(200).json({
      success: true,
      data: reminders,
      message: `Retrieved ${reminders.length} reminders for note`,
    });
  } catch (error: any) {
    logger.error('Error getting reminders for note', {
      error: error.message,
      noteId: req.params.noteId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve reminders for note',
    });
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
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const includeCompleted = req.query.includeCompleted === 'true';

    const reminders = await clinicalNoteReminderService.getRemindersForUser(
      userId,
      includeCompleted
    );

    res.status(200).json({
      success: true,
      data: reminders,
      message: `Retrieved ${reminders.length} reminders`,
    });
  } catch (error: any) {
    logger.error('Error getting user reminders', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user reminders',
    });
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
      return res.status(400).json({
        success: false,
        message: 'noteId and userId are required',
      });
    }

    const reminders = await clinicalNoteReminderService.scheduleAllReminders(noteId, userId);

    res.status(201).json({
      success: true,
      data: reminders,
      message: `Scheduled ${reminders.length} reminders`,
    });
  } catch (error: any) {
    logger.error('Error scheduling reminders', {
      error: error.message,
      noteId: req.body.noteId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule reminders',
    });
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

    res.status(200).json({
      success: true,
      data: result,
      message: `Cancelled ${result.count} reminders`,
    });
  } catch (error: any) {
    logger.error('Error cancelling reminders', {
      error: error.message,
      noteId: req.params.noteId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel reminders',
    });
  }
};

/**
 * Manually trigger reminder processing (for testing/admin)
 * POST /api/v1/clinical-note-reminders/process
 */
export const triggerReminderProcessing = async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    if (!req.user?.roles?.includes('ADMINISTRATOR')) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can manually trigger reminder processing',
      });
    }

    const results = await triggerNoteReminderJob();

    res.status(200).json({
      success: true,
      data: results,
      message: 'Reminder processing completed',
    });
  } catch (error: any) {
    logger.error('Error manually triggering reminder processing', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger reminder processing',
    });
  }
};

/**
 * Get pending reminders (admin only)
 * GET /api/v1/clinical-note-reminders/pending
 */
export const getPendingReminders = async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    if (!req.user?.roles?.includes('ADMINISTRATOR')) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view all pending reminders',
      });
    }

    const reminders = await clinicalNoteReminderService.getPendingReminders();

    res.status(200).json({
      success: true,
      data: reminders,
      message: `Retrieved ${reminders.length} pending reminders`,
    });
  } catch (error: any) {
    logger.error('Error getting pending reminders', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve pending reminders',
    });
  }
};
