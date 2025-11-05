import { SessionService } from '../session.service';
import prisma from '../database';

// Mock prisma
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0';

  beforeEach(() => {
    sessionService = new SessionService();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session with valid data', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        token: 'token-abc',
        refreshToken: 'refresh-xyz',
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        deviceTrusted: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
        lastActivity: new Date(),
        isActive: true,
      };

      (prisma.session.count as jest.Mock).mockResolvedValue(1); // 1 existing session
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessionService.createSession(mockUserId, mockIpAddress, mockUserAgent);

      expect(result).toEqual(mockSession);
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          isActive: true,
        }),
      });
    });

    it('should set expiration to 20 minutes from creation', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        token: 'token-abc',
        refreshToken: 'refresh-xyz',
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        deviceTrusted: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        lastActivity: new Date(),
        isActive: true,
      };

      (prisma.session.count as jest.Mock).mockResolvedValue(0);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessionService.createSession(mockUserId, mockIpAddress, mockUserAgent);

      const expirationTime = result.expiresAt.getTime() - result.createdAt.getTime();
      const twentyMinutes = 20 * 60 * 1000;

      // Allow 1 second variance for test execution time
      expect(Math.abs(expirationTime - twentyMinutes)).toBeLessThan(1000);
    });
  });

  describe('validateSession', () => {
    it('should validate active session within timeout period', async () => {
      const now = new Date();
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        token: 'token-abc',
        lastActivity: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutes from now
        isActive: true,
        user: {
          id: mockUserId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['CLINICIAN'],
          isActive: true,
        },
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessionService.validateSession('token-abc');

      expect(result).toEqual(mockSession.user);
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { token: 'token-abc' },
        include: { user: true },
      });
    });

    it('should reject expired session (>20 min)', async () => {
      const now = new Date();
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        token: 'token-abc',
        lastActivity: new Date(now.getTime() - 21 * 60 * 1000), // 21 minutes ago
        expiresAt: new Date(now.getTime() - 1 * 60 * 1000), // 1 minute ago
        isActive: true,
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      await expect(sessionService.validateSession('token-abc')).rejects.toThrow(
        'Session has expired'
      );
    });

    it('should reject inactive session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        token: 'token-abc',
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isActive: false,
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      await expect(sessionService.validateSession('token-abc')).rejects.toThrow(
        'Session is not active'
      );
    });

    it('should reject non-existent session', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.validateSession('invalid-token')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivity timestamp', async () => {
      const oldActivity = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const mockSession = {
        id: 'session-123',
        lastActivity: oldActivity,
      };

      (prisma.session.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      });

      await sessionService.updateActivity('session-123');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          lastActivity: expect.any(Date),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should extend expiration by 20 minutes', async () => {
      const updatedSession = {
        id: 'session-123',
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      };

      (prisma.session.update as jest.Mock).mockResolvedValue(updatedSession);

      await sessionService.updateActivity('session-123');

      const callArgs = (prisma.session.update as jest.Mock).mock.calls[0][0];
      const newExpiration = callArgs.data.expiresAt.getTime() - Date.now();
      const twentyMinutes = 20 * 60 * 1000;

      // Allow 1 second variance
      expect(Math.abs(newExpiration - twentyMinutes)).toBeLessThan(1000);
    });
  });

  describe('terminateSession', () => {
    it('should terminate session by setting isActive to false', async () => {
      (prisma.session.update as jest.Mock).mockResolvedValue({
        id: 'session-123',
        isActive: false,
      });

      await sessionService.terminateSession('session-123');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { isActive: false },
      });
    });

    it('should handle already terminated session', async () => {
      (prisma.session.update as jest.Mock).mockResolvedValue({
        id: 'session-123',
        isActive: false,
      });

      await expect(sessionService.terminateSession('session-123')).resolves.not.toThrow();
    });
  });

  describe('terminateAllUserSessions', () => {
    it('should terminate all active sessions for user (force logout all devices)', async () => {
      (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await sessionService.terminateAllUserSessions(mockUserId);

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
        data: { isActive: false },
      });
    });

    it('should return count of terminated sessions', async () => {
      (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await sessionService.terminateAllUserSessions(mockUserId);

      expect(result).toBe(2);
    });
  });

  describe('checkConcurrentSessions', () => {
    it('should allow session creation when user has less than 2 active sessions', async () => {
      (prisma.session.count as jest.Mock).mockResolvedValue(1);

      const result = await sessionService.checkConcurrentSessions(mockUserId);

      expect(result).toBe(true);
      expect(prisma.session.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
      });
    });

    it('should block 3rd concurrent session', async () => {
      (prisma.session.count as jest.Mock).mockResolvedValue(2); // Already 2 sessions

      const result = await sessionService.checkConcurrentSessions(mockUserId);

      expect(result).toBe(false);
    });

    it('should allow session when user has 0 active sessions', async () => {
      (prisma.session.count as jest.Mock).mockResolvedValue(0);

      const result = await sessionService.checkConcurrentSessions(mockUserId);

      expect(result).toBe(true);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete all expired sessions', async () => {
      const now = new Date();
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 15 });

      await sessionService.cleanupExpiredSessions();

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return count of deleted sessions', async () => {
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 8 });

      const result = await sessionService.cleanupExpiredSessions();

      expect(result).toBe(8);
    });

    it('should handle case when no expired sessions exist', async () => {
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await sessionService.cleanupExpiredSessions();

      expect(result).toBe(0);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
          createdAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        },
        {
          id: 'session-2',
          userId: mockUserId,
          ipAddress: '192.168.1.2',
          userAgent: 'Firefox',
          createdAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        },
      ];

      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const result = await sessionService.getActiveSessions(mockUserId);

      expect(result).toEqual(mockSessions);
      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
        orderBy: { lastActivity: 'desc' },
      });
    });
  });
});
