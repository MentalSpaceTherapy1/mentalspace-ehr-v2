/**
 * Check signature PIN configuration for test user
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkSignaturePin() {
  try {
    console.log('🔍 Checking signature PIN status for ejoseph@chctherapy.com...\n');

    const user = await prisma.user.findUnique({
      where: { email: 'ejoseph@chctherapy.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        signaturePin: true,
      },
    });

    if (!user) {
      console.error('❌ User not found: ejoseph@chctherapy.com');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Signature PIN configured: ${user.signaturePin ? 'YES ✅' : 'NO ❌'}\n`);

    if (user.signaturePin) {
      console.log('🎉 SUCCESS! Signature PIN is configured.');
      console.log('   The test user can now sign clinical notes.\n');
    } else {
      console.log('⚠️  WARNING: Signature PIN is NOT configured.');
      console.log('   The user will not be able to sign clinical notes.\n');
    }

  } catch (error) {
    console.error('❌ Error checking signature PIN:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignaturePin();
