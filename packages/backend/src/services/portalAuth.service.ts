import prisma from './database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, EmailTemplates } from './email.service';
import { generateResetToken, generateVerificationToken, getVerificationExpiry, generateTemporaryPassword } from '../utils/passwordGenerator';
import { decryptValue } from '../utils/encryption';

// Password expiration constants
const TEMP_PASSWORD_EXPIRY_HOURS = 72; // 72 hours for temporary passwords
const PERMANENT_PASSWORD_EXPIRY_MONTHS = 6; // 6 months for permanent passwords

interface RegisterPortalAccountData {
  clientId: string;
  email: string;
  password: string;
  createdBy: string;
}

interface PortalLoginData {
  email: string;
  password: string;
}

/**
 * Register a new portal account for a client
 */
export async function registerPortalAccount(data: RegisterPortalAccountData) {
  try {
    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Check if portal account already exists
    const existingAccount = await prisma.portalAccount.findUnique({
      where: { clientId: data.clientId },
    });

    if (existingAccount) {
      throw new Error('Portal account already exists for this client');
    }

    // Check if email is already in use
    const existingEmail = await prisma.portalAccount.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingEmail) {
      throw new Error('Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Generate verification token
    const verificationToken = uuidv4();

    // Create portal account
    const portalAccount = await prisma.portalAccount.create({
      data: {
        clientId: data.clientId,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        verificationToken,
        accountStatus: 'PENDING_VERIFICATION',
        portalAccessGranted: true, // Auto-grant for now
      },
    });

    logger.info('Portal account registered', {
      portalAccountId: portalAccount.id,
      clientId: data.clientId,
      email: data.email,
    });

    // Send verification email
    const verificationLink = `${process.env.PORTAL_URL || process.env.FRONTEND_URL || 'https://mentalspaceehr.com'}/portal/verify?token=${verificationToken}`;
    const emailSent = await sendEmail({
      to: data.email,
      ...EmailTemplates.clientVerification(client.firstName, verificationLink),
    });

    logger.info('Verification email sent', {
      portalAccountId: portalAccount.id,
      emailSent,
    });

    return {
      id: portalAccount.id,
      email: portalAccount.email,
      status: portalAccount.accountStatus,
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined, // Only for dev
      emailSent,
    };
  } catch (error: any) {
    logger.error('Failed to register portal account', {
      error: error.message,
      clientId: data.clientId,
    });
    throw error;
  }
}

/**
 * Client portal login
 */
export async function portalLogin(data: PortalLoginData) {
  try {
    // Find portal account
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            email: true,
            primaryTherapistId: true,
          },
        },
      },
    });

    if (!portalAccount) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (portalAccount.accountLockedUntil && portalAccount.accountLockedUntil > new Date()) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Check if account is active
    if (portalAccount.accountStatus === 'INACTIVE') {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, portalAccount.password);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = portalAccount.failedLoginAttempts + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
      };

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updateData.accountLockedUntil = lockUntil;
        updateData.accountStatus = 'LOCKED';
      }

      await prisma.portalAccount.update({
        where: { id: portalAccount.id },
        data: updateData,
      });

      throw new Error('Invalid email or password');
    }

    // Check if portal access is granted
    if (!portalAccount.portalAccessGranted) {
      throw new Error('Portal access has not been granted. Please contact your provider.');
    }

    // Check if temporary password has expired (72-hour window)
    if (portalAccount.mustChangePassword && portalAccount.tempPasswordExpiry) {
      if (new Date() > portalAccount.tempPasswordExpiry) {
        logger.warn('Login with expired temporary password', {
          portalAccountId: portalAccount.id,
          clientId: portalAccount.clientId,
        });
        throw new Error('Your temporary password has expired. Please contact your provider for a new one.');
      }
    }

    // Check permanent password expiration (6-month validity)
    if (!portalAccount.mustChangePassword && portalAccount.passwordExpiresAt) {
      if (new Date() > portalAccount.passwordExpiresAt) {
        logger.warn('Login with expired password', {
          portalAccountId: portalAccount.id,
          clientId: portalAccount.clientId,
        });
        throw new Error('Your password has expired. Please reset your password.');
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

      logger.info('Password change required for portal account', {
        portalAccountId: portalAccount.id,
        clientId: portalAccount.clientId,
      });

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
          audience: 'mentalspace-portal',
          issuer: 'mentalspace-ehr',
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

    // Reset failed login attempts
    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginDate: new Date(),
        accountStatus: 'ACTIVE',
        accountLockedUntil: null,
      },
    });

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        userId: portalAccount.clientId, // Use userId for consistency with middleware
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
        userId: portalAccount.clientId, // Use userId for consistency with middleware
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

    logger.info('Client portal login successful', {
      portalAccountId: portalAccount.id,
      clientId: portalAccount.clientId,
    });

    return {
      token: accessToken, // Return token at top level for easier frontend access
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
  } catch (error: any) {
    logger.error('Portal login failed', {
      error: error.message,
      email: data.email,
    });
    throw error;
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  try {
    const portalAccount = await prisma.portalAccount.findFirst({
      where: { verificationToken: token },
    });

    if (!portalAccount) {
      throw new Error('Invalid verification token');
    }

    if (portalAccount.emailVerified) {
      throw new Error('Email already verified');
    }

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        accountStatus: 'ACTIVE',
      },
    });

    logger.info('Email verified', {
      portalAccountId: portalAccount.id,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('Email verification failed', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!portalAccount) {
      // Don't reveal if account exists
      return { success: true, message: 'If account exists, password reset email will be sent' };
    }

    const resetToken = uuidv4();

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        verificationToken: resetToken, // Reuse field for password reset
      },
    });

    logger.info('Password reset requested', {
      portalAccountId: portalAccount.id,
    });

    // TODO: Send password reset email

    return {
      success: true,
      message: 'If account exists, password reset email will be sent',
      resetToken, // Return for testing; remove in production
    };
  } catch (error: any) {
    logger.error('Password reset request failed', {
      error: error.message,
      email,
    });
    throw error;
  }
}

