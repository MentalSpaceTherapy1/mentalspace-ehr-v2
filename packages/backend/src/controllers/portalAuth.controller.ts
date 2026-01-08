import { Request, Response } from 'express';
import { z } from 'zod';
import * as portalAuthService from '../services/portalAuth.service';
import logger from '../utils/logger';

const registerSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Register a new client portal account
 * POST /api/v1/portal/auth/register
 *
 * This endpoint is used by staff members to create portal accounts for clients.
 * For HIPAA compliance, all portal account creations must be attributable to a specific
 * authenticated staff member, not a generic 'system' user.
 *
 * @requires Authentication - Staff member must be logged in
 * @param {string} req.body.clientId - UUID of the client to create portal account for
 * @param {string} req.body.email - Email address for portal login
 * @param {string} req.body.password - Password (min 8 characters)
 * @returns {Object} Created portal account details
 */
export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    // Require valid staff authentication for HIPAA compliance audit trail
    if (!userId) {
      logger.warn('Attempted to register portal account without authentication', {
        clientId: validatedData.clientId,
        email: validatedData.email,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Staff authentication required to create portal accounts.',
      });
    }

    const result = await portalAuthService.registerPortalAccount({
      clientId: validatedData.clientId,
      email: validatedData.email,
      password: validatedData.password,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Portal account created successfully. Please verify your email.',
      data: result,
    });
  } catch (error: any) {
    logger.error('Portal registration failed', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create portal account',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const result = await portalAuthService.portalLogin({
      email: validatedData.email,
      password: validatedData.password,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    logger.error('Portal login failed', {
      error: error.message,
    });
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid credentials',
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const validatedData = verifyEmailSchema.parse(req.body);

    await portalAuthService.verifyEmail(validatedData.token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    logger.error('Email verification failed', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify email',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);

    const result = await portalAuthService.requestPasswordReset(validatedData.email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { resetToken: result.resetToken }, // Remove in production
    });
  } catch (error: any) {
    logger.error('Password reset request failed', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);

    await portalAuthService.resetPassword(validatedData.token, validatedData.password);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    logger.error('Password reset failed', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password',
    });
  }
};

/**
 * Change password for portal account (first login with temp password)
 * POST /api/v1/portal/auth/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const portalAccountId = (req as any).user?.portalAccountId;

    if (!portalAccountId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await portalAuthService.changePortalPassword(
      portalAccountId,
      validatedData.currentPassword,
      validatedData.newPassword
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        passwordExpiresAt: result.passwordExpiresAt,
      },
    });
  } catch (error: any) {
    logger.error('Portal password change failed', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
};
