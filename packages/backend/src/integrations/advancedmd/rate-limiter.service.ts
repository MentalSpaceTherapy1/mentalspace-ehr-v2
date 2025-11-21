/**
 * AdvancedMD Rate Limiter Service
 *
 * Implements 3-tier rate limiting system:
 * - Tier 1 (High Impact): 1 call/min peak, 60/min off-peak
 * - Tier 2 (Medium Impact): 12 calls/min peak, 120/min off-peak
 * - Tier 3 (Low Impact): 24 calls/min peak, 120/min off-peak
 *
 * Peak Hours: 6:00 AM - 6:00 PM Mountain Time, Monday-Friday
 *
 * Features:
 * - Per-endpoint rate tracking
 * - Peak/off-peak hour detection
 * - Exponential backoff on limit exceeded
 * - Database-persisted state
 * - Automatic recovery from backoff
 *
 * @module integrations/advancedmd/rate-limiter.service
 */

import { PrismaClient } from '@prisma/client';
import {
  RateLimitTier,
  RateLimitConfig,
  RateLimiterState,
  RateLimitError,
  TIER1_ENDPOINTS,
  TIER2_ENDPOINTS,
  TIER3_PATTERN,
} from '../../../../shared/src/types/advancedmd.types';

const prisma = new PrismaClient();

/**
 * Rate Limit Configuration by Tier
 */
const RATE_LIMIT_CONFIGS: Record<RateLimitTier, Omit<RateLimitConfig, 'endpoint'>> = {
  tier1: {
    tier: 'tier1',
    limitPeak: 1, // 1 call per minute during peak hours
    limitOffPeak: 60, // 60 calls per minute during off-peak hours
    peakHoursStart: '06:00',
    peakHoursEnd: '18:00',
  },
  tier2: {
    tier: 'tier2',
    limitPeak: 12, // 12 calls per minute during peak hours
    limitOffPeak: 120, // 120 calls per minute during off-peak hours
    peakHoursStart: '06:00',
    peakHoursEnd: '18:00',
  },
  tier3: {
    tier: 'tier3',
    limitPeak: 24, // 24 calls per minute during peak hours
    limitOffPeak: 120, // 120 calls per minute during off-peak hours
    peakHoursStart: '06:00',
    peakHoursEnd: '18:00',
  },
};

/**
 * Exponential Backoff Configuration
 */
const BACKOFF_CONFIG = {
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  multiplier: 2,
  maxRetries: 5,
};

/**
 * Rate Limiter Service for AdvancedMD API
 */
export class AdvancedMDRateLimiterService {
  private stateCache: Map<string, RateLimiterState> = new Map();
  private readonly MOUNTAIN_TIME_OFFSET = -7; // MDT (UTC-7) or MST (UTC-6) - adjust seasonally

  /**
   * Check if request can proceed (respects rate limits)
   * Throws RateLimitError if limit exceeded
   */
  async checkRateLimit(endpoint: string): Promise<void> {
    const tier = this.getTierForEndpoint(endpoint);
    const state = await this.getState(tier, endpoint);
    const config = RATE_LIMIT_CONFIGS[tier];

    // Check if in backoff period
    if (state.isBackingOff && state.backoffUntil) {
      const now = new Date();
      if (now < state.backoffUntil) {
        const waitMs = state.backoffUntil.getTime() - now.getTime();
        throw this.createRateLimitError(
          endpoint,
          tier,
          `Rate limit exceeded, backing off until ${state.backoffUntil.toISOString()}`,
          state.backoffUntil,
          Math.ceil(waitMs / 1000)
        );
      } else {
        // Backoff period ended, reset backoff state
        await this.resetBackoff(tier, endpoint);
        state.isBackingOff = false;
        state.backoffUntil = null;
        state.backoffRetryCount = 0;
      }
    }

    // Update peak hours status
    const isPeakHours = this.isPeakHours();
    state.isPeakHours = isPeakHours;

    // Get current limit based on peak/off-peak
    const currentLimit = isPeakHours ? config.limitPeak : config.limitOffPeak;

    // Reset minute counter if we're in a new minute
    const now = new Date();
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0, 0);

    if (state.currentMinuteStart.getTime() !== minuteStart.getTime()) {
      // New minute started, reset counter
      state.callsThisMinute = 0;
      state.currentMinuteStart = minuteStart;
    }

    // Check if we've exceeded the limit
    if (state.callsThisMinute >= currentLimit) {
      // Exceeded limit, initiate backoff
      await this.initiateBackoff(tier, endpoint, state);

      const retryAfter = state.backoffUntil!;
      const backoffSeconds = Math.ceil((retryAfter.getTime() - now.getTime()) / 1000);

      throw this.createRateLimitError(
        endpoint,
        tier,
        `Rate limit exceeded: ${state.callsThisMinute}/${currentLimit} calls in current minute`,
        retryAfter,
        backoffSeconds
      );
    }

    // Increment counter
    state.callsThisMinute++;
    state.lastCallAt = now;

