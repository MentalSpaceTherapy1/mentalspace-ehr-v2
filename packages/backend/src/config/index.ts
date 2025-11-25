import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from root .env file ONLY if it exists
// In ECS/Docker, environment variables are provided by the task definition
const envPath = path.resolve(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  // Only load .env file if we're running locally (not in Docker/ECS)
  // ECS containers won't have a .env file
  dotenv.config({ path: envPath });
  console.log('[CONFIG] Loaded environment variables from .env file');
} else {
  console.log('[CONFIG] No .env file found, using environment variables from container/system');
}

interface Config {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;

  // AWS
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;

  // DynamoDB
  dynamodbSessionsTable: string;

  // Secrets Manager
  dbCredentialsSecretName: string;

  // CORS
  corsOrigins: string[];

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // Logging
  logLevel: string;

  // Frontend
  frontendUrl: string;

  // Phase 1 Portal Services
  stripeApiKey?: string;
  stripeWebhookSecret?: string;
  s3BucketName: string;

  // Twilio
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioApiKeySid?: string;
  twilioApiKeySecret?: string;
  twilioPhoneNumber?: string;

  // Resend (Email Service)
  resendApiKey?: string;
  resendFromEmail?: string;

  // Backend URL (for webhooks)
  backendUrl: string;
}

// Construct DATABASE_URL from individual components if not provided directly
const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Construct from individual DB_ environment variables (for ECS deployment)
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (DB_HOST && DB_PORT && DB_USER && DB_PASSWORD && DB_NAME) {
    // URL-encode the username and password to handle special characters
    const encodedUser = encodeURIComponent(DB_USER);
    const encodedPassword = encodeURIComponent(DB_PASSWORD);
    const databaseUrl = `postgresql://${encodedUser}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

    // Set it as an environment variable so Prisma can use it
    process.env.DATABASE_URL = databaseUrl;

    return databaseUrl;
  }

  return '';
};

const config: Config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: getDatabaseUrl(),

  // JWT - SECURITY: No default secret allowed
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // AWS
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

  // DynamoDB
  dynamodbSessionsTable: process.env.DYNAMODB_SESSIONS_TABLE || 'mentalspace-sessions-dev',

  // Secrets Manager
  dbCredentialsSecretName: process.env.DB_CREDENTIALS_SECRET_NAME || 'mentalspace/db/credentials-dev',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5175',

  // Phase 1 Portal Services
  stripeApiKey: process.env.STRIPE_API_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  s3BucketName: process.env.S3_BUCKET_NAME || 'mentalspace-portal-uploads-dev',

  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioApiKeySid: process.env.TWILIO_API_KEY_SID,
  twilioApiKeySecret: process.env.TWILIO_API_KEY_SECRET,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

  // Resend
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'MentalSpace EHR <noreply@mentalspace.com>',

  // Backend URL
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];

// Only validate DATABASE_URL in production
if (config.nodeEnv === 'production') {
  requiredEnvVars.push('DATABASE_URL');
}

const missingEnvVars = requiredEnvVars.filter((envVar) => {
  const key = envVar.toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  return !config[key as keyof Config];
});

// CRITICAL SECURITY CHECKS
// 1. JWT_SECRET must be set and strong
if (!config.jwtSecret) {
  if (config.nodeEnv === 'production') {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set.');
    console.error('   This is a CRITICAL security vulnerability.');
    console.error('   Set JWT_SECRET to a strong random value (min 64 chars).');
    console.error('   Generate one with: openssl rand -base64 64');
    process.exit(1);
  } else {
    // Development fallback - still warn
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using insecure development default.');
    console.warn('   This is NOT secure for production use.');
    config.jwtSecret = 'dev-only-jwt-secret-not-for-production-use-minimum-64-characters';
  }
}

// 2. Validate JWT_SECRET strength
const MIN_JWT_SECRET_LENGTH = 64;
if (config.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
  if (config.nodeEnv === 'production') {
    console.error(`❌ FATAL: JWT_SECRET is too short (${config.jwtSecret.length} chars).`);
    console.error(`   Minimum required length: ${MIN_JWT_SECRET_LENGTH} characters.`);
    console.error('   Generate a strong secret with: openssl rand -base64 64');
    process.exit(1);
  } else {
    console.warn(`⚠️  WARNING: JWT_SECRET is short (${config.jwtSecret.length} chars).`);
    console.warn(`   Recommended minimum: ${MIN_JWT_SECRET_LENGTH} characters.`);
  }
}

// 3. Detect known insecure patterns
const INSECURE_PATTERNS = [
  'INSECURE_DEFAULT',
  'CHANGE_THIS',
  'secret',
  'password',
  '123456',
  'default',
];

if (config.nodeEnv === 'production') {
  const lowerSecret = config.jwtSecret.toLowerCase();
  for (const pattern of INSECURE_PATTERNS) {
    if (lowerSecret.includes(pattern.toLowerCase())) {
      console.error(`❌ FATAL: JWT_SECRET contains insecure pattern: "${pattern}"`);
      console.error('   Use a randomly generated secret in production.');
      process.exit(1);
    }
  }
}

if (missingEnvVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;

  if (config.nodeEnv === 'production') {
    // In production, fail fast
    console.error(`❌ FATAL: ${errorMsg}`);
    console.error('   Application cannot start without required environment variables.');
    process.exit(1);
  } else {
    // In development, warn but allow to continue
    console.warn(`⚠️  WARNING: ${errorMsg}`);
    console.warn('   Some features may not work correctly.');
  }
}

export default config;
