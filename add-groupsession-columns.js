const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addGroupSessionColumns() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    // Add groupSessionId column
    const col1Check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'groupSessionId'
      );
    `);

    if (!col1Check.rows[0].exists) {
      console.log('Adding groupSessionId column...');
      await client.query(`ALTER TABLE "appointments" ADD COLUMN "groupSessionId" TEXT;`);
      console.log('✓ groupSessionId column added');
    } else {
      console.log('✓ groupSessionId column already exists');
    }

    // Add isGroupSession column
    const col2Check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'isGroupSession'
      );
    `);

    if (!col2Check.rows[0].exists) {
      console.log('Adding isGroupSession column...');
      await client.query(`ALTER TABLE "appointments" ADD COLUMN "isGroupSession" BOOLEAN NOT NULL DEFAULT false;`);
      console.log('✓ isGroupSession column added');
    } else {
      console.log('✓ isGroupSession column already exists');
    }

    console.log('\n✅ Group session columns added!\n');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addGroupSessionColumns();
