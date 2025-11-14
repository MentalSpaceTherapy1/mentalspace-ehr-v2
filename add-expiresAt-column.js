const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addExpiresAtColumn() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== ADDING expiresAt COLUMN TO MESSAGES TABLE ===\n');

    // Check if column exists
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'expiresAt';
    `);

    if (columnsResult.rows.length > 0) {
      console.log('✓ expiresAt column already exists');
    } else {
      // Add expiresAt column
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "expiresAt" TIMESTAMP(3);
      `);
      console.log('✓ Added expiresAt column');
    }

    // Verify final schema
    const finalColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position;
    `);

    console.log('\nFinal columns in messages table:');
    finalColumns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ Messages table updated successfully!');

  } catch (error) {
    console.error('\nError:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addExpiresAtColumn();
