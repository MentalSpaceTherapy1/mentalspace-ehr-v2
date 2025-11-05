import bcrypt from 'bcryptjs';
import prisma from './database';
import { validatePassword, PasswordValidationResult } from '../utils/passwordPolicy';
import { auditLogger } from '../utils/logger';
import { ValidationError } from '../utils/errors';

/**
 * Password Policy Service
 *
 * Implements password security policies:
 * - Password strength validation (12+ chars, uppercase, lowercase, number, special char)
 * - Password history checking (prevent reuse of last 10 passwords)
 * - Password expiration (90 days)
 */

export class PasswordPolicyService {
  private readonly PASSWORD_HISTORY_LIMIT = 10;
  private readonly PASSWORD_EXPIRATION_DAYS = 90;

  /**
   * Validate password strength against policy
   */
  validatePasswordStrength(
    password: string,
    userInfo?: {
      email?: string;
      firstName?: string;
      lastName?: string;
    }
  ): PasswordValidationResult {
    return validatePassword(password, userInfo);
  }

  /**
   * Check if password exists in user's password history
   */
  async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHistory: true },
    });

    if (!user || !user.passwordHistory || user.passwordHistory.length === 0) {
      return false; // Password not in history
    }

    // Check if new password matches any in history
    for (const oldPasswordHash of user.passwordHistory) {
      const isMatch = await bcrypt.compare(newPassword, oldPasswordHash);
      if (isMatch) {
        return true; // Password found in history
      }
    }

    return false; // Password not in history
  }

  /**
   * Add password to user's password history
   * Maintains only the last 10 passwords
   */
  async addToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHistory: true },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Get current history and add new password
    const currentHistory = user.passwordHistory || [];
    const newHistory = [passwordHash, ...currentHistory];

    // Keep only last 10 passwords
    const trimmedHistory = newHistory.slice(0, this.PASSWORD_HISTORY_LIMIT);

    // Update user's password history
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHistory: trimmedHistory,
        passwordChangedAt: new Date(),
      },
    });

    auditLogger.info('Password history updated', {
      userId,
      historySize: trimmedHistory.length,
      action: 'PASSWORD_HISTORY_UPDATED',
    });
  }

  /**
   * Check if user's password has expired (older than 90 days)
   */
  checkPasswordExpiration(passwordChangedAt: Date): boolean {
    const now = new Date();
    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(expirationDate.getDate() + this.PASSWORD_EXPIRATION_DAYS);

    return now > expirationDate;
  }

  /**
   * Get days until password expires
   */
  getDaysUntilPasswordExpiration(passwordChangedAt: Date): number {
    const now = new Date();
    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(expirationDate.getDate() + this.PASSWORD_EXPIRATION_DAYS);

    const daysRemaining = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, daysRemaining);
  }

  /**
   * Validate password change request
   * Checks strength and history
   */
  async validatePasswordChange(
    userId: string,
    newPassword: string,
    userInfo?: {
      email?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate password strength
    const strengthValidation = this.validatePasswordStrength(newPassword, userInfo);
    if (!strengthValidation.isValid) {
      errors.push(...strengthValidation.errors);
    }

    // Check password history
    const inHistory = await this.checkPasswordHistory(userId, newPassword);
    if (inHistory) {
      errors.push(
        `Password cannot be one of your last ${this.PASSWORD_HISTORY_LIMIT} passwords`
      );
      auditLogger.warn('Password change denied - password in history', {
        userId,
        action: 'PASSWORD_HISTORY_VIOLATION',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get password policy configuration for display to users
   */
  getPasswordPolicy() {
    return {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordHistoryCount: this.PASSWORD_HISTORY_LIMIT,
      passwordExpirationDays: this.PASSWORD_EXPIRATION_DAYS,
      requirements: [
        'At least 12 characters long',
        'Contains at least one uppercase letter (A-Z)',
        'Contains at least one lowercase letter (a-z)',
        'Contains at least one number (0-9)',
        'Contains at least one special character (!@#$%^&* etc.)',
        `Cannot be one of your last ${this.PASSWORD_HISTORY_LIMIT} passwords`,
        'Cannot contain your name or email',
        'Cannot be a common password',
      ],
    };
  }

  /**
   * Check if user needs to change password
   */
  async checkPasswordChangeRequired(userId: string): Promise<{
    required: boolean;
    reason?: string;
    daysUntilExpiration?: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Check if user has mustChangePassword flag set
    if (user.mustChangePassword) {
      return {
        required: true,
        reason: 'Password change required by administrator',
      };
    }

    // Check if password has expired
    const isExpired = this.checkPasswordExpiration(user.passwordChangedAt);
    if (isExpired) {
      return {
        required: true,
        reason: 'Password has expired (older than 90 days)',
        daysUntilExpiration: 0,
      };
    }

    // Check if password is expiring soon (within 7 days)
    const daysUntilExpiration = this.getDaysUntilPasswordExpiration(user.passwordChangedAt);
    if (daysUntilExpiration <= 7) {
      return {
        required: false,
        reason: 'Password will expire soon',
        daysUntilExpiration,
      };
    }

    return {
      required: false,
      daysUntilExpiration,
    };
  }
}

export default new PasswordPolicyService();
