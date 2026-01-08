const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testClientQuery() {
  try {
    // Test client ID from the report
    const clientId = 'ac47de69-8a5a-4116-8101-056ebf834a45';

    console.log('Testing client query for ID:', clientId);

    // First, simple query to verify client exists
    const simpleClient = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true }
    });

    console.log('Simple query result:', simpleClient);

    if (!simpleClient) {
      console.log('Client not found!');
      return;
    }

    // Now try the full query with includes
    console.log('\nTrying full query with includes...');

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        primaryTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            phoneNumber: true,
          },
        },
        emergencyContacts: true,
        insuranceInfo: {
          orderBy: { rank: 'asc' },
        },
      },
    });

    console.log('Full query successful!');
    console.log('Client:', client?.firstName, client?.lastName);
    console.log('Primary therapist:', client?.primaryTherapist?.firstName, client?.primaryTherapist?.lastName);
    console.log('Emergency contacts count:', client?.emergencyContacts?.length);
    console.log('Insurance info count:', client?.insuranceInfo?.length);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientQuery();
