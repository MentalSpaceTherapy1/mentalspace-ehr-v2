const { Client } = require('pg');

const client = new Client({
  host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspace_ehr',
  user: 'mentalspace_admin',
  password: 'MentalSpace2024!SecurePwd',
  ssl: { rejectUnauthorized: false }
});

async function addMissingColumns() {
  try {
    await client.connect();
    console.log('Connected to production database');

    // Add the missing columns that should have been added by migration 20250107_add_ai_note_generation
    const columnsToAdd = [
      { name: 'generatedFrom', sql: 'ADD COLUMN IF NOT EXISTS "generatedFrom" TEXT' },
      { name: 'aiGeneratedNoteId', sql: 'ADD COLUMN IF NOT EXISTS "aiGeneratedNoteId" TEXT' },
      { name: 'generationConfidence', sql: 'ADD COLUMN IF NOT EXISTS "generationConfidence" DOUBLE PRECISION' },
      { name: 'clinicianReviewedAI', sql: 'ADD COLUMN IF NOT EXISTS "clinicianReviewedAI" BOOLEAN NOT NULL DEFAULT false' },
      { name: 'aiEditCount', sql: 'ADD COLUMN IF NOT EXISTS "aiEditCount" INTEGER NOT NULL DEFAULT 0' }
    ];

    console.log('\n=== ADDING MISSING COLUMNS TO clinical_notes ===');

    for (const column of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE "clinical_notes" ${column.sql}`);
        console.log(`✓ Added column: ${column.name}`);
      } catch (error) {
        console.log(`⚠️  Column ${column.name}: ${error.message}`);
      }
    }

    // Verify columns were added
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clinical_notes'
        AND column_name IN ('generatedFrom', 'aiGeneratedNoteId', 'generationConfidence', 'clinicianReviewedAI', 'aiEditCount')
      ORDER BY column_name;
    `);

    console.log('\n=== VERIFICATION ===');
    console.log('Columns found:', result.rows.map(r => r.column_name).join(', '));

    if (result.rows.length === 5) {
      console.log('✅ All 5 missing columns successfully added');
    } else {
      console.log(`⚠️  Only ${result.rows.length}/5 columns found`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addMissingColumns();
