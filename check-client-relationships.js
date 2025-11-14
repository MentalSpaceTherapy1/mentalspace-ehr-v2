const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkClientRelationships() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== CHECKING CLIENT RELATIONSHIP TABLES ===\n');

    // Check for emergency_contacts table
    const emergencyContactsTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'emergency_contacts';
    `);

    console.log(`1. emergency_contacts table: ${emergencyContactsTable.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    if (emergencyContactsTable.rows.length > 0) {
      const emergencyContactsCols = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'emergency_contacts'
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns (${emergencyContactsCols.rows.length}):`);
      emergencyContactsCols.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log('');

    // Check for insurance_information table
    const insuranceInfoTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'insurance_information';
    `);

    console.log(`2. insurance_information table: ${insuranceInfoTable.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    if (insuranceInfoTable.rows.length > 0) {
      const insuranceInfoCols = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'insurance_information'
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns (${insuranceInfoCols.rows.length}):`);
      insuranceInfoCols.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log('');

    // Check if clients table has the foreign key column
    const clientColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name = 'primaryTherapistId';
    `);

    console.log(`3. clients.primaryTherapistId column: ${clientColumns.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    console.log('\n=== TEST ACTUAL CLIENT QUERY ===\n');

    // Try to fetch the problematic client
    const testClient = await client.query(`
      SELECT
        c.id,
        c."firstName",
        c."lastName",
        c."primaryTherapistId"
      FROM clients c
      WHERE c.id = 'fd871d2a-15ce-47df-bdda-2394b14730a4';
    `);

    if (testClient.rows.length > 0) {
      console.log('✅ Client found in database:');
      console.log(JSON.stringify(testClient.rows[0], null, 2));
    } else {
      console.log('❌ Client NOT found in database (ID: fd871d2a-15ce-47df-bdda-2394b14730a4)');
    }

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkClientRelationships();
