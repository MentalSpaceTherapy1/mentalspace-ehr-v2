const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('📚 Running Phase 1.4 Migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/prisma/migrations/20251023000000_add_electronic_signatures_and_attestations/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and filter out comments/empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        console.log(`\n[${i+1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`);
        await prisma.$executeRawUnsafe(stmt + ';');
        console.log(`✅ Statement ${i+1} completed`);
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify
    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('signaturePin', 'signaturePassword', 'signatureBiometric')
    `;
    console.log(`\n✅ Verified ${columns.length}/3 signature columns in users table`);

    const attestations = await prisma.$queryRaw`SELECT COUNT(*) as count FROM signature_attestations`;
    console.log(`✅ Verified ${attestations[0].count} signature attestations`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
