const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function unlockAccount() {
  try {
    const result = await prisma.user.update({
      where: { email: 'ejoseph@chctherapy.com' },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null
      }
    });
    
    console.log('✅ Account unlocked successfully:', {
      email: result.email,
      failedLoginAttempts: result.failedLoginAttempts,
      accountLockedUntil: result.accountLockedUntil
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

unlockAccount();
