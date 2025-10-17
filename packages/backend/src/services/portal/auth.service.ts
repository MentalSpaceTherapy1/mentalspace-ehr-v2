import { PrismaClient } from '@mentalspace/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import config from '../../config';

const prisma = new PrismaClient();

// ============================================================================
// PORTAL ACCOUNT REGISTRATION
// ============================================================================

export async function register(data: {
  email: string;
  password: string;
  clientId: string;
}) {
  try {
    // Verify client exists and doesn't already have a portal account
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      include: { portalAccount: true },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

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
    const password = await bcrypt.hash(data.password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create portal account
    const portalAccount = await prisma.portalAccount.create({
      data: {
        clientId: data.clientId,
        email: data.email,
        password,
        verificationToken: verificationToken,
        emailVerified: false,
        accountStatus: 'PENDING_VERIFICATION',
      },
    });

    logger.info(`Portal account created for client ${data.clientId}`);

    // TODO: Send verification email
    // await sendVerificationEmail(data.email, verificationToken);

    return {
      id: portalAccount.id,
      email: portalAccount.email,
      clientId: portalAccount.clientId,
      verificationTokenSent: true,
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
    });

    if (!portalAccount) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    // Mark email as verified
    const updated = await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        accountStatus: 'ACTIVE',
      },
    });

    logger.info(`Email verified for portal account ${portalAccount.id}`);

    return {
      success: true,
      email: updated.email,
    };
  } catch (error) {
    logger.error('Error verifying email:', error);
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
    });

    if (!portalAccount) {
      throw new AppError('Account not found', 404);
    }

    if (portalAccount.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        verificationToken: verificationToken,
      },
    });

    // TODO: Send verification email
    // await sendVerificationEmail(email, verificationToken);

    logger.info(`Verification email resent to ${email}`);

    return {
      success: true,
      message: 'Verification email sent',
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

    // Check if account is active
    if (portalAccount.accountStatus !== 'ACTIVE') {
      throw new AppError('Account is not active. Please contact support.', 403);
    }

    // Check if portal access is granted
    if (!portalAccount.portalAccessGranted) {
      throw new AppError('Portal access has not been granted. Please contact support.', 403);
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
      const lockAccount = newFailedAttempts >= 5;

      await prisma.portalAccount.update({
        where: { id: portalAccount.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          accountLockedUntil: lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      throw new AppError('Invalid email or password', 401);
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
        expiresIn: '1h',
        audience: 'mentalspace-portal',
        issuer: 'mentalspace-ehr',
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
        expiresIn: '7d',
        audience: 'mentalspace-portal',
        issuer: 'mentalspace-ehr',
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
    });

    if (!portalAccount) {
      // Don't reveal if account exists (security)
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      },
    });

    // TODO: Send password reset email
    // await sendPasswordResetEmail(email, resetToken);

    logger.info(`Password reset requested for ${email}`);

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
    const password = await bcrypt.hash(data.newPassword, 10);

    // Update password and clear reset token
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        failedLoginAttempts: 0, // Reset failed login attempts
        accountLockedUntil: null, // Unlock account if it was locked
      },
    });

    logger.info(`Password reset successful for portal account ${portalAccount.id}`);

    return {
      success: true,
      message: 'Password reset successfully',
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

    // Hash new password
    const password = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password,
        // Note: Schema doesn't have passwordChangedAt field
      },
    });

    logger.info(`Password changed for portal account ${portalAccount.id}`);

    return {
      success: true,
      message: 'Password changed successfully',
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
    });

    if (!portalAccount) {
      throw new AppError('Portal account not found', 404);
    }

    // If email is being changed, require verification
    let updateData: any = {};

    if (data.email && data.email !== portalAccount.email) {
      // Check if new email is already in use
      const existingAccount = await prisma.portalAccount.findUnique({
        where: { email: data.email },
      });

      if (existingAccount) {
        throw new AppError('Email already in use', 400);
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      updateData = {
        email: data.email,
        emailVerified: false,
        verificationToken: verificationToken,
      };

      // TODO: Send verification email to new address
      // await sendVerificationEmail(data.email, verificationToken);
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

    logger.info(`Portal account settings updated for client ${data.clientId}`);

    return {
      id: updated.id,
      email: updated.email,
      emailVerified: updated.emailVerified,
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
