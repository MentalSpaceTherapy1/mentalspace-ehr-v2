const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAppointmentCreation() {
  try {
    console.log('Testing appointment creation...');

    // First, let's get a valid client and clinician
    const clients = await prisma.client.findMany({ take: 1 });
    const clinicians = await prisma.user.findMany({
      where: { roles: { has: 'CLINICIAN' } },
      take: 1
    });

    if (!clients.length || !clinicians.length) {
      console.error('No clients or clinicians found in database');
      return;
    }

    const client = clients[0];
    const clinician = clinicians[0];

    console.log('Using client:', client.firstName, client.lastName, '(ID:', client.id, ')');
    console.log('Using clinician:', clinician.firstName, clinician.lastName, '(ID:', clinician.id, ')');

    // Try to create a simple appointment
    const appointmentData = {
      clientId: client.id,
      clinicianId: clinician.id,
      appointmentDate: new Date('2025-11-08T14:00:00Z'),
      startTime: '14:00',
      endTime: '15:00',
      duration: 60,
      timezone: 'America/New_York',
      appointmentType: 'Telehealth',
      serviceLocation: 'Telehealth',
      status: 'SCHEDULED',
      statusUpdatedBy: clinician.id,
      createdBy: clinician.id,
      lastModifiedBy: clinician.id,
      cptCode: '90837'
    };

    console.log('\nAttempting to create appointment with data:', appointmentData);

    const appointment = await prisma.appointment.create({
      data: appointmentData
    });

    console.log('\n✅ SUCCESS! Appointment created with ID:', appointment.id);

    // Now test creating a telehealth session for this appointment
    console.log('\nTesting telehealth session creation...');
    const session = await prisma.telehealthSession.create({
      data: {
        appointmentId: appointment.id,
        sessionStatus: 'WAITING',
        twilioRoomName: `room_${appointment.id}`,
        twilioRoomSid: null,
        sessionStartTime: null,
        sessionEndTime: null
      }
    });

    console.log('✅ Telehealth session created with ID:', session.id);

    // Clean up
    await prisma.telehealthSession.delete({ where: { id: session.id } });
    await prisma.appointment.delete({ where: { id: appointment.id } });
    console.log('\n✅ Test data cleaned up successfully');

  } catch (error) {
    console.error('\n❌ ERROR creating appointment:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAppointmentCreation();