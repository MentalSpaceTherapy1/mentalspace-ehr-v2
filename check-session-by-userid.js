const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function checkSessionByUserId() {
  try {
    // Check the active session for the SUPER_ADMIN user
    const sessions = await prisma.session.findMany({
      where: {
        userId: '39d207c4-e341-49f5-8903-f7d1dcffa510',
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        userId: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        lastActivity: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roles: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('=== Active sessions for user 39d207c4-e341-49f5-8903-f7d1dcffa510 ===');
    console.log(JSON.stringify(sessions, null, 2));

    // Check if the old user ID exists in database
    console.log('\n=== Checking for old user ID from login.json ===');
    const oldUser = await prisma.user.findUnique({
      where: { id: '245fd0f5-1b4e-4efd-86ca-944cd4899fdf' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        createdAt: true
      }
    });

    if (oldUser) {
      console.log('Old user FOUND:');
      console.log(JSON.stringify(oldUser, null, 2));
    } else {
      console.log('Old user NOT FOUND in database');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionByUserId();
