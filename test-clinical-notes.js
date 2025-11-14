const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testClinicalNotes() {
  try {
    console.log('Testing clinical notes query from getClientNotes controller...\n');

    // First, find a valid client
    const client = await prisma.client.findFirst({
      select: { id: true }
    });

    if (!client) {
      console.log('❌ No client found in database');
      return;
    }

    console.log('Found client:', client.id);
    console.log('\nAttempting to fetch clinical notes...\n');

    // Replicate exact query from getClientNotes controller
    const notes = await prisma.clinicalNote.findMany({
      where: { clientId: client.id },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        cosigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    console.log('✅ Query successful!\n');
    console.log(`Found ${notes.length} clinical notes`);
    if (notes.length > 0) {
      console.log('\nFirst note:');
      console.log(JSON.stringify(notes[0], null, 2));
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

testClinicalNotes();
