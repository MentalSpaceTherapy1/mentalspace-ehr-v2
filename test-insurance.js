const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testInsurance() {
  try {
    console.log('Testing insurance creation from createInsurance controller...\n');

    // First, find a valid client
    const client = await prisma.client.findFirst({
      select: { id: true }
    });

    if (!client) {
      console.log('❌ No client found in database');
      return;
    }

    console.log('Found client:', client.id);
    console.log('\nAttempting to create insurance record...\n');

    // Replicate exact data structure from controller
    const testData = {
      clientId: client.id,
      rank: 'Primary',
      insuranceCompany: 'Test Insurance Co.',
      insuranceCompanyId: 'TEST123',
      planName: 'Test Health Plan',
      planType: 'HMO',
      memberId: 'MEM123456',
      groupNumber: 'GRP789',
      effectiveDate: new Date('2024-01-01T00:00:00Z'),
      terminationDate: null,
      subscriberFirstName: 'John',
      subscriberLastName: 'Doe',
      subscriberDOB: new Date('1980-01-01T00:00:00Z'),
      subscriberSSN: '123-45-6789',
      relationshipToSubscriber: 'Self',
      copay: 25.00,
      deductible: 1000.00,
      outOfPocketMax: 5000.00,
      lastVerificationDate: new Date('2024-01-15T00:00:00Z'),
      lastVerifiedBy: 'Test User',
      verificationNotes: 'Test verification',
    };

    const insurance = await prisma.insuranceInformation.create({
      data: testData,
    });

    console.log('✅ Insurance created successfully!\n');
    console.log('Insurance ID:', insurance.id);

    // Clean up - delete the test record
    await prisma.insuranceInformation.delete({
      where: { id: insurance.id },
    });
    console.log('\n✅ Test insurance record cleaned up');

  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testInsurance();
