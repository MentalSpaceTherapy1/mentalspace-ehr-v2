const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addMissingColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING MISSING COLUMNS TO client_diagnoses ===\n');

    // Add diagnosisType column
    console.log('1. Adding diagnosisType column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "diagnosisType" TEXT;
    `);
    console.log('✅ Added diagnosisType column\n');

    // Add icd10Code column
    console.log('2. Adding icd10Code column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "icd10Code" TEXT;
    `);
    console.log('✅ Added icd10Code column\n');

    // Add dsm5Code column
    console.log('3. Adding dsm5Code column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "dsm5Code" TEXT;
    `);
    console.log('✅ Added dsm5Code column\n');

    // Add diagnosisName column
    console.log('4. Adding diagnosisName column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "diagnosisName" TEXT;
    `);
    console.log('✅ Added diagnosisName column\n');

    // Add diagnosisCategory column
    console.log('5. Adding diagnosisCategory column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "diagnosisCategory" TEXT;
    `);
    console.log('✅ Added diagnosisCategory column\n');

    // Add severitySpecifier column
    console.log('6. Adding severitySpecifier column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "severitySpecifier" TEXT;
    `);
    console.log('✅ Added severitySpecifier column\n');

    // Add courseSpecifier column
    console.log('7. Adding courseSpecifier column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "courseSpecifier" TEXT;
    `);
    console.log('✅ Added courseSpecifier column\n');

    // Add onsetDate column
    console.log('8. Adding onsetDate column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "onsetDate" TIMESTAMP;
    `);
    console.log('✅ Added onsetDate column\n');

    // Add supportingEvidence column
    console.log('9. Adding supportingEvidence column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "supportingEvidence" TEXT;
    `);
    console.log('✅ Added supportingEvidence column\n');

    // Add differentialConsiderations column
    console.log('10. Adding differentialConsiderations column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "differentialConsiderations" TEXT;
    `);
    console.log('✅ Added differentialConsiderations column\n');

    // Add diagnosedById column
    console.log('11. Adding diagnosedById column...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ADD COLUMN "diagnosedById" TEXT;
    `);
    console.log('✅ Added diagnosedById column\n');

    // Verify all columns were added
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'client_diagnoses'
        AND column_name IN (
          'diagnosisType', 'icd10Code', 'dsm5Code', 'diagnosisName',
          'diagnosisCategory', 'severitySpecifier', 'courseSpecifier',
          'onsetDate', 'supportingEvidence', 'differentialConsiderations', 'diagnosedById'
        )
      ORDER BY column_name;
    `);

    console.log('=== VERIFICATION ===\n');
    if (verification.rows.length === 11) {
      console.log('✅ All 11 columns successfully added!\n');
      verification.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('❌ Verification failed! Expected 11 columns, found:', verification.rows.length);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addMissingColumns();
