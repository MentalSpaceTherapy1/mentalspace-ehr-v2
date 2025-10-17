import { Router } from 'express';
import {
  upsertReminderSettings,
  getReminderSettings,
  processReminders,
  sendImmediateReminder,
} from '../controllers/reminder.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Reminder settings
router.post('/settings', upsertReminderSettings);
router.get('/settings/:clinicianId', getReminderSettings);

// Process reminders (can be called by cron job or manually)
router.post('/process', processReminders);

// Send immediate reminder
router.post('/send/:appointmentId', sendImmediateReminder);

export default router;
