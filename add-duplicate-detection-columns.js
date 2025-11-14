const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addDuplicateDetectionColumns() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== ADDING DUPLICATE DETECTION COLUMNS ===');

    const columns = [
      { name: 'mergedIntoId', sql: 'ADD COLUMN IF NOT EXISTS "mergedIntoId" UUID' },
      { name: 'mergedAt', sql: 'ADD COLUMN IF NOT EXISTS "mergedAt" TIMESTAMP(3)' },
      { name: 'isMerged', sql: 'ADD COLUMN IF NOT EXISTS "isMerged" BOOLEAN NOT NULL DEFAULT false' }
    ];

    for (const column of columns) {
      try {
        await client.query(`ALTER TABLE "clients" ${column.sql}`);
        console.log(`✓ Added column: ${column.name}`);
      } catch (error) {
        console.log(`⚠️  Column ${column.name}: ${error.message}`);
      }
    }

    // Verify
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clients'
        AND column_name IN ('mergedIntoId', 'mergedAt', 'isMerged')
      ORDER BY column_name;
    `);

    console.log('\n=== VERIFICATION ===');
    console.log(`Found ${result.rows.length}/3 duplicate detection columns`);
    if (result.rows.length === 3) {
      console.log('✅ All 3 duplicate detection fields successfully added');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addDuplicateDetectionColumns();
