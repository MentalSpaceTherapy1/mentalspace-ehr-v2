/**
 * AWS Secrets Manager Service
 *
 * HIPAA Security: Manages sensitive credentials securely with automatic rotation
 * 45 CFR § 164.312(a)(2)(iv) - Encryption and decryption of ePHI
 * 45 CFR § 164.312(d) - Person or entity authentication
 *
 * Features:
 * - Secure storage and retrieval of secrets from AWS Secrets Manager
 * - Automatic secret rotation support
 * - Local caching with TTL to reduce API calls
 * - Fallback to environment variables for local development
 * - Audit logging for secret access
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  RotateSecretCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-secrets-manager';
import logger from '../../utils/logger';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface SecretValue {
  value: string;
  retrievedAt: Date;
  expiresAt: Date;
  version?: string;
}

export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface EncryptionKeys {
  phiEncryptionKey: string;
  jwtSecret: string;
  sessionSecret: string;
  apiEncryptionKey?: string;
}

export interface ThirdPartyApiKeys {
  sendgridApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  advancedMdApiKey?: string;
  advancedMdOfficeKey?: string;
}

export interface SecretsConfig {
  region: string;
  environment: string;
  prefix?: string;
  cacheTtlMs?: number;
  enableRotation?: boolean;
  rotationIntervalDays?: number;
  fallbackToEnv?: boolean;
}

interface CachedSecret {
  value: any;
  expiresAt: number;
  version?: string;
}

// =============================================================================
// SECRET NAMES (AWS Secrets Manager naming convention)
// =============================================================================

const getSecretName = (prefix: string, env: string, name: string): string => {
  return `${prefix}/${env}/${name}`;
};

export const SecretNames = {
  DATABASE_CREDENTIALS: 'database/credentials',
  ENCRYPTION_KEYS: 'security/encryption-keys',
  JWT_SECRET: 'security/jwt-secret',
  SESSION_SECRET: 'security/session-secret',
  SENDGRID_API_KEY: 'integrations/sendgrid',
  TWILIO_CREDENTIALS: 'integrations/twilio',
  STRIPE_CREDENTIALS: 'integrations/stripe',
  ADVANCEDMD_CREDENTIALS: 'integrations/advancedmd',
  PHI_ENCRYPTION_KEY: 'security/phi-encryption-key',
  REDIS_PASSWORD: 'database/redis-password',
} as const;

// =============================================================================
// SECRETS MANAGER CLASS
// =============================================================================

class SecretsManager {
  private client: SecretsManagerClient | null = null;
  private cache: Map<string, CachedSecret> = new Map();
  private config: SecretsConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = {
      region: 'us-east-1',
      environment: 'development',
      prefix: 'mentalspace-ehr',
      cacheTtlMs: 5 * 60 * 1000, // 5 minutes default cache
      enableRotation: true,
      rotationIntervalDays: 30,
      fallbackToEnv: true,
    };
  }

  /**
   * Initialize the Secrets Manager client
   */
  initialize(config: Partial<SecretsConfig> = {}): void {
    this.config = { ...this.config, ...config };

    try {
      this.client = new SecretsManagerClient({
        region: this.config.region,
      });

      this.initialized = true;
      logger.info('AWS Secrets Manager initialized', {
        region: this.config.region,
        environment: this.config.environment,
        cacheEnabled: true,
        cacheTtlMs: this.config.cacheTtlMs,
      });
    } catch (error) {
      logger.error('Failed to initialize AWS Secrets Manager', { error });
      // Don't throw - allow fallback to env vars
      this.initialized = false;
    }
  }

  /**
   * Check if Secrets Manager is available
   */
  isAvailable(): boolean {
    return this.initialized && this.client !== null;
  }

  /**
   * Get a secret value from AWS Secrets Manager with caching
   */
  async getSecret<T = string>(secretName: string): Promise<T | null> {
    const fullSecretName = getSecretName(
      this.config.prefix || 'mentalspace-ehr',
      this.config.environment,
      secretName
    );

    // Check cache first
    const cached = this.cache.get(fullSecretName);
    if (cached && cached.expiresAt > Date.now()) {
      this.logSecretAccess(secretName, 'CACHE_HIT');
      return cached.value as T;
    }

    // Try AWS Secrets Manager
    if (this.isAvailable()) {
      try {
        const response = await this.client!.send(
          new GetSecretValueCommand({
            SecretId: fullSecretName,
          })
        );

        let secretValue: any;

        if (response.SecretString) {
          try {
            secretValue = JSON.parse(response.SecretString);
          } catch {
            secretValue = response.SecretString;
          }
        } else if (response.SecretBinary) {
          secretValue = Buffer.from(response.SecretBinary).toString('utf-8');
        }

        // Cache the secret
        this.cache.set(fullSecretName, {
          value: secretValue,
          expiresAt: Date.now() + (this.config.cacheTtlMs || 300000),
          version: response.VersionId,
        });

        this.logSecretAccess(secretName, 'AWS_FETCH', true);
        return secretValue as T;
      } catch (error) {
        if (error instanceof ResourceNotFoundException) {
          logger.warn('Secret not found in AWS Secrets Manager', { secretName: fullSecretName });
        } else {
          logger.error('Failed to retrieve secret from AWS', { secretName: fullSecretName, error });
        }
      }
    }

    // Fallback to environment variables
    if (this.config.fallbackToEnv) {
      const envValue = this.getFromEnvironment(secretName);
      if (envValue) {
        this.logSecretAccess(secretName, 'ENV_FALLBACK');
        return envValue as T;
      }
    }

    this.logSecretAccess(secretName, 'NOT_FOUND', false);
    return null;
  }

  /**
   * Get secret from environment variable (fallback)
   */
  private getFromEnvironment(secretName: string): any {
    const envMapping: Record<string, string | (() => any)> = {
      [SecretNames.DATABASE_CREDENTIALS]: () => ({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'mentalspace',
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        ssl: process.env.DATABASE_SSL === 'true',
      }),
      [SecretNames.JWT_SECRET]: process.env.JWT_SECRET,
      [SecretNames.SESSION_SECRET]: process.env.SESSION_SECRET,
      [SecretNames.PHI_ENCRYPTION_KEY]: process.env.PHI_ENCRYPTION_KEY,
      [SecretNames.SENDGRID_API_KEY]: process.env.SENDGRID_API_KEY,
      [SecretNames.TWILIO_CREDENTIALS]: () => ({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
      }),
      [SecretNames.STRIPE_CREDENTIALS]: () => ({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      }),
      [SecretNames.ADVANCEDMD_CREDENTIALS]: () => ({
        apiKey: process.env.ADVANCEDMD_API_KEY,
        officeKey: process.env.ADVANCEDMD_OFFICE_KEY,
      }),
      [SecretNames.REDIS_PASSWORD]: process.env.REDIS_PASSWORD,
      [SecretNames.ENCRYPTION_KEYS]: () => ({
        phiEncryptionKey: process.env.PHI_ENCRYPTION_KEY,
        jwtSecret: process.env.JWT_SECRET,
        sessionSecret: process.env.SESSION_SECRET,
      }),
    };

    const mapping = envMapping[secretName];
    if (typeof mapping === 'function') {
      return mapping();
    }
    return mapping;
  }

  /**
   * Create or update a secret in AWS Secrets Manager
   */
  async setSecret(secretName: string, value: any, description?: string): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Cannot set secret - Secrets Manager not available');
      return false;
    }

    const fullSecretName = getSecretName(
      this.config.prefix || 'mentalspace-ehr',
      this.config.environment,
      secretName
    );

    const secretString = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      // Try to update existing secret
      await this.client!.send(
        new PutSecretValueCommand({
          SecretId: fullSecretName,
          SecretString: secretString,
        })
      );

      // Invalidate cache
      this.cache.delete(fullSecretName);

      logger.info('Secret updated successfully', { secretName: fullSecretName });
      this.logSecretAccess(secretName, 'UPDATE', true);
      return true;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        // Secret doesn't exist - create it
        try {
          await this.client!.send(
            new CreateSecretCommand({
              Name: fullSecretName,
              SecretString: secretString,
              Description: description || `Secret for ${secretName}`,
              Tags: [
                { Key: 'Environment', Value: this.config.environment },
                { Key: 'Application', Value: 'MentalSpaceEHR' },
                { Key: 'ManagedBy', Value: 'SecretsManager' },
              ],
            })
          );

          logger.info('Secret created successfully', { secretName: fullSecretName });
          this.logSecretAccess(secretName, 'CREATE', true);
          return true;
        } catch (createError) {
          logger.error('Failed to create secret', { secretName: fullSecretName, error: createError });
        }
      } else {
        logger.error('Failed to update secret', { secretName: fullSecretName, error });
      }
    }

    return false;
  }

  /**
   * Rotate a secret using AWS Secrets Manager rotation
   */
  async rotateSecret(secretName: string, rotationLambdaArn?: string): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Cannot rotate secret - Secrets Manager not available');
      return false;
    }

    const fullSecretName = getSecretName(
      this.config.prefix || 'mentalspace-ehr',
      this.config.environment,
      secretName
    );

    try {
      await this.client!.send(
        new RotateSecretCommand({
          SecretId: fullSecretName,
          RotationLambdaARN: rotationLambdaArn,
        })
      );

      // Invalidate cache
      this.cache.delete(fullSecretName);

      logger.info('Secret rotation initiated', { secretName: fullSecretName });
      this.logSecretAccess(secretName, 'ROTATE', true);
      return true;
    } catch (error) {
      logger.error('Failed to rotate secret', { secretName: fullSecretName, error });
      return false;
    }
  }

  /**
   * Delete a secret from AWS Secrets Manager
   */
  async deleteSecret(secretName: string, forceDelete: boolean = false): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Cannot delete secret - Secrets Manager not available');
      return false;
    }

    const fullSecretName = getSecretName(
      this.config.prefix || 'mentalspace-ehr',
      this.config.environment,
      secretName
    );

    try {
      await this.client!.send(
        new DeleteSecretCommand({
          SecretId: fullSecretName,
          ForceDeleteWithoutRecovery: forceDelete,
          RecoveryWindowInDays: forceDelete ? undefined : 30,
        })
      );

      // Invalidate cache
      this.cache.delete(fullSecretName);

      logger.info('Secret deleted', { secretName: fullSecretName, forceDelete });
      this.logSecretAccess(secretName, 'DELETE', true);
      return true;
    } catch (error) {
      logger.error('Failed to delete secret', { secretName: fullSecretName, error });
      return false;
    }
  }

  /**
   * Get secret metadata/description
   */
  async getSecretMetadata(secretName: string): Promise<any | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const fullSecretName = getSecretName(
      this.config.prefix || 'mentalspace-ehr',
      this.config.environment,
      secretName
    );

    try {
      const response = await this.client!.send(
        new DescribeSecretCommand({
          SecretId: fullSecretName,
        })
      );

      return {
        name: response.Name,
        description: response.Description,
        createdDate: response.CreatedDate,
        lastAccessedDate: response.LastAccessedDate,
        lastChangedDate: response.LastChangedDate,
        rotationEnabled: response.RotationEnabled,
        nextRotationDate: response.NextRotationDate,
        tags: response.Tags,
      };
    } catch (error) {
      logger.error('Failed to get secret metadata', { secretName: fullSecretName, error });
      return null;
    }
  }

  /**
   * List all secrets (for admin purposes only)
   */
  async listSecrets(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const prefix = `${this.config.prefix}/${this.config.environment}/`;

    try {
      const response = await this.client!.send(
        new ListSecretsCommand({
          Filters: [
            {
              Key: 'name',
              Values: [prefix],
            },
          ],
        })
      );

      return (response.SecretList || [])
        .map((secret) => secret.Name || '')
        .filter((name) => name.startsWith(prefix));
    } catch (error) {
      logger.error('Failed to list secrets', { error });
      return [];
    }
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Secret cache cleared');
  }

  /**
   * Clear a specific secret from cache
   */
  invalidateSecret(secretName: string): void {
    const fullSecretName = getSecretName(
      this.config.prefix || 'mentalspace-ehr',
      this.config.environment,
      secretName
    );
    this.cache.delete(fullSecretName);
  }

  /**
   * Log secret access for HIPAA audit
   */
  private logSecretAccess(
    secretName: string,
    action: 'CACHE_HIT' | 'AWS_FETCH' | 'ENV_FALLBACK' | 'NOT_FOUND' | 'UPDATE' | 'CREATE' | 'DELETE' | 'ROTATE',
    success: boolean = true
  ): void {
    // Don't log the actual secret values - just the access event
    logger.info('Secret access', {
      secretName,
      action,
      success,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
    });
  }

  // =============================================================================
  // CONVENIENCE METHODS FOR SPECIFIC SECRETS
  // =============================================================================

  /**
   * Get database credentials
   */
  async getDatabaseCredentials(): Promise<DatabaseCredentials | null> {
    return this.getSecret<DatabaseCredentials>(SecretNames.DATABASE_CREDENTIALS);
  }

  /**
   * Get encryption keys
   */
  async getEncryptionKeys(): Promise<EncryptionKeys | null> {
    return this.getSecret<EncryptionKeys>(SecretNames.ENCRYPTION_KEYS);
  }

  /**
   * Get PHI encryption key
   */
  async getPHIEncryptionKey(): Promise<string | null> {
    const key = await this.getSecret<string>(SecretNames.PHI_ENCRYPTION_KEY);
    return key;
  }

  /**
   * Get JWT secret
   */
  async getJWTSecret(): Promise<string | null> {
    return this.getSecret<string>(SecretNames.JWT_SECRET);
  }

  /**
   * Get session secret
   */
  async getSessionSecret(): Promise<string | null> {
    return this.getSecret<string>(SecretNames.SESSION_SECRET);
  }

  /**
   * Get third-party API credentials
   */
  async getThirdPartyCredentials(service: 'sendgrid' | 'twilio' | 'stripe' | 'advancedmd'): Promise<any | null> {
    const secretMap: Record<string, string> = {
      sendgrid: SecretNames.SENDGRID_API_KEY,
      twilio: SecretNames.TWILIO_CREDENTIALS,
      stripe: SecretNames.STRIPE_CREDENTIALS,
      advancedmd: SecretNames.ADVANCEDMD_CREDENTIALS,
    };

    return this.getSecret(secretMap[service]);
  }

  /**
   * Build database connection string from credentials
   */
  async getDatabaseConnectionString(): Promise<string | null> {
    const creds = await this.getDatabaseCredentials();
    if (!creds) {
      // Fallback to DATABASE_URL env var
      return process.env.DATABASE_URL || null;
    }

    const sslParam = creds.ssl ? '?sslmode=require' : '';
    return `postgresql://${creds.username}:${encodeURIComponent(creds.password)}@${creds.host}:${creds.port}/${creds.database}${sslParam}`;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const secretsManager = new SecretsManager();

// =============================================================================
// INITIALIZATION HELPER
// =============================================================================

export async function initializeSecrets(config?: Partial<SecretsConfig>): Promise<void> {
  secretsManager.initialize(config);

  // Warm up cache with critical secrets
  if (secretsManager.isAvailable()) {
    logger.info('Warming up secrets cache...');
    await Promise.all([
      secretsManager.getDatabaseCredentials(),
      secretsManager.getJWTSecret(),
      secretsManager.getSessionSecret(),
      secretsManager.getPHIEncryptionKey(),
    ]);
    logger.info('Secrets cache warmed up');
  }
}

// =============================================================================
// SECRET ROTATION UTILITIES
// =============================================================================

export interface RotationSchedule {
  secretName: string;
  intervalDays: number;
  lastRotated?: Date;
  nextRotation?: Date;
}

/**
 * Setup automatic rotation for secrets
 */
export async function setupSecretRotation(
  secretName: string,
  intervalDays: number = 30,
  rotationLambdaArn?: string
): Promise<boolean> {
  if (!secretsManager.isAvailable()) {
    logger.warn('Cannot setup rotation - Secrets Manager not available');
    return false;
  }

  // Note: In production, you would configure a rotation Lambda in AWS
  // This is a placeholder for the rotation setup
  logger.info('Secret rotation setup requested', {
    secretName,
    intervalDays,
    rotationLambdaArn: rotationLambdaArn ? 'provided' : 'not provided',
  });

  return true;
}

/**
 * Get rotation status for all secrets
 */
export async function getRotationStatus(): Promise<RotationSchedule[]> {
  const secrets = await secretsManager.listSecrets();
  const schedules: RotationSchedule[] = [];

  for (const secretName of secrets) {
    const metadata = await secretsManager.getSecretMetadata(secretName);
    if (metadata) {
      schedules.push({
        secretName,
        intervalDays: 30, // Default
        lastRotated: metadata.lastChangedDate,
        nextRotation: metadata.nextRotationDate,
      });
    }
  }

  return schedules;
}

export default secretsManager;
