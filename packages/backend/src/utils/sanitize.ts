import validator from 'validator';

/**
 * Input Sanitization Utilities
 * Prevents SQL injection and XSS attacks in user input
 *
 * OWASP Top 10: Injection Prevention
 */

/**
 * Sanitize search query input
 * Removes potentially dangerous characters while preserving useful search
 *
 * @param input - Raw search input from user
 * @returns Sanitized search string safe for database queries
 */
export function sanitizeSearchInput(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length to prevent DoS attacks
  const MAX_SEARCH_LENGTH = 100;
  if (sanitized.length > MAX_SEARCH_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SEARCH_LENGTH);
  }

  // Escape HTML to prevent XSS
  sanitized = validator.escape(sanitized);

  // Remove SQL injection patterns
  // Note: Prisma uses parameterized queries which prevents SQL injection,
  // but this adds defense in depth
  const dangerousPatterns = [
    /(\bOR\b.*=.*)/gi,      // OR 1=1
    /(\bAND\b.*=.*)/gi,     // AND 1=1
    /(\bUNION\b)/gi,        // UNION attacks
    /(\bSELECT\b.*\bFROM\b)/gi, // SELECT FROM
    /(\bDROP\b.*\bTABLE\b)/gi,  // DROP TABLE
    /(\bDELETE\b.*\bFROM\b)/gi, // DELETE FROM
    /(\bINSERT\b.*\bINTO\b)/gi, // INSERT INTO
    /(\bUPDATE\b.*\bSET\b)/gi,  // UPDATE SET
    /(--)/g,                // SQL comments
    /(\/\*)/g,              // Multi-line comments
    /(\bEXEC\b)/gi,         // EXEC
    /(\bEXECUTE\b)/gi,      // EXECUTE
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitize email input
 * @param email - Raw email input
 * @returns Normalized and validated email or empty string
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Normalize email (lowercase, trim)
  const normalized = validator.normalizeEmail(email) || '';

  // Validate email format
  if (!validator.isEmail(normalized)) {
    return '';
  }

  return normalized;
}

/**
 * Sanitize UUID input
 * @param uuid - Raw UUID input
 * @returns Valid UUID or empty string
 */
export function sanitizeUUID(uuid: string | undefined | null): string {
  if (!uuid || typeof uuid !== 'string') {
    return '';
  }

  const trimmed = uuid.trim();

  if (!validator.isUUID(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Sanitize phone number input
 * @param phone - Raw phone number
 * @returns Sanitized phone number (digits only with +)
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except +
  const sanitized = phone.replace(/[^\d+]/g, '');

  // Validate basic phone number format
  if (sanitized.length < 10 || sanitized.length > 15) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize general text input (for notes, comments, etc.)
 * @param text - Raw text input
 * @param maxLength - Maximum allowed length (default 5000)
 * @returns Sanitized text
 */
export function sanitizeText(
  text: string | undefined | null,
  maxLength: number = 5000
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text.trim();

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML to prevent XSS
  sanitized = validator.escape(sanitized);

  return sanitized;
}

/**
 * Sanitize integer input
 * @param value - Raw value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default value if invalid
 * @returns Sanitized integer
 */
export function sanitizeInteger(
  value: string | number | undefined | null,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(num) || num < min || num > max) {
    return defaultValue;
  }

  return num;
}

/**
 * Sanitize pagination parameters
 * @param page - Page number from query
 * @param limit - Limit from query
 * @returns Sanitized pagination object
 */
export function sanitizePagination(
  page: string | number | undefined,
  limit: string | number | undefined
): { page: number; limit: number; skip: number } {
  const MAX_PAGE_SIZE = 100;
  const DEFAULT_PAGE_SIZE = 20;
  const MIN_PAGE = 1;
  const MAX_PAGE = 10000;

  const sanitizedPage = sanitizeInteger(page, MIN_PAGE, MAX_PAGE, 1);
  const sanitizedLimit = sanitizeInteger(limit, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip: (sanitizedPage - 1) * sanitizedLimit,
  };
}

/**
 * Sanitize date string
 * @param dateStr - Raw date string
 * @returns Valid ISO date string or empty string
 */
export function sanitizeDate(dateStr: string | undefined | null): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return '';
  }

  const trimmed = dateStr.trim();

  // Check if it's a valid ISO 8601 date
  if (!validator.isISO8601(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Sanitize URL input
 * @param url - Raw URL
 * @returns Valid URL or empty string
 */
export function sanitizeURL(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  if (!validator.isURL(trimmed, { require_protocol: true })) {
    return '';
  }

  return trimmed;
}
