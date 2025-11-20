import { Page, expect } from '@playwright/test';
import { TEST_DATA, ROUTES, API_ENDPOINTS, SELECTORS } from '../fixtures/test-data';
import api from '../../../packages/frontend/src/lib/api';

/**
 * Test Helper Functions for Clinical Notes Module Testing
 */

// ==========================================================================
// AUTHENTICATION HELPERS
// ==========================================================================

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill(SELECTORS.LOGIN_EMAIL, user.email);
  await page.fill(SELECTORS.LOGIN_PASSWORD, user.password);
  await page.click(SELECTORS.LOGIN_SUBMIT);

  await page.waitForResponse(res => res.url().includes('/auth/login') && res.status() === 200);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.click(SELECTORS.USER_MENU);
  await page.click(SELECTORS.LOGOUT_BUTTON);
  await expect(page).toHaveURL(/\/login/);
}

// ==========================================================================
// DATA SETUP HELPERS
// ==========================================================================

export async function setupTestUser(page: Page) {
  // Create test clinician
  const clinicianResponse = await page.request.post(API_ENDPOINTS.CREATE_USER, {
    data: {
      email: TEST_DATA.users.clinician.email,
      password: TEST_DATA.users.clinician.password,
      firstName: 'Test',
      lastName: 'Clinician',
      roles: ['CLINICIAN'],
      pin: TEST_DATA.users.clinician.pin
    }
  });
  const clinicianData = await clinicianResponse.json();
  const userId = clinicianData.data.id;

  // Create test supervisor
  const supervisorResponse = await page.request.post(API_ENDPOINTS.CREATE_USER, {
    data: {
      email: TEST_DATA.users.supervisor.email,
      password: TEST_DATA.users.supervisor.password,
      firstName: 'Test',
      lastName: 'Supervisor',
      roles: ['SUPERVISOR', 'CLINICIAN'],
      pin: TEST_DATA.users.supervisor.pin
    }
  });
  const supervisorData = await supervisorResponse.json();
  const supervisorId = supervisorData.data.id;

  // Create supervised clinician
  const supervisedResponse = await page.request.post(API_ENDPOINTS.CREATE_USER, {
    data: {
      email: TEST_DATA.users.supervisedClinician.email,
      password: TEST_DATA.users.supervisedClinician.password,
      firstName: 'Supervised',
      lastName: 'Clinician',
      roles: ['CLINICIAN'],
      isUnderSupervision: true,
      supervisorId: supervisorId,
      pin: TEST_DATA.users.supervisedClinician.pin
    }
  });
  const supervisedData = await supervisedResponse.json();

  return {
    userId,
    supervisorId,
    supervisedUserId: supervisedData.data.id
  };
}

export async function createTestClient(page: Page): Promise<string> {
  const response = await page.request.post(API_ENDPOINTS.CREATE_CLIENT, {
    data: {
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1990-01-01',
      email: 'john.smith@test.com',
      phone: '555-0100',
      medicalRecordNumber: `MRN-${Date.now()}`
    }
  });

  const data = await response.json();
  return data.data.id;
}

export async function createTestAppointment(
  page: Page,
  clientId: string,
  clinicianId: string,
  appointmentDate?: string
): Promise<string> {
  const date = appointmentDate || new Date().toISOString().split('T')[0];

  const response = await page.request.post(API_ENDPOINTS.CREATE_APPOINTMENT, {
    data: {
      clientId,
      clinicianId,
      appointmentDate: date,
      startTime: '10:00',
      endTime: '11:00',
      appointmentType: 'Individual Therapy',
      status: 'COMPLETED'
    }
  });

  const data = await response.json();
  return data.data.id;
}

// ==========================================================================
// NOTE CREATION HELPERS
// ==========================================================================

export async function createNoteFlow(
  page: Page,
  clientId: string,
  appointmentId: string,
  noteType: string
) {
  await page.goto(`${ROUTES.CLIENT_NOTES}/${clientId}`);
  await page.click(SELECTORS.CREATE_NOTE_BUTTON);
  await page.click(`[data-note-type="${noteType}"]`);
  await page.click(`[data-appointment-id="${appointmentId}"]`);
  await page.waitForURL(/\/notes\/create/);
}

