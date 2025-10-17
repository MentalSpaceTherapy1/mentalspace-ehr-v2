/**
 * AdvancedMD API Rate Limiter
 * Implements intelligent rate limiting based on API tier and peak hours
 */

import { getRateLimitForEndpoint, isPeakHours } from '../../config/advancedmd.config';
import logger from '../../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class AdvancedMDRateLimiter {
  private minuteLimits: Map<string, RateLimitEntry> = new Map();
  private hourLimits: Map<string, RateLimitEntry> = new Map();
  private queue: Array<{
    endpoint: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private processing = false;

  /**
   * Wait for rate limit availability and acquire slot
   */
  async acquire(endpoint: string, officeKey: string): Promise<void> {
    const key = `${officeKey}:${endpoint}`;

    return new Promise((resolve, reject) => {
      this.queue.push({
        endpoint: key,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue of pending requests
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      if (this.canProceed(request.endpoint)) {
        this.incrementCounters(request.endpoint);
        this.queue.shift();
        request.resolve();
      } else {
        // Wait before checking again
        const waitTime = this.getWaitTime(request.endpoint);
        logger.debug('Rate limit reached, waiting', {
          endpoint: request.endpoint,
          waitTime,
          queueLength: this.queue.length,
        });

        await this.sleep(waitTime);
      }
    }

    this.processing = false;
  }

  /**
   * Check if request can proceed based on rate limits
   */
  private canProceed(key: string): boolean {
    const endpoint = this.extractEndpoint(key);
    const limits = getRateLimitForEndpoint(endpoint);

    // Clean up expired entries
    this.cleanupExpiredEntries();

    // Check minute limit
    const minuteEntry = this.minuteLimits.get(key);
    if (minuteEntry && minuteEntry.count >= limits.callsPerMinute) {
      return false;
    }

    // Check hour limit
    const hourEntry = this.hourLimits.get(key);
    if (hourEntry && hourEntry.count >= limits.callsPerHour) {
      return false;
    }

    return true;
  }

  /**
   * Increment rate limit counters
   */
  private incrementCounters(key: string): void {
    const now = Date.now();

    // Increment minute counter
    const minuteEntry = this.minuteLimits.get(key);
    if (minuteEntry && minuteEntry.resetTime > now) {
      minuteEntry.count++;
    } else {
      this.minuteLimits.set(key, {
        count: 1,
        resetTime: now + 60 * 1000, // 1 minute
      });
    }

    // Increment hour counter
    const hourEntry = this.hourLimits.get(key);
    if (hourEntry && hourEntry.resetTime > now) {
      hourEntry.count++;
    } else {
      this.hourLimits.set(key, {
        count: 1,
        resetTime: now + 60 * 60 * 1000, // 1 hour
      });
    }
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();

    // Clean minute limits
    for (const [key, entry] of this.minuteLimits.entries()) {
      if (entry.resetTime <= now) {
        this.minuteLimits.delete(key);
      }
    }

    // Clean hour limits
    for (const [key, entry] of this.hourLimits.entries()) {
      if (entry.resetTime <= now) {
        this.hourLimits.delete(key);
      }
    }
  }

  /**
   * Get wait time until rate limit resets
   */
  private getWaitTime(key: string): number {
    const now = Date.now();
    const minuteEntry = this.minuteLimits.get(key);
    const hourEntry = this.hourLimits.get(key);

    const minuteWait = minuteEntry ? Math.max(0, minuteEntry.resetTime - now) : 0;
    const hourWait = hourEntry ? Math.max(0, hourEntry.resetTime - now) : 0;

    // Return the shorter wait time
    const waitTime = Math.min(
      minuteWait || Number.MAX_SAFE_INTEGER,
      hourWait || Number.MAX_SAFE_INTEGER
    );

    // Add small buffer
    return Math.min(waitTime + 100, 5000); // Max 5 seconds
  }

  /**
   * Extract endpoint name from key
   */
  private extractEndpoint(key: string): string {
    const parts = key.split(':');
    return parts[parts.length - 1];
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status
   */
  getStatus(endpoint: string, officeKey: string): {
    minuteCount: number;
    minuteLimit: number;
    hourCount: number;
    hourLimit: number;
    isPeak: boolean;
  } {
    const key = `${officeKey}:${endpoint}`;
    const limits = getRateLimitForEndpoint(endpoint);

    const minuteEntry = this.minuteLimits.get(key);
    const hourEntry = this.hourLimits.get(key);

    return {
      minuteCount: minuteEntry?.count || 0,
      minuteLimit: limits.callsPerMinute,
      hourCount: hourEntry?.count || 0,
      hourLimit: limits.callsPerHour,
      isPeak: isPeakHours(),
    };
  }

  /**
   * Clear all rate limits (for testing)
   */
  reset(): void {
    this.minuteLimits.clear();
    this.hourLimits.clear();
    this.queue = [];
    this.processing = false;
  }
}

// Export singleton instance
export const advancedMDRateLimiter = new AdvancedMDRateLimiter();
