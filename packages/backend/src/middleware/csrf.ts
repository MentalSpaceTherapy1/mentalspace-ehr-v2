import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';
import { Request } from 'express';
import { HttpError } from 'http-errors';

// Re-export HttpError for use by csrf handler
export type { HttpError };

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
  generateCsrfToken: generateCsrfTokenFn,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-me',
  // Session identifier for CSRF token binding
  // Uses auth token if available, otherwise falls back to IP + User-Agent hash
  getSessionIdentifier: (req: Request) => {
    // Try to use auth token from httpOnly cookie
    const authToken = req.cookies?.accessToken;
    if (authToken) {
      return authToken;
    }
    // Fallback: use combination of IP and User-Agent for unauthenticated requests
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    return `${ip}:${ua}`;
  },
  // Note: Using 'csrf-token' instead of '__Host-csrf' because __Host- prefix
  // requires specific conditions (no Domain, Secure flag) that may not work
  // consistently behind load balancers that terminate SSL
  cookieName: 'csrf-token',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
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
export const generateCsrfToken = generateCsrfTokenFn;

/**
 * Error handler for CSRF token errors
 */
export const csrfErrorHandler = invalidCsrfTokenError as HttpError;
