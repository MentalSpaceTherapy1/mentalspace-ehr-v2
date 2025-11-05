/**
 * Integration Tests: Authentication Flows
 *
 * These tests verify complete authentication workflows including:
 * - Login with valid/invalid credentials
 * - Account lockout after failed attempts
 * - Admin unlock functionality
 * - MFA two-step authentication
 * - Concurrent session management
 */

import prisma from '../../services/database';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { MFAService } from '../../services/mfa.service';
import bcrypt from 'bcryptjs';

describe('Authentication Flow Integration Tests', () => {
  let authService: AuthService;
  let sessionService: SessionService;
  let mfaService: MFAService;

  const testUser = {
    email: 'integration-test@example.com',
    password: 'TestPassword123!',
    firstName: 'Integration',
    lastName: 'Test',
    role: 'CLINICIAN',
  };

  beforeAll(async () => {
    authService = new AuthService();
    sessionService = new SessionService();
    mfaService = new MFAService();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.session.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Scenario 1: Login with valid credentials → session created', () => {
    it('should create session on successful login', async () => {
      // Setup: Create test user
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
        },
      });

      // Execute: Login
      const result = await authService.login(
        {
          email: testUser.email,
          password: testUser.password,
        },
        '192.168.1.1',
        'Test User Agent'
      );

      // Verify: Session created
      expect(result.session).toBeDefined();
      expect(result.session.token).toBeDefined();
      expect(result.session.userId).toBe(user.id);

      // Verify: Session in database
      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].isActive).toBe(true);
    });
  });

  describe('Scenario 2: 5 failed logins → account locked', () => {
    it('should lock account after 5 consecutive failed login attempts', async () => {
      // Setup: Create test user
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
        },
      });

      // Execute: 5 failed login attempts
      for (let i = 1; i <= 5; i++) {
        try {
          await authService.login({
            email: testUser.email,
            password: 'WrongPassword123!',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify: Account is locked
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.accountLockedUntil).toBeDefined();
      expect(user.accountLockedUntil.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Scenario 3: Login while locked → error', () => {
    it('should reject login attempt when account is locked', async () => {
      // Setup: Create locked user
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
          failedLoginAttempts: 5,
          accountLockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        },
      });

      // Execute & Verify: Login attempt fails
      await expect(
        authService.login({
          email: testUser.email,
          password: testUser.password,
        })
      ).rejects.toThrow(/Account locked/);
    });
  });

  describe('Scenario 4: Wait 30 min → login succeeds', () => {
    it('should allow login after lockout period expires', async () => {
      // Setup: Create user with expired lockout
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
          failedLoginAttempts: 5,
          accountLockedUntil: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      // Execute: Login with correct credentials
      const result = await authService.login(
        {
          email: testUser.email,
          password: testUser.password,
        },
        '192.168.1.1'
      );

      // Verify: Login successful
      expect(result.session).toBeDefined();
      expect(result.user).toBeDefined();

      // Verify: Lockout cleared
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.accountLockedUntil).toBeNull();
    });
  });

  describe('Scenario 5: Admin unlock → login succeeds', () => {
    it('should allow login after admin unlocks account', async () => {
      // Setup: Create locked user
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
          failedLoginAttempts: 5,
          accountLockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      // Execute: Admin unlocks account
      await authService.unlockAccount(user.id, 'admin-123');

      // Verify: Account unlocked
      const unlockedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(unlockedUser.failedLoginAttempts).toBe(0);
      expect(unlockedUser.accountLockedUntil).toBeNull();

      // Execute: Login with correct credentials
      const result = await authService.login(
        {
          email: testUser.email,
          password: testUser.password,
        },
        '192.168.1.1'
      );

      // Verify: Login successful
      expect(result.session).toBeDefined();
    });
  });

  describe('Scenario 6: Login with MFA → 2-step flow', () => {
    it('should require MFA verification when MFA is enabled', async () => {
      // Setup: Create user with MFA enabled
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
          mfaEnabled: true,
          mfaSecret: 'encrypted-test-secret',
          mfaBackupCodes: [],
        },
      });

      // Execute: First step - login with password
      const result = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      // Verify: MFA required, no session yet
      expect(result.requiresMfa).toBe(true);
      expect(result.tempToken).toBeDefined();
      expect(result.session).toBeUndefined();

      // Verify: No session in database yet
      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);
    });
  });

  describe('Scenario 7: Skip MFA setup', () => {
    it('should allow user to skip MFA setup and login normally', async () => {
      // Setup: Create user without MFA
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
          mfaEnabled: false, // User skipped MFA setup
        },
      });

      // Execute: Login without MFA
      const result = await authService.login(
        {
          email: testUser.email,
          password: testUser.password,
        },
        '192.168.1.1'
      );

      // Verify: Direct login success, no MFA step
      expect(result.requiresMfa).toBeUndefined();
      expect(result.session).toBeDefined();
      expect(result.session.token).toBeDefined();
    });
  });

  describe('Scenario 8: 3rd concurrent login → blocked', () => {
    it('should block 3rd concurrent session', async () => {
      // Setup: Create user
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt: new Date(),
        },
      });

      // Execute: Create 2 sessions manually
      await prisma.session.create({
        data: {
          userId: user.id,
          token: 'token-1',
          refreshToken: 'refresh-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Device 1',
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      await prisma.session.create({
        data: {
          userId: user.id,
          token: 'token-2',
          refreshToken: 'refresh-2',
          ipAddress: '192.168.1.2',
          userAgent: 'Device 2',
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Verify: 2 sessions exist
      const sessions = await prisma.session.findMany({
        where: { userId: user.id, isActive: true },
      });
      expect(sessions).toHaveLength(2);

      // Execute: Try to create 3rd session
      await expect(
        authService.login(
          {
            email: testUser.email,
            password: testUser.password,
          },
          '192.168.1.3'
        )
      ).rejects.toThrow(/Maximum concurrent sessions/);

      // Verify: Still only 2 sessions
      const finalSessions = await prisma.session.findMany({
        where: { userId: user.id, isActive: true },
      });
      expect(finalSessions).toHaveLength(2);
    });
  });

  describe('Complete User Journey: From Registration to Login', () => {
    it('should handle complete registration and login flow', async () => {
      // Step 1: Register new user
      const registerResult = await authService.register({
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role,
      });

      expect(registerResult.user).toBeDefined();
      expect(registerResult.tokens).toBeDefined();

      // Step 2: Logout (terminate session)
      if (registerResult.session) {
        await sessionService.terminateSession(registerResult.session.id);
      }

      // Step 3: Login again
      const loginResult = await authService.login(
        {
          email: testUser.email,
          password: testUser.password,
        },
        '192.168.1.1'
      );

      expect(loginResult.session).toBeDefined();
      expect(loginResult.user.email).toBe(testUser.email);

      // Step 4: Verify session is active
      const isValid = await sessionService.validateSession(loginResult.session.token);
      expect(isValid).toBeDefined();
    });
  });

  describe('Password Expiration Flow', () => {
    it('should warn user about expired password but still allow login', async () => {
      // Setup: Create user with expired password (91 days old)
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const passwordChangedAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);

      await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          roles: [testUser.role],
          passwordChangedAt,
        },
      });

      // Execute: Login
      const result = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      // Verify: Login succeeds but with expiration warning
      expect(result.session).toBeDefined();
      expect(result.passwordExpired).toBe(true);
    });
  });
});
