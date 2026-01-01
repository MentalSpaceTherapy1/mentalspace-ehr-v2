/**
 * Portal Constants
 * Centralized configuration values for the client portal
 */

// ============================================================================
// TOKEN CONFIGURATION
// ============================================================================

/** Token generation settings */
export const TOKEN_CONFIG = {
  /** Number of random bytes for security tokens */
  TOKEN_BYTES: 32,
  /** Bcrypt salt rounds for password hashing */
  BCRYPT_SALT_ROUNDS: 10,
} as const;

// ============================================================================
// TOKEN EXPIRY TIMES
// ============================================================================

/** Token expiry durations in milliseconds */
export const TOKEN_EXPIRY = {
  /** Email verification token validity (24 hours) */
  EMAIL_VERIFICATION_MS: 24 * 60 * 60 * 1000,
  /** Password reset token validity (1 hour) */
  PASSWORD_RESET_MS: 60 * 60 * 1000,
  /** Account lockout duration (15 minutes) */
  ACCOUNT_LOCKOUT_MS: 15 * 60 * 1000,
} as const;

// ============================================================================
// JWT CONFIGURATION
// ============================================================================

/** JWT token settings */
export const JWT_CONFIG = {
  /** Access token expiry */
  ACCESS_TOKEN_EXPIRY: '1h',
  /** Refresh token expiry */
  REFRESH_TOKEN_EXPIRY: '7d',
  /** JWT audience for portal tokens */
  AUDIENCE: 'mentalspace-portal',
  /** JWT issuer */
  ISSUER: 'mentalspace-ehr',
} as const;

// ============================================================================
// SECURITY SETTINGS
// ============================================================================

/** Security configuration */
export const SECURITY_CONFIG = {
  /** Maximum failed login attempts before account lockout */
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
} as const;

// ============================================================================
// PAGINATION DEFAULTS
// ============================================================================

/** Default pagination settings */
export const PAGINATION = {
  /** Default items per page for dashboard widgets */
  DASHBOARD_APPOINTMENTS: 3,
  /** Default items for mood history */
  MOOD_HISTORY: 7,
  /** Default appointments list limit */
  APPOINTMENTS_DEFAULT: 10,
  /** Default past appointments limit */
  PAST_APPOINTMENTS_DEFAULT: 20,
  /** Default messages per page */
  MESSAGES_DEFAULT: 50,
} as const;

// ============================================================================
// FILE UPLOAD LIMITS (for reference - actual validation in frontend)
// ============================================================================

/** File upload constraints */
export const FILE_UPLOAD = {
  /** Maximum file size in bytes (10MB) */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;
