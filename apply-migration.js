const { Client } = require('pg');
const fs = require('fs');

async function applyMigration() {
  const client = new Client({
    host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'mentalspace_ehr',
    user: 'mentalspace_admin',
    password: 'MentalSpace2024!SecurePwd',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Applying migration...');
    const sql = fs.readFileSync('run-migration.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');

    console.log('\nVerifying columns...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'intake_form_submissions'
      AND column_name IN ('signatureData', 'signedByName', 'signedDate', 'signatureIpAddress', 'consentAgreed')
      ORDER BY column_name
    `);

    console.log('\nColumns found:');
    console.table(result.rows);
    console.log(`\n✅ ${result.rows.length}/5 columns verified`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
