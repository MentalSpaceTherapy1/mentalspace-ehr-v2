const { PrismaClient } = require('@prisma/client');

// Connect via the running container's database connection
const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
});

async function checkDeployment() {
  try {
    console.log('🔍 Checking Production Deployment Status...\n');

    // Check applied migrations
    console.log('=== MIGRATIONS APPLIED ===');
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 10
    `;

    migrations.forEach(m => {
      console.log(`✓ ${m.migration_name}`);
      console.log(`  Applied: ${m.finished_at}\n`);
    });

    // Check for Phase 1 tables
    console.log('\n=== PHASE 1 TABLES CHECK ===');

    const tables = [
      { name: 'appointment_clinical_notes', phase: '1.1' },
      { name: 'note_validation_rules', phase: '1.3' },
      { name: 'signature_settings', phase: '1.4' },
      { name: 'signature_attestations', phase: '1.4' },
      { name: 'signature_events', phase: '1.4' },
      { name: 'note_amendments', phase: '1.5' },
      { name: 'note_versions', phase: '1.5' },
    ];

    for (const table of tables) {
      try {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = ${table.name}
          ) as exists
        `;

        if (result[0].exists) {
          const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
          console.log(`✅ Phase ${table.phase}: ${table.name} (${count[0].count} records)`);
        } else {
          console.log(`❌ Phase ${table.phase}: ${table.name} MISSING!`);
        }
      } catch (err) {
        console.log(`❌ Phase ${table.phase}: ${table.name} - ERROR: ${err.message}`);
      }
    }

    // Check for specific columns
    console.log('\n=== COLUMN CHECKS ===');

    const columnChecks = [
      { table: 'signature_events', column: 'amendmentId', phase: '1.5' },
      { table: 'clinical_notes', column: 'validationStatus', phase: '1.3' },
    ];

    for (const check of columnChecks) {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = ${check.table}
          AND column_name = ${check.column}
        ) as exists
      `;

      if (result[0].exists) {
        console.log(`✅ Phase ${check.phase}: ${check.table}.${check.column}`);
      } else {
        console.log(`❌ Phase ${check.phase}: ${check.table}.${check.column} MISSING!`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Production deployment verification complete.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDeployment()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
