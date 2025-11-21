const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use development database from .env
const DATABASE_URL = "postgresql://mentalspace_admin:9JS1df2PprIr=_MCJgyrjB^C.os=^7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr?sslmode=require";

async function applyMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL.replace('?sslmode=require', ''),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to development database');

    // ============================================================================
    // Migration 1: Main AdvancedMD Integration
    // ============================================================================
    console.log('\n📋 Applying migration: 20251120191834_advancedmd_integration');

    const migration1Path = path.join(__dirname, 'packages', 'database', 'prisma', 'migrations', '20251120191834_advancedmd_integration', 'migration.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');

    console.log('  • Adding AdvancedMD fields to clients table...');
    console.log('  • Adding AdvancedMD fields to insurance_information table...');
    console.log('  • Adding AdvancedMD fields to charge_entries table...');
    console.log('  • Creating new AdvancedMD tables...');

    await client.query(migration1SQL);
    console.log('✓ Migration 1 SQL executed successfully');

    // Record migration 1
    const migration1Name = '20251120191834_advancedmd_integration';
    await client.query(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES ($1, $2, NOW(), $3, $4, NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `, [
      migration1Name,
      'advancedmd-integration-phase3-20251120', // Generated checksum
      migration1Name,
      'AdvancedMD Integration - Phase 3 (Patient, Billing, Claims, Eligibility)'
    ]);
    console.log('✓ Recorded migration 1 in _prisma_migrations table');

    // ============================================================================
    // Migration 2: AdvancedMD Appointment Fields
    // ============================================================================
    console.log('\n📋 Applying migration: 20250120_add_advancedmd_appointment_fields');

    const migration2Path = path.join(__dirname, 'packages', 'database', 'prisma', 'migrations', '20250120_add_advancedmd_appointment_fields', 'migration.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf-8');

    console.log('  • Adding AdvancedMD fields to appointments table...');
    console.log('  • Creating unique index on advancedMDVisitId...');

    await client.query(migration2SQL);
    console.log('✓ Migration 2 SQL executed successfully');

    // Record migration 2
    const migration2Name = '20250120_add_advancedmd_appointment_fields';
    await client.query(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES ($1, $2, NOW(), $3, $4, NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `, [
      migration2Name,
      'advancedmd-appointments-phase3-20250120', // Generated checksum
      migration2Name,
      'AdvancedMD Appointment Integration - Phase 3'
    ]);
    console.log('✓ Recorded migration 2 in _prisma_migrations table');

    // ============================================================================
    // Verification
    // ============================================================================
    console.log('\n🔍 Verifying migrations...');

    // Check clients table
    const clientsCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clients'
      AND column_name IN ('advancedMDPatientId', 'lastSyncedToAMD', 'amdSyncStatus', 'amdSyncError')
      ORDER BY column_name;
    `);
    console.log(`  ✓ Clients table: ${clientsCheck.rows.length}/4 AdvancedMD columns added`);

    // Check appointments table
    const appointmentsCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND column_name IN ('advancedMDVisitId', 'advancedMDProviderId', 'advancedMDFacilityId', 'lastSyncedToAMD', 'amdSyncStatus', 'amdSyncError')
      ORDER BY column_name;
    `);
    console.log(`  ✓ Appointments table: ${appointmentsCheck.rows.length}/6 AdvancedMD columns added`);

    // Check charge_entries table
    const chargesCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'charge_entries'
      AND column_name IN ('advancedMDChargeId', 'advancedMDVisitId', 'syncStatus', 'syncError', 'lastSyncAttempt')
      ORDER BY column_name;
    `);
    console.log(`  ✓ Charge Entries table: ${chargesCheck.rows.length}/5 AdvancedMD columns added`);

    // Check new tables
    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'advancedmd_config',
        'advancedmd_sync_logs',
        'advancedmd_rate_limit_state',
        'eligibility_checks',
        'claims',
        'claim_charges',
        'claim_payments',
        'era_records',
        'payment_claim_mappings',
        'claim_validation_rules',
        'cpt_codes',
        'icd_codes'
      )
      ORDER BY table_name;
    `);
    console.log(`  ✓ New tables created: ${tablesCheck.rows.length}/12`);
    tablesCheck.rows.forEach(row => {
      console.log(`    - ${row.table_name}`);
    });

    console.log('\n✅ All AdvancedMD migrations applied successfully!');
    console.log('\n📌 Next Steps:');
    console.log('  1. Restart the backend server to pick up schema changes');
    console.log('  2. Test accessing /admin/advancedmd-sync and /admin/advancedmd-settings');
    console.log('  3. Configure AdvancedMD user permissions in AdvancedMD admin panel');
    console.log('  4. Test patient and appointment sync functionality');

  } catch (error) {
    console.error('\n❌ Error applying migrations:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

applyMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
