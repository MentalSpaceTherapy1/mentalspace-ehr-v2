import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend .env file
const envPath = path.resolve(__dirname, '../../backend/.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

// ⚠️ IMPORTANT: AdvancedMD credentials for Coping and Healing Counseling (CAHC)
// Updated with actual login credentials
const CREDENTIALS = {
  officeKey: '162882', // Updated from web portal login
  partnerUsername: 'CAHCAPI', // Partner API username (may differ from web login)
  partnerPassword: '1o7Dn4p1', // Partner API password
  appUsername: 'JOSEPH', // Web portal username
  appPassword: 'Bing@@0912', // Web portal password
};

// Get encryption key from environment variable
const ENCRYPTION_KEY_HEX = process.env.ADVANCEDMD_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
  console.error('❌ Error: ADVANCEDMD_ENCRYPTION_KEY environment variable is not set');
  console.error('Generate one using: openssl rand -hex 32');
  process.exit(1);
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  console.error('❌ Error: ADVANCEDMD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  console.error('Current length:', ENCRYPTION_KEY.length, 'bytes');
  process.exit(1);
}

/**
 * Encrypts a string using AES-256-GCM
 * Format: iv:authTag:encryptedData (all hex-encoded)
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string (for verification)
 */
function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

async function seed() {
  console.log('🔧 Seeding AdvancedMD configuration...\n');

  // Encrypt sensitive credentials
  console.log('🔐 Encrypting credentials...');
  const encryptedPartnerPassword = encrypt(CREDENTIALS.partnerPassword);
  const encryptedAppPassword = encrypt(CREDENTIALS.appPassword);
  console.log('✅ Credentials encrypted\n');

  // Verify encryption/decryption works
  console.log('🧪 Verifying encryption/decryption...');
  const testDecryptPartner = decrypt(encryptedPartnerPassword);
  const testDecryptApp = decrypt(encryptedAppPassword);

  if (testDecryptPartner !== CREDENTIALS.partnerPassword || testDecryptApp !== CREDENTIALS.appPassword) {
    console.error('❌ Error: Encryption verification failed');
    process.exit(1);
  }
  console.log('✅ Encryption verified\n');

  // Create or update AdvancedMD config
  console.log('💾 Saving configuration to database...');

  const config = await prisma.advancedMDConfig.upsert({
    where: { officeKey: CREDENTIALS.officeKey },
    create: {
      officeKey: CREDENTIALS.officeKey,
      officeName: 'Coping and Healing Counseling',
      partnerUsername: CREDENTIALS.partnerUsername,
      partnerPassword: encryptedPartnerPassword,
      appUsername: CREDENTIALS.appUsername,
      appPassword: encryptedAppPassword,
      environment: process.env.ADVANCEDMD_ENV || 'sandbox',

      // Sync settings (disabled by default - enable after testing)
      syncEnabled: false,
      autoSyncPatients: false,
      autoSyncVisits: false,
      autoSyncClaims: false,

      // Polling intervals (in minutes)
      pollingIntervalClaims: 30,    // Check for claim updates every 30 minutes
      pollingIntervalVisits: 15,    // Check for visit updates every 15 minutes
      pollingIntervalPatients: 60,  // Check for patient updates every 60 minutes

      // Feature flags (enable after testing)
      enableEligibilityCheck: true,   // Can enable immediately (read-only)
      enableClaimSubmission: false,   // Enable after validation testing
      enablePaymentSync: false,       // Enable after ODBC setup

      // API URLs (defaults - will be updated during authentication)
      partnerLoginURL: 'https://partnerlogin.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx',
    },
    update: {
      // Update credentials if changed
      partnerPassword: encryptedPartnerPassword,
      appPassword: encryptedAppPassword,
      environment: process.env.ADVANCEDMD_ENV || 'sandbox',
    },
  });

  console.log('✅ AdvancedMD configuration saved');
  console.log('\nConfiguration Details:');
  console.log('├─ Office Key:', config.officeKey);
  console.log('├─ Office Name:', config.officeName);
  console.log('├─ Partner Username:', config.partnerUsername);
  console.log('├─ App Username:', config.appUsername);
  console.log('├─ Environment:', config.environment);
  console.log('├─ Sync Enabled:', config.syncEnabled);
  console.log('├─ Auto Sync Patients:', config.autoSyncPatients);
  console.log('├─ Auto Sync Visits:', config.autoSyncVisits);
  console.log('├─ Auto Sync Claims:', config.autoSyncClaims);
  console.log('├─ Enable Eligibility Check:', config.enableEligibilityCheck);
  console.log('├─ Enable Claim Submission:', config.enableClaimSubmission);
  console.log('└─ Enable Payment Sync:', config.enablePaymentSync);

  console.log('\n⚠️  Security Notes:');
  console.log('├─ Credentials are encrypted using AES-256-GCM');
  console.log('├─ Encryption key stored in ADVANCEDMD_ENCRYPTION_KEY env variable');
  console.log('├─ Never commit encryption key to version control');
  console.log('└─ Use different keys for sandbox and production');

  console.log('\n📝 Next Steps:');
  console.log('1. Verify credentials are correct for AdvancedMD environment');
  console.log('2. Test authentication: cd packages/backend && node -e "require(\'./dist/integrations/advancedmd\').advancedMDAuth.initialize()"');
  console.log('3. After successful testing, enable sync features in the database');
  console.log('4. Set up monitoring and alerts for sync operations');

  console.log('\n✅ Seed complete!\n');
}

seed()
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
