import { Request, Response } from 'express';
import mfaService from '../services/mfa.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError, ValidationError } from '../utils/errors';

/**
 * Multi-Factor Authentication (MFA) Controller
 *
 * Handles MFA setup and management endpoints (OPTIONAL feature):
 * - Setup MFA (generate secret and QR code)
 * - Enable MFA (with verification)
 * - Disable MFA (with verification)
 * - Verify MFA code
 * - Regenerate backup codes
 */

export class MFAController {
  /**
   * POST /api/v1/mfa/setup
   * Generate MFA secret and QR code for user
   * User can choose to skip this step - MFA is OPTIONAL
   */
  setupMFA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const mfaData = await mfaService.generateMFASecret(userId);

    res.status(200).json({
      success: true,
      message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
      data: {
        qrCodeUrl: mfaData.qrCodeUrl,
        manualEntryKey: mfaData.manualEntryKey,
        backupCodes: mfaData.backupCodes,
        secret: mfaData.secret,
      },
    });
  });

  /**
   * POST /api/v1/mfa/enable
   * Enable MFA for user after verifying TOTP code
   * Body: { secret: string, verificationCode: string, backupCodes: string[] }
   */
  enableMFA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { secret, verificationCode, backupCodes } = req.body;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!secret || !verificationCode || !backupCodes || !Array.isArray(backupCodes)) {
      throw new ValidationError(
        'Missing required fields: secret, verificationCode, and backupCodes'
      );
    }

    await mfaService.enableMFA(userId, secret, verificationCode, backupCodes);

    res.status(200).json({
      success: true,
      message: 'MFA enabled successfully',
    });
  });

  /**
   * POST /api/v1/mfa/disable
   * Disable MFA for user with verification
   * Body: { verificationCode: string }
   */
  disableMFA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { verificationCode } = req.body;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!verificationCode) {
      throw new ValidationError('Verification code is required');
    }

    await mfaService.disableMFA(userId, verificationCode);

    res.status(200).json({
      success: true,
      message: 'MFA disabled successfully',
    });
  });

  /**
   * POST /api/v1/mfa/verify
   * Verify a TOTP code (used during login)
   * Body: { code: string }
   */
  verifyMFA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!code) {
      throw new ValidationError('Verification code is required');
    }

    const isValid = await mfaService.verifyTOTPForLogin(userId, code);

    if (!isValid) {
      // Try backup code
      const isBackupValid = await mfaService.verifyBackupCode(userId, code);

      if (!isBackupValid) {
        throw new UnauthorizedError('Invalid verification code');
      }

      return res.status(200).json({
        success: true,
        message: 'Backup code verified successfully',
        usedBackupCode: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'MFA code verified successfully',
      usedBackupCode: false,
    });
  });

  /**
   * POST /api/v1/mfa/backup-codes/regenerate
   * Regenerate backup codes for user
   * Body: { verificationCode: string }
   */
  regenerateBackupCodes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { verificationCode } = req.body;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!verificationCode) {
      throw new ValidationError('Verification code is required');
    }

    const newBackupCodes = await mfaService.regenerateBackupCodes(userId, verificationCode);

    res.status(200).json({
      success: true,
      message: 'Backup codes regenerated successfully',
      data: {
        backupCodes: newBackupCodes,
      },
    });
  });

  /**
   * GET /api/v1/mfa/status
   * Get MFA status for current user
   */
  getMFAStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const status = await mfaService.getMFAStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  });

  /**
   * POST /api/v1/mfa/send-sms
   * Send SMS verification code to user's phone
   */
  sendSMSCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    await mfaService.sendSMSCode(userId);

    res.status(200).json({
      success: true,
      message: 'SMS verification code sent successfully',
    });
  });

  /**
   * POST /api/v1/mfa/enable-with-method
   * Enable MFA with method selection (TOTP, SMS, or BOTH)
   * Body: { method: 'TOTP' | 'SMS' | 'BOTH', secret: string, verificationCode: string, backupCodes: string[] }
   */
  enableMFAWithMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { method, secret, verificationCode, backupCodes } = req.body;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!method || !verificationCode || !backupCodes || !Array.isArray(backupCodes)) {
      throw new ValidationError(
        'Missing required fields: method, verificationCode, and backupCodes'
      );
    }

    if (!['TOTP', 'SMS', 'BOTH'].includes(method)) {
      throw new ValidationError('Invalid method. Must be TOTP, SMS, or BOTH');
    }

    if ((method === 'TOTP' || method === 'BOTH') && !secret) {
      throw new ValidationError('Secret is required for TOTP and BOTH methods');
    }

    await mfaService.enableMFAWithMethod(userId, method, secret, verificationCode, backupCodes);

    res.status(200).json({
      success: true,
      message: `MFA enabled successfully with ${method} method`,
    });
  });

  /**
   * GET /api/v1/mfa/admin/users
   * Get all users with MFA status (admin only)
   */
  getAllUsersWithMFAStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Check if user has admin or super_admin role
    if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      throw new UnauthorizedError('Admin access required');
    }

    const users = await mfaService.getAllUsersWithMFAStatus();

    res.status(200).json({
      success: true,
      data: { users },
    });
  });

  /**
   * POST /api/v1/mfa/admin/reset
   * Admin reset MFA for user (emergency access)
   * Body: { targetUserId: string, reason: string }
   */
  adminResetMFA = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    const adminRoles = req.user?.roles || [];
    const { targetUserId, reason } = req.body;

    if (!adminId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Check if user has admin or super_admin role
    if (!adminRoles.includes('ADMIN') && !adminRoles.includes('SUPER_ADMIN')) {
      throw new UnauthorizedError('Admin access required');
    }

    if (!targetUserId || !reason) {
      throw new ValidationError('Missing required fields: targetUserId and reason');
    }

    await mfaService.adminResetMFA(targetUserId, adminId, reason);

    res.status(200).json({
      success: true,
      message: 'MFA reset successfully for user',
    });
  });
}

export default new MFAController();
