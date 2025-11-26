/**
 * AdvancedMD Authentication Service
 *
 * Handles two-step authentication flow:
 * 1. Partner Login → Get redirect URLs
 * 2. Redirect Login → Get session token (24-hour validity)
 *
 * Features:
 * - Automatic token refresh (before 24-hour expiration)
 * - Session persistence (database)
 * - Error handling and retry logic
 * - Credential encryption
 *
 * @module integrations/advancedmd/auth.service
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  PartnerLoginRequest,
  RedirectLoginRequest,
  AdvancedMDAuthConfig,
  SessionState,
  AdvancedMDError,
} from '../../../../shared/src/types/advancedmd.types';
import { getAdvancedMDConfig as getEnvConfig } from '../../config/advancedmd.config';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Authentication Service for AdvancedMD API
 */
export class AdvancedMDAuthService {
  private config: AdvancedMDAuthConfig | null = null;
  private session: SessionState | null = null;
  private httpClient: AxiosInstance;
  private readonly TOKEN_REFRESH_BUFFER_HOURS = 1; // Refresh 1 hour before expiration
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly ENCRYPTION_KEY: Buffer;

  constructor() {
    // Initialize encryption key from environment
    const key = process.env.ADVANCEDMD_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ADVANCEDMD_ENCRYPTION_KEY environment variable is required');
    }
    this.ENCRYPTION_KEY = Buffer.from(key, 'hex');

    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MentalSpace-EHR/2.0',
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => this.handleHttpError(error)
    );
  }

  /**
   * Initialize authentication configuration from database
   * Falls back to environment config if database config is not found
   */
  async initialize(): Promise<void> {
    try {
      logger.info('AdvancedMD Auth initializing', {
        environment: process.env.ADVANCEDMD_ENV || 'sandbox'
      });

      const configRecord = await prisma.advancedMDConfig.findFirst({
        where: { environment: process.env.ADVANCEDMD_ENV || 'sandbox' },
      });

      if (!configRecord) {
        logger.info('No AdvancedMD config in database, using environment variables');

        // Fallback to environment configuration
        const envConfig = getEnvConfig();
        this.config = {
          officeKey: envConfig.officeKey,
          partnerUsername: envConfig.username,
          partnerPassword: envConfig.password,
          appUsername: envConfig.username, // Same as partner for now
          appPassword: envConfig.password,
          partnerLoginURL: process.env.ADVANCEDMD_PARTNER_LOGIN_URL || 'https://login.officepracticum.com/3_0/login.aspx',
          environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
        };

        logger.info('AdvancedMD using environment config', { officeKey: this.config.officeKey });
      } else {
        const partnerPassword = this.decrypt(configRecord.partnerPassword);
        const appPassword = this.decrypt(configRecord.appPassword);

        this.config = {
          officeKey: configRecord.officeKey,
          partnerUsername: configRecord.partnerUsername,
          partnerPassword,
          appUsername: configRecord.appUsername,
          appPassword,
          partnerLoginURL: configRecord.partnerLoginURL,
          environment: configRecord.environment as 'sandbox' | 'production',
        };

        logger.info('AdvancedMD using database config', { officeKey: this.config.officeKey });
      }

      // Restore session if token is still valid (only if config was from database)
      if (configRecord && configRecord.currentToken && configRecord.tokenExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(configRecord.tokenExpiresAt);

        if (expiresAt > now) {
          this.session = {
            token: configRecord.currentToken,
            tokenExpiresAt: expiresAt,
            tokenRefreshedAt: configRecord.tokenRefreshedAt
              ? new Date(configRecord.tokenRefreshedAt)
              : null,
            redirectURLXMLRPC: configRecord.redirectURLXMLRPC,
            redirectURLRESTPM: configRecord.redirectURLRESTPM,
            redirectURLRESTEHR: configRecord.redirectURLRESTEHR,
            redirectURLScheduler: configRecord.redirectURLScheduler,
          };

          logger.info('AdvancedMD restored valid session from database');
        } else {
          logger.info('AdvancedMD stored session expired, will re-authenticate');
        }
      }
    } catch (error: any) {
      logger.error('AdvancedMD Auth initialization error', { error: error.message });
      throw new Error(`Failed to initialize AdvancedMD auth: ${error.message}`);
    }
  }

  /**
   * Get current valid session token (auto-refresh if needed)
   */
  async getToken(): Promise<string> {
    if (!this.config) {
      await this.initialize();
    }

    // Check if current token is valid
    if (this.isTokenValid()) {
      return this.session!.token!;
    }

    // Token expired or not exist, perform authentication
    logger.info('AdvancedMD token invalid or expired, performing authentication');
    await this.authenticate();

    if (!this.session?.token) {
      throw new Error('Failed to obtain session token');
    }

    return this.session.token;
  }

  /**
   * Get redirect URL for XMLRPC API calls
   */
  async getRedirectURL(apiType: 'XMLRPC' | 'REST_PM' | 'REST_EHR' | 'Scheduler'): Promise<string> {
    if (!this.session) {
      await this.getToken(); // Will authenticate if needed
    }

    const urlMap = {
      XMLRPC: this.session!.redirectURLXMLRPC,
      REST_PM: this.session!.redirectURLRESTPM,
      REST_EHR: this.session!.redirectURLRESTEHR,
      Scheduler: this.session!.redirectURLScheduler,
    };

    const url = urlMap[apiType];
    if (!url) {
      throw new Error(`Redirect URL for ${apiType} not available`);
    }

    return url;
  }

  /**
   * Perform full two-step authentication
   */
  private async authenticate(): Promise<void> {
    try {
      logger.info('AdvancedMD Step 1: Partner login to get redirect URLs');
      const redirectURLs = await this.performPartnerLogin();

      logger.info('AdvancedMD Step 2: Redirect login to get session token');
      const token = await this.performRedirectLogin(redirectURLs.redirectURLXMLRPC);

      // Create session state
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      this.session = {
        token,
        tokenExpiresAt: expiresAt,
        tokenRefreshedAt: now,
        redirectURLXMLRPC: redirectURLs.redirectURLXMLRPC,
        redirectURLRESTPM: redirectURLs.redirectURLRESTPM,
        redirectURLRESTEHR: redirectURLs.redirectURLRESTEHR,
        redirectURLScheduler: redirectURLs.redirectURLScheduler || null,
      };

      // Persist session to database
      await this.persistSession();

      logger.info('AdvancedMD authentication successful', { tokenExpiresAt: expiresAt });
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Partner Login - Get redirect URLs
   */
  private async performPartnerLogin(): Promise<{
    redirectURLXMLRPC: string;
    redirectURLRESTPM: string;
    redirectURLRESTEHR: string;
    redirectURLScheduler?: string;
  }> {
    const request: PartnerLoginRequest = {
      ppmdmsg: {
        '@action': 'login',
        '@class': 'login',
        '@msgtime': this.formatDateTime(new Date()),
        '@username': this.config!.partnerUsername,
        '@psw': this.config!.partnerPassword,
        '@officecode': parseInt(this.config!.officeKey),
        '@appname': 'API',
      },
    };

    const response = await this.httpClient.post<any>(
      this.config!.partnerLoginURL,
      request
    );

    // Handle PPMDResults response format (newer API)
    if (response.data.PPMDResults) {
      const results = response.data.PPMDResults;

      // Extract usercontext with server URLs (may be present even with errors)
      const usercontext = results.Results?.usercontext;
      if (usercontext && usercontext['@webserver']) {
        logger.debug('AdvancedMD received redirect URL', { webserver: usercontext['@webserver'] });

        return {
          redirectURLXMLRPC: usercontext['@webserver'] + '/xmlrpc/processrequest.aspx',
          redirectURLRESTPM: usercontext['@webserver'] + '/api',
          redirectURLRESTEHR: usercontext['@webserver'] + '/api',
          redirectURLScheduler: undefined,
        };
      }

      // Check for error (only if usercontext not found)
      if (results.Error) {
        const fault = results.Error.Fault;
        throw new Error(`Partner login failed: ${fault.detail.description}`);
      }

      throw new Error('Partner login did not return webserver URL');
    }

    // Handle ppmdmsg response format (older API)
    const { ppmdmsg } = response.data;
    if (ppmdmsg) {
      if (ppmdmsg['@status'] === 'error') {
        throw new Error(`Partner login failed: ${ppmdmsg['@errormessage']}`);
      }

      if (!ppmdmsg.redirectUrl) {
        throw new Error('Partner login did not return redirect URL');
      }

      return {
        redirectURLXMLRPC: ppmdmsg.redirectUrl,
        redirectURLRESTPM: ppmdmsg.redirectUrlPM || '',
        redirectURLRESTEHR: ppmdmsg.redirectUrlEHR || '',
        redirectURLScheduler: undefined,
      };
    }

    throw new Error('Unknown response format from partner login');
  }

  /**
   * Step 2: Redirect Login - Get session token
   * Using app credentials (not partner credentials) with proper field names
   */
  private async performRedirectLogin(redirectURL: string): Promise<string> {
    const request: RedirectLoginRequest = {
      ppmdmsg: {
        '@action': 'login',
        '@class': 'api',
        '@msgtime': this.formatDateTime(new Date()),
        '@appname': 'API',
        username: this.config!.appUsername,
        password: this.config!.appPassword,
      },
    };

    const response = await this.httpClient.post<any>(redirectURL, request);

    // Check for token in cookies (preferred method)
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
      if (tokenCookie) {
        const token = tokenCookie.split(';')[0].split('=')[1];
        logger.debug('AdvancedMD token received via cookie');
        return token;
      }
    }

    // Handle PPMDResults response format (newer API)
    if (response.data.PPMDResults) {
      const results = response.data.PPMDResults;

      // Check for usercontext with token
      const usercontext = results.Results?.usercontext;
      if (usercontext && usercontext['#text']) {
        logger.debug('AdvancedMD token received via usercontext');
        return usercontext['#text'];
      }

      // Check for error
      if (results.Error) {
        const fault = results.Error.Fault;
        throw new Error(`Redirect login failed: ${fault.detail.description}`);
      }

      throw new Error('Redirect login did not return session token');
    }

    // Handle ppmdmsg response format (older API)
    const { ppmdmsg } = response.data;
    if (ppmdmsg) {
      if (ppmdmsg['@status'] === 'error') {
        throw new Error(`Redirect login failed: ${ppmdmsg['@errormessage']}`);
      }

      if (ppmdmsg.token) {
        logger.debug('AdvancedMD token received via ppmdmsg');
        return ppmdmsg.token;
      }
    }

    throw new Error('Redirect login did not return session token');
  }

  /**
   * Check if current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.session || !this.session.token || !this.session.tokenExpiresAt) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(this.session.tokenExpiresAt);
    const refreshThreshold = new Date(
      expiresAt.getTime() - this.TOKEN_REFRESH_BUFFER_HOURS * 60 * 60 * 1000
    );

    // Token is valid if current time is before refresh threshold
    return now < refreshThreshold;
  }

  /**
   * Persist session to database
   */
  private async persistSession(): Promise<void> {
    if (!this.session) return;

    try {
      await prisma.advancedMDConfig.updateMany({
        where: { environment: this.config!.environment },
        data: {
          currentToken: this.session.token,
          tokenExpiresAt: this.session.tokenExpiresAt,
          tokenRefreshedAt: this.session.tokenRefreshedAt,
          redirectURLXMLRPC: this.session.redirectURLXMLRPC,
          redirectURLRESTPM: this.session.redirectURLRESTPM,
          redirectURLRESTEHR: this.session.redirectURLRESTEHR,
          redirectURLScheduler: this.session.redirectURLScheduler,
        },
      });
    } catch (error: any) {
      logger.error('AdvancedMD failed to persist session', { error: error.message });
      // Don't throw - session is still valid in memory
    }
  }

  /**
   * Format date/time for AdvancedMD API
   * Format: MM/DD/YYYY HH:MM:SS AM/PM
   */
  private formatDateTime(date: Date): string {
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
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Handle HTTP errors
   */
  private handleHttpError(error: any): never {
    const amdError: AdvancedMDError = {
      code: error.code || 'HTTP_ERROR',
      message: error.message,
      endpoint: error.config?.url || 'unknown',
      timestamp: new Date(),
      requestData: error.config?.data,
      responseData: error.response?.data,
      httpStatus: error.response?.status,
      isRateLimitError: error.response?.status === 429,
      isAuthError: error.response?.status === 401 || error.response?.status === 403,
      isValidationError: error.response?.status === 400,
      retryable: error.response?.status >= 500 || error.code === 'ECONNABORTED',
    };

    logger.error('AdvancedMD HTTP Error', {
      code: amdError.code,
      endpoint: amdError.endpoint,
      httpStatus: amdError.httpStatus,
      message: amdError.message
    });

    throw amdError;
  }

  /**
   * Force re-authentication (invalidate current session)
   */
  async forceReAuthenticate(): Promise<void> {
    logger.info('AdvancedMD force re-authentication requested');
    this.session = null;
    await this.authenticate();
  }

  /**
   * Get session info (for debugging/monitoring)
   */
  getSessionInfo(): {
    isAuthenticated: boolean;
    tokenExpiresAt: Date | null;
    tokenExpiresIn: number | null; // minutes
  } {
    if (!this.session || !this.session.token || !this.session.tokenExpiresAt) {
      return {
        isAuthenticated: false,
        tokenExpiresAt: null,
        tokenExpiresIn: null,
      };
    }

    const now = new Date();
    const expiresAt = new Date(this.session.tokenExpiresAt);
    const expiresInMs = expiresAt.getTime() - now.getTime();
    const expiresInMinutes = Math.floor(expiresInMs / (60 * 1000));

    return {
      isAuthenticated: this.isTokenValid(),
      tokenExpiresAt: expiresAt,
      tokenExpiresIn: expiresInMinutes,
    };
  }
}

/**
 * Lazy singleton instance
 * Created on first access to avoid environment variable issues during module loading
 */
let _advancedMDAuthInstance: AdvancedMDAuthService | null = null;

function getAdvancedMDAuthInstance(): AdvancedMDAuthService {
  if (!_advancedMDAuthInstance) {
    _advancedMDAuthInstance = new AdvancedMDAuthService();
  }
  return _advancedMDAuthInstance;
}

// Export as a property getter to maintain lazy initialization
export const advancedMDAuth = new Proxy({} as AdvancedMDAuthService, {
  get(target, prop) {
    const instance = getAdvancedMDAuthInstance();
    const value = instance[prop as keyof AdvancedMDAuthService];

    // If it's a function, bind it to the real instance to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }

    return value;
  },
});
