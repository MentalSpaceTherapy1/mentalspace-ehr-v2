/**
 * Form Field Mapping Configurations
 *
 * Defines how form submission fields map to database model fields
 * for automated data transfer functionality.
 */

/**
 * Field Mapping Type Definitions
 */
export interface FieldMapping {
  /** Source field ID from form submission */
  sourceField: string;
  /** Target field name in database model */
  targetField: string;
  /** Display label for the field */
  label: string;
  /** Data type for validation and transformation */
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'array';
  /** Whether this field is required */
  required?: boolean;
  /** Transform function to convert form data to model data */
  transform?: (value: any) => any;
  /** Validation function */
  validate?: (value: any) => boolean;
}

export interface FormTransferConfig {
  /** Form name that can be transferred */
  formName: string;
  /** Target model/entity */
  targetModel: 'Client' | 'ClinicalIntake';
  /** API endpoint for transfer */
  transferEndpoint: string;
  /** Button text */
  buttonText: string;
  /** Success message */
  successMessage: string;
  /** Field mappings */
  fieldMappings: FieldMapping[];
}

/**
 * CLIENT INFORMATION FORM → CLIENT DEMOGRAPHICS
 *
 * Maps fields from "Client Information Form" to Client model
 */
export const CLIENT_INFO_TO_DEMOGRAPHICS: FormTransferConfig = {
  formName: 'Client Information Form',
  targetModel: 'Client',
  transferEndpoint: '/clients/:clientId/transfer-demographics',
  buttonText: 'Transfer to Demographics',
  successMessage: 'Client information transferred successfully to demographics',
  fieldMappings: [
    // Basic Information
    {
      sourceField: 'first_name',
      targetField: 'firstName',
      label: 'First Name',
      dataType: 'string',
      required: true,
    },
    {
      sourceField: 'middle_name',
      targetField: 'middleName',
      label: 'Middle Name',
      dataType: 'string',
    },
    {
      sourceField: 'last_name',
      targetField: 'lastName',
      label: 'Last Name',
      dataType: 'string',
      required: true,
    },
    {
      sourceField: 'preferred_name',
      targetField: 'preferredName',
      label: 'Preferred Name',
      dataType: 'string',
    },
    {
      sourceField: 'date_of_birth',
      targetField: 'dateOfBirth',
      label: 'Date of Birth',
      dataType: 'date',
      required: true,
      transform: (value: string) => new Date(value).toISOString(),
    },
    {
      sourceField: 'gender',
      targetField: 'gender',
      label: 'Gender',
      dataType: 'string',
    },
    {
      sourceField: 'pronouns',
      targetField: 'pronouns',
      label: 'Pronouns',
      dataType: 'string',
    },

    // Contact Information
    {
      sourceField: 'email',
      targetField: 'email',
      label: 'Email Address',
      dataType: 'email',
      required: true,
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    },
    {
      sourceField: 'phone',
      targetField: 'phone',
      label: 'Primary Phone',
      dataType: 'phone',
      required: true,
      transform: (value: string) => value?.replace(/[^0-9]/g, ''), // Remove formatting
    },
    {
      sourceField: 'alternate_phone',
      targetField: 'alternatePhone',
      label: 'Alternate Phone',
      dataType: 'phone',
      transform: (value: string) => value?.replace(/[^0-9]/g, ''),
    },

    // Address Information
    {
      sourceField: 'address',
      targetField: 'address',
      label: 'Street Address',
      dataType: 'string',
    },
    {
      sourceField: 'address_line_2',
      targetField: 'addressLine2',
      label: 'Address Line 2',
      dataType: 'string',
    },
    {
      sourceField: 'city',
      targetField: 'city',
      label: 'City',
      dataType: 'string',
    },
    {
      sourceField: 'state',
      targetField: 'state',
      label: 'State',
      dataType: 'string',
    },
    {
      sourceField: 'zip_code',
      targetField: 'zipCode',
      label: 'ZIP Code',
      dataType: 'string',
    },

    // Emergency Contact
    {
      sourceField: 'emergency_contact_name',
      targetField: 'emergencyContactName',
      label: 'Emergency Contact Name',
      dataType: 'string',
    },
    {
      sourceField: 'emergency_contact_relationship',
      targetField: 'emergencyContactRelationship',
      label: 'Emergency Contact Relationship',
      dataType: 'string',
    },
    {
      sourceField: 'emergency_contact_phone',
      targetField: 'emergencyContactPhone',
      label: 'Emergency Contact Phone',
      dataType: 'phone',
      transform: (value: string) => value?.replace(/[^0-9]/g, ''),
    },

    // Insurance Information
    {
      sourceField: 'insurance_provider',
      targetField: 'insuranceProvider',
      label: 'Insurance Provider',
      dataType: 'string',
    },
    {
      sourceField: 'insurance_member_id',
      targetField: 'insuranceMemberId',
      label: 'Insurance Member ID',
      dataType: 'string',
    },
    {
      sourceField: 'insurance_group_number',
      targetField: 'insuranceGroupNumber',
      label: 'Insurance Group Number',
      dataType: 'string',
    },
    {
      sourceField: 'insurance_policy_holder',
      targetField: 'insurancePolicyHolder',
      label: 'Insurance Policy Holder',
      dataType: 'string',
    },

    // Additional Information
    {
      sourceField: 'marital_status',
      targetField: 'maritalStatus',
      label: 'Marital Status',
      dataType: 'string',
    },
    {
      sourceField: 'occupation',
      targetField: 'occupation',
      label: 'Occupation',
      dataType: 'string',
    },
    {
      sourceField: 'employer',
      targetField: 'employer',
      label: 'Employer',
      dataType: 'string',
    },
    {
      sourceField: 'referral_source',
      targetField: 'referralSource',
      label: 'Referral Source',
      dataType: 'string',
    },
  ],
};

