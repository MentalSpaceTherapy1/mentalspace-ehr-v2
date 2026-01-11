import { PasswordPolicyService } from '../passwordPolicy.service';
import prisma from '../database';
import bcrypt from 'bcryptjs';

// Mock prisma
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcryptjs');

describe('PasswordPolicyService', () => {
  let passwordPolicyService: PasswordPolicyService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    passwordPolicyService = new PasswordPolicyService();
    jest.clearAllMocks();
  });

  describe('validatePasswordStrength', () => {
    it('should validate password with all required rules', () => {
      // Use a password that doesn't contain common sequences (123, abc, etc.)
      const strongPassword = 'MyStr0ng!P@ss42';

      const result = passwordPolicyService.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password with less than 12 characters', () => {
      const shortPassword = 'Short1!';

      const result = passwordPolicyService.validatePasswordStrength(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const noUppercase = 'myp@ssw0rd123!';

      const result = passwordPolicyService.validatePasswordStrength(noUppercase);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const noLowercase = 'MYP@SSW0RD123!';

      const result = passwordPolicyService.validatePasswordStrength(noLowercase);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const noNumber = 'MyP@ssword!!!';

      const result = passwordPolicyService.validatePasswordStrength(noNumber);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const noSpecial = 'MyPassword123';

      const result = passwordPolicyService.validatePasswordStrength(noSpecial);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character (!@#$%^&* etc.)'
      );
    });

    it('should reject weak passwords with multiple issues', () => {
      const weakPassword = 'password';

      const result = passwordPolicyService.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.score).toBeLessThan(50);
    });

    it('should provide detailed errors for all violations', () => {
      const weakPassword = 'weak';

      const result = passwordPolicyService.validatePasswordStrength(weakPassword);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Password must be at least 12 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number',
          'Password must contain at least one special character (!@#$%^&* etc.)',
        ])
      );
    });

    it('should calculate password strength score', () => {
      // Scoring: 20 pts for length, +15 each for upper/lower/number/special, penalties for common/sequential
      const testCases = [
        { password: 'weak', expectedMaxScore: 30 }, // only has lowercase, too short
        { password: 'WeakPass1!', expectedMaxScore: 70 }, // has all char types but too short
        { password: 'MediumP@ss1', expectedMaxScore: 75 }, // has all but too short
        { password: 'StrongP@ssw0rd123!', expectedMinScore: 60 }, // valid, should have good score
      ];

      testCases.forEach(({ password, expectedMaxScore, expectedMinScore }) => {
        const result = passwordPolicyService.validatePasswordStrength(password);
        if (expectedMaxScore !== undefined) {
          expect(result.score).toBeLessThanOrEqual(expectedMaxScore);
        }
        if (expectedMinScore !== undefined) {
          expect(result.score).toBeGreaterThanOrEqual(expectedMinScore);
        }
      });
    });
  });

  describe('checkPasswordHistory', () => {
    it('should return false when password is not in history (allowed)', async () => {
      const mockUser = {
        id: mockUserId,
        passwordHistory: ['hash1', 'hash2', 'hash3'],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await passwordPolicyService.checkPasswordHistory(
        mockUserId,
        'NewPassword123!'
      );

      // Returns false when password is NOT in history (allowed to use)
      expect(result).toBe(false);
    });

    it('should return true when password matches any of last 10 passwords (violation)', async () => {
      const reusedPassword = 'OldPassword1!';

      const mockUser = {
        id: mockUserId,
        passwordHistory: ['hash1', 'hash2', 'hash3'],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // First comparison matches
        .mockResolvedValue(false);

      const result = await passwordPolicyService.checkPasswordHistory(mockUserId, reusedPassword);

      // Returns true when password IS in history (violation)
      expect(result).toBe(true);
    });

    it('should return false when user has no password history', async () => {
      const mockUser = {
        id: mockUserId,
        passwordHistory: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await passwordPolicyService.checkPasswordHistory(
        mockUserId,
        'NewPassword123!'
      );

      // No history means password is not in history (allowed)
      expect(result).toBe(false);
    });

    it('should check all passwords in history', async () => {
      const mockUser = {
        id: mockUserId,
        passwordHistory: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5'],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await passwordPolicyService.checkPasswordHistory(mockUserId, 'NewPassword123!');

      expect(bcrypt.compare).toHaveBeenCalledTimes(5);
    });
  });

  describe('addToPasswordHistory', () => {
    it('should add new password to history', async () => {
      const newPasswordHash = 'hashed-new-password';
      const existingHistory = ['hash1', 'hash2'];

      const mockUser = {
        id: mockUserId,
        passwordHistory: existingHistory,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHistory: [newPasswordHash, ...existingHistory],
      });

      await passwordPolicyService.addToPasswordHistory(mockUserId, newPasswordHash);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          passwordHistory: [newPasswordHash, ...existingHistory],
          passwordChangedAt: expect.any(Date),
        },
      });
    });

    it('should limit password history to 10 entries', async () => {
      // Create existing history: ['hash-0', 'hash-1', ..., 'hash-9']
      const existingHistory = Array(10)
        .fill(0)
        .map((_, i) => `hash-${i}`);
      const newPasswordHash = 'new-hash';

      const mockUser = {
        id: mockUserId,
        passwordHistory: existingHistory,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHistory: [newPasswordHash, ...existingHistory.slice(0, 9)],
      });

      await passwordPolicyService.addToPasswordHistory(mockUserId, newPasswordHash);

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.passwordHistory).toHaveLength(10);
      expect(updateCall.data.passwordHistory[0]).toBe(newPasswordHash);
      // After trimming to 10 entries, last element is 'hash-8' (oldest 'hash-9' was removed)
      expect(updateCall.data.passwordHistory[9]).toBe('hash-8');
    });

    it('should update passwordChangedAt timestamp', async () => {
      const mockUser = {
        id: mockUserId,
        passwordHistory: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await passwordPolicyService.addToPasswordHistory(mockUserId, 'new-hash');

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.passwordChangedAt).toBeInstanceOf(Date);
    });
  });

  describe('checkPasswordExpiration', () => {
    it('should return false for password changed less than 90 days ago', () => {
      const passwordChangedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const result = passwordPolicyService.checkPasswordExpiration(passwordChangedAt);

      expect(result).toBe(false);
    });

    it('should detect password expiration at exactly 90 days', () => {
      const passwordChangedAt = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const result = passwordPolicyService.checkPasswordExpiration(passwordChangedAt);

      expect(result).toBe(false);
    });

    it('should detect password expiration after 90 days', () => {
      const passwordChangedAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000); // 91 days ago

      const result = passwordPolicyService.checkPasswordExpiration(passwordChangedAt);

      expect(result).toBe(true);
    });

    it('should handle recently changed passwords', () => {
      const passwordChangedAt = new Date(); // Just now

      const result = passwordPolicyService.checkPasswordExpiration(passwordChangedAt);

      expect(result).toBe(false);
    });

    it('should calculate days since password change correctly', () => {
      const testCases = [
        { daysAgo: 0, expectedExpired: false },
        { daysAgo: 45, expectedExpired: false },
        { daysAgo: 89, expectedExpired: false },
        { daysAgo: 90, expectedExpired: false },
        { daysAgo: 91, expectedExpired: true },
        { daysAgo: 120, expectedExpired: true },
      ];

      testCases.forEach(({ daysAgo, expectedExpired }) => {
        const passwordChangedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const result = passwordPolicyService.checkPasswordExpiration(passwordChangedAt);
        expect(result).toBe(expectedExpired);
      });
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should calculate days remaining until expiration', () => {
      const passwordChangedAt = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000); // 80 days ago

      const result = passwordPolicyService.getDaysUntilExpiration(passwordChangedAt);

      expect(result).toBe(10); // 90 - 80 = 10 days remaining
    });

    it('should return 0 for expired password', () => {
      const passwordChangedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      const result = passwordPolicyService.getDaysUntilExpiration(passwordChangedAt);

      expect(result).toBe(0);
    });

    it('should return approximately 90 for just changed password', () => {
      const passwordChangedAt = new Date();

      const result = passwordPolicyService.getDaysUntilExpiration(passwordChangedAt);

      // Due to timing, could be 89 or 90 depending on when the check runs
      expect(result).toBeGreaterThanOrEqual(89);
      expect(result).toBeLessThanOrEqual(90);
    });
  });

  describe('isPasswordExpiringSoon', () => {
    it('should warn when password expires in less than 7 days', () => {
      const passwordChangedAt = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000); // 84 days ago, 6 days left

      const result = passwordPolicyService.isPasswordExpiringSoon(passwordChangedAt);

      expect(result).toBe(true);
    });

    it('should not warn when password has more than 7 days', () => {
      const passwordChangedAt = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000); // 80 days ago, 10 days left

      const result = passwordPolicyService.isPasswordExpiringSoon(passwordChangedAt);

      expect(result).toBe(false);
    });
  });
});
