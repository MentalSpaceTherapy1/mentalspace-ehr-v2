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

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const userId = (req as any).user?.userId || 'system';

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
