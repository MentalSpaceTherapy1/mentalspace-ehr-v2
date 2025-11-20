import { test, expect, Page } from '@playwright/test';
import { login, createAndSignNote } from '../helpers/test-helpers';
import { TEST_DATA, ROUTES, API_ENDPOINTS, SELECTORS } from '../fixtures/test-data';

/**
 * COMPREHENSIVE CLINICAL NOTES MODULE TESTING - PART 2
 * Continuation of comprehensive testing suite
 */

test.describe('Clinical Notes Module - Comprehensive Testing Suite (Part 2)', () => {
  let page: Page;
  let testUserId: string;
  let clientId: string;

  // ==========================================================================
  // SECTION 10: LISTS, FILTERS, SORTING, PAGINATION
  // ==========================================================================

  test.describe('10. My Notes List - Filters, Sorting, Pagination', () => {

    test('10.1 Should display all notes in My Notes page', async () => {
      await login(page, TEST_DATA.users.clinician);
      await page.goto(ROUTES.MY_NOTES);

      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.MY_NOTES)
      );
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.stats).toBeDefined();
    });

    test('10.2 Should filter notes by status', async () => {
      await page.goto(ROUTES.MY_NOTES);

      // Click DRAFT filter
      await page.click(SELECTORS.FILTER_STATUS_DRAFT);

      const response = await page.waitForResponse(
        res => res.url().includes('status=DRAFT')
      );
      const data = await response.json();

      data.data.forEach((note: any) => {
        expect(note.status).toBe('DRAFT');
      });
    });

    test('10.3 Should filter notes by note type', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.selectOption(SELECTORS.FILTER_NOTE_TYPE, 'Progress Note');

      const response = await page.waitForResponse(
        res => res.url().includes('noteType=Progress Note')
      );
      const data = await response.json();

      data.data.forEach((note: any) => {
        expect(note.noteType).toBe('Progress Note');
      });
    });

    test('10.4 Should search notes by client name', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.fill(SELECTORS.SEARCH_INPUT, 'Smith');
      await page.waitForTimeout(500); // Debounce

      const response = await page.waitForResponse(
        res => res.url().includes('search=Smith')
      );
      const data = await response.json();

      data.data.forEach((note: any) => {
        const fullName = `${note.client.firstName} ${note.client.lastName}`.toLowerCase();
        expect(fullName).toContain('smith');
      });
    });

    test('10.5 Should search notes by content', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.fill(SELECTORS.SEARCH_INPUT, 'anxiety');

      const response = await page.waitForResponse(
        res => res.url().includes('search=anxiety')
      );
      const data = await response.json();

      // Should search in subjective, objective, assessment, plan
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('10.6 Should sort notes by date', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.selectOption(SELECTORS.SORT_BY_SELECT, 'date');

      const notes = await page.locator(SELECTORS.NOTE_LIST_ITEM).all();
      const dates = await Promise.all(
        notes.map(note => note.locator(SELECTORS.NOTE_DATE).textContent())
      );

      // Verify dates are in descending order
      for (let i = 0; i < dates.length - 1; i++) {
        const date1 = new Date(dates[i] || '');
        const date2 = new Date(dates[i + 1] || '');
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    test('10.7 Should sort notes by client name', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.selectOption(SELECTORS.SORT_BY_SELECT, 'client');

      const notes = await page.locator(SELECTORS.NOTE_LIST_ITEM).all();
      const names = await Promise.all(
        notes.map(note => note.locator(SELECTORS.NOTE_CLIENT_NAME).textContent())
      );

      // Verify names are in alphabetical order
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    test('10.8 Should sort notes by status', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.selectOption(SELECTORS.SORT_BY_SELECT, 'status');

      const notes = await page.locator(SELECTORS.NOTE_LIST_ITEM).all();
      const statuses = await Promise.all(
        notes.map(note => note.locator(SELECTORS.NOTE_STATUS_BADGE).textContent())
      );

      const sortedStatuses = [...statuses].sort();
      expect(statuses).toEqual(sortedStatuses);
    });

    test('10.9 Should combine multiple filters', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.click(SELECTORS.FILTER_STATUS_DRAFT);
      await page.selectOption(SELECTORS.FILTER_NOTE_TYPE, 'Progress Note');
      await page.fill(SELECTORS.SEARCH_INPUT, 'test');

      const response = await page.waitForResponse(
        res => res.url().includes('status=DRAFT') &&
              res.url().includes('noteType=Progress Note') &&
              res.url().includes('search=test')
      );
      const data = await response.json();

      data.data.forEach((note: any) => {
        expect(note.status).toBe('DRAFT');
        expect(note.noteType).toBe('Progress Note');
      });
    });

    test('10.10 Should clear filters', async () => {
      await page.goto(ROUTES.MY_NOTES);

      await page.click(SELECTORS.FILTER_STATUS_DRAFT);
      await page.click(SELECTORS.CLEAR_FILTERS_BUTTON);

      const url = page.url();
      expect(url).not.toContain('status=');
      expect(url).not.toContain('noteType=');
      expect(url).not.toContain('search=');
    });
  });

  // ==========================================================================
  // SECTION 11: COMPLIANCE DASHBOARD
  // ==========================================================================

  test.describe('11. Compliance Dashboard - Complete Testing', () => {

    test('11.1 Should display all compliance metrics', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.COMPLIANCE_DASHBOARD)
      );
      const data = await response.json();

      expect(data.data.notesAwaitingCosign).toBeInstanceOf(Array);
      expect(data.data.overdueNotes).toBeInstanceOf(Array);
      expect(data.data.lockedNotes).toBeInstanceOf(Array);
      expect(data.data.draftNotes).toBeInstanceOf(Array);
      expect(data.data.appointmentsWithoutNotes).toBeInstanceOf(Array);
      expect(data.data.stats).toBeDefined();
    });

    test('11.2 Should show notes awaiting cosign section', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      await expect(page.locator(SELECTORS.COMPLIANCE_AWAITING_COSIGN_SECTION)).toBeVisible();

      const count = await page.locator(SELECTORS.COMPLIANCE_AWAITING_COSIGN_COUNT).textContent();
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    });

    test('11.3 Should show overdue notes section with 3-day rule', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      await expect(page.locator(SELECTORS.COMPLIANCE_OVERDUE_SECTION)).toBeVisible();

      // All notes in this section should be > 3 days old
      const overdueNotes = await page.locator(SELECTORS.COMPLIANCE_OVERDUE_ITEM).all();

      for (const note of overdueNotes) {
        const daysText = await note.locator(SELECTORS.DAYS_SINCE).textContent();
        const days = parseInt(daysText?.match(/\d+/)?.[0] || '0');
        expect(days).toBeGreaterThan(3);
      }
    });

    test('11.4 Should show locked notes section', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      await expect(page.locator(SELECTORS.COMPLIANCE_LOCKED_SECTION)).toBeVisible();

      const lockedNotes = await page.locator(SELECTORS.COMPLIANCE_LOCKED_ITEM).all();

      for (const note of lockedNotes) {
        await expect(note.locator(SELECTORS.LOCKED_BADGE)).toBeVisible();
      }
    });

    test('11.5 Should show draft notes section', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      await expect(page.locator(SELECTORS.COMPLIANCE_DRAFTS_SECTION)).toBeVisible();

      const draftNotes = await page.locator(SELECTORS.COMPLIANCE_DRAFT_ITEM).all();

      for (const note of draftNotes) {
        const status = await note.locator(SELECTORS.NOTE_STATUS_BADGE).textContent();
        expect(status).toContain('DRAFT');
      }
    });

    test('11.6 Should show appointments without notes', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      await expect(page.locator(SELECTORS.COMPLIANCE_MISSING_NOTES_SECTION)).toBeVisible();

      const missingNotes = await page.locator(SELECTORS.COMPLIANCE_MISSING_ITEM).all();

      for (const item of missingNotes) {
        await expect(item.locator(SELECTORS.CREATE_NOTE_FROM_APPOINTMENT_BUTTON)).toBeVisible();
      }
    });

    test('11.7 Should highlight urgent items (>7 days)', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      const urgentItems = await page.locator(SELECTORS.COMPLIANCE_URGENT_ITEM).all();

      for (const item of urgentItems) {
        await expect(item).toHaveClass(/urgent|border-red|border-orange/);
        const daysText = await item.locator(SELECTORS.DAYS_SINCE).textContent();
        const days = parseInt(daysText?.match(/\d+/)?.[0] || '0');
        expect(days).toBeGreaterThan(7);
      }
    });

    test('11.8 Should filter compliance data by role (Admin/Supervisor/Clinician)', async () => {
      // Test as Admin - should see all
      await login(page, TEST_DATA.users.admin);
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);
      const adminResponse = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.COMPLIANCE_DASHBOARD)
      );
      const adminData = await adminResponse.json();

      // Test as Supervisor - should see supervisees + own
      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);
      const supervisorResponse = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.COMPLIANCE_DASHBOARD)
      );
      const supervisorData = await supervisorResponse.json();

      // Test as Clinician - should see only own
      await login(page, TEST_DATA.users.clinician);
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);
      const clinicianResponse = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.COMPLIANCE_DASHBOARD)
      );
      const clinicianData = await clinicianResponse.json();

      expect(adminData.data.stats.total).toBeGreaterThanOrEqual(supervisorData.data.stats.total);
      expect(supervisorData.data.stats.total).toBeGreaterThanOrEqual(clinicianData.data.stats.total);
    });

    test('11.9 Should create note from appointments without notes', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);

      const firstMissing = page.locator(SELECTORS.COMPLIANCE_MISSING_ITEM).first();
      await firstMissing.locator(SELECTORS.CREATE_NOTE_FROM_APPOINTMENT_BUTTON).click();

      // Should redirect to note creation
      await expect(page).toHaveURL(/\/notes\/create/);
      await expect(page.locator(SELECTORS.NOTE_TYPE_SELECTOR)).toBeVisible();
    });
  });

  // ==========================================================================
  // SECTION 12: VALIDATION ENGINE
  // ==========================================================================

  test.describe('12. Validation Engine - Field Validation Rules', () => {

    test('12.1 Should fetch validation rules for note type', async () => {
      const response = await page.request.get(`${API_ENDPOINTS.VALIDATION_RULES}/Intake Assessment`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);

      // Should have rules for required fields
      const rules = data.data;
      expect(rules.some((r: any) => r.fieldName === 'presentingProblem' && r.isRequired)).toBe(true);
      expect(rules.some((r: any) => r.fieldName === 'diagnosisCodes' && r.isRequired)).toBe(true);
    });

    test('12.2 Should validate note data against rules', async () => {
      const noteData = {
        noteType: 'Intake Assessment',
        presentingProblem: 'Test problem',
        diagnosisCodes: ['F32.9']
      };

      const response = await page.request.post(API_ENDPOINTS.VALIDATE_NOTE, {
        data: { noteType: 'Intake Assessment', noteData }
      });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.isValid).toBeDefined();
      expect(data.data.errors).toBeInstanceOf(Array);
    });

    test('12.3 Should show real-time validation errors in form', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      // Fill required field
      await page.fill(SELECTORS.PRESENTING_PROBLEM, 'Test');

      // Clear it
      await page.fill(SELECTORS.PRESENTING_PROBLEM, '');
      await page.locator(SELECTORS.SUBJECTIVE).click(); // Blur

      // Should show validation error
      await expect(page.locator(SELECTORS.VALIDATION_ERROR_PRESENTING_PROBLEM)).toBeVisible();
      await expect(page.locator(SELECTORS.VALIDATION_ERROR_PRESENTING_PROBLEM)).toContainText('required');
    });

    test('12.4 Should validate minimum length for text fields', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Progress Note');

      await page.fill(SELECTORS.SUBJECTIVE, 'Too short');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText('minimum');
    });

    test('12.5 Should validate field patterns (e.g., phone, email)', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Contact Note');

      await page.fill(SELECTORS.CONTACT_PHONE, 'invalid-phone');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.VALIDATION_ERROR_PHONE)).toContainText('valid phone number');
    });

    test('12.6 Should show validation summary before signing', async () => {
      const noteId = await createIncompleteNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
      await page.click(SELECTORS.SIGN_NOTE_BUTTON);

      await expect(page.locator(SELECTORS.VALIDATION_SUMMARY)).toBeVisible();

      const errors = await page.locator(SELECTORS.VALIDATION_ERROR_ITEM).all();
      expect(errors.length).toBeGreaterThan(0);
    });

    test('12.7 Should handle conditional validation rules', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      // Check suicidal ideation
      await page.check(SELECTORS.SUICIDAL_IDEATION);

      // Risk assessment details should now be required
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText('Risk assessment details required when suicidal ideation is present');
    });

    test('12.8 Should get validation summary for note type', async () => {
      const response = await page.request.get(`${API_ENDPOINTS.VALIDATION_SUMMARY}/Progress Note`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.totalFields).toBeGreaterThan(0);
      expect(data.data.requiredFields).toBeGreaterThan(0);
      expect(data.data.sections).toBeInstanceOf(Array);
    });
  });

  // ==========================================================================
  // SECTION 13: AMENDMENT HISTORY
  // ==========================================================================

  test.describe('13. Amendment History - Complete Testing', () => {

    test('13.1 Should create amendment for signed note', async () => {
      const signedNoteId = await createAndSignNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${signedNoteId}`);
      await page.click(SELECTORS.CREATE_AMENDMENT_BUTTON);

      await expect(page.locator(SELECTORS.AMENDMENT_MODAL)).toBeVisible();

      await page.fill(SELECTORS.AMENDMENT_REASON, 'Correcting typo in diagnosis');
      await page.fill(SELECTORS.AMENDMENT_CHANGE_DESCRIPTION, 'Changed diagnosis code from F32.9 to F33.1');
      await page.click(SELECTORS.AMENDMENT_SUBMIT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.CREATE_AMENDMENT)
      );
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.reason).toBe('Correcting typo in diagnosis');
    });

    test('13.2 Should display amendment history tab', async () => {
      const signedNoteId = await createAndSignNote(page, clientId);
      await createAmendment(page, signedNoteId, 'Test amendment');

      await page.goto(`${ROUTES.NOTE_DETAIL}/${signedNoteId}`);
      await page.click(SELECTORS.AMENDMENT_HISTORY_TAB);

      await expect(page.locator(SELECTORS.AMENDMENT_HISTORY_LIST)).toBeVisible();

      const amendments = await page.locator(SELECTORS.AMENDMENT_HISTORY_ITEM).all();
      expect(amendments.length).toBeGreaterThan(0);
    });

    test('13.3 Should show all amendment details', async () => {
      const signedNoteId = await createAndSignNote(page, clientId);
      await createAmendment(page, signedNoteId, 'Test amendment', 'Test change');

      await page.goto(`${ROUTES.NOTE_DETAIL}/${signedNoteId}`);
      await page.click(SELECTORS.AMENDMENT_HISTORY_TAB);

      const firstAmendment = page.locator(SELECTORS.AMENDMENT_HISTORY_ITEM).first();

      await expect(firstAmendment.locator(SELECTORS.AMENDMENT_REASON_DISPLAY)).toContainText('Test amendment');
      await expect(firstAmendment.locator(SELECTORS.AMENDMENT_CHANGE_DISPLAY)).toContainText('Test change');
      await expect(firstAmendment.locator(SELECTORS.AMENDMENT_DATE)).toBeVisible();
      await expect(firstAmendment.locator(SELECTORS.AMENDMENT_AUTHOR)).toBeVisible();
    });

    test('13.4 Should track amendment chain (amendment of amendment)', async () => {
      const signedNoteId = await createAndSignNote(page, clientId);
      await createAmendment(page, signedNoteId, 'First amendment');
      await createAmendment(page, signedNoteId, 'Second amendment');

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${signedNoteId}`);
      const data = await response.json();

      expect(data.data.amendments).toHaveLength(2);
    });

    test('13.5 Should prevent deletion of notes with amendments', async () => {
      const signedNoteId = await createAndSignNote(page, clientId);
      await createAmendment(page, signedNoteId, 'Test amendment');

      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);

      // Delete button should not exist
      await expect(page.locator(`[data-note-id="${signedNoteId}"] ${SELECTORS.DELETE_BUTTON}`)).not.toBeVisible();
    });

    test('13.6 Should display amendment indicator on note list', async () => {
      const signedNoteId = await createAndSignNote(page, clientId);
      await createAmendment(page, signedNoteId, 'Test amendment');

      await page.goto(ROUTES.MY_NOTES);

      const noteCard = page.locator(`[data-note-id="${signedNoteId}"]`);
      await expect(noteCard.locator(SELECTORS.AMENDMENT_INDICATOR)).toBeVisible();
    });
  });

  // ==========================================================================
  // SECTION 14: OUTCOME MEASURES
  // ==========================================================================

  test.describe('14. Outcome Measures - Complete Testing', () => {

    test('14.1 Should add outcome measure to note', async () => {
      const noteId = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
      await page.click(SELECTORS.ADD_OUTCOME_MEASURE_BUTTON);

      await page.selectOption(SELECTORS.OUTCOME_MEASURE_TYPE, 'PHQ-9');
      await page.fill(SELECTORS.OUTCOME_MEASURE_SCORE, '12');
      await page.fill(SELECTORS.OUTCOME_MEASURE_NOTES, 'Moderate depression');
      await page.click(SELECTORS.OUTCOME_MEASURE_SUBMIT);

      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.CREATE_OUTCOME_MEASURE)
      );
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.measureType).toBe('PHQ-9');
      expect(data.data.score).toBe(12);
    });

    test('14.2 Should display all outcome measures in section', async () => {
      const noteId = await createCompleteProgressNote(page, clientId);
      await addOutcomeMeasure(page, noteId, 'PHQ-9', 12);
      await addOutcomeMeasure(page, noteId, 'GAD-7', 8);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
      await page.click(SELECTORS.OUTCOME_MEASURES_TAB);

      const measures = await page.locator(SELECTORS.OUTCOME_MEASURE_ITEM).all();
      expect(measures.length).toBe(2);
    });

    test('14.3 Should show outcome measure trends', async () => {
      // Create multiple notes with outcome measures
      const note1Id = await createCompleteProgressNote(page, clientId);
      await addOutcomeMeasure(page, note1Id, 'PHQ-9', 15);

      const note2Id = await createCompleteProgressNote(page, clientId);
      await addOutcomeMeasure(page, note2Id, 'PHQ-9', 12);

      const note3Id = await createCompleteProgressNote(page, clientId);
      await addOutcomeMeasure(page, note3Id, 'PHQ-9', 8);

      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(SELECTORS.OUTCOME_MEASURES_TREND_TAB);

      // Should show chart/graph
      await expect(page.locator(SELECTORS.OUTCOME_MEASURES_CHART)).toBeVisible();
    });

    test('14.4 Should validate outcome measure score ranges', async () => {
      const noteId = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
      await page.click(SELECTORS.ADD_OUTCOME_MEASURE_BUTTON);

      await page.selectOption(SELECTORS.OUTCOME_MEASURE_TYPE, 'PHQ-9');
      await page.fill(SELECTORS.OUTCOME_MEASURE_SCORE, '100'); // Invalid - max is 27

      await page.click(SELECTORS.OUTCOME_MEASURE_SUBMIT);

      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText('Score must be between 0 and 27 for PHQ-9');
    });
  });

  // Continue with remaining sections...

});

// ==========================================================================
// HELPER FUNCTIONS (used across tests)
// ==========================================================================

async function createNoteFlow(page: Page, clientId: string, appointmentId: string, noteType: string) {
  await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
  await page.click(SELECTORS.CREATE_NOTE_BUTTON);
  await page.click(`[data-note-type="${noteType}"]`);
  await page.click(`[data-appointment-id="${appointmentId}"]`);
}