export async function createCompleteIntakeAssessment(
  page: Page,
  clientId: string,
  appointmentId: string
): Promise<any> {
  await createNoteFlow(page, clientId, appointmentId, 'Intake Assessment');

  // Fill all required fields
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
  await page.selectOption(SELECTORS.RISK_LEVEL_SELECT, 'Low');
  await page.fill(SELECTORS.RISK_ASSESSMENT_DETAILS, TEST_DATA.intakeAssessment.riskDetails);

  // Add diagnosis
  await page.fill(SELECTORS.ICD10_AUTOCOMPLETE, 'F32');
  await page.waitForSelector(SELECTORS.AUTOCOMPLETE_OPTIONS);
  await page.click(SELECTORS.AUTOCOMPLETE_OPTION_FIRST);

  // Save
  await page.click(SELECTORS.SAVE_DRAFT_BUTTON);

  const response = await page.waitForResponse(
    res => res.url().includes(API_ENDPOINTS.CREATE_NOTE) && res.status() === 201
  );

  return await response.json();
}

export async function createCompleteProgressNote(
  page: Page,
  clientId: string
): Promise<any> {
  // Implementation...
  const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
    data: {
      clientId,
      appointmentId: await createTestAppointment(page, clientId, ''),
      noteType: 'Progress Note',
      sessionDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      subjective: TEST_DATA.progressNote.subjective,
      objective: TEST_DATA.progressNote.objective,
      assessment: TEST_DATA.progressNote.assessment,
      plan: TEST_DATA.progressNote.plan,
      riskLevel: 'Low',
      diagnosisCodes: ['F32.9']
    }
  });

  const data = await response.json();
  return data.data;
}

export async function createIncompleteNote(page: Page, clientId: string): Promise<string> {
  const appointmentId = await createTestAppointment(page, clientId, '');

  const response = await page.request.post(API_ENDPOINTS.CREATE_NOTE, {
    data: {
      clientId,
      appointmentId,
      noteType: 'Progress Note',
      sessionDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      // Missing required fields intentionally
    }
  });

  const data = await response.json();
  return data.data.id;
}

// ==========================================================================
// SIGNING HELPERS
// ==========================================================================

export async function signNote(
  page: Page,
  noteId: string,
  pin: string
): Promise<any> {
  await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
  await page.click(SELECTORS.SIGN_NOTE_BUTTON);
  await page.fill(SELECTORS.SIGNATURE_PIN_INPUT, pin);
  await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

  const response = await page.waitForResponse(
    res => res.url().includes(`${API_ENDPOINTS.SIGN_NOTE}/${noteId}`)
  );

  return await response.json();
}

