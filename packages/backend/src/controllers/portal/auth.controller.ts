import { Request, Response } from 'express';
import { z } from 'zod';
import * as portalAuthService from '../../services/portal/auth.service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  clientId: z.string().uuid(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const updateAccountSettingsSchema = z.object({
  email: z.string().email().optional(),
  notificationPreferences: z
    .object({
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      appointmentReminders: z.boolean().optional(),
      messageAlerts: z.boolean().optional(),
      billingAlerts: z.boolean().optional(),
    })
    .optional(),
});

// ============================================================================
// REGISTRATION
// ============================================================================

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const result = await portalAuthService.register({
      email: data.email,
      password: data.password,
      clientId: data.clientId,
    });

    res.status(201).json({
      success: true,
      message: 'Portal account created successfully. Please check your email to verify your account.',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create portal account',
    });
  }
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const data = verifyEmailSchema.parse(req.body);

    const result = await portalAuthService.verifyEmail(data.token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to verify email',
    });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const data = resendVerificationSchema.parse(req.body);

    const result = await portalAuthService.resendVerificationEmail(data.email);

    res.status(200).json({
      success: true,
      message: 'Verification email sent',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to resend verification email',
    });
  }
};

// ============================================================================
// LOGIN
// ============================================================================

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await portalAuthService.login({
      email: data.email,
      password: data.password,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const data = requestPasswordResetSchema.parse(req.body);

    const result = await portalAuthService.requestPasswordReset(data.email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to process password reset request',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const result = await portalAuthService.resetPassword({
      token: data.token,
      newPassword: data.newPassword,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to reset password',
    });
  }
};

// ============================================================================
// CHANGE PASSWORD (Authenticated)
// ============================================================================

export const changePassword = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const data = changePasswordSchema.parse(req.body);

    const result = await portalAuthService.changePassword({
      clientId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
};

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

export const getAccount = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    const account = await portalAuthService.getAccount(clientId);

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch account',
    });
  }
};

export const updateAccountSettings = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const data = updateAccountSettingsSchema.parse(req.body);

    const result = await portalAuthService.updateAccountSettings({
      clientId,
      email: data.email,
      notificationPreferences: data.notificationPreferences,
    });

    res.status(200).json({
      success: true,
      message: 'Account settings updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update account settings',
    });
  }
};

export const deactivateAccount = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    const result = await portalAuthService.deactivateAccount(clientId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to deactivate account',
    });
  }
};
