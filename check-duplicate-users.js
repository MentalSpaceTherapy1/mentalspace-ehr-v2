const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function checkDuplicateUsers() {
  try {
    // Find ALL users with this email
    const users = await prisma.user.findMany({
      where: { email: 'ejoseph@chctherapy.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginDate: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('=== All users with email ejoseph@chctherapy.com ===');
    console.log(`Total count: ${users.length}\n`);
    console.log(JSON.stringify(users, null, 2));

    // Also check sessions for both user IDs if they exist
    if (users.length > 0) {
      console.log('\n=== Checking active sessions ===');
      for (const user of users) {
        const sessions = await prisma.session.count({
          where: {
            userId: user.id,
            expiresAt: { gt: new Date() }
          }
        });
        console.log(`User ${user.id}: ${sessions} active session(s)`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateUsers();
