const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClinicians() {
  try {
    console.log('🔍 Checking for users with CLINICIAN role...\n');

    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true
      }
    });

    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    // Filter users with CLINICIAN role
    const clinicians = allUsers.filter(user =>
      user.roles && user.roles.includes('CLINICIAN')
    );

    console.log(`📊 Users with CLINICIAN role: ${clinicians.length}\n`);

    if (clinicians.length > 0) {
      console.log('✅ Clinicians found:');
      clinicians.forEach((clinician, index) => {
        console.log(`   ${index + 1}. ${clinician.firstName} ${clinician.lastName}`);
        console.log(`      Email: ${clinician.email}`);
        console.log(`      ID: ${clinician.id}`);
        console.log(`      Roles: ${clinician.roles.join(', ')}`);
        console.log(`      Active: ${clinician.isActive}`);
        console.log('');
      });
    } else {
      console.log('❌ NO CLINICIANS FOUND!');
      console.log('\nThis is the root cause of the dropdown issue.');
      console.log('The dropdown is empty because there are no users with the CLINICIAN role.\n');
      console.log('All users in database:');
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`      Roles: ${user.roles ? user.roles.join(', ') : 'None'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClinicians();
