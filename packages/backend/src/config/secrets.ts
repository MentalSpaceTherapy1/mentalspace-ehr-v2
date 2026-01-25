import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import logger from '../utils/logger';

/**
 * AWS Secrets Manager Configuration
 *
 * This module provides utilities to retrieve secrets from AWS Secrets Manager
 * instead of storing them in .env files.
 *
 * HIPAA Compliance:
 * - Secrets are encrypted at rest with KMS
 * - Access is controlled via IAM policies
 * - Secret access is auditable via CloudTrail
 * - Supports automatic secret rotation
 */

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const environment = process.env.NODE_ENV || 'development';

// Cache for secrets to avoid repeated API calls
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Retrieve a secret from AWS Secrets Manager
 * @param secretName - Name of the secret in Secrets Manager
 * @param useCache - Whether to use cached value (default: true)
 * @returns The secret value
 */
export async function getSecret(secretName: string, useCache = true): Promise<string> {
  // Check cache first
  if (useCache) {
    const cached = secretCache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    const secretValue = response.SecretString || '';

    // Cache the secret
    if (useCache) {
      secretCache.set(secretName, {
        value: secretValue,
        expiresAt: Date.now() + CACHE_TTL,
      });
    }

    logger.info('Secret retrieved from AWS Secrets Manager', { secretName });
    return secretValue;
  } catch (error: unknown) {
    logger.error('Failed to retrieve secret from AWS Secrets Manager', {
      secretName,
      error: error.message,
    });

    // In development, fall back to environment variables
    if (environment === 'development') {
      logger.warn('Falling back to environment variable for secret', { secretName });
      const envKey = secretName.split('/').pop()?.toUpperCase().replace(/-/g, '_');
      return process.env[envKey || ''] || '';
    }

    throw error;
  }
}

/**
 * Retrieve a JSON secret from AWS Secrets Manager
 * @param secretName - Name of the secret in Secrets Manager
 * @param useCache - Whether to use cached value (default: true)
 * @returns The parsed JSON object
 */
export async function getJsonSecret<T = any>(
  secretName: string,
  useCache = true
): Promise<T> {
  const secretString = await getSecret(secretName, useCache);
  return JSON.parse(secretString) as T;
}

/**
 * Retrieve database credentials from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns Database credentials object
 */
export async function getDatabaseCredentials(env?: string): Promise<{
  username: string;
  password: string;
  host: string;
  port: number;
  database: string;
  engine: string;
}> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/database/credentials`;
  return getJsonSecret(secretName);
}

/**
 * Build database connection string from Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns PostgreSQL connection string
 */
export async function getDatabaseUrl(env?: string): Promise<string> {
  const creds = await getDatabaseCredentials(env);
  return `postgresql://${creds.username}:${creds.password}@${creds.host}:${creds.port}/${creds.database}?schema=public&sslmode=require`;
}

/**
 * Retrieve JWT secret from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns JWT secret string
 */
export async function getJwtSecret(env?: string): Promise<string> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/jwt-secret`;
  return getSecret(secretName);
}

/**
 * Retrieve OpenAI API key from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns OpenAI API key
 */
export async function getOpenAiApiKey(env?: string): Promise<string> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/openai-api-key`;
  return getSecret(secretName);
}

/**
 * Retrieve Anthropic API key from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns Anthropic API key
 */
export async function getAnthropicApiKey(env?: string): Promise<string> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/anthropic-api-key`;
  return getSecret(secretName);
}

/**
 * Retrieve Stripe credentials from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns Stripe credentials object
 */
export async function getStripeCredentials(env?: string): Promise<{
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/stripe-keys`;
  return getJsonSecret(secretName);
}

/**
 * Retrieve Twilio credentials from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns Twilio credentials object
 */
export async function getTwilioCredentials(env?: string): Promise<{
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/twilio-credentials`;
  return getJsonSecret(secretName);
}

/**
 * Retrieve SendGrid API key from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns SendGrid API key
 */
export async function getSendGridApiKey(env?: string): Promise<string> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/sendgrid-api-key`;
  return getSecret(secretName);
}

/**
 * Retrieve AdvancedMD credentials from AWS Secrets Manager
 * @param environment - Environment name (dev, staging, prod)
 * @returns AdvancedMD credentials object
 */
export async function getAdvancedMdCredentials(env?: string): Promise<{
  clientId: string;
  clientSecret: string;
  officeKey: string;
}> {
  const envName = env || environment;
  const secretName = `mentalspace/${envName}/advancedmd-credentials`;
  return getJsonSecret(secretName);
}

/**
 * Clear the secrets cache
 * Useful for testing or after secret rotation
 */
export function clearSecretsCache(): void {
  secretCache.clear();
  logger.info('Secrets cache cleared');
}

/**
 * Initialize secrets on application startup
 * This pre-loads critical secrets to avoid cold start delays
 */
export async function initializeSecrets(): Promise<void> {
  try {
    logger.info('Initializing secrets from AWS Secrets Manager...');

    // Pre-load critical secrets in parallel
    await Promise.all([
      getJwtSecret().catch((e) => logger.warn('JWT secret not found', { error: e.message })),
      getDatabaseUrl().catch((e) => logger.warn('Database credentials not found', { error: e.message })),
    ]);

    logger.info('Secrets initialized successfully');
  } catch (error: unknown) {
    logger.error('Failed to initialize secrets', { error: error.message });

    // In production, this should be a fatal error
    if (environment === 'production') {
      throw new Error('Cannot start application without secrets');
    }
  }
}

/**
 * Health check for Secrets Manager connectivity
 * @returns true if can connect to Secrets Manager
 */
export async function checkSecretsManagerHealth(): Promise<boolean> {
  try {
    // Try to retrieve a known secret (JWT secret should always exist)
    await getJwtSecret();
    return true;
  } catch {
    return false;
  }
}
