/**
 * Update signature PIN using raw SQL
 * This bypasses Prisma migrations and directly updates the production database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function updateSignaturePinSQL() {
  try {
    console.log('🔧 Updating signature PIN using SQL...\n');

    const userEmail = 'ejoseph@chctherapy.com';
    // Pre-hashed PIN "1234" with bcrypt (10 rounds)
    const hashedPin = '$2a$10$swaGUXnrMOKha5myWPm1C.sPzaeLb/AuN4SAepmhIV5k48VioP4xG';

    // Execute raw SQL update
    console.log(`Updating user: ${userEmail}`);
    const result = await prisma.$executeRaw`
      UPDATE "User"
      SET "signaturePin" = ${hashedPin}
      WHERE email = ${userEmail}
    `;

    if (result === 0) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`✅ Updated ${result} user(s)\n`);

    // Verify the update
    const user = await prisma.$queryRaw`
      SELECT id, email, "firstName", "lastName", "signaturePin" IS NOT NULL AS has_pin
      FROM "User"
      WHERE email = ${userEmail}
    `;

    if (user && user.length > 0) {
      console.log('🔍 Verification:');
      console.log(`   User: ${user[0].firstName} ${user[0].lastName} (${user[0].email})`);
      console.log(`   Signature PIN configured: ${user[0].has_pin ? 'YES ✅' : 'NO ❌'}\n`);
    }

    console.log('🎉 Setup complete!');
    console.log('   Test user can now sign clinical notes with PIN: 1234\n');

  } catch (error) {
    console.error('❌ Error updating signature PIN:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSignaturePinSQL();
