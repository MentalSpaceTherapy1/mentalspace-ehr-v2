const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkCredentialsTable() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    // Check if credentials table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'credentials'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;
    console.log(`credentials table exists: ${tableExists}\n`);

    if (!tableExists) {
      console.log('❌ credentials table does NOT exist');
      console.log('This is the root cause of the credentialing endpoint errors.\n');
    } else {
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'credentials'
        ORDER BY ordinal_position;
      `);

      console.log('✅ credentials table exists');
      console.log(`Found ${columns.rows.length} columns:\n`);
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Check if there are any credentials
      const count = await client.query('SELECT COUNT(*) FROM credentials');
      console.log(`\nTotal credentials: ${count.rows[0].count}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkCredentialsTable();
