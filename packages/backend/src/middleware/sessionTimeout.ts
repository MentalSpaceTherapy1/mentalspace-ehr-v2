import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

/**
 * HIPAA Compliance: Automatic Session Timeout
 *
 * HIPAA Security Rule requires automatic logoff after a predetermined
 * time of inactivity (typically 15 minutes for healthcare applications).
 *
 * This middleware validates that the JWT token includes an 'iat' (issued at)
 * timestamp and enforces a maximum session duration.
 */

// Session timeout in milliseconds (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Maximum session lifetime (even with activity) - 8 hours
const MAX_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

export const sessionTimeoutMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only check authenticated requests
    if (!req.user) {
      return next();
    }

    const currentTime = Date.now();
    const tokenIssuedAt = req.user.iat ? req.user.iat * 1000 : 0; // Convert to milliseconds
    const lastActivity = (req.user.lastActivity || tokenIssuedAt);

    // Check if session has exceeded maximum lifetime
    if (tokenIssuedAt && currentTime - tokenIssuedAt > MAX_SESSION_LIFETIME_MS) {
      throw new UnauthorizedError(
        'Session expired. Maximum session lifetime exceeded. Please log in again.'
      );
    }

    // Check for inactivity timeout
    if (lastActivity && currentTime - lastActivity > SESSION_TIMEOUT_MS) {
      throw new UnauthorizedError(
        'Session expired due to inactivity. Please log in again.'
      );
    }

    // Update last activity timestamp in response header
    // Frontend should track this and refresh token before timeout
    res.setHeader('X-Session-Timeout', SESSION_TIMEOUT_MS.toString());
    res.setHeader('X-Session-Expires-At', (lastActivity + SESSION_TIMEOUT_MS).toString());

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Get remaining session time in milliseconds
 */
export const getRemainingSessionTime = (req: Request): number => {
  if (!req.user || !req.user.iat) {
    return 0;
  }

  const currentTime = Date.now();
  const tokenIssuedAt = req.user.iat * 1000;
  const lastActivity = req.user.lastActivity || tokenIssuedAt;
  const expiresAt = lastActivity + SESSION_TIMEOUT_MS;

  return Math.max(0, expiresAt - currentTime);
};

/**
 * Check if session is about to expire (within 2 minutes)
 */
export const isSessionAboutToExpire = (req: Request): boolean => {
  const remaining = getRemainingSessionTime(req);
  return remaining > 0 && remaining < 2 * 60 * 1000; // Less than 2 minutes
};
