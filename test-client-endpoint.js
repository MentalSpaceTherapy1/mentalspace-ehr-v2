const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  },
  log: ['error', 'warn']
});

async function testClientQuery() {
  try {
    console.log('Testing client query...\n');
    
    const clients = await prisma.client.findMany({
      take: 5,
      include: {
        primaryTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`✅ Query successful! Found ${clients.length} clients`);
    if (clients.length > 0) {
      console.log('\nFirst client:');
      console.log(JSON.stringify(clients[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Query failed');
    console.error('Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientQuery();
