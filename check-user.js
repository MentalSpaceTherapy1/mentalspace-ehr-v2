// Script to check if user exists in production database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:Bing@@0912@localhost:5432/mentalspace_ehr?schema=public'
    }
  }
});

async function checkUser() {
  try {
    const userId = 'b82758b8-e281-4563-a020-1e6addfb4e16';
    console.log(`Checking for user ID: ${userId}\n`);

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        signaturePin: true,
        signaturePassword: true,
        createdAt: true
      }
    });

    if (user) {
      console.log('✅ User found in database!');
      console.log('');
      console.log('User details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Roles: ${user.roles.join(', ')}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Signature PIN configured: ${user.signaturePin ? 'Yes' : 'No'}`);
      console.log(`  Signature Password configured: ${user.signaturePassword ? 'Yes' : 'No'}`);
      console.log(`  Created: ${user.createdAt}`);
    } else {
      console.log('❌ User NOT found in database.');
      console.log('');
      console.log('The database exists and is accessible, but this user account does not exist.');
    }

    // Also check total user count
    const totalUsers = await prisma.user.count();
    console.log('');
    console.log(`Total users in database: ${totalUsers}`);

  } catch (error) {
    console.error('Error checking user:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
