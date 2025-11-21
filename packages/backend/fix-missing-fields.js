/**
 * Fix Missing AdvancedMD Appointment Fields
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingFields() {
  console.log('🔧 Fixing missing AdvancedMD appointment fields...\n');

  try {
    // Add missing advancedMDVisitId column
    console.log('1. Adding advancedMDVisitId column...');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "advancedMDVisitId" TEXT'
    );
    console.log('   ✅ Column added\n');

    // Create unique index
    console.log('2. Creating unique index on advancedMDVisitId...');
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "appointments_advancedMDVisitId_key" ON "appointments"("advancedMDVisitId")'
    );
    console.log('   ✅ Index created\n');

    // Verify all columns
    console.log('3. Verifying all columns...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND column_name IN (
        'advancedMDVisitId',
        'advancedMDProviderId',
        'advancedMDFacilityId',
        'lastSyncedToAMD',
        'amdSyncStatus',
        'amdSyncError'
      )
      ORDER BY column_name;
    `;

    console.log('   All AdvancedMD columns:');
    result.forEach(col => {
      console.log(`     ✓ ${col.column_name} (${col.data_type})`);
    });

    // Verify unique index
    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'appointments'
      AND indexname = 'appointments_advancedMDVisitId_key';
    `;

    console.log('\n   Unique index:');
    if (indexes.length > 0) {
      console.log(`     ✓ ${indexes[0].indexname}`);
    }

    console.log(`\n✅ Fix completed! All ${result.length}/6 columns verified.`);

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingFields();
