const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function listTables() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ALL TABLES IN DATABASE ===\n');

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.table_name}`);
    });

    // Look for tables that might be related to diagnosis
    console.log('\n=== DIAGNOSIS-RELATED TABLES ===\n');
    const diagnosisTables = result.rows.filter(row =>
      row.table_name.toLowerCase().includes('diagnos')
    );

    if (diagnosisTables.length > 0) {
      diagnosisTables.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  No diagnosis-related tables found');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

listTables();
