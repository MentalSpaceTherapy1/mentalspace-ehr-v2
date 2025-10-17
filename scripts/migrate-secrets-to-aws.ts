/**
 * Migrate Secrets from .env to AWS Secrets Manager
 *
 * This script helps migrate environment variables from .env file
 * to AWS Secrets Manager for better security and compliance.
 *
 * Usage:
 *   npm run migrate-secrets -- --environment dev
 *   npm run migrate-secrets -- --environment staging
 *   npm run migrate-secrets -- --environment prod
 */

import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Parse command line arguments
const args = process.argv.slice(2);
const environmentArg = args.find(arg => arg.startsWith('--environment='));
const environment = environmentArg ? environmentArg.split('=')[1] : 'dev';

console.log(`🔐 Migrating secrets to AWS Secrets Manager for environment: ${environment}\n`);

// Initialize AWS Secrets Manager client
const client = new SecretsManagerClient({ region: 'us-east-1' });

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Define which secrets should be migrated
// These are sensitive values that should be in Secrets Manager
const secretsToMigrate = [
  'JWT_SECRET',
  'DATABASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'ADVANCEDMD_CLIENT_SECRET',
];

// Define non-sensitive configuration (keep in .env or SSM Parameter Store)
const nonSensitiveConfig = [
  'NODE_ENV',
  'PORT',
  'AWS_REGION',
  'CORS_ORIGINS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'LOG_LEVEL',
  'FRONTEND_URL',
];

interface SecretConfig {
  name: string;
  value: string;
  description: string;
}

const secrets: SecretConfig[] = [];

// Prepare secrets for migration
for (const key of secretsToMigrate) {
  if (envConfig[key] && envConfig[key] !== '' && !envConfig[key].startsWith('your_')) {
    secrets.push({
      name: `mentalspace/${environment}/${key.toLowerCase().replace(/_/g, '-')}`,
      value: envConfig[key],
      description: getSecretDescription(key),
    });
  }
}

// Special handling for database credentials
if (envConfig.DATABASE_URL) {
  // Parse DATABASE_URL to extract components
  const dbUrlMatch = envConfig.DATABASE_URL.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/
  );

  if (dbUrlMatch) {
    const [, username, password, host, port, database] = dbUrlMatch;

    secrets.push({
      name: `mentalspace/${environment}/database/credentials`,
      value: JSON.stringify({
        username,
        password,
        host,
        port: parseInt(port),
        database,
        engine: 'postgres',
      }),
      description: 'PostgreSQL database credentials',
    });
  }
}

// Function to get description for each secret
function getSecretDescription(key: string): string {
  const descriptions: Record<string, string> = {
    JWT_SECRET: 'JWT signing secret for authentication tokens',
    DATABASE_URL: 'PostgreSQL database connection string',
    AWS_ACCESS_KEY_ID: 'AWS access key for Chime SDK and other services',
    AWS_SECRET_ACCESS_KEY: 'AWS secret access key',
    OPENAI_API_KEY: 'OpenAI API key for GPT models',
    ANTHROPIC_API_KEY: 'Anthropic Claude API key',
    STRIPE_SECRET_KEY: 'Stripe secret key for payment processing',
    STRIPE_WEBHOOK_SECRET: 'Stripe webhook signing secret',
    TWILIO_AUTH_TOKEN: 'Twilio authentication token for SMS',
    SENDGRID_API_KEY: 'SendGrid API key for email delivery',
    ADVANCEDMD_CLIENT_SECRET: 'AdvancedMD API client secret',
  };

  return descriptions[key] || `Secret for ${key}`;
}

