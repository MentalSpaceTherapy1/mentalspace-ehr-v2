const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addAuthorizationsRequiredColumn() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    console.log('=== ADDING authorizationsRequired COLUMN ===\n');

    // Add the missing column with default value
    await client.query(`
      ALTER TABLE "insurance_information"
      ADD COLUMN "authorizationsRequired" BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log('✅ Added authorizationsRequired column with default value false\n');

    // Verify the column was added
    const verification = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'insurance_information' AND column_name = 'authorizationsRequired';
    `);

    if (verification.rows.length > 0) {
      console.log('=== VERIFICATION ===\n');
      console.log('Column details:');
      console.log(JSON.stringify(verification.rows[0], null, 2));
      console.log('\n✅ Column successfully added to insurance_information table!');
    } else {
      console.log('❌ Column verification failed!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addAuthorizationsRequiredColumn();
