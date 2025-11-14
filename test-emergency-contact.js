const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testEmergencyContact() {
  try {
    console.log('Testing emergency contact creation (Prisma query)...\n');

    const testData = {
      clientId: 'fd871d2a-15ce-47df-bdda-2394b14730a4',
      firstName: 'Test',
      lastName: 'Contact',
      relationship: 'Parent',
      phoneNumber: '555-0100',
      alternatePhone: '555-0101',
      email: 'test@example.com',
      address: '123 Test St',
      isPrimary: false,
      canPickup: true,
      notes: 'Test emergency contact',
    };

    // First, try to unset primary contacts (like the controller does)
    await prisma.emergencyContact.updateMany({
      where: {
        clientId: testData.clientId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    // Then try to create the contact
    const contact = await prisma.emergencyContact.create({
      data: testData,
    });

    console.log('✅ Query successful!\n');
    console.log('Created contact:');
    console.log(JSON.stringify(contact, null, 2));
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmergencyContact();
