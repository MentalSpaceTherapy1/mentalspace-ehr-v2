const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function unlockAccount() {
  try {
    const result = await prisma.user.update({
      where: { email: 'ejoseph@chctherapy.com' },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastFailedLogin: null
      }
    });
    
    console.log('Account unlocked:', result.email);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

unlockAccount();
