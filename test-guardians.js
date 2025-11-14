const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testGuardians() {
  try {
    console.log('Testing guardian creation from createGuardian controller...\n');

    // First, find a valid client
    const client = await prisma.client.findFirst({
      select: { id: true }
    });

    if (!client) {
      console.log('❌ No client found in database');
      return;
    }

    console.log('Found client:', client.id);
    console.log('\nAttempting to create guardian record...\n');

    // Replicate exact data structure from controller validation
    const testData = {
      clientId: client.id,
      firstName: 'John',
      lastName: 'Guardian',
      relationship: 'Father',
      phoneNumber: '555-123-4567',
      email: 'john.guardian@example.com',
      address: '123 Guardian St',
      isPrimary: true,
      notes: 'Test guardian record',
    };

    const guardian = await prisma.legalGuardian.create({
      data: testData,
    });

    console.log('✅ Guardian created successfully!\n');
    console.log('Guardian ID:', guardian.id);

    // Clean up - delete the test record
    await prisma.legalGuardian.delete({
      where: { id: guardian.id },
    });
    console.log('\n✅ Test guardian record cleaned up');

  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testGuardians();
