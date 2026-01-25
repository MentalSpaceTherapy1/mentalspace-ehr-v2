/**
 * User Service Tests
 * Phase 5.1: Comprehensive test coverage for user service
 *
 * Tests cover:
 * - User CRUD operations
 * - Password management (reset, change, force change)
 * - User invitation flow
 * - User statistics
 * - Deactivation/activation
 */

import userService from '../user.service';
import prisma from '../database';
import bcrypt from 'bcryptjs';
import { sendEmail, EmailTemplates } from '../email.service';
import {
  generateTemporaryPassword,
  generateResetToken,
  getPasswordResetExpiry,
  isTokenExpired,
} from '../../utils/passwordGenerator';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { UserRole } from '@mentalspace/database';

// Mock dependencies
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  EmailTemplates: {
    staffInvitation: jest.fn().mockReturnValue({
      subject: 'Welcome to MentalSpace',
      html: '<p>Welcome</p>',
      text: 'Welcome',
    }),
    passwordReset: jest.fn().mockReturnValue({
      subject: 'Password Reset',
      html: '<p>Reset</p>',
      text: 'Reset',
    }),
  },
}));

jest.mock('../../utils/passwordGenerator', () => ({
  generateTemporaryPassword: jest.fn().mockReturnValue('TempPass123!'),
  generateResetToken: jest.fn().mockReturnValue('reset-token-123'),
  getPasswordResetExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 3600000)),
  isTokenExpired: jest.fn().mockReturnValue(false),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockedGenerateTemporaryPassword = generateTemporaryPassword as jest.MockedFunction<typeof generateTemporaryPassword>;
const mockedGenerateResetToken = generateResetToken as jest.MockedFunction<typeof generateResetToken>;
const mockedIsTokenExpired = isTokenExpired as jest.MockedFunction<typeof isTokenExpired>;

describe('UserService', () => {
  const testUserId = 'user-123';
  const testAdminId = 'admin-456';
  const testEmail = 'john.doe@example.com';

  const mockUser = {
    id: testUserId,
    email: testEmail,
    firstName: 'John',
    lastName: 'Doe',
    title: 'LCSW',
    roles: ['CLINICIAN'] as UserRole[],
    isActive: true,
    npiNumber: '1234567890',
    licenseNumber: 'LIC-123',
    licenseState: 'GA',
    phoneNumber: '555-123-4567',
    lastLoginDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'hashed-password',
    mustChangePassword: false,
    tempPasswordExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    passwordExpiresAt: null,
    passwordChangedAt: null,
    invitationSentAt: null,
    invitationToken: null,
  };

  const mockAdmin = {
    id: testAdminId,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    title: 'Administrator',
    roles: ['ADMINISTRATOR'] as UserRole[],
    isActive: true,
    npiNumber: null,
    licenseNumber: null,
    licenseState: null,
    phoneNumber: '555-000-0000',
    lastLoginDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'hashed-password',
    mustChangePassword: false,
    tempPasswordExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    passwordExpiresAt: null,
    passwordChangedAt: null,
    invitationSentAt: null,
    invitationToken: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // GET USERS
  // ===========================================================================

  describe('getUsers', () => {
    it('should return paginated users with default pagination', async () => {
      const mockUsers = [mockUser];
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (mockedPrisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await userService.getUsers({});

      expect(result.users).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('should filter users by search term', async () => {
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.count as jest.Mock).mockResolvedValue(0);

      await userService.getUsers({ search: 'John' });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { firstName: { contains: 'John', mode: 'insensitive' } },
              { lastName: { contains: 'John', mode: 'insensitive' } },
              { email: { contains: 'John', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should filter users by role', async () => {
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.count as jest.Mock).mockResolvedValue(0);

      await userService.getUsers({ role: 'CLINICIAN' as UserRole });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roles: { has: 'CLINICIAN' } },
        })
      );
    });

    it('should filter users by active status', async () => {
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.count as jest.Mock).mockResolvedValue(0);

      await userService.getUsers({ isActive: true });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('should respect pagination parameters', async () => {
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.count as jest.Mock).mockResolvedValue(100);

      const result = await userService.getUsers({ page: 3, limit: 10 });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });

    it('should order users by active status first, then by name', async () => {
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.count as jest.Mock).mockResolvedValue(0);

      await userService.getUsers({});

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { isActive: 'desc' },
            { lastName: 'asc' },
            { firstName: 'asc' },
          ],
        })
      );
    });
  });

  // ===========================================================================
  // GET USER BY ID
  // ===========================================================================

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById(testUserId);

      expect(result).toEqual(mockUser);
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUserId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
        }),
      });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.getUserById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // CREATE USER
  // ===========================================================================

  describe('createUser', () => {
    const createUserInput = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      roles: ['CLINICIAN'] as UserRole[],
    };

    it('should create user with provided password', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, ...createUserInput });

      const result = await userService.createUser(
        { ...createUserInput, password: 'SecurePass123!' },
        testAdminId
      );

      expect(result.tempPassword).toBeUndefined();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12);
    });

    it('should create user with generated temporary password when not provided', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, ...createUserInput });

      const result = await userService.createUser(createUserInput, testAdminId);

      expect(result.tempPassword).toBe('TempPass123!');
      expect(mockedGenerateTemporaryPassword).toHaveBeenCalled();
      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
            tempPasswordExpiry: expect.any(Date),
          }),
        })
      );
    });

    it('should throw BadRequestError when email is already in use', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.createUser(createUserInput, testAdminId))
        .rejects.toThrow(BadRequestError);
      await expect(userService.createUser(createUserInput, testAdminId))
        .rejects.toThrow('Email already in use');
    });

    it('should set default isActive to true', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, ...createUserInput });

      await userService.createUser(createUserInput, testAdminId);

      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should handle license expiration date', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await userService.createUser(
        { ...createUserInput, licenseExpiration: '2025-12-31' },
        testAdminId
      );

      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            licenseExpiration: expect.any(Date),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // UPDATE USER
  // ===========================================================================

  describe('updateUser', () => {
    const updateInput = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateInput };
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userService.updateUser(testUserId, updateInput, testAdminId);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', updateInput, testAdminId))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when changing to an email already in use', async () => {
      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser) // First call: check user exists
        .mockResolvedValueOnce({ id: 'other-user', email: 'taken@example.com' }); // Second call: check email

      await expect(userService.updateUser(testUserId, { email: 'taken@example.com' }, testAdminId))
        .rejects.toThrow(BadRequestError);
    });

    it('should allow keeping the same email', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.updateUser(testUserId, { email: testEmail }, testAdminId))
        .resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // DEACTIVATE / ACTIVATE USER
  // ===========================================================================

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      const result = await userService.deactivateUser(testUserId, testAdminId);

      expect(result.message).toBe('User deactivated successfully');
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.deactivateUser('nonexistent', testAdminId))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when trying to deactivate yourself', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.deactivateUser(testUserId, testUserId))
        .rejects.toThrow(BadRequestError);
      await expect(userService.deactivateUser(testUserId, testUserId))
        .rejects.toThrow('Cannot deactivate your own account');
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue({ ...inactiveUser, isActive: true });

      const result = await userService.activateUser(testUserId, testAdminId);

      expect(result.message).toBe('User activated successfully');
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.activateUser('nonexistent', testAdminId))
        .rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // PASSWORD MANAGEMENT
  // ===========================================================================

  describe('resetUserPassword', () => {
    it('should reset user password successfully', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.resetUserPassword(testUserId, 'NewPassword123!', testAdminId);

      expect(result.message).toBe('Password reset successfully');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.resetUserPassword('nonexistent', 'pass', testAdminId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.changePassword(testUserId, 'OldPass', 'NewPass123!');

      expect(result.message).toBe('Password changed successfully');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('OldPass', mockUser.password);
      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: false,
            passwordExpiresAt: expect.any(Date), // 6 months from now
            passwordChangedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.changePassword('nonexistent', 'old', 'new'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when old password is incorrect', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.changePassword(testUserId, 'WrongOldPass', 'NewPass'))
        .rejects.toThrow(BadRequestError);
      await expect(userService.changePassword(testUserId, 'WrongOldPass', 'NewPass'))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('forcePasswordChange', () => {
    it('should force password change successfully', async () => {
      const userWithMustChange = { ...mockUser, mustChangePassword: true };
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(userWithMustChange);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.forcePasswordChange(testUserId, 'NewSecurePass123!');

      expect(result.message).toBe('Password set successfully');
      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: false,
            tempPasswordExpiry: null,
            passwordExpiresAt: expect.any(Date),
            passwordChangedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.forcePasswordChange('nonexistent', 'newpass'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when password change is not required', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser); // mustChangePassword = false

      await expect(userService.forcePasswordChange(testUserId, 'NewPass'))
        .rejects.toThrow(BadRequestError);
      await expect(userService.forcePasswordChange(testUserId, 'NewPass'))
        .rejects.toThrow('Password change not required');
    });

    it('should throw BadRequestError when temporary password has expired', async () => {
      const expiredUser = {
        ...mockUser,
        mustChangePassword: true,
        tempPasswordExpiry: new Date(Date.now() - 1000), // Expired
      };
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(expiredUser);

      await expect(userService.forcePasswordChange(testUserId, 'NewPass'))
        .rejects.toThrow(BadRequestError);
      await expect(userService.forcePasswordChange(testUserId, 'NewPass'))
        .rejects.toThrow('Temporary password has expired');
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.requestPasswordReset(testEmail);

      expect(result.message).toBe('If that email exists, a password reset link has been sent');
      expect(mockedSendEmail).toHaveBeenCalled();
    });

    it('should return success even for non-existent user (prevent enumeration)', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.requestPasswordReset('nonexistent@example.com');

      expect(result.message).toBe('If that email exists, a password reset link has been sent');
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it('should store reset token with expiry', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await userService.requestPasswordReset(testEmail);

      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: 'reset-token-123',
            passwordResetExpiry: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const userWithToken = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpiry: new Date(Date.now() + 3600000),
      };
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(userWithToken);
      (mockedIsTokenExpired as jest.Mock).mockReturnValue(false);
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.resetPasswordWithToken('valid-token', 'NewSecurePass123!');

      expect(result.message).toBe('Password reset successfully');
      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: null,
            passwordResetExpiry: null,
            mustChangePassword: false,
          }),
        })
      );
    });

    it('should throw BadRequestError for invalid token', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.resetPasswordWithToken('invalid-token', 'newpass'))
        .rejects.toThrow(BadRequestError);
      await expect(userService.resetPasswordWithToken('invalid-token', 'newpass'))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw BadRequestError for expired token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        passwordResetToken: 'expired-token',
        passwordResetExpiry: new Date(Date.now() - 1000),
      };
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(userWithExpiredToken);
      (mockedIsTokenExpired as jest.Mock).mockReturnValue(true);

      await expect(userService.resetPasswordWithToken('expired-token', 'newpass'))
        .rejects.toThrow(BadRequestError);
      await expect(userService.resetPasswordWithToken('expired-token', 'newpass'))
        .rejects.toThrow('Reset token has expired');
    });
  });

  // ===========================================================================
  // USER INVITATION
  // ===========================================================================

  describe('createUserWithInvitation', () => {
    const inviteInput = {
      email: 'invited@example.com',
      firstName: 'Invited',
      lastName: 'User',
      roles: ['CLINICIAN'] as UserRole[],
    };

    it('should create user and send invitation email', async () => {
      // First findUnique for duplicate check
      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // No duplicate email
        .mockResolvedValueOnce(mockAdmin); // Get inviter info

      (mockedPrisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...inviteInput,
      });
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.createUserWithInvitation(inviteInput, testAdminId);

      expect(result.invitationSent).toBe(true);
      expect(result.tempPassword).toBeUndefined(); // Email sent successfully
      expect(mockedSendEmail).toHaveBeenCalled();
    });

    it('should return temp password if email fails', async () => {
      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAdmin);

      (mockedPrisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...inviteInput,
      });
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockedSendEmail as jest.Mock).mockResolvedValue(false);

      const result = await userService.createUserWithInvitation(inviteInput, testAdminId);

      expect(result.invitationSent).toBe(false);
      expect(result.tempPassword).toBe('TempPass123!');
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation with new temporary password', async () => {
      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser) // Get user
        .mockResolvedValueOnce(mockAdmin); // Get resender info

      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.resendInvitation(testUserId, testAdminId);

      expect(result.message).toBe('Invitation resent successfully');
      expect(result.invitationSent).toBe(true);
      expect(mockedBcrypt.hash).toHaveBeenCalled();
      expect(mockedSendEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.resendInvitation('nonexistent', testAdminId))
        .rejects.toThrow(NotFoundError);
    });

    it('should return temp password if email fails', async () => {
      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin);

      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockedSendEmail as jest.Mock).mockResolvedValue(false);

      const result = await userService.resendInvitation(testUserId, testAdminId);

      expect(result.invitationSent).toBe(false);
      expect(result.tempPassword).toBe('TempPass123!');
    });
  });

  // ===========================================================================
  // USER STATISTICS
  // ===========================================================================

  describe('getUserStats', () => {
    it('should return user statistics with role counts', async () => {
      const mockUsers = [
        { roles: ['CLINICIAN', 'SUPERVISOR'] as UserRole[] },
        { roles: ['CLINICIAN'] as UserRole[] },
        { roles: ['ADMINISTRATOR'] as UserRole[] },
        { roles: ['BILLING'] as UserRole[] },
      ];

      (mockedPrisma.user.count as jest.Mock)
        .mockResolvedValueOnce(4)  // total
        .mockResolvedValueOnce(3)  // active
        .mockResolvedValueOnce(1); // inactive

      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userService.getUserStats();

      expect(result.total).toBe(4);
      expect(result.active).toBe(3);
      expect(result.inactive).toBe(1);

      // Check role counts
      const clinicianRole = result.byRole.find(r => r.role === 'CLINICIAN');
      const supervisorRole = result.byRole.find(r => r.role === 'SUPERVISOR');
      const adminRole = result.byRole.find(r => r.role === 'ADMINISTRATOR');
      const billingRole = result.byRole.find(r => r.role === 'BILLING');

      expect(clinicianRole?.count).toBe(2);
      expect(supervisorRole?.count).toBe(1);
      expect(adminRole?.count).toBe(1);
      expect(billingRole?.count).toBe(1);
    });

    it('should handle empty user list', async () => {
      (mockedPrisma.user.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await userService.getUserStats();

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.inactive).toBe(0);
      expect(result.byRole).toEqual([]);
    });
  });
});
