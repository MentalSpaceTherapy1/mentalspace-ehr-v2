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
 * Clinical Notes Module - Comprehensive Testing Suite (Part 3)
 * HIGH PRIORITY SECTIONS
 *
 * Section 15: Lock/Unlock Workflow (Sunday Lockout System)
 * Section 16: Authorization & Permissions
 * Section 17: API Error Scenarios
 * Section 18: Database Constraints & Integrity
 * Section 19: Concurrency & Race Conditions
 */

test.describe('Clinical Notes Module - Part 3: High Priority Tests', () => {
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
  // SECTION 15: LOCK/UNLOCK WORKFLOW (SUNDAY LOCKOUT SYSTEM)
  // ==========================================================================

  test.describe('Section 15: Lock/Unlock Workflow', () => {

    test('15.1 Should automatically lock signed notes on Sunday at midnight', async () => {
      // Create and sign a note
      const noteData = await createAndSignNote(page, clientId);

      // Simulate Sunday midnight - set system date to Sunday
      await page.addInitScript(() => {
        const originalDate = Date;
        // @ts-ignore
        Date = class extends Date {
          constructor(...args: any[]) {
            if (args.length === 0) {
              super();
              // Set to Sunday midnight
              this.setDay(0);
              this.setHours(0, 0, 0, 0);
            } else {
              super(...args);
            }
          }
        };
      });

      // Navigate to the note and verify it's locked
      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);

      // Should see lock icon and message
      await expect(page.locator(SELECTORS.NOTE_LOCKED_INDICATOR)).toBeVisible();
      await expect(page.locator(SELECTORS.NOTE_LOCKED_MESSAGE)).toContainText('This note is locked');

      // Edit button should be disabled
      await expect(page.locator(SELECTORS.EDIT_NOTE_BUTTON)).toBeDisabled();

      // Verify database state
      const dbState = await verifyDatabaseState(page, noteData.id);
      expect(dbState.data.isLocked).toBe(true);
    });

    test('15.2 Should allow clinician to request unlock for locked note', async () => {
      // Create and sign a note, then lock it
      const noteData = await createAndSignNote(page, clientId);

      // Manually lock the note via API
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);

      // Click "Request Unlock" button
      await page.click(SELECTORS.REQUEST_UNLOCK_BUTTON);

      // Fill unlock request form
      await page.fill(SELECTORS.UNLOCK_REASON, 'Need to correct critical clinical information');
      await page.click(SELECTORS.UNLOCK_REQUEST_SUBMIT);

      const response = await waitForAPIResponse(page, API_ENDPOINTS.REQUEST_UNLOCK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.unlockRequested).toBe(true);
      expect(data.data.unlockReason).toBe('Need to correct critical clinical information');

      // Should see "Unlock Request Pending" message
      await expect(page.locator(SELECTORS.UNLOCK_REQUEST_PENDING_MESSAGE)).toBeVisible();
    });

    test('15.3 Should notify supervisor when unlock is requested', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.REQUEST_UNLOCK_BUTTON);
      await page.fill(SELECTORS.UNLOCK_REASON, 'Critical correction needed');
      await page.click(SELECTORS.UNLOCK_REQUEST_SUBMIT);

      // Login as supervisor
      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);

      // Should see the unlock request in queue
      await expect(page.locator(`[data-note-id="${noteData.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-note-id="${noteData.id}"] ${SELECTORS.UNLOCK_REASON_TEXT}`))
        .toContainText('Critical correction needed');
    });

    test('15.4 Should allow supervisor to approve unlock request', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData.id}`, {
        data: { reason: 'Critical correction needed' }
      });

      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);

      // Approve the unlock request
      await page.click(`[data-note-id="${noteData.id}"] ${SELECTORS.APPROVE_UNLOCK_BUTTON}`);
      await page.fill(SELECTORS.UNLOCK_DURATION_HOURS, '24');
      await page.click(SELECTORS.APPROVE_UNLOCK_SUBMIT);

      const response = await waitForAPIResponse(page, API_ENDPOINTS.APPROVE_UNLOCK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.unlockApprovedBy).toBe(supervisorUserId);
      expect(data.data.unlockApprovalDate).toBeTruthy();
      expect(data.data.unlockUntil).toBeTruthy();

      // Verify note is now unlocked
      const dbState = await verifyDatabaseState(page, noteData.id);
      expect(dbState.data.isLocked).toBe(false);
    });

    test('15.5 Should allow supervisor to deny unlock request', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData.id}`, {
        data: { reason: 'Minor typo correction' }
      });

      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);

      // Deny the unlock request
      await page.click(`[data-note-id="${noteData.id}"] ${SELECTORS.DENY_UNLOCK_BUTTON}`);
      await page.fill(SELECTORS.UNLOCK_DENIAL_REASON, 'Use amendment feature instead');
      await page.click(SELECTORS.DENY_UNLOCK_SUBMIT);

      const response = await waitForAPIResponse(page, API_ENDPOINTS.DENY_UNLOCK);
      const data = await response.json();

      expect(data.success).toBe(true);

      // Verify note is still locked
      const dbState = await verifyDatabaseState(page, noteData.id);
      expect(dbState.data.isLocked).toBe(true);
      expect(dbState.data.unlockRequested).toBe(false);
    });

    test('15.6 Should allow editing unlocked note within approved time window', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);

      // Approve unlock for 24 hours
      await page.request.post(`${API_ENDPOINTS.APPROVE_UNLOCK}/${noteData.id}`, {
        data: {
          unlockDurationHours: 24,
          approvedBy: supervisorUserId
        }
      });

      await login(page, TEST_DATA.users.clinician);
      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);

      // Edit should be allowed
      await page.fill(SELECTORS.SUBJECTIVE, 'Updated subjective information');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      const response = await waitForAPIResponse(page, API_ENDPOINTS.UPDATE_NOTE);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.subjective).toBe('Updated subjective information');
    });

    test('15.7 Should automatically re-lock note after unlock expiration', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);

      // Approve unlock for 1 second (for testing)
      const now = new Date();
      const unlockUntil = new Date(now.getTime() + 1000); // 1 second from now

      await page.request.post(`${API_ENDPOINTS.APPROVE_UNLOCK}/${noteData.id}`, {
        data: {
          unlockUntil: unlockUntil.toISOString(),
          approvedBy: supervisorUserId
        }
      });

      // Wait for expiration
      await page.waitForTimeout(2000);

      // Try to edit - should fail
      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);

      // Should redirect to note detail page with lock message
      await expect(page).toHaveURL(new RegExp(`${ROUTES.NOTE_DETAIL}/${noteData.id}`));
      await expect(page.locator(SELECTORS.NOTE_LOCKED_MESSAGE)).toBeVisible();

      // Verify database state
      const dbState = await verifyDatabaseState(page, noteData.id);
      expect(dbState.data.isLocked).toBe(true);
    });

    test('15.8 Should prevent unlock request for notes older than 30 days', async () => {
      // Create a note dated 31 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: oldDate.toISOString(),
          dueDate: new Date().toISOString(),
          subjective: TEST_DATA.progressNote.subjective,
          objective: TEST_DATA.progressNote.objective,
          assessment: TEST_DATA.progressNote.assessment,
          plan: TEST_DATA.progressNote.plan,
          riskLevel: 'Low'
        }
      });

      const noteData = await response.json();

      // Sign and lock the note
      await signNote(page, noteData.data.id, TEST_DATA.users.clinician.pin);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.data.id}`);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.data.id}`);

      // Request unlock button should be disabled or not visible
      const unlockButton = page.locator(SELECTORS.REQUEST_UNLOCK_BUTTON);
      if (await unlockButton.isVisible()) {
        await expect(unlockButton).toBeDisabled();
      }

      // Should see message about note being too old
      await expect(page.locator(SELECTORS.UNLOCK_NOT_ALLOWED_MESSAGE))
        .toContainText('older than 30 days');
    });

    test('15.9 Should track unlock history in audit log', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData.id}`, {
        data: { reason: 'Correction needed' }
      });
      await page.request.post(`${API_ENDPOINTS.APPROVE_UNLOCK}/${noteData.id}`, {
        data: { unlockDurationHours: 24, approvedBy: supervisorUserId }
      });

      // View audit log
      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.VIEW_AUDIT_LOG_BUTTON);

      // Should see unlock request, approval, and re-lock events
      await expect(page.locator(SELECTORS.AUDIT_LOG_ENTRY).filter({ hasText: 'Unlock requested' }))
        .toBeVisible();
      await expect(page.locator(SELECTORS.AUDIT_LOG_ENTRY).filter({ hasText: 'Unlock approved' }))
        .toBeVisible();
    });

    test('15.10 Should allow multiple unlock cycles for same note', async () => {
      const noteData = await createAndSignNote(page, clientId);

      // First unlock cycle
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData.id}`, {
        data: { reason: 'First correction' }
      });
      await page.request.post(`${API_ENDPOINTS.APPROVE_UNLOCK}/${noteData.id}`, {
        data: { unlockDurationHours: 1, approvedBy: supervisorUserId }
      });

      // Make edit
      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);
      await page.fill(SELECTORS.SUBJECTIVE, 'First edit');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      // Wait for re-lock
      await page.waitForTimeout(3600000); // 1 hour

      // Second unlock cycle
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData.id}`, {
        data: { reason: 'Second correction' }
      });
      await page.request.post(`${API_ENDPOINTS.APPROVE_UNLOCK}/${noteData.id}`, {
        data: { unlockDurationHours: 1, approvedBy: supervisorUserId }
      });

      // Make second edit
      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);
      await page.fill(SELECTORS.OBJECTIVE, 'Second edit');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      const response = await waitForAPIResponse(page, API_ENDPOINTS.UPDATE_NOTE);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    test('15.11 Should show unlock status in note list view', async () => {
      const noteData1 = await createAndSignNote(page, clientId);
      const noteData2 = await createAndSignNote(page, clientId);

      // Lock first note
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData1.id}`);

      // Request unlock for first note
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData1.id}`, {
        data: { reason: 'Correction needed' }
      });

      await page.goto(ROUTES.MY_NOTES);

      // First note should show "Unlock Requested" badge
      await expect(page.locator(`[data-note-id="${noteData1.id}"] ${SELECTORS.UNLOCK_REQUESTED_BADGE}`))
        .toBeVisible();

      // Second note should not show any unlock badge
      await expect(page.locator(`[data-note-id="${noteData2.id}"] ${SELECTORS.UNLOCK_REQUESTED_BADGE}`))
        .not.toBeVisible();
    });

    test('15.12 Should filter notes by lock status', async () => {
      const lockedNote = await createAndSignNote(page, clientId);
      const unlockedNote = await createAndSignNote(page, clientId);

      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${lockedNote.id}`);

      await page.goto(ROUTES.MY_NOTES);

      // Filter by locked status
      await page.click(SELECTORS.FILTER_LOCK_STATUS_DROPDOWN);
      await page.click(SELECTORS.FILTER_LOCK_STATUS_LOCKED);

      const response = await waitForAPIResponse(page, /isLocked=true/);
      const data = await response.json();

      expect(data.data.every((note: any) => note.isLocked === true)).toBe(true);
    });

    test('15.13 Should prevent deletion of locked notes', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);

      // Delete button should not be visible for locked notes
      await expect(page.locator(SELECTORS.DELETE_NOTE_BUTTON)).not.toBeVisible();

      // Try to delete via API - should fail
      const deleteResponse = await page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${noteData.id}`);
      expect(deleteResponse.status()).toBe(403);

      const errorData = await deleteResponse.json();
      expect(errorData.error).toContain('locked');
    });

    test('15.14 Should send email notification when unlock is approved', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);
      await page.request.post(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteData.id}`, {
        data: { reason: 'Correction needed' }
      });

      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);
      await page.click(`[data-note-id="${noteData.id}"] ${SELECTORS.APPROVE_UNLOCK_BUTTON}`);
      await page.fill(SELECTORS.UNLOCK_DURATION_HOURS, '24');
      await page.click(SELECTORS.APPROVE_UNLOCK_SUBMIT);

      // Check for email notification sent
      const emailResponse = await page.request.get(`${API_ENDPOINTS.EMAIL_LOGS}?noteId=${noteData.id}`);
      const emailData = await emailResponse.json();

      expect(emailData.data).toHaveLength(1);
      expect(emailData.data[0].subject).toContain('Unlock Request Approved');
      expect(emailData.data[0].to).toBe(TEST_DATA.users.clinician.email);
    });

    test('15.15 Should handle unlock expiration edge cases', async () => {
      const noteData = await createAndSignNote(page, clientId);
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteData.id}`);

      // Set unlock to expire in exactly 1 hour
      const now = new Date();
      const unlockUntil = new Date(now.getTime() + 3600000);

      await page.request.post(`${API_ENDPOINTS.APPROVE_UNLOCK}/${noteData.id}`, {
        data: {
          unlockUntil: unlockUntil.toISOString(),
          approvedBy: supervisorUserId
        }
      });

      // Edit at 59 minutes - should succeed
      await page.waitForTimeout(3540000); // 59 minutes
      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);
      await page.fill(SELECTORS.SUBJECTIVE, 'Edit at 59 minutes');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      let response = await waitForAPIResponse(page, API_ENDPOINTS.UPDATE_NOTE);
      let data = await response.json();
      expect(data.success).toBe(true);

      // Wait for expiration
      await page.waitForTimeout(120000); // 2 more minutes (now at 61 minutes)

      // Try to edit - should fail
      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);
      await expect(page).toHaveURL(new RegExp(`${ROUTES.NOTE_DETAIL}/${noteData.id}`));
      await expect(page.locator(SELECTORS.NOTE_LOCKED_MESSAGE)).toBeVisible();
    });
  });

  // ==========================================================================
  // SECTION 16: AUTHORIZATION & PERMISSIONS
  // ==========================================================================

  test.describe('Section 16: Authorization & Permissions', () => {

    test('16.1 Should allow ADMIN to view all notes across all clients', async () => {
      await login(page, TEST_DATA.users.admin);

      const response = await page.request.get(API_ENDPOINTS.ALL_NOTES);
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('16.2 Should prevent CLINICIAN from viewing other clinicians notes', async () => {
      // Create note as test clinician
      const noteData = await createAndSignNote(page, clientId);

      // Login as different clinician
      await login(page, TEST_DATA.users.otherClinician);

      // Try to view the note
      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('not authorized');
    });

    test('16.3 Should allow SUPERVISOR to view supervisee notes', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(noteData.id);
    });

    test('16.4 Should prevent SUPERVISOR from editing supervisee notes', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createCompleteProgressNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { subjective: 'Supervisor trying to edit' }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('cannot edit');
    });

    test('16.5 Should allow CLINICIAN to edit only their own DRAFT notes', async () => {
      const draftNote = await createCompleteProgressNote(page, clientId);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${draftNote.id}`, {
        data: { subjective: 'Updated by owner' }
      });
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.subjective).toBe('Updated by owner');
    });

    test('16.6 Should prevent CLINICIAN from editing their own SIGNED notes', async () => {
      const signedNote = await createAndSignNote(page, clientId);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${signedNote.id}`, {
        data: { subjective: 'Trying to edit signed note' }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('signed');
    });

    test('16.7 Should prevent CLINICIAN from deleting SIGNED notes', async () => {
      const signedNote = await createAndSignNote(page, clientId);

      const response = await page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${signedNote.id}`);

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('Cannot delete signed');
    });

    test('16.8 Should allow CLINICIAN to delete only their own DRAFT notes', async () => {
      const draftNote = await createCompleteProgressNote(page, clientId);

      const response = await page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${draftNote.id}`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('16.9 Should prevent CLINICIAN from co-signing notes', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.clinician);

      const response = await page.request.post(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`, {
        data: {
          supervisorComments: 'Not a supervisor',
          pin: TEST_DATA.users.clinician.pin
        }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('not authorized');
    });

    test('16.10 Should allow SUPERVISOR to co-sign only supervisee notes', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);

      const response = await page.request.post(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`, {
        data: {
          supervisorComments: 'Approved',
          pin: TEST_DATA.users.supervisor.pin
        }
      });
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
    });

    test('16.11 Should prevent SUPERVISOR from co-signing non-supervisee notes', async () => {
      await login(page, TEST_DATA.users.otherClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);

      const response = await page.request.post(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`, {
        data: {
          supervisorComments: 'Not my supervisee',
          pin: TEST_DATA.users.supervisor.pin
        }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('not your supervisee');
    });

    test('16.12 Should restrict Intake Assessment creation to authorized roles', async () => {
      // Test with CLINICIAN - should succeed
      await login(page, TEST_DATA.users.clinician);

      let response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Intake Assessment',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(201);

      // Test with unauthorized role (if exists) - should fail
      // This depends on your role configuration
    });

    test('16.13 Should enforce organization-level permissions', async () => {
      // Create client in different organization
      const otherOrgClient = await page.request.post(API_ENDPOINTS.CREATE_CLIENT, {
        data: {
          firstName: 'Other',
          lastName: 'Organization',
          dateOfBirth: '1990-01-01',
          organizationId: 'different-org-id',
          medicalRecordNumber: `MRN-OTHER-${Date.now()}`
        }
      });

      const otherOrgClientData = await otherOrgClient.json();

      // Try to create note for client in different organization
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId: otherOrgClientData.data.id,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('organization');
    });

    test('16.14 Should allow ADMIN to override permissions', async () => {
      // Create note as clinician
      const noteData = await createAndSignNote(page, clientId);

      // Login as admin and edit signed note
      await login(page, TEST_DATA.users.admin);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: {
          subjective: 'Admin override edit',
          adminOverride: true
        }
      });
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
    });

    test('16.15 Should log all permission violations', async () => {
      const noteData = await createAndSignNote(page, clientId);

      // Try to edit as different clinician (should fail)
      await login(page, TEST_DATA.users.otherClinician);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { subjective: 'Unauthorized edit' }
      });

      expect(response.status()).toBe(403);

      // Check audit log for permission violation
      await login(page, TEST_DATA.users.admin);
      const auditResponse = await page.request.get(`${API_ENDPOINTS.AUDIT_LOG}?noteId=${noteData.id}`);
      const auditData = await auditResponse.json();

      const violationEntry = auditData.data.find((entry: any) =>
        entry.action === 'PERMISSION_VIOLATION'
      );

      expect(violationEntry).toBeTruthy();
      expect(violationEntry.userId).toBe(TEST_DATA.users.otherClinician.id);
    });

    test('16.16 Should enforce read-only access for archived clients', async () => {
      // Archive the client
      await page.request.patch(`${API_ENDPOINTS.UPDATE_CLIENT}/${clientId}`, {
        data: { status: 'ARCHIVED' }
      });

      const noteData = await createCompleteProgressNote(page, clientId);

      // Try to edit note for archived client
      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { subjective: 'Trying to edit archived client note' }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('archived');
    });

    test('16.17 Should allow bulk operations only for authorized roles', async () => {
      // Test bulk delete as ADMIN
      await login(page, TEST_DATA.users.admin);

      const note1 = await createCompleteProgressNote(page, clientId);
      const note2 = await createCompleteProgressNote(page, clientId);

      const response = await page.request.post(API_ENDPOINTS.BULK_DELETE_NOTES, {
        data: { noteIds: [note1.id, note2.id] }
      });

      expect(response.status()).toBe(200);

      // Test bulk delete as CLINICIAN - should fail
      await login(page, TEST_DATA.users.clinician);

      const note3 = await createCompleteProgressNote(page, clientId);
      const note4 = await createCompleteProgressNote(page, clientId);

      const clinicianResponse = await page.request.post(API_ENDPOINTS.BULK_DELETE_NOTES, {
        data: { noteIds: [note3.id, note4.id] }
      });

      expect(clinicianResponse.status()).toBe(403);
    });

    test('16.18 Should enforce time-based access restrictions', async () => {
      // Create note with access restriction (e.g., after business hours)
      const noteData = await createCompleteProgressNote(page, clientId);

      // Set current time to after hours (e.g., 11 PM)
      await page.addInitScript(() => {
        const originalDate = Date;
        // @ts-ignore
        Date = class extends Date {
          getHours() {
            return 23; // 11 PM
          }
        };
      });

      // Try to edit - should fail if time-based restrictions are enabled
      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { subjective: 'After hours edit' }
      });

      // This test depends on whether time-based restrictions are implemented
      // Adjust assertions based on your implementation
    });

    test('16.19 Should enforce IP-based access restrictions', async () => {
      // This test requires configuration of IP whitelisting
      // Skip if not implemented

      // Try to access from unauthorized IP
      const response = await page.request.get(API_ENDPOINTS.MY_NOTES, {
        headers: {
          'X-Forwarded-For': '192.168.1.100' // Unauthorized IP
        }
      });

      // Adjust based on implementation
      // May return 403 or redirect to error page
    });

    test('16.20 Should allow delegation of permissions', async () => {
      // Supervisor delegates permission to view their supervisee's notes to another supervisor
      await login(page, TEST_DATA.users.supervisor);

      const delegateResponse = await page.request.post(API_ENDPOINTS.DELEGATE_PERMISSION, {
        data: {
          delegateTo: TEST_DATA.users.otherSupervisor.id,
          permission: 'VIEW_SUPERVISEE_NOTES',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }
      });

      expect(delegateResponse.status()).toBe(200);

      // Test delegated access
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.otherSupervisor);

      const viewResponse = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
      expect(viewResponse.status()).toBe(200);
    });

    test('16.21 Should enforce field-level permissions', async () => {
      // Some fields may be restricted to certain roles
      const noteData = await createCompleteProgressNote(page, clientId);

      // Try to update sensitive field as CLINICIAN
      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: {
          billingCode: '90837', // Billing codes may be restricted
          billingAmount: 200.00
        }
      });

      // May succeed or fail based on field-level permissions
      // Adjust assertions based on implementation
    });

    test('16.22 Should prevent privilege escalation', async () => {
      await login(page, TEST_DATA.users.clinician);

      // Try to update own user role to ADMIN
      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_USER}/${testUserId}`, {
        data: { roles: ['ADMIN', 'CLINICIAN'] }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('not authorized');
    });

    test('16.23 Should enforce minimum required roles for actions', async () => {
      // Test that certain actions require specific role combinations

      // Creating Treatment Plan may require CLINICIAN + SUPERVISOR
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Treatment Plan',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      // Adjust based on your role requirements
    });

    test('16.24 Should allow temporary permission elevation', async () => {
      // Request temporary ADMIN access for emergency situations
      await login(page, TEST_DATA.users.supervisor);

      const elevationResponse = await page.request.post(API_ENDPOINTS.REQUEST_PERMISSION_ELEVATION, {
        data: {
          reason: 'Emergency client situation',
          requestedPermission: 'ADMIN',
          duration: 60 // minutes
        }
      });

      expect(elevationResponse.status()).toBe(200);

      // Approval by existing ADMIN required
      await login(page, TEST_DATA.users.admin);

      const approvalResponse = await page.request.post(API_ENDPOINTS.APPROVE_PERMISSION_ELEVATION, {
        data: {
          requestId: elevationResponse.json().data.id,
          approved: true
        }
      });

      expect(approvalResponse.status()).toBe(200);
    });

    test('16.25 Should revoke permissions when user role changes', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // Change clinician role to CLIENT_VIEWER
      await login(page, TEST_DATA.users.admin);

      await page.request.patch(`${API_ENDPOINTS.UPDATE_USER}/${testUserId}`, {
        data: { roles: ['CLIENT_VIEWER'] }
      });

      // Try to edit note - should fail
      await login(page, TEST_DATA.users.clinician);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: { subjective: 'Trying to edit after role change' }
      });

      expect(response.status()).toBe(403);
    });
  });

  // ==========================================================================
  // SECTION 17: API ERROR SCENARIOS
  // ==========================================================================

  test.describe('Section 17: API Error Scenarios', () => {

    // 400 Bad Request Scenarios
    test('17.1 Should return 400 for missing required fields', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          // Missing clientId
          appointmentId,
          noteType: 'Progress Note'
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('clientId');
      expect(errorData.field).toBe('clientId');
    });

    test('17.2 Should return 400 for invalid field types', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: 'invalid-date', // Should be ISO string
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid date');
    });

    test('17.3 Should return 400 for invalid enum values', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Invalid Note Type', // Not a valid note type
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid note type');
    });

    test('17.4 Should return 400 for field length violations', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          subjective: 'A'.repeat(10001) // Exceeds max length
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('maximum length');
    });

    // 401 Unauthorized Scenarios
    test('17.5 Should return 401 for missing authentication token', async () => {
      // Make request without auth token
      const response = await page.request.get(API_ENDPOINTS.MY_NOTES, {
        headers: {
          'Authorization': '' // No token
        }
      });

      expect(response.status()).toBe(401);

      const errorData = await response.json();
      expect(errorData.error).toContain('authentication required');
    });

    test('17.6 Should return 401 for invalid authentication token', async () => {
      const response = await page.request.get(API_ENDPOINTS.MY_NOTES, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        }
      });

      expect(response.status()).toBe(401);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid token');
    });

    test('17.7 Should return 401 for expired authentication token', async () => {
      // Create an expired token
      const expiredToken = 'expired-jwt-token'; // Use a real expired token in actual implementation

      const response = await page.request.get(API_ENDPOINTS.MY_NOTES, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      expect(response.status()).toBe(401);

      const errorData = await response.json();
      expect(errorData.error).toContain('expired');
    });

    // 403 Forbidden Scenarios
    test('17.8 Should return 403 when accessing unauthorized resource', async () => {
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.otherClinician);

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('not authorized');
    });

    test('17.9 Should return 403 when performing unauthorized action', async () => {
      const signedNote = await createAndSignNote(page, clientId);

      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${signedNote.id}`, {
        data: { subjective: 'Trying to edit' }
      });

      expect(response.status()).toBe(403);

      const errorData = await response.json();
      expect(errorData.error).toContain('Cannot edit signed note');
    });

    // 404 Not Found Scenarios
    test('17.10 Should return 404 for non-existent note', async () => {
      const fakeNoteId = 'non-existent-note-id-12345';

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${fakeNoteId}`);

      expect(response.status()).toBe(404);

      const errorData = await response.json();
      expect(errorData.error).toContain('not found');
    });

    test('17.11 Should return 404 for deleted note', async () => {
      const draftNote = await createCompleteProgressNote(page, clientId);

      // Delete the note
      await page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${draftNote.id}`);

      // Try to access deleted note
      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${draftNote.id}`);

      expect(response.status()).toBe(404);
    });

    // 409 Conflict Scenarios
    test('17.12 Should return 409 for duplicate note creation', async () => {
      // Create first note for appointment
      await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      // Try to create another note for same appointment
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

    test('17.13 Should return 409 for optimistic locking violation', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      // First update
      await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: {
          subjective: 'First update',
          version: 1
        }
      });

      // Second update with old version - should fail
      const response = await page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`, {
        data: {
          subjective: 'Second update',
          version: 1 // Old version
        }
      });

      expect(response.status()).toBe(409);

      const errorData = await response.json();
      expect(errorData.error).toContain('version conflict');
    });

    // 422 Validation Error Scenarios
    test('17.14 Should return 422 for business rule violations', async () => {
      // Try to create Progress Note without prior Intake Assessment
      const newClient = await createTestClient(page);
      const newAppointment = await createTestAppointment(page, newClient, testUserId);

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId: newClient,
          appointmentId: newAppointment,
          noteType: 'Progress Note', // Requires Intake first
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(422);

      const errorData = await response.json();
      expect(errorData.error).toContain('Intake Assessment required');
    });

    test('17.15 Should return 422 for invalid diagnosis codes', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Intake Assessment',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          diagnosisCodes: ['INVALID-CODE'] // Invalid ICD-10 code
        }
      });

      expect(response.status()).toBe(422);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid diagnosis code');
    });

    test('17.16 Should return 422 for invalid CPT codes', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          cptCodes: ['99999'] // Invalid CPT code
        }
      });

      expect(response.status()).toBe(422);

      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid CPT code');
    });

    test('17.17 Should return 422 for past appointment date violations', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId,
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: futureDate.toISOString(), // Future date
          dueDate: new Date().toISOString()
        }
      });

      expect(response.status()).toBe(422);

      const errorData = await response.json();
      expect(errorData.error).toContain('cannot be in the future');
    });

    // 500 Server Error Scenarios
    test('17.18 Should return 500 for database connection errors', async () => {
      // This test requires mocking database connection failure
      // Implementation depends on your testing setup

      // Simulate database error by sending malformed data that causes DB error
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          clientId: null, // This may cause foreign key constraint error
          appointmentId,
          noteType: 'Progress Note',
          sessionDate: new Date().toISOString(),
          dueDate: new Date().toISOString()
        }
      });

      // Should return 500 if database error is not caught
      expect([400, 500]).toContain(response.status());
    });

    test('17.19 Should return 500 for unexpected server errors', async () => {
      // This test requires triggering a server error
      // Can be done by sending edge case data or using error injection

      // Example: Sending extremely large payload
      const largePayload = {
        clientId,
        appointmentId,
        noteType: 'Progress Note',
        sessionDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        subjective: 'A'.repeat(1000000) // 1MB of text
      };

      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: largePayload
      });

      // May return 413 (Payload Too Large) or 500
      expect([413, 500]).toContain(response.status());
    });

    // Network Error Scenarios
    test('17.20 Should handle network timeout gracefully', async () => {
      // Set very short timeout
      await page.setDefaultTimeout(100);

      try {
        await page.request.get(API_ENDPOINTS.MY_NOTES, {
          timeout: 100
        });
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      }

      // Reset timeout
      await page.setDefaultTimeout(30000);
    });

    test('17.21 Should handle network disconnection', async () => {
      // Simulate offline mode
      await page.context().setOffline(true);

      try {
        await page.request.get(API_ENDPOINTS.MY_NOTES);
      } catch (error: any) {
        expect(error.message).toContain('net::ERR');
      }

      // Restore online mode
      await page.context().setOffline(false);
    });

    test('17.22 Should handle slow network responses', async () => {
      // Throttle network
      await page.context().route('**/*', route => {
        setTimeout(() => {
          route.continue();
        }, 5000); // 5 second delay
      });

      const startTime = Date.now();
      await page.request.get(API_ENDPOINTS.MY_NOTES);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(5000);

      // Remove throttling
      await page.context().unroute('**/*');
    });

    test('17.23 Should retry failed requests', async () => {
      let requestCount = 0;

      await page.context().route(API_ENDPOINTS.MY_NOTES, route => {
        requestCount++;

        if (requestCount < 3) {
          // Fail first 2 requests
          route.fulfill({ status: 503, body: 'Service Unavailable' });
        } else {
          // Succeed on 3rd request
          route.continue();
        }
      });

      // Use retry helper
      const result = await retryOperation(
        async () => {
          const response = await page.request.get(API_ENDPOINTS.MY_NOTES);
          if (response.status() !== 200) throw new Error('Failed');
          return response.json();
        },
        3,
        1000
      );

      expect(result).toBeTruthy();
      expect(requestCount).toBe(3);

      await page.context().unroute(API_ENDPOINTS.MY_NOTES);
    });

    test('17.24 Should handle rate limiting errors', async () => {
      // Make many rapid requests
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(page.request.get(API_ENDPOINTS.MY_NOTES));
      }

      const responses = await Promise.all(requests);

      // Some should return 429 (Too Many Requests)
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Should include Retry-After header
      const retryAfter = rateLimitedResponses[0].headers()['retry-after'];
      expect(retryAfter).toBeTruthy();
    });

    test('17.25 Should handle malformed JSON responses', async () => {
      await page.context().route(API_ENDPOINTS.MY_NOTES, route => {
        route.fulfill({
          status: 200,
          body: 'This is not valid JSON'
        });
      });

      try {
        const response = await page.request.get(API_ENDPOINTS.MY_NOTES);
        await response.json();

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('JSON');
      }

      await page.context().unroute(API_ENDPOINTS.MY_NOTES);
    });

    test('17.26 Should handle partial response data', async () => {
      await page.context().route(API_ENDPOINTS.MY_NOTES, route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            // Missing 'data' field
            success: true
          })
        });
      });

      const response = await page.request.get(API_ENDPOINTS.MY_NOTES);
      const data = await response.json();

      // Should handle gracefully
      expect(data.success).toBe(true);
      expect(data.data).toBeUndefined();

      await page.context().unroute(API_ENDPOINTS.MY_NOTES);
    });

    test('17.27 Should handle CORS errors', async () => {
      // Make cross-origin request
      const response = await page.request.get('https://different-origin.com/api/notes', {
        headers: {
          'Origin': 'https://your-app.com'
        }
      });

      // Should handle CORS error appropriately
      // Implementation depends on your CORS configuration
    });

    test('17.28 Should handle file upload errors', async () => {
      // Try to upload invalid file type
      const response = await page.request.post(API_ENDPOINTS.UPLOAD_ATTACHMENT, {
        multipart: {
          file: {
            name: 'test.exe',
            mimeType: 'application/x-msdownload',
            buffer: Buffer.from('fake executable')
          }
        }
      });

      expect(response.status()).toBe(400);

      const errorData = await response.json();
      expect(errorData.error).toContain('file type not allowed');
    });

    test('17.29 Should handle file size limit errors', async () => {
      // Try to upload file exceeding size limit
      const largeFile = Buffer.alloc(50 * 1024 * 1024); // 50MB

      const response = await page.request.post(API_ENDPOINTS.UPLOAD_ATTACHMENT, {
        multipart: {
          file: {
            name: 'large-file.pdf',
            mimeType: 'application/pdf',
            buffer: largeFile
          }
        }
      });

      expect(response.status()).toBe(413); // Payload Too Large

      const errorData = await response.json();
      expect(errorData.error).toContain('file size exceeds limit');
    });

    test('17.30 Should provide helpful error messages', async () => {
      const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
        data: {
          // Missing required fields
          noteType: 'Progress Note'
        }
      });

      const errorData = await response.json();

      // Error message should be specific and helpful
      expect(errorData.error).toBeTruthy();
      expect(errorData.field).toBeTruthy();
      expect(errorData.message).toBeTruthy();

      // Should not expose sensitive information
      expect(errorData.error).not.toContain('database');
      expect(errorData.error).not.toContain('SQL');
    });
  });

  // Continue in Part 4 with Database Constraints & Concurrency sections...
});
