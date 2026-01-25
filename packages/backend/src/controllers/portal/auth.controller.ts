import { Request, Response } from 'express';
import { z } from 'zod';
import * as portalAuthService from '../../services/portal/auth.service';
import logger from '../../utils/logger';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendServerError } from '../../utils/apiResponse';
import { getErrorMessage, getErrorCode, getErrorStack, getErrorStatusCode } from '../../utils/errorHelpers';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  clientId: z.string().min(1), // Accept either UUID or MRN
});

const activateAccountSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  mrn: z.string().min(1), // Medical Record Number for identity verification
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

const changeTempPasswordSchema = z.object({
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

    logger.info('Portal account registered', {
      clientId: data.clientId,
      email: data.email,
    });

    return sendCreated(res, result, 'Portal account created successfully. Please check your email to verify your account.');
  } catch (error) {
    logger.error('Portal registration failed', {
      message: getErrorMessage(error),
      stack: process.env.NODE_ENV === 'development' ? getErrorStack(error) : undefined,
      statusCode: getErrorStatusCode(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to create portal account');
  }
};

// ============================================================================
// ACCOUNT ACTIVATION (For staff-invited clients)
// ============================================================================

export const activateAccount = async (req: Request, res: Response) => {
  try {
    const data = activateAccountSchema.parse(req.body);

    const result = await portalAuthService.activateAccount({
      token: data.token,
      email: data.email,
      password: data.password,
      mrn: data.mrn,
    });

    logger.info('Portal account activated', {
      email: data.email,
    });

    return sendSuccess(res, {
      email: result.email,
      clientName: result.clientName,
    }, result.message);
  } catch (error) {
    logger.error('Portal account activation failed', {
      message: getErrorMessage(error),
      stack: process.env.NODE_ENV === 'development' ? getErrorStack(error) : undefined,
      statusCode: getErrorStatusCode(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to activate portal account');
  }
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const data = verifyEmailSchema.parse(req.body);

    const result = await portalAuthService.verifyEmail(data.token);

    return sendSuccess(res, result, 'Email verified successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to verify email');
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const data = resendVerificationSchema.parse(req.body);

    const result = await portalAuthService.resendVerificationEmail(data.email);

    return sendSuccess(res, result, 'Verification email sent');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to resend verification email');
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

    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Login failed');
  }
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const data = requestPasswordResetSchema.parse(req.body);

    const result = await portalAuthService.requestPasswordReset(data.email);

    return sendSuccess(res, null, result.message);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to process password reset request');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const result = await portalAuthService.resetPassword({
      token: data.token,
      newPassword: data.newPassword,
    });

    return sendSuccess(res, null, result.message);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to reset password');
  }
};

// ============================================================================
// CHANGE PASSWORD (Authenticated)
// ============================================================================

export const changePassword = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = changePasswordSchema.parse(req.body);

    const result = await portalAuthService.changePassword({
      clientId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    return sendSuccess(res, null, result.message);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to change password');
  }
};

// ============================================================================
// CHANGE TEMP PASSWORD (First login with temporary password)
// ============================================================================

export const changeTempPassword = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = changeTempPasswordSchema.parse(req.body);

    const result = await portalAuthService.changeTempPassword({
      clientId,
      newPassword: data.newPassword,
    });

    return sendSuccess(res, {
      token: result.token,
      passwordExpiresAt: result.passwordExpiresAt,
    }, result.message);
  } catch (error) {
    logger.error('Temp password change failed', {
      message: getErrorMessage(error),
      clientId: req.portalAccount?.clientId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to set new password');
  }
};

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

export const getAccount = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const account = await portalAuthService.getAccount(clientId);

    return sendSuccess(res, account);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch account');
  }
};

export const updateAccountSettings = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = updateAccountSettingsSchema.parse(req.body);

    const result = await portalAuthService.updateAccountSettings({
      clientId,
      email: data.email,
      notificationPreferences: data.notificationPreferences,
    });

    return sendSuccess(res, result, 'Account settings updated successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to update account settings');
  }
};

export const deactivateAccount = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const result = await portalAuthService.deactivateAccount(clientId);

    return sendSuccess(res, null, result.message);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to deactivate account');
  }
};