    // Persist state
    await this.saveState(state, tier, endpoint);
  }

  /**
   * Record successful API call
   */
  async recordSuccess(endpoint: string): Promise<void> {
    const tier = this.getTierForEndpoint(endpoint);
    const state = await this.getState(tier, endpoint);

    state.lastCallSuccess = true;
    state.lastCallError = null;

    await this.saveState(state, tier, endpoint);
  }

  /**
   * Record failed API call (may trigger backoff if rate limit error)
   */
  async recordFailure(endpoint: string, error: string, isRateLimitError: boolean): Promise<void> {
    const tier = this.getTierForEndpoint(endpoint);
    const state = await this.getState(tier, endpoint);

    state.lastCallSuccess = false;
    state.lastCallError = error;

    if (isRateLimitError) {
      // Rate limit error from API, initiate backoff
      await this.initiateBackoff(tier, endpoint, state);
    }

    await this.saveState(state, tier, endpoint);
  }

  /**
   * Get tier classification for endpoint
   */
  private getTierForEndpoint(endpoint: string): RateLimitTier {
    const normalizedEndpoint = endpoint.toUpperCase();

    if (TIER1_ENDPOINTS.includes(normalizedEndpoint as any)) {
      return 'tier1';
    }

    if (TIER2_ENDPOINTS.includes(normalizedEndpoint as any)) {
      return 'tier2';
    }

    // Check if it matches Tier 3 pattern (LOOKUP*)
    if (TIER3_PATTERN.test(normalizedEndpoint)) {
      return 'tier3';
    }

    // Default to Tier 2 (medium impact) for unknown endpoints
    console.warn(`[Rate Limiter] Unknown endpoint: ${endpoint}, defaulting to Tier 2`);
    return 'tier2';
  }

  /**
   * Get rate limiter state (from cache or database)
   */
  private async getState(tier: RateLimitTier, endpoint: string): Promise<RateLimiterState> {
    const cacheKey = `${tier}:${endpoint}`;

    // Check cache first
    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey)!;
    }

    // Load from database
    const config = RATE_LIMIT_CONFIGS[tier];
    let dbState = await prisma.advancedMDRateLimitState.findUnique({
      where: {
        tier_endpoint: {
          tier,
          endpoint,
        },
      },
    });

    if (!dbState) {
      // Create new state
      dbState = await prisma.advancedMDRateLimitState.create({
        data: {
          tier,
          endpoint,
          callsThisMinute: 0,
          callsThisHour: 0,
          currentMinuteStart: new Date(),
          currentHourStart: new Date(),
          isPeakHours: this.isPeakHours(),
          limitPeak: config.limitPeak,
          limitOffPeak: config.limitOffPeak,
          isBackingOff: false,
          backoffRetryCount: 0,
          lastCallSuccess: true,
        },
      });
    }

    // Convert to runtime state
    const state: RateLimiterState = {
      tier: dbState.tier as RateLimitTier,
      endpoint: dbState.endpoint,
      callsThisMinute: dbState.callsThisMinute,
      callsThisHour: dbState.callsThisHour,
      currentMinuteStart: dbState.currentMinuteStart,
      currentHourStart: dbState.currentHourStart,
      isPeakHours: dbState.isPeakHours,
      isBackingOff: dbState.isBackingOff,
      backoffUntil: dbState.backoffUntil,
      backoffRetryCount: dbState.backoffRetryCount,
      lastCallAt: dbState.lastCallAt,
      lastCallSuccess: dbState.lastCallSuccess,
      lastCallError: dbState.lastCallError,
    };

    // Cache it
    this.stateCache.set(cacheKey, state);

    return state;
  }

  /**
   * Save state to database and update cache
   */
  private async saveState(
    state: RateLimiterState,
    tier: RateLimitTier,
    endpoint: string
  ): Promise<void> {
    const cacheKey = `${tier}:${endpoint}`;

    // Update cache
    this.stateCache.set(cacheKey, state);

    // Update database
    await prisma.advancedMDRateLimitState.upsert({
      where: {
        tier_endpoint: {
          tier,
          endpoint,
        },
      },
      create: {
        tier,
        endpoint,
        callsThisMinute: state.callsThisMinute,
        callsThisHour: state.callsThisHour,
        currentMinuteStart: state.currentMinuteStart,
        currentHourStart: state.currentHourStart,
        isPeakHours: state.isPeakHours,
        limitPeak: RATE_LIMIT_CONFIGS[tier].limitPeak,
        limitOffPeak: RATE_LIMIT_CONFIGS[tier].limitOffPeak,
        isBackingOff: state.isBackingOff,
        backoffUntil: state.backoffUntil,
        backoffRetryCount: state.backoffRetryCount,
        lastCallAt: state.lastCallAt,
        lastCallSuccess: state.lastCallSuccess,
        lastCallError: state.lastCallError,
      },
      update: {
        callsThisMinute: state.callsThisMinute,
        callsThisHour: state.callsThisHour,
        currentMinuteStart: state.currentMinuteStart,
        currentHourStart: state.currentHourStart,
        isPeakHours: state.isPeakHours,
        isBackingOff: state.isBackingOff,
        backoffUntil: state.backoffUntil,
        backoffRetryCount: state.backoffRetryCount,
        lastCallAt: state.lastCallAt,
        lastCallSuccess: state.lastCallSuccess,
        lastCallError: state.lastCallError,
      },
    });
  }

  /**
   * Initiate exponential backoff
   */
  private async initiateBackoff(
    tier: RateLimitTier,
    endpoint: string,
    state: RateLimiterState
  ): Promise<void> {
    const retryCount = state.backoffRetryCount;
    const delayMs = Math.min(
      BACKOFF_CONFIG.initialDelayMs * Math.pow(BACKOFF_CONFIG.multiplier, retryCount),
      BACKOFF_CONFIG.maxDelayMs
    );

    const now = new Date();
    const backoffUntil = new Date(now.getTime() + delayMs);

    state.isBackingOff = true;
    state.backoffUntil = backoffUntil;
    state.backoffRetryCount = Math.min(retryCount + 1, BACKOFF_CONFIG.maxRetries);

    console.warn(
      `[Rate Limiter] Tier ${tier} endpoint ${endpoint} backing off until ${backoffUntil.toISOString()} (retry ${state.backoffRetryCount}/${BACKOFF_CONFIG.maxRetries})`
    );

    await this.saveState(state, tier, endpoint);
  }

  /**
   * Reset backoff state
   */
  private async resetBackoff(tier: RateLimitTier, endpoint: string): Promise<void> {
    await prisma.advancedMDRateLimitState.update({
      where: {
        tier_endpoint: {
          tier,
          endpoint,
        },
      },
      data: {
        isBackingOff: false,
        backoffUntil: null,
        backoffRetryCount: 0,
      },
    });

    // Clear cache to force reload
    const cacheKey = `${tier}:${endpoint}`;
    this.stateCache.delete(cacheKey);
  }

  /**
   * Check if current time is during peak hours (Mountain Time)
   * Peak Hours: 6:00 AM - 6:00 PM MT, Monday-Friday
   */
  private isPeakHours(): boolean {
    const now = new Date();

    // Convert to Mountain Time
    const mtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

    // Check if weekend
    const dayOfWeek = mtTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Sunday (0) or Saturday (6)
    }

    // Check if within peak hours (6 AM - 6 PM)
    const hours = mtTime.getHours();
    return hours >= 6 && hours < 18;
  }

  /**
   * Create rate limit error
   */
  private createRateLimitError(
    endpoint: string,
    tier: RateLimitTier,
    message: string,
    retryAfter: Date,
    backoffSeconds: number
  ): RateLimitError {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      endpoint,
      timestamp: new Date(),
      isRateLimitError: true,
      isAuthError: false,
      isValidationError: false,
      retryable: true,
      tier,
      retryAfter,
      backoffSeconds,
    };
  }

  /**
   * Get rate limit status for an endpoint (for monitoring/debugging)
   */
  async getRateLimitStatus(endpoint: string): Promise<{
    tier: RateLimitTier;
    isPeakHours: boolean;
    currentLimit: number;
    callsThisMinute: number;
    remainingCalls: number;
    isBackingOff: boolean;
    backoffUntil: Date | null;
  }> {
    const tier = this.getTierForEndpoint(endpoint);
    const state = await this.getState(tier, endpoint);
    const config = RATE_LIMIT_CONFIGS[tier];
    const isPeakHours = this.isPeakHours();
    const currentLimit = isPeakHours ? config.limitPeak : config.limitOffPeak;
    const remainingCalls = Math.max(0, currentLimit - state.callsThisMinute);

    return {
      tier,
      isPeakHours,
      currentLimit,
      callsThisMinute: state.callsThisMinute,
      remainingCalls,
      isBackingOff: state.isBackingOff,
      backoffUntil: state.backoffUntil,
    };
  }

  /**
   * Reset all rate limit states (admin function)
   */
  async resetAllStates(): Promise<void> {
    await prisma.advancedMDRateLimitState.updateMany({
      data: {
        callsThisMinute: 0,
        callsThisHour: 0,
        isBackingOff: false,
        backoffUntil: null,
        backoffRetryCount: 0,
      },
    });

    this.stateCache.clear();

    console.log('[Rate Limiter] All rate limit states reset');
  }
}

/**
 * Lazy singleton instance
 * Created on first access to avoid issues during module loading
 */
let _advancedMDRateLimiterInstance: AdvancedMDRateLimiterService | null = null;

function getAdvancedMDRateLimiterInstance(): AdvancedMDRateLimiterService {
  if (!_advancedMDRateLimiterInstance) {
    _advancedMDRateLimiterInstance = new AdvancedMDRateLimiterService();
  }
  return _advancedMDRateLimiterInstance;
}

// Export as a property getter to maintain lazy initialization
export const advancedMDRateLimiter = new Proxy({} as AdvancedMDRateLimiterService, {
  get(target, prop) {
    return getAdvancedMDRateLimiterInstance()[prop as keyof AdvancedMDRateLimiterService];
  },
});
