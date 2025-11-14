const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testOutcomeMeasures() {
  try {
    console.log('Testing outcome measures query from getClientOutcomeMeasures service...\n');

    // First, find a valid client
    const client = await prisma.client.findFirst({
      select: { id: true }
    });

    if (!client) {
      console.log('❌ No client found in database');
      return;
    }

    console.log('Found client:', client.id);
    console.log('\nAttempting to fetch outcome measures...\n');

    // Replicate exact query from getClientOutcomeMeasures service
    const outcomeMeasures = await prisma.outcomeMeasure.findMany({
      where: { clientId: client.id },
      take: 50,
      orderBy: { administeredDate: 'desc' },
      include: {
        administeredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        clinicalNote: {
          select: {
            id: true,
            noteType: true,
            sessionDate: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentType: true,
          },
        },
      },
    });

    console.log('✅ Query successful!\n');
    console.log(`Found ${outcomeMeasures.length} outcome measures`);
    if (outcomeMeasures.length > 0) {
      console.log('\nFirst outcome measure:');
      console.log(JSON.stringify(outcomeMeasures[0], null, 2));
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

testOutcomeMeasures();
