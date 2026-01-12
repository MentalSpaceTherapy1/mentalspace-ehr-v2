/**
 * Input Sanitization Middleware
 *
 * HIPAA Security: Prevents XSS, SQL injection, and other injection attacks.
 * Implements OWASP security best practices for input validation and sanitization.
 *
 * Security measures:
 * - HTML/JavaScript sanitization (XSS prevention)
 * - SQL injection pattern detection
 * - NoSQL injection prevention
 * - Path traversal prevention
 * - Command injection prevention
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Escape HTML entities to prevent XSS attacks
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
}

/**
 * Remove potentially dangerous HTML tags and attributes
 * This is a basic sanitizer - for rich text, use DOMPurify on frontend
 */
export function stripDangerousHtml(str: string): string {
  // Remove script tags and content
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, onload, etc.)
  str = str.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  str = str.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: and data: URLs
  str = str.replace(/javascript\s*:/gi, '');
  str = str.replace(/data\s*:/gi, 'data-blocked:');

  // Remove vbscript: URLs (for IE)
  str = str.replace(/vbscript\s*:/gi, '');

  // Remove expression() CSS (IE)
  str = str.replace(/expression\s*\(/gi, '');

  // Remove style tags
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove iframe, embed, object tags
  str = str.replace(/<(iframe|embed|object|applet|base|form|link|meta)[^>]*>/gi, '');
  str = str.replace(/<\/(iframe|embed|object|applet|base|form|link|meta)>/gi, '');

  return str;
}

/**
 * Detect and block potential SQL injection patterns
 */
