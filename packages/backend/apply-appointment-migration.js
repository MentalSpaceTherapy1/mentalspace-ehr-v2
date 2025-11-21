/**
 * Apply AdvancedMD Appointment Fields Migration
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('📦 Applying AdvancedMD Appointment Fields Migration...\n');

  try {
    // Read migration SQL
    const migrationPath = path.join(
      __dirname,
      '../database/prisma/migrations/20250120_add_advancedmd_appointment_fields/migration.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL:');
    console.log('----------------------------------------');
    console.log(migrationSQL);
    console.log('----------------------------------------\n');

    // Execute migration - split into individual commands
    console.log('Executing migration...');

    // Split SQL into individual statements and filter out comments and empty lines
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        console.log(`  ${i + 1}. Executing: ${stmt.substring(0, 60)}...`);
        await prisma.$executeRawUnsafe(stmt);
      }
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify columns were added
    console.log('Verifying new columns...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND column_name IN (
        'advancedMDVisitId',
        'advancedMDProviderId',
        'advancedMDFacilityId',
        'lastSyncedToAMD',
        'amdSyncStatus',
        'amdSyncError'
      )
      ORDER BY column_name;
    `;

    console.log('New columns added:');
    result.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('Next steps:');
    console.log('  1. Mark migration as applied in migrations table');
    console.log('  2. Generate Prisma Client: npx prisma generate');
    console.log('  3. Create appointment-sync.service.ts');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