/**
 * Reset password with token
 * Sets 6-month password expiration
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    const portalAccount = await prisma.portalAccount.findFirst({
      where: { verificationToken: token },
    });

    if (!portalAccount) {
      throw new Error('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Calculate 6-month expiration for permanent password
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setMonth(passwordExpiresAt.getMonth() + PERMANENT_PASSWORD_EXPIRY_MONTHS);

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password: hashedPassword,
        verificationToken: null,
        failedLoginAttempts: 0,
        mustChangePassword: false,
        tempPasswordExpiry: null,
        passwordExpiresAt,
        passwordChangedAt: new Date(),
      },
    });

    logger.info('Password reset successful', {
      portalAccountId: portalAccount.id,
      passwordExpiresAt,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('Password reset failed', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Change password for portal account (for first login temp password change)
 * Sets 6-month password expiration
 */
export async function changePortalPassword(portalAccountId: string, currentPassword: string, newPassword: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { id: portalAccountId },
    });

    if (!portalAccount) {
      throw new Error('Portal account not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, portalAccount.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Don't allow reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, portalAccount.password);
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Calculate 6-month expiration for permanent password
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setMonth(passwordExpiresAt.getMonth() + PERMANENT_PASSWORD_EXPIRY_MONTHS);

    await prisma.portalAccount.update({
      where: { id: portalAccountId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        tempPasswordExpiry: null,
        passwordExpiresAt,
        passwordChangedAt: new Date(),
        accountStatus: 'ACTIVE',
      },
    });

    logger.info('Portal password changed successfully', {
      portalAccountId,
      passwordExpiresAt,
    });

    return {
      success: true,
      message: 'Password changed successfully. Your new password is valid for 6 months.',
      passwordExpiresAt,
    };
  } catch (error: any) {
    logger.error('Portal password change failed', {
      error: error.message,
      portalAccountId,
    });
    throw error;
  }
}

/**
 * Invite client to portal (staff-initiated)
 * Generates a temporary password valid for 72 hours
 */
