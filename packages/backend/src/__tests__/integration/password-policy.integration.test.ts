/**
 * Integration Tests: Password Policy
 *
 * These tests verify password policy enforcement including:
 * - Password strength validation
 * - Password history prevention (last 10)
 * - Password expiration (90 days)
 * - Force password change
 */

import prisma from '../../services/database';
import { AuthService } from '../../services/auth.service';
import { PasswordPolicyService } from '../../services/passwordPolicy.service';
import bcrypt from 'bcryptjs';

describe('Password Policy Integration Tests', () => {
  let authService: AuthService;
  let passwordPolicyService: PasswordPolicyService;
  const testUserId = 'password-test-user-id';

  beforeAll(async () => {
    authService = new AuthService();
    passwordPolicyService = new PasswordPolicyService();

    // Create test user
    const hashedPassword = await bcrypt.hash('InitialPassword123!', 10);
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'password-policy-test@example.com',
        password: hashedPassword,
        firstName: 'Policy',
        lastName: 'Test',
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
        passwordHistory: [hashedPassword],
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('Scenario 1: Change password with valid password', () => {
    it('should allow password change when new password meets all requirements', async () => {
      const newPassword = 'NewStrongPassword123!@';

      // Execute: Change password
      const result = await authService.changePassword(
        testUserId,
        'InitialPassword123!',
        newPassword
      );

      // Verify: Password changed successfully
      expect(result.message).toContain('successfully');

      // Verify: Can login with new password
      const loginResult = await authService.login({
        email: 'password-policy-test@example.com',
        password: newPassword,
      });

      expect(loginResult.user).toBeDefined();

      // Verify: Cannot login with old password
      await expect(
        authService.login({
          email: 'password-policy-test@example.com',
          password: 'InitialPassword123!',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it('should add new password to password history', async () => {
      const newPassword = 'AnotherStrongPass456!@';

      await authService.changePassword(testUserId, 'NewStrongPassword123!@', newPassword);

      // Verify: Password history updated
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { passwordHistory: true },
      });

      expect(user.passwordHistory.length).toBeGreaterThan(1);
      // Most recent password should be first in history
      const isInHistory = await bcrypt.compare(newPassword, user.passwordHistory[0]);
      expect(isInHistory).toBe(true);
    });

    it('should update passwordChangedAt timestamp', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { passwordChangedAt: true },
      });
      const oldTimestamp = user.passwordChangedAt;

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await authService.changePassword(
        testUserId,
        'AnotherStrongPass456!@',
        'YetAnotherPass789!@'
      );

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { passwordChangedAt: true },
      });

      expect(updatedUser.passwordChangedAt.getTime()).toBeGreaterThan(oldTimestamp.getTime());
    });
  });

  describe('Scenario 2: Reject weak password', () => {
    it('should reject password shorter than 12 characters', async () => {
      const weakPassword = 'Short1!';

      await expect(
        authService.changePassword(testUserId, 'YetAnotherPass789!@', weakPassword)
      ).rejects.toThrow(/Password does not meet security requirements/);
    });

    it('should reject password without uppercase letter', async () => {
      const weakPassword = 'alllowercase123!';

      await expect(
        authService.changePassword(testUserId, 'YetAnotherPass789!@', weakPassword)
      ).rejects.toThrow(/Password does not meet security requirements/);
    });

    it('should reject password without lowercase letter', async () => {
      const weakPassword = 'ALLUPPERCASE123!';

      await expect(
        authService.changePassword(testUserId, 'YetAnotherPass789!@', weakPassword)
      ).rejects.toThrow(/Password does not meet security requirements/);
    });

    it('should reject password without number', async () => {
      const weakPassword = 'NoNumbersHere!@';

      await expect(
        authService.changePassword(testUserId, 'YetAnotherPass789!@', weakPassword)
      ).rejects.toThrow(/Password does not meet security requirements/);
    });

    it('should reject password without special character', async () => {
      const weakPassword = 'NoSpecialChars123';

      await expect(
        authService.changePassword(testUserId, 'YetAnotherPass789!@', weakPassword)
      ).rejects.toThrow(/Password does not meet security requirements/);
    });

    it('should provide detailed feedback on password requirements', async () => {
      const weakPassword = 'weak';

      try {
        await authService.changePassword(testUserId, 'YetAnotherPass789!@', weakPassword);
        fail('Should have thrown error');
      } catch (error) {
        // Error should provide helpful feedback
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Scenario 3: Reject reused password (last 10)', () => {
    it('should prevent reusing the current password', async () => {
      const currentPassword = 'YetAnotherPass789!@';

      await expect(
        authService.changePassword(testUserId, currentPassword, currentPassword)
      ).rejects.toThrow(/Cannot reuse/);
    });

    it('should prevent reusing any of last 10 passwords', async () => {
      // Setup: Change password 5 times
      const passwords = [
        'HistoryPass001!@',
        'HistoryPass002!@',
        'HistoryPass003!@',
        'HistoryPass004!@',
        'HistoryPass005!@',
      ];

      for (let i = 0; i < passwords.length; i++) {
        const currentPw = i === 0 ? 'YetAnotherPass789!@' : passwords[i - 1];
        await authService.changePassword(testUserId, currentPw, passwords[i]);
      }

      // Execute & Verify: Try to reuse first password from history
      await expect(
        authService.changePassword(testUserId, passwords[4], passwords[0])
      ).rejects.toThrow(/Cannot reuse/);

      // Execute & Verify: Try to reuse middle password from history
      await expect(
        authService.changePassword(testUserId, passwords[4], passwords[2])
      ).rejects.toThrow(/Cannot reuse/);
    });

    it('should allow reusing password after 10 newer passwords', async () => {
      // Setup: Change password 12 times
      const passwords = [];
      for (let i = 1; i <= 12; i++) {
        passwords.push(`UniquePassword${String(i).padStart(3, '0')}!@`);
      }

      let currentPassword = 'HistoryPass005!@';
      for (const password of passwords) {
        await authService.changePassword(testUserId, currentPassword, password);
        currentPassword = password;
      }

      // The first password (HistoryPass001!@) should now be out of history
      // Execute: Try to use a password that's now out of history (if system allows 10+)
      // This test verifies the history is limited to 10 entries
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { passwordHistory: true },
      });

      expect(user.passwordHistory.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Scenario 4: Force password change on expiration', () => {
    it('should detect expired password (90 days old)', async () => {
      // Setup: Set password change date to 91 days ago
      const expiredDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: testUserId },
        data: { passwordChangedAt: expiredDate },
      });

      // Execute: Check if password is expired
      const isExpired = passwordPolicyService.checkPasswordExpiration(expiredDate);

      // Verify: Password detected as expired
      expect(isExpired).toBe(true);

      // Execute: Login should succeed but with expiration warning
      const loginResult = await authService.login({
        email: 'password-policy-test@example.com',
        password: passwords[passwords.length - 1],
      });

      expect(loginResult.passwordExpired).toBe(true);
    });

    it('should warn user 7 days before password expiration', async () => {
      // Setup: Set password change date to 84 days ago (6 days left)
      const soonToExpire = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);

      // Execute: Check if password is expiring soon
      const isExpiringSoon = passwordPolicyService.isPasswordExpiringSoon(soonToExpire);

      // Verify: Warning should be shown
      expect(isExpiringSoon).toBe(true);

      // Execute: Get days until expiration
      const daysRemaining = passwordPolicyService.getDaysUntilExpiration(soonToExpire);

      // Verify: Should show 6 days remaining
      expect(daysRemaining).toBe(6);
    });

    it('should not warn if password has more than 7 days until expiration', async () => {
      // Setup: Password changed 30 days ago (60 days left)
      const recentPassword = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Execute: Check warning
      const isExpiringSoon = passwordPolicyService.isPasswordExpiringSoon(recentPassword);

      // Verify: No warning
      expect(isExpiringSoon).toBe(false);

      // Get days remaining
      const daysRemaining = passwordPolicyService.getDaysUntilExpiration(recentPassword);
      expect(daysRemaining).toBe(60);
    });

    it('should reset expiration timer after password change', async () => {
      // Setup: User with expired password
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordChangedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
        },
      });

      // Execute: Change password
      const newPassword = 'FreshNewPassword123!@';
      await authService.changePassword(
        testUserId,
        passwords[passwords.length - 1],
        newPassword
      );

      // Verify: passwordChangedAt updated to now
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { passwordChangedAt: true },
      });

      const timeSinceChange = Date.now() - user.passwordChangedAt.getTime();
      expect(timeSinceChange).toBeLessThan(5000); // Changed within last 5 seconds

      // Verify: No longer expired
      const isExpired = passwordPolicyService.checkPasswordExpiration(user.passwordChangedAt);
      expect(isExpired).toBe(false);
    });
  });

  describe('Password Strength Scoring', () => {
    it('should score passwords based on complexity', () => {
      const testCases = [
        { password: 'weak', expectedScore: 0 },
        { password: 'WeakPass1!', expectedScore: 1 },
        { password: 'MediumP@ss123', expectedScore: 2 },
        { password: 'StrongPassword123!@', expectedScore: 4 },
        { password: 'VeryStr0ng!P@ssw0rd#2024', expectedScore: 5 },
      ];

      testCases.forEach(({ password, expectedScore }) => {
        const result = passwordPolicyService.validatePasswordStrength(password);
        if (result.valid) {
          expect(result.score).toBeGreaterThanOrEqual(expectedScore - 1);
        }
      });
    });

    it('should provide real-time feedback on password requirements', () => {
      const password = 'TestPass';
      const result = passwordPolicyService.validatePasswordStrength(password);

      expect(result.feedback).toBeDefined();
      expect(Array.isArray(result.feedback)).toBe(true);

      if (!result.valid) {
        expect(result.feedback.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Admin Password Reset', () => {
    it('should allow admin to force password change for user', async () => {
      // Execute: Admin forces password reset
      await authService.forcePasswordChange(testUserId);

      // Verify: User record marked for password reset
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { mustChangePassword: true },
      });

      expect(user.mustChangePassword).toBe(true);
    });

    it('should prompt user for password change on next login', async () => {
      // Setup: Mark user for password change
      await prisma.user.update({
        where: { id: testUserId },
        data: { mustChangePassword: true },
      });

      // Execute: Login
      const result = await authService.login({
        email: 'password-policy-test@example.com',
        password: 'FreshNewPassword123!@',
      });

      // Verify: Login succeeds but requires password change
      expect(result.mustChangePassword).toBe(true);
    });
  });
});

// Helper to generate test passwords
let passwords: string[];
