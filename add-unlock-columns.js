const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addUnlockColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING UNLOCK-RELATED COLUMNS TO clinical_notes ===\n');

    // Add unlockRequested column
    console.log('1. Adding unlockRequested column...');
    await client.query(`
      ALTER TABLE "clinical_notes"
      ADD COLUMN "unlockRequested" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log('✅ Added unlockRequested column\n');

    // Add unlockRequestDate column
    console.log('2. Adding unlockRequestDate column...');
    await client.query(`
      ALTER TABLE "clinical_notes"
      ADD COLUMN "unlockRequestDate" TIMESTAMP;
    `);
    console.log('✅ Added unlockRequestDate column\n');

    // Add unlockReason column
    console.log('3. Adding unlockReason column...');
    await client.query(`
      ALTER TABLE "clinical_notes"
      ADD COLUMN "unlockReason" TEXT;
    `);
    console.log('✅ Added unlockReason column\n');

    // Add unlockApprovedBy column
    console.log('4. Adding unlockApprovedBy column...');
    await client.query(`
      ALTER TABLE "clinical_notes"
      ADD COLUMN "unlockApprovedBy" TEXT;
    `);
    console.log('✅ Added unlockApprovedBy column\n');

    // Add unlockApprovalDate column
    console.log('5. Adding unlockApprovalDate column...');
    await client.query(`
      ALTER TABLE "clinical_notes"
      ADD COLUMN "unlockApprovalDate" TIMESTAMP;
    `);
    console.log('✅ Added unlockApprovalDate column\n');

    // Add unlockUntil column
    console.log('6. Adding unlockUntil column...');
    await client.query(`
      ALTER TABLE "clinical_notes"
      ADD COLUMN "unlockUntil" TIMESTAMP;
    `);
    console.log('✅ Added unlockUntil column\n');

    // Verify all columns were added
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clinical_notes'
        AND column_name IN (
          'unlockRequested', 'unlockRequestDate', 'unlockReason',
          'unlockApprovedBy', 'unlockApprovalDate', 'unlockUntil'
        )
      ORDER BY column_name;
    `);

    console.log('=== VERIFICATION ===\n');
    if (verification.rows.length === 6) {
      console.log('✅ All 6 columns successfully added!\n');
      verification.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
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

addUnlockColumns();
