import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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
}

const config: Config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
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

if (missingEnvVars.length > 0) {
  console.warn(
    `Warning: Missing environment variables: ${missingEnvVars.join(', ')}. Some features may not work correctly.`
  );
}

export default config;
