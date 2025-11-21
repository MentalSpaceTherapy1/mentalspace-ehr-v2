/**
 * Verify AdvancedMD Appointment Columns
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyColumns() {
  console.log('🔍 Verifying AdvancedMD appointment columns...\n');

  try {
    // Check all 6 columns
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
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

    console.log('AdvancedMD appointment columns:');
    result.forEach(col => {
      console.log(`  ✓ ${col.column_name.padEnd(25)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });

    // Check unique index
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'appointments'
      AND indexname = 'appointments_advancedMDVisitId_key';
    `;

    console.log('\nUnique index:');
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`  ✓ ${idx.indexname}`);
      });
    } else {
      console.log('  ⚠️  Unique index not found');
    }

    console.log(`\n✅ Found ${result.length}/6 columns`);
    if (result.length === 6) {
      console.log('✅ All AdvancedMD columns verified!');
    } else {
      console.log('⚠️  Some columns may be missing');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyColumns();
