const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addTimestampColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING TIMESTAMP COLUMNS TO outcome_measures ===\n');

    // Add createdAt column
    console.log('1. Adding createdAt column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Added createdAt column\n');

    // Add updatedAt column
    console.log('2. Adding updatedAt column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Added updatedAt column\n');

    // Verify columns were added
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'outcome_measures'
        AND column_name IN ('createdAt', 'updatedAt')
      ORDER BY column_name;
    `);

    console.log('=== VERIFICATION ===\n');
    if (verification.rows.length === 2) {
      console.log('✅ Both timestamp columns successfully added!\n');
      verification.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log(`❌ Verification failed! Expected 2 columns, found: ${verification.rows.length}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addTimestampColumns();