/**
 * CLIENT HISTORY FORM → CLINICAL INTAKE
 *
 * Maps fields from "Client History Form" to ClinicalIntake model
 * Note: This form combines mental health history, medical history, and psychosocial information
 */
export const CLIENT_HISTORY_TO_INTAKE: FormTransferConfig = {
  formName: 'Client History Form',
  targetModel: 'ClinicalIntake',
  transferEndpoint: '/clients/:clientId/transfer-to-intake',
  buttonText: 'Transfer to Intake Form',
  successMessage: 'Client history transferred successfully to intake assessment',
  fieldMappings: [
    // Presenting Problem (Client-provided)
    {
      sourceField: 'chief_complaint',
      targetField: 'presentingProblem',
      label: 'Chief Complaint / Reason for Seeking Treatment',
      dataType: 'string',
      required: true,
    },
    {
      sourceField: 'symptoms',
      targetField: 'currentSymptoms',
      label: 'Current Symptoms',
      dataType: 'string',
    },
    {
      sourceField: 'symptom_onset',
      targetField: 'symptomOnset',
      label: 'When Symptoms Started',
      dataType: 'string',
    },
    {
      sourceField: 'symptom_severity',
      targetField: 'symptomSeverity',
      label: 'Symptom Severity (Client Rating)',
      dataType: 'string',
    },

    // Mental Health History
    {
      sourceField: 'previous_mental_health_treatment',
      targetField: 'previousMentalHealthTreatment',
      label: 'Previous Mental Health Treatment',
      dataType: 'string',
    },
    {
      sourceField: 'previous_therapists',
      targetField: 'previousTherapists',
      label: 'Previous Therapists/Providers',
      dataType: 'string',
    },
    {
      sourceField: 'previous_medications',
      targetField: 'previousPsychiatricMedications',
      label: 'Previous Psychiatric Medications',
      dataType: 'string',
    },
    {
      sourceField: 'current_medications',
      targetField: 'currentMedications',
      label: 'Current Medications (All)',
      dataType: 'array',
      transform: (value: any) => Array.isArray(value) ? value : (value ? [value] : []),
    },
    {
      sourceField: 'psychiatric_hospitalizations',
      targetField: 'psychiatricHospitalizations',
      label: 'Psychiatric Hospitalizations',
      dataType: 'string',
    },
    {
      sourceField: 'suicide_attempts',
      targetField: 'suicideAttemptHistory',
      label: 'Suicide Attempt History',
      dataType: 'string',
    },
    {
      sourceField: 'self_harm_history',
      targetField: 'selfHarmHistory',
      label: 'Self-Harm History',
      dataType: 'string',
    },

    // Medical History
    {
      sourceField: 'medical_conditions',
      targetField: 'medicalHistory',
      label: 'Current Medical Conditions',
      dataType: 'string',
    },
    {
      sourceField: 'allergies',
      targetField: 'allergies',
      label: 'Allergies (Medication and Other)',
      dataType: 'string',
    },
    {
      sourceField: 'current_medical_providers',
      targetField: 'currentMedicalProviders',
      label: 'Current Medical Providers',
      dataType: 'string',
    },
    {
      sourceField: 'surgeries',
      targetField: 'surgicalHistory',
      label: 'Surgical History',
      dataType: 'string',
    },

    // Family History
    {
      sourceField: 'family_mental_health_history',
      targetField: 'familyMentalHealthHistory',
      label: 'Family Mental Health History',
      dataType: 'string',
    },
    {
      sourceField: 'family_medical_history',
      targetField: 'familyMedicalHistory',
      label: 'Family Medical History',
      dataType: 'string',
    },
    {
      sourceField: 'family_substance_abuse',
      targetField: 'familySubstanceAbuseHistory',
      label: 'Family Substance Abuse History',
      dataType: 'string',
    },

    // Substance Use
    {
      sourceField: 'alcohol_use',
      targetField: 'alcoholUse',
      label: 'Alcohol Use',
      dataType: 'string',
    },
    {
      sourceField: 'drug_use',
      targetField: 'drugUse',
      label: 'Drug Use',
      dataType: 'string',
    },
    {
      sourceField: 'tobacco_use',
      targetField: 'tobaccoUse',
      label: 'Tobacco Use',
      dataType: 'string',
    },
    {
      sourceField: 'substance_abuse_treatment',
      targetField: 'substanceAbuseTreatmentHistory',
      label: 'Substance Abuse Treatment History',
      dataType: 'string',
    },

    // Trauma History
    {
      sourceField: 'trauma_history',
      targetField: 'traumaHistory',
      label: 'Trauma History',
      dataType: 'string',
    },
    {
      sourceField: 'abuse_history',
      targetField: 'abuseHistory',
      label: 'Abuse History (Physical/Sexual/Emotional)',
      dataType: 'string',
    },

    // Social History
    {
      sourceField: 'living_situation',
      targetField: 'livingSituation',
      label: 'Current Living Situation',
      dataType: 'string',
    },
    {
      sourceField: 'relationship_status',
      targetField: 'relationshipStatus',
      label: 'Relationship Status',
      dataType: 'string',
    },
    {
      sourceField: 'social_support',
      targetField: 'socialSupport',
      label: 'Social Support System',
      dataType: 'string',
    },
    {
      sourceField: 'employment_status',
      targetField: 'employmentStatus',
      label: 'Employment Status',
      dataType: 'string',
    },
    {
      sourceField: 'financial_stressors',
      targetField: 'financialStressors',
      label: 'Financial Stressors',
      dataType: 'string',
    },
    {
      sourceField: 'legal_issues',
      targetField: 'legalIssues',
      label: 'Legal Issues',
      dataType: 'string',
    },

    // Cultural/Spiritual
    {
      sourceField: 'cultural_background',
      targetField: 'culturalBackground',
      label: 'Cultural Background',
      dataType: 'string',
    },
    {
      sourceField: 'religious_spiritual_beliefs',
      targetField: 'religiousSpiritual Beliefs',
      label: 'Religious/Spiritual Beliefs',
      dataType: 'string',
    },
    {
      sourceField: 'cultural_factors_affecting_treatment',
      targetField: 'culturalFactors',
      label: 'Cultural Factors Affecting Treatment',
      dataType: 'string',
    },

    // Treatment Goals (Client-Stated)
    {
      sourceField: 'treatment_goals',
      targetField: 'clientStatedGoals',
      label: 'Client-Stated Treatment Goals',
      dataType: 'string',
    },
    {
      sourceField: 'treatment_expectations',
      targetField: 'treatmentExpectations',
      label: 'Treatment Expectations',
      dataType: 'string',
    },
    {
      sourceField: 'previous_therapy_helpful',
      targetField: 'whatHelpedPreviously',
      label: 'What Has Been Helpful in Previous Treatment',
      dataType: 'string',
    },
    {
      sourceField: 'previous_therapy_unhelpful',
      targetField: 'whatDidNotHelp',
      label: 'What Did Not Help in Previous Treatment',
      dataType: 'string',
    },

    // Additional Client-Provided Information
    {
      sourceField: 'strengths',
      targetField: 'clientStrengths',
      label: 'Client Strengths and Resources',
      dataType: 'string',
    },
    {
      sourceField: 'hobbies_interests',
      targetField: 'hobbiesInterests',
      label: 'Hobbies and Interests',
      dataType: 'string',
    },
    {
      sourceField: 'coping_strategies',
      targetField: 'currentCopingStrategies',
      label: 'Current Coping Strategies',
      dataType: 'string',
    },
  ],
};

