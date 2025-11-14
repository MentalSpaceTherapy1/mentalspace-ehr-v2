const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkFormAssignmentsTable() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get actual columns in database
    const dbColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'form_assignments'
      ORDER BY ordinal_position;
    `);

    console.log('=== COLUMNS IN form_assignments TABLE ===\n');
    console.log(`Total: ${dbColumns.rows.length} columns\n`);
    dbColumns.rows.forEach((col, i) => {
      console.log(`${i + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Expected columns from Prisma schema
    const expectedColumns = [
      'id',
      'formId',
      'clientId',
      'assignedBy',
      'assignedAt',
      'dueDate',
      'isRequired',
      'assignmentNotes',
      'clientMessage',
      'status',
      'completedAt',
      'submissionId',
      'lastReminderSent'
    ];

    console.log('\n=== MISSING COLUMNS CHECK ===\n');
    const actualColumns = dbColumns.rows.map(col => col.column_name);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('✅ All expected columns exist!');
    } else {
      console.log('❌ Missing columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkFormAssignmentsTable();
