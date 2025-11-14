const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkClientDiagnosisTable() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== CLIENT_DIAGNOSIS TABLE STRUCTURE ===\n');

    // Get all columns from client_diagnoses table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'client_diagnoses'
      ORDER BY ordinal_position;
    `);

    console.log(`Found ${result.rows.length} columns:\n`);
    result.rows.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      if (col.column_default) {
        console.log(`   Default: ${col.column_default}`);
      }
    });

    // Check if there are any existing records
    const countResult = await client.query(`
      SELECT COUNT(*) FROM "client_diagnoses";
    `);
    console.log(`\n=== DATA CHECK ===`);
    console.log(`Existing records: ${countResult.rows[0].count}`);

    // Expected columns from Prisma schema
    const expectedColumns = [
      'id',
      'clientId',
      'diagnosisType',
      'icd10Code',
      'dsm5Code',
      'diagnosisName',
      'diagnosisCategory',
      'severitySpecifier',
      'courseSpecifier',
      'onsetDate',
      'supportingEvidence',
      'differentialConsiderations',
      'diagnosedById',
      'status',
      'createdAt',
      'updatedAt'
    ];

    console.log('\n=== MISSING COLUMNS CHECK ===\n');
    const actualColumns = result.rows.map(r => r.column_name);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('✅ All expected columns are present');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkClientDiagnosisTable();
