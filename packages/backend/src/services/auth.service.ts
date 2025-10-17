import bcrypt from 'bcryptjs';
import prisma from './database';
import { generateTokenPair, JwtPayload } from '../utils/jwt';
import { UnauthorizedError, ConflictError, ValidationError } from '../utils/errors';
import { RegisterInput, LoginInput } from '../utils/validation';
import { auditLogger } from '../utils/logger';

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
        role: data.role,
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
        role: true,
        title: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log audit event
    auditLogger.info('User registered', {
      userId: user.id,
      email: user.email,
      role: user.role,
      action: 'USER_REGISTERED',
    });

    return { user, tokens };
  }

  /**
   * Login user
   */
  async login(data: LoginInput, ipAddress?: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      // Log failed login attempt
      auditLogger.warn('Failed login attempt', {
        email: data.email,
        ipAddress,
        action: 'LOGIN_FAILED',
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginDate: new Date() },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log successful login
    auditLogger.info('User logged in', {
      userId: user.id,
      email: user.email,
      ipAddress,
      action: 'LOGIN_SUCCESS',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        title: user.title,
        isActive: user.isActive,
      },
      tokens,
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
        role: true,
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
   * Change password
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log audit event
    auditLogger.info('Password changed', {
      userId: user.id,
      email: user.email,
      action: 'PASSWORD_CHANGED',
    });

    return { message: 'Password changed successfully' };
  }
}

export default new AuthService();
