/**
 * AdvancedMD API Client
 *
 * Base client for all AdvancedMD API interactions
 * Integrates authentication, rate limiting, error handling, and retry logic
 *
 * Features:
 * - Automatic authentication (token management)
 * - 3-tier rate limiting
 * - Request/response logging
 * - Comprehensive error handling
 * - Retry logic with exponential backoff
 * - Sync log tracking
 *
 * @module integrations/advancedmd/api-client
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PrismaClient } from '@prisma/client';
import { advancedMDAuth } from './auth.service';
import { advancedMDRateLimiter } from './rate-limiter.service';
import {
  AdvancedMDResponse,
  AdvancedMDError,
  RateLimitError,
  SyncLogEntry,
  SyncType,
  SyncDirection,
  SyncStatus,
  AMDDateTimeString,
} from '../../types/advancedmd.types';

const prisma = new PrismaClient();

/**
 * API Request Options
 */
export interface APIRequestOptions {
  endpoint: string; // API endpoint name (for rate limiting)
  action: string; // AdvancedMD action name
  data?: any; // Request payload
  syncLog?: {
    syncType: SyncType;
    entityId: string;
    entityType: string;
    direction: SyncDirection;
    triggeredBy?: string;
  };
  retryOnRateLimit?: boolean; // Auto-retry on rate limit (default: true)
  maxRetries?: number; // Max retry attempts (default: 3)
}

/**
 * API Response
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AdvancedMDError;
  syncLogId?: string;
}

/**
 * AdvancedMD API Client
 */
