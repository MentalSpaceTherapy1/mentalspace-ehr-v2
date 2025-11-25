import bcrypt from 'bcryptjs';
import prisma from './database';
import { generateTokenPair, JwtPayload } from '../utils/jwt';
import { UnauthorizedError, ConflictError, ValidationError } from '../utils/errors';
import { RegisterInput, LoginInput } from '../utils/validation';
import { auditLogger } from '../utils/logger';
import sessionService from './session.service';
import passwordPolicyService from './passwordPolicy.service';
import mfaService from './mfa.service';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title,
        roles: [data.role], // Convert single role to roles array
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiration: data.licenseExpiration ? new Date(data.licenseExpiration) : null,
        npiNumber: data.npiNumber,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        title: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      id: user.id,
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    // Log audit event
    auditLogger.info('User registered', {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      action: 'USER_REGISTERED',
    });

    return { user, tokens };
  }

  /**
   * Login user with enhanced security
   */
  async login(data: LoginInput, ipAddress?: string, userAgent?: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // Log failed login attempt with generic message
      auditLogger.warn('Failed login attempt - user not found', {
        email: data.email,
        ipAddress,
        action: 'LOGIN_FAILED',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      const lockDuration = Math.ceil(
        (user.accountLockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      auditLogger.warn('Login attempt on locked account', {
        userId: user.id,
        email: user.email,
        ipAddress,
        action: 'ACCOUNT_LOCKED_LOGIN_ATTEMPT',
      });
      throw new UnauthorizedError(
        `Account is locked due to too many failed login attempts. Please try again in ${lockDuration} minutes.`
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = {
        failedLoginAttempts: newFailedAttempts,
      };

      // Lock account after 5 failed attempts (30-minute lockout)
      if (newFailedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        updateData.accountLockedUntil = lockUntil;

        auditLogger.warn('Account locked due to failed login attempts', {
          userId: user.id,
          email: user.email,
          ipAddress,
          failedAttempts: newFailedAttempts,
          action: 'ACCOUNT_LOCKED',
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Log failed login attempt
      auditLogger.warn('Failed login attempt', {
        userId: user.id,
        email: data.email,
        ipAddress,
        failedAttempts: newFailedAttempts,
        action: 'LOGIN_FAILED',
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Password is correct - reset failed login attempts and unlock account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginDate: new Date(),
      },
    });

    // Check password expiration
    const passwordExpired = passwordPolicyService.checkPasswordExpiration(
      user.passwordChangedAt
    );
    if (passwordExpired) {
      auditLogger.warn('Login with expired password', {
        userId: user.id,
        email: user.email,
        action: 'PASSWORD_EXPIRED',
      });
      throw new UnauthorizedError(
        'Your password has expired. Please reset your password.'
      );
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Return partial response - MFA verification required
      auditLogger.info('MFA required for login', {
        userId: user.id,
        email: user.email,
        ipAddress,
        action: 'MFA_REQUIRED',
      });

      // Generate temporary token for MFA verification
      const tempToken = generateTokenPair({
        id: user.id,
        userId: user.id,
        email: user.email,
        roles: user.roles,
      });

      return {
        requiresMfa: true,
        tempToken: tempToken.accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }

    // Check if password change is required
    if (user.mustChangePassword) {
      auditLogger.info('Password change required', {
        userId: user.id,
        email: user.email,
        action: 'PASSWORD_CHANGE_REQUIRED',
      });
      throw new UnauthorizedError(
        'You must change your password before continuing. Please use the password reset flow.'
      );
    }

    // Check concurrent session limit
    const canCreateSession = await sessionService.checkConcurrentSessions(user.id);
    if (!canCreateSession) {
      auditLogger.warn('Concurrent session limit reached', {
        userId: user.id,
        email: user.email,
        action: 'CONCURRENT_SESSION_BLOCKED',
      });
      // Will terminate oldest session automatically
    }

    // Create session
    const session = await sessionService.createSession(
      user.id,
      ipAddress || 'unknown',
      userAgent || 'unknown'
    );

    // Log successful login
    auditLogger.info('User logged in', {
      userId: user.id,
      email: user.email,
      ipAddress,
      sessionId: session.sessionId,
      action: 'LOGIN_SUCCESS',
    });

    return {
      requiresMfa: false,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        title: user.title,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
      },
      session: {
        token: session.token,
        sessionId: session.sessionId,
      },
    };
  }

  /**
   * Complete MFA login step
   */
  async completeMFALogin(
    userId: string,
    mfaCode: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Verify MFA code
    const isValid = await mfaService.verifyTOTPForLogin(userId, mfaCode);

    if (!isValid) {
      // Try backup code
      const isBackupValid = await mfaService.verifyBackupCode(userId, mfaCode);

      if (!isBackupValid) {
        auditLogger.warn('MFA verification failed', {
          userId,
          ipAddress,
          action: 'MFA_VERIFICATION_FAILED',
        });
        throw new UnauthorizedError('Invalid MFA code');
      }
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Create session
    const session = await sessionService.createSession(
      user.id,
      ipAddress || 'unknown',
      userAgent || 'unknown'
    );

    auditLogger.info('MFA login completed', {
      userId: user.id,
      email: user.email,
      ipAddress,
      sessionId: session.sessionId,
      action: 'MFA_LOGIN_SUCCESS',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        title: user.title,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
      },
      session: {
        token: session.token,
        sessionId: session.sessionId,
      },
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        roles: true,
        phoneNumber: true,
        licenseNumber: true,
        licenseState: true,
        licenseExpiration: true,
        npiNumber: true,
        isActive: true,
        isUnderSupervision: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdAt: true,
        lastLoginDate: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }

  /**
   * Change password with enhanced security
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password against policy
    const validation = await passwordPolicyService.validatePasswordChange(userId, newPassword, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join('. '));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Add old password to history
    await passwordPolicyService.addToPasswordHistory(userId, user.password);

    // Update password and reset mustChangePassword flag
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    // Log audit event
    auditLogger.info('Password changed', {
      userId: user.id,
      email: user.email,
      action: 'PASSWORD_CHANGED',
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Unlock account (admin only)
   */
  async unlockAccount(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, accountLockedUntil: true },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.accountLockedUntil || new Date() > user.accountLockedUntil) {
      throw new ValidationError('Account is not locked');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        accountLockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    auditLogger.info('Account unlocked by admin', {
      userId,
      adminId,
      action: 'ACCOUNT_UNLOCKED',
    });

    return { message: 'Account unlocked successfully' };
  }

  /**
   * Check password history
   */
  async checkPasswordHistory(userId: string, password: string): Promise<boolean> {
    return passwordPolicyService.checkPasswordHistory(userId, password);
  }

  /**
   * Force password change (admin only)
   */
  async forcePasswordChange(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mustChangePassword: true,
      },
    });

    auditLogger.info('Password change forced by admin', {
      userId,
      adminId,
      action: 'PASSWORD_CHANGE_FORCED',
    });

    // Terminate all user sessions to force re-login
    await sessionService.terminateAllUserSessions(userId);

    return { message: 'User will be required to change password on next login' };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    // Import verifyToken here to avoid circular dependency
    const { verifyToken } = require('../utils/jwt');

    try {
      // Verify the refresh token
      const decoded = verifyToken(refreshToken);

      // Get user to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Generate new token pair
      const tokens = generateTokenPair({
        id: user.id,
        userId: user.id,
        email: user.email,
        roles: user.roles,
      });

      // Log audit event
      auditLogger.info('Token refreshed', {
        userId: user.id,
        email: user.email,
        action: 'TOKEN_REFRESHED',
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          title: user.title,
          isActive: user.isActive,
        },
        tokens,
      };
    } catch (error) {
      // Log failed refresh attempt
      auditLogger.warn('Token refresh failed', {
        action: 'TOKEN_REFRESH_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }
}

export default new AuthService();
