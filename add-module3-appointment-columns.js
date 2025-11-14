const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addModule3Columns() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== ADDING MODULE 3 APPOINTMENT COLUMNS ===\n');

    // List of columns to add
    const columns = [
      { name: 'confirmedAt', type: 'TIMESTAMP(3)', nullable: true },
      { name: 'confirmedBy', type: 'TEXT', nullable: true },
      { name: 'confirmationMethod', type: 'TEXT', nullable: true },
      { name: 'noShowRiskScore', type: 'DOUBLE PRECISION', nullable: true },
      { name: 'noShowRiskLevel', type: 'TEXT', nullable: true },
      { name: 'noShowRiskFactors', type: 'TEXT[]', nullable: true, default: 'ARRAY[]::TEXT[]' },
      { name: 'riskCalculatedAt', type: 'TIMESTAMP(3)', nullable: true },
      { name: 'appointmentTypeId', type: 'TEXT', nullable: true },
    ];

    for (const col of columns) {
      // Check if column already exists
      const columnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'appointments'
          AND column_name = $1
        );
      `, [col.name]);

      if (columnCheck.rows[0].exists) {
        console.log(`✓ ${col.name} column already exists`);
        continue;
      }

      console.log(`Adding ${col.name} column...`);
      const alterQuery = `
        ALTER TABLE "appointments"
        ADD COLUMN "${col.name}" ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''};
      `;
      await client.query(alterQuery);
      console.log(`✓ ${col.name} column added successfully`);
    }

    console.log('\n✅ All Module 3 appointment columns added!\n');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addModule3Columns();
