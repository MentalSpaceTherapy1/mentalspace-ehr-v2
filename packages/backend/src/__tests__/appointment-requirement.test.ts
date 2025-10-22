import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

describe('Appointment Requirement - Schema Enforcement', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Schema', () => {
    it('should enforce NOT NULL constraint on appointmentId', async () => {
      // This test verifies that the database migration was applied correctly
      // Try to create a clinical note without appointmentId - should fail

      const testData = {
        clientId: '00000000-0000-0000-0000-000000000001',
        clinicianId: '00000000-0000-0000-0000-000000000002',
        noteType: 'Progress Note',
        sessionDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        // Missing appointmentId - should cause error
      };

      await expect(
        prisma.clinicalNote.create({
          data: testData as any,
        })
      ).rejects.toThrow();
    });

    it('should allow creating clinical note WITH appointmentId', async () => {
      // First check if we have any appointments to use
      const appointments = await prisma.appointment.findMany({ take: 1 });

      if (appointments.length === 0) {
        console.log('Skipping test: No appointments available in database');
        return; // Skip test if no appointments exist
      }

      const appointment = appointments[0];

      const testNote = {
        clientId: appointment.clientId,
        clinicianId: appointment.clinicianId,
        appointmentId: appointment.id, // Required field!
        noteType: 'Progress Note',
        sessionDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subjective: 'Test note for schema validation',
      };

      const createdNote = await prisma.clinicalNote.create({
        data: testNote,
      });

      expect(createdNote).toBeDefined();
      expect(createdNote.appointmentId).toBe(appointment.id);

      // Cleanup
      await prisma.clinicalNote.delete({ where: { id: createdNote.id } });
    });
  });

  describe('Audit Verification', () => {
    it('should confirm all existing notes have appointments', async () => {
      const totalNotes = await prisma.clinicalNote.count();
      const notesWithAppointments = await prisma.clinicalNote.count({
        where: { appointmentId: { not: null } },
      });

      console.log(`Total notes: ${totalNotes}, With appointments: ${notesWithAppointments}`);

      expect(totalNotes).toBe(notesWithAppointments);

      if (totalNotes > 0) {
        // If there are notes, they must ALL have appointments
        expect(notesWithAppointments).toBeGreaterThan(0);
        expect(notesWithAppointments).toBe(totalNotes);
      }
    });
  });
});
