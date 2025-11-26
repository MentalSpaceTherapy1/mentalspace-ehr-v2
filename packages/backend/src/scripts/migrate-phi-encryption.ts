#!/usr/bin/env npx ts-node
/**
 * PHI Encryption Migration Script
 *
 * This script encrypts existing unencrypted PHI data in the database.
 * Run this once after deploying the PHI encryption middleware.
 *
 * IMPORTANT:
 * 1. Backup your database before running this script
 * 2. Set PHI_ENCRYPTION_KEY environment variable
 * 3. Run in maintenance mode (no concurrent writes)
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-phi-encryption.ts
 *
 * Options:
 *   --dry-run    Show what would be encrypted without making changes
 *   --model=X    Only migrate a specific model
 *   --verify     Only verify encryption status, don't migrate
 */

import { PrismaClient } from '@mentalspace/database';
import {
  PHI_FIELDS_BY_MODEL,
  encryptExistingData,
  verifyEncryptionStatus,
} from '../middleware/phiEncryption';
import logger from '../utils/logger';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const verifyOnly = args.includes('--verify');
const modelArg = args.find(a => a.startsWith('--model='));
const specificModel = modelArg ? modelArg.split('=')[1] : null;

// Create a raw Prisma client without encryption middleware for migration
const prisma = new PrismaClient();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PHI ENCRYPTION MIGRATION SCRIPT                    ║');
  console.log('║         HIPAA Compliance Data Protection                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Check for encryption key
  if (!process.env.PHI_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ ERROR: PHI_ENCRYPTION_KEY must be set in production');
      process.exit(1);
    }
    console.warn('⚠️  WARNING: Using development encryption key');
    console.warn('   This is NOT secure for production use!');
    console.warn('');
  }

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  if (verifyOnly) {
    console.log('🔍 VERIFY MODE - Only checking encryption status');
    console.log('');
  }

  const modelsToProcess = specificModel
    ? [specificModel]
    : Object.keys(PHI_FIELDS_BY_MODEL);

  console.log(`📋 Models to process: ${modelsToProcess.join(', ')}`);
  console.log('');

  const results: Record<string, any> = {};

  for (const modelName of modelsToProcess) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${modelName}`);
    console.log(`PHI Fields: ${PHI_FIELDS_BY_MODEL[modelName]?.join(', ') || 'None'}`);
    console.log('='.repeat(60));

    try {
      if (verifyOnly || isDryRun) {
        // Verify encryption status
        const status = await verifyEncryptionStatus(prisma, modelName);
        results[modelName] = status;

        console.log(`  Total records: ${status.total}`);
        console.log(`  ✅ Encrypted: ${status.encrypted}`);
        console.log(`  ⚠️  Unencrypted: ${status.unencrypted}`);

        if (status.unencrypted > 0) {
          console.log(`  📝 ${status.unencrypted} records need encryption`);
        }
      } else {
        // Perform migration
        console.log('  Starting encryption migration...');
        const result = await encryptExistingData(prisma, modelName, 100);
        results[modelName] = result;

        console.log(`  ✅ Processed: ${result.processed}`);
        console.log(`  🔐 Encrypted: ${result.encrypted}`);
        console.log(`  ❌ Errors: ${result.errors}`);
      }
    } catch (error) {
      console.error(`  ❌ ERROR: ${error}`);
      results[modelName] = { error: String(error) };
    }
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    MIGRATION SUMMARY                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  let totalProcessed = 0;
  let totalEncrypted = 0;
  let totalErrors = 0;
  let totalUnencrypted = 0;

  for (const [model, result] of Object.entries(results)) {
    if (result.error) {
      console.log(`❌ ${model}: ERROR - ${result.error}`);
    } else if (verifyOnly || isDryRun) {
      console.log(`${model}: ${result.total} total, ${result.encrypted} encrypted, ${result.unencrypted} unencrypted`);
      totalUnencrypted += result.unencrypted || 0;
    } else {
      console.log(`${model}: ${result.processed} processed, ${result.encrypted} encrypted, ${result.errors} errors`);
      totalProcessed += result.processed || 0;
      totalEncrypted += result.encrypted || 0;
      totalErrors += result.errors || 0;
    }
  }

  console.log('');
  console.log('─'.repeat(60));

  if (verifyOnly || isDryRun) {
    console.log(`Total unencrypted records: ${totalUnencrypted}`);
    if (totalUnencrypted > 0) {
      console.log('');
      console.log('⚠️  Run without --dry-run or --verify to encrypt these records');
    } else {
      console.log('');
      console.log('✅ All PHI data is encrypted!');
    }
  } else {
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total encrypted: ${totalEncrypted}`);
    console.log(`Total errors: ${totalErrors}`);

    if (totalErrors > 0) {
      console.log('');
      console.log('⚠️  Some records failed to encrypt. Check logs for details.');
    } else {
      console.log('');
      console.log('✅ Migration completed successfully!');
    }
  }

  console.log('');
}

main()
  .catch((error) => {
    logger.error('Migration script failed', { error });
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
