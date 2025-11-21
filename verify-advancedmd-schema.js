const { Client } = require('pg');

const DATABASE_URL = "postgresql://mentalspace_admin:9JS1df2PprIr=_MCJgyrjB^C.os=^7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr?sslmode=require";

async function verifySchema() {
  const client = new Client({
    connectionString: DATABASE_URL.replace('?sslmode=require', ''),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to development database\n');

    // Check clients table columns
    console.log('📋 Checking clients table:');
    const clientsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
      AND column_name IN ('advancedMDPatientId', 'lastSyncedToAMD', 'amdSyncStatus', 'amdSyncError')
      ORDER BY column_name;
    `);
    if (clientsColumns.rows.length > 0) {
      clientsColumns.rows.forEach(row => {
        console.log(`  ✓ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('  ❌ No AdvancedMD columns found');
    }
    console.log(`  Total: ${clientsColumns.rows.length}/4 columns\n`);

    // Check appointments table columns
    console.log('📋 Checking appointments table:');
    const appointmentsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND column_name IN ('advancedMDVisitId', 'advancedMDProviderId', 'advancedMDFacilityId', 'lastSyncedToAMD', 'amdSyncStatus', 'amdSyncError')
      ORDER BY column_name;
    `);
    if (appointmentsColumns.rows.length > 0) {
      appointmentsColumns.rows.forEach(row => {
        console.log(`  ✓ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('  ❌ No AdvancedMD columns found');
    }
    console.log(`  Total: ${appointmentsColumns.rows.length}/6 columns\n`);

    // Check charge_entries table columns
    console.log('📋 Checking charge_entries table:');
    const chargesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'charge_entries'
      AND column_name IN ('advancedMDChargeId', 'advancedMDVisitId', 'syncStatus', 'syncError', 'lastSyncAttempt')
      ORDER BY column_name;
    `);
    if (chargesColumns.rows.length > 0) {
      chargesColumns.rows.forEach(row => {
        console.log(`  ✓ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('  ❌ No AdvancedMD columns found');
    }
    console.log(`  Total: ${chargesColumns.rows.length}/5 columns\n`);

    // Check insurance_information table columns
    console.log('📋 Checking insurance_information table:');
    const insuranceColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'insurance_information'
      AND column_name IN ('advancedMDPayerId', 'advancedMDPayerName', 'lastEligibilityCheck')
      ORDER BY column_name;
    `);
    if (insuranceColumns.rows.length > 0) {
      insuranceColumns.rows.forEach(row => {
        console.log(`  ✓ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('  ❌ No AdvancedMD columns found');
    }
    console.log(`  Total: ${insuranceColumns.rows.length}/3 columns\n`);

    // Check for new tables
    console.log('📋 Checking AdvancedMD tables:');
    const tables = await client.query(`
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
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    } else {
      console.log('  ❌ No AdvancedMD tables found');
    }
    console.log(`  Total: ${tables.rows.length}/12 tables\n`);

    // Summary
    const totalExpected = 4 + 6 + 5 + 3 + 12; // columns + tables
    const totalFound = clientsColumns.rows.length + appointmentsColumns.rows.length +
                      chargesColumns.rows.length + insuranceColumns.rows.length + tables.rows.length;

    console.log('📊 Summary:');
    console.log(`  Total schema elements: ${totalFound}/${totalExpected}`);

    if (totalFound === totalExpected) {
      console.log('\n✅ All AdvancedMD schema elements are present!');
      console.log('   The database is ready for AdvancedMD integration.');
    } else if (totalFound > 0) {
      console.log('\n⚠️  Partial schema detected.');
      console.log('   Some AdvancedMD elements are present but not all.');
    } else {
      console.log('\n❌ No AdvancedMD schema elements found.');
      console.log('   Migrations need to be applied.');
    }

  } catch (error) {
    console.error('\n❌ Error verifying schema:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

verifySchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
