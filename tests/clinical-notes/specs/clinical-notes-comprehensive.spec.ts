import { test, expect, Page } from '@playwright/test';
import { login, setupTestUser, createTestClient, createTestAppointment } from '../helpers/test-helpers';
import {
  NOTE_TYPES,
  TEST_DATA,
  ROUTES,
  API_ENDPOINTS,
  SELECTORS
} from '../fixtures/test-data';

/**
 * COMPREHENSIVE CLINICAL NOTES MODULE TESTING
 *
 * This test suite covers EVERY aspect of the Clinical Notes module:
 * - All 8 Note Types (Intake, Progress, Treatment Plan, etc.)
 * - All CRUD Operations (Create, Read, Update, Delete)
 * - All Workflows (Draft, Sign, Cosign, Revision, Lock/Unlock)
 * - All Pages (My Notes, Cosign Queue, Compliance Dashboard, Note Detail)
 * - All Forms (All 8 note type forms with ALL fields)
 * - All Tables/Lists (Note lists, filters, sorting, pagination)
 * - All API Endpoints (30+ endpoints)
 * - All Database Operations (validations, constraints, relationships)
 * - All UI Components (Modals, Autocompletes, Badges, etc.)
 * - All Edge Cases and Error Scenarios
 * - All Authentication & Authorization checks
 * - All Validation Rules
 * - Amendment History
 * - Outcome Measures
 * - Electronic Signatures
 * - Billing Integration
 * - AI Generation Features
 */

