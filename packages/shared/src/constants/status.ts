/**
 * Status Constants
 *
 * Defines all status values used throughout the MentalSpace EHR system.
 * Use these constants instead of magic strings for type safety and consistency.
 */

/**
 * Appointment Status Values
 */
export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED',
  PENDING: 'PENDING',
  WAITLISTED: 'WAITLISTED',
} as const;

export type AppointmentStatusType =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

/**
 * Clinical Note Status Values
 */
export const NoteStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PENDING_COSIGN: 'PENDING_COSIGN',
  SIGNED: 'SIGNED',
  AMENDED: 'AMENDED',
  LOCKED: 'LOCKED',
  DELETED: 'DELETED',
} as const;

export type NoteStatusType = (typeof NoteStatus)[keyof typeof NoteStatus];

/**
 * Insurance Claim Status Values
 */
export const ClaimStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  DENIED: 'DENIED',
  APPEALED: 'APPEALED',
  VOIDED: 'VOIDED',
} as const;

export type ClaimStatusType = (typeof ClaimStatus)[keyof typeof ClaimStatus];

/**
 * Payment Status Values
 */
export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  VOIDED: 'VOIDED',
} as const;

export type PaymentStatusType =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Client Status Values
 */
export const ClientStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCHARGED: 'DISCHARGED',
  WAITLIST: 'WAITLIST',
  PENDING_INTAKE: 'PENDING_INTAKE',
  ON_HOLD: 'ON_HOLD',
} as const;

export type ClientStatusType =
  (typeof ClientStatus)[keyof typeof ClientStatus];

/**
 * User Account Status Values
 */
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  LOCKED: 'LOCKED',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * Document Status Values
 */
export const DocumentStatus = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type DocumentStatusType =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

/**
 * Task/Todo Status Values
 */
export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD',
  OVERDUE: 'OVERDUE',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * Message Priority Values
 */
export const MessagePriority = {
  URGENT: 'URGENT',
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
} as const;

export type MessagePriorityType =
  (typeof MessagePriority)[keyof typeof MessagePriority];

/**
 * Session Recording Status Values
 */
export const RecordingStatus = {
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  DELETED: 'DELETED',
} as const;

export type RecordingStatusType =
  (typeof RecordingStatus)[keyof typeof RecordingStatus];

/**
 * Telehealth Session Status Values
 */
export const TelehealthStatus = {
  SCHEDULED: 'SCHEDULED',
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  TECHNICAL_ISSUE: 'TECHNICAL_ISSUE',
} as const;

export type TelehealthStatusType =
  (typeof TelehealthStatus)[keyof typeof TelehealthStatus];

/**
 * Time Off Request Status Values
 */
export const TimeOffStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED',
  CANCELLED: 'CANCELLED',
} as const;

export type TimeOffStatusType =
  (typeof TimeOffStatus)[keyof typeof TimeOffStatus];

/**
 * Credential Status Values
 */
export const CredentialStatus = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
} as const;

export type CredentialStatusType =
  (typeof CredentialStatus)[keyof typeof CredentialStatus];

/**
 * Status Groups for common operations
 */
export const StatusGroups = {
  // Appointments that count as "active"
  ACTIVE_APPOINTMENT_STATUSES: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_PROGRESS,
  ] as const,

  // Appointments that are finalized (can't be modified)
  FINALIZED_APPOINTMENT_STATUSES: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ] as const,

  // Notes that are finalized (can't be edited without amendment)
  FINALIZED_NOTE_STATUSES: [
    NoteStatus.SIGNED,
    NoteStatus.LOCKED,
    NoteStatus.AMENDED,
  ] as const,

  // Claims that are still being processed
  PENDING_CLAIM_STATUSES: [
    ClaimStatus.DRAFT,
    ClaimStatus.PENDING,
    ClaimStatus.SUBMITTED,
    ClaimStatus.ACCEPTED,
    ClaimStatus.APPEALED,
  ] as const,
} as const;
