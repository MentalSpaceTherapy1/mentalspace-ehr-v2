const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function checkOnboardingTable() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    // Check if onboarding_checklists table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'onboarding_checklists'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;
    console.log(`onboarding_checklists table exists: ${tableExists}\n`);

    if (!tableExists) {
      console.log('=== CREATING ONBOARDING_CHECKLISTS TABLE ===\n');

      // Create the table
      await client.query(`
        CREATE TABLE "onboarding_checklists" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "items" JSONB NOT NULL DEFAULT '[]',
          "startDate" TIMESTAMP(3) NOT NULL,
          "completionDate" TIMESTAMP(3),
          "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "onboarding_checklists_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ Table created');

      // Create unique constraint on userId
      await client.query(`
        CREATE UNIQUE INDEX "onboarding_checklists_userId_key" ON "onboarding_checklists"("userId");
      `);
      console.log('✓ Unique index on userId created');

      // Create foreign key constraint
      await client.query(`
        ALTER TABLE "onboarding_checklists"
        ADD CONSTRAINT "onboarding_checklists_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('✓ Foreign key constraint created');

      console.log('\n✅ onboarding_checklists table successfully created!');
    } else {
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'onboarding_checklists'
        ORDER BY ordinal_position;
      `);

      console.log('Existing columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkOnboardingTable();
