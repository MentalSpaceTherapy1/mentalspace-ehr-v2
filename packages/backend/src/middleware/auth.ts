import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { enforceSessionTimeout } from './sessionTimeout';
import sessionService from '../services/session.service';
import prisma from '../services/database';

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { userId: string; roles: string[] };
      session?: {
        sessionId: string;
        token: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using session-based authentication
 * Falls back to JWT for backward compatibility
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format. Use: Bearer <token>');
    }

    const token = parts[1];

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
        userId: user.id,
        email: user.email,
        roles: user.roles,
      } as any;

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

      // SUPER_ADMIN has absolute access to everything - bypass all role checks
      const isSuperAdmin = userRoles.some((role: string) =>
        role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN'
      );

      if (isSuperAdmin) {
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
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];

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
              userId: user.id,
              email: user.email,
              roles: user.roles,
            } as any;

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
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

// Export authenticate as authMiddleware for backwards compatibility
export const authMiddleware = authenticate;
