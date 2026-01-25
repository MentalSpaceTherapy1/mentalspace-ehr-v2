import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { enforceSessionTimeout } from './sessionTimeout';
import sessionService from '../services/session.service';
import prisma from '../services/database';
import logger from '../utils/logger';
import { UserRoles } from '@mentalspace/shared';
// Phase 5.4: Import consolidated Express types (global declaration in types/express.d.ts)
import { AuthUser } from '../types/express.d';

// Cookie name for access token (must match auth.controller.ts)
const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Extract token from request
 * Priority: httpOnly cookie > Authorization header
 * HIPAA Security: Prefers httpOnly cookies to prevent XSS token theft
 */
const extractToken = (req: Request): string | null => {
  // 1. First check httpOnly cookie (most secure - recommended)
  if (req.cookies?.[ACCESS_TOKEN_COOKIE]) {
    return req.cookies[ACCESS_TOKEN_COOKIE];
  }

  // 2. Fallback to Authorization header (for backward compatibility / API clients)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  return null;
};

/**
 * Middleware to authenticate requests using session-based authentication
 * Falls back to JWT for backward compatibility
 *
 * HIPAA Security: Accepts tokens from httpOnly cookies (preferred) or Authorization header
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from cookie or Authorization header
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    // Try session-based authentication first
    const sessionData = await sessionService.validateSession(token);

    if (sessionData) {
      // Session is valid - fetch user data
      const user = await prisma.user.findUnique({
        where: { id: sessionData.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          isActive: true,
          mfaEnabled: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Attach user and session to request
      req.user = {
        id: user.id,
        userId: user.id,
        email: user.email,
        roles: user.roles,
      } as AuthUser;

      req.session = {
        sessionId: sessionData.sessionId,
        token: token,
      };

      // Update session activity (handled by session service)
      await sessionService.updateActivity(sessionData.sessionId);

      return next();
    }

    // Fallback to JWT authentication for backward compatibility
    try {
      const payload = verifyToken(token);
      req.user = payload;
      enforceSessionTimeout(req, res);
      return next();
    } catch (jwtError) {
      throw new UnauthorizedError('Invalid or expired session');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authorize specific roles
 * User must have at least ONE of the allowed roles
 * SUPER_ADMIN always has access to everything
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Handle backward compatibility: old tokens may have 'role' instead of 'roles'
      // @ts-ignore - for backward compatibility with old tokens
      const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);

      // SUPER_ADMIN has absolute access to everything - but MUST be audited
      const isSuperAdmin = userRoles.some((role: string) =>
        role === UserRoles.SUPER_ADMIN
      );

      if (isSuperAdmin) {
        // CRITICAL: Audit ALL SUPER_ADMIN actions before bypassing authorization
        logger.warn('SUPER_ADMIN authorization bypass', {
          userId: req.user.userId || req.user.id,
          email: req.user.email,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestedRoles: allowedRoles,
          timestamp: new Date().toISOString(),
          action: 'SUPER_ADMIN_BYPASS',
        });

        // Also create audit log entry in database for compliance
        prisma.auditLog.create({
          data: {
            userId: req.user.userId || req.user.id,
            action: 'SUPER_ADMIN_AUTHORIZATION_BYPASS',
            entityType: 'AUTHORIZATION',
            entityId: req.path,
            changes: {
              method: req.method,
              path: req.path,
              requiredRoles: allowedRoles,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
          },
        }).catch((err) => {
          // Don't block the request if audit logging fails, but log the error
          logger.error('Failed to create SUPER_ADMIN audit log', { error: err });
        });

        return next();
      }

      // Check if user has any of the allowed roles
      const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

      if (!hasAllowedRole) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail if missing
 * HIPAA Security: Accepts tokens from httpOnly cookies (preferred) or Authorization header
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from cookie or Authorization header
    const token = extractToken(req);

    if (token) {
      // Try session-based authentication first
      const sessionData = await sessionService.validateSession(token);

      if (sessionData) {
        const user = await prisma.user.findUnique({
          where: { id: sessionData.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roles: true,
            isActive: true,
          },
        });

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            userId: user.id,
            email: user.email,
            roles: user.roles,
          } as AuthUser;

          req.session = {
            sessionId: sessionData.sessionId,
            token: token,
          };

          await sessionService.updateActivity(sessionData.sessionId);
        }
      } else {
        // Fallback to JWT
        try {
          const payload = verifyToken(token);
          req.user = payload;
          enforceSessionTimeout(req, res);
        } catch {
          // Ignore JWT errors for optional auth
        }
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

// Export authenticate as authMiddleware for backwards compatibility
export const authMiddleware = authenticate;
