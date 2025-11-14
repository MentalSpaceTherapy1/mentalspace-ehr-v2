const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addConfirmedAtColumn() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'confirmedAt'
      );
    `);

    if (columnCheck.rows[0].exists) {
      console.log('✓ confirmedAt column already exists in appointments table\n');
      return;
    }

    console.log('Adding confirmedAt column to appointments table...');
    await client.query(`
      ALTER TABLE "appointments"
      ADD COLUMN "confirmedAt" TIMESTAMP(3);
    `);
    console.log('✓ confirmedAt column added successfully\n');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addConfirmedAtColumn();