export function containsSqlInjection(str: string): boolean {
  const sqlPatterns = [
    // Basic SQL keywords with suspicious context
    /'\s*(or|and)\s*('|--|\/\*|#)/i,
    /"\s*(or|and)\s*("|--|\/\*|#)/i,
    // UNION attacks
    /union\s+(all\s+)?select/i,
    // Comment-based attacks
    /--\s*$/,
    /\/\*.*\*\//,
    // Stacked queries
    /;\s*(drop|delete|update|insert|alter|create|truncate|exec|execute)/i,
    // Time-based blind injection
    /sleep\s*\(/i,
    /benchmark\s*\(/i,
    /waitfor\s+delay/i,
    // Common injection payloads
    /'\s*;\s*--/i,
    /'\s*or\s*'1'\s*=\s*'1/i,
    /'\s*or\s*1\s*=\s*1/i,
    // Load_file and outfile attacks
    /load_file\s*\(/i,
    /into\s+(outfile|dumpfile)/i,
    // Information schema access
    /information_schema/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(str));
}

/**
 * Detect and block potential NoSQL injection patterns
 */
export function containsNoSqlInjection(str: string): boolean {
  const noSqlPatterns = [
    // MongoDB operators (both unquoted and JSON-quoted forms)
    /["']?\$where["']?\s*:/i,
    /["']?\$gt["']?\s*:/i,
    /["']?\$lt["']?\s*:/i,
    /["']?\$ne["']?\s*:/i,
    /["']?\$regex["']?\s*:/i,
    /["']?\$or["']?\s*:/i,
    /["']?\$and["']?\s*:/i,
    /["']?\$not["']?\s*:/i,
    /["']?\$nor["']?\s*:/i,
    /["']?\$exists["']?\s*:/i,
    /["']?\$type["']?\s*:/i,
    /["']?\$expr["']?\s*:/i,
    // JavaScript injection in MongoDB
    /["']?\$function["']?\s*:/i,
    /["']?\$accumulator["']?\s*:/i,
  ];

  return noSqlPatterns.some(pattern => pattern.test(str));
}

/**
 * Detect and block path traversal attempts
 */
export function containsPathTraversal(str: string): boolean {
  const pathPatterns = [
    /\.\.\//,
    /\.\.\\/, // Windows path
    /%2e%2e%2f/i, // URL encoded
    /%2e%2e\//i,
    /%2e%2e%5c/i, // URL encoded backslash
    /\.\.%2f/i,
    /\.\.%5c/i,
    /\.\.\%c0%af/i, // Unicode encoding
    /\.\.\%c1%9c/i,
  ];

  return pathPatterns.some(pattern => pattern.test(str));
}

/**
 * Detect and block potential command injection patterns
 */
export function containsCommandInjection(str: string): boolean {
  const commandPatterns = [
    // Shell command separators
    /[;&|`$]/,
    // Command substitution
    /\$\(/,
    /`[^`]+`/,
    // Newline injection
    /[\r\n]/,
    // Pipe and redirection
    /[|><]/,
  ];

  // Only check if string looks like it might be used in a shell command
  // Most normal input will contain some of these chars
  const dangerousPatterns = [
    /;\s*(cat|ls|rm|mv|cp|wget|curl|nc|bash|sh|python|perl|ruby)/i,
    /\|\s*(cat|ls|rm|mv|cp|wget|curl|nc|bash|sh)/i,
    /&&\s*(cat|ls|rm|mv|cp|wget|curl|nc|bash|sh)/i,
    /`(cat|ls|rm|mv|cp|wget|curl|nc|bash|sh)/i,
    /\$\((cat|ls|rm|mv|cp|wget|curl|nc|bash|sh)/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize a string value
 */
export function sanitizeString(value: string, options: SanitizeOptions = {}): string {
  const {
    escapeHtml: shouldEscapeHtml = false,
    stripHtml = true,
    maxLength = 10000,
    trimWhitespace = true,
    allowNewlines = true,
  } = options;

  let sanitized = value;

  // Trim whitespace
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // SECURITY: Always strip dangerous HTML (script tags, event handlers, etc.)
  // This is applied regardless of stripHtml setting for security
  sanitized = stripDangerousHtml(sanitized);

  // Escape HTML entities if requested
  if (shouldEscapeHtml) {
    sanitized = escapeHtml(sanitized);
  }

  // Remove control characters except newlines/tabs if allowed
  if (allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  return sanitized;
}

// =============================================================================
// TYPES
// =============================================================================

export interface SanitizeOptions {
  escapeHtml?: boolean;
  stripHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
  allowNewlines?: boolean;
}

export interface SanitizationConfig {
  // Log suspicious input (for security monitoring)
  logSuspiciousInput?: boolean;
  // Block requests with SQL injection patterns
  blockSqlInjection?: boolean;
  // Block requests with NoSQL injection patterns
  blockNoSqlInjection?: boolean;
  // Block requests with path traversal patterns
  blockPathTraversal?: boolean;
  // Block requests with command injection patterns
  blockCommandInjection?: boolean;
  // Skip sanitization for certain paths
  skipPaths?: string[];
  // Fields that should allow HTML (like clinical notes)
  allowHtmlFields?: string[];
  // Maximum string length
  maxStringLength?: number;
}

const DEFAULT_CONFIG: SanitizationConfig = {
  logSuspiciousInput: true,
  blockSqlInjection: true,
  blockNoSqlInjection: true,
  blockPathTraversal: true,
  blockCommandInjection: true,
  skipPaths: ['/health', '/version'],
  allowHtmlFields: ['subjective', 'objective', 'assessment', 'plan', 'content', 'notes', 'description'],
  maxStringLength: 100000, // 100KB max for text fields
};

// =============================================================================
// RECURSIVE SANITIZATION
// =============================================================================

/**
 * Recursively sanitize an object
 */
function sanitizeValue(
  value: unknown,
  key: string,
  config: SanitizationConfig,
  path: string
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Check for injection patterns
    if (config.blockSqlInjection && containsSqlInjection(value)) {
      if (config.logSuspiciousInput) {
        logger.warn('Potential SQL injection detected', {
          path,
          key,
          pattern: 'SQL_INJECTION',
        });
      }
      throw new SanitizationError('Invalid input detected', 'SQL_INJECTION');
    }

    if (config.blockNoSqlInjection && containsNoSqlInjection(value)) {
      if (config.logSuspiciousInput) {
        logger.warn('Potential NoSQL injection detected', {
          path,
          key,
          pattern: 'NOSQL_INJECTION',
        });
      }
      throw new SanitizationError('Invalid input detected', 'NOSQL_INJECTION');
    }

    if (config.blockPathTraversal && containsPathTraversal(value)) {
      if (config.logSuspiciousInput) {
        logger.warn('Potential path traversal detected', {
          path,
          key,
          pattern: 'PATH_TRAVERSAL',
        });
      }
      throw new SanitizationError('Invalid input detected', 'PATH_TRAVERSAL');
    }

    if (config.blockCommandInjection && containsCommandInjection(value)) {
      if (config.logSuspiciousInput) {
        logger.warn('Potential command injection detected', {
          path,
          key,
          pattern: 'COMMAND_INJECTION',
        });
      }
      throw new SanitizationError('Invalid input detected', 'COMMAND_INJECTION');
    }

    // Determine if this field should allow HTML
    const allowHtml = config.allowHtmlFields?.includes(key);

    return sanitizeString(value, {
      stripHtml: !allowHtml,
      maxLength: config.maxStringLength,
      allowNewlines: true,
    });
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeValue(item, `${key}[${index}]`, config, path)
    );
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v, k, config, path);
    }
    return sanitized;
  }

  // Numbers, booleans, etc. pass through
  return value;
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class SanitizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number = 400;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SanitizationError';
    this.code = code;
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Create sanitization middleware with custom configuration
 */
export function createSanitizationMiddleware(config: Partial<SanitizationConfig> = {}) {
  const mergedConfig: SanitizationConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip sanitization for certain paths
      if (mergedConfig.skipPaths?.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body, 'body', mergedConfig, req.path);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query, 'query', mergedConfig, req.path) as typeof req.query;
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeValue(req.params, 'params', mergedConfig, req.path) as typeof req.params;
      }

      next();
    } catch (error) {
      if (error instanceof SanitizationError) {
        logger.warn('Input sanitization blocked request', {
          path: req.path,
          method: req.method,
          code: error.code,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Request contains invalid characters or patterns',
          },
        });
      }
      next(error);
    }
  };
}

/**
 * Default sanitization middleware
 */
export const sanitizationMiddleware = createSanitizationMiddleware();

// =============================================================================
// UTILITY FUNCTIONS FOR MANUAL SANITIZATION
// =============================================================================

/**
 * Sanitize an email address
 */
export function sanitizeEmail(email: string): string {
  // Remove any whitespace
  email = email.trim().toLowerCase();

  // Basic email sanitization - remove any characters that shouldn't be in email
  email = email.replace(/[<>'"`;\\]/g, '');

  return email;
}

/**
 * Sanitize a phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except + for international
  return phone.replace(/[^\d+\-() ]/g, '').trim();
}

/**
 * Sanitize a URL
 */
export function sanitizeUrl(url: string): string {
  // Remove javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(url)) {
    return '';
  }

  // Basic URL sanitization
  return url.replace(/[<>"'`]/g, '').trim();
}

/**
 * Sanitize a filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal
  filename = filename.replace(/\.\./g, '');
  filename = filename.replace(/[/\\]/g, '');

  // Remove dangerous characters
  filename = filename.replace(/[<>:"|?*\x00-\x1F]/g, '');

  // Limit length
  if (filename.length > 255) {
    const ext = filename.split('.').pop() || '';
    const name = filename.substring(0, 255 - ext.length - 1);
    filename = `${name}.${ext}`;
  }

  return filename.trim();
}

/**
 * Sanitize an ID (UUID or numeric)
 */
export function sanitizeId(id: string): string {
  // Allow only alphanumeric, hyphens, and underscores
  return id.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 100);
}

// Note: All functions are exported inline with 'export function' declarations above
