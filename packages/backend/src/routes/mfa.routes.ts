import { Router } from 'express';
import mfaController from '../controllers/mfa.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Multi-Factor Authentication (MFA) Routes
 * All routes require authentication
 *
 * NOTE: MFA is OPTIONAL - users can skip setup and use at any time
 */

/**
 * @route   GET /api/v1/mfa/status
 * @desc    Get MFA status for current user
 * @access  Private
 */
router.get('/status', authenticate, mfaController.getMFAStatus);

/**
 * @route   POST /api/v1/mfa/setup
 * @desc    Initiate MFA setup (generate secret and QR code)
 * @access  Private
 * @note    User can skip this step - MFA is optional
 */
router.post('/setup', authenticate, mfaController.setupMFA);

/**
 * @route   POST /api/v1/mfa/enable
 * @desc    Enable MFA after verification
 * @access  Private
 * @body    { secret: string, verificationCode: string, backupCodes: string[] }
 */
router.post('/enable', authenticate, mfaController.enableMFA);

/**
 * @route   POST /api/v1/mfa/disable
 * @desc    Disable MFA for user
 * @access  Private
 * @body    { verificationCode: string }
 */
router.post('/disable', authenticate, mfaController.disableMFA);

/**
 * @route   POST /api/v1/mfa/verify
 * @desc    Verify TOTP code or backup code
 * @access  Private
 * @body    { code: string }
 */
router.post('/verify', authenticate, mfaController.verifyMFA);

/**
 * @route   POST /api/v1/mfa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private
 * @body    { verificationCode: string }
 */
router.post('/backup-codes/regenerate', authenticate, mfaController.regenerateBackupCodes);

/**
 * @route   POST /api/v1/mfa/send-sms
 * @desc    Send SMS verification code to user's phone
 * @access  Private
 * @note    Requires phone number to be configured in user profile
 */
router.post('/send-sms', authenticate, mfaController.sendSMSCode);

/**
 * @route   POST /api/v1/mfa/enable-with-method
 * @desc    Enable MFA with method selection (TOTP, SMS, or BOTH)
 * @access  Private
 * @body    { method: 'TOTP' | 'SMS' | 'BOTH', secret: string, verificationCode: string, backupCodes: string[] }
 */
router.post('/enable-with-method', authenticate, mfaController.enableMFAWithMethod);

/**
 * @route   GET /api/v1/mfa/admin/users
 * @desc    Get all users with MFA status (admin only)
 * @access  Private (Admin/Super Admin only)
 */
router.get('/admin/users', authenticate, mfaController.getAllUsersWithMFAStatus);

/**
 * @route   POST /api/v1/mfa/admin/reset
 * @desc    Admin reset MFA for user (emergency access)
 * @access  Private (Admin/Super Admin only)
 * @body    { targetUserId: string, reason: string }
 */
router.post('/admin/reset', authenticate, mfaController.adminResetMFA);

export default router;
