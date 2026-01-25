/**
 * Frontend Input Sanitization Utilities
 *
 * HIPAA Security: Prevents XSS attacks in the frontend
 *
 * NOTE: For production, install DOMPurify: npm install dompurify @types/dompurify
 * DOMPurify is the gold standard for HTML sanitization in the browser.
 *
 * This module provides:
 * - Basic sanitization without DOMPurify (fallback)
 * - DOMPurify integration when available
 * - Input validation helpers
 */

// Try to import DOMPurify if available
let DOMPurify: typeof import('dompurify') | null = null;

// Dynamic import for DOMPurify (optional dependency)
const initDOMPurify = async () => {
  try {
    DOMPurify = await import('dompurify');
  } catch {
    console.warn(
      'DOMPurify not installed. Using basic sanitization. ' +
      'For enhanced security, run: npm install dompurify @types/dompurify'
    );
  }
};

// Initialize on module load
initDOMPurify();

// =============================================================================
// BASIC SANITIZATION (Fallback without DOMPurify)
// =============================================================================

/**
 * Escape HTML entities to prevent XSS
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
 * Basic HTML stripping (fallback without DOMPurify)
 */
function stripDangerousHtmlBasic(html: string): string {
  // Remove script tags and content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: URLs
  html = html.replace(/javascript\s*:/gi, '');
  html = html.replace(/data\s*:/gi, 'data-blocked:');
  html = html.replace(/vbscript\s*:/gi, '');

  // Remove style tags
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove dangerous elements
  html = html.replace(/<(iframe|embed|object|applet|base|form|link|meta)[^>]*>/gi, '');
  html = html.replace(/<\/(iframe|embed|object|applet|base|form|link|meta)>/gi, '');

  return html;
}

// =============================================================================
// MAIN SANITIZATION FUNCTIONS
// =============================================================================

export interface SanitizeOptions {
  allowHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
}

/**
 * Sanitize HTML content
 *
 * Uses DOMPurify if available, falls back to basic sanitization
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const { maxLength = 100000 } = options;

  // Truncate if too long
  if (html.length > maxLength) {
    html = html.substring(0, maxLength);
  }

  // Use DOMPurify if available
  if (DOMPurify && DOMPurify.default) {
    const domPurifyOptions: Record<string, unknown> = {};

    if (options.allowedTags) {
      domPurifyOptions.ALLOWED_TAGS = options.allowedTags;
    }

    if (options.allowedAttributes) {
      domPurifyOptions.ALLOWED_ATTR = options.allowedAttributes;
    }

    return DOMPurify.default.sanitize(html, domPurifyOptions);
  }

  // Fallback to basic sanitization
  return stripDangerousHtmlBasic(html);
}

/**
 * Sanitize plain text input (no HTML allowed)
 */
export function sanitizeText(text: string, maxLength: number = 10000): string {
  // Trim whitespace
  text = text.trim();

  // Truncate if too long
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }

  // Remove control characters (except newlines and tabs)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML entities
  return escapeHtml(text);
}

/**
 * Sanitize clinical note content (allows safe HTML for formatting)
 */
export function sanitizeClinicalNote(content: string): string {
  const allowedTags = [
    'p', 'br', 'b', 'i', 'u', 'strong', 'em',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ];

  const allowedAttributes = [
    'class', 'style', // For text formatting
  ];

  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes,
    maxLength: 500000, // Clinical notes can be long
  });
}

// =============================================================================
// INPUT VALIDATION HELPERS
// =============================================================================

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  email = email.trim().toLowerCase();
  email = email.replace(/[<>'"`;\\]/g, '');
  return email;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+\-() ]/g, '').trim();
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Allow various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  const digits = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digits.length >= 10 && digits.length <= 15;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  // Block dangerous URL schemes
  if (/^(javascript|data|vbscript):/i.test(url)) {
    return '';
  }
  return url.replace(/[<>"'`]/g, '').trim();
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize ZIP code
 */
export function sanitizeZipCode(zip: string): string {
  return zip.replace(/[^\d-]/g, '').substring(0, 10);
}

/**
 * Validate ZIP code format
 */
export function isValidZipCode(zip: string): boolean {
  // US ZIP: 12345 or 12345-6789
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

/**
 * Sanitize MRN (Medical Record Number)
 */
export function sanitizeMRN(mrn: string): string {
  // Allow alphanumeric and hyphens only
  return mrn.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50);
}

/**
 * Sanitize NPI (National Provider Identifier)
 */
export function sanitizeNPI(npi: string): string {
  // NPI is 10 digits
  return npi.replace(/\D/g, '').substring(0, 10);
}

/**
 * Validate NPI format
 */
export function isValidNPI(npi: string): boolean {
  const digits = npi.replace(/\D/g, '');
  return digits.length === 10;
}

// =============================================================================
// FORM INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize form data object
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
  fieldConfig: Record<keyof T, 'text' | 'html' | 'email' | 'phone' | 'zip' | 'raw'>
): T {
  const sanitized = { ...data };

  for (const [key, type] of Object.entries(fieldConfig)) {
    const value = sanitized[key as keyof T];
    if (typeof value !== 'string') continue;

    switch (type) {
      case 'text':
        (sanitized as Record<string, unknown>)[key] = sanitizeText(value);
        break;
      case 'html':
        (sanitized as Record<string, unknown>)[key] = sanitizeHtml(value);
        break;
      case 'email':
        (sanitized as Record<string, unknown>)[key] = sanitizeEmail(value);
        break;
      case 'phone':
        (sanitized as Record<string, unknown>)[key] = sanitizePhoneNumber(value);
        break;
      case 'zip':
        (sanitized as Record<string, unknown>)[key] = sanitizeZipCode(value);
        break;
      case 'raw':
        // No sanitization - use with caution
        break;
    }
  }

  return sanitized;
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook for sanitized input handling
 *
 * Usage:
 * const [value, setValue, sanitizedValue] = useSanitizedInput('text');
 */
export function useSanitizedInput(
  type: 'text' | 'html' | 'email' | 'phone' = 'text',
  initialValue: string = ''
): [string, (value: string) => void, string] {
  const [rawValue, setRawValue] = React.useState(initialValue);

  const sanitizedValue = React.useMemo(() => {
    switch (type) {
      case 'html':
        return sanitizeHtml(rawValue);
      case 'email':
        return sanitizeEmail(rawValue);
      case 'phone':
        return sanitizePhoneNumber(rawValue);
      default:
        return sanitizeText(rawValue);
    }
  }, [rawValue, type]);

  return [rawValue, setRawValue, sanitizedValue];
}

// Import React for the hook
import * as React from 'react';

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeClinicalNote,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeUrl,
  sanitizeZipCode,
  sanitizeMRN,
  sanitizeNPI,
  sanitizeFormData,
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  isValidZipCode,
  isValidNPI,
  escapeHtml,
  useSanitizedInput,
};
