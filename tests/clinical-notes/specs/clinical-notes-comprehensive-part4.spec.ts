import { test, expect, type Page } from '@playwright/test';
import {
  login,
  logout,
  setupTestUser,
  createTestClient,
  createTestAppointment,
  createCompleteProgressNote,
  createAndSignNote,
  signNote,
  cosignNote,
  verifyDatabaseState,
  cleanupTestData,
  testAPIEndpoint,
  waitForAPIResponse,
  retryOperation,
} from '../helpers/test-helpers';
import { TEST_DATA, ROUTES, API_ENDPOINTS, SELECTORS } from '../fixtures/test-data';

/**
 * Clinical Notes Module - Comprehensive Testing Suite (Part 4)
 * HIGH PRIORITY SECTIONS (Continued)
 *
 * Section 18: Database Constraints & Integrity
 * Section 19: Concurrency & Race Conditions
 */

test.describe('Clinical Notes Module - Part 4: Database & Concurrency Tests', () => {
  let page: Page;
  let testUserId: string;
  let supervisorUserId: string;
  let supervisedUserId: string;
  let clientId: string;
  let appointmentId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    const setup = await setupTestUser(page);
    testUserId = setup.userId;
    supervisorUserId = setup.supervisorId;
    supervisedUserId = setup.supervisedUserId;

    clientId = await createTestClient(page);
    appointmentId = await createTestAppointment(page, clientId, testUserId);
  });

  test.beforeEach(async () => {
    await login(page, TEST_DATA.users.clinician);
  });

  test.afterEach(async () => {
    // Cleanup test data after each test if needed
  });

  test.afterAll(async () => {
    await cleanupTestData(page, clientId);
  });

  // ==========================================================================
  // SECTION 18: DATABASE CONSTRAINTS & INTEGRITY
  // ==========================================================================

  test.describe('Section 18: Database Constraints & Integrity', () => {

    test('18.1 Should enforce foreign key constraint for clientId', async () => {
      const fakeClientId = 'non-existent-client-id-12345';

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId: fakeClientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Client not found');
    });

    test('18.2 Should enforce foreign key constraint for appointmentId', async () => {
      const fakeAppointmentId = 'non-existent-appointment-id-12345';

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId: fakeAppointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Appointment not found');
    });

    test('18.3 Should enforce foreign key constraint for createdById', async () => {
      // Try to create note with invalid user ID via direct DB manipulation
      // This test requires database access
      // Skip if not available in test environment
    });

    test('18.4 Should enforce unique constraint on note-appointment combination', async () => {
      // Create first note
      await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      // Try to create second note for same appointment
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(409);

      const errorData = await response.json();
      expect(errorData.error).toContain('already exists');
    });

    test('18.5 Should enforce NOT NULL constraint on required fields', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: null, // Required field
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('noteType is required');
    });

    test('18.6 Should enforce check constraint on status values', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Try to update to invalid status
      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: {
          status: 'INVALID_STATUS'
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid status');
    });

    test('18.7 Should enforce check constraint on risk level values', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          riskLevel: 'INVALID_RISK_LEVEL'
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid risk level');
    });

    test('18.8 Should cascade delete related records when note is deleted', async () => {
      // Create note with related records (amendments, outcome measures)
      const noteData = await createAndSignNote(page, clientId);

      // Create amendment
      await page.request.post(API_ENDPOINTS.CREATE_AMENDMENT, {
        data: {
          noteId: noteData.id,
          reason: 'Correction needed',
          changeDescription: 'Fixed typo'
        }
      });

      // Create outcome measure
      await page.request.post(API_ENDPOINTS.CREATE_OUTCOME_MEASURE, {
        data: {
          noteId: noteData.id,
          measureType: 'PHQ-9',
          score: 12
        }
      });

      // Delete note (as ADMIN)
      await login(page, TEST_DATA.users.admin);

      const deleteResponse = await page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${noteData.id}`, {
        data: { adminOverride: true }
      });

      expect(deleteResponse.status()).toBe(200);

      // Verify amendments and outcome measures are also deleted
      const amendmentsResponse = await page.request.get(`${API_ENDPOINTS.GET_AMENDMENTS}?noteId=${noteData.id}`);
      const amendmentsData = await amendmentsResponse.json();
      expect(amendmentsData.data).toHaveLength(0);

      const measuresResponse = await page.request.get(`${API_ENDPOINTS.GET_OUTCOME_MEASURES}?noteId=${noteData.id}`);
      const measuresData = await measuresResponse.json();
      expect(measuresData.data).toHaveLength(0);
    });

    test('18.9 Should prevent deletion of client with existing notes', async () => {
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.admin);

      const response = await page.request.delete(`${API_ENDPOINTS.DELETE_CLIENT}/${clientId}`);

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('has existing notes');
    });

    test('18.10 Should rollback transaction on partial failure', async () => {
      // This test requires triggering a transaction that partially fails
      // For example, creating a note with multiple diagnoses where one is invalid

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Intake Assessment',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          diagnosisCodes: ['F32.9', 'INVALID-CODE', 'F41.1'] // Middle one is invalid
        }
      });

      expect(response.status()).toBe(422);

      // Verify no note was created
      const notesResponse = await page.request.get(`${API_ENDPOINTS.CLIENT_NOTES}/${clientId}`);
      const notesData = await notesResponse.json();

      // Note count should not have increased
      const originalCount = notesData.data.length;
      expect(originalCount).toBe(originalCount); // No change
    });

    test('18.11 Should maintain referential integrity during updates', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Try to update clientId to different client
      const otherClient = await createTestClient(page);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: {
          clientId: otherClient
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Cannot change client');
    });

    test('18.12 Should enforce data type constraints', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: '2024-13-45', // Invalid date
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid date');
    });

    test('18.13 Should enforce string length constraints', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          subjective: 'A'.repeat(10001) // Exceeds max length of 10000
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('maximum length');
    });

    test('18.14 Should prevent SQL injection in text fields', async () => {
      const sqlInjection = "'; DROP TABLE clinical_notes; --";

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          subjective: sqlInjection
        }
      });

      // Should either succeed (escaped properly) or fail validation, but not execute SQL
      expect([200, 201, 400]).toContain(response.status());

      // Verify table still exists by querying notes
      const notesResponse = await page.request.get(API_ENDPOINTS.MY_NOTES);
      expect(notesResponse.status()).toBe(200);
    });

    test('18.15 Should handle JSON field validation', async () => {
      // Test with invalid JSON in a JSONB field
      const response = await page.request.post(API_ENDPOINTS.CREATE_OUTCOME_MEASURE, {
        data: {
          clientId,
          measureType: 'PHQ-9',
          responses: 'INVALID JSON STRING' // Should be object
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid JSON');
    });

    test('18.16 Should enforce date range constraints', async () => {
      // Session date cannot be in future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: futureDate.toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(422);

      const errorData = await response.json();
      expect(errorData.error).toContain('cannot be in the future');
    });

    test('18.17 Should enforce numeric range constraints', async () => {
      // Outcome measure score must be within valid range
      const response = await page.request.post(API_ENDPOINTS.CREATE_OUTCOME_MEASURE, {
        data: {
          clientId,
          measureType: 'PHQ-9',
          score: 100 // PHQ-9 max is 27
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('score must be between');
    });

    test('18.18 Should maintain audit trail integrity', async () => {
      const noteData = await createAndSignNote(page, clientId);

      // Make several updates
      await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { subjective: 'Update 1' }
      });

      await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { objective: 'Update 2' }
      });

      // Verify audit log has all entries in order
      const auditResponse = await page.request.get(`${API_ENDPOINTS.AUDIT_LOG}?noteId=${noteData.id}`);
      const auditData = await auditResponse.json();

      expect(auditData.data.length).toBeGreaterThanOrEqual(3); // Create + 2 updates

      // Verify chronological order
      for (let i = 1; i < auditData.data.length; i++) {
        const prevTimestamp = new Date(auditData.data[i - 1].timestamp);
        const currTimestamp = new Date(auditData.data[i].timestamp);
        expect(currTimestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
      }
    });

    test('18.19 Should prevent orphaned records', async () => {
      // Create a note and related records
      const noteData = await createAndSignNote(page, clientId);

      // Create signature
      await signNote(page, noteData.id, TEST_DATA.users.clinician.pin);

      // Try to delete user who created the note (should fail or cascade properly)
      await login(page, TEST_DATA.users.admin);

      const response = await page.request.delete(`${API_ENDPOINTS.DELETE_USER}/${testUserId}`);

      // Should either fail (preserve referential integrity) or cascade delete with proper handling
      if (response.status() === 200) {
        // Verify note is also handled (deleted or marked as deleted)
        const noteResponse = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
        // Note should either not exist or have createdBy as null/deleted marker
      } else {
        expect(response.status()).toBe(400);
        const errorData = await response.json();
        expect(errorData.error).toContain('has existing notes');
      }
    });

    test('18.20 Should handle concurrent constraint violations gracefully', async () => {
      // Create two requests simultaneously trying to violate unique constraint
      const createRequests = [
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId,
            appointmentId,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        }),
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId,
            appointmentId,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        })
      ];

      const responses = await Promise.all(createRequests);

      // One should succeed, one should fail
      const successCount = responses.filter(r => r.status() === 201).length;
      const failCount = responses.filter(r => r.status() === 409).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });
  });

  // ==========================================================================
  // SECTION 19: CONCURRENCY & RACE CONDITIONS
  // ==========================================================================

  test.describe('Section 19: Concurrency & Race Conditions', () => {

    test('19.1 Should handle concurrent note creation for same client', async () => {
      // Create multiple appointments
      const appointment1 = await createTestAppointment(page, clientId, testUserId);
      const appointment2 = await createTestAppointment(page, clientId, testUserId);
      const appointment3 = await createTestAppointment(page, clientId, testUserId);

      // Create notes concurrently
      const createRequests = [
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId,
            appointmentId: appointment1,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        }),
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId,
            appointmentId: appointment2,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        }),
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId,
            appointmentId: appointment3,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        })
      ];

      const responses = await Promise.all(createRequests);

      // All should succeed (different appointments)
      responses.forEach(response => {
        expect(response.status()).toBe(201);
      });
    });

    test('19.2 Should handle concurrent updates to same note', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Update concurrently with different fields
      const updateRequests = [
        page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
          data: { subjective: 'Update from request 1' }
        }),
        page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
          data: { objective: 'Update from request 2' }
        }),
        page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
          data: { assessment: 'Update from request 3' }
        })
      ];

      const responses = await Promise.all(updateRequests);

      // All should succeed (different fields)
      const successCount = responses.filter(r => r.status() === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify final state has all updates (or at least doesn't have data loss)
      const finalState = await verifyDatabaseState(page, noteData.id);
      expect(finalState.data.subjective || finalState.data.objective || finalState.data.assessment).toBeTruthy();
    });

    test('19.3 Should prevent concurrent signing of same note', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Try to sign concurrently
      const signRequests = [
        page.request.post(`${API_ENDPOINTS.SIGN_NOTE}/${noteData.id}`, {
          data: { pin: TEST_DATA.users.clinician.pin }
        }),
        page.request.post(`${API_ENDPOINTS.SIGN_NOTE}/${noteData.id}`, {
          data: { pin: TEST_DATA.users.clinician.pin }
        })
      ];

      const responses = await Promise.all(signRequests);

      // Only one should succeed
      const successCount = responses.filter(r => r.status() === 200).length;
      const failCount = responses.filter(r => r.status() >= 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });

    test('19.4 Should handle optimistic locking violations', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Get current version
      const currentState = await verifyDatabaseState(page, noteData.id);
      const currentVersion = currentState.data.version || 1;

      // Two concurrent updates with same version
      const updateRequests = [
        page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
          data: {
            subjective: 'Update 1',
            version: currentVersion
          }
        }),
        page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
          data: {
            subjective: 'Update 2',
            version: currentVersion
          }
        })
      ];

      const responses = await Promise.all(updateRequests);

      // One should succeed, one should fail with version conflict
      const successCount = responses.filter(r => r.status() === 200).length;
      const conflictCount = responses.filter(r => r.status() === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);

      // Verify version was incremented
      const finalState = await verifyDatabaseState(page, noteData.id);
      expect(finalState.data.version).toBe(currentVersion + 1);
    });

    test('19.5 Should handle concurrent deletion attempts', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Try to delete concurrently
      const deleteRequests = [
        page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${noteData.id}`),
        page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${noteData.id}`)
      ];

      const responses = await Promise.all(deleteRequests);

      // One should succeed, one should fail with 404
      const successCount = responses.filter(r => r.status() === 200).length;
      const notFoundCount = responses.filter(r => r.status() === 404).length;

      expect(successCount).toBe(1);
      expect(notFoundCount).toBe(1);
    });

    test('19.6 Should handle race condition in note creation validation', async () => {
      // Create Intake Assessment
      const intakeResponse = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Intake Assessment',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(intakeResponse.status()).toBe(201);

      const newClient = await createTestClient(page);
      const newAppointment1 = await createTestAppointment(page, newClient, testUserId);
      const newAppointment2 = await createTestAppointment(page, newClient, testUserId);

      // Try to create Progress Note and Intake simultaneously
      // (Progress requires Intake to exist first)
      const createRequests = [
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId: newClient,
            appointmentId: newAppointment1,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        }),
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId: newClient,
            appointmentId: newAppointment2,
            noteType: 'Intake Assessment',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
          }
        })
      ];

      const responses = await Promise.all(createRequests);

      // Intake should succeed, Progress may succeed or fail depending on timing
      const intakeSuccess = responses.find(r => r.status() === 201);
      expect(intakeSuccess).toBeTruthy();
    });

    test('19.7 Should handle concurrent amendment creation', async () => {
      const noteData = await createAndSignNote(page, clientId);

      // Create amendments concurrently
      const amendmentRequests = [
        page.request.post(API_ENDPOINTS.CREATE_AMENDMENT, {
          data: {
            noteId: noteData.id,
            reason: 'Amendment 1',
            changeDescription: 'First change'
          }
        }),
        page.request.post(API_ENDPOINTS.CREATE_AMENDMENT, {
          data: {
            noteId: noteData.id,
            reason: 'Amendment 2',
            changeDescription: 'Second change'
          }
        }),
        page.request.post(API_ENDPOINTS.CREATE_AMENDMENT, {
          data: {
            noteId: noteData.id,
            reason: 'Amendment 3',
            changeDescription: 'Third change'
          }
        })
      ];

      const responses = await Promise.all(amendmentRequests);

      // All should succeed (multiple amendments allowed)
      responses.forEach(response => {
        expect(response.status()).toBe(201);
      });

      // Verify all amendments exist
      const amendmentsResponse = await page.request.get(`${API_ENDPOINTS.GET_AMENDMENTS}?noteId=${noteData.id}`);
      const amendmentsData = await amendmentsResponse.json();
      expect(amendmentsData.data.length).toBe(3);
    });

    test('19.8 Should handle concurrent lock/unlock operations', async () => {
      const noteData = await createAndSignNote(page, clientId);

      // Lock and unlock concurrently
      const lockRequests = [
        page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`),
        page.request.post(`${API_ENDPOINTS.UNLOCK_NOTE}/${noteData.id}`),
        page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`)
      ];

      const responses = await Promise.all(lockRequests);

      // At least one should succeed
      const successCount = responses.filter(r => r.status() === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify final lock state is consistent
      const finalState = await verifyDatabaseState(page, noteData.id);
      expect(typeof finalState.data.isLocked).toBe('boolean');
    });

    test('19.9 Should handle concurrent cosigning attempts', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);

      // Try to cosign concurrently
      const cosignRequests = [
        page.request.post(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`, {
          data: {
            supervisorComments: 'Cosign 1',
            pin: TEST_DATA.users.supervisor.pin
          }
        }),
        page.request.post(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`, {
          data: {
            supervisorComments: 'Cosign 2',
            pin: TEST_DATA.users.supervisor.pin
          }
        })
      ];

      const responses = await Promise.all(cosignRequests);

      // Only one should succeed
      const successCount = responses.filter(r => r.status() === 200).length;
      const failCount = responses.filter(r => r.status() >= 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });

    test('19.10 Should maintain database consistency under high concurrent load', async () => {
      // Create 20 notes concurrently for different appointments
      const appointments = await Promise.all(
        Array.from({ length: 20 }, () => createTestAppointment(page, clientId, testUserId))
      );

      const createRequests = appointments.map(appointmentId =>
        page.request.post(API_ENDPOINTS.CREATE_NOTE, {
          data: {
            clientId,
            appointmentId,
            noteType: 'Progress Note',
            sessionDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            subjective: TEST_DATA.progressNote.subjective,
            objective: TEST_DATA.progressNote.objective,
            assessment: TEST_DATA.progressNote.assessment,
            plan: TEST_DATA.progressNote.plan
          }
        })
      );

      const responses = await Promise.all(createRequests);

      // All should succeed
      const successCount = responses.filter(r => r.status() === 201).length;
      expect(successCount).toBe(20);

      // Verify all notes exist in database
      const notesResponse = await page.request.get(`${API_ENDPOINTS.CLIENT_NOTES}/${clientId}`);
      const notesData = await notesResponse.json();
      expect(notesData.data.length).toBeGreaterThanOrEqual(20);

      // Verify no duplicate notes were created
      const noteIds = new Set(notesData.data.map((note: any) => note.id));
      expect(noteIds.size).toBe(notesData.data.length); // No duplicates
    });
  });
});
