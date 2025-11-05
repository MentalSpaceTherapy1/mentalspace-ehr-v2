// Script to create admin user in production database
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user: superadmin@mentalspace.com\n');

    // Hash the password
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: 'superadmin@mentalspace.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        roles: ['ADMINISTRATOR'],
        isActive: true,
        emailNotifications: true,
        smsNotifications: false,
        appointmentReminders: true,
        noteReminders: true,
        supervisoryAlerts: true,
        availableForScheduling: true,
        acceptsNewClients: true,
        mfaEnabled: false
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('User details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Roles: ${user.roles.join(', ')}`);
    console.log(`  Active: ${user.isActive}`);
    console.log('');
    console.log('You can now log in at http://localhost:3001');
    console.log(`  Email: ${user.email}`);
    console.log('  Password: Password123!');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    if (error.code === 'P2002') {
      console.error('User with this email already exists!');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
