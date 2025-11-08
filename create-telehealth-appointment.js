const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createTelehealthAppointment() {
  try {
    console.log('Creating telehealth appointment for testing...\n');

    // Get Kevin Johnson (client with consent)
    const client = await prisma.client.findFirst({
      where: {
        firstName: 'Kevin',
        lastName: 'Johnson'
      }
    });

    if (!client) {
      console.error('Kevin Johnson not found');
      return;
    }

    // Get Dr. Sarah Johnson (clinician)
    const clinician = await prisma.user.findFirst({
      where: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        roles: { has: 'CLINICIAN' }
      }
    });

    if (!clinician) {
      console.error('Dr. Sarah Johnson not found');
      return;
    }

    console.log('Client:', client.firstName, client.lastName);
    console.log('Clinician:', clinician.firstName, clinician.lastName);

    // Create appointment for RIGHT NOW (for immediate testing)
    const now = new Date();
    const appointmentId = uuidv4();

    const appointment = await prisma.appointment.create({
      data: {
        id: appointmentId,
        clientId: client.id,
        clinicianId: clinician.id,
        appointmentDate: now,
        startTime: now.toTimeString().slice(0, 5), // Current time HH:MM
        endTime: new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5), // +1 hour
        duration: 60,
        timezone: 'America/New_York',
        appointmentType: 'Telehealth',
        serviceLocation: 'Telehealth',
        status: 'SCHEDULED',
        statusUpdatedBy: clinician.id,
        createdBy: clinician.id,
        lastModifiedBy: clinician.id,
        cptCode: '90837',
        appointmentNotes: 'Test telehealth appointment for immediate testing'
      }
    });

    console.log('\n✅ Appointment created!');
    console.log('Appointment ID:', appointment.id);
    console.log('Date:', appointment.appointmentDate);
    console.log('Time:', appointment.startTime, '-', appointment.endTime);

    // Create telehealth session using Twilio pattern (reusing Chime fields)
    // Mock Twilio room data for testing
    const roomName = `telehealth-${appointment.id}-test`;
    const mockTwilioRoom = {
      roomSid: `MOCK-${uuidv4()}`,  // Mock SID for testing
      roomName: roomName,
      status: 'mock',
      dateCreated: new Date(),
      maxParticipants: 10,
    };

    const session = await prisma.telehealthSession.create({
      data: {
        appointmentId: appointment.id,
        // Using Chime fields to store Twilio data (matching the service pattern)
        chimeMeetingId: mockTwilioRoom.roomSid, // Twilio Room SID
        chimeExternalMeetingId: mockTwilioRoom.roomName, // Twilio Room Name
        chimeMeetingRegion: 'twilio', // Indicator that this is Twilio
        clinicianJoinUrl: `http://localhost:5175/telehealth/session/${appointment.id}?role=clinician`,
        clientJoinUrl: `http://localhost:5175/telehealth/session/${appointment.id}?role=client`,
        meetingDataJson: mockTwilioRoom, // Store Twilio room data
        status: 'SCHEDULED',
        statusUpdatedDate: new Date(),
        // Required audit fields
        createdBy: clinician.id,
        lastModifiedBy: clinician.id
      }
    });

    console.log('\n✅ Telehealth session created!');
    console.log('Session ID:', session.id);

    // Check consent status
    const consent = await prisma.telehealthConsent.findFirst({
      where: {
        clientId: client.id,
        consentGiven: true,
        isActive: true,
        expirationDate: { gt: new Date() }
      }
    });

    if (consent) {
      console.log('\n✅ Consent is valid');
      console.log('Consent ID:', consent.id);
      console.log('Expires:', consent.expirationDate);
    } else {
      console.log('\n⚠️ No valid consent found - will need to sign during session');
    }

    console.log('\n📋 TELEHEALTH SESSION URL:');
    console.log(`http://localhost:5175/telehealth/session/${appointment.id}`);
    console.log('\nUse this URL to test the telehealth session.');

    return appointment.id;

  } catch (error) {
    console.error('Error creating appointment:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTelehealthAppointment();