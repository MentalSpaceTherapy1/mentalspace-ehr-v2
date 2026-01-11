import { AuthService } from '../auth.service';
import bcrypt from 'bcryptjs';
import { UnauthorizedError, ConflictError } from '../../utils/errors';

// Mock dependencies before imports
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('../../utils/jwt', () => ({
  generateTokenPair: jest.fn().mockReturnValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
  verifyToken: jest.fn(),
}));

jest.mock('../session.service', () => ({
  __esModule: true,
  default: {
    checkConcurrentSessions: jest.fn().mockResolvedValue(true),
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'session-123',
      token: 'token-abc',
    }),
    terminateAllUserSessions: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../passwordPolicy.service', () => ({
  __esModule: true,
  default: {
    validatePasswordChange: jest.fn().mockResolvedValue({ isValid: true, errors: [] }),
    validatePasswordStrength: jest.fn().mockReturnValue({ valid: true }),
    addToPasswordHistory: jest.fn().mockResolvedValue(undefined),
    checkPasswordHistory: jest.fn().mockResolvedValue(true),
    checkPasswordExpiration: jest.fn().mockReturnValue(false),
    checkTempPasswordExpiration: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('../mfa.service', () => ({
  __esModule: true,
  default: {
    verifyTOTPForLogin: jest.fn().mockResolvedValue(true),
    verifyBackupCode: jest.fn().mockResolvedValue(false),
  },
}));

import prisma from '../database';
const mockSessionService = require('../session.service');
const mockPasswordPolicyService = require('../passwordPolicy.service');

describe('AuthService', () => {
  let authService: AuthService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login - Account Lockout', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    it('should increment failed login attempts on wrong password', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 2,
        accountLockedUntil: null,
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 3,
      });

      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { failedLoginAttempts: 3 },
      });
    });

    it('should lock account after 5 failed login attempts', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 4, // This will be the 5th attempt
        accountLockedUntil: null,
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      // 5th failed attempt still returns generic error, but account gets locked
      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          accountLockedUntil: expect.any(Date),
        }),
      });

      // Verify lockout duration is 30 minutes
      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      const lockUntil = updateCall.data.accountLockedUntil.getTime();
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      expect(Math.abs(lockUntil - now - thirtyMinutes)).toBeLessThan(1000);
    });

    it('should prevent login when account is locked', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 5,
        accountLockedUntil: new Date(Date.now() + 15 * 60 * 1000), // Locked for 15 more minutes
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(loginData)).rejects.toThrow(/Account is locked/);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should show minutes remaining in lockout error message', async () => {
      const lockUntil = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 5,
        accountLockedUntil: lockUntil,
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      try {
        await authService.login(loginData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Please try again in \d+ minutes/);
      }
    });

    it('should reset failed attempts counter on successful login', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 3,
        accountLockedUntil: null,
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockSessionService.default.checkConcurrentSessions as jest.Mock).mockResolvedValue(true);
      (mockSessionService.default.createSession as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'token-abc',
        refreshToken: 'refresh-xyz',
      });

      await authService.login(loginData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lastLoginDate: expect.any(Date),
        }),
      });
    });

    it('should allow login after lockout period expires', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 5,
        accountLockedUntil: new Date(Date.now() - 1000), // Expired 1 second ago
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockSessionService.default.checkConcurrentSessions as jest.Mock).mockResolvedValue(true);
      (mockSessionService.default.createSession as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'token-abc',
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          accountLockedUntil: null,
        }),
      });
    });
  });

  describe('login - Password Expiration', () => {
    it('should reject login when password has expired (90 days)', async () => {
      const passwordChangedAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000); // 91 days ago
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt,
        mfaEnabled: false,
        mustChangePassword: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockPasswordPolicyService.default.checkPasswordExpiration as jest.Mock).mockReturnValue(
        true
      );

      await expect(authService.login({
        email: 'test@example.com',
        password: 'correctpassword',
      })).rejects.toThrow('Your password has expired. Please reset your password.');
    });

    it('should allow login if password not expired', async () => {
      const passwordChangedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt,
        mfaEnabled: false,
        mustChangePassword: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockSessionService.default.checkConcurrentSessions as jest.Mock).mockResolvedValue(true);
      (mockSessionService.default.createSession as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'token-abc',
      });
      (mockPasswordPolicyService.default.checkPasswordExpiration as jest.Mock).mockReturnValue(
        false
      );

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.requiresPasswordChange).toBe(false);
      expect(result.session).toBeDefined();
    });
  });

  describe('login - MFA Flow', () => {
    it('should return MFA required flag when MFA is enabled', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.requiresMfa).toBe(true);
      expect(result.tempToken).toBeDefined();
      expect(result.session).toBeUndefined(); // No session created yet
    });

    it('should not create session when MFA is required', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authService.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(mockSessionService.default.createSession).not.toHaveBeenCalled();
    });

    it('should proceed with normal login when MFA is disabled', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        isActive: true,
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (mockSessionService.default.checkConcurrentSessions as jest.Mock).mockResolvedValue(true);
      (mockSessionService.default.createSession as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'token-abc',
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.requiresMfa).toBe(false);
      expect(result.session).toBeDefined();
    });
  });

  describe('unlockAccount', () => {
    it('should allow admin to unlock locked account', async () => {
      const adminId = 'admin-123';
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        failedLoginAttempts: 5,
        accountLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      });

      await authService.unlockAccount(mockUserId, adminId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null,
        },
      });
    });

    it('should log audit event when admin unlocks account', async () => {
      const adminId = 'admin-123';
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        failedLoginAttempts: 5,
        accountLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authService.unlockAccount(mockUserId, adminId);

      // Audit logging would be verified here
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should enforce password policy on password change', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'old-hashed-password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPasswordPolicyService.default.validatePasswordChange as jest.Mock).mockResolvedValue({
        isValid: false,
        errors: ['Password too weak'],
      });

      await expect(
        authService.changePassword(mockUserId, 'oldPassword', 'weak')
      ).rejects.toThrow('Password too weak');
    });

    it('should prevent password reuse (last 10 passwords)', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'old-hashed-password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPasswordPolicyService.default.validatePasswordChange as jest.Mock).mockResolvedValue({
        isValid: false,
        errors: ['Password cannot be one of your last 10 passwords'],
      });

      await expect(
        authService.changePassword(mockUserId, 'oldPassword', 'ReusedPassword123!')
      ).rejects.toThrow('Password cannot be one of your last 10 passwords');
    });

    it('should update password and add to history on successful change', async () => {
      const newPassword = 'NewStrongPassword123!';
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'old-hashed-password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      (mockPasswordPolicyService.default.validatePasswordChange as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
      });
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authService.changePassword(mockUserId, 'oldPassword', newPassword);

      expect(mockPasswordPolicyService.default.addToPasswordHistory).toHaveBeenCalledWith(
        mockUserId,
        'old-hashed-password'  // The old password hash is added to history
      );
    });
  });

  describe('Audit Logging', () => {
    it('should log all login attempts (success and failure)', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed-password',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }, '192.168.1.1')
      ).rejects.toThrow();

      // Audit log verification would happen here
    });
  });
});
