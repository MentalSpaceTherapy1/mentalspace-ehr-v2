import express from 'express';
import {
  getRemindersForNote,
  getMyReminders,
  scheduleReminders,
  cancelReminders,
  triggerReminderProcessing,
  getPendingReminders,
} from '../controllers/clinicalNoteReminder.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route GET /api/v1/clinical-note-reminders/my-reminders
 * @desc Get reminders for the authenticated user
 * @access Private
 */
router.get('/my-reminders', authenticate, getMyReminders);

/**
 * @route GET /api/v1/clinical-note-reminders/pending
 * @desc Get all pending reminders (admin only)
 * @access Private (Admin only)
 */
router.get('/pending', authenticate, getPendingReminders);

/**
 * @route GET /api/v1/clinical-note-reminders/note/:noteId
 * @desc Get reminders for a specific clinical note
 * @access Private
 */
router.get('/note/:noteId', authenticate, getRemindersForNote);

/**
 * @route POST /api/v1/clinical-note-reminders/schedule
 * @desc Schedule reminders for a clinical note
 * @access Private
 */
router.post('/schedule', authenticate, scheduleReminders);

/**
 * @route DELETE /api/v1/clinical-note-reminders/note/:noteId
 * @desc Cancel all pending reminders for a clinical note
 * @access Private
 */
router.delete('/note/:noteId', authenticate, cancelReminders);

/**
 * @route POST /api/v1/clinical-note-reminders/process
 * @desc Manually trigger reminder processing (admin only)
 * @access Private (Admin only)
 */
router.post('/process', authenticate, triggerReminderProcessing);

export default router;
