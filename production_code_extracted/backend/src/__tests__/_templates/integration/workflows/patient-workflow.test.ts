/**
 * Integration Tests - Patient Workflow
 *
 * Tests complete patient lifecycle end-to-end:
 * 1. Register new patient
 * 2. Search for patient
 * 3. View patient details
 * 4. Update patient information
 * 5. Add emergency contact
 * 6. Add insurance
 * 7. Book appointment
 * 8. Create clinical note
 * 9. Verify all related records
 */

import request from 'supertest';
import { Express } from 'express';
import app from '../../../app'; // Your Express app
import { getTestDb, cleanDatabase, createTestUser, disconnectTestDb } from '../../helpers/testDatabase';
import { ApiTestHelper } from '../../helpers/apiHelpers';

describe('Patient Workflow - Integration Tests', () => {
  let apiHelper: ApiTestHelper;
  let authToken: string;
  let testUser: any;
  let createdPatientId: string;
  const db = getTestDb();

  beforeAll(async () => {
    await cleanDatabase();
    apiHelper = new ApiTestHelper(app);

    // Create test clinician user
    testUser = await createTestUser({
      email: 'clinician@test.com',
      role: 'CLINICIAN',
    });

    authToken = apiHelper.generateAuthToken(testUser.id, testUser.email, testUser.role);
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectTestDb();
  });

  describe('Complete Patient Lifecycle', () => {
    it('STEP 1: should register a new patient', async () => {
      const newPatient = {
        firstName: 'Integration',
        lastName: 'Test',
        dateOfBirth: '1988-03-15',
        email: 'integration.test@patient.com',
        phone: '555-0199',
        address: '789 Integration St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        gender: 'FEMALE',
      };

      const response = await apiHelper.post('/api/v1/clients', authToken, newPatient);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.firstName).toBe('Integration');
      expect(response.body.data.lastName).toBe('Test');

      createdPatientId = response.body.data.id;

      // Verify in database
      const dbPatient = await db.client.findUnique({
        where: { id: createdPatientId },
      });

      expect(dbPatient).not.toBeNull();
      expect(dbPatient?.email).toBe('integration.test@patient.com');
    });

    it('STEP 2: should find patient in search results', async () => {
      const response = await apiHelper.get(
        `/api/v1/clients?search=${encodeURIComponent('Integration Test')}`,
        authToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      const foundPatient = response.body.data.find((p: any) => p.id === createdPatientId);
      expect(foundPatient).toBeDefined();
    });

    it('STEP 3: should retrieve full patient details', async () => {
      const response = await apiHelper.get(`/api/v1/clients/${createdPatientId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(createdPatientId);
      expect(response.body.data.firstName).toBe('Integration');
      expect(response.body.data.email).toBe('integration.test@patient.com');
    });

    it('STEP 4: should update patient information', async () => {
      const updates = {
        phone: '555-0200',
        address: '999 Updated St',
        preferredLanguage: 'Spanish',
      };

      const response = await apiHelper.put(`/api/v1/clients/${createdPatientId}`, authToken, updates);

      expect(response.status).toBe(200);
      expect(response.body.data.phone).toBe('555-0200');
      expect(response.body.data.address).toBe('999 Updated St');

      // Verify changes persisted
      const dbPatient = await db.client.findUnique({
        where: { id: createdPatientId },
      });

      expect(dbPatient?.phone).toBe('555-0200');
    });

    it('STEP 5: should add emergency contact', async () => {
      const emergencyContact = {
        clientId: createdPatientId,
        name: 'Jane Emergency',
        relationship: 'Sister',
        phone: '555-9999',
        email: 'jane@emergency.com',
        isPrimary: true,
      };

      const response = await apiHelper.post('/api/v1/emergency-contacts', authToken, emergencyContact);

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Jane Emergency');

      // Verify relationship in database
      const dbContact = await db.emergencyContact.findFirst({
        where: { clientId: createdPatientId },
      });

      expect(dbContact).not.toBeNull();
      expect(dbContact?.relationship).toBe('Sister');
    });

    it('STEP 6: should add insurance information', async () => {
      const insurance = {
        clientId: createdPatientId,
        insuranceName: 'Test Insurance Co',
        policyNumber: 'POL123456',
        groupNumber: 'GRP789',
        isPrimary: true,
        effectiveDate: new Date().toISOString(),
      };

      const response = await apiHelper.post('/api/v1/insurance', authToken, insurance);

      expect(response.status).toBe(201);

      // Verify insurance linked to patient
      const dbInsurance = await db.insurance.findFirst({
        where: { clientId: createdPatientId },
      });

      expect(dbInsurance?.policyNumber).toBe('POL123456');
    });

    it('STEP 7: should book appointment for patient', async () => {
      const appointment = {
        clientId: createdPatientId,
        clinicianId: testUser.id,
        appointmentDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration: 60,
        appointmentType: 'INITIAL_CONSULTATION',
        status: 'SCHEDULED',
      };

      const response = await apiHelper.post('/api/v1/appointments', authToken, appointment);

      expect(response.status).toBe(201);
      expect(response.body.data.clientId).toBe(createdPatientId);

      // Verify appointment in database
      const dbAppointment = await db.appointment.findFirst({
        where: { clientId: createdPatientId },
      });

      expect(dbAppointment).not.toBeNull();
      expect(dbAppointment?.status).toBe('SCHEDULED');
    });

    it('STEP 8: should create clinical note for patient', async () => {
      // First get the appointment
      const appointments = await db.appointment.findMany({
        where: { clientId: createdPatientId },
      });

      expect(appointments.length).toBeGreaterThan(0);

      const clinicalNote = {
        clientId: createdPatientId,
        clinicianId: testUser.id,
        appointmentId: appointments[0].id,
        noteType: 'Progress Note',
        sessionDate: new Date().toISOString(),
        chiefComplaint: 'Follow-up session',
        presentingProblem: 'Anxiety management',
        interventions: 'CBT techniques discussed',
        response: 'Patient engaged well',
        plan: 'Continue weekly sessions',
      };

      const response = await apiHelper.post('/api/v1/clinical-notes', authToken, clinicalNote);

      expect(response.status).toBe(201);

      // Verify note in database
      const dbNote = await db.clinicalNote.findFirst({
        where: { clientId: createdPatientId },
      });

      expect(dbNote).not.toBeNull();
      expect(dbNote?.noteType).toBe('Progress Note');
    });

    it('STEP 9: should verify all related records exist', async () => {
      // Verify patient with all relationships
      const fullPatient = await db.client.findUnique({
        where: { id: createdPatientId },
        include: {
          emergencyContacts: true,
          insurance: true,
          appointments: true,
          clinicalNotes: true,
        },
      });

      expect(fullPatient).not.toBeNull();
      expect(fullPatient?.emergencyContacts.length).toBeGreaterThan(0);
      expect(fullPatient?.insurance.length).toBeGreaterThan(0);
      expect(fullPatient?.appointments.length).toBeGreaterThan(0);
      expect(fullPatient?.clinicalNotes.length).toBeGreaterThan(0);
    });

    it('STEP 10: should maintain data integrity across all tables', async () => {
      // Check foreign key relationships
      const note = await db.clinicalNote.findFirst({
        where: { clientId: createdPatientId },
        include: {
          client: true,
          clinician: true,
          appointment: true,
        },
      });

      expect(note?.client.id).toBe(createdPatientId);
      expect(note?.clinician.id).toBe(testUser.id);
      expect(note?.appointment.clientId).toBe(createdPatientId);
    });
  });

  describe('Data Validation Across Workflow', () => {
    it('should prevent creating appointment without patient', async () => {
      const appointment = {
        clientId: 'nonexistent-id',
        clinicianId: testUser.id,
        appointmentDate: new Date().toISOString(),
        duration: 60,
      };

      const response = await apiHelper.post('/api/v1/appointments', authToken, appointment);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should prevent creating note without appointment', async () => {
      const note = {
        clientId: createdPatientId,
        clinicianId: testUser.id,
        appointmentId: 'nonexistent-appointment',
        noteType: 'Progress Note',
      };

      const response = await apiHelper.post('/api/v1/clinical-notes', authToken, note);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback entire transaction on error', async () => {
      // Attempt to create patient with invalid data partway through
      // The entire operation should fail, not leave partial data

      const countBefore = await db.client.count();

      const invalidPatient = {
        firstName: 'Test',
        lastName: 'Rollback',
        // Missing required fields
      };

      const response = await apiHelper.post('/api/v1/clients', authToken, invalidPatient);

      expect(response.status).toBeGreaterThanOrEqual(400);

      const countAfter = await db.client.count();
      expect(countAfter).toBe(countBefore); // No partial records created
    });
  });

  describe('Performance', () => {
    it('should complete full patient registration workflow in < 3 seconds', async () => {
      const startTime = Date.now();

      const newPatient = {
        firstName: 'Speed',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        email: 'speed@test.com',
        phone: '555-0300',
      };

      await apiHelper.post('/api/v1/clients', authToken, newPatient);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });
});
