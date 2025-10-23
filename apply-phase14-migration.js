const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const client = new Client({
    host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'mentalspace_admin',
    password: 'MentalSpace2024!SecurePwd',
    database: 'mentalspace_ehr',
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('Connected successfully!');

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      'packages/database/prisma/migrations/20251023000000_add_electronic_signatures_and_attestations/migration.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\nApplying Phase 1.4 migration...');
    console.log('Migration includes:');
    console.log('- Adding signature authentication fields to users table');
    console.log('- Creating signature_attestations table');
    console.log('- Creating signature_events table');
    console.log('- Seeding default attestations for GA, FL, and US');
    console.log('');

    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!');

    // Verify tables were created
    console.log('\nVerifying migration...');

    const attestationsCount = await client.query(
      'SELECT COUNT(*) FROM signature_attestations'
    );
    console.log(`✅ signature_attestations table created with ${attestationsCount.rows[0].count} attestations`);

    const eventsCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signature_events')"
    );
    console.log(`✅ signature_events table created: ${eventsCheck.rows[0].exists}`);

    // Check user table columns
    const userColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('signaturePin', 'signaturePassword', 'signatureBiometric')
    `);
    console.log(`✅ User signature fields added: ${userColumns.rows.map(r => r.column_name).join(', ')}`);

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.code === 'ENOENT') {
      console.error('Migration file not found. Please check the path.');
    } else if (error.code) {
      console.error('PostgreSQL error code:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

applyMigration();
