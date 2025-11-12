const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function checkAndUpdateSuperAdmin() {
  try {
    // Find the superadmin user
    const user = await prisma.user.findUnique({
      where: {
        email: 'superadmin@mentalspace.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
      }
    });

    if (!user) {
      console.log('❌ User not found: superadmin@mentalspace.com');
      return;
    }

    console.log('Current user data:');
    console.log(JSON.stringify(user, null, 2));

    // Check if user already has SUPER_ADMIN role
    const hasSuperAdmin = user.roles.includes('SUPER_ADMIN');

    if (!hasSuperAdmin) {
      console.log('\n⚠️  User does NOT have SUPER_ADMIN role');
      console.log('Adding SUPER_ADMIN role...');

      // Add SUPER_ADMIN to roles array
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          roles: [...new Set([...user.roles, 'SUPER_ADMIN'])]
        },
        select: {
          id: true,
          email: true,
          roles: true,
        }
      });

      console.log('\n✅ Updated user with SUPER_ADMIN role:');
      console.log(JSON.stringify(updatedUser, null, 2));
    } else {
      console.log('\n✅ User already has SUPER_ADMIN role');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndUpdateSuperAdmin();
