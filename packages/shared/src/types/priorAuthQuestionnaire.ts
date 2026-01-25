/**
 * Prior Authorization Questionnaire Types
 * Matches CMO form structure for CareSource, Amerigroup, Peach State (Georgia Medicaid)
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum SeverityLevel {
  NA = 'NA',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export const SeverityLevelDisplayMap: Record<SeverityLevel, string> = {
  [SeverityLevel.NA]: 'N/A',
  [SeverityLevel.MILD]: 'Mild',
  [SeverityLevel.MODERATE]: 'Moderate',
  [SeverityLevel.SEVERE]: 'Severe',
};

export enum TransportationOption {
  YES = 'YES',
  NO = 'NO',
  OTHER = 'OTHER',
}

export const TransportationDisplayMap: Record<TransportationOption, string> = {
  [TransportationOption.YES]: 'Yes',
  [TransportationOption.NO]: 'No',
  [TransportationOption.OTHER]: 'Other',
};

// ============================================================================
// SYMPTOM FIELD DEFINITIONS
// ============================================================================

export type SymptomCategory =
  | 'anxiety'
  | 'mania'
  | 'psychotic'
  | 'depression'
  | 'substance'
  | 'personality';

export interface ClinicalSymptomField {
  fieldName: string;
  label: string;
  category: SymptomCategory;
  inputType: 'dropdown' | 'text';
}

// All 41 symptom fields organized by category
export const CLINICAL_SYMPTOM_FIELDS: ClinicalSymptomField[] = [
  // Anxiety Disorders (6 fields)
  { fieldName: 'anxiety_obsessions_compulsions', label: 'Obsessions/Compulsions', category: 'anxiety', inputType: 'dropdown' },
  { fieldName: 'anxiety_generalized', label: 'Generalized Anxiety', category: 'anxiety', inputType: 'dropdown' },
  { fieldName: 'anxiety_panic_attacks', label: 'Panic Attacks', category: 'anxiety', inputType: 'dropdown' },
  { fieldName: 'anxiety_phobias', label: 'Phobias', category: 'anxiety', inputType: 'dropdown' },
  { fieldName: 'anxiety_somatic_complaints', label: 'Somatic Complaints', category: 'anxiety', inputType: 'dropdown' },
  { fieldName: 'anxiety_ptsd_symptoms', label: 'PTSD Symptoms', category: 'anxiety', inputType: 'dropdown' },

  // Mania (5 fields)
  { fieldName: 'mania_insomnia', label: 'Insomnia', category: 'mania', inputType: 'dropdown' },
  { fieldName: 'mania_grandiosity', label: 'Grandiosity', category: 'mania', inputType: 'dropdown' },
  { fieldName: 'mania_pressured_speech', label: 'Pressured Speech', category: 'mania', inputType: 'dropdown' },
  { fieldName: 'mania_racing_thoughts', label: 'Racing Thoughts / Flight of Ideas', category: 'mania', inputType: 'dropdown' },
  { fieldName: 'mania_poor_judgement', label: 'Poor Judgement / Impulsiveness', category: 'mania', inputType: 'dropdown' },

  // Psychotic Disorders (5 fields)
  { fieldName: 'psychotic_delusions_paranoia', label: 'Delusions / Paranoia', category: 'psychotic', inputType: 'dropdown' },
  { fieldName: 'psychotic_selfcare_issues', label: 'Self-care Issues', category: 'psychotic', inputType: 'dropdown' },
  { fieldName: 'psychotic_hallucinations', label: 'Hallucinations', category: 'psychotic', inputType: 'dropdown' },
  { fieldName: 'psychotic_disorganized_thought', label: 'Disorganized Thought Process', category: 'psychotic', inputType: 'dropdown' },
  { fieldName: 'psychotic_loose_associations', label: 'Loose Associations', category: 'psychotic', inputType: 'dropdown' },

  // Depression (9 fields)
  { fieldName: 'depression_impaired_concentration', label: 'Impaired Concentration', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_impaired_memory', label: 'Impaired Memory', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_psychomotor_retardation', label: 'Psychomotor Retardation', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_sexual_issues', label: 'Sexual Issues', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_appetite_disturbance', label: 'Appetite Disturbance', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_irritability', label: 'Irritability', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_agitation', label: 'Agitation', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_sleep_disturbance', label: 'Sleep Disturbance', category: 'depression', inputType: 'dropdown' },
  { fieldName: 'depression_hopelessness', label: 'Hopelessness / Helplessness', category: 'depression', inputType: 'dropdown' },

  // Substance Abuse (7 dropdowns + 1 text)
  { fieldName: 'substance_loss_of_control', label: 'Loss of Control of Dosage', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_amnesic_episodes', label: 'Amnesic Episodes', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_legal_problems', label: 'Legal Problems', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_alcohol_abuse', label: 'Alcohol Abuse', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_opiate_abuse', label: 'Opiate Abuse', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_prescription_abuse', label: 'Prescription Medication Abuse', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_polysubstance_abuse', label: 'Polysubstance Abuse', category: 'substance', inputType: 'dropdown' },
  { fieldName: 'substance_other_drugs', label: 'Other Drugs', category: 'substance', inputType: 'text' },

  // Personality Disorder (7 dropdowns + 1 text)
  { fieldName: 'personality_oddness', label: 'Oddness / Eccentricities', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_oppositional', label: 'Oppositional', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_disregard_law', label: 'Disregard for Law', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_self_injuries', label: 'Recurring Self Injuries', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_entitlement', label: 'Sense of Entitlement', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_passive_aggressive', label: 'Passive Aggressive', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_dependency', label: 'Dependency', category: 'personality', inputType: 'dropdown' },
  { fieldName: 'personality_enduring_traits', label: 'Enduring Traits of', category: 'personality', inputType: 'text' },
];

// Category display labels for the grid
export const SYMPTOM_CATEGORY_LABELS: Record<SymptomCategory, string> = {
  anxiety: 'Anxiety Disorders',
  mania: 'Mania',
  psychotic: 'Psychotic Disorders',
  depression: 'Depression',
  substance: 'Substance Abuse',
  personality: 'Personality Disorder',
};

// ============================================================================
// FORM DATA INTERFACES
// ============================================================================

// All 39 severity dropdown fields
export interface SeverityFields {
  // Anxiety (6)
  anxiety_obsessions_compulsions: SeverityLevel;
  anxiety_generalized: SeverityLevel;
  anxiety_panic_attacks: SeverityLevel;
  anxiety_phobias: SeverityLevel;
  anxiety_somatic_complaints: SeverityLevel;
  anxiety_ptsd_symptoms: SeverityLevel;

  // Mania (5)
  mania_insomnia: SeverityLevel;
  mania_grandiosity: SeverityLevel;
  mania_pressured_speech: SeverityLevel;
  mania_racing_thoughts: SeverityLevel;
  mania_poor_judgement: SeverityLevel;

  // Psychotic (5)
  psychotic_delusions_paranoia: SeverityLevel;
  psychotic_selfcare_issues: SeverityLevel;
  psychotic_hallucinations: SeverityLevel;
  psychotic_disorganized_thought: SeverityLevel;
  psychotic_loose_associations: SeverityLevel;

  // Depression (9)
  depression_impaired_concentration: SeverityLevel;
  depression_impaired_memory: SeverityLevel;
  depression_psychomotor_retardation: SeverityLevel;
  depression_sexual_issues: SeverityLevel;
  depression_appetite_disturbance: SeverityLevel;
  depression_irritability: SeverityLevel;
  depression_agitation: SeverityLevel;
  depression_sleep_disturbance: SeverityLevel;
  depression_hopelessness: SeverityLevel;

  // Substance (7)
  substance_loss_of_control: SeverityLevel;
  substance_amnesic_episodes: SeverityLevel;
  substance_legal_problems: SeverityLevel;
  substance_alcohol_abuse: SeverityLevel;
  substance_opiate_abuse: SeverityLevel;
  substance_prescription_abuse: SeverityLevel;
  substance_polysubstance_abuse: SeverityLevel;

  // Personality (7)
  personality_oddness: SeverityLevel;
  personality_oppositional: SeverityLevel;
  personality_disregard_law: SeverityLevel;
  personality_self_injuries: SeverityLevel;
  personality_entitlement: SeverityLevel;
  personality_passive_aggressive: SeverityLevel;
  personality_dependency: SeverityLevel;
}

// Narrative section fields
export interface NarrativeFields {
  narrative_risk_of_harm: string;
  narrative_functional_status: string;
  narrative_comorbidities: string;
  narrative_environmental_stressors: string;
  narrative_natural_support: string;
  narrative_treatment_response: string;
  narrative_level_of_care: string;
  transportation_available: TransportationOption;
  transportation_notes?: string;
  narrative_history: string;
  narrative_presenting_problems: string;
  narrative_other_clinical_info?: string;
  narrative_current_medications: string;
}

// Complete form data structure
export interface PAQuestionnaireFormData extends SeverityFields, NarrativeFields {
  // Header fields
  clientName: string;
  clientDOB: string;
  diagnosisDisplay: string;
  insuranceDisplay: string;

  // Text fields in clinical grid
  substance_other_drugs?: string;
  personality_enduring_traits?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateQuestionnaireRequest {
  priorAuthorizationId: string;
  formData: Partial<PAQuestionnaireFormData>;
}

export interface UpdateQuestionnaireRequest {
  formData: Partial<PAQuestionnaireFormData>;
}

export interface GenerateWithLisaRequest {
  regenerateFields?: string[] | ['all'];
  preserveUserEdits?: boolean;
  additionalContext?: string;
}

export interface AIGenerationMetadata {
  generatedAt: string;
  dataSourcesUsed: {
    progressNotes: string[];
    assessments: string[];
    outcomeMeasures: string[];
    treatmentPlans: string[];
    medications: string[];
  };
  fieldConfidence: Record<string, number>;
  warningsOrGaps: string[];
}

export interface GenerateWithLisaResponse {
  success: boolean;
  questionnaire: PAQuestionnaireFormData;
  aiMetadata: AIGenerationMetadata;
}

export interface QuestionnaireResponse {
  id: string;
  priorAuthorizationId: string;
  formData: PAQuestionnaireFormData;
  aiGeneratedAt?: string;
  aiGeneratedBy?: string;
  aiDataSourcesSummary?: Record<string, string[]>;
  aiConfidenceScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

// ============================================================================
// NARRATIVE SECTION DEFINITIONS
// ============================================================================

export interface NarrativeSectionDefinition {
  fieldName: keyof NarrativeFields;
  label: string;
  clinicalPrompt: string;
  dataSources: string;
  required: boolean;
  minCharacters?: number;
}

export const NARRATIVE_SECTIONS: NarrativeSectionDefinition[] = [
  {
    fieldName: 'narrative_risk_of_harm',
    label: 'Risk of Harm',
    clinicalPrompt: 'Current/Hx of SI and HI that cause concern for safety, welfare, and wellness of the member.',
    dataSources: 'C-SSRS results, PHQ-9 Question 9, safety plans, crisis notes, hospitalization records',
    required: true,
    minCharacters: 50,
  },
  {
    fieldName: 'narrative_functional_status',
    label: 'Functional Status',
    clinicalPrompt: 'Ability to meet basic needs, fulfill usual role, and maintain health and wellness.',
    dataSources: 'GAF scores, functional assessments, ADL evaluations, intake notes, progress notes',
    required: true,
    minCharacters: 50,
  },
  {
    fieldName: 'narrative_comorbidities',
    label: 'Co-morbidities',
    clinicalPrompt: 'Symptoms and Tx for medical/SUD diagnosis in addition to primary Hx.',
    dataSources: 'Medical history, secondary diagnoses, medication interactions, SUD screening results',
    required: true,
  },
  {
    fieldName: 'narrative_environmental_stressors',
    label: 'Environmental Stressors',
    clinicalPrompt: 'Stress in the environment such as home, school, and work that interfere with the member\'s wellbeing.',
    dataSources: 'Psychosocial assessments, intake forms, progress notes documenting stressors',
    required: true,
    minCharacters: 50,
  },
  {
    fieldName: 'narrative_natural_support',
    label: 'Natural Support in the Environment',
    clinicalPrompt: 'Personal associations and relationships in the community that enhance the quality and security of the member.',
    dataSources: 'Family/support system documentation, intake forms, treatment plans, progress notes',
    required: true,
    minCharacters: 50,
  },
  {
    fieldName: 'narrative_treatment_response',
    label: 'Response to Current Treatment and Definition of Discharge Goals',
    clinicalPrompt: 'Document client\'s progress toward treatment goals and criteria for successful discharge.',
    dataSources: 'Treatment plan reviews, progress notes, outcome measure trends (PHQ-9, GAD-7), discharge planning',
    required: true,
    minCharacters: 100,
  },
  {
    fieldName: 'narrative_level_of_care',
    label: 'Level of Care',
    clinicalPrompt: 'Acceptance and Engagement - document client\'s engagement in therapeutic process.',
    dataSources: 'Session attendance, participation notes, treatment compliance documentation',
    required: true,
    minCharacters: 50,
  },
  {
    fieldName: 'narrative_history',
    label: 'History',
    clinicalPrompt: 'History of outpatient and inpatient mental health treatment.',
    dataSources: 'Treatment history, previous PA records, hospitalization records, intake documentation',
    required: true,
    minCharacters: 50,
  },
  {
    fieldName: 'narrative_presenting_problems',
    label: 'Presenting Problems',
    clinicalPrompt: 'Current issues bringing client to treatment, including client\'s own words when appropriate.',
    dataSources: 'Chief complaints, intake assessments, recent progress notes, client statements',
    required: true,
    minCharacters: 100,
  },
  {
    fieldName: 'narrative_other_clinical_info',
    label: 'Other Clinical Information',
    clinicalPrompt: 'Any additional clinical information relevant to the authorization request.',
    dataSources: 'Any relevant clinical documentation not captured in other sections',
    required: false,
  },
  {
    fieldName: 'narrative_current_medications',
    label: 'Current Medications',
    clinicalPrompt: 'List all current psychiatric and relevant medical medications.',
    dataSources: 'Medication list in client profile, prescriptions, medication reconciliation records',
    required: true,
  },
];

// Default values for new questionnaire
export const DEFAULT_QUESTIONNAIRE_VALUES: Partial<PAQuestionnaireFormData> = {
  // All severity fields default to N/A
  anxiety_obsessions_compulsions: SeverityLevel.NA,
  anxiety_generalized: SeverityLevel.NA,
  anxiety_panic_attacks: SeverityLevel.NA,
  anxiety_phobias: SeverityLevel.NA,
  anxiety_somatic_complaints: SeverityLevel.NA,
  anxiety_ptsd_symptoms: SeverityLevel.NA,
  mania_insomnia: SeverityLevel.NA,
  mania_grandiosity: SeverityLevel.NA,
  mania_pressured_speech: SeverityLevel.NA,
  mania_racing_thoughts: SeverityLevel.NA,
  mania_poor_judgement: SeverityLevel.NA,
  psychotic_delusions_paranoia: SeverityLevel.NA,
  psychotic_selfcare_issues: SeverityLevel.NA,
  psychotic_hallucinations: SeverityLevel.NA,
  psychotic_disorganized_thought: SeverityLevel.NA,
  psychotic_loose_associations: SeverityLevel.NA,
  depression_impaired_concentration: SeverityLevel.NA,
  depression_impaired_memory: SeverityLevel.NA,
  depression_psychomotor_retardation: SeverityLevel.NA,
  depression_sexual_issues: SeverityLevel.NA,
  depression_appetite_disturbance: SeverityLevel.NA,
  depression_irritability: SeverityLevel.NA,
  depression_agitation: SeverityLevel.NA,
  depression_sleep_disturbance: SeverityLevel.NA,
  depression_hopelessness: SeverityLevel.NA,
  substance_loss_of_control: SeverityLevel.NA,
  substance_amnesic_episodes: SeverityLevel.NA,
  substance_legal_problems: SeverityLevel.NA,
  substance_alcohol_abuse: SeverityLevel.NA,
  substance_opiate_abuse: SeverityLevel.NA,
  substance_prescription_abuse: SeverityLevel.NA,
  substance_polysubstance_abuse: SeverityLevel.NA,
  personality_oddness: SeverityLevel.NA,
  personality_oppositional: SeverityLevel.NA,
  personality_disregard_law: SeverityLevel.NA,
  personality_self_injuries: SeverityLevel.NA,
  personality_entitlement: SeverityLevel.NA,
  personality_passive_aggressive: SeverityLevel.NA,
  personality_dependency: SeverityLevel.NA,
  // Transportation defaults to YES
  transportation_available: TransportationOption.YES,
};
