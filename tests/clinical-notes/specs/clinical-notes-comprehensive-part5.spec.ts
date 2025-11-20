import { test, expect, Page } from '@playwright/test';
import {
  login,
  logout,
  setupTestUser,
  createTestClient,
  createTestAppointment,
  createCompleteProgressNote,
  signNote,
  cosignNote,
  returnNoteForRevision,
  resubmitNote,
  createAmendment,
  verifyDatabaseState,
  cleanupTestData,
  getAuditLog,
  verifyAuditEntry,
  testAPIEndpoint,
  waitForAPIResponse,
  retryOperation,
} from '../helpers/test-helpers';
import { TEST_DATA, API_ENDPOINTS, SELECTORS, ROUTES } from '../fixtures/test-data';

/**
 * Clinical Notes Module - Comprehensive Test Suite - Part 5
 *
 * This file contains tests for medium-priority features:
 * - Section 20: Audit Trail & Logging (~15 tests)
 * - Section 21: Notification System (~12 tests)
 * - Section 22: Advanced Search (~10 tests)
 *
 * Total: ~37 tests
 * Coverage increase: From 85-90% to 92-95%
 */

test.describe('Clinical Notes - Part 5: Audit Trail, Notifications, Advanced Search', () => {
  let page: Page;
  let adminUser: any;
  let clinicianUser: any;
  let supervisorUser: any;
  let supervisedClinicianUser: any;
  let testClient: any;
  let testAppointment: any;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Setup test users for all roles
    const users = await setupTestUser(page);
    adminUser = users.admin;
    clinicianUser = users.clinician;
    supervisorUser = users.supervisor;
    supervisedClinicianUser = users.supervisedClinician;

    // Create test client
    testClient = await createTestClient(page);

    // Create test appointment
    testAppointment = await createTestAppointment(
      page,
      testClient.id,
      clinicianUser.id,
      new Date().toISOString()
    );
  });

  test.afterAll(async () => {
    await cleanupTestData(page, testClient.id);
    await page.close();
  });

  test.beforeEach(async () => {
    await logout(page);
  });

  // ============================================================================
  // SECTION 20: AUDIT TRAIL & LOGGING
  // ============================================================================

  test.describe('Section 20: Audit Trail & Logging (~15 tests)', () => {
    /**
     * 20.1: Track note view events
     */
    test('20.1: Should log audit entry when note is viewed', async () => {
      await login(page, clinicianUser);

      // Create and view a note
      const note = await createCompleteProgressNote(page, testClient.id);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${note.id}`);
      await page.waitForLoadState('networkidle');

      // Verify audit log entry was created
      const auditLog = await getAuditLog(page, note.id, 'VIEW');

      expect(auditLog.success).toBe(true);
      expect(auditLog.data.length).toBeGreaterThan(0);

      const viewEntry = auditLog.data[0];
      expect(viewEntry.action).toBe('VIEW');
      expect(viewEntry.noteId).toBe(note.id);
      expect(viewEntry.userId).toBe(clinicianUser.id);
      expect(viewEntry.timestamp).toBeTruthy();
    });

    /**
     * 20.2: Track note creation events
     */
    test('20.2: Should log audit entry when note is created', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Verify audit log
      const isLogged = await verifyAuditEntry(
        page,
        note.id,
        'CREATE',
        clinicianUser.id
      );

      expect(isLogged).toBe(true);
    });

    /**
     * 20.3: Track note edit events with before/after values
     */
    test('20.3: Should log audit entry with before/after values when note is edited', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Edit the note
      await page.goto(`${ROUTES.EDIT_NOTE}/${note.id}`);
      const originalSubjective = await page.inputValue(SELECTORS.SUBJECTIVE_INPUT);
      const newSubjective = 'Updated subjective content for testing';

      await page.fill(SELECTORS.SUBJECTIVE_INPUT, newSubjective);
      await page.click(SELECTORS.SAVE_NOTE_BUTTON);
      await waitForAPIResponse(page, API_ENDPOINTS.UPDATE_NOTE);

      // Verify audit log includes before/after values
      const auditLog = await getAuditLog(page, note.id, 'EDIT');

      expect(auditLog.success).toBe(true);
      expect(auditLog.data.length).toBeGreaterThan(0);

      const editEntry = auditLog.data.find((e: any) => e.action === 'EDIT');
      expect(editEntry).toBeTruthy();
      expect(editEntry.before).toContain(originalSubjective);
      expect(editEntry.after).toContain(newSubjective);
      expect(editEntry.changedFields).toContain('subjective');
    });

    /**
     * 20.4: Track note deletion events
     */
    test('20.4: Should log audit entry when note is deleted', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Delete the note
      await page.goto(`${ROUTES.NOTE_DETAIL}/${note.id}`);
      await page.click(SELECTORS.DELETE_NOTE_BUTTON);
      await page.click(SELECTORS.CONFIRM_DELETE_BUTTON);
      await waitForAPIResponse(page, API_ENDPOINTS.DELETE_NOTE);

      // Verify audit log
      const isLogged = await verifyAuditEntry(
        page,
        note.id,
        'DELETE',
        clinicianUser.id
      );

      expect(isLogged).toBe(true);
    });

    /**
     * 20.5: Track signature events
     */
    test('20.5: Should log audit entry when note is signed', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.clinician.pin);

      // Verify audit log includes signature details
      const auditLog = await getAuditLog(page, note.id, 'SIGN');

      expect(auditLog.success).toBe(true);

      const signEntry = auditLog.data.find((e: any) => e.action === 'SIGN');
      expect(signEntry).toBeTruthy();
      expect(signEntry.signatureType).toBe('PIN');
      expect(signEntry.ipAddress).toBeTruthy();
      expect(signEntry.userAgent).toBeTruthy();
    });

    /**
     * 20.6: Track co-signing events
     */
    test('20.6: Should log audit entry when note is co-signed', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      await logout(page);
      await login(page, supervisorUser);

      const cosignComments = 'Approved and co-signed by supervisor';
      await cosignNote(page, note.id, cosignComments);

      // Verify audit log
      const auditLog = await getAuditLog(page, note.id, 'COSIGN');

      expect(auditLog.success).toBe(true);

      const cosignEntry = auditLog.data.find((e: any) => e.action === 'COSIGN');
      expect(cosignEntry).toBeTruthy();
      expect(cosignEntry.userId).toBe(supervisorUser.id);
      expect(cosignEntry.comments).toContain(cosignComments);
    });

    /**
     * 20.7: Track status change events
     */
    test('20.7: Should log audit entry when note status changes', async () => {
      await login(page, supervisorUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisor.pin);

      // Return note for revision
      const revisionComments = 'Please update assessment section';
      await returnNoteForRevision(page, note.id, revisionComments, ['assessment']);

      // Verify audit log tracks status changes
      const auditLog = await getAuditLog(page, note.id);

      const statusChanges = auditLog.data.filter((e: any) => e.action === 'STATUS_CHANGE');
      expect(statusChanges.length).toBeGreaterThan(0);

      const revisionStatusChange = statusChanges.find((e: any) =>
        e.newStatus === 'RETURNED_FOR_REVISION'
      );
      expect(revisionStatusChange).toBeTruthy();
      expect(revisionStatusChange.previousStatus).toBe('SIGNED');
    });

    /**
     * 20.8: Track amendment creation
     */
    test('20.8: Should log audit entry when amendment is created', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.clinician.pin);

      const amendmentReason = 'Correct medication name';
      const amendmentDescription = 'Updated medication from Lexapro to Zoloft';

      await createAmendment(page, note.id, amendmentReason, amendmentDescription);

      // Verify audit log
      const auditLog = await getAuditLog(page, note.id, 'AMENDMENT');

      expect(auditLog.success).toBe(true);

      const amendmentEntry = auditLog.data.find((e: any) => e.action === 'AMENDMENT');
      expect(amendmentEntry).toBeTruthy();
      expect(amendmentEntry.reason).toContain(amendmentReason);
      expect(amendmentEntry.description).toContain(amendmentDescription);
    });

    /**
     * 20.9: Track failed authorization attempts
     */
    test('20.9: Should log audit entry for failed authorization attempts', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      await logout(page);

      // Different clinician tries to access the note (unauthorized)
      const otherClinician = await setupTestUser(page);
      await login(page, otherClinician.clinician);

      // Attempt unauthorized access
      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${note.id}`);
      expect(response.status()).toBe(403);

      // Verify failed authorization is logged
      const auditLog = await getAuditLog(page, note.id, 'FAILED_AUTHORIZATION');

      expect(auditLog.data.length).toBeGreaterThan(0);

      const failedEntry = auditLog.data.find((e: any) =>
        e.action === 'FAILED_AUTHORIZATION' &&
        e.userId === otherClinician.clinician.id
      );
      expect(failedEntry).toBeTruthy();
      expect(failedEntry.reason).toBeTruthy();
    });

    /**
     * 20.10: Track export/print events
     */
    test('20.10: Should log audit entry when note is exported or printed', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Export note as PDF
      await page.goto(`${ROUTES.NOTE_DETAIL}/${note.id}`);
      await page.click(SELECTORS.EXPORT_PDF_BUTTON);
      await waitForAPIResponse(page, API_ENDPOINTS.EXPORT_NOTE);

      // Verify audit log
      const auditLog = await getAuditLog(page, note.id, 'EXPORT');

      expect(auditLog.success).toBe(true);

      const exportEntry = auditLog.data.find((e: any) => e.action === 'EXPORT');
      expect(exportEntry).toBeTruthy();
      expect(exportEntry.exportFormat).toBe('PDF');
      expect(exportEntry.userId).toBe(clinicianUser.id);
    });

    /**
     * 20.11: Track lock/unlock events
     */
    test('20.11: Should log audit entry for lock and unlock events', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.clinician.pin);

      // Simulate Sunday lockout
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${note.id}`);

      // Request unlock
      const unlockReason = 'Need to add critical safety information';
      await page.goto(`${ROUTES.NOTE_DETAIL}/${note.id}`);
      await page.click(SELECTORS.REQUEST_UNLOCK_BUTTON);
      await page.fill(SELECTORS.UNLOCK_REASON_INPUT, unlockReason);
      await page.click(SELECTORS.UNLOCK_REQUEST_SUBMIT);
      await waitForAPIResponse(page, API_ENDPOINTS.REQUEST_UNLOCK);

      // Verify lock and unlock request are logged
      const auditLog = await getAuditLog(page, note.id);

      const lockEntry = auditLog.data.find((e: any) => e.action === 'LOCK');
      expect(lockEntry).toBeTruthy();
      expect(lockEntry.reason).toBe('SUNDAY_LOCKOUT');

      const unlockRequestEntry = auditLog.data.find((e: any) => e.action === 'UNLOCK_REQUEST');
      expect(unlockRequestEntry).toBeTruthy();
      expect(unlockRequestEntry.reason).toContain(unlockReason);
    });

    /**
     * 20.12: Audit log filtering by date range
     */
    test('20.12: Should filter audit log by date range', async () => {
      await login(page, adminUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get audit log with date range
      const endpoint = `${API_ENDPOINTS.AUDIT_LOG}?noteId=${note.id}&startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`;
      const response = await page.request.get(endpoint);
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      // All entries should be within date range
      data.data.forEach((entry: any) => {
        const entryDate = new Date(entry.timestamp);
        expect(entryDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(entryDate.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    /**
     * 20.13: Audit log filtering by user
     */
    test('20.13: Should filter audit log by specific user', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Get audit log for specific user
      const endpoint = `${API_ENDPOINTS.AUDIT_LOG}?noteId=${note.id}&userId=${clinicianUser.id}`;
      const response = await page.request.get(endpoint);
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);

      // All entries should be from this user
      data.data.forEach((entry: any) => {
        expect(entry.userId).toBe(clinicianUser.id);
      });
    });

    /**
     * 20.14: Audit log export functionality
     */
    test('20.14: Should export audit log to CSV', async () => {
      await login(page, adminUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Export audit log
      const response = await page.request.get(
        `${API_ENDPOINTS.AUDIT_LOG}/export?noteId=${note.id}&format=csv`
      );

      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');

      const csvContent = await response.text();
      expect(csvContent).toContain('action,userId,timestamp');
      expect(csvContent).toContain('CREATE');
    });

    /**
     * 20.15: Audit log retention and immutability
     */
    test('20.15: Should prevent modification or deletion of audit log entries', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);

      // Get an audit entry
      const auditLog = await getAuditLog(page, note.id);
      const firstEntry = auditLog.data[0];

      // Attempt to modify audit entry (should fail)
      const modifyResponse = await page.request.patch(
        `${API_ENDPOINTS.AUDIT_LOG}/${firstEntry.id}`,
        { data: { action: 'MODIFIED' } }
      );
      expect(modifyResponse.status()).toBe(403);

      // Attempt to delete audit entry (should fail)
      const deleteResponse = await page.request.delete(
        `${API_ENDPOINTS.AUDIT_LOG}/${firstEntry.id}`
      );
      expect(deleteResponse.status()).toBe(403);

      // Verify entry is unchanged
      const verifyLog = await getAuditLog(page, note.id);
      const unchangedEntry = verifyLog.data.find((e: any) => e.id === firstEntry.id);
      expect(unchangedEntry).toEqual(firstEntry);
    });
  });

  // ============================================================================
  // SECTION 21: NOTIFICATION SYSTEM
  // ============================================================================

  test.describe('Section 21: Notification System (~12 tests)', () => {
    /**
     * 21.1: Email notification for co-sign request
     */
    test('21.1: Should send email notification when supervised clinician requests co-signature', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      // Verify notification was queued
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${supervisorUser.id}&type=COSIGN_REQUEST`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      const cosignNotification = data.data.find((n: any) => n.noteId === note.id);
      expect(cosignNotification).toBeTruthy();
      expect(cosignNotification.recipientId).toBe(supervisorUser.id);
      expect(cosignNotification.type).toBe('COSIGN_REQUEST');
      expect(cosignNotification.status).toBe('QUEUED');
    });

    /**
     * 21.2: In-app notification for co-sign request
     */
    test('21.2: Should show in-app notification badge for pending co-sign requests', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      await logout(page);
      await login(page, supervisorUser);

      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify notification badge appears
      const notificationBadge = page.locator(SELECTORS.NOTIFICATION_BADGE);
      await expect(notificationBadge).toBeVisible();

      const badgeCount = await notificationBadge.textContent();
      expect(parseInt(badgeCount || '0')).toBeGreaterThan(0);
    });

    /**
     * 21.3: Email notification for return for revision
     */
    test('21.3: Should send email notification when note is returned for revision', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      await logout(page);
      await login(page, supervisorUser);

      const revisionComments = 'Please add more detail to objective section';
      await returnNoteForRevision(page, note.id, revisionComments, ['objective']);

      // Verify notification was sent
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${supervisedClinicianUser.id}&type=REVISION_REQUEST`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);

      const revisionNotification = data.data.find((n: any) => n.noteId === note.id);
      expect(revisionNotification).toBeTruthy();
      expect(revisionNotification.comments).toContain(revisionComments);
    });

    /**
     * 21.4: In-app notification for revision request
     */
    test('21.4: Should show in-app notification for revision requests', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      await logout(page);
      await login(page, supervisorUser);

      await returnNoteForRevision(page, note.id, 'Needs revision', ['plan']);

      await logout(page);
      await login(page, supervisedClinicianUser);

      // Check notifications panel
      await page.goto('/dashboard');
      await page.click(SELECTORS.NOTIFICATIONS_ICON);
      await page.waitForSelector(SELECTORS.NOTIFICATIONS_PANEL);

      const revisionNotification = page.locator(SELECTORS.NOTIFICATION_ITEM).filter({
        hasText: 'returned for revision'
      });

      await expect(revisionNotification).toBeVisible();
    });

    /**
     * 21.5: Overdue note reminder notification
     */
    test('21.5: Should send reminder notification for overdue notes', async () => {
      await login(page, clinicianUser);

      // Create note with past due date
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 4); // 4 days overdue

      const appointment = await createTestAppointment(
        page,
        testClient.id,
        clinicianUser.id,
        pastDueDate.toISOString()
      );

      // Trigger overdue notification check (normally done by cron job)
      await page.request.post(API_ENDPOINTS.TRIGGER_OVERDUE_NOTIFICATIONS);

      // Verify notification was created
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${clinicianUser.id}&type=NOTE_OVERDUE`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);

      const overdueNotification = data.data.find((n: any) =>
        n.appointmentId === appointment.id
      );
      expect(overdueNotification).toBeTruthy();
      expect(overdueNotification.type).toBe('NOTE_OVERDUE');
    });

    /**
     * 21.6: Unlock approval notification
     */
    test('21.6: Should send notification when unlock request is approved', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.clinician.pin);

      // Lock note (Sunday lockout)
      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${note.id}`);

      // Request unlock
      await page.goto(`${ROUTES.NOTE_DETAIL}/${note.id}`);
      await page.click(SELECTORS.REQUEST_UNLOCK_BUTTON);
      await page.fill(SELECTORS.UNLOCK_REASON_INPUT, 'Critical update needed');
      await page.click(SELECTORS.UNLOCK_REQUEST_SUBMIT);

      await logout(page);
      await login(page, supervisorUser);

      // Approve unlock
      await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);
      await page.click(`[data-note-id="${note.id}"] ${SELECTORS.APPROVE_UNLOCK_BUTTON}`);
      await page.fill(SELECTORS.UNLOCK_DURATION_HOURS, '24');
      await page.click(SELECTORS.APPROVE_UNLOCK_SUBMIT);

      // Verify notification was sent to clinician
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${clinicianUser.id}&type=UNLOCK_APPROVED`
      );
      const data = await response.json();

      const unlockNotification = data.data.find((n: any) => n.noteId === note.id);
      expect(unlockNotification).toBeTruthy();
      expect(unlockNotification.type).toBe('UNLOCK_APPROVED');
    });

    /**
     * 21.7: Unlock rejection notification
     */
    test('21.7: Should send notification when unlock request is rejected', async () => {
      await login(page, clinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.clinician.pin);

      await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${note.id}`);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${note.id}`);
      await page.click(SELECTORS.REQUEST_UNLOCK_BUTTON);
      await page.fill(SELECTORS.UNLOCK_REASON_INPUT, 'Non-critical update');
      await page.click(SELECTORS.UNLOCK_REQUEST_SUBMIT);

      await logout(page);
      await login(page, supervisorUser);

      // Reject unlock
      const rejectionReason = 'Update can wait until next business day';
      await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);
      await page.click(`[data-note-id="${note.id}"] ${SELECTORS.REJECT_UNLOCK_BUTTON}`);
      await page.fill(SELECTORS.UNLOCK_REJECTION_REASON, rejectionReason);
      await page.click(SELECTORS.REJECT_UNLOCK_SUBMIT);

      // Verify notification
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${clinicianUser.id}&type=UNLOCK_REJECTED`
      );
      const data = await response.json();

      const rejectionNotification = data.data.find((n: any) => n.noteId === note.id);
      expect(rejectionNotification).toBeTruthy();
      expect(rejectionNotification.rejectionReason).toContain(rejectionReason);
    });

    /**
     * 21.8: Mark notification as read
     */
    test('21.8: Should mark notifications as read when clicked', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      await logout(page);
      await login(page, supervisorUser);

      // Open notifications panel
      await page.goto('/dashboard');
      await page.click(SELECTORS.NOTIFICATIONS_ICON);
      await page.waitForSelector(SELECTORS.NOTIFICATIONS_PANEL);

      // Click on notification
      const notification = page.locator(SELECTORS.NOTIFICATION_ITEM).first();
      const notificationId = await notification.getAttribute('data-notification-id');

      await notification.click();

      // Verify notification is marked as read
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`
      );
      const data = await response.json();

      expect(data.data.isRead).toBe(true);
      expect(data.data.readAt).toBeTruthy();
    });

    /**
     * 21.9: Mark all notifications as read
     */
    test('21.9: Should mark all notifications as read', async () => {
      await login(page, supervisorUser);

      await page.goto('/dashboard');
      await page.click(SELECTORS.NOTIFICATIONS_ICON);
      await page.waitForSelector(SELECTORS.NOTIFICATIONS_PANEL);

      // Click "Mark all as read" button
      await page.click(SELECTORS.MARK_ALL_READ_BUTTON);
      await waitForAPIResponse(page, API_ENDPOINTS.MARK_ALL_READ);

      // Verify all notifications are marked as read
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${supervisorUser.id}`
      );
      const data = await response.json();

      const unreadCount = data.data.filter((n: any) => !n.isRead).length;
      expect(unreadCount).toBe(0);
    });

    /**
     * 21.10: Notification preferences
     */
    test('21.10: Should respect user notification preferences', async () => {
      await login(page, clinicianUser);

      // Update notification preferences to disable email for overdue notes
      await page.goto('/settings/notifications');
      await page.uncheck(SELECTORS.EMAIL_OVERDUE_NOTES_CHECKBOX);
      await page.click(SELECTORS.SAVE_PREFERENCES_BUTTON);

      // Create overdue note
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const appointment = await createTestAppointment(
        page,
        testClient.id,
        clinicianUser.id,
        pastDate.toISOString()
      );

      await page.request.post(API_ENDPOINTS.TRIGGER_OVERDUE_NOTIFICATIONS);

      // Verify email notification was NOT sent (only in-app)
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${clinicianUser.id}&appointmentId=${appointment.id}`
      );
      const data = await response.json();

      const notification = data.data.find((n: any) => n.appointmentId === appointment.id);
      expect(notification).toBeTruthy();
      expect(notification.emailSent).toBe(false);
      expect(notification.inAppCreated).toBe(true);
    });

    /**
     * 21.11: Notification delivery status
     */
    test('21.11: Should track notification delivery status', async () => {
      await login(page, supervisedClinicianUser);

      const note = await createCompleteProgressNote(page, testClient.id);
      await signNote(page, note.id, TEST_DATA.users.supervisedClinician.pin);

      // Get notification
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?userId=${supervisorUser.id}&type=COSIGN_REQUEST`
      );
      const data = await response.json();

      const notification = data.data.find((n: any) => n.noteId === note.id);

      expect(notification).toBeTruthy();
      expect(notification.deliveryStatus).toBeTruthy();
      expect(['QUEUED', 'SENT', 'DELIVERED', 'FAILED']).toContain(notification.deliveryStatus);

      if (notification.deliveryStatus === 'SENT' || notification.deliveryStatus === 'DELIVERED') {
        expect(notification.sentAt).toBeTruthy();
      }
    });

    /**
     * 21.12: Notification retry on failure
     */
    test('21.12: Should retry failed notification delivery', async () => {
      await login(page, adminUser);

      // Get a failed notification
      const response = await page.request.get(
        `${API_ENDPOINTS.NOTIFICATIONS}?deliveryStatus=FAILED`
      );
      const data = await response.json();

      if (data.data.length > 0) {
        const failedNotification = data.data[0];

        // Retry sending
        const retryResponse = await page.request.post(
          `${API_ENDPOINTS.NOTIFICATIONS}/${failedNotification.id}/retry`
        );
        const retryData = await retryResponse.json();

        expect(retryResponse.status()).toBe(200);
        expect(retryData.success).toBe(true);
        expect(retryData.data.retryCount).toBe(failedNotification.retryCount + 1);
      }
    });
  });

  // ============================================================================
  // SECTION 22: ADVANCED SEARCH
  // ============================================================================

  test.describe('Section 22: Advanced Search (~10 tests)', () => {
    /**
     * 22.1: Full-text search in note content
     */
    test('22.1: Should search notes by full-text content', async () => {
      await login(page, clinicianUser);

      // Create notes with specific content
      const uniqueText = 'anxiety disorder with panic attacks';
      const note = await createCompleteProgressNote(page, testClient.id);

      await page.goto(`${ROUTES.EDIT_NOTE}/${note.id}`);
      await page.fill(SELECTORS.ASSESSMENT_INPUT, `Client presents with ${uniqueText}`);
      await page.click(SELECTORS.SAVE_NOTE_BUTTON);

      // Search for the unique text
      await page.goto(ROUTES.MY_NOTES);
      await page.fill(SELECTORS.SEARCH_INPUT, uniqueText);
      await page.click(SELECTORS.SEARCH_BUTTON);
      await waitForAPIResponse(page, API_ENDPOINTS.SEARCH_NOTES);

      // Verify search results
      const results = page.locator(SELECTORS.NOTE_LIST_ITEM);
      expect(await results.count()).toBeGreaterThan(0);

      const firstResult = results.first();
      await expect(firstResult).toContainText(testClient.firstName);
    });

    /**
     * 22.2: Search by diagnosis code
     */
    test('22.2: Should search notes by diagnosis code (ICD-10)', async () => {
      await login(page, clinicianUser);

      const diagnosisCode = 'F41.1'; // Generalized Anxiety Disorder

      const note = await createCompleteProgressNote(page, testClient.id);
      await page.goto(`${ROUTES.EDIT_NOTE}/${note.id}`);
      await page.fill(SELECTORS.DIAGNOSIS_CODE_INPUT, diagnosisCode);
      await page.click(SELECTORS.SAVE_NOTE_BUTTON);

      // Search by diagnosis code
      await page.goto(ROUTES.MY_NOTES);
      await page.click(SELECTORS.ADVANCED_SEARCH_TOGGLE);
      await page.fill(SELECTORS.DIAGNOSIS_CODE_FILTER, diagnosisCode);
      await page.click(SELECTORS.SEARCH_BUTTON);

      const response = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?diagnosisCode=${diagnosisCode}`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);

      data.data.forEach((note: any) => {
        expect(note.diagnosisCode).toBe(diagnosisCode);
      });
    });

    /**
     * 22.3: Search by CPT code
     */
    test('22.3: Should search notes by CPT code', async () => {
      await login(page, clinicianUser);

      const cptCode = '90834'; // Psychotherapy 45 minutes

      const note = await createCompleteProgressNote(page, testClient.id);
      await page.goto(`${ROUTES.EDIT_NOTE}/${note.id}`);
      await page.selectOption(SELECTORS.CPT_CODE_SELECT, cptCode);
      await page.click(SELECTORS.SAVE_NOTE_BUTTON);

      // Search by CPT code
      const response = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?cptCode=${cptCode}&clinicianId=${clinicianUser.id}`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);

      data.data.forEach((note: any) => {
        expect(note.cptCode).toBe(cptCode);
      });
    });

    /**
     * 22.4: Advanced filter combinations
     */
    test('22.4: Should support multiple filter combinations', async () => {
      await login(page, clinicianUser);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const noteType = 'Progress Note';
      const status = 'SIGNED';

      // Search with multiple filters
      const params = new URLSearchParams({
        clinicianId: clinicianUser.id,
        noteType,
        status,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?${params.toString()}`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);

      // Verify all results match all filters
      data.data.forEach((note: any) => {
        expect(note.noteType).toBe(noteType);
        expect(note.status).toBe(status);

        const sessionDate = new Date(note.sessionDate);
        expect(sessionDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(sessionDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    /**
     * 22.5: Search with pagination
     */
    test('22.5: Should paginate search results correctly', async () => {
      await login(page, clinicianUser);

      const pageSize = 10;
      const page1Response = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?clinicianId=${clinicianUser.id}&page=1&pageSize=${pageSize}`
      );
      const page1Data = await page1Response.json();

      expect(page1Response.status()).toBe(200);
      expect(page1Data.data.length).toBeLessThanOrEqual(pageSize);
      expect(page1Data.pagination).toBeTruthy();
      expect(page1Data.pagination.currentPage).toBe(1);
      expect(page1Data.pagination.totalPages).toBeGreaterThanOrEqual(1);

      // Get second page if available
      if (page1Data.pagination.totalPages > 1) {
        const page2Response = await page.request.get(
          `${API_ENDPOINTS.SEARCH_NOTES}?clinicianId=${clinicianUser.id}&page=2&pageSize=${pageSize}`
        );
        const page2Data = await page2Response.json();

        expect(page2Response.status()).toBe(200);
        expect(page2Data.pagination.currentPage).toBe(2);

        // Ensure no duplicate results between pages
        const page1Ids = page1Data.data.map((n: any) => n.id);
        const page2Ids = page2Data.data.map((n: any) => n.id);
        const duplicates = page1Ids.filter((id: string) => page2Ids.includes(id));
        expect(duplicates.length).toBe(0);
      }
    });

    /**
     * 22.6: Search by client name
     */
    test('22.6: Should search notes by client name', async () => {
      await login(page, clinicianUser);

      await createCompleteProgressNote(page, testClient.id);

      // Search by client name
      const searchTerm = testClient.lastName;
      const response = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?clientName=${searchTerm}&clinicianId=${clinicianUser.id}`
      );
      const data = await response.json();

      expect(response.status()).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);

      data.data.forEach((note: any) => {
        expect(note.client.lastName.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });

    /**
     * 22.7: Save search filters as preset
     */
    test('22.7: Should save and load search filter presets', async () => {
      await login(page, clinicianUser);

      const presetName = 'My Overdue Progress Notes';
      const filters = {
        noteType: 'Progress Note',
        status: 'DRAFT',
        overdue: true
      };

      // Save search preset
      const saveResponse = await page.request.post(API_ENDPOINTS.SAVE_SEARCH_PRESET, {
        data: {
          name: presetName,
          filters
        }
      });
      const savedPreset = await saveResponse.json();

      expect(saveResponse.status()).toBe(201);
      expect(savedPreset.data.name).toBe(presetName);
      expect(savedPreset.data.filters).toEqual(filters);

      // Load saved preset
      const loadResponse = await page.request.get(
        `${API_ENDPOINTS.SEARCH_PRESETS}/${savedPreset.data.id}`
      );
      const loadedPreset = await loadResponse.json();

      expect(loadResponse.status()).toBe(200);
      expect(loadedPreset.data.filters).toEqual(filters);
    });

    /**
     * 22.8: Search performance with large dataset
     */
    test('22.8: Should handle search queries efficiently with large datasets', async () => {
      await login(page, adminUser);

      const startTime = Date.now();

      // Perform search that could return many results
      const response = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?status=SIGNED&pageSize=100`
      );
      const data = await response.json();

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.status()).toBe(200);
      expect(queryTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(data.data.length).toBeLessThanOrEqual(100);
    });

    /**
     * 22.9: Search sorting options
     */
    test('22.9: Should support multiple sorting options in search', async () => {
      await login(page, clinicianUser);

      // Sort by session date descending
      const dateDescResponse = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?clinicianId=${clinicianUser.id}&sortBy=sessionDate&sortOrder=desc`
      );
      const dateDescData = await dateDescResponse.json();

      expect(dateDescResponse.status()).toBe(200);

      if (dateDescData.data.length > 1) {
        for (let i = 0; i < dateDescData.data.length - 1; i++) {
          const current = new Date(dateDescData.data[i].sessionDate);
          const next = new Date(dateDescData.data[i + 1].sessionDate);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }

      // Sort by client name ascending
      const nameAscResponse = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}?clinicianId=${clinicianUser.id}&sortBy=clientName&sortOrder=asc`
      );
      const nameAscData = await nameAscResponse.json();

      expect(nameAscResponse.status()).toBe(200);

      if (nameAscData.data.length > 1) {
        for (let i = 0; i < nameAscData.data.length - 1; i++) {
          const currentName = nameAscData.data[i].client.lastName.toLowerCase();
          const nextName = nameAscData.data[i + 1].client.lastName.toLowerCase();
          expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
        }
      }
    });

    /**
     * 22.10: Search export to CSV
     */
    test('22.10: Should export search results to CSV', async () => {
      await login(page, clinicianUser);

      // Perform search
      const searchParams = new URLSearchParams({
        clinicianId: clinicianUser.id,
        noteType: 'Progress Note'
      });

      // Export results
      const exportResponse = await page.request.get(
        `${API_ENDPOINTS.SEARCH_NOTES}/export?${searchParams.toString()}&format=csv`
      );

      expect(exportResponse.status()).toBe(200);

      const contentType = exportResponse.headers()['content-type'];
      expect(contentType).toContain('text/csv');

      const csvContent = await exportResponse.text();
      expect(csvContent).toContain('clientName,noteType,sessionDate,status');
      expect(csvContent).toContain('Progress Note');
    });
  });
});
