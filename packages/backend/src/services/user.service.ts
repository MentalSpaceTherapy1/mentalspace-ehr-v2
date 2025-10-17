import prisma from './database';
import bcrypt from 'bcryptjs';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@mentalspace/shared';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  title?: string;
  role: UserRole;
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
  role?: UserRole;
  npiNumber?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
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
      where.role = role;
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
        role: true,
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
        role: true,
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
   */
  async createUser(data: CreateUserDto, createdBy: string) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestError('Email already in use');
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
        npiNumber: data.npiNumber,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiration: data.licenseExpiration ? new Date(data.licenseExpiration) : undefined,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive ?? true,
        credentials: [],
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
        role: true,
        isActive: true,
        npiNumber: true,
        licenseNumber: true,
        licenseState: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return user;
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
        role: data.role,
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
        role: true,
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
    const [total, active, inactive, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.map(r => ({
        role: r.role,
        count: r._count.role,
      })),
    };
  }
}

export default new UserService();
