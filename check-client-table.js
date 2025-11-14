const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkClientTable() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    // Check if clients table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'clients'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ clients table does not exist!');
      return;
    }

    console.log('✓ clients table exists\n');

    // Get all columns from clients table
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position;
    `);

    console.log(`=== CLIENTS TABLE COLUMNS (${columns.rows.length} total) ===`);
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });

    // Check for count
    const count = await client.query('SELECT COUNT(*) as count FROM clients');
    console.log(`\nTotal clients in database: ${count.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkClientTable();
