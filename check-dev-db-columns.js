const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    // Check for employment columns
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('employeeId', 'hireDate', 'terminationDate', 'employmentStatus', 'department', 'jobTitle', 'workLocation', 'employmentType', 'managerId')
      ORDER BY column_name;
    `);

    console.log('=== EMPLOYMENT COLUMNS IN DEV DATABASE ===');
    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length}/9 columns:`);
      result.rows.forEach(r => console.log(`  ✓ ${r.column_name}`));
    } else {
      console.log('❌ No employment columns found!');
    }

    // Get total column count
    const allColumns = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
    console.log(`\nTotal users table columns: ${allColumns.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkColumns();