// Function to create or update a secret
async function createOrUpdateSecret(secret: SecretConfig): Promise<void> {
  try {
    // Try to create the secret
    await client.send(
      new CreateSecretCommand({
        Name: secret.name,
        Description: secret.description,
        SecretString: secret.value,
        Tags: [
          { Key: 'Environment', Value: environment },
          { Key: 'Application', Value: 'MentalSpaceEHR' },
          { Key: 'ManagedBy', Value: 'migration-script' },
        ],
      })
    );
    console.log(`✅ Created secret: ${secret.name}`);
  } catch (error: any) {
    if (error.name === 'ResourceExistsException') {
      // Secret already exists, update it
      try {
        await client.send(
          new UpdateSecretCommand({
            SecretId: secret.name,
            Description: secret.description,
            SecretString: secret.value,
          })
        );
        console.log(`✅ Updated secret: ${secret.name}`);
      } catch (updateError: any) {
        console.error(`❌ Failed to update secret ${secret.name}:`, updateError.message);
      }
    } else {
      console.error(`❌ Failed to create secret ${secret.name}:`, error.message);
    }
  }
}

// Main migration function
async function migrateSecrets() {
  console.log(`📝 Found ${secrets.length} secrets to migrate:\n`);

  for (const secret of secrets) {
    console.log(`  - ${secret.name}`);
  }

  console.log('\n🚀 Starting migration...\n');

  for (const secret of secrets) {
    await createOrUpdateSecret(secret);
  }

  console.log('\n✅ Migration complete!\n');

  // Generate new .env.example with placeholders
  console.log('📄 Generating updated .env.example...\n');

  const envExample: string[] = [
    '# ==============================================',
    '# MENTALSPACE EHR V2 - Environment Configuration',
    '# ==============================================',
    '# IMPORTANT: Sensitive values are now stored in AWS Secrets Manager',
    '# This file contains non-sensitive configuration only',
    '# Generated by migrate-secrets-to-aws.ts',
    '',
    '# ----------------------------------------------',
    '# Non-Sensitive Configuration',
    '# ----------------------------------------------',
  ];

  for (const key of nonSensitiveConfig) {
    if (envConfig[key]) {
      envExample.push(`${key}=${envConfig[key]}`);
    }
  }

  envExample.push('');
  envExample.push('# ----------------------------------------------');
  envExample.push('# Secrets (Stored in AWS Secrets Manager)');
  envExample.push('# ----------------------------------------------');
  envExample.push('# The following values are retrieved from AWS Secrets Manager at runtime:');

  for (const secret of secrets) {
    const originalKey = secret.name.split('/').pop()?.toUpperCase().replace(/-/g, '_');
    envExample.push(`# ${originalKey}=<retrieved from AWS Secrets Manager>`);
  }

  fs.writeFileSync(
    path.join(__dirname, '..', '.env.example'),
    envExample.join('\n')
  );

  console.log('✅ Updated .env.example with placeholders\n');

  // Generate helper code to retrieve secrets
  console.log('📝 Helper code to retrieve secrets in your application:\n');
  console.log('```typescript');
  console.log("import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';");
  console.log('');
  console.log('const client = new SecretsManagerClient({ region: "us-east-1" });');
  console.log('');
  console.log('async function getSecret(secretName: string): Promise<string> {');
  console.log('  const response = await client.send(');
  console.log('    new GetSecretValueCommand({ SecretId: secretName })');
  console.log('  );');
  console.log('  return response.SecretString || "";');
  console.log('}');
  console.log('');
  console.log('// Example usage:');
  console.log(`const jwtSecret = await getSecret("mentalspace/${environment}/jwt-secret");`);
  console.log('```\n');

  console.log('⚠️  IMPORTANT NEXT STEPS:\n');
  console.log('1. Update your application code to retrieve secrets from AWS Secrets Manager');
  console.log('2. Test thoroughly in development environment');
  console.log('3. Update your .env file to remove sensitive values (or delete it)');
  console.log('4. Update your .gitignore to ensure .env is never committed');
  console.log('5. Grant your Lambda/ECS tasks IAM permissions to read from Secrets Manager');
  console.log('6. Set up secret rotation for production (recommended)\n');

  console.log('🔐 Secret ARNs for IAM policies:\n');
  for (const secret of secrets) {
    console.log(`  arn:aws:secretsmanager:us-east-1:*:secret:${secret.name}-*`);
  }
}

// Run migration
migrateSecrets().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
