/**
 * Test Data Fixtures for Clinical Notes Module
 * Contains all test data, selectors, routes, and API endpoints
 */

// ==========================================================================
// NOTE TYPES
// ==========================================================================

export const NOTE_TYPES = [
  'Intake Assessment',
  'Progress Note',
  'Treatment Plan',
  'Cancellation Note',
  'Consultation Note',
  'Contact Note',
  'Termination Note',
  'Miscellaneous Note',
  'Group Therapy Note'
];

// ==========================================================================
// USER TEST DATA
// ==========================================================================

export const TEST_DATA = {
  users: {
    admin: {
      email: 'admin@test.com',
      password: 'Admin@123',
      pin: '1234'
    },
    supervisor: {
      email: 'supervisor@test.com',
      password: 'Supervisor@123',
      pin: '2345'
    },
    clinician: {
      email: 'clinician@test.com',
      password: 'Clinician@123',
      pin: '3456'
    },
    supervisedClinician: {
      email: 'supervised@test.com',
      password: 'Supervised@123',
      pin: '4567'
    },
    otherClinician: {
      email: 'other@test.com',
      password: 'Other@123',
      pin: '5678'
    }
  },

  // ==========================================================================
  // INTAKE ASSESSMENT TEST DATA
  // ==========================================================================

  intakeAssessment: {
    presentingProblem: 'Client presents with symptoms of anxiety and depression lasting approximately 6 months. Reports difficulty sleeping, loss of interest in previously enjoyed activities, and persistent worry about daily responsibilities.',
    chiefComplaint: 'I feel anxious all the time and can\'t seem to enjoy anything anymore.',
    symptomOnset: '6 months ago, following job loss',

    psychiatricHistory: 'No previous psychiatric hospitalizations. Saw a therapist briefly in college for stress management. No previous diagnoses.',
    medicalHistory: 'Generally healthy. No significant medical conditions. Takes multivitamin daily.',
    substanceUseHistory: 'Social alcohol use (1-2 drinks per week). Denies tobacco or illicit drug use. No history of substance abuse.',
    familyHistory: 'Mother has history of depression, treated with medication successfully. Father has anxiety disorder.',
    socialHistory: 'Lives alone in apartment. Recently unemployed. Has supportive friends and family. Bachelor\'s degree in Business.',

    mseAppearance: 'Well-groomed, appropriate dress for season',
    mseBehavior: 'Cooperative, maintains eye contact, appropriate motor activity',
    mseSpeech: 'Normal rate and volume, coherent',
    mseMood: 'Anxious and depressed',
    mseAffect: 'Congruent with mood, full range',
    mseThoughtProcess: 'Linear and goal-directed',
    mseThoughtContent: 'Preoccupied with job loss and financial concerns. No delusions.',
    msePerception: 'No hallucinations reported or observed',
    mseCognition: 'Alert and oriented x4. Good memory and concentration.',
    mseInsight: 'Fair - recognizes symptoms but uncertain about treatment',
    mseJudgment: 'Good - seeking appropriate help',

    riskDetails: 'Denies current suicidal ideation. Reports passive thoughts in the past (wishing to not wake up) but no plan or intent. No history of suicide attempts. Has protective factors including supportive family and desire to get better.',

    treatmentGoals: '1. Reduce anxiety symptoms by 50% within 3 months\n2. Improve sleep quality to 7+ hours per night\n3. Re-engage in at least 2 previously enjoyed activities\n4. Develop effective coping strategies for stress management',
    interventions: 'Cognitive Behavioral Therapy (CBT) focused on anxiety and depression, psychoeducation about mood disorders, sleep hygiene education, relaxation training',
    treatmentModalities: 'Individual therapy weekly, possible medication consultation if symptoms persist'
  },

  // ==========================================================================
  // PROGRESS NOTE TEST DATA
  // ==========================================================================

  progressNote: {
    subjective: 'Client reports feeling "a bit better" this week. Sleep has improved slightly - averaging 6 hours per night compared to 4-5 hours previously. Still experiencing worry but notes it\'s more manageable. Tried one of the relaxation techniques discussed last session and found it helpful. Reports one anxiety attack this week (down from 3-4 per week previously).',

    objective: 'Client appeared less anxious than previous sessions. Maintained good eye contact throughout session. Affect more animated when discussing positive changes. Demonstrated understanding of CBT concepts when reviewing homework. No psychomotor agitation observed.',

    assessment: 'Client is showing early signs of improvement with therapy. Anxiety symptoms appear to be decreasing in frequency and intensity. Client is engaged in treatment, completing homework assignments, and actively participating in sessions. Sleep improvement is a positive indicator. Depression symptoms still present but client reports increased motivation to engage in activities.',

    plan: 'Continue weekly individual therapy with CBT focus. Next session will address cognitive distortions related to job search anxiety. Assigned homework: Continue daily thought records, practice relaxation technique at least once daily, plan one social activity for the week. Will monitor sleep patterns and anxiety frequency. Re-evaluate need for medication consultation in 2-3 sessions if progress continues.',

    progress: 'Client is making good progress toward treatment goals. Specifically:\n- Goal 1 (Reduce anxiety): Approximately 25% reduction in anxiety episodes\n- Goal 2 (Improve sleep): Improved from 4-5 hours to 6 hours nightly\n- Goal 3 (Re-engage in activities): Plans to attend friend\'s gathering this weekend\n- Goal 4 (Coping strategies): Successfully using relaxation techniques'
  },

  // ==========================================================================
  // TREATMENT PLAN TEST DATA
  // ==========================================================================

  treatmentPlan: {
    goals: '1. REDUCE ANXIETY SYMPTOMS:\n   - Reduce frequency of anxiety attacks from 3-4 per week to 0-1 per week\n   - Reduce subjective anxiety rating from 8/10 to 4/10\n   - Return to previous level of functioning in daily activities\n   Target Date: 3 months\n\n2. IMPROVE MOOD AND REDUCE DEPRESSION:\n   - Re-engage in at least 3 previously enjoyed activities weekly\n   - Report improved mood for at least 5 days per week\n   - Increase energy levels to support job search activities\n   Target Date: 3 months\n\n3. DEVELOP EFFECTIVE COPING STRATEGIES:\n   - Master and regularly use 3+ relaxation/coping techniques\n   - Identify and challenge cognitive distortions independently\n   - Demonstrate problem-solving skills for stressful situations\n   Target Date: 2 months\n\n4. IMPROVE SLEEP QUALITY:\n   - Achieve 7-8 hours of quality sleep per night\n   - Reduce sleep latency to less than 30 minutes\n   - Wake feeling rested at least 5 days per week\n   Target Date: 6 weeks',

    objectives: '1. Client will identify triggers for anxiety in 100% of sessions\n2. Client will complete thought records 5-7 days per week\n3. Client will practice relaxation techniques daily\n4. Client will engage in one social activity per week\n5. Client will maintain regular sleep/wake schedule 6-7 days per week\n6. Client will apply CBT techniques to challenge negative thoughts 80% of the time',

    interventions: '- Cognitive Behavioral Therapy (CBT) techniques\n- Exposure therapy for anxiety triggers (gradual)\n- Behavioral activation for depression\n- Sleep hygiene education and implementation\n- Relaxation training (progressive muscle relaxation, deep breathing)\n- Cognitive restructuring exercises\n- Problem-solving therapy\n- Mindfulness techniques\n- Social skills enhancement as needed\n- Psychoeducation about anxiety and depression',

    frequency: 'Weekly individual therapy sessions (60 minutes)\nMay increase to twice weekly if crisis or rapid deterioration occurs\nMay decrease to bi-weekly after 2-3 months if goals are met',

    duration: 'Estimated 3-6 months for initial treatment goals\nWill re-evaluate and update treatment plan every 3 months\nLonger-term maintenance therapy may be recommended',

    dischargeCriteria: '- Client meets all treatment goals\n- Anxiety symptoms reduced to manageable levels (2-3/10)\n- Depression symptoms significantly improved or resolved\n- Client demonstrates independent use of coping strategies\n- Client has returned to previous level of functioning\n- Client reports consistent mood stability for at least 4 weeks\n- Client agrees treatment goals have been met\n- Client has appropriate support system and relapse prevention plan'
  },

  // ==========================================================================
  // CANCELLATION NOTE TEST DATA
  // ==========================================================================

  cancellationNote: {
    reason: 'Client called 24 hours prior to scheduled appointment to cancel. Reported not feeling well (common cold symptoms). Requested to reschedule for next week.',
    type: 'Client Cancelled',
    initiatedBy: 'Client',
    notes: 'Client sounded congested on phone. Appropriate cancellation with advance notice. No concerns about treatment engagement - client expressed desire to continue therapy and was apologetic about cancelling. Rescheduled for same time next week.'
  },

  // ==========================================================================
  // CONSULTATION NOTE TEST DATA
  // ==========================================================================

  consultationNote: {
    reason: 'Consultation with psychiatrist regarding potential medication management for client\'s persistent anxiety and depression symptoms.',
    participants: 'Dr. Sarah Johnson (Psychiatrist), myself (Therapist)',
    summary: 'Presented client case to Dr. Johnson including: current symptoms, duration, severity, treatment progress to date, and client\'s goals. Discussed client\'s response to CBT interventions, which has been positive but incomplete symptom resolution. Reviewed client\'s medical history, substance use history, and family psychiatric history. Dr. Johnson agreed that medication evaluation would be appropriate given symptom severity and duration.',
    recommendations: '1. Refer client to Dr. Johnson for psychiatric evaluation\n2. Continue weekly therapy while client starts medication (if prescribed)\n3. Coordinate care with Dr. Johnson regarding client\'s progress\n4. Monitor for medication side effects and report to psychiatrist\n5. Dr. Johnson will see client within 2 weeks\n6. Plan for collaborative treatment approach'
  },

  // ==========================================================================
  // CONTACT NOTE TEST DATA
  // ==========================================================================

  contactNote: {
    type: 'Phone Call',
    method: 'Outbound Call',
    duration: '10 minutes',
    summary: 'Called client to follow up on missed appointment from yesterday. Client apologized and stated they forgot about the appointment due to being overwhelmed with job interview. Client sounded upbeat and excited about interview. We discussed the importance of maintaining therapy schedule especially during stressful times. Client agreed and rescheduled for tomorrow. Also briefly checked in on anxiety symptoms - client reports managing well with techniques learned in therapy.',
    followUp: 'Appointment scheduled for tomorrow at 2 PM. Will assess need for additional support around job interview stress. Consider adjusting appointment reminders if client continues to have scheduling difficulties.'
  },

  // ==========================================================================
  // TERMINATION NOTE TEST DATA
  // ==========================================================================

  terminationNote: {
    reason: 'Client has successfully met all treatment goals and is ready for discharge from therapy. Mutual agreement between client and therapist that treatment objectives have been achieved.',
    type: 'Treatment Completed',
    progressSummary: 'Client entered treatment 6 months ago with significant anxiety and depression symptoms. Over the course of treatment, client has:\n\n- Reduced anxiety symptoms from 8/10 to 2/10\n- Eliminated anxiety attacks (from 3-4 per week to none in past month)\n- Improved sleep from 4-5 hours to consistent 7-8 hours nightly\n- Re-engaged in social activities and hobbies\n- Successfully found new employment\n- Developed strong coping skills using CBT techniques\n- Demonstrated ability to identify and challenge cognitive distortions\n- Reports mood as "good" or "great" most days\n- Has strong support system and relapse prevention plan\n\nClient was engaged throughout treatment, completed homework assignments consistently, and applied therapeutic concepts effectively.',
    referrals: 'None needed at this time. Client has contact information for practice if future needs arise.',
    recommendations: '1. Client to continue using coping strategies learned in therapy\n2. Maintain regular sleep schedule and self-care practices\n3. Stay connected with support system\n4. Monitor for return of symptoms\n5. Return to therapy if symptoms re-emerge or new stressors arise\n6. Client knows they can contact us anytime if support is needed\n7. Provided relapse prevention plan handout\n8. Encouraged client to view therapy as resource available for future use'
  },

  // ==========================================================================
  // MISCELLANEOUS NOTE TEST DATA
  // ==========================================================================

  miscellaneousNote: {
    type: 'Administrative Note',
    content: 'Updated emergency contact information in client file. Client requested change of emergency contact from mother to sister due to mother being out of country for extended period. Verified sister\'s contact information (555-0123). Updated crisis plan accordingly. Client also updated address - moved to new apartment closer to family. Address on file has been updated in system.'
  },

  // ==========================================================================
  // GROUP THERAPY NOTE TEST DATA
  // ==========================================================================

  groupTherapyNote: {
    groupName: 'Anxiety Management Skills Group',
    groupSize: '8 participants',
    topic: 'Introduction to Mindfulness and Present-Moment Awareness',
    activities: '1. Opening check-in (10 min): Each member shared their week and current anxiety level\n2. Psychoeducation (15 min): Presented material on mindfulness and its benefits for anxiety management\n3. Guided practice (20 min): Led group through body scan meditation\n4. Processing (10 min): Group discussed their experience with the meditation\n5. Homework assignment (5 min): Practice 5-minute mindfulness exercise daily\n\nUsed handouts on mindfulness basics. All members participated actively.',
    clientParticipation: 'Client actively participated in all aspects of group. Shared during check-in about recent anxiety around work presentation. Engaged well in mindfulness exercise - reported feeling "calmer than I have in weeks" afterward. Asked thoughtful questions about how to maintain mindfulness during stressful moments. Connected well with other group members, offering support to another member struggling with similar work-related stress.',
    clientProgress: 'Client continues to benefit from group setting. Shows increased comfort with self-disclosure and offering support to peers. Demonstrates good understanding of anxiety management concepts presented. Application of skills outside of group appears to be improving based on client\'s reports. Client\'s engagement and willingness to practice new techniques is notable. Recommend continued participation in group for mutual support and skill development.'
  },

  // ==========================================================================
  // ICD-10 CODES FOR TESTING
  // ==========================================================================

  icd10Codes: [
    { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
    { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' },
    { code: 'F41.1', description: 'Generalized anxiety disorder' },
    { code: 'F41.0', description: 'Panic disorder' },
    { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified' },
    { code: 'F43.21', description: 'Adjustment disorder with depressed mood' },
    { code: 'F60.3', description: 'Borderline personality disorder' },
    { code: 'F90.2', description: 'Attention-deficit hyperactivity disorder, combined type' }
  ],

  // ==========================================================================
  // CPT CODES FOR TESTING
  // ==========================================================================

  cptCodes: [
    { code: '90791', description: 'Psychiatric diagnostic evaluation' },
    { code: '90832', description: 'Psychotherapy, 30 minutes' },
    { code: '90834', description: 'Psychotherapy, 45 minutes' },
    { code: '90837', description: 'Psychotherapy, 60 minutes' },
    { code: '90853', description: 'Group psychotherapy' },
    { code: '99354', description: 'Prolonged service' }
  ]
};

// ==========================================================================
// ROUTES
// ==========================================================================

export const ROUTES = {
  MY_NOTES: '/clinical-notes/my-notes',
  COSIGN_QUEUE: '/clinical-notes/cosign-queue',
  COMPLIANCE_DASHBOARD: '/clinical-notes/compliance',
  CLIENT_NOTES: '/clients',
  CREATE_NOTE: '/clinical-notes/create',
  EDIT_NOTE: '/clinical-notes/edit',
  NOTE_DETAIL: '/clients/:clientId/notes',
  UNLOCK_REQUESTS_QUEUE: '/clinical-notes/unlock-requests'
};

// ==========================================================================
// API ENDPOINTS
// ==========================================================================

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/login',

  // Users
  CREATE_USER: '/api/v1/users',

  // Clients
  CREATE_CLIENT: '/api/v1/clients',
  DELETE_CLIENT: '/api/v1/clients',

  // Appointments
  CREATE_APPOINTMENT: '/api/v1/appointments',

  // Clinical Notes
  MY_NOTES: '/api/v1/clinical-notes/my-notes',
  CLIENT_NOTES: '/api/v1/clinical-notes/client',
  CREATE_NOTE: '/api/v1/clinical-notes',
  GET_NOTE: '/api/v1/clinical-notes',
  UPDATE_NOTE: '/api/v1/clinical-notes',
  DELETE_NOTE: '/api/v1/clinical-notes',

  // Signing & Co-signing
  SIGN_NOTE: '/api/v1/clinical-notes/:id/sign',
  COSIGN_NOTE: '/api/v1/clinical-notes/:id/cosign',
  COSIGN_QUEUE: '/api/v1/supervision/cosign-queue',

  // Revision Workflow
  RETURN_FOR_REVISION: '/api/v1/clinical-notes/:id/return-for-revision',
  RESUBMIT_FOR_REVIEW: '/api/v1/clinical-notes/:id/resubmit-for-review',

  // Validation
  VALIDATION_RULES: '/api/v1/clinical-notes/validation-rules',
  VALIDATE_NOTE: '/api/v1/clinical-notes/validate',
  VALIDATION_SUMMARY: '/api/v1/clinical-notes/validation-summary',

  // Business Rules
  ELIGIBLE_APPOINTMENTS: '/api/v1/clinical-notes/client/:clientId/eligible-appointments',
  INHERITED_DIAGNOSES: '/api/v1/clinical-notes/client/:clientId/inherited-diagnoses',
  CLIENT_DIAGNOSIS: '/api/v1/clinical-notes/client/:clientId/diagnosis',
  TREATMENT_PLAN_STATUS: '/api/v1/clinical-notes/client/:clientId/treatment-plan-status',

  // Compliance
  COMPLIANCE_DASHBOARD: '/api/v1/clinical-notes/compliance/dashboard',
  APPOINTMENTS_WITHOUT_NOTES: '/api/v1/clinical-notes/compliance/appointments-without-notes',

  // Amendments
  CREATE_AMENDMENT: '/api/v1/amendments',
  GET_AMENDMENTS: '/api/v1/amendments/note',

  // Outcome Measures
  CREATE_OUTCOME_MEASURE: '/api/v1/outcome-measures',
  GET_OUTCOME_MEASURES: '/api/v1/outcome-measures/note',

  // Billing
  BILLING_READINESS: '/api/v1/clinical-notes/:id/billing-readiness',

  // Lock/Unlock Workflow
  LOCK_NOTE: '/api/v1/clinical-notes',
  UNLOCK_NOTE: '/api/v1/clinical-notes',
  REQUEST_UNLOCK: '/api/v1/clinical-notes',
  APPROVE_UNLOCK: '/api/v1/clinical-notes/unlock-requests/approve',
  REJECT_UNLOCK: '/api/v1/clinical-notes/unlock-requests/reject',
  UNLOCK_REQUESTS: '/api/v1/clinical-notes/unlock-requests',

  // Audit Log
  AUDIT_LOG: '/api/v1/audit-log',

  // Notifications
  NOTIFICATIONS: '/api/v1/notifications',
  MARK_ALL_READ: '/api/v1/notifications/mark-all-read',
  NOTIFICATION_PREFERENCES: '/api/v1/notifications/preferences',
  TRIGGER_OVERDUE_NOTIFICATIONS: '/api/v1/notifications/trigger-overdue',

  // Search & Export
  SEARCH_NOTES: '/api/v1/clinical-notes/search',
  SAVE_SEARCH_PRESET: '/api/v1/search-presets',
  SEARCH_PRESETS: '/api/v1/search-presets',
  EXPORT_SEARCH_RESULTS: '/api/v1/clinical-notes/export',
  EXPORT_NOTE: '/api/v1/clinical-notes/:id/export'
};

// ==========================================================================
// UI SELECTORS
// ==========================================================================

export const SELECTORS = {
  // Login
  LOGIN_EMAIL: '[name="email"]',
  LOGIN_PASSWORD: '[name="password"]',
  LOGIN_SUBMIT: '[type="submit"]',
  USER_MENU: '[data-testid="user-menu"]',
  LOGOUT_BUTTON: '[data-testid="logout-button"]',

  // Statistics
  STATS_TOTAL: '[data-stat="total"]',
  STATS_DRAFT: '[data-stat="draft"]',
  STATS_SIGNED: '[data-stat="signed"]',
  STATS_PENDING_COSIGN: '[data-stat="pending-cosign"]',
  STATS_COSIGNED: '[data-stat="cosigned"]',
  STATS_LOCKED: '[data-stat="locked"]',
  STATS_OVERDUE: '[data-stat="overdue"]',

  // Lists & Tables
  NOTES_LIST: '[data-testid="notes-list"]',
  NOTE_LIST_ITEM: '[data-testid="note-item"]',
  NOTE_DATE: '[data-testid="note-date"]',
  NOTE_CLIENT_NAME: '[data-testid="note-client-name"]',
  NOTE_STATUS_BADGE: '[data-testid="note-status-badge"]',

  // Buttons
  CREATE_NOTE_BUTTON: '[data-testid="create-note-button"]',
  SAVE_DRAFT_BUTTON: '[data-testid="save-draft-button"]',
  SIGN_NOTE_BUTTON: '[data-testid="sign-note-button"]',
  COSIGN_NOTE_BUTTON: '[data-testid="cosign-note-button"]',
  DELETE_BUTTON: '[data-testid="delete-button"]',
  CONFIRM_DELETE_BUTTON: '[data-testid="confirm-delete-button"]',
  CREATE_APPOINTMENT_BUTTON: '[data-testid="create-appointment-button"]',
  CREATE_APPOINTMENT_SUBMIT: '[data-testid="create-appointment-submit"]',
  CLEAR_FILTERS_BUTTON: '[data-testid="clear-filters-button"]',

  // Note Type Selector
  NOTE_TYPE_SELECTOR: '[data-testid="note-type-selector"]',

  // Form Fields - Common
  SESSION_DATE: '[name="sessionDate"]',
  SESSION_START_TIME: '[name="sessionStartTime"]',
  SESSION_END_TIME: '[name="sessionEndTime"]',
  SESSION_DURATION: '[name="sessionDuration"]',

  // Form Fields - Intake Assessment
  PRESENTING_PROBLEM: '[name="presentingProblem"]',
  CHIEF_COMPLAINT: '[name="chiefComplaint"]',
  SYMPTOM_ONSET: '[name="symptomOnset"]',
  PSYCHIATRIC_HISTORY: '[name="psychiatricHistory"]',
  MEDICAL_HISTORY: '[name="medicalHistory"]',
  SUBSTANCE_USE_HISTORY: '[name="substanceUseHistory"]',
  FAMILY_HISTORY: '[name="familyHistory"]',
  SOCIAL_HISTORY: '[name="socialHistory"]',

  // Mental Status Exam
  MSE_APPEARANCE: '[name="mseAppearance"]',
  MSE_BEHAVIOR: '[name="mseBehavior"]',
  MSE_SPEECH: '[name="mseSpeech"]',
  MSE_MOOD: '[name="mseMood"]',
  MSE_AFFECT: '[name="mseAffect"]',
  MSE_THOUGHT_PROCESS: '[name="mseThoughtProcess"]',
  MSE_THOUGHT_CONTENT: '[name="mseThoughtContent"]',
  MSE_PERCEPTION: '[name="msePerception"]',
  MSE_COGNITION: '[name="mseCognition"]',
  MSE_INSIGHT: '[name="mseInsight"]',
  MSE_JUDGMENT: '[name="mseJudgment"]',

  // Risk Assessment
  SUICIDAL_IDEATION: '[name="suicidalIdeation"]',
  SUICIDAL_PLAN: '[name="suicidalPlan"]',
  HOMICIDAL_IDEATION: '[name="homicidalIdeation"]',
  SELF_HARM: '[name="selfHarm"]',
  RISK_LEVEL_SELECT: '[name="riskLevel"]',
  RISK_ASSESSMENT_DETAILS: '[name="riskAssessmentDetails"]',
  RISK_ASSESSMENT_SECTION: '[data-testid="risk-assessment-section"]',
  INTERVENTIONS_TAKEN: '[name="interventionsTaken"]',

  // SOAP Note Fields
  SUBJECTIVE: '[name="subjective"]',
  OBJECTIVE: '[name="objective"]',
  ASSESSMENT: '[name="assessment"]',
  PLAN: '[name="plan"]',

  // Diagnosis & Treatment
  ICD10_AUTOCOMPLETE: '[data-testid="icd10-autocomplete"]',
  AUTOCOMPLETE_OPTIONS: '[data-testid="autocomplete-options"]',
  AUTOCOMPLETE_OPTION_FIRST: '[data-testid="autocomplete-option"]:first-child',
  AUTOCOMPLETE_NO_RESULTS: '[data-testid="autocomplete-no-results"]',
  DIAGNOSIS_NOTES: '[name="diagnosisNotes"]',
  INHERITED_DIAGNOSES: '[data-testid="inherited-diagnoses"]',
  TREATMENT_GOALS: '[name="treatmentGoals"]',
  TREATMENT_GOALS_DETAILED: '[name="treatmentGoalsDetailed"]',
  TREATMENT_OBJECTIVES: '[name="treatmentObjectives"]',
  TREATMENT_INTERVENTIONS: '[name="treatmentInterventions"]',
  TREATMENT_FREQUENCY: '[name="treatmentFrequency"]',
  TREATMENT_DURATION: '[name="treatmentDuration"]',
  DISCHARGE_CRITERIA: '[name="dischargeCriteria"]',
  INTERVENTIONS_PLANNED: '[name="interventionsPlanned"]',
  TREATMENT_MODALITIES: '[name="treatmentModalities"]',
  PROGRESS_TOWARD_GOALS: '[name="progressTowardGoals"]',
  INTERVENTIONS_USED: '[name="interventionsUsed"]',

  // Next Session
  NEXT_SESSION_PLAN: '[name="nextSessionPlan"]',
  NEXT_SESSION_DATE: '[name="nextSessionDate"]',

  // Billing
  CPT_CODE_AUTOCOMPLETE: '[data-testid="cpt-code-autocomplete"]',
  BILLABLE_CHECKBOX: '[name="billable"]',

  // Signature Modal
  SIGNATURE_MODAL: '[data-testid="signature-modal"]',
  SIGNATURE_PIN_INPUT: '[name="pin"]',
  SIGNATURE_PASSWORD_INPUT: '[name="password"]',
  SIGNATURE_USE_PASSWORD_TAB: '[data-testid="use-password-tab"]',
  SIGNATURE_SUBMIT_BUTTON: '[data-testid="signature-submit-button"]',
  SUPERVISOR_COMMENTS: '[name="supervisorComments"]',
  SUPERVISOR_COMMENTS_DISPLAY: '[data-testid="supervisor-comments-display"]',

  // Revision Workflow
  RETURN_FOR_REVISION_BUTTON: '[data-testid="return-for-revision-button"]',
  RESUBMIT_FOR_REVIEW_BUTTON: '[data-testid="resubmit-for-review-button"]',
  REVISION_MODAL: '[data-testid="revision-modal"]',
  REVISION_COMMENTS: '[name="revisionComments"]',
  REVISION_COMMENTS_DISPLAY: '[data-testid="revision-comments-display"]',
  REQUIRED_CHANGES_LIST: '[data-testid="required-changes-list"]',
  REVISION_SUBMIT_BUTTON: '[data-testid="revision-submit-button"]',
  REVISION_BANNER: '[data-testid="revision-banner"]',

  // Amendment
  CREATE_AMENDMENT_BUTTON: '[data-testid="create-amendment-button"]',
  AMENDMENT_MODAL: '[data-testid="amendment-modal"]',
  AMENDMENT_REASON: '[name="amendmentReason"]',
  AMENDMENT_CHANGE_DESCRIPTION: '[name="amendmentChangeDescription"]',
  AMENDMENT_SUBMIT_BUTTON: '[data-testid="amendment-submit-button"]',
  AMENDMENT_HISTORY_TAB: '[data-testid="amendment-history-tab"]',
  AMENDMENT_HISTORY_LIST: '[data-testid="amendment-history-list"]',
  AMENDMENT_HISTORY_ITEM: '[data-testid="amendment-history-item"]',
  AMENDMENT_REASON_DISPLAY: '[data-testid="amendment-reason-display"]',
  AMENDMENT_CHANGE_DISPLAY: '[data-testid="amendment-change-display"]',
  AMENDMENT_DATE: '[data-testid="amendment-date"]',
  AMENDMENT_AUTHOR: '[data-testid="amendment-author"]',
  AMENDMENT_INDICATOR: '[data-testid="amendment-indicator"]',

  // Outcome Measures
  ADD_OUTCOME_MEASURE_BUTTON: '[data-testid="add-outcome-measure-button"]',
  OUTCOME_MEASURE_TYPE: '[name="measureType"]',
  OUTCOME_MEASURE_SCORE: '[name="score"]',
  OUTCOME_MEASURE_NOTES: '[name="measureNotes"]',
  OUTCOME_MEASURE_SUBMIT: '[data-testid="outcome-measure-submit"]',
  OUTCOME_MEASURES_TAB: '[data-testid="outcome-measures-tab"]',
  OUTCOME_MEASURE_ITEM: '[data-testid="outcome-measure-item"]',
  OUTCOME_MEASURES_CHART: '[data-testid="outcome-measures-chart"]',
  OUTCOME_MEASURES_TREND_TAB: '[data-testid="outcome-measures-trend-tab"]',

  // Validation
  VALIDATION_ERROR: '[data-testid="validation-error"]',
  VALIDATION_ERROR_PRESENTING_PROBLEM: '[data-testid="validation-error-presentingProblem"]',
  VALIDATION_ERROR_PHONE: '[data-testid="validation-error-phone"]',
  VALIDATION_ERROR_ITEM: '[data-testid="validation-error-item"]',
  VALIDATION_SUMMARY: '[data-testid="validation-summary"]',
  VALIDATION_ERRORS_LIST: '[data-testid="validation-errors-list"]',

  // Filters & Search
  SEARCH_INPUT: '[data-testid="search-input"]',
  FILTER_STATUS_DRAFT: '[data-testid="filter-status-draft"]',
  FILTER_NOTE_TYPE: '[name="noteTypeFilter"]',
  SORT_BY_SELECT: '[name="sortBy"]',

  // Compliance Dashboard
  COMPLIANCE_OVERDUE: '[data-testid="compliance-overdue"]',
  COMPLIANCE_LOCKED: '[data-testid="compliance-locked"]',
  COMPLIANCE_DRAFTS: '[data-testid="compliance-drafts"]',
  COMPLIANCE_MISSING_NOTES: '[data-testid="compliance-missing-notes"]',
  COMPLIANCE_OVERDUE_SECTION: '[data-testid="compliance-overdue-section"]',
  COMPLIANCE_LOCKED_SECTION: '[data-testid="compliance-locked-section"]',
  COMPLIANCE_DRAFTS_SECTION: '[data-testid="compliance-drafts-section"]',
  COMPLIANCE_MISSING_NOTES_SECTION: '[data-testid="compliance-missing-notes-section"]',
  COMPLIANCE_AWAITING_COSIGN_SECTION: '[data-testid="compliance-awaiting-cosign-section"]',
  COMPLIANCE_AWAITING_COSIGN_COUNT: '[data-testid="compliance-awaiting-cosign-count"]',
  COMPLIANCE_OVERDUE_ITEM: '[data-testid="compliance-overdue-item"]',
  COMPLIANCE_LOCKED_ITEM: '[data-testid="compliance-locked-item"]',
  COMPLIANCE_DRAFT_ITEM: '[data-testid="compliance-draft-item"]',
  COMPLIANCE_MISSING_ITEM: '[data-testid="compliance-missing-item"]',
  COMPLIANCE_URGENT_ITEM: '[data-testid="compliance-urgent-item"]',
  CREATE_NOTE_FROM_APPOINTMENT_BUTTON: '[data-testid="create-note-from-appointment-button"]',

  // Cosign Queue
  COSIGN_PENDING_COUNT: '[data-testid="cosign-pending-count"]',
  COSIGN_URGENT_COUNT: '[data-testid="cosign-urgent-count"]',
  COSIGN_CLINICIANS_COUNT: '[data-testid="cosign-clinicians-count"]',

  // Miscellaneous
  ERROR_MESSAGE: '[data-testid="error-message"]',
  SUCCESS_MESSAGE: '[data-testid="success-message"]',
  EDIT_LOCKED_MESSAGE: '[data-testid="edit-locked-message"]',
  LOCKED_BADGE: '[data-testid="locked-badge"]',
  DAYS_SINCE: '[data-testid="days-since"]',
  APPOINTMENT_DATE_INPUT: '[name="appointmentDate"]',
  APPOINTMENT_START_TIME: '[name="startTime"]',
  APPOINTMENT_END_TIME: '[name="endTime"]',
  EDIT_NOTE_BUTTON: '[data-testid="edit-note-button"]',
  NOTE_LOCKED_INDICATOR: '[data-testid="note-locked-indicator"]',

  // Lock/Unlock Workflow
  REQUEST_UNLOCK_BUTTON: '[data-testid="request-unlock-button"]',
  UNLOCK_REASON_INPUT: '[name="unlockReason"]',
  UNLOCK_REQUEST_SUBMIT: '[data-testid="unlock-request-submit"]',
  APPROVE_UNLOCK_BUTTON: '[data-testid="approve-unlock-button"]',
  REJECT_UNLOCK_BUTTON: '[data-testid="reject-unlock-button"]',
  UNLOCK_DURATION_HOURS: '[name="unlockDurationHours"]',
  APPROVE_UNLOCK_SUBMIT: '[data-testid="approve-unlock-submit"]',
  UNLOCK_REJECTION_REASON: '[name="unlockRejectionReason"]',
  REJECT_UNLOCK_SUBMIT: '[data-testid="reject-unlock-submit"]',
  UNLOCK_REQUEST_MODAL: '[data-testid="unlock-request-modal"]',
  UNLOCK_STATUS_BADGE: '[data-testid="unlock-status-badge"]',
  UNLOCK_EXPIRY_TIME: '[data-testid="unlock-expiry-time"]',

  // Note Type Specific Fields
  CANCELLATION_REASON: '[name="cancellationReason"]',
  CANCELLATION_TYPE: '[name="cancellationType"]',
  CANCELLATION_INITIATED_BY: '[name="cancellationInitiatedBy"]',
  CANCELLATION_NOTES: '[name="cancellationNotes"]',

  CONSULTATION_REASON: '[name="consultationReason"]',
  CONSULTATION_PARTICIPANTS: '[name="consultationParticipants"]',
  CONSULTATION_SUMMARY: '[name="consultationSummary"]',
  CONSULTATION_RECOMMENDATIONS: '[name="consultationRecommendations"]',

  CONTACT_TYPE: '[name="contactType"]',
  CONTACT_METHOD: '[name="contactMethod"]',
  CONTACT_DURATION: '[name="contactDuration"]',
  CONTACT_SUMMARY: '[name="contactSummary"]',
  CONTACT_FOLLOW_UP: '[name="contactFollowUp"]',
  CONTACT_PHONE: '[name="contactPhone"]',

  TERMINATION_REASON: '[name="terminationReason"]',
  TERMINATION_TYPE: '[name="terminationType"]',
  TERMINATION_PROGRESS_SUMMARY: '[name="terminationProgressSummary"]',
  TERMINATION_REFERRALS: '[name="terminationReferrals"]',
  TERMINATION_RECOMMENDATIONS: '[name="terminationRecommendations"]',

  MISC_NOTE_TYPE: '[name="miscNoteType"]',
  MISC_CONTENT: '[name="miscContent"]',

  GROUP_NAME: '[name="groupName"]',
  GROUP_SIZE: '[name="groupSize"]',
  GROUP_TOPIC: '[name="groupTopic"]',
  GROUP_ACTIVITIES: '[name="groupActivities"]',
  GROUP_CLIENT_PARTICIPATION: '[name="groupClientParticipation"]',
  GROUP_CLIENT_PROGRESS: '[name="groupClientProgress"]',

  // Notifications
  NOTIFICATIONS_ICON: '[data-testid="notifications-icon"]',
  NOTIFICATIONS_PANEL: '[data-testid="notifications-panel"]',
  NOTIFICATION_ITEM: '[data-testid="notification-item"]',
  NOTIFICATION_BADGE: '[data-testid="notification-badge"]',
  MARK_ALL_READ_BUTTON: '[data-testid="mark-all-read-button"]',
  EMAIL_OVERDUE_NOTES_CHECKBOX: '[name="emailOverdueNotes"]',
  SAVE_PREFERENCES_BUTTON: '[data-testid="save-preferences-button"]',

  // Advanced Search & Export
  ADVANCED_SEARCH_TOGGLE: '[data-testid="advanced-search-toggle"]',
  DIAGNOSIS_CODE_FILTER: '[name="diagnosisCodeFilter"]',
  CPT_CODE_SELECT: '[name="cptCodeSelect"]',
  SEARCH_RESULTS_LIST: '[data-testid="search-results-list"]',
  SEARCH_PRESET_DROPDOWN: '[data-testid="search-preset-dropdown"]',
  EXPORT_PDF_BUTTON: '[data-testid="export-pdf-button"]'
};
