import rateLimit, { Options } from 'express-rate-limit';
import { Request } from 'express';
import { logSecurity } from '../utils/logger';
import logger from '../utils/logger';

// Redis store for distributed rate limiting (optional)
let redisStore: any = null;

/**
 * Initialize Redis store for rate limiting
 * This enables rate limit persistence across container restarts and multi-instance deployments
 */
async function initializeRedisStore(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('REDIS_URL not set - Rate limiting will use in-memory store (resets on container restart)');
    }
    return;
  }

  try {
    // Dynamic imports to avoid loading Redis if not configured
    const { RedisStore } = await import('rate-limit-redis');
    const { default: Redis } = await import('ioredis');

    const redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryDelayOnFailover: 100,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis rate limiter connection error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis rate limiter connected successfully');
    });

    redisStore = new RedisStore({
      // @ts-expect-error - RedisStore typing is compatible with ioredis
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: 'rl:', // Rate limit prefix
    });

    logger.info('Redis-backed rate limiting initialized for distributed deployment');
  } catch (error: any) {
    logger.error('Failed to initialize Redis rate limiter, falling back to in-memory', {
      error: error.message,
    });
  }
}

// Initialize Redis store on module load (async)
initializeRedisStore().catch((err) => {
  logger.error('Redis rate limiter initialization failed', { error: err.message });
});

/**
 * Check if an IP is whitelisted
 * Whitelist is configured via RATE_LIMIT_WHITELIST environment variable (comma-separated IPs)
 */
function isWhitelisted(req: Request): boolean {
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',').map(ip => ip.trim()) || [];
  const clientIP = req.ip || '';

  // Also check X-Forwarded-For for load balancer scenarios
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIP = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  const isWhitelisted = whitelistedIPs.includes(clientIP) ||
                        (forwardedIP ? whitelistedIPs.includes(forwardedIP) : false);

  if (isWhitelisted) {
    logger.debug('Rate limit skipped for whitelisted IP', { clientIP, forwardedIP });
  }

  return isWhitelisted;
}

/**
 * Create a rate limiter with common configuration
 */
function createRateLimiter(config: {
  name: string;
  windowMs: number;
  max: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  skipAuthenticated?: boolean;
  skipWhitelist?: boolean;
}): ReturnType<typeof rateLimit> {
  const options: Partial<Options> = {
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: config.message,
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,

    // Use Redis store if available, otherwise fallback to in-memory
    ...(redisStore && { store: redisStore }),

    // Log rate limit violations for security monitoring
    handler: (req, res, next, options) => {
      logSecurity(`Rate limit exceeded: ${config.name}`, config.severity, {
        ip: req.ip,
        forwardedFor: req.headers['x-forwarded-for'],
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
        limiterName: config.name,
      });

      res.status(429).json(options.message);
    },

    // Skip function based on configuration
    skip: (req) => {
      // Always check whitelist unless explicitly disabled
      if (config.skipWhitelist !== false && isWhitelisted(req)) {
        return true;
      }
      // Skip authenticated users if configured
      if (config.skipAuthenticated && (req as any).user) {
        return true;
      }
      return false;
    },

    // Key generator - use IP from request (trust proxy handles X-Forwarded-For)
    keyGenerator: (req) => {
      // Add limiter name to key to separate rate limits
      return `${config.name}:${req.ip}`;
    },
  };

  return rateLimit(options);
}

/**
 * Rate limiter for authentication endpoints
 * Prevents brute-force attacks on login endpoints
 *
 * HIPAA Security Rule: Implement procedures to monitor login attempts
 */
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Maximum 25 attempts per window (increased for active development)
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  severity: 'medium',
});

/**
 * Stricter rate limiter for password reset endpoints
 * More restrictive to prevent email spam and enumeration attacks
 */
export const passwordResetRateLimiter = createRateLimiter({
  name: 'password-reset',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 attempts per hour
  message: 'Too many password reset requests, please try again after 1 hour',
  severity: 'high',
});

/**
 * General API rate limiter
 * Prevents API abuse and DoS attacks
 */
export const apiRateLimiter = createRateLimiter({
  name: 'api',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  severity: 'low',
  skipAuthenticated: true, // Skip for authenticated users
});

/**
 * Rate limiter for token refresh endpoint
 * More lenient than login since refresh is automatic and requires a valid token
 * Separated from authRateLimiter to prevent auto-refresh from consuming login quota
 */
export const refreshRateLimiter = createRateLimiter({
  name: 'refresh',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Maximum 30 refresh attempts per window (auto-refresh is frequent)
  message: 'Too many token refresh attempts, please try again later',
  severity: 'medium',
});

/**
 * Rate limiter for account creation
 * Prevents automated account creation spam
 */
export const accountCreationRateLimiter = createRateLimiter({
  name: 'account-creation',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Maximum 20 account creations per hour per IP (temporarily increased for testing)
  message: 'Too many accounts created from this IP, please try again later',
  severity: 'high',
});

/**
 * Export function to check if Redis is being used
 * Useful for health checks and monitoring
 */
export function isUsingRedisStore(): boolean {
  return redisStore !== null;
}
