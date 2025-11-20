const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true
      },
      orderBy: {
        email: 'asc'
      }
    });

    console.log('=== Production Users ===\n');
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Roles: ${user.roles.join(', ')}`);
      console.log('');
    });

    console.log(`Total users: ${users.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getUsers();
