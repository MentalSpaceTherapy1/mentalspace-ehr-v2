import prisma from './database';
import bcrypt from 'bcryptjs';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@mentalspace/database';
import { sendEmail, EmailTemplates } from './email.service';
import {
  generateTemporaryPassword,
  generateResetToken,
  getPasswordResetExpiry,
  isTokenExpired,
} from '../utils/passwordGenerator';
import logger from '../utils/logger';

export interface CreateUserDto {
  email: string;
  password?: string; // Optional - if not provided, a temporary password will be generated
  firstName: string;
  lastName: string;
  title?: string;
  roles: UserRole[]; // Multiple roles support
  npiNumber?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  roles?: UserRole[]; // Multiple roles support
  npiNumber?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole; // Filter by specific role (user must have this role in their roles array)
  isActive?: boolean;
  page?: number;
  limit?: number;
}

class UserService {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(filters: UserFilters) {
    const {
      search,
      role,
      isActive,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.roles = { has: role }; // Filter users who have this role in their roles array
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        roles: true,
        isActive: true,
        npiNumber: true,
        licenseNumber: true,
        licenseState: true,
        phoneNumber: true,
        lastLoginDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        roles: true,
        isActive: true,
        npiNumber: true,
        licenseNumber: true,
        licenseState: true,
        phoneNumber: true,
        lastLoginDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Create a new user
   * If password is not provided, generates a temporary password that expires in 72 hours
   * User must change password on first login, and new password will expire in 6 months
   */
  async createUser(data: CreateUserDto, createdBy: string) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    // Generate temporary password if not provided
    const isTemporaryPassword = !data.password;
    const actualPassword = data.password || generateTemporaryPassword();

    // Hash password
    const hashedPassword = await bcrypt.hash(actualPassword, 12);

    // Calculate temp password expiry (72 hours from now)
    const tempPasswordExpiry = isTemporaryPassword
      ? new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
      : undefined;

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title,
        roles: data.roles,
        npiNumber: data.npiNumber,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiration: data.licenseExpiration ? new Date(data.licenseExpiration) : undefined,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive ?? true,
        // Password management for temporary passwords
        mustChangePassword: isTemporaryPassword,
        tempPasswordExpiry: tempPasswordExpiry,
        // Note: credentials is now a relation (Credential[]), not a String[]
        // String arrays for basic fields
        specialties: [],
        languagesSpoken: [],
        supervisionLicenses: [],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        roles: true,
        isActive: true,
        npiNumber: true,
        licenseNumber: true,
        licenseState: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    // Log user creation
    logger.info('User created', {
      userId: user.id,
      email: user.email,
      createdBy,
      isTemporaryPassword,
      tempPasswordExpiry: tempPasswordExpiry?.toISOString(),
    });

    // Return with temporary password only if it was generated
    return {
      ...user,
      tempPassword: isTemporaryPassword ? actualPassword : undefined,
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserDto, updatedBy: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Check if email is being changed and is already in use
    if (data.email && data.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailInUse) {
        throw new BadRequestError('Email already in use');
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title,
        roles: data.roles,
        npiNumber: data.npiNumber,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiration: data.licenseExpiration ? new Date(data.licenseExpiration) : undefined,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        roles: true,
        isActive: true,
        npiNumber: true,
        licenseNumber: true,
        licenseState: true,
        phoneNumber: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Soft delete user (deactivate)
   */
  async deactivateUser(userId: string, deactivatedBy: string) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Cannot deactivate yourself
    if (userId === deactivatedBy) {
      throw new BadRequestError('Cannot deactivate your own account');
    }

    // Deactivate user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Activate user
   */
  async activateUser(userId: string, activatedBy: string) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Activate user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return { message: 'User activated successfully' };
  }

  /**
   * Reset user password (admin function)
   */
  async resetUserPassword(userId: string, newPassword: string, resetBy: string) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [total, active, inactive, allUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.findMany({ select: { roles: true } }),
    ]);

    // Count users by role (users can have multiple roles)
    const roleCounts: Record<string, number> = {};
    allUsers.forEach(user => {
      user.roles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
    });

    const byRole = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    }));

    return {
      total,
      active,
      inactive,
      byRole,
    };
  }

  /**
   * Create user and send invitation email with temporary password
   */
  async createUserWithInvitation(data: CreateUserDto, createdBy: string) {
    // Generate temporary password
    const tempPassword = generateTemporaryPassword();

    // Create user with must change password flag
    const user = await this.createUser({
      ...data,
      password: tempPassword,
    }, createdBy);

    // Get inviter information
    const inviter = await prisma.user.findUnique({
      where: { id: createdBy },
      select: { firstName: true, lastName: true },
    });

    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Administrator';

    // Update user to mark invitation sent and mustChangePassword
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mustChangePassword: true,
        invitationSentAt: new Date(),
        invitationToken: generateResetToken(),
      },
    });

    // Send welcome email with temporary password
    const emailSent = await sendEmail({
      to: user.email,
      ...EmailTemplates.staffInvitation(user.firstName, user.email, tempPassword, inviterName),
    });

    logger.info('Staff invitation sent', {
      userId: user.id,
      email: user.email,
      emailSent,
    });

    return {
      user,
      tempPassword: emailSent ? undefined : tempPassword, // Only return if email failed
      invitationSent: emailSent,
    };
  }

  /**
   * Resend invitation email to user
   */
  async resendInvitation(userId: string, resendBy: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate new temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Get resender information
    const resender = await prisma.user.findUnique({
      where: { id: resendBy },
      select: { firstName: true, lastName: true },
    });

    const resenderName = resender ? `${resender.firstName} ${resender.lastName}` : 'Administrator';

    // Update user with new password and reset token
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        invitationSentAt: new Date(),
        invitationToken: generateResetToken(),
      },
    });

    // Send invitation email
    const emailSent = await sendEmail({
      to: user.email,
      ...EmailTemplates.staffInvitation(user.firstName, user.email, tempPassword, resenderName),
    });

    logger.info('Staff invitation resent', {
      userId: user.id,
      email: user.email,
      emailSent,
    });

    return {
      message: 'Invitation resent successfully',
      invitationSent: emailSent,
      tempPassword: emailSent ? undefined : tempPassword, // Only return if email failed
    };
  }

  /**
   * Request password reset for staff user (forgot password)
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.warn('Password reset requested for non-existent user', { email });
      return { message: 'If that email exists, a password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpiry = getPasswordResetExpiry(1); // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    // Send password reset email
    const resetLink = `${process.env.FRONTEND_URL || 'https://mentalspaceehr.com'}/reset-password?token=${resetToken}`;
    const emailSent = await sendEmail({
      to: user.email,
      ...EmailTemplates.passwordReset(user.firstName, resetLink),
    });

    logger.info('Password reset requested', {
      userId: user.id,
      email: user.email,
      emailSent,
    });

    return {
      message: 'If that email exists, a password reset link has been sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined, // Only for dev
    };
  }

  /**
   * Reset password using reset token
   */
  async resetPasswordWithToken(token: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Check if token expired
    if (isTokenExpired(user.passwordResetExpiry)) {
      throw new BadRequestError('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        mustChangePassword: false, // Reset this flag if it was set
      },
    });

    logger.info('Password reset completed', {
      userId: user.id,
      email: user.email,
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password (authenticated user changing their own password)
   * Sets new password expiration to 6 months from now
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Calculate permanent password expiry (6 months from now)
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    // Update password and set 6-month expiration
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordExpiresAt: sixMonthsFromNow,
        passwordChangedAt: new Date(),
      },
    });

    logger.info('Password changed', {
      userId: user.id,
      email: user.email,
      passwordExpiresAt: sixMonthsFromNow.toISOString(),
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get basic user info (for use by other services)
   * Phase 3.2: Added to support thin controller pattern
   */
  async getUserBasicInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });

    return user;
  }

  /**
   * Force password change (for first login)
   * Sets permanent password with 6-month expiration
   */
  async forcePasswordChange(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.mustChangePassword) {
      throw new BadRequestError('Password change not required');
    }

    // Check if temporary password has expired
    if (user.tempPasswordExpiry && new Date() > user.tempPasswordExpiry) {
      throw new BadRequestError('Temporary password has expired. Please contact your administrator for a new one.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Calculate permanent password expiry (6 months from now)
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    // Update password and clear mustChangePassword flag, set 6-month expiration
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        tempPasswordExpiry: null, // Clear temporary password expiry
        passwordExpiresAt: sixMonthsFromNow, // Set 6-month expiration
        passwordChangedAt: new Date(),
      },
    });

    logger.info('Forced password change completed', {
      userId: user.id,
      email: user.email,
      passwordExpiresAt: sixMonthsFromNow.toISOString(),
    });

    return { message: 'Password set successfully' };
  }
}

export default new UserService();
