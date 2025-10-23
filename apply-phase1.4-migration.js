const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function applyMigration() {
  console.log('📚 Applying Phase 1.4 Migration: Electronic Signatures');
  console.log('Database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'packages/database/prisma/migrations/20251023000000_add_electronic_signatures_and_attestations/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n🔧 Running migration SQL...');

    // Split by ; and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log(`\nExecuting: ${statement.substring(0, 80)}...`);
        await prisma.$executeRawUnsafe(statement + ';');
      }
    }

    console.log('\n✅ Migration applied successfully!');

    // Verify the columns exist
    console.log('\n🔍 Verifying user signature columns...');
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('signaturePin', 'signaturePassword', 'signatureBiometric')
      ORDER BY column_name;
    `;
    console.log('User signature columns:', result);

    // Verify attestations were seeded
    console.log('\n🔍 Verifying signature attestations...');
    const attestations = await prisma.$queryRaw`
      SELECT id, role, noteType, jurisdiction
      FROM signature_attestations
      ORDER BY jurisdiction, role;
    `;
    console.log(`Found ${attestations.length} signature attestations:`);
    attestations.forEach(att => {
      console.log(`  - ${att.jurisdiction} / ${att.role} / ${att.noteType}`);
    });

    console.log('\n✅ All Phase 1.4 database changes verified!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