export class AdvancedMDAPIClient {
  private httpClient: AxiosInstance;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    this.httpClient = axios.create({
      timeout: 60000, // 60 second timeout (eligibility can take up to 30s)
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MentalSpace-EHR/2.0',
      },
    });
  }

  /**
   * Execute API request with authentication, rate limiting, and error handling
   */
  async execute<T = any>(options: APIRequestOptions): Promise<APIResponse<T>> {
    const {
      endpoint,
      action,
      data,
      syncLog,
      retryOnRateLimit = true,
      maxRetries = this.DEFAULT_MAX_RETRIES,
    } = options;

    let syncLogId: string | undefined;
    const startTime = Date.now();

    try {
      // Create sync log if requested
      if (syncLog) {
        const logEntry = await this.createSyncLog({
          ...syncLog,
          requestData: data,
        });
        syncLogId = logEntry.id;
      }

      // Check rate limit
      await advancedMDRateLimiter.checkRateLimit(endpoint);

      // Get authentication token and redirect URL
      const token = await advancedMDAuth.getToken();
      const redirectURL = await advancedMDAuth.getRedirectURL('XMLRPC');

      // Build request payload
      const requestPayload = {
        ppmdmsg: {
          '@action': action.toLowerCase(),
          '@class': 'api',
          '@msgtime': this.formatDateTime(new Date()),
          '@nocookie': '0', // Use session token
          ...data,
        },
      };

      // Execute HTTP request
      const response = await this.httpClient.post<AdvancedMDResponse<T>>(redirectURL, requestPayload, {
        headers: {
          Cookie: `token=${token}`,
        },
      });

      // Check response status
      const { ppmdmsg } = response.data || {};

      // If no ppmdmsg in response, log the full response for debugging
      if (!ppmdmsg) {
        console.error('[AMD API] Unexpected response structure:', JSON.stringify(response.data, null, 2));
        throw this.createAPIError(
          endpoint,
          'Invalid response structure from AdvancedMD - missing ppmdmsg',
          requestPayload,
          response.data
        );
      }

      if (ppmdmsg['@status'] === 'error') {
        throw this.createAPIError(
          endpoint,
          ppmdmsg['@errormessage'] || 'Unknown error',
          requestPayload,
          response.data
        );
      }

      // Record success
      await advancedMDRateLimiter.recordSuccess(endpoint);

      // Update sync log
      if (syncLogId) {
        await this.completeSyncLog(syncLogId, 'success', response.data, Date.now() - startTime);
      }

      return {
        success: true,
        data: response.data as T,
        syncLogId,
      };
    } catch (error: any) {
      const isRateLimitError = this.isRateLimitError(error);

      // Record failure
      await advancedMDRateLimiter.recordFailure(
        endpoint,
        error.message,
        isRateLimitError
      );

      // Update sync log
      if (syncLogId) {
        await this.completeSyncLog(
          syncLogId,
          'error',
          null,
          Date.now() - startTime,
          error.message
        );
      }

      // Retry on rate limit if enabled
      if (isRateLimitError && retryOnRateLimit && maxRetries > 0) {
        console.log(
          `[AMD API] Rate limit hit for ${endpoint}, retrying after backoff (${maxRetries} retries remaining)...`
        );

        // Wait for backoff period
        const backoffMs = (error as RateLimitError).backoffSeconds * 1000;
        await this.sleep(backoffMs);

        // Retry with decremented retry count
        return this.execute<T>({
          ...options,
          maxRetries: maxRetries - 1,
        });
      }

      // Return error response
      return {
        success: false,
        error: this.normalizeError(error, endpoint),
        syncLogId,
      };
    }
  }

  /**
   * Execute batch request (multiple API calls with rate limiting)
   */
  async executeBatch<T = any>(
    requests: Omit<APIRequestOptions, 'retryOnRateLimit' | 'maxRetries'>[]
  ): Promise<APIResponse<T>[]> {
    const results: APIResponse<T>[] = [];

    for (const request of requests) {
      const result = await this.execute<T>(request);
      results.push(result);

      // If error occurred and not rate limit, stop batch
      if (!result.success && !this.isRateLimitError(result.error)) {
        console.error('[AMD API] Batch execution stopped due to error:', result.error);
        break;
      }
    }

    return results;
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(params: {
    syncType: SyncType;
    entityId: string;
    entityType: string;
    direction: SyncDirection;
    requestData?: any;
    triggeredBy?: string;
  }): Promise<SyncLogEntry> {
    const log = await prisma.advancedMDSyncLog.create({
      data: {
        syncType: params.syncType,
        entityId: params.entityId,
        entityType: params.entityType,
        syncDirection: params.direction,
        syncStatus: 'pending',
        requestData: params.requestData,
        triggeredBy: params.triggeredBy || 'SYSTEM',
        retryCount: 0,
      },
    });

    return log as SyncLogEntry;
  }

  /**
   * Complete sync log entry
   */
  private async completeSyncLog(
    syncLogId: string,
    status: SyncStatus,
    responseData: any,
    durationMs: number,
    errorMessage?: string
  ): Promise<void> {
    await prisma.advancedMDSyncLog.update({
      where: { id: syncLogId },
      data: {
        syncStatus: status,
        syncCompleted: new Date(),
        durationMs,
        responseData,
        errorMessage,
      },
    });
  }

  /**
   * Format date/time for AdvancedMD API
   * Format: MM/DD/YYYY HH:MM:SS AM/PM
   */
  private formatDateTime(date: Date): AMDDateTimeString {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12

    const hoursStr = String(hours).padStart(2, '0');

    return `${month}/${day}/${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return error?.isRateLimitError === true || error?.code === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * Create standardized API error
   */
  private createAPIError(
    endpoint: string,
    message: string,
    requestData?: any,
    responseData?: any
  ): AdvancedMDError {
    return {
      code: 'API_ERROR',
      message,
      endpoint,
      timestamp: new Date(),
      requestData,
      responseData,
      isRateLimitError: false,
      isAuthError: message.toLowerCase().includes('authentication') || message.toLowerCase().includes('unauthorized'),
      isValidationError: message.toLowerCase().includes('validation') || message.toLowerCase().includes('invalid'),
      retryable: false,
    };
  }

  /**
   * Normalize any error to AdvancedMDError
   */
  private normalizeError(error: any, endpoint: string): AdvancedMDError {
    if (error.code && error.endpoint) {
      // Already an AdvancedMDError
      return error as AdvancedMDError;
    }

    return this.createAPIError(
      endpoint,
      error.message || 'Unknown error',
      error.requestData,
      error.responseData
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initialize the API client (ensures auth service is ready)
   */
  async initialize(): Promise<void> {
    await advancedMDAuth.initialize();
  }

  /**
   * Simple makeRequest helper (wrapper around execute)
   * For convenience when you don't need full execute options
   */
  async makeRequest(endpoint: string, data: any): Promise<APIResponse> {
    return this.execute({
      endpoint,
      action: endpoint,
      data,
      syncLog: undefined, // No automatic sync logging for simple requests
    });
  }

  /**
   * Get recent sync logs for monitoring
   */
  async getRecentSyncLogs(params: {
    syncType?: SyncType;
    entityId?: string;
    limit?: number;
  }): Promise<SyncLogEntry[]> {
    const { syncType, entityId, limit = 50 } = params;

    const logs = await prisma.advancedMDSyncLog.findMany({
      where: {
        ...(syncType && { syncType }),
        ...(entityId && { entityId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return logs as SyncLogEntry[];
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(timeWindowHours: number = 24): Promise<{
    total: number;
    success: number;
    error: number;
    pending: number;
    successRate: number;
    avgDurationMs: number;
  }> {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    const logs = await prisma.advancedMDSyncLog.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
    });

    const total = logs.length;
    const success = logs.filter((l) => l.syncStatus === 'success').length;
    const error = logs.filter((l) => l.syncStatus === 'error').length;
    const pending = logs.filter((l) => l.syncStatus === 'pending').length;
    const successRate = total > 0 ? (success / total) * 100 : 0;

    const completedLogs = logs.filter((l) => l.durationMs !== null);
    const avgDurationMs =
      completedLogs.length > 0
        ? completedLogs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / completedLogs.length
        : 0;

    return {
      total,
      success,
      error,
      pending,
      successRate: Math.round(successRate * 100) / 100,
      avgDurationMs: Math.round(avgDurationMs),
    };
  }
}

/**
 * Lazy singleton instance
 * Created on first access to avoid issues during module loading
 */
let _advancedMDAPIInstance: AdvancedMDAPIClient | null = null;

function getAdvancedMDAPIInstance(): AdvancedMDAPIClient {
  if (!_advancedMDAPIInstance) {
    _advancedMDAPIInstance = new AdvancedMDAPIClient();
  }
  return _advancedMDAPIInstance;
}

// Export as a property getter to maintain lazy initialization
export const advancedMDAPI = new Proxy({} as AdvancedMDAPIClient, {
  get(target, prop) {
    return getAdvancedMDAPIInstance()[prop as keyof AdvancedMDAPIClient];
  },
});
