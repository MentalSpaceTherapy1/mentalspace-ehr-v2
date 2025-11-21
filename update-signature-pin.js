/**
 * Update signature PIN for test user ejoseph@chctherapy.com
 * This script should be run from the backend container which has database access
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSignaturePin() {
  try {
    console.log('🔧 Updating signature PIN for test user...\n');

    const userEmail = 'ejoseph@chctherapy.com';
    // Pre-hashed PIN "1234" with bcrypt (10 rounds)
    const hashedPin = '$2a$10$swaGUXnrMOKha5myWPm1C.sPzaeLb/AuN4SAepmhIV5k48VioP4xG';

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        signaturePin: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Current PIN status: ${user.signaturePin ? 'CONFIGURED' : 'NOT CONFIGURED'}\n`);

    // Update user
    console.log('📝 Updating signature PIN...');
    await prisma.user.update({
      where: { id: user.id },
      data: { signaturePin: hashedPin },
    });

    console.log('✅ Signature PIN updated successfully!\n');

    // Verify the update
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { signaturePin: true },
    });

    console.log('🔍 Verification:');
    console.log(`   Signature PIN configured: ${updatedUser?.signaturePin ? 'YES ✅' : 'NO ❌'}\n`);

    console.log('🎉 Setup complete!');
    console.log('   Test user can now sign clinical notes with PIN: 1234\n');

  } catch (error) {
    console.error('❌ Error updating signature PIN:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSignaturePin();
