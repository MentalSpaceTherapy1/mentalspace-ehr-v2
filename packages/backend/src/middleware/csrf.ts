import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

/**
 * CSRF Protection Middleware
 *
 * Protects against Cross-Site Request Forgery attacks
 * Uses Double Submit Cookie pattern with signed cookies
 *
 * Implementation:
 * - Generates CSRF token for each session
 * - Validates token on all state-changing requests (POST, PUT, DELETE, PATCH)
 * - Uses httpOnly, secure, sameSite cookies
 * - Compatible with frontend SPA architecture
 */

const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-me',
  cookieName: '__Host-csrf',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    sameSite: 'strict', // Strict same-site policy
    path: '/',
    maxAge: 3600000, // 1 hour
  },
  size: 64, // Token size in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for read-only requests
});

/**
 * Cookie parser middleware (required for CSRF)
 */
export const csrfCookieParser = cookieParser(process.env.COOKIE_SECRET || 'default-cookie-secret-change-me');

/**
 * CSRF protection middleware
 * Apply to all routes that modify state
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Generate CSRF token for client
 * Call this in a GET endpoint to provide token to frontend
 */
export const generateCsrfToken = generateToken;

/**
 * Error handler for CSRF token errors
 */
export const csrfErrorHandler: typeof invalidCsrfTokenError = invalidCsrfTokenError;
