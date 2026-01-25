import { Router } from 'express';
import {
  getConfig,
  updateConfig,
  testSms,
  testEmail,
  twilioSmsWebhook,
  twilioStatusWebhook,
  getAppointmentReminders,
  resendReminder,
  scheduleReminders,
  processReminders,
  retryFailedReminders,
  getJobStatus,
  getStatistics,
} from '../controllers/reminder.controller.new';
import { authMiddleware, authorize } from '../middleware/auth';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// ===========================================
// PUBLIC ROUTES (Webhooks - no auth required)
// ===========================================

/**
 * POST /api/v1/reminders/webhooks/twilio/sms
 * Webhook for incoming SMS responses from clients
 */
router.post('/webhooks/twilio/sms', twilioSmsWebhook);

/**
 * POST /api/v1/reminders/webhooks/twilio/status
 * Webhook for SMS delivery status updates
 */
router.post('/webhooks/twilio/status', twilioStatusWebhook);

// ===========================================
// PROTECTED ROUTES (Require authentication)
// ===========================================

router.use(authMiddleware);

// Configuration endpoints (Admin only)
/**
 * GET /api/v1/reminders/config
 * Get current reminder configuration
 */
router.get('/config', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), getConfig);

/**
 * PUT /api/v1/reminders/config
 * Update reminder configuration
 */
router.put('/config', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), updateConfig);

// Testing endpoints (Admin only)
/**
 * POST /api/v1/reminders/test/sms
 * Send a test SMS to verify configuration
 * Body: { phoneNumber: string, fromNumber: string }
 */
router.post('/test/sms', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), testSms);

/**
 * POST /api/v1/reminders/test/email
 * Send a test email to verify configuration
 * Body: { email: string, fromEmail: string }
 */
router.post('/test/email', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), testEmail);

// Appointment reminder management
/**
 * GET /api/v1/reminders/appointment/:appointmentId
 * Get all reminders for a specific appointment
 */
router.get('/appointment/:appointmentId', getAppointmentReminders);

/**
 * POST /api/v1/reminders/appointment/:appointmentId/schedule
 * Schedule reminders for an appointment (usually automatic, but can be triggered manually)
 */
router.post('/appointment/:appointmentId/schedule', scheduleReminders);

/**
 * POST /api/v1/reminders/:reminderId/resend
 * Resend a specific reminder
 */
router.post('/:reminderId/resend', resendReminder);

// Processing endpoints (Admin only)
/**
 * POST /api/v1/reminders/process
 * Manually trigger reminder processing (normally runs via cron)
 */
router.post('/process', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), processReminders);

/**
 * POST /api/v1/reminders/retry-failed
 * Manually trigger failed reminder retry (normally runs via cron)
 */
router.post(
  '/retry-failed',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN),
  retryFailedReminders
);

// Monitoring endpoints
/**
 * GET /api/v1/reminders/jobs/status
 * Get status of reminder cron jobs
 */
router.get('/jobs/status', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), getJobStatus);

/**
 * GET /api/v1/reminders/statistics
 * Get reminder statistics
 * Query params: startDate (optional), endDate (optional)
 */
router.get('/statistics', authorize(UserRoles.ADMINISTRATOR, UserRoles.PRACTICE_ADMIN), getStatistics);

export default router;
