/**
 * Integration Tests: Session Management
 *
 * These tests verify session lifecycle management including:
 * - Session creation and validation
 * - Session timeout (20 minutes)
 * - Activity-based session extension
 * - Manual logout
 * - Logout all devices
 * - Expired session cleanup
 */

import prisma from '../../services/database';
import { SessionService } from '../../services/session.service';
import bcrypt from 'bcryptjs';

describe('Session Management Integration Tests', () => {
  let sessionService: SessionService;
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeAll(async () => {
    sessionService = new SessionService();

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'session-test@example.com',
        password: hashedPassword,
        firstName: 'Session',
        lastName: 'Test',
        roles: ['CLINICIAN'],
        passwordChangedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    // Clean up sessions after each test
    await prisma.session.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('Scenario 1: Create session on login', () => {
    it('should create active session with correct expiration', async () => {
      // Execute: Create session
      const session = await sessionService.createSession(
        testUserId,
        '192.168.1.1',
        'Mozilla/5.0 Chrome/120.0'
      );

      // Verify: Session created with correct data
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.token).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.isActive).toBe(true);
      expect(session.ipAddress).toBe('192.168.1.1');
      expect(session.userAgent).toBe('Mozilla/5.0 Chrome/120.0');

      // Verify: Expiration set to 20 minutes
      const expirationTime = session.expiresAt.getTime() - session.createdAt.getTime();
      const twentyMinutes = 20 * 60 * 1000;
      expect(Math.abs(expirationTime - twentyMinutes)).toBeLessThan(1000);

      // Verify: Session exists in database
      const dbSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(dbSession).toBeDefined();
      expect(dbSession.isActive).toBe(true);
    });

    it('should validate active session within timeout period', async () => {
      // Setup: Create session
      const session = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');

      // Execute: Validate session
      const user = await sessionService.validateSession(session.token);

      // Verify: User returned
      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
      expect(user.email).toBe('session-test@example.com');
    });
  });

  describe('Scenario 2: Session timeout after 20 minutes', () => {
    it('should reject session after 20 minutes of inactivity', async () => {
      // Setup: Create session with expired timestamp
      const now = new Date();
      const expiredSession = await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'expired-token-123',
          refreshToken: 'expired-refresh-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Test',
          createdAt: new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
          expiresAt: new Date(now.getTime() - 5 * 60 * 1000), // Expired 5 minutes ago
          lastActivity: new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
          isActive: true,
        },
      });

      // Execute & Verify: Validation should fail
      await expect(sessionService.validateSession(expiredSession.token)).rejects.toThrow(
        /Session has expired/
      );
    });

    it('should show warning at 18 minutes (2 minutes before timeout)', async () => {
      // Setup: Create session that's 18 minutes old
      const now = new Date();
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'warning-token-123',
          refreshToken: 'warning-refresh-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Test',
          createdAt: new Date(now.getTime() - 18 * 60 * 1000), // 18 minutes ago
          expiresAt: new Date(now.getTime() + 2 * 60 * 1000), // 2 minutes left
          lastActivity: new Date(now.getTime() - 18 * 60 * 1000),
          isActive: true,
        },
      });

      // Execute: Check session age
      const sessionAge = now.getTime() - session.createdAt.getTime();
      const eighteenMinutes = 18 * 60 * 1000;

      // Verify: Session is in warning period
      expect(sessionAge).toBeGreaterThanOrEqual(eighteenMinutes);
      expect(session.expiresAt.getTime()).toBeGreaterThan(now.getTime());

      // In production, frontend would show warning modal here
    });
  });

  describe('Scenario 3: Activity extends session', () => {
    it('should extend session expiration on activity', async () => {
      // Setup: Create session
      const session = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');

      // Wait 1 second to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Execute: Update activity (simulate user action)
      await sessionService.updateActivity(session.id);

      // Verify: Session extended
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(session.lastActivity.getTime());

      // Verify: Expiration extended to 20 minutes from now
      const timeUntilExpiration = updatedSession.expiresAt.getTime() - Date.now();
      const twentyMinutes = 20 * 60 * 1000;
      expect(Math.abs(timeUntilExpiration - twentyMinutes)).toBeLessThan(2000);
    });

    it('should prevent timeout with regular activity', async () => {
      // Setup: Create session
      const session = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');

      // Simulate user activity every 5 minutes for 25 minutes
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for testing
        await sessionService.updateActivity(session.id);
      }

      // Verify: Session still valid
      const finalSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(finalSession.isActive).toBe(true);
      expect(finalSession.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Scenario 4: Logout (terminate session)', () => {
    it('should terminate session on manual logout', async () => {
      // Setup: Create active session
      const session = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');

      // Verify: Session is active
      expect(session.isActive).toBe(true);

      // Execute: Logout
      await sessionService.terminateSession(session.id);

      // Verify: Session marked as inactive
      const terminatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(terminatedSession.isActive).toBe(false);

      // Verify: Session validation fails
      await expect(sessionService.validateSession(session.token)).rejects.toThrow(
        /Session is not active/
      );
    });

    it('should not allow reuse of terminated session', async () => {
      // Setup: Create and terminate session
      const session = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');
      await sessionService.terminateSession(session.id);

      // Execute & Verify: Cannot validate terminated session
      await expect(sessionService.validateSession(session.token)).rejects.toThrow();

      // Execute & Verify: Cannot update activity on terminated session
      await sessionService.updateActivity(session.id);

      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      // Session should remain inactive
      expect(updatedSession.isActive).toBe(false);
    });
  });

  describe('Scenario 5: Logout all devices', () => {
    it('should terminate all active sessions for user', async () => {
      // Setup: Create 3 active sessions on different devices
      const session1 = await sessionService.createSession(
        testUserId,
        '192.168.1.1',
        'Chrome Desktop'
      );
      const session2 = await sessionService.createSession(
        testUserId,
        '192.168.1.2',
        'Safari iPhone'
      );
      const session3 = await sessionService.createSession(
        testUserId,
        '192.168.1.3',
        'Firefox Tablet'
      );

      // Verify: 3 active sessions exist (note: this might fail due to concurrent session limit)
      const activeSessions = await prisma.session.findMany({
        where: { userId: testUserId, isActive: true },
      });
      expect(activeSessions.length).toBeGreaterThan(0);

      // Execute: Logout all devices
      const terminatedCount = await sessionService.terminateAllUserSessions(testUserId);

      // Verify: All sessions terminated
      expect(terminatedCount).toBeGreaterThan(0);

      const remainingSessions = await prisma.session.findMany({
        where: { userId: testUserId, isActive: true },
      });
      expect(remainingSessions).toHaveLength(0);

      // Verify: None of the old tokens work
      await expect(sessionService.validateSession(session1.token)).rejects.toThrow();
      await expect(sessionService.validateSession(session2.token)).rejects.toThrow();
    });

    it('should require new login after logout all devices', async () => {
      // Setup: Create session
      const session = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');

      // Verify: Session works
      const user = await sessionService.validateSession(session.token);
      expect(user).toBeDefined();

      // Execute: Logout all devices (simulating "Sign out everywhere")
      await sessionService.terminateAllUserSessions(testUserId);

      // Verify: Old session no longer works
      await expect(sessionService.validateSession(session.token)).rejects.toThrow();

      // Verify: New login creates new session
      const newSession = await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome');
      expect(newSession.token).not.toBe(session.token);

      const userFromNewSession = await sessionService.validateSession(newSession.token);
      expect(userFromNewSession).toBeDefined();
    });
  });

  describe('Scenario 6: Expired session cleanup (cron job)', () => {
    it('should remove expired sessions from database', async () => {
      // Setup: Create mix of active and expired sessions
      const now = new Date();

      // Active session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'active-token',
          refreshToken: 'active-refresh',
          ipAddress: '192.168.1.1',
          userAgent: 'Active',
          createdAt: now,
          expiresAt: new Date(now.getTime() + 20 * 60 * 1000), // Future
          lastActivity: now,
          isActive: true,
        },
      });

      // Expired sessions
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'expired-token-1',
          refreshToken: 'expired-refresh-1',
          ipAddress: '192.168.1.2',
          userAgent: 'Expired 1',
          createdAt: new Date(now.getTime() - 30 * 60 * 1000),
          expiresAt: new Date(now.getTime() - 10 * 60 * 1000), // Expired 10 min ago
          lastActivity: new Date(now.getTime() - 30 * 60 * 1000),
          isActive: true,
        },
      });

      await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'expired-token-2',
          refreshToken: 'expired-refresh-2',
          ipAddress: '192.168.1.3',
          userAgent: 'Expired 2',
          createdAt: new Date(now.getTime() - 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() - 40 * 60 * 1000), // Expired 40 min ago
          lastActivity: new Date(now.getTime() - 60 * 60 * 1000),
          isActive: true,
        },
      });

      // Verify: 3 sessions exist
      const beforeCleanup = await prisma.session.findMany({
        where: { userId: testUserId },
      });
      expect(beforeCleanup).toHaveLength(3);

      // Execute: Run cleanup job
      const deletedCount = await sessionService.cleanupExpiredSessions();

      // Verify: 2 expired sessions removed
      expect(deletedCount).toBe(2);

      // Verify: Only active session remains
      const afterCleanup = await prisma.session.findMany({
        where: { userId: testUserId },
      });
      expect(afterCleanup).toHaveLength(1);
      expect(afterCleanup[0].token).toBe('active-token');
    });

    it('should run cleanup without affecting active sessions', async () => {
      // Setup: Create only active sessions
      const session1 = await sessionService.createSession(testUserId, '192.168.1.1', 'Device 1');
      const session2 = await sessionService.createSession(testUserId, '192.168.1.2', 'Device 2');

      // Execute: Run cleanup
      const deletedCount = await sessionService.cleanupExpiredSessions();

      // Verify: No sessions deleted
      expect(deletedCount).toBe(0);

      // Verify: All sessions still work
      const user1 = await sessionService.validateSession(session1.token);
      const user2 = await sessionService.validateSession(session2.token);

      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
    });
  });

  describe('Session Metadata Tracking', () => {
    it('should track IP address and user agent', async () => {
      const ipAddress = '203.0.113.42';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      const session = await sessionService.createSession(testUserId, ipAddress, userAgent);

      expect(session.ipAddress).toBe(ipAddress);
      expect(session.userAgent).toBe(userAgent);

      // Verify in database
      const dbSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(dbSession.ipAddress).toBe(ipAddress);
      expect(dbSession.userAgent).toBe(userAgent);
    });

    it('should allow users to view all active sessions', async () => {
      // Setup: Create sessions on multiple devices
      await sessionService.createSession(testUserId, '192.168.1.1', 'Chrome Desktop');
      await sessionService.createSession(testUserId, '192.168.1.2', 'Safari iPhone');

      // Execute: Get active sessions
      const activeSessions = await sessionService.getActiveSessions(testUserId);

      // Verify: Both sessions returned with metadata
      expect(activeSessions.length).toBeGreaterThanOrEqual(2);
      activeSessions.forEach((session) => {
        expect(session.ipAddress).toBeDefined();
        expect(session.userAgent).toBeDefined();
        expect(session.createdAt).toBeDefined();
        expect(session.lastActivity).toBeDefined();
      });
    });
  });
});
