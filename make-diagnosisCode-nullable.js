const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function makeDiagnosisCodeNullable() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== MAKING diagnosisCode NULLABLE ===\n');

    // Make diagnosisCode nullable (remove NOT NULL constraint)
    console.log('Removing NOT NULL constraint from diagnosisCode...');
    await client.query(`
      ALTER TABLE "client_diagnoses"
      ALTER COLUMN "diagnosisCode" DROP NOT NULL;
    `);
    console.log('✅ diagnosisCode is now nullable\n');

    // Verify the change
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'client_diagnoses' AND column_name = 'diagnosisCode';
    `);

    console.log('=== VERIFICATION ===\n');
    if (verification.rows.length > 0) {
      const col = verification.rows[0];
      console.log(`Column: ${col.column_name}`);
      console.log(`Type: ${col.data_type}`);
      console.log(`Nullable: ${col.is_nullable}`);

      if (col.is_nullable === 'YES') {
        console.log('\n✅ diagnosisCode successfully made nullable!');
      } else {
        console.log('\n❌ diagnosisCode is still NOT NULL!');
      }
    } else {
      console.log('❌ diagnosisCode column not found!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

makeDiagnosisCodeNullable();
