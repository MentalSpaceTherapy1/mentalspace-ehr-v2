/**
 * Error Code Constants
 *
 * Standardized error codes for consistent error handling across the system.
 * Each error code follows the pattern: CATEGORY_CODE
 */

/**
 * Authentication Error Codes
 */
export const AuthErrorCodes = {
  INVALID_CREDENTIALS: 'AUTH_001',
  SESSION_EXPIRED: 'AUTH_002',
  INSUFFICIENT_PERMISSIONS: 'AUTH_003',
  ACCOUNT_LOCKED: 'AUTH_004',
  ACCOUNT_INACTIVE: 'AUTH_005',
  TOKEN_INVALID: 'AUTH_006',
  TOKEN_EXPIRED: 'AUTH_007',
  MFA_REQUIRED: 'AUTH_008',
  MFA_INVALID: 'AUTH_009',
  PASSWORD_EXPIRED: 'AUTH_010',
  SESSION_INVALID: 'AUTH_011',
  CSRF_INVALID: 'AUTH_012',
} as const;

/**
 * Client Error Codes
 */
export const ClientErrorCodes = {
  NOT_FOUND: 'CLIENT_001',
  DUPLICATE_EMAIL: 'CLIENT_002',
  INVALID_DATA: 'CLIENT_003',
  INACTIVE: 'CLIENT_004',
  DISCHARGED: 'CLIENT_005',
  CONSENT_REQUIRED: 'CLIENT_006',
  GUARDIAN_REQUIRED: 'CLIENT_007',
} as const;

/**
 * Appointment Error Codes
 */
export const AppointmentErrorCodes = {
  NOT_FOUND: 'APPOINTMENT_001',
  CONFLICT: 'APPOINTMENT_002',
  PROVIDER_UNAVAILABLE: 'APPOINTMENT_003',
  PAST_DATE: 'APPOINTMENT_004',
  INVALID_DURATION: 'APPOINTMENT_005',
  CLIENT_INACTIVE: 'APPOINTMENT_006',
  ALREADY_CANCELLED: 'APPOINTMENT_007',
  CANNOT_MODIFY: 'APPOINTMENT_008',
  OUTSIDE_HOURS: 'APPOINTMENT_009',
  MAX_DAILY_EXCEEDED: 'APPOINTMENT_010',
} as const;

/**
 * Clinical Note Error Codes
 */
export const NoteErrorCodes = {
  NOT_FOUND: 'NOTE_001',
  ALREADY_SIGNED: 'NOTE_002',
  CANNOT_EDIT: 'NOTE_003',
  SIGNATURE_REQUIRED: 'NOTE_004',
  COSIGN_REQUIRED: 'NOTE_005',
  INVALID_AMENDMENT: 'NOTE_006',
  APPOINTMENT_REQUIRED: 'NOTE_007',
  TEMPLATE_NOT_FOUND: 'NOTE_008',
  LOCKED: 'NOTE_009',
} as const;

/**
 * Billing Error Codes
 */
export const BillingErrorCodes = {
  CLAIM_NOT_FOUND: 'BILLING_001',
  INVALID_CODES: 'BILLING_002',
  DUPLICATE_CLAIM: 'BILLING_003',
  INSURANCE_INACTIVE: 'BILLING_004',
  AUTHORIZATION_REQUIRED: 'BILLING_005',
  PAYMENT_FAILED: 'BILLING_006',
  REFUND_EXCEEDS_PAYMENT: 'BILLING_007',
  CLAIM_ALREADY_SUBMITTED: 'BILLING_008',
  ELIGIBILITY_CHECK_FAILED: 'BILLING_009',
} as const;

/**
 * Insurance Error Codes
 */
export const InsuranceErrorCodes = {
  NOT_FOUND: 'INSURANCE_001',
  INACTIVE: 'INSURANCE_002',
  EXPIRED: 'INSURANCE_003',
  VERIFICATION_FAILED: 'INSURANCE_004',
  INVALID_MEMBER_ID: 'INSURANCE_005',
  PAYER_NOT_SUPPORTED: 'INSURANCE_006',
} as const;

/**
 * Document Error Codes
 */
export const DocumentErrorCodes = {
  NOT_FOUND: 'DOCUMENT_001',
  UPLOAD_FAILED: 'DOCUMENT_002',
  INVALID_FORMAT: 'DOCUMENT_003',
  SIZE_EXCEEDED: 'DOCUMENT_004',
  VIRUS_DETECTED: 'DOCUMENT_005',
  ACCESS_DENIED: 'DOCUMENT_006',
} as const;

/**
 * Telehealth Error Codes
 */
export const TelehealthErrorCodes = {
  SESSION_NOT_FOUND: 'TELEHEALTH_001',
  SESSION_EXPIRED: 'TELEHEALTH_002',
  RECORDING_FAILED: 'TELEHEALTH_003',
  CONNECTION_FAILED: 'TELEHEALTH_004',
  PARTICIPANT_LIMIT: 'TELEHEALTH_005',
  FEATURE_DISABLED: 'TELEHEALTH_006',
} as const;

/**
 * Validation Error Codes
 */
export const ValidationErrorCodes = {
  REQUIRED_FIELD: 'VALIDATION_001',
  INVALID_FORMAT: 'VALIDATION_002',
  INVALID_LENGTH: 'VALIDATION_003',
  INVALID_RANGE: 'VALIDATION_004',
  INVALID_DATE: 'VALIDATION_005',
  INVALID_EMAIL: 'VALIDATION_006',
  INVALID_PHONE: 'VALIDATION_007',
} as const;

/**
 * System Error Codes
 */
