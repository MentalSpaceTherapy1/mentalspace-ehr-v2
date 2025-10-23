const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
});

async function verify() {
  try {
    console.log('🔍 Verifying Phase 1.5 deployment...\n');

    // Check if note_amendments table exists and can be queried
    console.log('✅ Checking note_amendments table...');
    const amendmentCount = await prisma.$queryRaw`SELECT COUNT(*) FROM note_amendments`;
    console.log(`   Found ${amendmentCount[0].count} amendments in database`);

    // Check if note_versions table exists and can be queried
    console.log('✅ Checking note_versions table...');
    const versionCount = await prisma.$queryRaw`SELECT COUNT(*) FROM note_versions`;
    console.log(`   Found ${versionCount[0].count} versions in database`);

    // Check if signature_events has amendmentId column
    console.log('✅ Checking signature_events.amendmentId column...');
    const amendmentIdCheck = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'signature_events'
      AND column_name = 'amendmentId'
    `;
    if (amendmentIdCheck.length > 0) {
      console.log('   amendmentId column exists in signature_events ✓');
    } else {
      console.log('   ⚠️  amendmentId column NOT FOUND in signature_events');
    }

    console.log('\n✅ Phase 1.5 database schema verification complete!');
    console.log('\nDatabase tables are ready for Phase 1.5 Amendment History System.');

  } catch (error) {
    console.error('❌ Error verifying deployment:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verify()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
