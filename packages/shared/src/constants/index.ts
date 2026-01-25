// Re-export all constants from sub-modules
export * from './roles';
export * from './status';
export * from './errors';

// API Constants
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Pagination Constants
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// User Role Constants (legacy - use RoleGroups from './roles' instead)
export const ADMIN_ROLES = ['ADMINISTRATOR'];
export const SUPERVISOR_ROLES = ['ADMINISTRATOR', 'SUPERVISOR'];
export const CLINICIAN_ROLES = ['ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'];
export const BILLING_STAFF_ROLES = ['ADMINISTRATOR', 'BILLING_STAFF'];
export const FRONT_DESK_ROLES = ['ADMINISTRATOR', 'FRONT_DESK'];
export const ASSOCIATE_ROLES = ['ADMINISTRATOR', 'SUPERVISOR', 'ASSOCIATE'];

// Session Constants
export const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// HIPAA Compliance Constants
export const AUDIT_RETENTION_DAYS = 2555; // 7 years
export const SESSION_TIMEOUT_MINUTES = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HISTORY_COUNT = 5;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 30;
