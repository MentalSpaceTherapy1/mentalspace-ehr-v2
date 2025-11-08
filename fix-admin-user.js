// Script to check and fix admin user password
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixAdminUser() {
  try {
    console.log('Checking for admin user: superadmin@mentalspace.com\n');

    // Find the user
    const existingUser = await prisma.user.findUnique({
      where: { email: 'superadmin@mentalspace.com' }
    });

    if (!existingUser) {
      console.log('❌ User not found! Creating new user...');

      // Hash the password
      const hashedPassword = await bcrypt.hash('Password123!', 10);

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
          mfaEnabled: false,
          credentials: [],
          specialties: [],
          languagesSpoken: ['English'],
          education: []
        }
      });

      console.log('✅ New admin user created successfully!');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Roles: ${user.roles.join(', ')}`);
      console.log(`  Active: ${user.isActive}`);

    } else {
      console.log('✅ User found!');
      console.log(`  ID: ${existingUser.id}`);
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Roles: ${existingUser.roles.join(', ')}`);
      console.log(`  Active: ${existingUser.isActive}`);
      console.log(`  MFA Enabled: ${existingUser.mfaEnabled}`);

      console.log('\n🔧 Updating password to: Password123!');

      // Hash the NEW password
      const hashedPassword = await bcrypt.hash('Password123!', 10);

      // Update the user with the new password
      const updatedUser = await prisma.user.update({
        where: { email: 'superadmin@mentalspace.com' },
        data: {
          password: hashedPassword,
          isActive: true,
          mfaEnabled: false
        }
      });

      console.log('✅ Password updated successfully!');
    }

    console.log('\n✅ You can now log in with:');
    console.log('  Email: superadmin@mentalspace.com');
    console.log('  Password: Password123!');
    console.log('\nTest login at: http://localhost:5176');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminUser();
