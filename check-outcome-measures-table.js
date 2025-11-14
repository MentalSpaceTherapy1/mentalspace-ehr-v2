const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkClinicalNotesTable() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== CLINICAL_NOTES TABLE STRUCTURE ===\n');

    // Get all columns from clinical_notes table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clinical_notes'
      ORDER BY ordinal_position;
    `);

    console.log(`Found ${result.rows.length} columns:\n`);
    result.rows.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Expected columns from Prisma schema (just the unlock-related ones we know are missing)
    const expectedColumns = [
      // Sunday Lockout & Unlock Requests
      'isLocked',
      'unlockRequested',
      'unlockRequestDate',
      'unlockReason',
      'unlockApprovedBy',
      'unlockApprovalDate',
      'unlockUntil',
      // Revision Workflow
      'revisionHistory',
      'revisionCount',
      'currentRevisionComments',
      'currentRevisionRequiredChanges',
      // AI Generated
      'aiGenerated',
      'aiModel',
      'aiPrompt',
      'inputTranscript',
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

checkClinicalNotesTable();
