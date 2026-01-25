import crypto from 'crypto';
import prisma from './database';
import { auditLogger } from '../utils/logger';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import * as sessionCache from './sessionCache.service';
import type { CachedSessionData } from './sessionCache.service';

/**
 * Session Management Service
 *
 * Implements secure session management with:
 * - Inactivity timeout (20 minutes)
 * - Maximum concurrent sessions (2)
 * - Secure random token generation
 * - Session validation and cleanup
 */

export class SessionService {
  // Configuration constants
  private readonly INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
  private readonly MAX_CONCURRENT_SESSIONS = 2;
  private readonly TOKEN_BYTES = 32; // 256 bits

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    deviceTrusted: boolean = false
  ): Promise<{ sessionId: string; token: string }> {
    // Check concurrent session limit
    const canCreateSession = await this.checkConcurrentSessions(userId);
    if (!canCreateSession) {
      // Terminate oldest session to make room
      await this.terminateOldestSession(userId);
    }

    // Generate secure random token
    const token = this.generateSecureToken();

    // Calculate expiration time (20 minutes from now)
    const expiresAt = new Date(Date.now() + this.INACTIVITY_TIMEOUT_MS);

    // Create session in database
    const session = await prisma.session.create({
      data: {
        userId,
        token,
        ipAddress,
        userAgent,
        deviceTrusted,
        expiresAt,
        lastActivity: new Date(),
        isActive: true,
      },
    });

    // Log session creation
    auditLogger.info('Session created', {
      userId,
      sessionId: session.id,
      ipAddress,
      action: 'SESSION_CREATED',
    });

    return {
      sessionId: session.id,
      token: session.token,
    };
  }

  /**
   * Validate a session token and return user if valid
   * Uses caching to reduce database load (60-second TTL)
   */
  async validateSession(token: string): Promise<{ userId: string; sessionId: string } | null> {
    // Check cache first
    const cachedSession = await sessionCache.getCachedSession(token);

    if (cachedSession) {
      // Validate cached data
      const now = new Date();
      const expiresAt = new Date(cachedSession.expiresAt);
      const lastActivity = new Date(cachedSession.lastActivity);

      // Check if session is active
      if (!cachedSession.isActive) {
        return null;
      }

      // Check if session has expired
      if (now > expiresAt) {
        await this.terminateSession(cachedSession.sessionId, token);
        auditLogger.info('Session expired (from cache)', {
          userId: cachedSession.userId,
          sessionId: cachedSession.sessionId,
          action: 'SESSION_EXPIRED',
        });
        return null;
      }

      // Check if user account is locked
      if (cachedSession.accountLockedUntil && now < new Date(cachedSession.accountLockedUntil)) {
        await this.terminateSession(cachedSession.sessionId, token);
        throw new UnauthorizedError('Account is locked. Please contact administrator.');
      }

      // Check if user is active
      if (!cachedSession.userIsActive) {
        await this.terminateSession(cachedSession.sessionId, token);
        throw new UnauthorizedError('Account is disabled. Please contact administrator.');
      }

      // Check if session has been inactive for too long
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      if (timeSinceLastActivity > this.INACTIVITY_TIMEOUT_MS) {
        await this.terminateSession(cachedSession.sessionId, token);
        auditLogger.info('Session timed out due to inactivity (from cache)', {
          userId: cachedSession.userId,
          sessionId: cachedSession.sessionId,
          action: 'SESSION_TIMEOUT',
        });
        throw new UnauthorizedError('Session timed out due to inactivity. Please log in again.');
      }

      // Cache hit - return cached data (activity will be updated separately)
      return {
        userId: cachedSession.userId,
        sessionId: cachedSession.sessionId,
      };
    }

    // Cache miss - query database
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            accountLockedUntil: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is active
    if (!session.isActive) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await this.terminateSession(session.id, token);
      auditLogger.info('Session expired', {
        userId: session.userId,
        sessionId: session.id,
        action: 'SESSION_EXPIRED',
      });
      return null;
    }

    // Check if user account is locked
    if (session.user.accountLockedUntil && new Date() < session.user.accountLockedUntil) {
      await this.terminateSession(session.id, token);
      throw new UnauthorizedError('Account is locked. Please contact administrator.');
    }

    // Check if user is active
    if (!session.user.isActive) {
      await this.terminateSession(session.id, token);
      throw new UnauthorizedError('Account is disabled. Please contact administrator.');
    }

    // Check if session has been inactive for too long
    const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();
    if (timeSinceLastActivity > this.INACTIVITY_TIMEOUT_MS) {
      await this.terminateSession(session.id, token);
      auditLogger.info('Session timed out due to inactivity', {
        userId: session.userId,
        sessionId: session.id,
        action: 'SESSION_TIMEOUT',
      });
      throw new UnauthorizedError('Session timed out due to inactivity. Please log in again.');
    }

    // Cache the session data for future requests
    const cacheData: CachedSessionData = {
      userId: session.userId,
      sessionId: session.id,
      isActive: session.isActive,
      expiresAt: session.expiresAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      userIsActive: session.user.isActive,
      accountLockedUntil: session.user.accountLockedUntil?.toISOString() || null,
    };
    await sessionCache.cacheSession(token, cacheData);

    return {
      userId: session.userId,
      sessionId: session.id,
    };
  }

  /**
   * Update session last activity timestamp
   * Note: Cache is updated on next validateSession call (60s TTL handles staleness)
   */
  async updateActivity(sessionId: string): Promise<void> {
    const newExpiresAt = new Date(Date.now() + this.INACTIVITY_TIMEOUT_MS);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date(),
        expiresAt: newExpiresAt,
      },
    });
    // Note: We don't update cache here because:
    // 1. Cache has short 60s TTL, so it auto-refreshes
    // 2. Updating cache on every activity would negate performance gains
    // 3. The cached lastActivity is used for inactivity checks, and
    //    the 60s cache TTL is much shorter than the 20min inactivity timeout
  }

  /**
   * Terminate a specific session
   * @param sessionId Session ID
   * @param token Optional token for cache invalidation (if known)
   */
  async terminateSession(sessionId: string, token?: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, token: true },
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    // Invalidate session cache
    const sessionToken = token || session?.token;
    if (sessionToken) {
      await sessionCache.invalidateSessionCache(sessionToken);
    }

    if (session) {
      auditLogger.info('Session terminated', {
        userId: session.userId,
        sessionId,
        action: 'SESSION_TERMINATED',
      });
    }
  }

  /**
   * Terminate all sessions for a user (logout from all devices)
   */
  async terminateAllUserSessions(userId: string): Promise<number> {
    // Get all active session tokens for cache invalidation
    const activeSessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { token: true },
    });

    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Invalidate all session caches
    for (const session of activeSessions) {
      await sessionCache.invalidateSessionCache(session.token);
    }

    auditLogger.info('All user sessions terminated', {
      userId,
      count: result.count,
      action: 'ALL_SESSIONS_TERMINATED',
    });

    return result.count;
  }

  /**
   * Check if user can create a new session (concurrent session limit)
   */
  async checkConcurrentSessions(userId: string): Promise<boolean> {
    const activeSessions = await prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return activeSessions < this.MAX_CONCURRENT_SESSIONS;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string) {
    return prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceTrusted: true,
        createdAt: true,
        lastActivity: true,
        expiresAt: true,
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });
  }

  /**
   * Terminate the oldest session for a user (to make room for new session)
   */
  private async terminateOldestSession(userId: string): Promise<void> {
    const oldestSession = await prisma.session.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastActivity: 'asc',
      },
    });

    if (oldestSession) {
      await this.terminateSession(oldestSession.id);
      auditLogger.info('Oldest session terminated to make room for new session', {
        userId,
        sessionId: oldestSession.id,
        action: 'SESSION_REPLACED',
      });
    }
  }

  /**
   * Cleanup expired sessions (to be run as a cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isActive: false,
          },
        ],
      },
    });

    if (result.count > 0) {
      auditLogger.info('Expired sessions cleaned up', {
        count: result.count,
        action: 'SESSIONS_CLEANUP',
      });
    }

    return result.count;
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_BYTES).toString('base64url');
  }

  /**
   * Extend session expiration (for "extend session" feature)
   */
  async extendSession(sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedError('Session not found or inactive');
    }

    const newExpiresAt = new Date(Date.now() + this.INACTIVITY_TIMEOUT_MS);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: newExpiresAt,
        lastActivity: new Date(),
      },
    });

    // Invalidate cache so next request gets fresh data
    await sessionCache.invalidateSessionCache(session.token);

    auditLogger.info('Session extended', {
      userId: session.userId,
      sessionId,
      action: 'SESSION_EXTENDED',
    });
  }
}

export default new SessionService();
