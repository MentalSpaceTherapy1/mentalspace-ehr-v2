/**
 * Unified Notification System
 * Phase 3.1: Public API for all notification functionality
 *
 * This module consolidates the functionality from:
 * - reminder.service.ts (appointment reminders)
 * - emailReminder.service.ts (clinical note reminders)
 * - clinicalNoteReminder.service.ts (note due date tracking)
 * - twilio.reminder.service.ts (SMS reminders)
 * - notifications/reminder.service.ts (Resend-based reminders)
 *
 * Usage:
 * ```typescript
 * import { notificationService, startAllSchedulers } from './notifications';
 *
 * // Send an immediate notification
 * await notificationService.send({
 *   type: 'APPOINTMENT_REMINDER',
 *   recipientId: 'client-uuid',
 *   recipientType: 'client',
 *   channels: ['email', 'sms'],
 *   templateData: { ... },
 * });
 *
 * // Start all schedulers on app startup
 * startAllSchedulers();
 * ```
 */

// Core service
export {
  UnifiedNotificationService,
  notificationService,
  sendNotification,
  scheduleNotification,
  cancelNotification,
} from './notification.service';

// Types
export {
  // Notification types
  NotificationType,
  NotificationPriority,
  NotificationStatus,

  // Core interfaces
  NotificationRequest,
  NotificationResult,
  ScheduledNotification,
  ChannelResult,
  RecipientInfo,
  RenderedTemplate,

  // Configuration
  NotificationConfig,
  SchedulerConfig,

  // Service interfaces
  INotificationService,
  INotificationScheduler,
  NotificationChannel,
  TemplateRenderer,

  // Scheduler types
  SchedulerStatus,
  SchedulerRunResult,
} from './types';

// Channels
export {
  emailChannel,
  smsChannel,
  pushChannel,
  EmailChannel,
  SmsChannel,
  PushChannel,
} from './channels';

// Templates
export {
  templateRenderer,
  UnifiedTemplateRenderer,

  // Appointment templates
  renderAppointmentReminder,
  renderAppointmentConfirmation,
  renderAppointmentCancelled,
  renderAppointmentRescheduled,
  type AppointmentReminderData,
  type AppointmentConfirmationData,
  type AppointmentCancelledData,
  type AppointmentRescheduledData,

  // Clinical templates
  renderNoteDueSoon,
  renderNoteOverdue,
  renderNotePendingCosign,
  renderNoteDailyDigest,
  type NoteDueSoonData,
  type NoteOverdueData,
  type NotePendingCosignData,
  type NoteDailyDigestData,

  // Billing templates
  renderClaimSubmitted,
  renderClaimDenied,
  renderPaymentReceived,
  renderStatementReady,
  renderPaymentReminder,
  type ClaimSubmittedData,
  type ClaimDeniedData,
  type PaymentReceivedData,
  type StatementReadyData,
  type PaymentReminderData,
} from './templates';

// Schedulers
export {
  AppointmentReminderScheduler,
  appointmentReminderScheduler,
  ClinicalNoteReminderScheduler,
  clinicalNoteReminderScheduler,
  startAllSchedulers,
  stopAllSchedulers,
  getAllSchedulerStatus,
  runAllSchedulersNow,
} from './schedulers';
