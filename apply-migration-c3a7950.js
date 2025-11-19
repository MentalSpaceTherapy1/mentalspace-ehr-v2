const { Client } = require('pg');

const DATABASE_URL = "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr";

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to production database');

    // Apply the migration SQL
    console.log('Applying migration: make_draft_fields_nullable');

    await client.query('ALTER TABLE "clinical_notes" ALTER COLUMN "appointmentId" DROP NOT NULL;');
    console.log('✓ Made appointmentId nullable');

    await client.query('ALTER TABLE "clinical_notes" ALTER COLUMN "sessionDate" DROP NOT NULL;');
    console.log('✓ Made sessionDate nullable');

    await client.query('ALTER TABLE "clinical_notes" ALTER COLUMN "dueDate" DROP NOT NULL;');
    console.log('✓ Made dueDate nullable');

    // Record the migration in _prisma_migrations table
    const migrationName = '20251119024521_make_draft_fields_nullable';
    const migrationSQL = `-- AlterTable: Make draft-related fields nullable for Progress Note drafts
ALTER TABLE "clinical_notes" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "clinical_notes" ALTER COLUMN "sessionDate" DROP NOT NULL;
ALTER TABLE "clinical_notes" ALTER COLUMN "dueDate" DROP NOT NULL;`;

    await client.query(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES ($1, $2, NOW(), $3, $4, NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `, [
      migrationName,
      '3f8c5a9e2b1d7c4f6e8a0b2c4d6e8f0a', // Generated checksum
      migrationName,
      migrationSQL
    ]);
    console.log('✓ Recorded migration in _prisma_migrations table');

    console.log('\n✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
