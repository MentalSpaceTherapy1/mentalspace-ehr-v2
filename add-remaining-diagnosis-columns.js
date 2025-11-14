const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addRemainingColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING REMAINING COLUMNS TO client_diagnoses ===\n');

    // Add remissionDate column
    console.log('1. Adding remissionDate column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "remissionDate" TIMESTAMP;
    `);
    console.log('✅ Added remissionDate column\n');

    // Add dateDiagnosed column with default value
    console.log('2. Adding dateDiagnosed column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "dateDiagnosed" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Added dateDiagnosed column with default value\n');

    // Add lastReviewedDate column
    console.log('3. Adding lastReviewedDate column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "lastReviewedDate" TIMESTAMP;
    `);
    console.log('✅ Added lastReviewedDate column\n');

    // Add lastReviewedById column
    console.log('4. Adding lastReviewedById column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "lastReviewedById" TEXT;
    `);
    console.log('✅ Added lastReviewedById column\n');

    // Add dateResolved column
    console.log('5. Adding dateResolved column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "dateResolved" TIMESTAMP;
    `);
    console.log('✅ Added dateResolved column\n');

    // Add resolutionNotes column
    console.log('6. Adding resolutionNotes column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "resolutionNotes" TEXT;
    `);
    console.log('✅ Added resolutionNotes column\n');

    // Verify all columns were added
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'client_diagnoses'
        AND column_name IN (
          'remissionDate', 'dateDiagnosed', 'lastReviewedDate',
          'lastReviewedById', 'dateResolved', 'resolutionNotes'
        )
      ORDER BY column_name;
    `);

    console.log('=== VERIFICATION ===\n');
    if (verification.rows.length === 6) {
      console.log('✅ All 6 columns successfully added!\n');
      verification.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        if (col.column_default) {
          console.log(`    Default: ${col.column_default}`);
        }
      });
    } else {
      console.log('❌ Verification failed! Expected 6 columns, found:', verification.rows.length);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addRemainingColumns();