export async function inviteClientToPortal(clientId: string, invitedBy: string) {
  try {
    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        primaryTherapist: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    if (!client.email) {
      throw new Error('Client does not have an email address on file');
    }

    // Check if portal account already exists
    const existingAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
    });

    if (existingAccount) {
      throw new Error('Client already has a portal account');
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Generate temporary password (72-hour expiration)
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const tempPasswordExpiry = new Date(Date.now() + TEMP_PASSWORD_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create portal account with temporary password
    const portalAccount = await prisma.portalAccount.create({
      data: {
        clientId,
        email: client.email.toLowerCase(),
        password: hashedPassword,
        verificationToken,
        accountStatus: 'PENDING_VERIFICATION',
        portalAccessGranted: true,
        mustChangePassword: true, // User must change password on first login
        tempPasswordExpiry, // Temporary password expires in 72 hours
        grantedBy: invitedBy,
        grantedDate: new Date(),
      },
    });

    // Get clinician name for email
    const clinicianName = client.primaryTherapist
      ? `${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`
      : 'your provider';

    // Send invitation email with temporary password
    const invitationLink = `${process.env.PORTAL_URL || 'https://mentalspaceehr.com/portal'}/register?token=${verificationToken}&email=${encodeURIComponent(client.email)}`;

    // Explicitly decrypt MRN for email display
    // The PHI middleware should decrypt this, but we ensure it's readable here
    let displayMRN = client.medicalRecordNumber || '';
    if (displayMRN.includes(':') && displayMRN.split(':').length === 3) {
      try {
        displayMRN = decryptValue(displayMRN);
      } catch (e) {
        logger.warn('Failed to decrypt MRN for invitation email', { clientId });
      }
    }

    const emailSent = await sendEmail({
      to: client.email,
      ...EmailTemplates.clientInvitation(client.firstName, invitationLink, clinicianName, displayMRN),
    });

    logger.info('Client portal invitation sent', {
      clientId,
      portalAccountId: portalAccount.id,
      invitedBy,
      emailSent,
      tempPasswordExpiry,
    });

    return {
      success: true,
      portalAccountId: portalAccount.id,
      email: client.email,
      invitationSent: emailSent,
      tempPassword, // Return temporary password to staff for communication to client
      tempPasswordExpiry,
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
    };
  } catch (error: any) {
    logger.error('Failed to invite client to portal', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}

/**
 * Resend portal invitation/verification email
 */
export async function resendPortalInvitation(clientId: string) {
  try {
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
      include: {
        client: {
          select: {
            firstName: true,
            email: true,
            medicalRecordNumber: true,
            primaryTherapist: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!portalAccount) {
      throw new Error('Portal account not found');
    }

    if (portalAccount.accountStatus === 'ACTIVE') {
      throw new Error('Account is already active');
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: { verificationToken },
    });

    // Get clinician name for email
    const clinicianName = portalAccount.client.primaryTherapist
      ? `${portalAccount.client.primaryTherapist.firstName} ${portalAccount.client.primaryTherapist.lastName}`
      : 'your provider';

    // Resend verification email
    const invitationLink = `${process.env.PORTAL_URL || 'https://mentalspaceehr.com/portal'}/register?token=${verificationToken}&email=${encodeURIComponent(portalAccount.email)}`;

    // Explicitly decrypt MRN for email display
    let displayMRN = portalAccount.client.medicalRecordNumber || '';
    if (displayMRN.includes(':') && displayMRN.split(':').length === 3) {
      try {
        displayMRN = decryptValue(displayMRN);
      } catch (e) {
        logger.warn('Failed to decrypt MRN for invitation email', { clientId });
      }
    }

    const emailSent = await sendEmail({
      to: portalAccount.email,
      ...EmailTemplates.clientInvitation(portalAccount.client.firstName, invitationLink, clinicianName, displayMRN),
    });

    logger.info('Portal invitation resent', {
      clientId,
      portalAccountId: portalAccount.id,
      emailSent,
    });

    return {
      success: true,
      message: 'Invitation resent successfully',
      emailSent,
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
    };
  } catch (error: any) {
    logger.error('Failed to resend portal invitation', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}

/**
 * Get portal account status for a client
 */
export async function getPortalAccountStatus(clientId: string) {
  const portalAccount = await prisma.portalAccount.findUnique({
    where: { clientId },
    select: {
      id: true,
      email: true,
      accountStatus: true,
      portalAccessGranted: true,
      lastLoginDate: true,
      createdAt: true,
    },
  });

  return {
    hasPortalAccount: !!portalAccount,
    portalAccount,
  };
}
