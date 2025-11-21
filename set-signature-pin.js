/**
 * Set signature PIN for test user ejoseph@chctherapy.com
 * This allows the user to sign clinical notes during testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function setSignaturePinForTestUser() {
  try {
    console.log('Setting signature PIN for test user...');

    const userEmail = 'ejoseph@chctherapy.com';
    const signaturePin = '1234'; // Test PIN: 4 digits

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        signaturePin: true,
        signaturePassword: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`\nFound user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`User ID: ${user.id}`);
    console.log(`Current signature PIN: ${user.signaturePin ? 'SET' : 'NOT SET'}`);
    console.log(`Current signature password: ${user.signaturePassword ? 'SET' : 'NOT SET'}`);

    // Validate PIN format
    if (!/^\d{4,6}$/.test(signaturePin)) {
      console.error('❌ PIN must be 4-6 digits');
      process.exit(1);
    }

    // Hash the PIN
    console.log(`\nHashing PIN...`);
    const hashedPin = await bcrypt.hash(signaturePin, 10);
    console.log(`✅ PIN hashed successfully`);

    // Update user
    console.log(`\nUpdating user with signature PIN...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { signaturePin: hashedPin },
    });

    console.log(`✅ Signature PIN set successfully!`);
    console.log(`\nTest user can now sign notes with PIN: ${signaturePin}`);

    // Verify the update
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        signaturePin: true,
        signaturePassword: true,
      },
    });

    console.log(`\n--- Verification ---`);
    console.log(`Signature PIN configured: ${updatedUser?.signaturePin ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Signature password configured: ${updatedUser?.signaturePassword ? 'YES' : 'NO'}`);

    // Test PIN verification
    console.log(`\nTesting PIN verification...`);
    const isValid = await bcrypt.compare(signaturePin, updatedUser.signaturePin);
    console.log(`PIN verification test: ${isValid ? 'PASS ✅' : 'FAIL ❌'}`);

    console.log(`\n🎉 Setup complete! User can now sign clinical notes.`);

  } catch (error) {
    console.error('❌ Error setting signature PIN:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setSignaturePinForTestUser();
