import rateLimit from 'express-rate-limit';
import { logSecurity } from '../utils/logger';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute-force attacks on login endpoints
 *
 * HIPAA Security Rule: Implement procedures to monitor login attempts
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Log rate limit violations for security monitoring
  handler: (req, res, next, options) => {
    logSecurity('Rate limit exceeded on auth endpoint', 'medium', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json(options.message);
  },

  // Skip rate limiting for whitelisted IPs (e.g., internal systems)
  skip: (req) => {
    const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    return whitelistedIPs.includes(req.ip || '');
  },
});

/**
 * Stricter rate limiter for password reset endpoints
 * More restrictive to prevent email spam and enumeration attacks
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again after 1 hour',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    logSecurity('Rate limit exceeded on password reset', 'high', {
      ip: req.ip,
      path: req.path,
      email: req.body.email, // Safe to log - not PHI
    });

    res.status(429).json(options.message);
  },
});

/**
 * General API rate limiter
 * Prevents API abuse and DoS attacks
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,

  // Skip authenticated users with valid JWT (they have their own limits)
  skip: (req) => {
    return !!req.user; // Skip if user is authenticated
  },
});

/**
 * Rate limiter for token refresh endpoint
 * More lenient than login since refresh is automatic and requires a valid token
 * Separated from authRateLimiter to prevent auto-refresh from consuming login quota
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Maximum 30 refresh attempts per window (auto-refresh is frequent)
  message: {
    success: false,
    message: 'Too many token refresh attempts, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    logSecurity('Rate limit exceeded on token refresh', 'medium', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json(options.message);
  },
});

/**
 * Rate limiter for account creation
 * Prevents automated account creation spam
 */
export const accountCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 account creations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    logSecurity('Rate limit exceeded on account creation', 'high', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json(options.message);
  },
});
