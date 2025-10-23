/**
 * Field Mappings for AI-Generated Clinical Notes
 * Maps AI-generated content to specific form fields with proper types
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
    sessionDate: { type: 'date', description: 'Session date' },
    sessionDuration: { type: 'select', options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'], description: 'Session duration' },
    sessionType: { type: 'select', options: ['Individual Therapy', 'Family Therapy', 'Group Therapy', 'Couples Therapy'], description: 'Session type' },
    location: { type: 'select', options: ['In-Person', 'Telehealth', 'Phone', 'Home Visit'], description: 'Session location' },

    // Current Symptoms
    symptoms: { type: 'multiselect', options: ['Depression', 'Anxiety', 'Panic', 'Insomnia', 'Irritability', 'Mood Swings', 'Social Withdrawal', 'Concentration Difficulties', 'Trauma Symptoms', 'Suicidal Ideation', 'Other'], description: 'Current symptoms reported' },

    // Progress Tracking
    goals: { type: 'textarea', description: 'Progress toward treatment goals' },

    // Mental Status
    appearance: { type: 'select', options: ['Well-groomed', 'Disheveled', 'Appropriate for age', 'Notable hygiene concerns'], description: 'Client appearance' },
    mood: { type: 'text', description: 'Client-reported mood' },
    affect: { type: 'select', options: ['Appropriate', 'Flat', 'Blunted', 'Restricted', 'Labile', 'Expansive', 'Congruent', 'Incongruent'], description: 'Observed affect' },
    thoughtProcess: { type: 'select', options: ['Logical', 'Goal-directed', 'Tangential', 'Circumstantial', 'Racing', 'Disorganized'], description: 'Thought process' },

    // Risk Assessment
    suicidalIdeation: { type: 'select', options: ['None', 'Passive', 'Active without plan', 'Active with plan'], description: 'Suicidal ideation' },
    homicidalIdeation: { type: 'select', options: ['None', 'Present'], description: 'Homicidal ideation' },
    riskLevel: { type: 'select', options: ['Low', 'Medium', 'High'], description: 'Overall risk level' },

    // Interventions
    interventionsUsed: { type: 'multiselect', options: ['Cognitive Restructuring', 'Behavioral Activation', 'Exposure Therapy', 'Mindfulness', 'DBT Skills', 'Psychoeducation', 'Problem-Solving', 'Relaxation Techniques', 'EMDR', 'Motivational Interviewing', 'Solution-Focused', 'Other'], description: 'Interventions used in session' },
    otherIntervention: { type: 'text', description: 'Other intervention used (specify)' },

    // Client Response
    engagementLevel: { type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'], description: 'Client engagement level' },
    responseToInterventions: { type: 'textarea', description: 'Client response to interventions' },
    homeworkCompliance: { type: 'select', options: ['Completed', 'Partially completed', 'Not completed', 'N/A'], description: 'Homework compliance' },
    clientResponseNotes: { type: 'textarea', description: 'Additional notes on client response' },

    // SOAP Notes
    subjective: { type: 'textarea', description: 'Subjective: Client-reported information' },
    objective: { type: 'textarea', description: 'Objective: Observable behaviors and findings' },
    assessment: { type: 'textarea', description: 'Assessment: Clinical impressions' },
    plan: { type: 'textarea', description: 'Plan: Treatment plan and next steps' },
  },

  'Intake Assessment': {
    // Session Information
    sessionDate: { type: 'date', description: 'Intake session date' },

    // Presenting Problem
    chiefComplaint: { type: 'textarea', description: 'Chief complaint in client\'s exact words - what they say is the main reason for seeking therapy' },
    presentingProblem: { type: 'textarea', description: 'Detailed narrative describing the presenting problem, including onset, duration, frequency, intensity, triggers, and impact on functioning' },
    selectedSymptoms: { type: 'multiselect', options: ['Depression', 'Anxiety', 'Panic Attacks', 'Insomnia', 'Nightmares', 'Flashbacks', 'Mood Swings', 'Irritability', 'Social Withdrawal', 'Concentration Problems', 'Memory Problems', 'Eating Problems', 'Substance Use', 'Suicidal Thoughts', 'Self-Harm', 'Other'], description: 'List of current symptoms client is experiencing (select all that apply)' },

    // Clinical History - MUST BE POPULATED
    psychiatricHistory: { type: 'textarea', description: 'REQUIRED: Previous mental health diagnoses, past therapy/counseling, psychiatric hospitalizations, medications tried, what worked/didn\'t work. If none, write "No prior psychiatric treatment"' },
    medicalHistory: { type: 'textarea', description: 'REQUIRED: Medical conditions, surgeries, chronic illnesses, head injuries, seizures, allergies. If none, write "No significant medical history"' },
    medications: { type: 'textarea', description: 'REQUIRED: All current medications with dosages, frequency, and what they\'re for. If none, write "No current medications"' },
    familyHistory: { type: 'textarea', description: 'REQUIRED: Family history of mental illness, substance abuse, suicide, medical conditions. Include which family members. If unknown, write "Family history unknown"' },
    socialHistory: { type: 'textarea', description: 'REQUIRED: Education level, employment status, relationship status, living situation, children, support system, significant life events. This is critical contextual information' },
    substanceUse: { type: 'textarea', description: 'REQUIRED: Detailed history of alcohol, tobacco, marijuana, other drugs - type, amount, frequency, duration, last use, impact on life. If none, write "Denies substance use"' },

    // Mental Status Exam
    appearance: { type: 'select', options: ['Well-groomed', 'Disheveled', 'Appropriate', 'Hygiene concerns'], description: 'Appearance' },
    behavior: { type: 'select', options: ['Cooperative', 'Guarded', 'Agitated', 'Withdrawn'], description: 'Behavior' },
    speech: { type: 'select', options: ['Normal', 'Pressured', 'Slow', 'Slurred', 'Soft'], description: 'Speech' },
    mood: { type: 'text', description: 'Mood (subjective)' },
    affect: { type: 'select', options: ['Appropriate', 'Flat', 'Blunted', 'Labile', 'Congruent', 'Incongruent'], description: 'Affect (objective)' },
    thoughtProcess: { type: 'select', options: ['Logical', 'Tangential', 'Circumstantial', 'Racing', 'Disorganized'], description: 'Thought process' },
    thoughtContent: { type: 'textarea', description: 'Thought content (delusions, obsessions, preoccupations)' },
    perceptualDisturbances: { type: 'select', options: ['None', 'Auditory hallucinations', 'Visual hallucinations', 'Other'], description: 'Perceptual disturbances' },
    cognition: { type: 'text', description: 'Cognition (orientation, memory, concentration)' },
    insight: { type: 'select', options: ['Good', 'Fair', 'Poor'], description: 'Insight' },
    judgment: { type: 'select', options: ['Good', 'Fair', 'Poor'], description: 'Judgment' },

    // Risk Assessment
    suicidalIdeation: { type: 'select', options: ['None', 'Passive', 'Active without plan', 'Active with plan'], description: 'Suicidal ideation' },
    suicidalHistory: { type: 'textarea', description: 'History of suicidal behavior' },
    homicidalIdeation: { type: 'select', options: ['None', 'Present'], description: 'Homicidal ideation' },
    selfHarm: { type: 'select', options: ['None', 'Current', 'Past'], description: 'Self-harm behaviors' },
    riskLevel: { type: 'select', options: ['Low', 'Medium', 'High', 'Imminent'], description: 'Overall risk level' },
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

    // Goals (SMART format)
    goals: { type: 'textarea', description: 'Treatment goals (Specific, Measurable, Achievable, Relevant, Time-bound)' },
    objectives: { type: 'textarea', description: 'Objectives (specific steps toward goals)' },

    // Treatment Approach
    treatmentModality: { type: 'multiselect', options: ['CBT', 'DBT', 'ACT', 'EMDR', 'Psychodynamic', 'Humanistic', 'Solution-Focused', 'Motivational Interviewing', 'Family Systems', 'Other'], description: 'Treatment modalities to be used' },
    interventions: { type: 'textarea', description: 'Specific interventions and techniques' },

    // Frequency and Duration
    sessionFrequency: { type: 'select', options: ['Weekly', 'Bi-weekly', 'Monthly', 'As needed'], description: 'Session frequency' },
    sessionDuration: { type: 'select', options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'], description: 'Session duration' },
    treatmentSetting: { type: 'select', options: ['Outpatient', 'Intensive Outpatient', 'Partial Hospitalization', 'Inpatient'], description: 'Treatment setting' },
    estimatedDuration: { type: 'text', description: 'Estimated treatment duration' },

    // Discharge Criteria
    dischargeCriteria: { type: 'textarea', description: 'Criteria for successful discharge' },

    // Strengths and Resources
    clientStrengths: { type: 'textarea', description: 'Client strengths and resources' },
    barriers: { type: 'textarea', description: 'Potential barriers to treatment' },
  },

  'Cancellation Note': {
    cancellationDate: { type: 'date', description: 'Original appointment date' },
    cancellationTime: { type: 'text', description: 'Original appointment time' },
    cancelledBy: { type: 'select', options: ['Client', 'Therapist', 'Mutual'], description: 'Cancelled by' },
    notificationDate: { type: 'date', description: 'When cancellation was received' },
    notificationTime: { type: 'text', description: 'Time cancellation was received' },
    reason: { type: 'text', description: 'Reason for cancellation' },
    notificationMethod: { type: 'select', options: ['Phone', 'Email', 'Text', 'Portal', 'In-person'], description: 'How client notified' },
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
    contactType: { type: 'select', options: ['Phone call', 'Email', 'Text message', 'Portal message', 'Voicemail', 'Brief in-person'], description: 'Type of contact' },
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
    terminationReason: { type: 'select', options: ['Goals achieved', 'Client-initiated', 'Mutual decision', 'Non-compliance', 'Inappropriate for services', 'Relocation', 'Financial reasons', 'Transfer to another provider'], description: 'Reason for termination' },
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
    purposeCategory: { type: 'select', options: ['Administrative', 'Clinical observation', 'Treatment coordination', 'Supervision', 'Consultation', 'Documentation update', 'Other'], description: 'Purpose category' },
    content: { type: 'textarea', description: 'Note content' },
    relatedToTreatment: { type: 'checkbox', description: 'Related to active treatment' },
    actionRequired: { type: 'checkbox', description: 'Does this require follow-up action?' },
    actionDescription: { type: 'textarea', description: 'Describe actions needed' },
    billable: { type: 'checkbox', description: 'Is this billable?' },
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
 * Validate that generated content matches expected field types
 */
export function validateGeneratedContent(
  noteType: string,
  content: Record<string, any>
): { valid: boolean; errors: string[] } {
  const mapping = FIELD_MAPPINGS[noteType];
  const errors: string[] = [];

  if (!mapping) {
    return { valid: false, errors: [`Unknown note type: ${noteType}`] };
  }

  // Check for unexpected fields
  for (const fieldName in content) {
    if (!mapping[fieldName]) {
      errors.push(`Unexpected field: ${fieldName}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export default {
  FIELD_MAPPINGS,
  getFieldMapping,
  getValidFieldNames,
  validateGeneratedContent,
};
