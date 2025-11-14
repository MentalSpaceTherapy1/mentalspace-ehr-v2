const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function createPotentialDuplicatesTable() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== CREATING POTENTIAL_DUPLICATES TABLE ===\n');

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'potential_duplicates'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  potential_duplicates table already exists. Skipping creation.\n');
      return;
    }

    // Create potential_duplicates table
    console.log('Creating potential_duplicates table...');
    await client.query(`
      CREATE TABLE "potential_duplicates" (
        "id" TEXT NOT NULL,
        "client1Id" TEXT NOT NULL,
        "client2Id" TEXT NOT NULL,
        "matchType" TEXT NOT NULL,
        "confidenceScore" DOUBLE PRECISION NOT NULL,
        "matchFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        "status" TEXT NOT NULL,
        "reviewedBy" TEXT,
        "reviewedAt" TIMESTAMP(3),
        "resolutionNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "potential_duplicates_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ potential_duplicates table created');

    // Create unique constraint
    console.log('Creating unique constraint...');
    await client.query(`
      CREATE UNIQUE INDEX "potential_duplicates_client1Id_client2Id_key"
      ON "potential_duplicates"("client1Id", "client2Id");
    `);
    console.log('✓ Unique constraint created');

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX "potential_duplicates_status_idx"
      ON "potential_duplicates"("status");
    `);
    await client.query(`
      CREATE INDEX "potential_duplicates_confidenceScore_idx"
      ON "potential_duplicates"("confidenceScore");
    `);
    console.log('✓ All indexes created');

    // Create foreign key constraints
    console.log('Creating foreign key constraints...');
    await client.query(`
      ALTER TABLE "potential_duplicates"
      ADD CONSTRAINT "potential_duplicates_client1Id_fkey"
      FOREIGN KEY ("client1Id") REFERENCES "clients"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "potential_duplicates"
      ADD CONSTRAINT "potential_duplicates_client2Id_fkey"
      FOREIGN KEY ("client2Id") REFERENCES "clients"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "potential_duplicates"
      ADD CONSTRAINT "potential_duplicates_reviewedBy_fkey"
      FOREIGN KEY ("reviewedBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✓ All foreign key constraints created');

    console.log('\n✅ potential_duplicates table successfully created!');

    // Verify
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'potential_duplicates'
      ORDER BY ordinal_position;
    `);

    console.log(`\nVerification: Found ${columns.rows.length} columns in potential_duplicates table`);
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createPotentialDuplicatesTable();
