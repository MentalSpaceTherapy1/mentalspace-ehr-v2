// Script to check if user exists in production database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function checkUser() {
  try {
    console.log('Checking for user: ejoseph@chctherapy.com\n');

    const user = await prisma.user.findUnique({
      where: {
        email: 'ejoseph@chctherapy.com'
      },
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

    if (user) {
      console.log('✅ User found in database!');
      console.log('');
      console.log('User details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Roles: ${user.roles.join(', ')}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('');
      console.log('Note: Password hash cannot be displayed for security reasons.');
    } else {
      console.log('❌ User NOT found in database.');
      console.log('');
      console.log('The database exists and is accessible, but this user account does not exist.');
      console.log('You need to create this user account in the production database.');
    }

    // Also check total user count
    const totalUsers = await prisma.user.count();
    console.log('');
    console.log(`Total users in database: ${totalUsers}`);

  } catch (error) {
    console.error('Error checking user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
