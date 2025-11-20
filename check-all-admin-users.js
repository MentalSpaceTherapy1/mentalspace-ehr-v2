const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function checkAllAdminUsers() {
  try {
    // Check if the old user ID exists
    console.log('=== Checking for user ID from login.json ===');
    const oldUser = await prisma.user.findUnique({
      where: { id: '245fd0f5-1b4e-4efd-86ca-944cd4899fdf' }
    });

    if (oldUser) {
      console.log('FOUND:');
      console.log(JSON.stringify(oldUser, null, 2));
    } else {
      console.log('NOT FOUND in database');
    }

    // Get all admin users
    console.log('\n=== All users with ADMINISTRATOR or SUPER_ADMIN roles ===');
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { roles: { has: 'ADMINISTRATOR' } },
          { roles: { has: 'SUPER_ADMIN' } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Total admin users: ${adminUsers.length}\n`);
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Roles: ${user.roles.join(', ')}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllAdminUsers();
