import * as cacheService from './cache.service';
import logger from '../utils/logger';

/**
 * Session Cache Service
 *
 * Caches session validation results to reduce database load.
 * Uses DynamoDB-based cache with short TTL (60 seconds) to balance
 * performance with security (quick invalidation on logout/changes).
 *
 * Cache key format: session:{token}
 */

const SESSION_CACHE_PREFIX = 'session';
const SESSION_CACHE_TTL = 60; // 60 seconds - short TTL for security
const SESSION_CACHE_CATEGORY = 'sessions';

export interface CachedSessionData {
  userId: string;
  sessionId: string;
  isActive: boolean;
  expiresAt: string; // ISO string
  lastActivity: string; // ISO string
  userIsActive: boolean;
  accountLockedUntil: string | null;
}

/**
 * Generate cache key for a session token
 */
function getCacheKey(token: string): string {
  // Use first 16 chars of token for key to avoid super long keys
  // Full token is still required for validation
  const tokenPrefix = token.substring(0, 16);
  return `${SESSION_CACHE_PREFIX}:${tokenPrefix}`;
}

/**
 * Get cached session data
 * @param token Session token
 * @returns Cached session data or null if not cached/expired
 */
export async function getCachedSession(token: string): Promise<CachedSessionData | null> {
  try {
    const cacheKey = getCacheKey(token);
    const cached = await cacheService.get<CachedSessionData>(cacheKey);

    if (cached) {
      logger.debug('Session cache hit', { cacheKey: cacheKey.substring(0, 20) });
      return cached;
    }

    return null;
  } catch (error) {
    logger.error('Session cache get error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Cache session data
 * @param token Session token
 * @param sessionData Session data to cache
 */
export async function cacheSession(
  token: string,
  sessionData: CachedSessionData
): Promise<boolean> {
  try {
    const cacheKey = getCacheKey(token);

    await cacheService.set(
      cacheKey,
      sessionData,
      SESSION_CACHE_TTL,
      SESSION_CACHE_CATEGORY
    );

    logger.debug('Session cached', { cacheKey: cacheKey.substring(0, 20) });
    return true;
  } catch (error) {
    logger.error('Session cache set error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Invalidate cached session
 * @param token Session token
 */
export async function invalidateSessionCache(token: string): Promise<boolean> {
  try {
    const cacheKey = getCacheKey(token);
    await cacheService.del(cacheKey);
    logger.debug('Session cache invalidated', { cacheKey: cacheKey.substring(0, 20) });
    return true;
  } catch (error) {
    logger.error('Session cache invalidate error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Invalidate all session caches for a category
 * Used when terminating all user sessions
 */
export async function invalidateAllSessionCaches(): Promise<number> {
  try {
    return await cacheService.invalidateCategory(SESSION_CACHE_CATEGORY);
  } catch (error) {
    logger.error('Session cache category invalidate error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

export default {
  getCachedSession,
  cacheSession,
  invalidateSessionCache,
  invalidateAllSessionCaches,
};
