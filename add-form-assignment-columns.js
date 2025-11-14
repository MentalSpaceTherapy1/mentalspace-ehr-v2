const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addMissingColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING MISSING COLUMNS TO form_assignments ===\n');

    // Add assignmentNotes column
    console.log('1. Adding assignmentNotes column...');
    await client.query(`
      ALTER TABLE "form_assignments"
      ADD COLUMN "assignmentNotes" TEXT;
    `);
    console.log('✅ Added assignmentNotes column\n');

    // Add clientMessage column
    console.log('2. Adding clientMessage column...');
    await client.query(`
      ALTER TABLE "form_assignments"
      ADD COLUMN "clientMessage" TEXT;
    `);
    console.log('✅ Added clientMessage column\n');

    // Add lastReminderSent column
    console.log('3. Adding lastReminderSent column...');
    await client.query(`
      ALTER TABLE "form_assignments"
      ADD COLUMN "lastReminderSent" TIMESTAMP;
    `);
    console.log('✅ Added lastReminderSent column\n');

    // Verify all columns were added
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'form_assignments'
        AND column_name IN ('assignmentNotes', 'clientMessage', 'lastReminderSent')
      ORDER BY column_name;
    `);

    console.log('=== VERIFICATION ===\n');
    if (verification.rows.length === 3) {
      console.log('✅ All 3 columns successfully added!\n');
      verification.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('❌ Verification failed! Expected 3 columns, found:', verification.rows.length);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addMissingColumns();