export async function createAndSignNote(
  page: Page,
  clientId: string
): Promise<any> {
  const noteData = await createCompleteProgressNote(page, clientId);

  await signNote(page, noteData.id, TEST_DATA.users.clinician.pin);

  const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteData.id}`);
  const data = await response.json();

  return data.data;
}

export async function cosignNote(
  page: Page,
  noteId: string,
  comments: string
): Promise<any> {
  await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
  await page.click(SELECTORS.COSIGN_NOTE_BUTTON);
  await page.fill(SELECTORS.SUPERVISOR_COMMENTS, comments);
  await page.fill(SELECTORS.SIGNATURE_PIN_INPUT, TEST_DATA.users.supervisor.pin);
  await page.click(SELECTORS.SIGNATURE_SUBMIT_BUTTON);

  const response = await page.waitForResponse(
    res => res.url().includes(`${API_ENDPOINTS.COSIGN_NOTE}/${noteId}`)
  );

  return await response.json();
}

// ==========================================================================
// REVISION WORKFLOW HELPERS
// ==========================================================================

export async function returnNoteForRevision(
  page: Page,
  noteId: string,
  comments: string,
  requiredChanges?: string[]
): Promise<any> {
  await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
  await page.click(SELECTORS.RETURN_FOR_REVISION_BUTTON);

  await page.fill(SELECTORS.REVISION_COMMENTS, comments);

  if (requiredChanges) {
    for (const change of requiredChanges) {
      await page.check(`[data-change="${change}"]`);
    }
  }

  await page.click(SELECTORS.REVISION_SUBMIT_BUTTON);

  const response = await page.waitForResponse(
    res => res.url().includes(`${API_ENDPOINTS.RETURN_FOR_REVISION}/${noteId}`)
  );

  return await response.json();
}

export async function resubmitNote(page: Page, noteId: string): Promise<any> {
  await page.goto(`${ROUTES.EDIT_NOTE}/${noteId}`);
  await page.click(SELECTORS.RESUBMIT_FOR_REVIEW_BUTTON);

  const response = await page.waitForResponse(
    res => res.url().includes(`${API_ENDPOINTS.RESUBMIT_FOR_REVIEW}/${noteId}`)
  );

  return await response.json();
}

export async function createAndReturnNote(
  page: Page,
  clientId: string
): Promise<string> {
  // Create and sign as supervised clinician
  await login(page, TEST_DATA.users.supervisedClinician);
  const noteData = await createAndSignNote(page, clientId);

  // Login as supervisor and return for revision
  await login(page, TEST_DATA.users.supervisor);
  await returnNoteForRevision(page, noteData.id, 'Please add more detail', ['risk-assessment']);

  return noteData.id;
}

// ==========================================================================
// AMENDMENT HELPERS
// ==========================================================================

export async function createAmendment(
  page: Page,
  noteId: string,
  reason: string,
  changeDescription?: string
): Promise<any> {
  await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
  await page.click(SELECTORS.CREATE_AMENDMENT_BUTTON);

  await page.fill(SELECTORS.AMENDMENT_REASON, reason);

  if (changeDescription) {
    await page.fill(SELECTORS.AMENDMENT_CHANGE_DESCRIPTION, changeDescription);
  }

  await page.click(SELECTORS.AMENDMENT_SUBMIT_BUTTON);

  const response = await page.waitForResponse(
    res => res.url().includes(API_ENDPOINTS.CREATE_AMENDMENT)
  );

  return await response.json();
}

// ==========================================================================
// OUTCOME MEASURE HELPERS
// ==========================================================================

export async function addOutcomeMeasure(
  page: Page,
  noteId: string,
  measureType: string,
  score: number,
  notes?: string
): Promise<any> {
  await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
  await page.click(SELECTORS.ADD_OUTCOME_MEASURE_BUTTON);

  await page.selectOption(SELECTORS.OUTCOME_MEASURE_TYPE, measureType);
  await page.fill(SELECTORS.OUTCOME_MEASURE_SCORE, score.toString());

  if (notes) {
    await page.fill(SELECTORS.OUTCOME_MEASURE_NOTES, notes);
  }

  await page.click(SELECTORS.OUTCOME_MEASURE_SUBMIT);

  const response = await page.waitForResponse(
    res => res.url().includes(API_ENDPOINTS.CREATE_OUTCOME_MEASURE)
  );

  return await response.json();
}

// ==========================================================================
// DATABASE VERIFICATION HELPERS
// ==========================================================================

export async function verifyDatabaseState(page: Page, noteId: string) {
  const response = await page.request.get(`${API_ENDPOINTS.GET_NOTE}/${noteId}`);
  return await response.json();
}

export async function cleanupTestData(page: Page, clientId: string) {
  // Delete all notes for test client
  const notesResponse = await page.request.get(`${API_ENDPOINTS.CLIENT_NOTES}/${clientId}`);
  const notesData = await notesResponse.json();

  for (const note of notesData.data) {
    if (note.status === 'DRAFT') {
      await page.request.delete(`${API_ENDPOINTS.DELETE_NOTE}/${note.id}`);
    }
  }

  // Delete client
  await page.request.delete(`${API_ENDPOINTS.DELETE_CLIENT}/${clientId}`);
}

// ==========================================================================
// API ERROR TESTING HELPERS
// ==========================================================================

export async function testAPIEndpoint(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  expectedStatus?: number
) {
  let response;

  switch (method) {
    case 'GET':
      response = await page.request.get(endpoint);
      break;
    case 'POST':
      response = await page.request.post(endpoint, { data });
      break;
    case 'PUT':
      response = await page.request.put(endpoint, { data });
      break;
    case 'PATCH':
      response = await page.request.patch(endpoint, { data });
      break;
    case 'DELETE':
      response = await page.request.delete(endpoint);
      break;
  }

  if (expectedStatus) {
    expect(response.status()).toBe(expectedStatus);
  }

  return await response.json();
}

// ==========================================================================
// LOCK/UNLOCK WORKFLOW HELPERS
// ==========================================================================

export async function lockNote(page: Page, noteId: string): Promise<any> {
  const response = await page.request.post(`${API_ENDPOINTS.LOCK_NOTE}/${noteId}`);
  return await response.json();
}

export async function unlockNote(page: Page, noteId: string): Promise<any> {
  const response = await page.request.post(`${API_ENDPOINTS.UNLOCK_NOTE}/${noteId}`);
  return await response.json();
}

export async function requestUnlock(
  page: Page,
  noteId: string,
  reason: string
): Promise<any> {
  await page.goto(`${ROUTES.NOTE_DETAIL}/${noteId}`);
  await page.click(SELECTORS.REQUEST_UNLOCK_BUTTON);
  await page.fill(SELECTORS.UNLOCK_REASON_INPUT, reason);
  await page.click(SELECTORS.UNLOCK_REQUEST_SUBMIT);

  const response = await page.waitForResponse(
    res => res.url().includes(`${API_ENDPOINTS.REQUEST_UNLOCK}/${noteId}`)
  );

  return await response.json();
}

export async function approveUnlock(
  page: Page,
  noteId: string,
  durationHours: number = 24
): Promise<any> {
  await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);
  await page.click(`[data-note-id="${noteId}"] ${SELECTORS.APPROVE_UNLOCK_BUTTON}`);
  await page.fill(SELECTORS.UNLOCK_DURATION_HOURS, durationHours.toString());
  await page.click(SELECTORS.APPROVE_UNLOCK_SUBMIT);

  const response = await page.waitForResponse(
    res => res.url().includes(API_ENDPOINTS.APPROVE_UNLOCK)
  );

  return await response.json();
}

export async function rejectUnlock(
  page: Page,
  noteId: string,
  rejectionReason: string
): Promise<any> {
  await page.goto(ROUTES.UNLOCK_REQUESTS_QUEUE);
  await page.click(`[data-note-id="${noteId}"] ${SELECTORS.REJECT_UNLOCK_BUTTON}`);
  await page.fill(SELECTORS.UNLOCK_REJECTION_REASON, rejectionReason);
  await page.click(SELECTORS.REJECT_UNLOCK_SUBMIT);

  const response = await page.waitForResponse(
    res => res.url().includes(API_ENDPOINTS.REJECT_UNLOCK)
  );

  return await response.json();
}

// ==========================================================================
// AUDIT LOG HELPERS
// ==========================================================================

export async function getAuditLog(
  page: Page,
  noteId?: string,
  action?: string
): Promise<any> {
  let endpoint = API_ENDPOINTS.AUDIT_LOG;
  const params = new URLSearchParams();

  if (noteId) params.append('noteId', noteId);
  if (action) params.append('action', action);

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  const response = await page.request.get(endpoint);
  return await response.json();
}

export async function verifyAuditEntry(
  page: Page,
  noteId: string,
  expectedAction: string,
  expectedUserId?: string
): Promise<boolean> {
  const auditData = await getAuditLog(page, noteId);

  const entry = auditData.data.find((e: any) =>
    e.action === expectedAction &&
    (!expectedUserId || e.userId === expectedUserId)
  );

  return !!entry;
}

// ==========================================================================
// CONCURRENCY TESTING HELPERS
// ==========================================================================

export async function createMultipleConcurrentNotes(
  page: Page,
  clientId: string,
  clinicianId: string,
  count: number
): Promise<any[]> {
  // Create appointments first
  const appointments = await Promise.all(
    Array.from({ length: count }, () =>
      createTestAppointment(page, clientId, clinicianId)
    )
  );

  // Create notes concurrently
  const createRequests = appointments.map(appointmentId =>
    page.request.post(API_ENDPOINTS.CREATE_NOTE, {
      data: {
        clientId,
        appointmentId,
        noteType: 'Progress Note',
        sessionDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        subjective: TEST_DATA.progressNote.subjective,
        objective: TEST_DATA.progressNote.objective,
        assessment: TEST_DATA.progressNote.assessment,
        plan: TEST_DATA.progressNote.plan
      }
    })
  );

  const responses = await Promise.all(createRequests);
  const results = await Promise.all(responses.map(r => r.json()));

  return results;
}

export async function updateNoteConcurrently(
  page: Page,
  noteId: string,
  updateData1: any,
  updateData2: any
): Promise<{ response1: any; response2: any }> {
  // Get current version
  const currentState = await verifyDatabaseState(page, noteId);
  const currentVersion = currentState.data.version || 1;

  // Make concurrent update requests with same version
  const [response1, response2] = await Promise.all([
    page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteId}`, {
      data: { ...updateData1, version: currentVersion }
    }),
    page.request.patch(`${API_ENDPOINTS.UPDATE_NOTE}/${noteId}`, {
      data: { ...updateData2, version: currentVersion }
    })
  ]);

  const data1 = await response1.json();
  const data2 = await response2.json();

  return {
    response1: { status: response1.status(), data: data1 },
    response2: { status: response2.status(), data: data2 }
  };
}