export const SystemErrorCodes = {
  INTERNAL_ERROR: 'SYSTEM_001',
  DATABASE_ERROR: 'SYSTEM_002',
  EXTERNAL_SERVICE_ERROR: 'SYSTEM_003',
  RATE_LIMIT_EXCEEDED: 'SYSTEM_004',
  MAINTENANCE_MODE: 'SYSTEM_005',
  FEATURE_DISABLED: 'SYSTEM_006',
} as const;

/**
 * All Error Codes combined
 */
export const ErrorCodes = {
  ...AuthErrorCodes,
  ...ClientErrorCodes,
  ...AppointmentErrorCodes,
  ...NoteErrorCodes,
  ...BillingErrorCodes,
  ...InsuranceErrorCodes,
  ...DocumentErrorCodes,
  ...TelehealthErrorCodes,
  ...ValidationErrorCodes,
  ...SystemErrorCodes,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error Messages mapped to Error Codes
 */
export const ErrorMessages: Record<string, string> = {
  // Auth errors
  AUTH_001: 'Invalid email or password',
  AUTH_002: 'Your session has expired. Please log in again.',
  AUTH_003: 'You do not have permission to perform this action',
  AUTH_004: 'Your account has been locked due to multiple failed login attempts',
  AUTH_005: 'Your account is inactive. Please contact your administrator.',
  AUTH_006: 'Invalid authentication token',
  AUTH_007: 'Authentication token has expired',
  AUTH_008: 'Multi-factor authentication is required',
  AUTH_009: 'Invalid verification code',
  AUTH_010: 'Your password has expired and must be changed',
  AUTH_011: 'Invalid session',
  AUTH_012: 'Invalid security token. Please refresh and try again.',

  // Client errors
  CLIENT_001: 'Client not found',
  CLIENT_002: 'A client with this email already exists',
  CLIENT_003: 'Invalid client data provided',
  CLIENT_004: 'Client is inactive',
  CLIENT_005: 'Client has been discharged',
  CLIENT_006: 'Client consent is required',
  CLIENT_007: 'Guardian information is required for minor clients',

  // Appointment errors
  APPOINTMENT_001: 'Appointment not found',
  APPOINTMENT_002: 'This time slot conflicts with an existing appointment',
  APPOINTMENT_003: 'Provider is not available at this time',
  APPOINTMENT_004: 'Cannot schedule appointments in the past',
  APPOINTMENT_005: 'Invalid appointment duration',
  APPOINTMENT_006: 'Cannot schedule appointments for inactive clients',
  APPOINTMENT_007: 'This appointment has already been cancelled',
  APPOINTMENT_008: 'This appointment cannot be modified',
  APPOINTMENT_009: 'Appointment is outside of business hours',
  APPOINTMENT_010: 'Maximum daily appointments exceeded',

  // Note errors
  NOTE_001: 'Clinical note not found',
  NOTE_002: 'This note has already been signed',
  NOTE_003: 'This note cannot be edited',
  NOTE_004: 'Signature is required to complete this note',
  NOTE_005: 'Co-signature is required for this note',
  NOTE_006: 'Invalid amendment request',
  NOTE_007: 'An appointment is required for this note type',
  NOTE_008: 'Note template not found',
  NOTE_009: 'This note is locked and cannot be modified',

  // Billing errors
  BILLING_001: 'Claim not found',
  BILLING_002: 'Invalid billing codes',
  BILLING_003: 'A claim for this service already exists',
  BILLING_004: 'Insurance is inactive',
  BILLING_005: 'Prior authorization is required',
  BILLING_006: 'Payment processing failed',
  BILLING_007: 'Refund amount exceeds original payment',
  BILLING_008: 'This claim has already been submitted',
  BILLING_009: 'Insurance eligibility check failed',

  // Insurance errors
  INSURANCE_001: 'Insurance information not found',
  INSURANCE_002: 'Insurance is inactive',
  INSURANCE_003: 'Insurance has expired',
  INSURANCE_004: 'Insurance verification failed',
  INSURANCE_005: 'Invalid member ID',
  INSURANCE_006: 'This insurance payer is not supported',

  // Document errors
  DOCUMENT_001: 'Document not found',
  DOCUMENT_002: 'Document upload failed',
  DOCUMENT_003: 'Invalid document format',
  DOCUMENT_004: 'Document size exceeds maximum limit',
  DOCUMENT_005: 'Security threat detected in uploaded file',
  DOCUMENT_006: 'Access to this document is denied',

  // Telehealth errors
  TELEHEALTH_001: 'Telehealth session not found',
  TELEHEALTH_002: 'Telehealth session has expired',
  TELEHEALTH_003: 'Session recording failed',
  TELEHEALTH_004: 'Failed to connect to telehealth session',
  TELEHEALTH_005: 'Maximum participants reached',
  TELEHEALTH_006: 'Telehealth feature is disabled',

  // Validation errors
  VALIDATION_001: 'This field is required',
  VALIDATION_002: 'Invalid format',
  VALIDATION_003: 'Invalid length',
  VALIDATION_004: 'Value is out of valid range',
  VALIDATION_005: 'Invalid date',
  VALIDATION_006: 'Invalid email address',
  VALIDATION_007: 'Invalid phone number',

  // System errors
  SYSTEM_001: 'An internal error occurred. Please try again later.',
  SYSTEM_002: 'A database error occurred',
  SYSTEM_003: 'External service is unavailable',
  SYSTEM_004: 'Too many requests. Please try again later.',
  SYSTEM_005: 'System is under maintenance',
  SYSTEM_006: 'This feature is currently disabled',
};

/**
 * Get error message by error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] || 'An unknown error occurred';
}
