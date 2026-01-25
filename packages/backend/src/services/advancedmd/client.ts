/**
 * AdvancedMD API Client
 * Handles authentication, API calls, and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getAdvancedMDConfig, advancedMDConfig } from '../../config/advancedmd.config';
import { advancedMDRateLimiter } from './rateLimiter';
import logger, { performanceLogger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';

interface AdvancedMDToken {
  accessToken: string;
  expiresAt: number;
}

class AdvancedMDClient {
  private client: AxiosInstance;
  private token: AdvancedMDToken | null = null;
  private tokenRefreshPromise: Promise<void> | null = null;

  constructor() {
    const config = getAdvancedMDConfig();

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: advancedMDConfig.timeout.default,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, refresh and retry
          this.token = null;
          await this.ensureValidToken();
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureValidToken(): Promise<void> {
    // If token refresh is already in progress, wait for it
    if (this.tokenRefreshPromise) {
      await this.tokenRefreshPromise;
      return;
    }

    // Check if current token is still valid (with 1 minute buffer)
    if (this.token && this.token.expiresAt > Date.now() + 60000) {
      return;
    }

    // Start token refresh
    this.tokenRefreshPromise = this.refreshToken();
    await this.tokenRefreshPromise;
    this.tokenRefreshPromise = null;
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<void> {
    const config = getAdvancedMDConfig();
    const startTime = Date.now();

    try {
      logger.info('Refreshing AdvancedMD token');

      const response = await axios.post(
        `${config.baseUrl}/auth/token`,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          username: config.username,
          password: config.password,
          office_key: config.officeKey,
        },
        {
          timeout: 10000,
        }
      );

      this.token = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + advancedMDConfig.token.refreshInterval,
      };

      const duration = Date.now() - startTime;
      logger.info('AdvancedMD token refreshed successfully', { duration: `${duration}ms` });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      logger.error('Failed to refresh AdvancedMD token', {
        error: error.message,
        duration: `${duration}ms`,
      });
      throw new ExternalServiceError('Failed to authenticate with AdvancedMD');
    }
  }

  /**
   * Make an API call with rate limiting and retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const officeConfig = getAdvancedMDConfig();
    const startTime = Date.now();

    // Apply rate limiting
    await advancedMDRateLimiter.acquire(endpoint, officeConfig.officeKey);

    let lastError: any;
    for (let attempt = 1; attempt <= advancedMDConfig.retry.maxAttempts; attempt++) {
      try {
        const response = await this.client.request({
          url: endpoint,
          method,
          data,
          ...config,
        });

        const duration = Date.now() - startTime;
        performanceLogger.info('AdvancedMD API call successful', {
          endpoint,
          method,
          duration: `${duration}ms`,
          attempt,
        });

        return response.data;
      } catch (error: unknown) {
        lastError = error;

        const duration = Date.now() - startTime;
        logger.warn('AdvancedMD API call failed', {
          endpoint,
          method,
          attempt,
          duration: `${duration}ms`,
          error: error.message,
          status: error.response?.status,
        });

        // Don't retry on client errors (4xx except 429)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < advancedMDConfig.retry.maxAttempts) {
          const delay = Math.min(
            advancedMDConfig.retry.initialDelay * Math.pow(2, attempt - 1),
            advancedMDConfig.retry.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new ExternalServiceError(
      `AdvancedMD API call failed: ${lastError.message}`,
      {
        endpoint,
        method,
        status: lastError.response?.status,
        attempts: advancedMDConfig.retry.maxAttempts,
      }
    );
  }

  /**
   * Check real-time eligibility
   */
  async checkEligibility(params: {
    patientId: string;
    payerId: string;
    serviceDate: string;
    serviceTypes?: string[];
  }): Promise<any> {
    return this.makeRequest(
      '/eligibility/check',
      'POST',
      params,
      { timeout: advancedMDConfig.timeout.eligibility }
    );
  }

  /**
   * Create or update patient
   */
  async savePatient(patient: any): Promise<any> {
    return this.makeRequest('/patients', 'POST', patient, {
      timeout: advancedMDConfig.timeout.patient,
    });
  }

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<any> {
    return this.makeRequest(`/patients/${patientId}`, 'GET', undefined, {
      timeout: advancedMDConfig.timeout.patient,
    });
  }

  /**
   * Search for patients
   */
  async searchPatients(criteria: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    /** @deprecated SSN is never collected by MentalSpace. Field exists for AdvancedMD API compatibility only. */
    ssn?: string;
  }): Promise<any> {
    return this.makeRequest('/patients/search', 'POST', criteria, {
      timeout: advancedMDConfig.timeout.patient,
    });
  }

  /**
   * Save charges
   */
  async saveCharges(charges: any[]): Promise<any> {
    return this.makeRequest('/charges', 'POST', { charges }, {
      timeout: advancedMDConfig.timeout.claim,
    });
  }

  /**
   * Update visit with new charges
   */
  async updateVisitWithCharges(visitId: string, charges: any[]): Promise<any> {
    return this.makeRequest(`/visits/${visitId}/charges`, 'PUT', { charges }, {
      timeout: advancedMDConfig.timeout.claim,
    });
  }

  /**
   * Submit claim
   */
  async submitClaim(claim: any): Promise<any> {
    return this.makeRequest('/claims', 'POST', claim, {
      timeout: advancedMDConfig.timeout.claim,
    });
  }

  /**
   * Get claim status
   */
  async getClaimStatus(claimId: string): Promise<any> {
    return this.makeRequest(`/claims/${claimId}/status`, 'GET', undefined, {
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Post payment
   */
  async postPayment(payment: any): Promise<any> {
    return this.makeRequest('/payments', 'POST', payment, {
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Get appointments by date range
   */
  async getAppointments(startDate: string, endDate: string): Promise<any> {
    return this.makeRequest('/appointments', 'GET', undefined, {
      params: { startDate, endDate },
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Get updated patients since last sync
   */
  async getUpdatedPatients(lastSyncTime: string): Promise<any> {
    // This is a Tier 1 high-impact call - use sparingly
    return this.makeRequest('/patients/updated', 'GET', undefined, {
      params: { since: lastSyncTime },
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Get updated visits since last sync
   */
  async getUpdatedVisits(lastSyncTime: string): Promise<any> {
    // This is a Tier 1 high-impact call - use sparingly
    return this.makeRequest('/visits/updated', 'GET', undefined, {
      params: { since: lastSyncTime },
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Lookup CPT codes
   */
  async lookupCPTCodes(search: string): Promise<any> {
    return this.makeRequest('/lookup/cpt', 'GET', undefined, {
      params: { search },
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Lookup ICD-10 codes
   */
  async lookupICD10Codes(search: string): Promise<any> {
    return this.makeRequest('/lookup/icd10', 'GET', undefined, {
      params: { search },
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Lookup payers
   */
  async lookupPayers(search: string): Promise<any> {
    return this.makeRequest('/lookup/payers', 'GET', undefined, {
      params: { search },
      timeout: advancedMDConfig.timeout.default,
    });
  }

  /**
   * Get rate limit status for debugging
   */
  getRateLimitStatus(endpoint: string): any {
    const config = getAdvancedMDConfig();
    return advancedMDRateLimiter.getStatus(endpoint, config.officeKey);
  }
}

// Export singleton instance
export const advancedMDClient = new AdvancedMDClient();
