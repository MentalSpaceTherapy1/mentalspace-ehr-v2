import prisma from './database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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

    // TODO: Send verification email

    return {
      id: portalAccount.id,
      email: portalAccount.email,
      status: portalAccount.accountStatus,
      verificationToken, // Return for testing; remove in production
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

    await prisma.portalAccount.update({
      where: { id: portalAccount.id },
      data: {
        password: hashedPassword,
        verificationToken: null,
        failedLoginAttempts: 0,
      },
    });

    logger.info('Password reset successful', {
      portalAccountId: portalAccount.id,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('Password reset failed', {
      error: error.message,
    });
    throw error;
  }
}
