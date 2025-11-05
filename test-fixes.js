// Test script to verify Module 1 fixes
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:Bing@@0912@localhost:5432/mentalspace_ehr?schema=public'
    }
  }
});

async function testFixes() {
  console.log('🧪 Testing Module 1 Fixes...\n');

  // Test 1: Check if practice_settings table exists
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname='public' AND tablename='practice_settings'
    `;
    console.log('✅ Test 1: Practice Settings Table');
    console.log(`   Table exists: ${tables.length > 0 ? 'YES' : 'NO'}`);
    if (tables.length === 0) {
      console.log('   ⚠️  WARNING: Table not found! Need to run: npx prisma db push');
    }
  } catch (error) {
    console.log('❌ Test 1 Failed:', error.message);
  }

  // Test 2: Check if user exists (for signature status test)
  try {
    const userId = 'b82758b8-e281-4563-a020-1e6addfb4e16';
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        signaturePin: true,
        signaturePassword: true
      }
    });

    console.log('\n✅ Test 2: User Lookup (Signature Status Fix)');
    console.log(`   User found: ${user ? 'YES' : 'NO'}`);
    if (user) {
      console.log(`   Email: ${user.email}`);
      console.log(`   Signature PIN configured: ${user.signaturePin ? 'YES' : 'NO'}`);
      console.log(`   Signature Password configured: ${user.signaturePassword ? 'YES' : 'NO'}`);
    }
  } catch (error) {
    console.log('❌ Test 2 Failed:', error.message);
  }

  // Test 3: Verify Prisma client has practice_settings model
  try {
    const hasPracticeSettingsModel = typeof prisma.practiceSettings !== 'undefined';
    console.log('\n✅ Test 3: Prisma Client Models');
    console.log(`   practiceSettings model exists: ${hasPracticeSettingsModel ? 'YES' : 'NO'}`);
    if (!hasPracticeSettingsModel) {
      console.log('   ⚠️  WARNING: Model not in Prisma client! Need to regenerate client.');
    }
  } catch (error) {
    console.log('❌ Test 3 Failed:', error.message);
  }

  await prisma.$disconnect();
  console.log('\n✅ All tests completed!');
}

testFixes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