export async function signNoteConcurrently(
  page: Page,
  noteId: string,
  pin: string
): Promise<any[]> {
  const signRequests = [
    page.request.post(`${API_ENDPOINTS.SIGN_NOTE}/${noteId}`, {
      data: { pin }
    }),
    page.request.post(`${API_ENDPOINTS.SIGN_NOTE}/${noteId}`, {
      data: { pin }
    })
  ];

  const responses = await Promise.all(signRequests);
  const results = await Promise.all(
    responses.map(async r => ({
      status: r.status(),
      data: await r.json()
    }))
  );

  return results;
}

// ==========================================================================
// PERMISSION TESTING HELPERS
// ==========================================================================

export async function attemptUnauthorizedAccess(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<{ status: number; error: string }> {
  let response;

  switch (method) {
    case 'GET':
      response = await page.request.get(endpoint);
      break;
    case 'POST':
      response = await page.request.post(endpoint, { data });
      break;
    case 'PUT':
      response = await page.request.put(endpoint, { data });
      break;
    case 'PATCH':
      response = await page.request.patch(endpoint, { data });
      break;
    case 'DELETE':
      response = await page.request.delete(endpoint);
      break;
  }

  const responseData = await response.json();

  return {
    status: response.status(),
    error: responseData.error || ''
  };
}

export async function verifyPermissionDenied(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<boolean> {
  const result = await attemptUnauthorizedAccess(page, method, endpoint, data);
  return result.status === 403 || result.status === 401;
}

// ==========================================================================
// WAIT/RETRY HELPERS
// ==========================================================================

export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 5000
) {
  return await page.waitForResponse(
    res => {
      if (typeof urlPattern === 'string') {
        return res.url().includes(urlPattern);
      }
      return urlPattern.test(res.url());
    },
    { timeout }
  );
}

export async function retryOperation(
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// ==========================================================================
// NOTIFICATION SYSTEM HELPERS
// ==========================================================================

export async function getNotifications(
  page: Page,
  userId?: string,
  type?: string,
  isRead?: boolean
): Promise<any> {
  let endpoint = API_ENDPOINTS.NOTIFICATIONS;
  const params = new URLSearchParams();

  if (userId) params.append('userId', userId);
  if (type) params.append('type', type);
  if (isRead !== undefined) params.append('isRead', isRead.toString());

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  const response = await page.request.get(endpoint);
  return await response.json();
}

export async function markNotificationAsRead(
  page: Page,
  notificationId: string
): Promise<any> {
  const response = await page.request.patch(
    `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`,
    {
      data: { isRead: true }
    }
  );
  return await response.json();
}

export async function markAllNotificationsAsRead(page: Page): Promise<any> {
  const response = await page.request.post(API_ENDPOINTS.MARK_ALL_READ);
  return await response.json();
}

export async function getNotificationPreferences(
  page: Page,
  userId: string
): Promise<any> {
  const response = await page.request.get(
    `${API_ENDPOINTS.NOTIFICATION_PREFERENCES}/${userId}`
  );
  return await response.json();
}

export async function updateNotificationPreferences(
  page: Page,
  userId: string,
  preferences: {
    emailNotifications?: boolean;
    emailCosignRequests?: boolean;
    emailRevisionRequests?: boolean;
    emailOverdueNotes?: boolean;
    inAppNotifications?: boolean;
  }
): Promise<any> {
  const response = await page.request.patch(
    `${API_ENDPOINTS.NOTIFICATION_PREFERENCES}/${userId}`,
    { data: preferences }
  );
  return await response.json();
}

export async function triggerOverdueNotifications(page: Page): Promise<any> {
  const response = await page.request.post(
    API_ENDPOINTS.TRIGGER_OVERDUE_NOTIFICATIONS
  );
  return await response.json();
}

export async function getNotificationDeliveryStatus(
  page: Page,
  notificationId: string
): Promise<any> {
  const response = await page.request.get(
    `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/delivery-status`
  );
  return await response.json();
}

// ==========================================================================
// ADVANCED SEARCH HELPERS
// ==========================================================================

export async function searchNotes(
  page: Page,
  searchParams: {
    query?: string;
    clinicianId?: string;
    clientId?: string;
    noteType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    diagnosisCode?: string;
    cptCode?: string;
    riskLevel?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<any> {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const endpoint = `${API_ENDPOINTS.SEARCH_NOTES}?${params.toString()}`;
  const response = await page.request.get(endpoint);
  return await response.json();
}

export async function searchByDiagnosisCode(
  page: Page,
  diagnosisCode: string,
  additionalFilters?: any
): Promise<any> {
  return await searchNotes(page, {
    diagnosisCode,
    ...additionalFilters
  });
}

export async function searchByCPTCode(
  page: Page,
  cptCode: string,
  additionalFilters?: any
): Promise<any> {
  return await searchNotes(page, {
    cptCode,
    ...additionalFilters
  });
}

export async function advancedSearchWithFilters(
  page: Page,
  filters: {
    noteType?: string;
    status?: string;
    clinicianId?: string;
    startDate?: string;
    endDate?: string;
    riskLevel?: string;
  }
): Promise<any> {
  return await searchNotes(page, filters);
}

export async function saveSearchPreset(
  page: Page,
  name: string,
  filters: any,
  isDefault: boolean = false
): Promise<any> {
  const response = await page.request.post(API_ENDPOINTS.SAVE_SEARCH_PRESET, {
    data: {
      name,
      filters,
      isDefault
    }
  });
  return await response.json();
}

export async function loadSearchPreset(
  page: Page,
  presetId: string
): Promise<any> {
  const response = await page.request.get(
    `${API_ENDPOINTS.SEARCH_PRESETS}/${presetId}`
  );
  return await response.json();
}

export async function getSearchPresets(page: Page): Promise<any> {
  const response = await page.request.get(API_ENDPOINTS.SEARCH_PRESETS);
  return await response.json();
}

export async function deleteSearchPreset(
  page: Page,
  presetId: string
): Promise<any> {
  const response = await page.request.delete(
    `${API_ENDPOINTS.SEARCH_PRESETS}/${presetId}`
  );
  return await response.json();
}

export async function exportSearchResults(
  page: Page,
  searchParams: any,
  format: 'csv' | 'pdf' = 'csv'
): Promise<any> {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  params.append('format', format);

  const endpoint = `${API_ENDPOINTS.EXPORT_SEARCH_RESULTS}?${params.toString()}`;
  const response = await page.request.get(endpoint);
  return response;
}

export async function exportNoteAsPDF(
  page: Page,
  noteId: string
): Promise<any> {
  const response = await page.request.get(
    `${API_ENDPOINTS.EXPORT_NOTE}/${noteId}?format=pdf`
  );
  return response;
}

export async function exportAuditLogCSV(
  page: Page,
  noteId?: string,
  startDate?: string,
  endDate?: string
): Promise<any> {
  const params = new URLSearchParams();

  if (noteId) params.append('noteId', noteId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('format', 'csv');

  const endpoint = `${API_ENDPOINTS.AUDIT_LOG}/export?${params.toString()}`;
  const response = await page.request.get(endpoint);
  return response;
}
