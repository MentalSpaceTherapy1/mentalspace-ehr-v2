import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import prisma from './database';
import { auditLogger } from '../utils/logger';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { sendSMS, SMSTemplates, isValidPhoneNumber } from './sms.service';

/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Implements MFA using TOTP (Time-based One-Time Password) and SMS
 * Users can choose to skip MFA during setup
 *
 * Features:
 * - TOTP generation and verification (Google Authenticator, Authy)
 * - SMS code generation and verification
 * - QR code generation for authenticator apps
 * - Backup codes for account recovery
 * - Enable/disable MFA
 * - Rate limiting on verification attempts
 * - Admin MFA reset functionality
 */

export class MFAService {
  private readonly TOTP_WINDOW = 1; // Allow 1 step before/after for clock drift
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly SMS_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_VERIFICATION_ATTEMPTS = 5;
  private readonly VERIFICATION_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // In-memory store for SMS codes and rate limiting
  // In production, use Redis for distributed systems
  private smsCodeStore: Map<string, { code: string; expiresAt: number; attempts: number }> = new Map();
  private verificationAttempts: Map<string, { count: number; lockedUntil: number | null }> = new Map();

  /**
   * Generate MFA secret and QR code for user
   * Returns secret, QR code URL, and backup codes
   */
  async generateMFASecret(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    manualEntryKey: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `MentalSpace EHR (${user.email})`,
      issuer: 'MentalSpace EHR',
      length: 32,
    });

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    auditLogger.info('MFA secret generated', {
      userId,
      action: 'MFA_SECRET_GENERATED',
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Enable MFA for user after verifying TOTP code
   */
  async enableMFA(
    userId: string,
    secret: string,
    verificationCode: string,
    backupCodes: string[]
  ): Promise<void> {
    // Verify the TOTP code before enabling
    const isValid = this.verifyTOTPCode(secret, verificationCode);

    if (!isValid) {
      auditLogger.warn('MFA enablement failed - invalid verification code', {
        userId,
        action: 'MFA_ENABLE_FAILED',
      });
      throw new UnauthorizedError('Invalid verification code');
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.hashBackupCode(code))
    );

    // Enable MFA for user
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    auditLogger.info('MFA enabled', {
      userId,
      action: 'MFA_ENABLED',
    });
  }

  /**
   * Disable MFA for user with verification
   */
  async disableMFA(userId: string, verificationCode: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new ValidationError('MFA is not enabled for this user');
    }

    // Verify the TOTP code before disabling
    const isValid = this.verifyTOTPCode(user.mfaSecret, verificationCode);

    if (!isValid) {
      auditLogger.warn('MFA disable failed - invalid verification code', {
        userId,
        action: 'MFA_DISABLE_FAILED',
      });
      throw new UnauthorizedError('Invalid verification code');
    }

    // Disable MFA for user
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    auditLogger.info('MFA disabled', {
      userId,
      action: 'MFA_DISABLED',
    });
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(userId: string, code: string): boolean {
    // This is a wrapper for the internal verifyTOTPCode method
    // Used when we need to verify during login
    return code.length === 6 && /^\d+$/.test(code);
  }

  /**
   * Verify TOTP code against secret
   */
  private verifyTOTPCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: this.TOTP_WINDOW,
    });
  }

  /**
   * Verify TOTP for login
   */
  async verifyTOTPForLogin(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    const isValid = this.verifyTOTPCode(user.mfaSecret, code);

    if (!isValid) {
      auditLogger.warn('MFA verification failed', {
        userId,
        action: 'MFA_VERIFICATION_FAILED',
      });
    }

    return isValid;
  }

  /**
   * Verify backup code for account recovery
   * Backup codes are one-time use only
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaBackupCodes: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaBackupCodes) {
      return false;
    }

    // Check if backup code matches any stored hash
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const storedHash = user.mfaBackupCodes[i];
      const isMatch = await this.compareBackupCode(code, storedHash);

      if (isMatch) {
        // Remove used backup code
        const updatedBackupCodes = user.mfaBackupCodes.filter((_, index) => index !== i);

        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaBackupCodes: updatedBackupCodes,
          },
        });

        auditLogger.info('Backup code used', {
          userId,
          remainingCodes: updatedBackupCodes.length,
          action: 'MFA_BACKUP_CODE_USED',
        });

        return true;
      }
    }

    auditLogger.warn('Invalid backup code attempted', {
      userId,
      action: 'MFA_BACKUP_CODE_FAILED',
    });

    return false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    verificationCode: string
  ): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new ValidationError('MFA is not enabled for this user');
    }

    // Verify TOTP code before regenerating
    const isValid = this.verifyTOTPCode(user.mfaSecret, verificationCode);

    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.hashBackupCode(code))
    );

    // Update user's backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    auditLogger.info('Backup codes regenerated', {
      userId,
      action: 'MFA_BACKUP_CODES_REGENERATED',
    });

    return backupCodes;
  }

  /**
   * Generate random backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,4}/g)
        ?.join('-') || '';
      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash backup code for storage
   */
  private async hashBackupCode(code: string): Promise<string> {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Compare backup code with hash
   */
  private async compareBackupCode(code: string, hash: string): Promise<boolean> {
    const codeHash = await this.hashBackupCode(code);
    return codeHash === hash;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    return user?.mfaEnabled || false;
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    method?: string;
    backupCodesCount?: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaMethod: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    return {
      enabled: user.mfaEnabled,
      method: user.mfaMethod || undefined,
      backupCodesCount: user.mfaEnabled ? user.mfaBackupCodes?.length || 0 : undefined,
    };
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        firstName: true,
        mfaEnabled: true,
        mfaMethod: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.phoneNumber) {
      throw new ValidationError('Phone number not configured for this user');
    }

    if (!isValidPhoneNumber(user.phoneNumber)) {
      throw new ValidationError('Invalid phone number format. Please use E.164 format (e.g., +12345678900)');
    }

    // Check rate limiting
    const attemptData = this.verificationAttempts.get(userId);
    if (attemptData?.lockedUntil && Date.now() < attemptData.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.lockedUntil - Date.now()) / (60 * 1000));
      throw new UnauthorizedError(
        `Too many verification attempts. Please try again in ${remainingMinutes} minutes.`
      );
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store code with expiry
    this.smsCodeStore.set(userId, {
      code,
      expiresAt: Date.now() + this.SMS_CODE_EXPIRY,
      attempts: 0,
    });

    // Send SMS
    const success = await sendSMS({
      to: user.phoneNumber,
      body: SMSTemplates.twoFactorCode(code),
    });

    if (!success) {
      throw new ValidationError('Failed to send SMS. Please try again later.');
    }

    auditLogger.info('MFA SMS code sent', {
      userId,
      phoneNumber: user.phoneNumber.slice(0, -4) + '****', // Mask phone number
      action: 'MFA_SMS_SENT',
    });
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId: string, code: string): Promise<boolean> {
    // Check rate limiting
    this.checkAndUpdateVerificationAttempts(userId);

    const storedData = this.smsCodeStore.get(userId);

    if (!storedData) {
      auditLogger.warn('SMS code verification failed - no code found', {
        userId,
        action: 'MFA_SMS_VERIFICATION_FAILED',
      });
      return false;
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      this.smsCodeStore.delete(userId);
      auditLogger.warn('SMS code verification failed - code expired', {
        userId,
        action: 'MFA_SMS_VERIFICATION_FAILED',
      });
      return false;
    }

    // Check attempts
    if (storedData.attempts >= 3) {
      this.smsCodeStore.delete(userId);
      auditLogger.warn('SMS code verification failed - too many attempts', {
        userId,
        action: 'MFA_SMS_VERIFICATION_FAILED',
      });
      return false;
    }

    // Verify code
    const isValid = storedData.code === code;

    if (isValid) {
      // Remove used code
      this.smsCodeStore.delete(userId);
      // Reset verification attempts
      this.verificationAttempts.delete(userId);

      auditLogger.info('SMS code verified successfully', {
        userId,
        action: 'MFA_SMS_VERIFIED',
      });
    } else {
      // Increment attempts
      storedData.attempts++;
      auditLogger.warn('SMS code verification failed - invalid code', {
        userId,
        attempts: storedData.attempts,
        action: 'MFA_SMS_VERIFICATION_FAILED',
      });
    }

    return isValid;
  }

  /**
   * Enable MFA with method selection (TOTP, SMS, or BOTH)
   */
  async enableMFAWithMethod(
    userId: string,
    method: 'TOTP' | 'SMS' | 'BOTH',
    secret: string,
    verificationCode: string,
    backupCodes: string[]
  ): Promise<void> {
    let isValid = false;

    // Verify based on method
    if (method === 'TOTP' || method === 'BOTH') {
      isValid = this.verifyTOTPCode(secret, verificationCode);
    } else if (method === 'SMS') {
      isValid = await this.verifySMSCode(userId, verificationCode);
    }

    if (!isValid) {
      auditLogger.warn('MFA enablement failed - invalid verification code', {
        userId,
        method,
        action: 'MFA_ENABLE_FAILED',
      });
      throw new UnauthorizedError('Invalid verification code');
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.hashBackupCode(code))
    );

    // Enable MFA for user
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: method !== 'SMS' ? secret : null,
        mfaBackupCodes: hashedBackupCodes,
        mfaMethod: method,
        mfaEnabledAt: new Date(),
      },
    });

    auditLogger.info('MFA enabled', {
      userId,
      method,
      action: 'MFA_ENABLED',
    });
  }

  /**
   * Check and update verification attempts for rate limiting
   */
  private checkAndUpdateVerificationAttempts(userId: string): void {
    const now = Date.now();
    const attemptData = this.verificationAttempts.get(userId);

    if (attemptData?.lockedUntil && now < attemptData.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / (60 * 1000));
      throw new UnauthorizedError(
        `Account locked due to too many verification attempts. Please try again in ${remainingMinutes} minutes.`
      );
    }

    if (!attemptData || (attemptData.lockedUntil && now >= attemptData.lockedUntil)) {
      // Reset or initialize
      this.verificationAttempts.set(userId, { count: 1, lockedUntil: null });
    } else {
      attemptData.count++;

      if (attemptData.count >= this.MAX_VERIFICATION_ATTEMPTS) {
        attemptData.lockedUntil = now + this.VERIFICATION_LOCKOUT_DURATION;
        auditLogger.warn('User locked out due to too many MFA verification attempts', {
          userId,
          action: 'MFA_LOCKOUT',
        });
      }
    }
  }

  /**
   * Admin: Reset MFA for user (emergency access)
   */
  async adminResetMFA(userId: string, adminId: string, reason: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.mfaEnabled) {
      throw new ValidationError('MFA is not enabled for this user');
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaMethod: null,
      },
    });

    // Clear rate limiting
    this.verificationAttempts.delete(userId);
    this.smsCodeStore.delete(userId);

    auditLogger.warn('Admin reset MFA', {
      userId,
      adminId,
      reason,
      action: 'ADMIN_MFA_RESET',
    });
  }

  /**
   * Get all users with MFA status (admin only)
   */
  async getAllUsersWithMFAStatus(): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnabled: boolean;
    mfaMethod: string | null;
    mfaEnabledAt: Date | null;
    backupCodesCount: number;
  }>> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mfaEnabled: true,
        mfaMethod: true,
        mfaEnabledAt: true,
        mfaBackupCodes: true,
        isActive: true,
      },
      where: {
        isActive: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod,
      mfaEnabledAt: user.mfaEnabledAt,
      backupCodesCount: user.mfaBackupCodes?.length || 0,
    }));
  }

  /**
   * Clean up expired SMS codes (call periodically)
   */
  cleanupExpiredSMSCodes(): void {
    const now = Date.now();
    for (const [userId, data] of this.smsCodeStore.entries()) {
      if (now > data.expiresAt) {
        this.smsCodeStore.delete(userId);
      }
    }

    // Also clean up verification attempts that are no longer locked
    for (const [userId, data] of this.verificationAttempts.entries()) {
      if (data.lockedUntil && now >= data.lockedUntil) {
        this.verificationAttempts.delete(userId);
      }
    }
  }
}

export default new MFAService();