/**
 * Get transfer configuration for a form
 */
export function getTransferConfig(formName: string): FormTransferConfig | null {
  const configs = [
    CLIENT_INFO_TO_DEMOGRAPHICS,
    CLIENT_HISTORY_TO_INTAKE,
  ];

  return configs.find(config => config.formName === formName) || null;
}

/**
 * Check if a form is transferable
 */
export function isTransferableForm(formName: string): boolean {
  return getTransferConfig(formName) !== null;
}

/**
 * Apply field mapping to transform submission data to model data
 */
export function applyFieldMapping(
  submissionData: Record<string, any>,
  config: FormTransferConfig,
  selectedFields?: string[]
): Record<string, any> {
  const mappedData: Record<string, any> = {};

  config.fieldMappings.forEach(mapping => {
    // Skip if field not selected (when field selection is used)
    if (selectedFields && !selectedFields.includes(mapping.sourceField)) {
      return;
    }

    const value = submissionData[mapping.sourceField];

    // Skip if no value
    if (value === undefined || value === null || value === '') {
      return;
    }

    // Validate if validator exists
    if (mapping.validate && !mapping.validate(value)) {
      console.warn(`Validation failed for field ${mapping.sourceField}:`, value);
      return;
    }

    // Transform if transformer exists
    const transformedValue = mapping.transform ? mapping.transform(value) : value;

    // Set the mapped value
    mappedData[mapping.targetField] = transformedValue;
  });

  return mappedData;
}
