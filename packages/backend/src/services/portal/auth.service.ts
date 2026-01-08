import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/errors';
import logger, { logControllerError } from '../../utils/logger';
import config from '../../config';
import prisma from '../database';
import { sendEmail, EmailTemplates } from '../resend.service';
import {
  TOKEN_CONFIG,
  TOKEN_EXPIRY,
  JWT_CONFIG,
  SECURITY_CONFIG,
} from './constants';

// Password expiration constants
const TEMP_PASSWORD_EXPIRY_HOURS = 72; // 72 hours for temporary passwords
const PERMANENT_PASSWORD_EXPIRY_MONTHS = 6; // 6 months for permanent passwords

// Portal URL for email links
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:5175/portal';

// ============================================================================
// PORTAL ACCOUNT REGISTRATION
// ============================================================================

export async function register(data: {
  email: string;
  password: string;
  clientId: string;
}) {
  try {
    // Check if clientId is UUID or MRN
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.clientId);

    let client: any = null;

    if (isUUID) {
      // Direct lookup by ID
      client = await prisma.client.findFirst({
        where: { id: data.clientId },
        include: { portalAccount: true },
      });
    } else {
      // For MRN lookup, the medicalRecordNumber is encrypted in the database
      // The Prisma middleware decrypts data after read, so we fetch and compare
      logger.info('Portal registration: Looking up client by MRN', {
        mrnProvided: data.clientId.substring(0, 4) + '...'
      });

      const clients = await prisma.client.findMany({
        where: { status: 'ACTIVE' },
        include: { portalAccount: true },
        take: 1000, // Reasonable limit
      });

      // The Prisma PHI middleware decrypts medicalRecordNumber after read
      client = clients.find(c => c.medicalRecordNumber === data.clientId);

      if (!client) {
        logger.warn('Portal registration: Client not found by MRN', {
          mrnProvided: data.clientId.substring(0, 4) + '...',
          totalClientsChecked: clients.length
        });
      } else {
        logger.info('Portal registration: Client found by MRN', {
          clientId: client.id
        });
      }
    }

    if (!client) {
      throw new AppError(isUUID ? 'Client not found' : 'Client with this MRN not found. Please check with your therapist.', 404);
    }

    // Use the client's actual UUID for the rest of the function
    const clientUUID = client.id;

    if (client.portalAccount) {
      throw new AppError('Portal account already exists for this client', 400);
    }

    // Check if email is already in use
    const existingAccount = await prisma.portalAccount.findUnique({
      where: { email: data.email },
    });

    if (existingAccount) {
      throw new AppError('Email already in use', 400);
    }

    // Hash password
    const password = await bcrypt.hash(data.password, TOKEN_CONFIG.BCRYPT_SALT_ROUNDS);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(TOKEN_CONFIG.TOKEN_BYTES).toString('hex');
    const verificationExpiry = new Date(Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION_MS);

    // Create portal account with PENDING_VERIFICATION status
    const portalAccount = await prisma.portalAccount.create({
      data: {
        clientId: clientUUID,
        email: data.email,
        password,
        verificationToken: verificationToken,
        emailVerified: false,
        accountStatus: 'PENDING_VERIFICATION',
        portalAccessGranted: false,
      },
    });

    logger.info(`Portal account created for client ${clientUUID}`);

    // Send verification email
    const verificationLink = `${PORTAL_URL}/verify-email?token=${verificationToken}`;
    const emailTemplate = EmailTemplates.clientVerification(client.firstName, verificationLink);

    const emailSent = await sendEmail({
      to: data.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!emailSent) {
      logger.warn(`Failed to send verification email to ${data.email}, but account was created`);
    }

    return {
      id: portalAccount.id,
      email: portalAccount.email,
      clientId: portalAccount.clientId,
      verificationTokenSent: emailSent,
      message: 'Please check your email to verify your account before logging in.',
    };
  } catch (error) {
    logger.error('Error creating portal account:', error);
    throw error;
  }
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

export async function verifyEmail(token: string) {
  try {
    const portalAccount = await prisma.portalAccount.findFirst({
      where: {
        verificationToken: token,
      },
      include: {
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    // Mark email as verified and activate account
    const updated = await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        accountStatus: 'ACTIVE',
        portalAccessGranted: true,
        grantedDate: new Date(),
      },
    });

    logger.info(`Email verified for portal account ${portalAccount.id}`);

    // Send account activated email
    const portalUrl = `${PORTAL_URL}/login`;
    const emailTemplate = EmailTemplates.clientAccountActivated(
      portalAccount.client.firstName,
      portalUrl
    );

    await sendEmail({
      to: updated.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return {
      success: true,
      email: updated.email,
      message: 'Your email has been verified. You can now log in to your portal account.',
    };
  } catch (error) {
    logger.error('Error verifying email:', error);
    throw error;
  }
}

// ============================================================================
// ACTIVATE ACCOUNT (For staff-invited clients)
// ============================================================================

/**
 * Activate a portal account using the invitation token
 * This is for clients who were invited by staff and need to set their password
 * Requires MRN for identity verification (two-factor: email access + MRN knowledge)
 */
export async function activateAccount(data: {
  token: string;
  email: string;
  password: string;
  mrn: string; // Required for identity verification
}) {
  try {
    // Find portal account by verification token
    const portalAccount = await prisma.portalAccount.findFirst({
      where: {
        verificationToken: data.token,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Invalid or expired invitation token. Please contact your therapist for a new invitation.', 400);
    }

    // Verify email matches (case-insensitive)
    if (portalAccount.email.toLowerCase() !== data.email.toLowerCase()) {
      throw new AppError('Email address does not match the invitation. Please use the email address the invitation was sent to.', 400);
    }

    // Verify MRN matches for identity confirmation
    // The client.medicalRecordNumber is decrypted by the PHI middleware
    if (portalAccount.client.medicalRecordNumber !== data.mrn) {
      logger.warn('MRN mismatch during account activation', {
        portalAccountId: portalAccount.id,
        clientId: portalAccount.client.id,
      });
      throw new AppError('MRN does not match our records. Please check your Medical Record Number and try again.', 400);
    }

    // Check if account is already active
    if (portalAccount.accountStatus === 'ACTIVE' && portalAccount.emailVerified) {
      throw new AppError('This account has already been activated. Please log in.', 400);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(data.password, TOKEN_CONFIG.BCRYPT_SALT_ROUNDS);

    // Calculate password expiration (6 months)
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setMonth(passwordExpiresAt.getMonth() + PERMANENT_PASSWORD_EXPIRY_MONTHS);

    // Update the portal account
    const updatedAccount = await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password: hashedPassword,
        emailVerified: true,
        verificationToken: null,
        accountStatus: 'ACTIVE',
        portalAccessGranted: true,
        mustChangePassword: false,
        tempPasswordExpiry: null,
        passwordExpiresAt,
        passwordChangedAt: new Date(),
        grantedDate: new Date(),
      },
    });

    logger.info(`Portal account activated for client ${portalAccount.client.id}`, {
      portalAccountId: portalAccount.id,
      clientId: portalAccount.client.id,
    });

    // Send welcome/activation confirmation email
    const portalUrl = `${PORTAL_URL}/login`;
    const emailTemplate = EmailTemplates.clientAccountActivated(
      portalAccount.client.firstName,
      portalUrl
    );

    await sendEmail({
      to: updatedAccount.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return {
      success: true,
      message: 'Your account has been activated! You can now log in.',
      email: updatedAccount.email,
      clientName: `${portalAccount.client.firstName} ${portalAccount.client.lastName}`,
    };
  } catch (error) {
    logger.error('Error activating portal account:', error);
    throw error;
  }
}

// ============================================================================
// RESEND VERIFICATION EMAIL
// ============================================================================

export async function resendVerificationEmail(email: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { email },
      include: {
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Account not found', 404);
    }

    if (portalAccount.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(TOKEN_CONFIG.TOKEN_BYTES).toString('hex');

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        verificationToken: verificationToken,
      },
    });

    // Send verification email
    const verificationLink = `${PORTAL_URL}/verify-email?token=${verificationToken}`;
    const emailTemplate = EmailTemplates.clientVerification(
      portalAccount.client.firstName,
      verificationLink
    );

    const emailSent = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!emailSent) {
      throw new AppError('Failed to send verification email. Please try again later.', 500);
    }

    logger.info(`Verification email resent to ${email}`);

    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  } catch (error) {
    logger.error('Error resending verification email:', error);
    throw error;
  }
}

// ============================================================================
// LOGIN
// ============================================================================

export async function login(data: { email: string; password: string }) {
  try {
    // Find portal account
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { email: data.email },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if email is verified
    if (!portalAccount.emailVerified) {
      throw new AppError(
        'Please verify your email before logging in. Check your inbox for the verification link.',
        403
      );
    }

    // Check if account is active
    if (portalAccount.accountStatus !== 'ACTIVE') {
      if (portalAccount.accountStatus === 'PENDING_VERIFICATION') {
        throw new AppError(
          'Please verify your email before logging in. Check your inbox for the verification link.',
          403
        );
      } else if (portalAccount.accountStatus === 'SUSPENDED') {
        throw new AppError('Your account has been suspended. Please contact support.', 403);
      } else {
        throw new AppError('Account is not active. Please contact support.', 403);
      }
    }

    // Check if portal access is granted
    if (!portalAccount.portalAccessGranted) {
      throw new AppError(
        'Portal access has not been granted for your account. Please contact your therapist.',
        403
      );
    }

    // Check if client is active
    if (portalAccount.client.status !== 'ACTIVE') {
      throw new AppError('Client account is not active. Please contact support.', 403);
    }

    // Check if account is locked
    if (portalAccount.accountLockedUntil && portalAccount.accountLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((portalAccount.accountLockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Account locked due to failed login attempts. Try again in ${minutesLeft} minutes.`,
        403
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(data.password, portalAccount.password);

    if (!passwordValid) {
      // Update failed login attempts and lock if too many
      const newFailedAttempts = portalAccount.failedLoginAttempts + 1;
      const lockAccount = newFailedAttempts >= SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS;

      await prisma.portalAccount.update({
        where: { id: portalAccount.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          accountLockedUntil: lockAccount ? new Date(Date.now() + TOKEN_EXPIRY.ACCOUNT_LOCKOUT_MS) : null,
        },
      });

      throw new AppError('Invalid email or password', 401);
    }

    // Check if temporary password has expired (72-hour window)
    if (portalAccount.mustChangePassword && portalAccount.tempPasswordExpiry) {
      if (new Date() > portalAccount.tempPasswordExpiry) {
        logger.warn(`Login with expired temporary password for portal account ${portalAccount.id}`);
        throw new AppError('Your temporary password has expired. Please contact your provider for a new one.', 401);
      }
    }

    // Check permanent password expiration (6-month validity)
    if (!portalAccount.mustChangePassword && portalAccount.passwordExpiresAt) {
      if (new Date() > portalAccount.passwordExpiresAt) {
        logger.warn(`Login with expired password for portal account ${portalAccount.id}`);
        throw new AppError('Your password has expired. Please reset your password.', 401);
      }
    }

    // Check if password change is required (first login with temp password)
    if (portalAccount.mustChangePassword) {
      // Reset failed login attempts but indicate password change required
      await prisma.portalAccount.update({
        where: { id: portalAccount.id },
        data: {
          failedLoginAttempts: 0,
          lastLoginDate: new Date(),
          accountLockedUntil: null,
        },
      });

      logger.info(`Password change required for portal account ${portalAccount.id}`);

      // Generate a temporary token for password change
      const tempToken = jwt.sign(
        {
          userId: portalAccount.clientId,
          portalAccountId: portalAccount.id,
          clientId: portalAccount.clientId,
          email: portalAccount.email,
          role: 'client',
          type: 'password_change_required',
        },
        config.jwtSecret,
        {
          expiresIn: '15m', // Short-lived token for password change
          audience: JWT_CONFIG.AUDIENCE,
          issuer: JWT_CONFIG.ISSUER,
        }
      );

      return {
        requiresPasswordChange: true,
        tempToken,
        message: 'You must change your password before continuing.',
        client: {
          id: portalAccount.client.id,
          firstName: portalAccount.client.firstName,
          lastName: portalAccount.client.lastName,
          email: portalAccount.email,
        },
      };
    }

    // Generate JWT access token for portal with correct audience
    const accessToken = jwt.sign(
      {
        userId: portalAccount.clientId,
        portalAccountId: portalAccount.id,
        clientId: portalAccount.clientId,
        email: portalAccount.email,
        role: 'client',
        type: 'client_portal',
      },
      config.jwtSecret,
      {
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
        audience: JWT_CONFIG.AUDIENCE,
        issuer: JWT_CONFIG.ISSUER,
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: portalAccount.clientId,
        portalAccountId: portalAccount.id,
        clientId: portalAccount.clientId,
        email: portalAccount.email,
        role: 'client',
        type: 'client_portal',
      },
      config.jwtSecret,
      {
        expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
        audience: JWT_CONFIG.AUDIENCE,
        issuer: JWT_CONFIG.ISSUER,
      }
    );

    // Update last login and reset failed attempts
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        lastLoginDate: new Date(),
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });

    logger.info(`Portal login successful for client ${portalAccount.clientId}`);

    return {
      token: accessToken,
      refreshToken,
      client: {
        id: portalAccount.client.id,
        firstName: portalAccount.client.firstName,
        lastName: portalAccount.client.lastName,
        email: portalAccount.email,
      },
      portalAccount: {
        id: portalAccount.id,
        email: portalAccount.email,
        emailVerified: portalAccount.emailVerified,
        accountStatus: portalAccount.accountStatus,
      },
    };
  } catch (error) {
    logger.error('Error during portal login:', error);
    throw error;
  }
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

export async function requestPasswordReset(email: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { email },
      include: {
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!portalAccount) {
      // Don't reveal if account exists (security)
      logger.info(`Password reset requested for non-existent account: ${email}`);
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(TOKEN_CONFIG.TOKEN_BYTES).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET_MS);

    // Store reset token
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      },
    });

    // Send password reset email
    const resetLink = `${PORTAL_URL}/reset-password?token=${resetToken}`;
    const emailTemplate = EmailTemplates.clientPasswordReset(
      portalAccount.client.firstName,
      resetLink
    );

    const emailSent = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!emailSent) {
      logger.warn(`Failed to send password reset email to ${email}`);
    }

    logger.info(`Password reset email sent to ${email}`);

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  } catch (error) {
    logger.error('Error requesting password reset:', error);
    throw error;
  }
}

export async function resetPassword(data: { token: string; newPassword: string }) {
  try {
    // Find account with this reset token
    const portalAccount = await prisma.portalAccount.findFirst({
      where: {
        passwordResetToken: data.token,
      },
    });

    if (!portalAccount) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Check if token is expired
    if (
      !portalAccount.passwordResetTokenExpiry ||
      portalAccount.passwordResetTokenExpiry < new Date()
    ) {
      throw new AppError('Reset token has expired', 400);
    }

    // Hash new password
    const password = await bcrypt.hash(data.newPassword, TOKEN_CONFIG.BCRYPT_SALT_ROUNDS);

    // Calculate 6-month expiration for permanent password
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setMonth(passwordExpiresAt.getMonth() + PERMANENT_PASSWORD_EXPIRY_MONTHS);

    // Update password and clear reset token
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        failedLoginAttempts: 0, // Reset failed login attempts
        accountLockedUntil: null, // Unlock account if it was locked
        mustChangePassword: false,
        tempPasswordExpiry: null,
        passwordExpiresAt,
        passwordChangedAt: new Date(),
      },
    });

    logger.info(`Password reset successful for portal account ${portalAccount.id}`, { passwordExpiresAt });

    return {
      success: true,
      message: 'Password reset successfully. Your new password is valid for 6 months.',
      passwordExpiresAt,
    };
  } catch (error) {
    logger.error('Error resetting password:', error);
    throw error;
  }
}

// ============================================================================
// CHANGE PASSWORD (Authenticated)
// ============================================================================

export async function changePassword(data: {
  clientId: string;
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId: data.clientId },
    });

    if (!portalAccount) {
      throw new AppError('Portal account not found', 404);
    }

    // Verify current password
    const passwordValid = await bcrypt.compare(data.currentPassword, portalAccount.password);

    if (!passwordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Don't allow reusing the same password
    const isSamePassword = await bcrypt.compare(data.newPassword, portalAccount.password);
    if (isSamePassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    // Hash new password
    const password = await bcrypt.hash(data.newPassword, TOKEN_CONFIG.BCRYPT_SALT_ROUNDS);

    // Calculate 6-month expiration for permanent password
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setMonth(passwordExpiresAt.getMonth() + PERMANENT_PASSWORD_EXPIRY_MONTHS);

    // Update password
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password,
        mustChangePassword: false,
        tempPasswordExpiry: null,
        passwordExpiresAt,
        passwordChangedAt: new Date(),
        accountStatus: 'ACTIVE',
      },
    });

    logger.info(`Password changed for portal account ${portalAccount.id}`, { passwordExpiresAt });

    return {
      success: true,
      message: 'Password changed successfully. Your new password is valid for 6 months.',
      passwordExpiresAt,
    };
  } catch (error) {
    logger.error('Error changing password:', error);
    throw error;
  }
}

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

export async function getAccount(clientId: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            primaryPhone: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Portal account not found', 404);
    }

    return {
      id: portalAccount.id,
      email: portalAccount.email,
      emailVerified: portalAccount.emailVerified,
      accountStatus: portalAccount.accountStatus,
      lastLoginDate: portalAccount.lastLoginDate,
      createdAt: portalAccount.createdAt,
      client: portalAccount.client,
    };
  } catch (error) {
    logger.error('Error fetching portal account:', error);
    throw error;
  }
}

export async function updateAccountSettings(data: {
  clientId: string;
  email?: string;
  notificationPreferences?: any;
}) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId: data.clientId },
      include: {
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Portal account not found', 404);
    }

    // If email is being changed, require verification
    let updateData: any = {};
    let emailChanged = false;

    if (data.email && data.email !== portalAccount.email) {
      // Check if new email is already in use
      const existingAccount = await prisma.portalAccount.findUnique({
        where: { email: data.email },
      });

      if (existingAccount) {
        throw new AppError('Email already in use', 400);
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');

      updateData = {
        email: data.email,
        emailVerified: false,
        verificationToken: verificationToken,
        accountStatus: 'PENDING_VERIFICATION',
      };

      emailChanged = true;

      // Send verification email to new address
      const verificationLink = `${PORTAL_URL}/verify-email?token=${verificationToken}`;
      const emailTemplate = EmailTemplates.clientEmailChangeVerification(
        portalAccount.client.firstName,
        verificationLink,
        data.email
      );

      const emailSent = await sendEmail({
        to: data.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      if (!emailSent) {
        throw new AppError('Failed to send verification email. Please try again later.', 500);
      }
    }

    // Note: notificationPreferences handled via individual boolean fields in schema
    if (data.notificationPreferences) {
      if (data.notificationPreferences.emailNotifications !== undefined) {
        updateData.emailNotifications = data.notificationPreferences.emailNotifications;
      }
      if (data.notificationPreferences.smsNotifications !== undefined) {
        updateData.smsNotifications = data.notificationPreferences.smsNotifications;
      }
      if (data.notificationPreferences.appointmentReminders !== undefined) {
        updateData.appointmentReminders = data.notificationPreferences.appointmentReminders;
      }
    }

    const updated = await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: updateData,
    });

    logger.info(`Portal account settings updated for client ${data.clientId}${emailChanged ? ' (email change pending verification)' : ''}`);

    return {
      id: updated.id,
      email: updated.email,
      emailVerified: updated.emailVerified,
      emailChanged,
      message: emailChanged
        ? 'A verification email has been sent to your new email address. Please verify to continue using the portal.'
        : 'Settings updated successfully.',
      notificationPreferences: {
        emailNotifications: updated.emailNotifications,
        smsNotifications: updated.smsNotifications,
        appointmentReminders: updated.appointmentReminders,
      },
    };
  } catch (error) {
    logger.error('Error updating portal account settings:', error);
    throw error;
  }
}

export async function deactivateAccount(clientId: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
    });

    if (!portalAccount) {
      throw new AppError('Portal account not found', 404);
    }

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        accountStatus: 'INACTIVE',
      },
    });

    logger.info(`Portal account deactivated for client ${clientId}`);

    return {
      success: true,
      message: 'Account deactivated successfully',
    };
  } catch (error) {
    logger.error('Error deactivating portal account:', error);
    throw error;
  }
}

// ============================================================================
// ADMIN PASSWORD MANAGEMENT (For EHR staff to manage client portal passwords)
// ============================================================================

/**
 * Admin function to send a password reset email to a client
 * This allows staff to trigger a password reset on behalf of a client
 */
export async function adminSendPasswordReset(clientId: string, adminUserId: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Client does not have a portal account', 404);
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(TOKEN_CONFIG.TOKEN_BYTES).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET_MS);

    // Store reset token
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      },
    });

    // Send password reset email
    const resetLink = `${PORTAL_URL}/reset-password?token=${resetToken}`;
    const emailTemplate = EmailTemplates.clientPasswordReset(
      portalAccount.client.firstName,
      resetLink
    );

    const emailSent = await sendEmail({
      to: portalAccount.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!emailSent) {
      logger.warn(`Failed to send password reset email to ${portalAccount.email}`);
      throw new AppError('Failed to send password reset email', 500);
    }

    logger.info(`Admin ${adminUserId} sent password reset email to client ${clientId}`, {
      email: portalAccount.email,
      clientName: `${portalAccount.client.firstName} ${portalAccount.client.lastName}`,
    });

    return {
      success: true,
      message: `Password reset email sent to ${portalAccount.email}`,
      email: portalAccount.email,
      clientName: `${portalAccount.client.firstName} ${portalAccount.client.lastName}`,
    };
  } catch (error) {
    logger.error('Error sending admin password reset:', error);
    throw error;
  }
}

/**
 * Admin function to create a temporary password for a client
 * This allows staff to reset a client's password directly
 */
export async function adminCreateTempPassword(clientId: string, adminUserId: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new AppError('Client does not have a portal account', 404);
    }

    // Generate a secure temporary password
    const tempPassword = generateSecureTempPassword();

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, TOKEN_CONFIG.BCRYPT_SALT_ROUNDS);

    // Calculate temp password expiry (72 hours)
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + TEMP_PASSWORD_EXPIRY_HOURS);

    // Update the portal account
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        tempPasswordExpiry,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });

    // Send email with temporary password
    const emailTemplate = EmailTemplates.clientTempPassword(
      portalAccount.client.firstName,
      tempPassword,
      `${PORTAL_URL}/login`
    );

    // DEBUG: Log before sending email
    console.log('[AUTH DEBUG] About to send temp password email:', {
      to: portalAccount.email,
      subject: emailTemplate.subject,
      clientName: portalAccount.client.firstName,
      hasHtml: !!emailTemplate.html,
    });

    const emailSent = await sendEmail({
      to: portalAccount.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    // DEBUG: Log result of email send
    console.log('[AUTH DEBUG] Email send result:', {
      emailSent,
      to: portalAccount.email,
    });

    if (!emailSent) {
      logger.warn(`Failed to send temp password email to ${portalAccount.email}`);
      console.log('[AUTH DEBUG] Email send FAILED for:', portalAccount.email);
    } else {
      console.log('[AUTH DEBUG] Email send SUCCESS for:', portalAccount.email);
    }

    logger.info(`Admin ${adminUserId} created temp password for client ${clientId}`, {
      email: portalAccount.email,
      clientName: `${portalAccount.client.firstName} ${portalAccount.client.lastName}`,
      expiresAt: tempPasswordExpiry,
    });

    return {
      success: true,
      message: `Temporary password created and emailed to ${portalAccount.email}`,
      email: portalAccount.email,
      clientName: `${portalAccount.client.firstName} ${portalAccount.client.lastName}`,
      tempPassword, // Return so admin can share verbally if needed
      expiresAt: tempPasswordExpiry,
      note: 'The client must change this password upon first login. It expires in 72 hours.',
    };
  } catch (error) {
    logger.error('Error creating admin temp password:', error);
    throw error;
  }
}

/**
 * Generate a secure temporary password
 * Uses cryptographically random characters with at least one of each type
 */
function generateSecureTempPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*-+=';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one of each character type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  // Fill to 12 characters
  for (let i = password.length; i < 12; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join('');
}
