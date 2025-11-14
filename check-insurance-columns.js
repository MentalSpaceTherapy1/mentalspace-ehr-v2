const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkInsuranceColumns() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get actual columns in database
    const dbColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'insurance_information'
      ORDER BY ordinal_position;
    `);

    console.log('=== COLUMNS IN DATABASE ===\n');
    console.log(`Total: ${dbColumns.rows.length} columns\n`);
    dbColumns.rows.forEach((col, i) => {
      console.log(`${i + 1}. ${col.column_name} (${col.data_type})`);
    });

    // Check for authorizationsRequired specifically
    const hasAuthRequired = dbColumns.rows.find(col => col.column_name === 'authorizationsRequired');

    console.log('\n=== MISSING COLUMN CHECK ===\n');
    if (hasAuthRequired) {
      console.log('✅ authorizationsRequired column EXISTS');
    } else {
      console.log('❌ authorizationsRequired column MISSING - THIS IS THE PROBLEM!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkInsuranceColumns();
