const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkAppointments() {
  try {
    console.log('Fetching recent Intake Assessment appointments...\n');

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentType: 'Intake Assessment'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        appointmentDate: true,
        appointmentType: true,
        clientId: true,
        createdAt: true
      }
    });

    console.log('Found', appointments.length, 'appointments:\n');
    appointments.forEach((apt, idx) => {
      console.log(`${idx + 1}. Appointment ID: ${apt.id}`);
      console.log(`   Client ID: ${apt.clientId}`);
      console.log(`   Appointment Date (raw): ${apt.appointmentDate}`);
      console.log(`   Appointment Date (ISO): ${apt.appointmentDate.toISOString()}`);
      console.log(`   Created At: ${apt.createdAt}`);
      console.log('');
    });

    console.log('\nNow checking clinical notes linked to these appointments...\n');

    const notes = await prisma.clinicalNote.findMany({
      where: {
        noteType: 'Intake Assessment'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        appointmentId: true,
        sessionDate: true,
        createdAt: true,
        clientId: true
      }
    });

    console.log('Found', notes.length, 'clinical notes:\n');
    notes.forEach((note, idx) => {
      console.log(`${idx + 1}. Note ID: ${note.id}`);
      console.log(`   Client ID: ${note.clientId}`);
      console.log(`   Appointment ID: ${note.appointmentId || 'NULL'}`);
      console.log(`   Session Date (raw): ${note.sessionDate}`);
      if (note.sessionDate) {
        console.log(`   Session Date (ISO): ${note.sessionDate.toISOString()}`);
      }
      console.log(`   Created At: ${note.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointments();
