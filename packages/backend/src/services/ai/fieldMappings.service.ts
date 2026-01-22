/**
 * Field Mappings for AI-Generated Clinical Notes
 * Maps AI-generated content to specific form fields with proper types
 *
 * IMPORTANT: These options MUST match the exact values in frontend form components:
 * - packages/frontend/src/pages/ClinicalNotes/Forms/*.tsx
 *
 * Last synchronized: 2026-01-06
 */

export interface FieldMapping {
  [noteType: string]: {
    [fieldName: string]: {
      type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'number' | 'date';
      options?: string[];  // For select/multiselect/radio
      description: string;
    };
  };
}

export const FIELD_MAPPINGS: FieldMapping = {
  'Progress Note': {
    // Session Information
    sessionDate: { type: 'date', description: 'Session date in YYYY-MM-DD format' },
    sessionDuration: { type: 'select', options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'], description: 'Session duration - select exact option' },
    // SYNCED with ProgressNoteForm.tsx SESSION_TYPES
    sessionType: { type: 'select', options: ['Individual', 'Couples', 'Family', 'Group'], description: 'Session type - select exact option' },
    // SYNCED with ProgressNoteForm.tsx LOCATIONS
    location: { type: 'select', options: ['Office', 'Telehealth', 'Home', 'School', 'Other'], description: 'Session location - select exact option' },

    // Current Symptoms - MUST be an OBJECT mapping symptom name to severity level
    // Frontend expects: { "Depression": "Moderate", "Anxiety": "Mild" }
    // SEVERITIES: None, Mild, Moderate, Severe
    symptoms: { type: 'multiselect', options: ['Depression', 'Anxiety', 'Irritability', 'Sleep problems', 'Appetite changes', 'Suicidal ideation', 'Homicidal ideation', 'Substance use', 'Panic', 'Obsessions/compulsions', 'Trauma symptoms'], description: 'IMPORTANT: Return as OBJECT with symptom names as keys and severity levels (None/Mild/Moderate/Severe) as values. Example: {"Depression": "Moderate", "Anxiety": "Mild"}' },

    // Progress Tracking - SYNCED with ProgressNoteForm.tsx PROGRESS_LEVELS
    // Goals MUST be an ARRAY of goal objects with specific structure
    progressLevel: { type: 'select', options: ['No Progress', 'Minimal Progress', 'Moderate Progress', 'Significant Progress', 'Goal Achieved'], description: 'Overall progress toward treatment goals' },
    goals: { type: 'textarea', description: 'IMPORTANT: Return as ARRAY of goal objects. Each object MUST have: goalDescription (string), progressLevel (No Progress/Minimal Progress/Moderate Progress/Significant Progress/Goal Achieved), notes (string). Example: [{"goalDescription": "Reduce anxiety", "progressLevel": "Moderate Progress", "notes": "Client reports..."}]' },

    // Mental Status - SYNCED with ProgressNoteForm.tsx
    // APPEARANCES
    appearance: { type: 'select', options: ['Well-groomed', 'Disheveled', 'Appropriate'], description: 'Client appearance - select exact option' },
    mood: { type: 'text', description: 'Client-reported mood (free text, e.g., "anxious but hopeful")' },
    // AFFECTS
    affect: { type: 'select', options: ['Appropriate', 'Flat', 'Restricted', 'Labile'], description: 'Observed affect - select exact option' },
    // THOUGHT_PROCESSES
    thoughtProcess: { type: 'select', options: ['Logical', 'Tangential', 'Disorganized'], description: 'Thought process - select exact option' },

    // Risk Assessment - Frontend expects BOOLEAN values for ideation fields
    // Return true if any level of ideation present, false if "None"
    suicidalIdeation: { type: 'checkbox', description: 'Suicidal ideation - return TRUE if any ideation present (passive, active, etc.), FALSE if none' },
    homicidalIdeation: { type: 'checkbox', description: 'Homicidal ideation - return TRUE if present, FALSE if none' },
    riskLevel: { type: 'select', options: ['None', 'Low', 'Moderate', 'High'], description: 'Overall risk level - select exact option' },

    // Interventions - MUST be an OBJECT mapping intervention name to boolean
    // Frontend expects: { "CBT techniques": true, "DBT skills": true }
    interventionsUsed: { type: 'multiselect', options: ['CBT techniques', 'DBT skills', 'Psychoeducation', 'Supportive therapy', 'Mindfulness', 'Relaxation training', 'Problem-solving', 'Exposure therapy', 'Behavioral activation'], description: 'IMPORTANT: Return as OBJECT with intervention names as keys and true/false as values. Example: {"CBT techniques": true, "Psychoeducation": true}' },
    otherIntervention: { type: 'text', description: 'Other intervention used (specify) - free text' },

    // Client Response - SYNCED with ProgressNoteForm.tsx
    // ENGAGEMENT_LEVELS
    engagementLevel: { type: 'select', options: ['Highly engaged', 'Moderately engaged', 'Minimally engaged', 'Resistant'], description: 'Client engagement level - select exact option' },
    // RESPONSE_LEVELS
    responseToInterventions: { type: 'select', options: ['Very responsive', 'Moderately responsive', 'Minimal response', 'No response'], description: 'Client response to interventions - select exact option' },
    responseNotes: { type: 'textarea', description: 'Detailed response notes - free text' },
    // HOMEWORK_COMPLIANCE
    homeworkCompliance: { type: 'select', options: ['Completed', 'Partially completed', 'Not completed', 'N/A'], description: 'Homework compliance - select exact option' },
    clientResponseNotes: { type: 'textarea', description: 'Additional notes on client response - free text' },

    // SOAP Notes - All free text
    subjective: { type: 'textarea', description: 'Subjective: Client-reported information, symptoms, concerns, mood, experiences since last session' },
    objective: { type: 'textarea', description: 'Objective: Observable behaviors, mental status exam findings, appearance, affect, speech patterns' },
    assessment: { type: 'textarea', description: 'Assessment: Clinical impressions, symptom severity analysis, progress evaluation, treatment response' },
    plan: { type: 'textarea', description: 'Plan: Interventions used, homework assigned, next session plans, treatment frequency, any referrals' },
  },

  'Intake Assessment': {
    // Session Information
    sessionDate: { type: 'date', description: 'Intake session date' },

    // Presenting Problem
    chiefComplaint: { type: 'textarea', description: 'Chief complaint in client\'s exact words - what they say is the main reason for seeking therapy' },
    presentingProblem: { type: 'textarea', description: 'Detailed narrative describing the presenting problem, including onset, duration, frequency, intensity, triggers, and impact on functioning' },
    // SYNCED with IntakeAssessmentForm.tsx SYMPTOMS array (complex with 32 definitions)
    selectedSymptoms: { type: 'multiselect', options: ['Depression', 'Anxiety', 'Panic Attacks', 'Insomnia', 'Nightmares', 'Flashbacks', 'Mood Swings', 'Irritability', 'Social Withdrawal', 'Concentration Problems', 'Memory Problems', 'Eating Problems', 'Substance Use', 'Suicidal Thoughts', 'Self-Harm', 'Other'], description: 'List of current symptoms client is experiencing (select all that apply)' },

    // Clinical History - MUST BE POPULATED
    psychiatricHistory: { type: 'textarea', description: 'REQUIRED: Previous mental health diagnoses, past therapy/counseling, psychiatric hospitalizations, medications tried, what worked/didn\'t work. If none, write "No prior psychiatric treatment"' },
    medicalHistory: { type: 'textarea', description: 'REQUIRED: Medical conditions, surgeries, chronic illnesses, head injuries, seizures, allergies. If none, write "No significant medical history"' },
    medications: { type: 'textarea', description: 'REQUIRED: All current medications with dosages, frequency, and what they\'re for. If none, write "No current medications"' },
    familyHistory: { type: 'textarea', description: 'REQUIRED: Family history of mental illness, substance abuse, suicide, medical conditions. Include which family members. If unknown, write "Family history unknown"' },
    socialHistory: { type: 'textarea', description: 'REQUIRED: Education level, employment status, relationship status, living situation, children, support system, significant life events. This is critical contextual information' },
    // SYNCED with IntakeAssessmentForm.tsx SUBSTANCE_FREQUENCY
    substanceUse: { type: 'textarea', description: 'REQUIRED: Detailed history of alcohol, tobacco, marijuana, other drugs - type, amount, frequency, duration, last use, impact on life. If none, write "Denies substance use"' },

    // Mental Status Exam - SYNCED with IntakeAssessmentForm.tsx
    // GROOMING_OPTIONS
    appearance: { type: 'select', options: ['Well-groomed', 'Disheveled', 'Unkempt', 'Appropriate'], description: 'Appearance' },
    // COOPERATION_OPTIONS
    behavior: { type: 'select', options: ['Cooperative', 'Guarded', 'Uncooperative', 'Resistant'], description: 'Behavior' },
    // SPEECH_RATE_OPTIONS combined
    speech: { type: 'select', options: ['Normal', 'Slow', 'Rapid', 'Pressured'], description: 'Speech' },
    mood: { type: 'text', description: 'Mood (subjective)' },
    // AFFECT_RANGE_OPTIONS + AFFECT_QUALITY_OPTIONS
    affectRange: { type: 'select', options: ['Full', 'Restricted', 'Blunted', 'Flat'], description: 'Affect range' },
    affectQuality: { type: 'select', options: ['Euthymic', 'Depressed', 'Anxious', 'Irritable', 'Euphoric', 'Angry'], description: 'Affect quality' },
    affectAppropriateness: { type: 'select', options: ['Appropriate', 'Inappropriate'], description: 'Affect appropriateness' },
    // THOUGHT_ORGANIZATION_OPTIONS
    thoughtProcess: { type: 'select', options: ['Logical', 'Circumstantial', 'Tangential', 'Loose', 'Disorganized', 'Flight of Ideas'], description: 'Thought process' },
    thoughtContent: { type: 'textarea', description: 'Thought content (delusions, obsessions, preoccupations)' },
    // Perceptual - HALLUCINATION_TYPES
    perceptualDisturbances: { type: 'multiselect', options: ['None', 'Auditory', 'Visual', 'Tactile', 'Olfactory', 'Gustatory'], description: 'Perceptual disturbances' },
    // Cognitive - ATTENTION_OPTIONS, MEMORY_OPTIONS, etc.
    attention: { type: 'select', options: ['Intact', 'Impaired', 'Distractible'], description: 'Attention' },
    concentration: { type: 'select', options: ['Intact', 'Impaired'], description: 'Concentration' },
    memory: { type: 'select', options: ['Intact', 'Impaired'], description: 'Memory' },
    cognition: { type: 'text', description: 'Cognition summary' },
    // INSIGHT_OPTIONS
    insight: { type: 'select', options: ['Good', 'Fair', 'Poor', 'None'], description: 'Insight' },
    // JUDGMENT_OPTIONS
    judgment: { type: 'select', options: ['Good', 'Fair', 'Poor', 'Impaired'], description: 'Judgment' },
    // IMPULSE_CONTROL_OPTIONS
    impulseControl: { type: 'select', options: ['Good', 'Fair', 'Poor', 'Impaired'], description: 'Impulse control' },

    // Risk Assessment - SYNCED with IntakeAssessmentForm.tsx RISK_LEVELS
    suicidalIdeation: { type: 'select', options: ['None', 'Passive', 'Active without plan', 'Active with plan'], description: 'Suicidal ideation' },
    suicidalHistory: { type: 'textarea', description: 'History of suicidal behavior' },
    homicidalIdeation: { type: 'select', options: ['None', 'Present'], description: 'Homicidal ideation' },
    selfHarm: { type: 'select', options: ['None', 'Current', 'Past'], description: 'Self-harm behaviors' },
    riskLevel: { type: 'select', options: ['None', 'Low', 'Moderate', 'High', 'Imminent'], description: 'Overall risk level' },
    safetyPlan: { type: 'textarea', description: 'Safety plan (if needed)' },

    // Clinical Assessment (NOT diagnosis codes - this is clinical impressions/analysis)
    assessment: { type: 'textarea', description: 'Clinical Assessment: Your professional clinical impressions, analysis of symptoms, functional impairment, clinical picture, medical necessity. DO NOT put ICD-10 codes here.' },

    // Diagnoses (ICD-10 Codes) - SEPARATE from assessment
    provisionalDiagnoses: { type: 'textarea', description: 'Provisional ICD-10 diagnoses with codes (e.g., F32.1 Major Depressive Disorder, Single Episode, Moderate). Format: CODE + Full diagnosis name' },
    differentialDiagnoses: { type: 'textarea', description: 'Differential diagnoses to rule out with ICD-10 codes' },

    // Treatment Recommendations and Prognosis
    treatmentRecommendations: { type: 'textarea', description: 'REQUIRED: Specific treatment recommendations including therapy type, frequency, medications to consider, referrals needed' },
    referrals: { type: 'textarea', description: 'Specific referrals needed: psychiatry evaluation, medical checkup, psychological testing, specialist consults. If none, write "No referrals needed at this time"' },
    prognosisNote: { type: 'textarea', description: 'REQUIRED: Clinical prognosis - expected treatment outcome, factors affecting prognosis (positive and negative), estimated treatment duration' },
  },

  'Treatment Plan': {
    // Basic Information
    planDate: { type: 'date', description: 'Treatment plan date' },
    reviewDate: { type: 'date', description: 'Next review date' },

    // Diagnoses
    diagnoses: { type: 'textarea', description: 'Current diagnoses with ICD-10 codes' },

    // Problems
    presentingProblems: { type: 'textarea', description: 'List of presenting problems (prioritized)' },

    // Goals (SMART format) - SYNCED with TreatmentPlanForm.tsx GOAL_PROGRESS_OPTIONS
    goals: { type: 'textarea', description: 'Treatment goals (Specific, Measurable, Achievable, Relevant, Time-bound)' },
    objectives: { type: 'textarea', description: 'Objectives (specific steps toward goals)' },
    goalProgress: { type: 'select', options: ['Not Started', 'Minimal Progress', 'Some Progress', 'Moderate Progress', 'Significant Progress', 'Goal Achieved'], description: 'Goal progress status' },

    // Treatment Approach - SYNCED with TreatmentPlanForm.tsx Treatment Modalities (18 options)
    treatmentModality: {
      type: 'multiselect',
      options: [
        'Cognitive Behavioral Therapy (CBT)',
        'Dialectical Behavior Therapy (DBT)',
        'Acceptance and Commitment Therapy (ACT)',
        'EMDR',
        'Psychodynamic Therapy',
        'Solution-Focused Brief Therapy',
        'Motivational Interviewing',
        'Mindfulness-Based Therapy',
        'Trauma-Focused CBT',
        'Interpersonal Therapy (IPT)',
        'Family Systems Therapy',
        'Narrative Therapy',
        'Exposure Therapy',
        'Play Therapy',
        'Art Therapy',
        'Group Therapy',
        'Psychoeducation',
        'Supportive Counseling'
      ],
      description: 'Treatment modalities to be used'
    },
    interventions: { type: 'textarea', description: 'Specific interventions and techniques' },

    // Frequency and Duration - SYNCED with TreatmentPlanForm.tsx
    // SESSION_DURATION_OPTIONS
    sessionDuration: { type: 'select', options: ['30 minutes', '45 minutes', '50 minutes', '60 minutes (1 hour)', '75 minutes', '90 minutes (1.5 hours)', '120 minutes (2 hours)'], description: 'Session duration' },
    // FREQUENCY_OPTIONS
    sessionFrequency: { type: 'select', options: ['Once per week', 'Twice per week', 'Three times per week', 'Every other week (bi-weekly)', 'Once per month', 'As needed'], description: 'Session frequency' },
    // TREATMENT_SETTING_OPTIONS
    treatmentSetting: { type: 'select', options: ['Office', 'Telehealth', 'Home', 'School', 'Hospital', 'Hybrid (Office + Telehealth)'], description: 'Treatment setting' },
    // ESTIMATED_DURATION_OPTIONS
    estimatedDuration: { type: 'select', options: ['6-8 weeks (Short-term)', '3 months', '6 months', '9 months', '12 months (1 year)', '18 months', '2 years or more (Long-term)', 'Ongoing/Indefinite'], description: 'Estimated treatment duration' },

    // Discharge Criteria
    dischargeCriteria: { type: 'textarea', description: 'Criteria for successful discharge' },

    // Strengths and Resources
    clientStrengths: { type: 'textarea', description: 'Client strengths and resources' },
    barriers: { type: 'textarea', description: 'Potential barriers to treatment' },
  },

  'Cancellation Note': {
    cancellationDate: { type: 'date', description: 'Original appointment date' },
    cancellationTime: { type: 'text', description: 'Original appointment time' },
    // SYNCED with CancellationNoteForm.tsx CANCELLED_BY_OPTIONS
    cancelledBy: { type: 'select', options: ['Client', 'Therapist', 'Other'], description: 'Cancelled by' },
    notificationDate: { type: 'date', description: 'When cancellation was received' },
    notificationTime: { type: 'text', description: 'Time cancellation was received' },
    reason: { type: 'text', description: 'Reason for cancellation' },
    // SYNCED with CancellationNoteForm.tsx NOTIFICATION_METHOD_OPTIONS
    notificationMethod: { type: 'select', options: ['Phone', 'Email', 'Text', 'In-person', 'Other'], description: 'How client notified' },
    noticeGiven: { type: 'select', options: ['More than 24 hours', 'Less than 24 hours', 'No-show'], description: 'Notice given' },
    rescheduled: { type: 'checkbox', description: 'Was appointment rescheduled?' },
    newAppointmentDate: { type: 'date', description: 'New appointment date (if rescheduled)' },
    newAppointmentTime: { type: 'text', description: 'New appointment time (if rescheduled)' },
    notes: { type: 'textarea', description: 'Additional notes' },
    billable: { type: 'checkbox', description: 'Is this a billable cancellation?' },
    feeCharged: { type: 'checkbox', description: 'Was cancellation fee charged?' },
    feeAmount: { type: 'number', description: 'Cancellation fee amount' },
  },

  'Consultation Note': {
    sessionDate: { type: 'date', description: 'Consultation date' },
    consultedPerson: { type: 'text', description: 'Name of person consulted' },
    consultedRole: { type: 'select', options: ['Psychiatrist', 'Primary Care Provider', 'School Personnel', 'Case Manager', 'Family Member', 'Other Provider'], description: 'Role of consulted person' },
    organization: { type: 'text', description: 'Organization/practice' },
    consultationMethod: { type: 'select', options: ['Phone', 'Video', 'Email', 'In-person', 'Written correspondence'], description: 'Method of consultation' },
    reasonForConsultation: { type: 'textarea', description: 'Reason for consultation' },
    consentObtained: { type: 'checkbox', description: 'Client consent obtained for sharing information' },
    informationShared: { type: 'textarea', description: 'Information shared with consultant' },
    informationReceived: { type: 'textarea', description: 'Information received from consultant' },
    recommendationsReceived: { type: 'textarea', description: 'Recommendations or suggestions from consultant' },
    followUpActions: { type: 'textarea', description: 'Follow-up actions needed' },
    impactOnTreatment: { type: 'textarea', description: 'How this impacts treatment plan' },
    billable: { type: 'checkbox', description: 'Is this consultation billable?' },
    duration: { type: 'number', description: 'Duration in minutes' },
  },

  'Contact Note': {
    contactDate: { type: 'date', description: 'Contact date' },
    contactTime: { type: 'text', description: 'Contact time' },
    // SYNCED with ContactNoteForm.tsx CONTACT_TYPE_OPTIONS
    contactType: { type: 'select', options: ['Phone', 'Email', 'Text', 'Video', 'Other'], description: 'Type of contact' },
    initiatedBy: { type: 'select', options: ['Client', 'Therapist', 'Family', 'Other provider'], description: 'Who initiated contact' },
    duration: { type: 'number', description: 'Duration in minutes' },
    purpose: { type: 'text', description: 'Purpose of contact' },
    summary: { type: 'textarea', description: 'Summary of contact' },
    clientStatus: { type: 'text', description: 'Brief client status update' },
    riskAssessment: { type: 'select', options: ['Not assessed', 'No concerns', 'Mild concerns', 'Significant concerns'], description: 'Risk assessment (if applicable)' },
    actionTaken: { type: 'textarea', description: 'Actions taken' },
    followUpNeeded: { type: 'checkbox', description: 'Follow-up needed?' },
    followUpPlan: { type: 'textarea', description: 'Follow-up plan' },
    billable: { type: 'checkbox', description: 'Is this contact billable?' },
  },

  'Termination Note': {
    terminationDate: { type: 'date', description: 'Termination date' },
    // SYNCED with TerminationNoteForm.tsx TERMINATION_REASON_OPTIONS
    terminationReason: { type: 'select', options: ['Treatment completed', 'Client request', 'Mutual agreement', 'No-show', 'Moved away', 'Financial reasons', 'Referral to another provider', 'Other'], description: 'Reason for termination' },
    treatmentStartDate: { type: 'date', description: 'When treatment began' },
    totalSessions: { type: 'number', description: 'Total number of sessions completed' },
    treatmentSummary: { type: 'textarea', description: 'Summary of treatment provided' },
    progressAchieved: { type: 'textarea', description: 'Progress and achievements during treatment' },
    goalsStatus: { type: 'textarea', description: 'Status of each treatment goal' },
    currentFunctioning: { type: 'textarea', description: 'Client\'s current level of functioning' },
    finalDiagnosis: { type: 'textarea', description: 'Final diagnosis at discharge' },
    currentStatus: { type: 'text', description: 'Overall current status' },
    aftercareRecommendations: { type: 'textarea', description: 'Recommendations for continued care' },
    referralsMade: { type: 'textarea', description: 'Referrals made (if ongoing care needed)' },
    crisisResources: { type: 'textarea', description: 'Crisis resources provided to client' },
    emergencyPlan: { type: 'textarea', description: 'Emergency/relapse prevention plan' },
    clientReadiness: { type: 'select', options: ['Ready for discharge', 'Somewhat ready', 'Not ready but necessary', 'Client-initiated early'], description: 'Client readiness for discharge' },
    prognosis: { type: 'text', description: 'Prognosis and expected outcome' },
  },

  'Miscellaneous Note': {
    noteDate: { type: 'date', description: 'Date of note' },
    subject: { type: 'text', description: 'Subject/Title of note' },
    // SYNCED with MiscellaneousNoteForm.tsx PURPOSE_CATEGORY_OPTIONS
    purposeCategory: { type: 'select', options: ['Administrative', 'Coordination of care', 'Documentation review', 'Clinical observation', 'Collateral contact', 'Other'], description: 'Purpose category' },
    content: { type: 'textarea', description: 'Note content' },
    relatedToTreatment: { type: 'checkbox', description: 'Related to active treatment' },
    actionRequired: { type: 'checkbox', description: 'Does this require follow-up action?' },
    actionDescription: { type: 'textarea', description: 'Describe actions needed' },
    billable: { type: 'checkbox', description: 'Is this billable?' },
  },

  'Crisis Note': {
    // Session Information
    crisisDate: { type: 'date', description: 'Date of crisis' },
    crisisTime: { type: 'text', description: 'Time of crisis' },
    contactMethod: { type: 'select', options: ['In-person', 'Phone', 'Video', 'Text', 'Email'], description: 'How client contacted' },

    // Crisis Assessment
    crisisType: { type: 'select', options: ['Suicidal ideation', 'Self-harm', 'Homicidal ideation', 'Psychotic symptoms', 'Severe anxiety/panic', 'Substance overdose', 'Domestic violence', 'Other'], description: 'Type of crisis' },
    precipitatingEvent: { type: 'textarea', description: 'What precipitated the crisis' },
    currentSymptoms: { type: 'textarea', description: 'Current symptoms and presentation' },

    // Risk Assessment
    suicidalIdeation: { type: 'select', options: ['None', 'Passive', 'Active without plan', 'Active with plan', 'Active with plan and intent'], description: 'Suicidal ideation' },
    suicidalPlan: { type: 'textarea', description: 'Details of suicidal plan (if present)' },
    accessToMeans: { type: 'select', options: ['No access', 'Limited access', 'Has access'], description: 'Access to lethal means' },
    homicidalIdeation: { type: 'select', options: ['None', 'Present without plan', 'Present with plan'], description: 'Homicidal ideation' },
    riskLevel: { type: 'select', options: ['Low', 'Moderate', 'High', 'Imminent'], description: 'Overall risk level' },

    // Interventions
    interventionsProvided: { type: 'multiselect', options: ['Safety planning', 'Crisis de-escalation', 'Means restriction counseling', 'Emergency contact notification', 'Mobile crisis team', 'Hospitalization', 'Medication adjustment', 'Increased session frequency', 'Other'], description: 'Interventions provided' },
    safetyPlanCreated: { type: 'checkbox', description: 'Was a safety plan created?' },
    safetyPlanDetails: { type: 'textarea', description: 'Safety plan details' },

    // Disposition
    disposition: { type: 'select', options: ['Discharged home with safety plan', 'Voluntary hospitalization', 'Involuntary hospitalization', 'Transferred to emergency room', 'Referred to mobile crisis', 'Follow-up scheduled'], description: 'Disposition' },
    hospitalizationNeeded: { type: 'checkbox', description: 'Was hospitalization needed?' },
    emergencyContactNotified: { type: 'checkbox', description: 'Was emergency contact notified?' },

    // Follow-up
    followUpPlan: { type: 'textarea', description: 'Follow-up plan' },
    nextAppointment: { type: 'date', description: 'Next appointment date' },
  },

  'Group Therapy Note': {
    // Session Information
    sessionDate: { type: 'date', description: 'Session date' },
    groupName: { type: 'text', description: 'Name of group' },
    sessionNumber: { type: 'number', description: 'Session number in series' },
    sessionDuration: { type: 'select', options: ['60 minutes', '75 minutes', '90 minutes', '120 minutes'], description: 'Session duration' },

    // Attendance
    attendeeCount: { type: 'number', description: 'Number of attendees' },
    absentCount: { type: 'number', description: 'Number absent' },

    // Session Content
    sessionTopic: { type: 'text', description: 'Session topic/theme' },
    sessionObjectives: { type: 'textarea', description: 'Session objectives' },
    activitiesConducted: { type: 'textarea', description: 'Activities and exercises conducted' },

    // Group Dynamics
    groupCohesion: { type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'], description: 'Group cohesion level' },
    memberParticipation: { type: 'select', options: ['All members active', 'Most members active', 'Some members active', 'Low participation'], description: 'Member participation' },
    groupDynamicsNotes: { type: 'textarea', description: 'Notes on group dynamics' },

    // Individual Member Notes (general - specific notes go in individual sections)
    memberHighlights: { type: 'textarea', description: 'Notable member interactions or disclosures' },
    concernsNoted: { type: 'textarea', description: 'Any concerns about specific members' },

    // Session Summary
    sessionSummary: { type: 'textarea', description: 'Summary of session' },
    homework: { type: 'textarea', description: 'Homework assigned' },
    nextSessionPlan: { type: 'textarea', description: 'Plan for next session' },
  },
};

/**
 * Get field mapping for a specific note type
 */
export function getFieldMapping(noteType: string): Record<string, any> | undefined {
  return FIELD_MAPPINGS[noteType];
}

/**
 * Get list of all valid field names for a note type
 */
export function getValidFieldNames(noteType: string): string[] {
  const mapping = FIELD_MAPPINGS[noteType];
  return mapping ? Object.keys(mapping) : [];
}

/**
 * Get all supported note types
 */
export function getSupportedNoteTypes(): string[] {
  return Object.keys(FIELD_MAPPINGS);
}

/**
 * Validate that generated content matches expected field types and values
 */
export function validateGeneratedContent(
  noteType: string,
  content: Record<string, any>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const mapping = FIELD_MAPPINGS[noteType];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mapping) {
    return { valid: false, errors: [`Unknown note type: ${noteType}`], warnings: [] };
  }

  // Check for unexpected fields
  for (const fieldName in content) {
    if (!mapping[fieldName]) {
      warnings.push(`Unexpected field: ${fieldName} - will be ignored`);
    }
  }

  // Validate field values against allowed options
  for (const fieldName in content) {
    const fieldConfig = mapping[fieldName];
    if (!fieldConfig) continue;

    const value = content[fieldName];

    // Skip validation for null/undefined values
    if (value === null || value === undefined || value === '') continue;

    // Validate select/radio fields
    if ((fieldConfig.type === 'select' || fieldConfig.type === 'radio') && fieldConfig.options) {
      if (!fieldConfig.options.includes(value)) {
        errors.push(`Invalid value for ${fieldName}: "${value}". Expected one of: ${fieldConfig.options.join(', ')}`);
      }
    }

    // Validate multiselect fields
    if (fieldConfig.type === 'multiselect' && fieldConfig.options && Array.isArray(value)) {
      for (const v of value) {
        if (!fieldConfig.options.includes(v)) {
          errors.push(`Invalid value in ${fieldName}: "${v}". Expected one of: ${fieldConfig.options.join(', ')}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export default {
  FIELD_MAPPINGS,
  getFieldMapping,
  getValidFieldNames,
  getSupportedNoteTypes,
  validateGeneratedContent,
};
