/**
 * Unified Notification System Types
 * Phase 3.1: Consolidated notification types for email, SMS, and push channels
 */

// ============================================================================
// Core Types
// ============================================================================

export type NotificationChannelName = 'email' | 'sms' | 'push';

export type NotificationPriority = 'high' | 'normal' | 'low';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type NotificationType =
  // Appointment notifications
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  // Clinical note notifications
  | 'NOTE_DUE_SOON'
  | 'NOTE_OVERDUE'
  | 'NOTE_PENDING_COSIGN'
  | 'NOTE_ESCALATION'
  | 'NOTE_DAILY_DIGEST'
  // Billing notifications
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_DENIED'
  | 'PAYMENT_RECEIVED'
  | 'STATEMENT_READY'
  | 'PAYMENT_REMINDER'
  // User notifications
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_LOCKED'
  | 'TWO_FACTOR_CODE'
  // Client portal notifications
  | 'CLIENT_WELCOME'
  | 'CLIENT_FORM_ASSIGNED'
  | 'CLIENT_DOCUMENT_READY'
  | 'CLIENT_ASSESSMENT_REMINDER';

// ============================================================================
// Request/Response Types
// ============================================================================

export interface NotificationRequest {
  /** Type of notification to send */
  type: NotificationType;
  /** Recipient user ID or client ID */
  recipientId: string;
  /** Recipient type: 'user' for staff, 'client' for patients */
  recipientType: 'user' | 'client';
  /** Channels to send through */
  channels: NotificationChannelName[];
  /** Template data for rendering */
  templateData: Record<string, unknown>;
  /** When to send (null = immediate) */
  scheduledFor?: Date | null;
  /** Priority level */
  priority?: NotificationPriority;
  /** Related entity ID (appointmentId, noteId, etc.) */
  referenceId?: string;
  /** Related entity type */
  referenceType?: 'appointment' | 'note' | 'claim' | 'payment' | 'statement';
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  /** Unique notification ID */
  id: string;
  /** Overall success status */
  success: boolean;
  /** Results per channel */
  channelResults: ChannelResult[];
  /** Timestamp */
  timestamp: Date;
}

export interface ChannelResult {
  /** Channel used */
  channel: NotificationChannelName;
  /** Success status for this channel */
  success: boolean;
  /** External message ID (e.g., Twilio SID, Resend ID) */
  externalId?: string;
  /** Error message if failed */
  error?: string;
  /** Delivery status */
  status: NotificationStatus;
}

export interface ScheduledNotification {
  /** Scheduled notification ID */
  id: string;
  /** Original request */
  request: NotificationRequest;
  /** When scheduled to send */
  scheduledFor: Date;
  /** Current status */
  status: 'pending' | 'sent' | 'cancelled';
  /** Created timestamp */
  createdAt: Date;
}

// ============================================================================
// Template Types
// ============================================================================

export interface RenderedTemplate {
  /** Email subject (if applicable) */
  subject?: string;
  /** Plain text body */
  textBody: string;
  /** HTML body (if applicable) */
  htmlBody?: string;
  /** SMS-optimized short message */
  smsBody?: string;
}

export interface TemplateRenderer {
  /** Render a notification template */
  render(
    type: NotificationType,
    data: Record<string, unknown>
  ): Promise<RenderedTemplate>;
}

// ============================================================================
// Channel Types
// ============================================================================

export interface RecipientInfo {
  /** Recipient ID */
  id: string;
  /** Email address (for email channel) */
  email?: string | null;
  /** Phone number in E.164 format (for SMS channel) */
  phone?: string | null;
  /** Push notification token (for push channel) */
  pushToken?: string | null;
  /** Recipient name for personalization */
  firstName?: string;
  lastName?: string;
  /** Notification preferences */
  preferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
  };
}

export interface ChannelSendRequest {
  /** Recipient information */
  recipient: RecipientInfo;
  /** Rendered template content */
  template: RenderedTemplate;
  /** Priority */
  priority: NotificationPriority;
  /** Reference for tracking */
  referenceId?: string;
}

export interface NotificationChannel {
  /** Channel name */
  readonly name: 'email' | 'sms' | 'push';

  /** Check if channel is configured and available */
  isAvailable(): Promise<boolean>;

  /** Send a notification through this channel */
  send(request: ChannelSendRequest): Promise<ChannelResult>;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface INotificationService {
  /** Send a notification immediately or schedule it */
  send(request: NotificationRequest): Promise<NotificationResult>;

  /** Schedule a notification for future delivery */
  schedule(request: NotificationRequest): Promise<ScheduledNotification>;

  /** Cancel a scheduled notification */
  cancel(scheduledId: string): Promise<boolean>;

  /** Get status of a notification */
  getStatus(notificationId: string): Promise<NotificationResult | null>;

  /** Get all pending scheduled notifications for a recipient */
  getPendingForRecipient(
    recipientId: string,
    recipientType: 'user' | 'client'
  ): Promise<ScheduledNotification[]>;
}

// ============================================================================
// Scheduler Types
// ============================================================================

export interface SchedulerConfig {
  /** Cron expression for when to run */
  cronExpression: string;
  /** Whether scheduler is enabled */
  enabled: boolean;
  /** Maximum items to process per run */
  batchSize?: number;
}

export interface INotificationScheduler {
  /** Start the scheduler */
  start(): void;

  /** Stop the scheduler */
  stop(): void;

  /** Run immediately (for testing) */
  runNow(): Promise<SchedulerRunResult>;

  /** Get scheduler status */
  getStatus(): SchedulerStatus;
}

export interface SchedulerStatus {
  /** Whether scheduler is running */
  isRunning: boolean;
  /** Whether currently processing */
  isProcessing: boolean;
  /** Last run timestamp */
  lastRunAt?: Date;
  /** Last run result */
  lastRunResult?: SchedulerRunResult;
}

export interface SchedulerRunResult {
  /** Total items processed */
  total: number;
  /** Successfully sent */
  sent: number;
  /** Failed to send */
  failed: number;
  /** Skipped (e.g., preferences disabled) */
  skipped: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error details if any failures */
  errors?: Array<{ id: string; error: string }>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface NotificationConfig {
  /** Default channels to use if not specified */
  defaultChannels: NotificationChannelName[];
  /** Default priority */
  defaultPriority: NotificationPriority;
  /** Whether to respect user preferences */
  respectPreferences: boolean;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
}

export interface ReminderTimingConfig {
  /** Hours before appointment to send reminders */
  appointmentReminders: number[];
  /** Days before note due date to send reminders */
  noteDueReminders: number[];
  /** Days after note is overdue for escalation */
  noteOverdueEscalation: number[];
}

// ============================================================================
// Event Types (for audit/tracking)
// ============================================================================

export interface NotificationEvent {
  /** Event ID */
  id: string;
  /** Notification ID */
  notificationId: string;
  /** Event type */
  eventType: 'created' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  /** Channel (if applicable) */
  channel?: NotificationChannelName;
  /** Timestamp */
  timestamp: Date;
  /** Additional details */
  details?: Record<string, unknown>;
}
