const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testClientQuery() {
  try {
    console.log('Testing exact Prisma query from client.controller.ts...\n');

    const client = await prisma.client.findUnique({
      where: { id: 'fd871d2a-15ce-47df-bdda-2394b14730a4' },
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

    if (!client) {
      console.log('❌ Client not found\n');
    } else {
      console.log('✅ Query successful!\n');
      console.log('Client data:');
      console.log(JSON.stringify(client, null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientQuery();
