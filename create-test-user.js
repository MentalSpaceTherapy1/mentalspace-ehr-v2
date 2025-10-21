const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check existing users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
      }
    });

    console.log('\n=== EXISTING USERS ===');
    if (users.length === 0) {
      console.log('No users found in database.');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      users.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName}) - Roles: ${user.roles.join(', ')}`);
      });
    }

    // Create a test user with a simple password
    const testEmail = 'test@mentalspace.com';
    const testPassword = 'Test123!';

    const existingTest = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingTest) {
      // Update existing test user password
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await prisma.user.update({
        where: { email: testEmail },
        data: { password: hashedPassword }
      });
      console.log(`\n✓ Updated password for existing test user: ${testEmail}`);
      console.log(`  Password: ${testPassword}`);
    } else {
      // Create new test user
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      const newUser = await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          roles: ['ADMINISTRATOR'],
        }
      });
      console.log(`\n✓ Created new test user: ${testEmail}`);
      console.log(`  Password: ${testPassword}`);
      console.log(`  Roles: ${newUser.roles.join(', ')}`);
    }

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('\nYou can use these credentials to log in via ngrok!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
