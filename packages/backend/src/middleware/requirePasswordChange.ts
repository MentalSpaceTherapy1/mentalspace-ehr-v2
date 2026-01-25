import { Request, Response, NextFunction } from 'express';
import prisma from '../services/database';
import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';

/**
 * Middleware to check if user must change password before accessing routes
 *
 * This should be applied AFTER authentication middleware
 * Place this middleware on routes that should be blocked if password change is required
 *
 * Exempted routes (password change is allowed even if mustChangePassword is true):
 * - /api/v1/auth/change-password
 * - /api/v1/users/change-password
 * - /api/v1/users/force-password-change
 * - /api/v1/auth/me
 * - /api/v1/auth/logout
 */
export async function requirePasswordChange(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Skip check for exempted routes
    const exemptedRoutes = [
      '/api/v1/auth/change-password',
      '/api/v1/users/change-password',
      '/api/v1/users/force-password-change',
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
    ];

    if (exemptedRoutes.includes(req.path)) {
      return next();
    }

    // Get user from request (set by authenticate middleware)
    const userId = req.user?.userId;

    if (!userId) {
      return next();  // Let authenticate middleware handle this
    }

    // Check if user must change password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true },
    });

    if (user?.mustChangePassword) {
      logger.warn('Access blocked: User must change password first', { userId });

      return res.status(403).json({
        success: false,
        error: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your password before accessing this resource',
        requiresPasswordChange: true,
      });
    }

    next();
  } catch (error) {
    logger.error('Error in requirePasswordChange middleware', { error });
    next(error);
  }
}

/**
 * Middleware to ensure user CAN change password
 * (i.e., they have the mustChangePassword flag set)
 *
 * Use this on the force password change endpoint
 */
export async function ensurePasswordChangeRequired(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true },
    });

    if (!user?.mustChangePassword) {
      return res.status(400).json({
        success: false,
        message: 'Password change is not required',
      });
    }

    next();
  } catch (error) {
    logger.error('Error in ensurePasswordChangeRequired middleware', { error });
    next(error);
  }
}
