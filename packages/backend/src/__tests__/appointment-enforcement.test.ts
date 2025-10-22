import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

describe('Appointment Enforcement for Clinical Notes', () => {
  let authToken: string;
  let clinicianId: string;
  let clientId: string;
  let appointmentId: string;

  beforeAll(async () => {
    // Setup: Create test clinician
    const clinician = await prisma.user.create({
      data: {
        email: 'test-clinician@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'Clinician',
        role: 'CLINICIAN',
      },
    });
    clinicianId = clinician.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test-clinician@example.com',
        password: 'test-password',
      });
    authToken = loginResponse.body.token;

    // Create test client
    const client = await prisma.client.create({
      data: {
        firstName: 'Test',
        lastName: 'Client',
        email: 'test-client@example.com',
        dateOfBirth: new Date('1990-01-01'),
        primaryPhone: '555-0100',
      },
    });
    clientId = client.id;

    // Create test appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        clinicianId,
        appointmentDate: new Date('2025-10-22'),
        startTime: '14:00',
        endTime: '15:00',
        duration: 60,
        appointmentType: 'THERAPY',
        serviceLocation: 'IN_OFFICE',
        status: 'SCHEDULED',
        timezone: 'America/New_York',
        createdBy: clinicianId,
        statusUpdatedBy: clinicianId,
        icdCodes: [],
      },
    });
    appointmentId = appointment.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.clinicalNote.deleteMany({
      where: { clientId },
    });
    await prisma.appointment.deleteMany({
      where: { clientId },
    });
    await prisma.client.delete({
      where: { id: clientId },
    });
    await prisma.user.delete({
      where: { id: clinicianId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/appointments/get-or-create', () => {
    it('should find existing appointment', async () => {
      const response = await request(app)
        .post('/api/v1/appointments/get-or-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentDate: '2025-10-22T14:00:00Z',
          startTime: '14:00',
          endTime: '15:00',
          appointmentType: 'THERAPY',
          serviceLocation: 'IN_OFFICE',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.created).toBe(false);
      expect(response.body.message).toContain('Existing appointment found');
      expect(response.body.data.id).toBe(appointmentId);
    });

    it('should create new appointment when not found', async () => {
      const response = await request(app)
        .post('/api/v1/appointments/get-or-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentDate: '2025-10-23T10:00:00Z',
          startTime: '10:00',
          endTime: '11:00',
          appointmentType: 'THERAPY',
          serviceLocation: 'TELEHEALTH',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.created).toBe(true);
      expect(response.body.message).toContain('New appointment created');
      expect(response.body.data.appointmentDate).toBeDefined();
      expect(response.body.data.duration).toBe(60);

      // Cleanup
      await prisma.appointment.delete({
        where: { id: response.body.data.id },
      });
    });

    it('should reject invalid time range', async () => {
      const response = await request(app)
        .post('/api/v1/appointments/get-or-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentDate: '2025-10-24T14:00:00Z',
          startTime: '15:00',
          endTime: '14:00', // End before start!
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid time range');
    });

    it('should detect scheduling conflicts', async () => {
      // First, create an appointment at 2 PM
      await prisma.appointment.create({
        data: {
          clientId,
          clinicianId,
          appointmentDate: new Date('2025-10-25'),
          startTime: '14:00',
          endTime: '15:00',
          duration: 60,
          appointmentType: 'THERAPY',
          serviceLocation: 'IN_OFFICE',
          status: 'SCHEDULED',
          timezone: 'America/New_York',
          createdBy: clinicianId,
          statusUpdatedBy: clinicianId,
          icdCodes: [],
        },
      });

      // Try to create overlapping appointment
      const response = await request(app)
        .post('/api/v1/appointments/get-or-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentDate: '2025-10-25T14:30:00Z',
          startTime: '14:30',
          endTime: '15:30', // Overlaps with 2-3 PM slot
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Scheduling conflict');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/appointments/get-or-create')
        .send({
          clientId,
          appointmentDate: '2025-10-26T14:00:00Z',
          startTime: '14:00',
          endTime: '15:00',
        });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/appointments/get-or-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          // Missing appointmentDate, startTime, endTime
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/clinical-notes (Appointment Requirement)', () => {
    it('should reject note creation without appointmentId', async () => {
      const response = await request(app)
        .post('/api/v1/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subjective: 'Test',
          objective: 'Test',
          assessment: 'Test',
          plan: 'Test',
          // Missing appointmentId!
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
      // Should mention appointment in error
      const errors = JSON.stringify(response.body.errors || response.body.message);
      expect(errors.toLowerCase()).toContain('appointment');
    });

    it('should create note successfully with appointmentId', async () => {
      const response = await request(app)
        .post('/api/v1/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentId, // Required!
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subjective: 'Client discussed progress',
          objective: 'Mood appears stable',
          assessment: 'Continuing to make progress',
          plan: 'Continue weekly sessions',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.appointmentId).toBe(appointmentId);

      // Cleanup
      await prisma.clinicalNote.delete({
        where: { id: response.body.data.id },
      });
    });

    it('should prevent duplicate notes for same appointment and type', async () => {
      // Create first note
      const firstNote = await request(app)
        .post('/api/v1/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subjective: 'Test',
        });

      expect(firstNote.status).toBe(201);

      // Try to create duplicate
      const duplicateNote = await request(app)
        .post('/api/v1/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentId, // Same appointment!
          noteType: 'Progress Note', // Same type!
          sessionDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subjective: 'Different content',
        });

      expect(duplicateNote.status).toBe(409);
      expect(duplicateNote.body.errorCode).toBe('DUPLICATE_NOTE');

      // Cleanup
      await prisma.clinicalNote.delete({
        where: { id: firstNote.body.data.id },
      });
    });

    it('should allow different note types for same appointment', async () => {
      // Create Progress Note
      const progressNote = await request(app)
        .post('/api/v1/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subjective: 'Test',
        });

      expect(progressNote.status).toBe(201);

      // Create Consultation Note for same appointment
      const consultNote = await request(app)
        .post('/api/v1/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          appointmentId, // Same appointment
          noteType: 'Consultation Note', // Different type
          sessionDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subjective: 'Consultation details',
        });

      expect(consultNote.status).toBe(201);

      // Cleanup
      await prisma.clinicalNote.deleteMany({
        where: {
          id: {
            in: [progressNote.body.data.id, consultNote.body.data.id],
          },
        },
      });
    });
  });

  describe('Database Schema Enforcement', () => {
    it('should enforce NOT NULL constraint on appointmentId', async () => {
      // Try to create note directly in database without appointmentId
      await expect(
        prisma.clinicalNote.create({
          data: {
            clientId,
            clinicianId,
            noteType: 'Progress Note',
            sessionDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            // Missing appointmentId - should fail at database level
          } as any,
        })
      ).rejects.toThrow();
    });
  });
});
