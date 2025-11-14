const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addOutcomeMeasuresColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING MISSING COLUMNS TO outcome_measures ===\n');

    // Column 1: administeredById
    console.log('1. Adding administeredById column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "administeredById" TEXT NOT NULL DEFAULT 'unknown';
    `);
    console.log('✅ Added administeredById column\n');

    // Column 2: administeredDate
    console.log('2. Adding administeredDate column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "administeredDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Added administeredDate column\n');

    // Column 3: clinicalNoteId
    console.log('3. Adding clinicalNoteId column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "clinicalNoteId" TEXT;
    `);
    console.log('✅ Added clinicalNoteId column\n');

    // Column 4: appointmentId
    console.log('4. Adding appointmentId column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "appointmentId" TEXT;
    `);
    console.log('✅ Added appointmentId column\n');

    // Column 5: responses
    console.log('5. Adding responses column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "responses" JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    console.log('✅ Added responses column\n');

    // Column 6: totalScore
    console.log('6. Adding totalScore column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "totalScore" INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✅ Added totalScore column\n');

    // Column 7: severity
    console.log('7. Adding severity column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MINIMAL';
    `);
    console.log('✅ Added severity column\n');

    // Column 8: severityLabel
    console.log('8. Adding severityLabel column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "severityLabel" TEXT NOT NULL DEFAULT 'Unknown';
    `);
    console.log('✅ Added severityLabel column\n');

    // Column 9: clinicalNotes
    console.log('9. Adding clinicalNotes column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "clinicalNotes" TEXT;
    `);
    console.log('✅ Added clinicalNotes column\n');

    // Column 10: completionTime
    console.log('10. Adding completionTime column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "completionTime" INTEGER;
    `);
    console.log('✅ Added completionTime column\n');

    // Column 11: wasCompleted
    console.log('11. Adding wasCompleted column...');
    await client.query(`
      ALTER TABLE "outcome_measures"
      ADD COLUMN "wasCompleted" BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log('✅ Added wasCompleted column\n');

    // Verify all columns were added
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'outcome_measures'
        AND column_name IN (
          'administeredById', 'administeredDate', 'clinicalNoteId', 'appointmentId',
          'responses', 'totalScore', 'severity', 'severityLabel',
          'clinicalNotes', 'completionTime', 'wasCompleted'
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
      console.log(`❌ Verification failed! Expected 11 columns, found: ${verification.rows.length}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addOutcomeMeasuresColumns();