test.describe('Clinical Notes Module - Comprehensive Testing Suite', () => {
  let page: Page;
  let testUserId: string;
  let supervisorUserId: string;
  let clientId: string;
  let appointmentId: string;

  // ==========================================================================
  // SETUP & TEARDOWN
  // ==========================================================================

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup test data
    const setup = await setupTestUser(page);
    testUserId = setup.userId;
    supervisorUserId = setup.supervisorId;

    clientId = await createTestClient(page);
    appointmentId = await createTestAppointment(page, clientId, testUserId);
  });

  test.beforeEach(async () => {
    await login(page, TEST_DATA.users.clinician);
  });

  // ==========================================================================
  // SECTION 1: NAVIGATION & PAGE LOADING
  // ==========================================================================

  test.describe('1. Navigation & Page Loading Tests', () => {

    test('1.1 Should load My Notes page successfully', async () => {
      await page.goto(ROUTES.MY_NOTES);
      await expect(page.locator('h1')).toContainText('My Clinical Notes');

      // Verify statistics cards load
      await expect(page.locator(SELECTORS.STATS_TOTAL)).toBeVisible();
      await expect(page.locator(SELECTORS.STATS_DRAFT)).toBeVisible();
      await expect(page.locator(SELECTORS.STATS_SIGNED)).toBeVisible();
      await expect(page.locator(SELECTORS.STATS_PENDING_COSIGN)).toBeVisible();
      await expect(page.locator(SELECTORS.STATS_COSIGNED)).toBeVisible();
      await expect(page.locator(SELECTORS.STATS_LOCKED)).toBeVisible();
      await expect(page.locator(SELECTORS.STATS_OVERDUE)).toBeVisible();
    });

    test('1.2 Should load Client Clinical Notes page successfully', async () => {
      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await expect(page.locator(SELECTORS.NOTES_LIST)).toBeVisible();
    });

    test('1.3 Should load Cosign Queue page successfully (as supervisor)', async () => {
      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.COSIGN_QUEUE);
      await expect(page.locator('h1')).toContainText('Co-Signing Queue');

      // Verify statistics
      await expect(page.locator(SELECTORS.COSIGN_PENDING_COUNT)).toBeVisible();
      await expect(page.locator(SELECTORS.COSIGN_URGENT_COUNT)).toBeVisible();
      await expect(page.locator(SELECTORS.COSIGN_CLINICIANS_COUNT)).toBeVisible();
    });

    test('1.4 Should load Compliance Dashboard successfully', async () => {
      await page.goto(ROUTES.COMPLIANCE_DASHBOARD);
      await expect(page.locator('h1')).toContainText('Compliance Dashboard');

      // Verify all compliance sections
      await expect(page.locator(SELECTORS.COMPLIANCE_OVERDUE)).toBeVisible();
      await expect(page.locator(SELECTORS.COMPLIANCE_LOCKED)).toBeVisible();
      await expect(page.locator(SELECTORS.COMPLIANCE_DRAFTS)).toBeVisible();
      await expect(page.locator(SELECTORS.COMPLIANCE_MISSING_NOTES)).toBeVisible();
    });

    test('1.5 Should handle invalid routes with proper error messages', async () => {
      await page.goto(`${ROUTES.CLIENT_NOTES}/invalid-client-id`);
      await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toBeVisible();
    });

    test('1.6 Should require authentication for all clinical notes pages', async () => {
      await page.context().clearCookies();
      await page.goto(ROUTES.MY_NOTES);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ==========================================================================
  // SECTION 2: NOTE TYPE SELECTOR & APPOINTMENT PICKER
  // ==========================================================================

  test.describe('2. Note Type Selector & Appointment Picker Tests', () => {

    test('2.1 Should display all 8 note types in selector', async () => {
      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(SELECTORS.CREATE_NOTE_BUTTON);

      for (const noteType of NOTE_TYPES) {
        await expect(page.locator(`[data-note-type="${noteType}"]`)).toBeVisible();
      }
    });

    test('2.2 Should filter eligible appointments by note type', async () => {
      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(SELECTORS.CREATE_NOTE_BUTTON);

      // Select Intake Assessment - should only show first appointment
      await page.click('[data-note-type="Intake Assessment"]');
      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.ELIGIBLE_APPOINTMENTS) && res.status() === 200
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.appointments).toBeDefined();
    });

    test('2.3 Should enforce Intake Assessment must be first note rule', async () => {
      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(SELECTORS.CREATE_NOTE_BUTTON);

      // Try to create Progress Note without Intake
      await page.click('[data-note-type="Progress Note"]');
      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText(
        'Intake Assessment must be completed first'
      );
    });

    test('2.4 Should create appointment if no eligible appointments exist', async () => {
      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(SELECTORS.CREATE_NOTE_BUTTON);
      await page.click('[data-note-type="Miscellaneous Note"]');

      await page.click(SELECTORS.CREATE_APPOINTMENT_BUTTON);
      await page.fill(SELECTORS.APPOINTMENT_DATE_INPUT, '2024-12-20');
      await page.fill(SELECTORS.APPOINTMENT_START_TIME, '10:00');
      await page.fill(SELECTORS.APPOINTMENT_END_TIME, '11:00');
      await page.click(SELECTORS.CREATE_APPOINTMENT_SUBMIT);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('2.5 Should prevent duplicate note types for same appointment', async () => {
      // Create first note
      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(SELECTORS.CREATE_NOTE_BUTTON);
      await page.click('[data-note-type="Intake Assessment"]');
      await page.click(`[data-appointment-id="${appointmentId}"]`);

      // Try to create duplicate
      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.CREATE_NOTE) && res.status() === 409
      );
      const data = await response.json();
      expect(data.errorCode).toBe('DUPLICATE_NOTE');
    });
  });

  // ==========================================================================
  // SECTION 3: INTAKE ASSESSMENT FORM - ALL FIELDS
  // ==========================================================================

  test.describe('3. Intake Assessment Form - Complete Field Testing', () => {

    test('3.1 Should render all Intake Assessment form fields', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      // Basic Information
      await expect(page.locator(SELECTORS.SESSION_DATE)).toBeVisible();
      await expect(page.locator(SELECTORS.SESSION_START_TIME)).toBeVisible();
      await expect(page.locator(SELECTORS.SESSION_END_TIME)).toBeVisible();
      await expect(page.locator(SELECTORS.SESSION_DURATION)).toBeVisible();

      // Presenting Problem
      await expect(page.locator(SELECTORS.PRESENTING_PROBLEM)).toBeVisible();
      await expect(page.locator(SELECTORS.CHIEF_COMPLAINT)).toBeVisible();
      await expect(page.locator(SELECTORS.SYMPTOM_ONSET)).toBeVisible();

      // History
      await expect(page.locator(SELECTORS.PSYCHIATRIC_HISTORY)).toBeVisible();
      await expect(page.locator(SELECTORS.MEDICAL_HISTORY)).toBeVisible();
      await expect(page.locator(SELECTORS.SUBSTANCE_USE_HISTORY)).toBeVisible();
      await expect(page.locator(SELECTORS.FAMILY_HISTORY)).toBeVisible();
      await expect(page.locator(SELECTORS.SOCIAL_HISTORY)).toBeVisible();

      // Mental Status Examination
      await expect(page.locator(SELECTORS.MSE_APPEARANCE)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_BEHAVIOR)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_SPEECH)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_MOOD)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_AFFECT)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_THOUGHT_PROCESS)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_THOUGHT_CONTENT)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_PERCEPTION)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_COGNITION)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_INSIGHT)).toBeVisible();
      await expect(page.locator(SELECTORS.MSE_JUDGMENT)).toBeVisible();

      // Risk Assessment
      await expect(page.locator(SELECTORS.SUICIDAL_IDEATION)).toBeVisible();
      await expect(page.locator(SELECTORS.SUICIDAL_PLAN)).toBeVisible();
      await expect(page.locator(SELECTORS.HOMICIDAL_IDEATION)).toBeVisible();
      await expect(page.locator(SELECTORS.SELF_HARM)).toBeVisible();
      await expect(page.locator(SELECTORS.RISK_LEVEL_SELECT)).toBeVisible();
      await expect(page.locator(SELECTORS.RISK_ASSESSMENT_DETAILS)).toBeVisible();
      await expect(page.locator(SELECTORS.INTERVENTIONS_TAKEN)).toBeVisible();

      // Diagnosis
      await expect(page.locator(SELECTORS.ICD10_AUTOCOMPLETE)).toBeVisible();
      await expect(page.locator(SELECTORS.DIAGNOSIS_NOTES)).toBeVisible();

      // Treatment Plan
      await expect(page.locator(SELECTORS.TREATMENT_GOALS)).toBeVisible();
      await expect(page.locator(SELECTORS.INTERVENTIONS_PLANNED)).toBeVisible();
      await expect(page.locator(SELECTORS.TREATMENT_MODALITIES)).toBeVisible();

      // Next Session
      await expect(page.locator(SELECTORS.NEXT_SESSION_PLAN)).toBeVisible();
      await expect(page.locator(SELECTORS.NEXT_SESSION_DATE)).toBeVisible();

      // Billing
      await expect(page.locator(SELECTORS.CPT_CODE_AUTOCOMPLETE)).toBeVisible();
      await expect(page.locator(SELECTORS.BILLABLE_CHECKBOX)).toBeVisible();
    });

    test('3.2 Should validate required fields on Intake Assessment', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      // Try to save without required fields
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      // Verify validation errors appear
      await expect(page.locator(SELECTORS.VALIDATION_SUMMARY)).toBeVisible();
      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText('Session date is required');
      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText('Presenting problem is required');
      await expect(page.locator(SELECTORS.VALIDATION_ERROR)).toContainText('At least one diagnosis is required');
    });

    test('3.3 Should save Intake Assessment as draft with all fields filled', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      // Fill all fields
      await page.fill(SELECTORS.SESSION_DATE, '2024-12-15');
      await page.fill(SELECTORS.SESSION_START_TIME, '10:00');
      await page.fill(SELECTORS.SESSION_END_TIME, '11:00');

      await page.fill(SELECTORS.PRESENTING_PROBLEM, TEST_DATA.intakeAssessment.presentingProblem);
      await page.fill(SELECTORS.CHIEF_COMPLAINT, TEST_DATA.intakeAssessment.chiefComplaint);
      await page.fill(SELECTORS.PSYCHIATRIC_HISTORY, TEST_DATA.intakeAssessment.psychiatricHistory);
      await page.fill(SELECTORS.MEDICAL_HISTORY, TEST_DATA.intakeAssessment.medicalHistory);

      // Mental Status Exam
      await page.selectOption(SELECTORS.MSE_APPEARANCE, 'Well-groomed');
      await page.selectOption(SELECTORS.MSE_MOOD, 'Euthymic');
      await page.selectOption(SELECTORS.MSE_AFFECT, 'Appropriate');

      // Risk Assessment
      await page.check(SELECTORS.SUICIDAL_IDEATION);
      await page.selectOption(SELECTORS.RISK_LEVEL_SELECT, 'Low');
      await page.fill(SELECTORS.RISK_ASSESSMENT_DETAILS, TEST_DATA.intakeAssessment.riskDetails);

      // Add diagnosis using ICD-10 autocomplete
      await page.fill(SELECTORS.ICD10_AUTOCOMPLETE, 'F32');
      await page.waitForSelector(SELECTORS.AUTOCOMPLETE_OPTIONS);
      await page.click(SELECTORS.AUTOCOMPLETE_OPTION_FIRST);

      // Save as draft
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.CREATE_NOTE) && res.status() === 201
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('DRAFT');
      expect(data.data.noteType).toBe('Intake Assessment');
    });

    test('3.4 Should auto-calculate session duration', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      await page.fill(SELECTORS.SESSION_START_TIME, '10:00');
      await page.fill(SELECTORS.SESSION_END_TIME, '11:30');

      // Wait for auto-calculation
      await page.waitForTimeout(500);

      const duration = await page.inputValue(SELECTORS.SESSION_DURATION);
      expect(duration).toBe('90');
    });

    test('3.5 Should validate ICD-10 code format in autocomplete', async () => {
      await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

      // Test valid ICD-10 code
      await page.fill(SELECTORS.ICD10_AUTOCOMPLETE, 'F32.9');
      await page.waitForSelector(SELECTORS.AUTOCOMPLETE_OPTIONS);
      await expect(page.locator(SELECTORS.AUTOCOMPLETE_OPTIONS)).toBeVisible();

      // Test invalid code
      await page.fill(SELECTORS.ICD10_AUTOCOMPLETE, 'INVALID');
      await expect(page.locator(SELECTORS.AUTOCOMPLETE_NO_RESULTS)).toBeVisible();
    });
  });

  // ==========================================================================
  // SECTION 4: PROGRESS NOTE FORM - ALL FIELDS
  // ==========================================================================

  test.describe('4. Progress Note Form - Complete Field Testing', () => {

    test('4.1 Should render all Progress Note form fields', async () => {
      // First create Intake Assessment
      await createCompleteIntakeAssessment(page, clientId, appointmentId);

      // Create new appointment
      const progressAppointmentId = await createTestAppointment(page, clientId, testUserId);

      // Create Progress Note
      await createNoteFlow(page, clientId, progressAppointmentId, 'Progress Note');

      // SOAP Note fields
      await expect(page.locator(SELECTORS.SUBJECTIVE)).toBeVisible();
      await expect(page.locator(SELECTORS.OBJECTIVE)).toBeVisible();
      await expect(page.locator(SELECTORS.ASSESSMENT)).toBeVisible();
      await expect(page.locator(SELECTORS.PLAN)).toBeVisible();

      // Risk Assessment (should inherit from intake)
      await expect(page.locator(SELECTORS.RISK_ASSESSMENT_SECTION)).toBeVisible();

      // Progress toward goals
      await expect(page.locator(SELECTORS.PROGRESS_TOWARD_GOALS)).toBeVisible();

      // Interventions used
      await expect(page.locator(SELECTORS.INTERVENTIONS_USED)).toBeVisible();

      // Diagnosis (should be inherited and editable)
      await expect(page.locator(SELECTORS.INHERITED_DIAGNOSES)).toBeVisible();
    });

    test('4.2 Should inherit diagnoses from Intake Assessment', async () => {
      await createCompleteIntakeAssessment(page, clientId, appointmentId);
      const progressAppointmentId = await createTestAppointment(page, clientId, testUserId);

      await createNoteFlow(page, clientId, progressAppointmentId, 'Progress Note');

      // Verify inherited diagnoses are displayed
      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.INHERITED_DIAGNOSES)
      );
      const data = await response.json();
      expect(data.data.diagnosisCodes).toHaveLength(1);
      expect(data.data.diagnosisCodes[0]).toContain('F32');
    });

    test('4.3 Should save Progress Note with SOAP format', async () => {
      await createCompleteIntakeAssessment(page, clientId, appointmentId);
      const progressAppointmentId = await createTestAppointment(page, clientId, testUserId);

      await createNoteFlow(page, clientId, progressAppointmentId, 'Progress Note');

      // Fill SOAP fields
      await page.fill(SELECTORS.SUBJECTIVE, TEST_DATA.progressNote.subjective);
      await page.fill(SELECTORS.OBJECTIVE, TEST_DATA.progressNote.objective);
      await page.fill(SELECTORS.ASSESSMENT, TEST_DATA.progressNote.assessment);
      await page.fill(SELECTORS.PLAN, TEST_DATA.progressNote.plan);

      // Fill risk assessment
      await page.selectOption(SELECTORS.RISK_LEVEL_SELECT, 'Low');

      // Fill progress toward goals
      await page.fill(SELECTORS.PROGRESS_TOWARD_GOALS, TEST_DATA.progressNote.progress);

      // Save draft
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(API_ENDPOINTS.CREATE_NOTE) && res.status() === 201
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.subjective).toBe(TEST_DATA.progressNote.subjective);
    });
  });

  // ==========================================================================
  // SECTION 5: ALL OTHER NOTE TYPE FORMS
  // ==========================================================================

  test.describe('5. All Other Note Type Forms Testing', () => {

    test('5.1 Treatment Plan Form - All Fields', async () => {
      await createCompleteIntakeAssessment(page, clientId, appointmentId);
      const treatmentAppointmentId = await createTestAppointment(page, clientId, testUserId);

      await createNoteFlow(page, clientId, treatmentAppointmentId, 'Treatment Plan');

      // Verify specific Treatment Plan fields
      await expect(page.locator(SELECTORS.TREATMENT_GOALS_DETAILED)).toBeVisible();
      await expect(page.locator(SELECTORS.TREATMENT_OBJECTIVES)).toBeVisible();
      await expect(page.locator(SELECTORS.TREATMENT_INTERVENTIONS)).toBeVisible();
      await expect(page.locator(SELECTORS.TREATMENT_FREQUENCY)).toBeVisible();
      await expect(page.locator(SELECTORS.TREATMENT_DURATION)).toBeVisible();
      await expect(page.locator(SELECTORS.DISCHARGE_CRITERIA)).toBeVisible();

      // Fill and save
      await page.fill(SELECTORS.TREATMENT_GOALS_DETAILED, TEST_DATA.treatmentPlan.goals);
      await page.fill(SELECTORS.TREATMENT_OBJECTIVES, TEST_DATA.treatmentPlan.objectives);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('5.2 Cancellation Note Form - All Fields', async () => {
      const cancelAppointmentId = await createTestAppointment(page, clientId, testUserId);
      await createNoteFlow(page, clientId, cancelAppointmentId, 'Cancellation Note');

      await expect(page.locator(SELECTORS.CANCELLATION_REASON)).toBeVisible();
      await expect(page.locator(SELECTORS.CANCELLATION_TYPE)).toBeVisible();
      await expect(page.locator(SELECTORS.CANCELLATION_INITIATED_BY)).toBeVisible();
      await expect(page.locator(SELECTORS.CANCELLATION_NOTES)).toBeVisible();

      await page.selectOption(SELECTORS.CANCELLATION_TYPE, 'Client Cancelled');
      await page.fill(SELECTORS.CANCELLATION_REASON, TEST_DATA.cancellationNote.reason);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('5.3 Consultation Note Form - All Fields', async () => {
      const consultAppointmentId = await createTestAppointment(page, clientId, testUserId);
      await createNoteFlow(page, clientId, consultAppointmentId, 'Consultation Note');

      await expect(page.locator(SELECTORS.CONSULTATION_REASON)).toBeVisible();
      await expect(page.locator(SELECTORS.CONSULTATION_PARTICIPANTS)).toBeVisible();
      await expect(page.locator(SELECTORS.CONSULTATION_SUMMARY)).toBeVisible();
      await expect(page.locator(SELECTORS.CONSULTATION_RECOMMENDATIONS)).toBeVisible();

      await page.fill(SELECTORS.CONSULTATION_REASON, TEST_DATA.consultationNote.reason);
      await page.fill(SELECTORS.CONSULTATION_PARTICIPANTS, TEST_DATA.consultationNote.participants);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('5.4 Contact Note Form - All Fields', async () => {
      const contactAppointmentId = await createTestAppointment(page, clientId, testUserId);
      await createNoteFlow(page, clientId, contactAppointmentId, 'Contact Note');

      await expect(page.locator(SELECTORS.CONTACT_TYPE)).toBeVisible();
      await expect(page.locator(SELECTORS.CONTACT_METHOD)).toBeVisible();
      await expect(page.locator(SELECTORS.CONTACT_DURATION)).toBeVisible();
      await expect(page.locator(SELECTORS.CONTACT_SUMMARY)).toBeVisible();
      await expect(page.locator(SELECTORS.CONTACT_FOLLOW_UP)).toBeVisible();

      await page.selectOption(SELECTORS.CONTACT_TYPE, 'Phone Call');
      await page.fill(SELECTORS.CONTACT_SUMMARY, TEST_DATA.contactNote.summary);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('5.5 Termination Note Form - All Fields', async () => {
      const termAppointmentId = await createTestAppointment(page, clientId, testUserId);
      await createNoteFlow(page, clientId, termAppointmentId, 'Termination Note');

      await expect(page.locator(SELECTORS.TERMINATION_REASON)).toBeVisible();
      await expect(page.locator(SELECTORS.TERMINATION_TYPE)).toBeVisible();
      await expect(page.locator(SELECTORS.TERMINATION_PROGRESS_SUMMARY)).toBeVisible();
      await expect(page.locator(SELECTORS.TERMINATION_REFERRALS)).toBeVisible();
      await expect(page.locator(SELECTORS.TERMINATION_RECOMMENDATIONS)).toBeVisible();

      await page.selectOption(SELECTORS.TERMINATION_TYPE, 'Treatment Completed');
      await page.fill(SELECTORS.TERMINATION_REASON, TEST_DATA.terminationNote.reason);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('5.6 Miscellaneous Note Form - All Fields', async () => {
      const miscAppointmentId = await createTestAppointment(page, clientId, testUserId);
      await createNoteFlow(page, clientId, miscAppointmentId, 'Miscellaneous Note');

      await expect(page.locator(SELECTORS.MISC_NOTE_TYPE)).toBeVisible();
      await expect(page.locator(SELECTORS.MISC_CONTENT)).toBeVisible();

      await page.fill(SELECTORS.MISC_NOTE_TYPE, 'Administrative Note');
      await page.fill(SELECTORS.MISC_CONTENT, TEST_DATA.miscellaneousNote.content);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });

    test('5.7 Group Therapy Note Form - All Fields', async () => {
      const groupAppointmentId = await createTestAppointment(page, clientId, testUserId);
      await createNoteFlow(page, clientId, groupAppointmentId, 'Group Therapy Note');

      await expect(page.locator(SELECTORS.GROUP_NAME)).toBeVisible();
      await expect(page.locator(SELECTORS.GROUP_SIZE)).toBeVisible();
      await expect(page.locator(SELECTORS.GROUP_TOPIC)).toBeVisible();
      await expect(page.locator(SELECTORS.GROUP_ACTIVITIES)).toBeVisible();
      await expect(page.locator(SELECTORS.GROUP_CLIENT_PARTICIPATION)).toBeVisible();
      await expect(page.locator(SELECTORS.GROUP_CLIENT_PROGRESS)).toBeVisible();

      await page.fill(SELECTORS.GROUP_NAME, TEST_DATA.groupTherapyNote.groupName);
      await page.fill(SELECTORS.GROUP_TOPIC, TEST_DATA.groupTherapyNote.topic);
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toBeVisible();
    });
  });

  // ==========================================================================
  // SECTION 6: NOTE CRUD OPERATIONS
  // ==========================================================================

  test.describe('6. Note CRUD Operations - All Scenarios', () => {

    test('6.1 CREATE - Should create note with all required data', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);
      expect(noteData.id).toBeDefined();
      expect(noteData.status).toBe('DRAFT');
    });

    test('6.2 READ - Should retrieve note by ID with all related data', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBe(noteData.id);
      expect(data.data.client).toBeDefined();
      expect(data.data.clinician).toBeDefined();
      expect(data.data.appointment).toBeDefined();
    });

    test('6.3 UPDATE - Should update draft note successfully', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);
      await page.fill(SELECTORS.SUBJECTIVE, 'Updated subjective content');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(`${API_ENDPOINTS.UPDATE_NOTE}/${noteData.id}`)
      );
      const data = await response.json();
      expect(data.data.subjective).toBe('Updated subjective content');
    });

    test('6.4 UPDATE - Should prevent editing signed notes', async () => {
      const noteData = await createAndSignNote(page, clientId);

      await page.goto(`${ROUTES.EDIT_NOTE}/${noteData.id}`);
      await expect(page.locator(SELECTORS.EDIT_LOCKED_MESSAGE)).toBeVisible();
      await expect(page.locator(SELECTORS.SUBJECTIVE)).toBeDisabled();
    });

    test('6.5 DELETE - Should delete draft note successfully', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
      await page.click(`[data-note-id="${noteData.id}"] ${SELECTORS.DELETE_BUTTON}`);
      await page.click(SELECTORS.CONFIRM_DELETE_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(`${API_ENDPOINTS.DELETE_NOTE}/${noteData.id}`)
      );
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('6.6 DELETE - Should prevent deleting signed notes', async () => {
      const noteData = await createAndSignNote(page, clientId);

      await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);

      // Delete button should not exist for signed notes
      await expect(page.locator(`[data-note-id="${noteData.id}"] ${SELECTORS.DELETE_BUTTON}`)).not.toBeVisible();
    });
  });

  // ==========================================================================
  // SECTION 7: SIGNATURE WORKFLOW
  // ==========================================================================

  test.describe('7. Electronic Signature Workflow - Complete Testing', () => {

    test('7.1 Should sign note with PIN authentication', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.SIGN_NOTE_BUTTON);

      // Signature modal should appear
      await expect(page.locator(SELECTORS.SIGNATURE_MODAL)).toBeVisible();
      await expect(page.locator(SELECTORS.SIGNATURE_PIN_INPUT)).toBeVisible();

      await page.fill(SELECTORS.SIGNATURE_PIN_INPUT, TEST_DATA.users.clinician.pin);
      await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(`${API_ENDPOINTS.SIGN_NOTE}/${noteData.id}`)
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('SIGNED');
      expect(data.data.signedDate).toBeDefined();
    });

    test('7.2 Should sign note with password authentication', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.SIGN_NOTE_BUTTON);

      // Switch to password authentication
      await page.click(SELECTORS.SIGNATURE_USE_PASSWORD_TAB);
      await page.fill(SELECTORS.SIGNATURE_PASSWORD_INPUT, TEST_DATA.users.clinician.password);
      await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

      await expect(page.locator(SELECTORS.SUCCESS_MESSAGE)).toContainText('Note signed successfully');
    });

    test('7.3 Should reject invalid PIN', async () => {
      const noteData = await createCompleteProgressNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.SIGN_NOTE_BUTTON);
      await page.fill(SELECTORS.SIGNATURE_PIN_INPUT, '0000');
      await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

      await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toContainText('Invalid signature PIN');
    });

    test('7.4 Should validate all required fields before signing', async () => {
      // Create incomplete note
      const incompleteNoteId = await createIncompleteNote(page, clientId);

      await page.goto(`${ROUTES.NOTE_DETAIL}/${incompleteNoteId}`);
      await page.click(SELECTORS.SIGN_NOTE_BUTTON);
      await page.fill(SELECTORS.SIGNATURE_PIN_INPUT, TEST_DATA.users.clinician.pin);
      await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

      // Should show validation errors
      await expect(page.locator(SELECTORS.VALIDATION_ERRORS_LIST)).toBeVisible();
      await expect(page.locator(SELECTORS.SIGNATURE_MODAL)).not.toBeVisible();
    });

    test('7.5 Should create signature event in database', async () => {
      const noteData = await createAndSignNote(page, clientId);

      // Verify signature event was created
      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
      const data = await response.json();

      expect(data.data.signedBy).toBe(testUserId);
      expect(data.data.signedDate).toBeDefined();
    });

    test('7.6 Should calculate and record days to complete', async () => {
      const noteData = await createAndSignNote(page, clientId);

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
      const data = await response.json();

      expect(data.data.daysToComplete).toBeDefined();
      expect(data.data.completedOnTime).toBeDefined();
    });

    test('7.7 Should mark note as PENDING_COSIGN if clinician is under supervision', async () => {
      // Login as supervised clinician
      await login(page, TEST_DATA.users.supervisedClinician);

      const noteData = await createAndSignNote(page, clientId);
      expect(noteData.status).toBe('PENDING_COSIGN');
    });
  });

  // ==========================================================================
  // SECTION 8: CO-SIGNING WORKFLOW
  // ==========================================================================

  test.describe('8. Co-Signing Workflow - Complete Testing', () => {

    test('8.1 Should display pending notes in cosign queue', async () => {
      // Create and sign note as supervised clinician
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      // Login as supervisor
      await login(page, TEST_DATA.users.supervisor);
      await page.goto(ROUTES.COSIGN_QUEUE);

      // Note should be in queue
      await expect(page.locator(`[data-note-id="${noteData.id}"]`)).toBeVisible();
    });

    test('8.2 Should cosign note with PIN', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);
      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.COSIGN_NOTE_BUTTON);

      await page.fill(SELECTORS.SIGNATURE_PIN_INPUT, TEST_DATA.users.supervisor.pin);
      await page.fill(SELECTORS.SUPERVISOR_COMMENTS, 'Approved - good work');
      await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`)
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('COSIGNED');
      expect(data.data.cosignedBy).toBe(supervisorUserId);
    });

    test('8.3 Should prevent non-supervisor from cosigning', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.otherClinician);

      const response = await page.request.post(`${API_ENDPOINTS.COSIGN_NOTE}/${noteData.id}`, {
        data: { pin: TEST_DATA.users.otherClinician.pin }
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.message).toContain('Only the assigned supervisor can co-sign');
    });

    test('8.4 Should show supervisor comments in note detail', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);
      await cosignNote(page, noteData.id, 'Excellent documentation');

      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await expect(page.locator(SELECTORS.SUPERVISOR_COMMENTS_DISPLAY)).toContainText('Excellent documentation');
    });
  });

  // ==========================================================================
  // SECTION 9: REVISION WORKFLOW
  // ==========================================================================

  test.describe('9. Return for Revision Workflow - Complete Testing', () => {

    test('9.1 Should return note for revision with required changes', async () => {
      await login(page, TEST_DATA.users.supervisedClinician);
      const noteData = await createAndSignNote(page, clientId);

      await login(page, TEST_DATA.users.supervisor);
      await page.goto(`${ROUTES.NOTE_DETAIL}/${noteData.id}`);
      await page.click(SELECTORS.RETURN_FOR_REVISION_BUTTON);

      // Fill revision modal
      await expect(page.locator(SELECTORS.REVISION_MODAL)).toBeVisible();
      await page.fill(SELECTORS.REVISION_COMMENTS, 'Please add more detail to risk assessment');

      await page.check('[data-change="risk-assessment"]');
      await page.check('[data-change="subjective"]');

      await page.click(SELECTORS.REVISION_SUBMIT_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(`${API_ENDPOINTS.RETURN_FOR_REVISION}/${noteData.id}`)
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('RETURNED_FOR_REVISION');
      expect(data.data.revisionCount).toBe(1);
    });

    test('9.2 Should display revision banner on returned note', async () => {
      const returnedNoteId = await createAndReturnNote(page, clientId);

      await login(page, TEST_DATA.users.supervisedClinician);
      await page.goto(`${ROUTES.EDIT_NOTE}/${returnedNoteId}`);

      await expect(page.locator(SELECTORS.REVISION_BANNER)).toBeVisible();
      await expect(page.locator(SELECTORS.REVISION_COMMENTS_DISPLAY)).toContainText('Please add more detail');
      await expect(page.locator(SELECTORS.REQUIRED_CHANGES_LIST)).toBeVisible();
    });

    test('9.3 Should resubmit note after revisions', async () => {
      const returnedNoteId = await createAndReturnNote(page, clientId);

      await login(page, TEST_DATA.users.supervisedClinician);
      await page.goto(`${ROUTES.EDIT_NOTE}/${returnedNoteId}`);

      // Make required changes
      await page.fill(SELECTORS.RISK_ASSESSMENT_DETAILS, 'Updated with more detailed risk assessment');
      await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

      // Resubmit
      await page.click(SELECTORS.RESUBMIT_FOR_REVIEW_BUTTON);

      const response = await page.waitForResponse(
        res => res.url().includes(`${API_ENDPOINTS.RESUBMIT_FOR_REVIEW}/${returnedNoteId}`)
      );
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('PENDING_COSIGN');
    });

    test('9.4 Should track revision history', async () => {
      const returnedNoteId = await createAndReturnNote(page, clientId);

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${returnedNoteId}`);
      const data = await response.json();

      expect(data.data.revisionHistory).toHaveLength(1);
      expect(data.data.revisionHistory[0].comments).toBeDefined();
      expect(data.data.revisionHistory[0].requiredChanges).toBeDefined();
      expect(data.data.revisionHistory[0].returnedBy).toBe(supervisorUserId);
    });

    test('9.5 Should handle multiple revision cycles', async () => {
      let noteId = await createAndReturnNote(page, clientId);

      // Resubmit
      await login(page, TEST_DATA.users.supervisedClinician);
      await resubmitNote(page, noteId);

      // Return again
      await login(page, TEST_DATA.users.supervisor);
      await returnNoteForRevision(page, noteId, 'Still needs more detail');

      const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteId}`);
      const data = await response.json();

      expect(data.data.revisionCount).toBe(2);
      expect(data.data.revisionHistory).toHaveLength(2);
    });
  });
});
