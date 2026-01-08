const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to production database');

    // Read and execute the migration file
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(__dirname, 'packages/database/prisma/migrations/20251120191834_advancedmd_integration/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying AdvancedMD integration migration...');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('Migration applied successfully!');

    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'insurance_information'
      AND column_name IN ('advancedMDPayerId', 'advancedMDPayerName', 'lastEligibilityCheck')
    `);

    console.log('Verified columns in insurance_information:', result.rows.map(r => r.column_name));

  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

applyMigration();
