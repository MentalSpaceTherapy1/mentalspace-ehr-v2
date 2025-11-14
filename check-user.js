const { PrismaClient } = require('@mentalspace/database');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'ejoseph@chctherapy.com' },
      select: {
        email: true,
        isActive: true,
        failedLoginAttempts: true,
        accountLockedUntil: true,
        mustChangePassword: true,
        passwordChangedAt: true
      }
    });
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
checkUser();
