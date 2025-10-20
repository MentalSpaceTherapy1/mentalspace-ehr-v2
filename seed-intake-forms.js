const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

// Get the first admin user ID for createdBy/lastModifiedBy
async function getAdminUserId() {
  const admin = await prisma.user.findFirst({
    where: { roles: { has: 'ADMINISTRATOR' } }
  });
  return admin ? admin.id : null;
}

const forms = [
  {
    formName: 'Client Information',
    formDescription: 'Personal information, demographics, contact details, and emergency contacts',
    formType: 'Initial_Intake',
    isRequired: true,
    assignedToNewClients: true,
    formFieldsJson: [
      { fieldId: 'date', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'basic' },

      // Personal Information
      { fieldId: 'section_personal', fieldLabel: 'Personal Information', fieldType: 'section_header', section: 'personal' },
      { fieldId: 'fullName', fieldLabel: 'Full Legal Name', fieldType: 'text', required: true, section: 'personal' },
      { fieldId: 'preferredName', fieldLabel: 'Preferred Name/Nickname', fieldType: 'text', required: false, section: 'personal' },
      { fieldId: 'pronouns', fieldLabel: 'Pronouns', fieldType: 'text', required: false, section: 'personal' },
      { fieldId: 'dateOfBirth', fieldLabel: 'Date of Birth', fieldType: 'date', required: true, section: 'personal' },
      { fieldId: 'age', fieldLabel: 'Age', fieldType: 'number', required: true, section: 'personal' },
      { fieldId: 'sexAssignedAtBirth', fieldLabel: 'Sex Assigned at Birth', fieldType: 'select', required: true, section: 'personal', options: ['Male', 'Female', 'Intersex', 'Prefer not to say'] },
      { fieldId: 'genderIdentity', fieldLabel: 'Gender Identity', fieldType: 'text', required: false, section: 'personal' },
      { fieldId: 'ssn', fieldLabel: 'Social Security Number (for insurance billing purposes)', fieldType: 'text', required: false, section: 'personal' },

      // Contact Information
      { fieldId: 'section_contact', fieldLabel: 'Contact Information', fieldType: 'section_header', section: 'contact' },
      { fieldId: 'homeAddress', fieldLabel: 'Home Address', fieldType: 'text', required: true, section: 'contact' },
      { fieldId: 'city', fieldLabel: 'City', fieldType: 'text', required: true, section: 'contact' },
      { fieldId: 'state', fieldLabel: 'State', fieldType: 'text', required: true, section: 'contact' },
      { fieldId: 'zip', fieldLabel: 'ZIP', fieldType: 'text', required: true, section: 'contact' },
      { fieldId: 'mailingAddress', fieldLabel: 'Mailing Address (if different)', fieldType: 'text', required: false, section: 'contact' },
      { fieldId: 'primaryPhone', fieldLabel: 'Primary Phone', fieldType: 'text', required: true, section: 'contact' },
      { fieldId: 'phoneType', fieldLabel: 'Phone Type', fieldType: 'radio', required: true, section: 'contact', options: ['Mobile', 'Home', 'Work'] },
      { fieldId: 'leaveVoicemail', fieldLabel: 'May we leave voicemail?', fieldType: 'radio', required: true, section: 'contact', options: ['Yes', 'No'] },
      { fieldId: 'secondaryPhone', fieldLabel: 'Secondary Phone', fieldType: 'text', required: false, section: 'contact' },
      { fieldId: 'email', fieldLabel: 'Email Address', fieldType: 'email', required: true, section: 'contact' },
      { fieldId: 'preferredContact', fieldLabel: 'Preferred Method of Contact', fieldType: 'radio', required: true, section: 'contact', options: ['Phone', 'Email', 'Text', 'Mail'] },
      { fieldId: 'appointmentReminders', fieldLabel: 'May we send appointment reminders via text/email?', fieldType: 'radio', required: true, section: 'contact', options: ['Yes', 'No'] },

      // Demographic Information
      { fieldId: 'section_demographic', fieldLabel: 'Demographic Information', fieldType: 'section_header', section: 'demographic' },
      { fieldId: 'maritalStatus', fieldLabel: 'Marital Status', fieldType: 'radio', required: true, section: 'demographic', options: ['Single', 'Married', 'Partnered', 'Separated', 'Divorced', 'Widowed'] },
      { fieldId: 'raceEthnicity', fieldLabel: 'Race/Ethnicity (optional)', fieldType: 'text', required: false, section: 'demographic' },
      { fieldId: 'primaryLanguage', fieldLabel: 'Primary Language', fieldType: 'text', required: true, section: 'demographic' },
      { fieldId: 'otherLanguages', fieldLabel: 'Other Languages', fieldType: 'text', required: false, section: 'demographic' },
      { fieldId: 'requireInterpreter', fieldLabel: 'Do you require an interpreter?', fieldType: 'radio', required: true, section: 'demographic', options: ['Yes', 'No'] },
      { fieldId: 'interpreterLanguage', fieldLabel: 'If yes, language', fieldType: 'text', required: false, section: 'demographic' },
      { fieldId: 'religiousAffiliation', fieldLabel: 'Religious/Spiritual Affiliation (optional)', fieldType: 'text', required: false, section: 'demographic' },

      // Employment & Education
      { fieldId: 'section_employment', fieldLabel: 'Employment & Education', fieldType: 'section_header', section: 'employment' },
      { fieldId: 'employmentStatus', fieldLabel: 'Employment Status', fieldType: 'radio', required: true, section: 'employment', options: ['Employed Full-Time', 'Employed Part-Time', 'Self-Employed', 'Unemployed', 'Student', 'Retired', 'Disabled', 'Homemaker'] },
      { fieldId: 'employerSchool', fieldLabel: 'Employer/School', fieldType: 'text', required: false, section: 'employment' },
      { fieldId: 'occupation', fieldLabel: 'Occupation', fieldType: 'text', required: false, section: 'employment' },
      { fieldId: 'education', fieldLabel: 'Highest Level of Education', fieldType: 'radio', required: true, section: 'employment', options: ['Some High School', 'High School/GED', 'Some College', "Associate's", "Bachelor's", "Master's", 'Doctorate'] },

      // Living Situation
      { fieldId: 'section_living', fieldLabel: 'Living Situation', fieldType: 'section_header', section: 'living' },
      { fieldId: 'livingArrangement', fieldLabel: 'Current Living Arrangement', fieldType: 'radio', required: true, section: 'living', options: ['Own Home', 'Rent', 'With Family', 'Group Home', 'Homeless', 'Other'] },
      { fieldId: 'livingArrangementOther', fieldLabel: 'If Other, please specify', fieldType: 'text', required: false, section: 'living' },
      { fieldId: 'livesWith', fieldLabel: 'Who do you live with?', fieldType: 'text', required: false, section: 'living' },
      { fieldId: 'householdSize', fieldLabel: 'Number of people in household', fieldType: 'number', required: false, section: 'living' },

      // Referring Information
      { fieldId: 'section_referral', fieldLabel: 'Referring Information', fieldType: 'section_header', section: 'referral' },
      { fieldId: 'hearAboutUs', fieldLabel: 'How did you hear about MentalSpace?', fieldType: 'text', required: false, section: 'referral' },
      { fieldId: 'referredBy', fieldLabel: 'Referred by', fieldType: 'text', required: false, section: 'referral' },
      { fieldId: 'pcpName', fieldLabel: 'Primary Care Physician', fieldType: 'text', required: false, section: 'referral' },
      { fieldId: 'pcpPhone', fieldLabel: 'PCP Phone', fieldType: 'text', required: false, section: 'referral' },
      { fieldId: 'contactPCP', fieldLabel: 'May we contact your PCP?', fieldType: 'radio', required: false, section: 'referral', options: ['Yes', 'No'] }
    ]
  },

  {
    formName: 'Client Insurance Information',
    formDescription: 'Insurance coverage details and authorization for billing',
    formType: 'Insurance',
    isRequired: false,
    assignedToNewClients: true,
    formFieldsJson: [
      // Primary Insurance
      { fieldId: 'section_primary', fieldLabel: 'Primary Insurance', fieldType: 'section_header', section: 'primary' },
      { fieldId: 'primaryInsuranceCompany', fieldLabel: 'Insurance Company', fieldType: 'text', required: true, section: 'primary' },
      { fieldId: 'primaryPolicyHolder', fieldLabel: 'Policy Holder Name', fieldType: 'text', required: true, section: 'primary' },
      { fieldId: 'primaryPolicyHolderDOB', fieldLabel: 'Policy Holder Date of Birth', fieldType: 'date', required: true, section: 'primary' },
      { fieldId: 'primaryRelationship', fieldLabel: 'Relationship to Client', fieldType: 'radio', required: true, section: 'primary', options: ['Self', 'Spouse', 'Parent', 'Other'] },
      { fieldId: 'primaryRelationshipOther', fieldLabel: 'If Other, please specify', fieldType: 'text', required: false, section: 'primary' },
      { fieldId: 'primaryPolicyNumber', fieldLabel: 'Policy Number', fieldType: 'text', required: true, section: 'primary' },
      { fieldId: 'primaryGroupNumber', fieldLabel: 'Group Number', fieldType: 'text', required: false, section: 'primary' },
      { fieldId: 'primaryInsurancePhone', fieldLabel: 'Insurance Phone Number', fieldType: 'text', required: true, section: 'primary' },
      { fieldId: 'primaryInsuranceAddress', fieldLabel: 'Insurance Address', fieldType: 'text', required: false, section: 'primary' },
      { fieldId: 'primaryEffectiveDate', fieldLabel: 'Effective Date', fieldType: 'date', required: false, section: 'primary' },
      { fieldId: 'primaryCopay', fieldLabel: 'Copay Amount', fieldType: 'number', required: false, section: 'primary' },
      { fieldId: 'primaryDeductible', fieldLabel: 'Deductible', fieldType: 'number', required: false, section: 'primary' },
      { fieldId: 'primaryDeductibleMet', fieldLabel: 'Deductible Met', fieldType: 'number', required: false, section: 'primary' },
      { fieldId: 'primaryOOPMax', fieldLabel: 'Out-of-Pocket Max', fieldType: 'number', required: false, section: 'primary' },

      // Secondary Insurance
      { fieldId: 'section_secondary', fieldLabel: 'Secondary Insurance (if applicable)', fieldType: 'section_header', section: 'secondary' },
      { fieldId: 'secondaryInsuranceCompany', fieldLabel: 'Insurance Company', fieldType: 'text', required: false, section: 'secondary' },
      { fieldId: 'secondaryPolicyHolder', fieldLabel: 'Policy Holder Name', fieldType: 'text', required: false, section: 'secondary' },
      { fieldId: 'secondaryPolicyNumber', fieldLabel: 'Policy Number', fieldType: 'text', required: false, section: 'secondary' },
      { fieldId: 'secondaryGroupNumber', fieldLabel: 'Group Number', fieldType: 'text', required: false, section: 'secondary' },
      { fieldId: 'secondaryInsurancePhone', fieldLabel: 'Insurance Phone Number', fieldType: 'text', required: false, section: 'secondary' },

      // Authorization
      { fieldId: 'section_authorization', fieldLabel: 'Insurance Authorization', fieldType: 'section_header', section: 'authorization' },
      { fieldId: 'authorizationText', fieldLabel: 'I authorize MentalSpace to bill my insurance company for services rendered. I understand that I am financially responsible for any charges not covered by insurance, including copays, coinsurance, deductibles, and non-covered services. I authorize payment of medical benefits directly to MentalSpace. I authorize MentalSpace to release any medical information necessary to process insurance claims.', fieldType: 'info_text', section: 'authorization' },
      { fieldId: 'authorizationSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'authorization' },
      { fieldId: 'authorizationDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'authorization' },

      // Assignment of Benefits
      { fieldId: 'section_assignment', fieldLabel: 'Assignment of Benefits', fieldType: 'section_header', section: 'assignment' },
      { fieldId: 'assignmentText', fieldLabel: 'I hereby assign all medical and/or surgical benefits, including major medical benefits and Medicare/Medicaid benefits to which I am entitled, to MentalSpace. This assignment will remain in effect until revoked by me in writing. A photocopy of this assignment is to be considered as valid as the original. I understand that I am financially responsible for all charges whether or not paid by said insurance.', fieldType: 'info_text', section: 'assignment' },
      { fieldId: 'assignmentSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'assignment' },
      { fieldId: 'assignmentDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'assignment' }
    ]
  },

  {
    formName: 'Client History',
    formDescription: 'Mental health history, medical history, substance use, and treatment goals',
    formType: 'Initial_Intake',
    isRequired: true,
    assignedToNewClients: true,
    formFieldsJson: [
      // Presenting Concerns
      { fieldId: 'section_presenting', fieldLabel: 'Presenting Concerns', fieldType: 'section_header', section: 'presenting' },
      { fieldId: 'seekingHelp', fieldLabel: 'Why are you seeking help now? What is happening or is different? What stressors do you have? What do you hope will be different by seeking help?', fieldType: 'textarea', required: true, section: 'presenting', rows: 5 },
      { fieldId: 'issueDetails', fieldLabel: 'Please give more details about the issue you named above: When did it start? How often does it happen? How does it affect your life? How have you dealt with it so far?', fieldType: 'textarea', required: true, section: 'presenting', rows: 5 },

      // Mental Health History
      { fieldId: 'section_mh_history', fieldLabel: 'Mental Health History', fieldType: 'section_header', section: 'mh_history' },
      { fieldId: 'priorTreatment', fieldLabel: 'Have you ever received mental health treatment before?', fieldType: 'radio', required: true, section: 'mh_history', options: ['Yes', 'No'] },
      { fieldId: 'priorTreatmentDetails', fieldLabel: 'If yes, please provide details (dates, providers, diagnoses, treatment type)', fieldType: 'textarea', required: false, section: 'mh_history', rows: 3 },
      { fieldId: 'priorHospitalization', fieldLabel: 'Have you ever been hospitalized for mental health reasons?', fieldType: 'radio', required: true, section: 'mh_history', options: ['Yes', 'No'] },
      { fieldId: 'hospitalizationDetails', fieldLabel: 'If yes, when and where?', fieldType: 'textarea', required: false, section: 'mh_history', rows: 2 },
      { fieldId: 'currentDiagnoses', fieldLabel: 'Current or past psychiatric diagnoses', fieldType: 'textarea', required: false, section: 'mh_history', rows: 2 },

      // Family Mental Health History
      { fieldId: 'section_family_mh', fieldLabel: 'Family Mental Health History', fieldType: 'section_header', section: 'family_mh' },
      { fieldId: 'familyMHHistory', fieldLabel: 'Has anyone in your family experienced mental health or substance use issues? If so, who was it? Did they seek help or get a diagnosis? What was it like for them?', fieldType: 'textarea', required: false, section: 'family_mh', rows: 4 },

      // Medical History
      { fieldId: 'section_medical', fieldLabel: 'Medical History', fieldType: 'section_header', section: 'medical' },
      { fieldId: 'currentConditions', fieldLabel: 'Current medical conditions', fieldType: 'textarea', required: false, section: 'medical', rows: 3 },
      { fieldId: 'pastSurgeries', fieldLabel: 'Past surgeries or hospitalizations', fieldType: 'textarea', required: false, section: 'medical', rows: 3 },
      { fieldId: 'allergies', fieldLabel: 'Allergies (medications, foods, other)', fieldType: 'textarea', required: false, section: 'medical', rows: 2 },
      { fieldId: 'currentMedications', fieldLabel: 'Current medications (name, dosage, frequency, prescriber)', fieldType: 'textarea', required: false, section: 'medical', rows: 4 },

      // Substance Use History
      { fieldId: 'section_substance', fieldLabel: 'Substance Use History', fieldType: 'section_header', section: 'substance' },
      { fieldId: 'alcoholUse', fieldLabel: 'Alcohol', fieldType: 'radio', required: true, section: 'substance', options: ['Never', 'Past use', 'Current use'] },
      { fieldId: 'alcoholFrequency', fieldLabel: 'Alcohol frequency', fieldType: 'text', required: false, section: 'substance' },
      { fieldId: 'tobaccoUse', fieldLabel: 'Tobacco/Nicotine', fieldType: 'radio', required: true, section: 'substance', options: ['Never', 'Past use', 'Current use'] },
      { fieldId: 'tobaccoDetails', fieldLabel: 'Type/Frequency', fieldType: 'text', required: false, section: 'substance' },
      { fieldId: 'cannabisUse', fieldLabel: 'Cannabis/Marijuana', fieldType: 'radio', required: true, section: 'substance', options: ['Never', 'Past use', 'Current use'] },
      { fieldId: 'cannabisFrequency', fieldLabel: 'Cannabis frequency', fieldType: 'text', required: false, section: 'substance' },
      { fieldId: 'otherSubstances', fieldLabel: 'Other substances', fieldType: 'textarea', required: false, section: 'substance', rows: 2 },
      { fieldId: 'substanceTreatment', fieldLabel: 'Have you ever received treatment for substance use?', fieldType: 'radio', required: true, section: 'substance', options: ['Yes', 'No'] },
      { fieldId: 'substanceTreatmentDetails', fieldLabel: 'If yes, please provide details', fieldType: 'textarea', required: false, section: 'substance', rows: 2 },

      // Social History
      { fieldId: 'section_social', fieldLabel: 'Social History', fieldType: 'section_header', section: 'social' },
      { fieldId: 'familyComposition', fieldLabel: 'Family composition and relationships', fieldType: 'textarea', required: false, section: 'social', rows: 3 },
      { fieldId: 'childhoodHistory', fieldLabel: 'Childhood and developmental history', fieldType: 'textarea', required: false, section: 'social', rows: 3 },
      { fieldId: 'socialActivities', fieldLabel: 'Social activities and relationships', fieldType: 'textarea', required: false, section: 'social', rows: 3 },

      // Trauma History
      { fieldId: 'section_trauma', fieldLabel: 'Trauma History', fieldType: 'section_header', section: 'trauma' },
      { fieldId: 'traumaExperiences', fieldLabel: 'Have you experienced any of the following? (Check all that apply)', fieldType: 'checkbox_group', required: false, section: 'trauma', options: ['Physical abuse', 'Sexual abuse', 'Emotional abuse', 'Neglect', 'Domestic violence', 'Combat exposure', 'Serious accident', 'Natural disaster', 'Loss of loved one', 'Other traumatic event'] },
      { fieldId: 'traumaDetails', fieldLabel: 'If comfortable, please provide any additional details', fieldType: 'textarea', required: false, section: 'trauma', rows: 3 },

      // Legal History
      { fieldId: 'section_legal', fieldLabel: 'Legal History', fieldType: 'section_header', section: 'legal' },
      { fieldId: 'legalInvolvement', fieldLabel: 'Have you ever been arrested or involved in legal proceedings?', fieldType: 'radio', required: true, section: 'legal', options: ['Yes', 'No'] },
      { fieldId: 'legalDetails', fieldLabel: 'If yes, please provide details', fieldType: 'textarea', required: false, section: 'legal', rows: 2 },
      { fieldId: 'probationParole', fieldLabel: 'Are you currently on probation or parole?', fieldType: 'radio', required: true, section: 'legal', options: ['Yes', 'No'] },

      // Strengths and Goals
      { fieldId: 'section_goals', fieldLabel: 'Strengths and Goals', fieldType: 'section_header', section: 'goals' },
      { fieldId: 'personalStrengths', fieldLabel: 'What are your personal strengths and coping skills?', fieldType: 'textarea', required: false, section: 'goals', rows: 3 },
      { fieldId: 'therapyGoals', fieldLabel: 'What are your goals for therapy?', fieldType: 'textarea', required: true, section: 'goals', rows: 3 },
      { fieldId: 'additionalInfo', fieldLabel: 'What else is important for us to know about you?', fieldType: 'textarea', required: false, section: 'goals', rows: 3 }
    ]
  },

  {
    formName: 'Emergency & Other Contacts',
    formDescription: 'Emergency contacts and authorization to contact them',
    formType: 'Consent',
    isRequired: true,
    assignedToNewClients: true,
    formFieldsJson: [
      // Emergency Contact #1
      { fieldId: 'section_emergency1', fieldLabel: 'Emergency Contact #1', fieldType: 'section_header', section: 'emergency1' },
      { fieldId: 'emergency1Name', fieldLabel: 'Full Name', fieldType: 'text', required: true, section: 'emergency1' },
      { fieldId: 'emergency1Relationship', fieldLabel: 'Relationship to You', fieldType: 'text', required: true, section: 'emergency1' },
      { fieldId: 'emergency1PrimaryPhone', fieldLabel: 'Primary Phone', fieldType: 'text', required: true, section: 'emergency1' },
      { fieldId: 'emergency1AltPhone', fieldLabel: 'Alternative Phone', fieldType: 'text', required: false, section: 'emergency1' },
      { fieldId: 'emergency1Email', fieldLabel: 'Email', fieldType: 'email', required: false, section: 'emergency1' },
      { fieldId: 'emergency1Address', fieldLabel: 'Address', fieldType: 'text', required: false, section: 'emergency1' },

      // Emergency Contact #2
      { fieldId: 'section_emergency2', fieldLabel: 'Emergency Contact #2', fieldType: 'section_header', section: 'emergency2' },
      { fieldId: 'emergency2Name', fieldLabel: 'Full Name', fieldType: 'text', required: false, section: 'emergency2' },
      { fieldId: 'emergency2Relationship', fieldLabel: 'Relationship to You', fieldType: 'text', required: false, section: 'emergency2' },
      { fieldId: 'emergency2PrimaryPhone', fieldLabel: 'Primary Phone', fieldType: 'text', required: false, section: 'emergency2' },
      { fieldId: 'emergency2AltPhone', fieldLabel: 'Alternative Phone', fieldType: 'text', required: false, section: 'emergency2' },
      { fieldId: 'emergency2Email', fieldLabel: 'Email', fieldType: 'email', required: false, section: 'emergency2' },
      { fieldId: 'emergency2Address', fieldLabel: 'Address', fieldType: 'text', required: false, section: 'emergency2' },

      // Authorization
      { fieldId: 'section_authorization', fieldLabel: 'Authorization to Contact', fieldType: 'section_header', section: 'authorization' },
      { fieldId: 'authorizationText', fieldLabel: 'I authorize MentalSpace to contact the above individuals in case of emergency, including situations where I may be at risk of harm to myself or others, or when I am unable to make decisions for myself. I understand that only information necessary for my safety and wellbeing will be shared.', fieldType: 'info_text', section: 'authorization' },
      { fieldId: 'authorizationSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'authorization' },
      { fieldId: 'authorizationDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'authorization' },

      // Person to Contact for Appointment Changes
      { fieldId: 'section_appointments', fieldLabel: 'Person to Contact for Appointment Changes', fieldType: 'section_header', section: 'appointments' },
      { fieldId: 'appointmentContactInfo', fieldLabel: 'If you would like us to contact someone other than yourself regarding appointment scheduling or changes:', fieldType: 'info_text', section: 'appointments' },
      { fieldId: 'appointmentContactName', fieldLabel: 'Name', fieldType: 'text', required: false, section: 'appointments' },
      { fieldId: 'appointmentContactRelationship', fieldLabel: 'Relationship', fieldType: 'text', required: false, section: 'appointments' },
      { fieldId: 'appointmentContactPhone', fieldLabel: 'Phone', fieldType: 'text', required: false, section: 'appointments' },

      // Responsible Party for Minor
      { fieldId: 'section_minor', fieldLabel: 'Responsible Party for Minor (if applicable)', fieldType: 'section_header', section: 'minor' },
      { fieldId: 'guardianName', fieldLabel: 'Parent/Guardian Name', fieldType: 'text', required: false, section: 'minor' },
      { fieldId: 'guardianRelationship', fieldLabel: 'Relationship to Client', fieldType: 'text', required: false, section: 'minor' },
      { fieldId: 'guardianPhone', fieldLabel: 'Phone', fieldType: 'text', required: false, section: 'minor' },
      { fieldId: 'guardianEmail', fieldLabel: 'Email', fieldType: 'email', required: false, section: 'minor' },
      { fieldId: 'guardianAddress', fieldLabel: 'Address', fieldType: 'text', required: false, section: 'minor' }
    ]
  },

  {
    formName: 'Consent for Mental Health Services',
    formDescription: 'Comprehensive consent form covering services, confidentiality, fees, and client rights',
    formType: 'Consent',
    isRequired: true,
    assignedToNewClients: true,
    formFieldsJson: [
      { fieldId: 'intro', fieldLabel: 'This document contains important information about our professional services and business policies. Please read it carefully and ask questions about anything that is unclear.', fieldType: 'info_text', section: 'intro' },

      // Nature of Services
      { fieldId: 'section_services', fieldLabel: 'Nature of Services', fieldType: 'section_header', section: 'services' },
      { fieldId: 'servicesInfo', fieldLabel: 'MentalSpace provides mental health counseling, psychotherapy, and related professional services. Services may include individual therapy, family therapy, couples therapy, group therapy, psychological assessment, case management, and care coordination. Therapy is a collaborative process that requires active participation. While therapy can be beneficial, I understand that results cannot be guaranteed. I understand that progress may involve experiencing uncomfortable feelings and thoughts as part of the therapeutic process.', fieldType: 'info_text', section: 'services' },
      { fieldId: 'servicesAcknowledge', fieldLabel: 'I acknowledge understanding of the nature of services', fieldType: 'checkbox', required: true, section: 'services' },

      // Therapist Qualifications
      { fieldId: 'section_qualifications', fieldLabel: 'Therapist Qualifications', fieldType: 'section_header', section: 'qualifications' },
      { fieldId: 'qualificationsInfo', fieldLabel: 'All therapists at MentalSpace are licensed or supervised by licensed professionals in the State of Georgia. Our therapists hold licenses as Licensed Professional Counselors (LPC), Licensed Clinical Social Workers (LCSW), Licensed Marriage and Family Therapists (LMFT), or Licensed Psychologists. Supervision is provided in accordance with Georgia licensure requirements.', fieldType: 'info_text', section: 'qualifications' },

      // Confidentiality
      { fieldId: 'section_confidentiality', fieldLabel: 'Confidentiality', fieldType: 'section_header', section: 'confidentiality' },
      { fieldId: 'confidentialityInfo', fieldLabel: 'All communications between you and your therapist are confidential and will not be disclosed to any third party without your written authorization, except as required or permitted by law. Georgia law and professional ethics require disclosure of confidential information in the following circumstances: (1) When there is reasonable suspicion of child abuse, neglect, or exploitation; (2) When there is reasonable suspicion of abuse, neglect, or exploitation of an elderly or disabled adult; (3) When you present a serious danger of violence to yourself or others; (4) When ordered by a court of law; (5) When necessary for continuity of care or consultation with other healthcare providers (with your authorization); (6) When required for insurance billing purposes. For minors under age 18, parents/guardians have the legal right to access treatment information. However, therapists will discuss the importance of privacy with parents and minors to create an environment conducive to effective treatment.', fieldType: 'info_text', section: 'confidentiality' },
      { fieldId: 'confidentialityAcknowledge', fieldLabel: 'I acknowledge understanding the limits of confidentiality', fieldType: 'checkbox', required: true, section: 'confidentiality' },

      // Electronic Communications
      { fieldId: 'section_electronic', fieldLabel: 'Electronic Communications', fieldType: 'section_header', section: 'electronic' },
      { fieldId: 'electronicInfo', fieldLabel: 'Email and text messaging are not completely secure or confidential methods of communication. I understand that MentalSpace uses reasonable safeguards to protect electronic communications, but cannot guarantee the security of email or text messages.', fieldType: 'info_text', section: 'electronic' },
      { fieldId: 'electronicConsent', fieldLabel: 'I consent to communicate via', fieldType: 'checkbox_group', required: true, section: 'electronic', options: ['Email', 'Text', 'Patient Portal', 'Phone only'] },

      // Telehealth
      { fieldId: 'section_telehealth', fieldLabel: 'Telehealth Services', fieldType: 'section_header', section: 'telehealth' },
      { fieldId: 'telehealthInfo', fieldLabel: 'MentalSpace offers telehealth services via secure video conferencing. I understand that telehealth sessions have the same legal and ethical requirements as in-person sessions. I understand that I may discontinue telehealth services at any time and request in-person services instead. Telehealth services are available only when both client and therapist are physically located in Georgia.', fieldType: 'info_text', section: 'telehealth' },
      { fieldId: 'telehealthConsent', fieldLabel: 'I consent to receive mental health services via telehealth', fieldType: 'checkbox', required: false, section: 'telehealth' },

      // Fees and Payment
      { fieldId: 'section_fees', fieldLabel: 'Fees and Payment', fieldType: 'section_header', section: 'fees' },
      { fieldId: 'feesInfo', fieldLabel: 'I understand that I am responsible for all charges incurred, including copays, coinsurance, deductibles, and any services not covered by insurance. If my insurance company does not pay for services, I agree to pay the full fee.', fieldType: 'info_text', section: 'fees' },
      { fieldId: 'feesAcknowledge', fieldLabel: 'I acknowledge understanding of fees and payment responsibility', fieldType: 'checkbox', required: true, section: 'fees' },

      // Cancellation Policy
      { fieldId: 'section_cancellation', fieldLabel: 'Cancellation Policy', fieldType: 'section_header', section: 'cancellation' },
      { fieldId: 'cancellationInfo', fieldLabel: 'Appointments cancelled with less than 24 hours notice will be charged the full session fee. Insurance does not cover missed appointments or late cancellations. Emergency situations will be considered on a case-by-case basis. After three consecutive missed appointments without notice, your therapist may terminate services.', fieldType: 'info_text', section: 'cancellation' },
      { fieldId: 'cancellationAcknowledge', fieldLabel: 'I acknowledge understanding the cancellation policy', fieldType: 'checkbox', required: true, section: 'cancellation' },

      // Client Rights
      { fieldId: 'section_rights', fieldLabel: 'Client Rights', fieldType: 'section_header', section: 'rights' },
      { fieldId: 'rightsInfo', fieldLabel: 'You have the right to: Receive treatment in a safe, respectful environment free from discrimination; Be informed about your diagnosis, treatment options, and progress; Participate in treatment planning decisions; Refuse or withdraw consent for treatment; Request a second opinion or consultation; File a complaint with the Georgia Composite Board if you believe your therapist has acted unethically; File a complaint under HIPAA if you believe your privacy rights have been violated.', fieldType: 'info_text', section: 'rights' },
      { fieldId: 'rightsAcknowledge', fieldLabel: 'I acknowledge understanding my rights as a client', fieldType: 'checkbox', required: true, section: 'rights' },

      // Consent Signature
      { fieldId: 'section_signature', fieldLabel: 'Consent Signature', fieldType: 'section_header', section: 'signature' },
      { fieldId: 'consentConfirmation', fieldLabel: 'By signing below, I acknowledge that: I have read and understand this consent form; I have had the opportunity to ask questions; I consent to receive mental health services from MentalSpace; I understand the limits of confidentiality; I agree to the fee structure and payment policies; I understand the cancellation policy; I understand my rights as a client', fieldType: 'info_text', section: 'signature' },
      { fieldId: 'clientName', fieldLabel: 'Client Name (Print)', fieldType: 'text', required: true, section: 'signature' },
      { fieldId: 'clientSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'signature' },
      { fieldId: 'clientSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'signature' },
      { fieldId: 'guardianSignature', fieldLabel: 'Parent/Guardian Signature (if minor)', fieldType: 'signature', required: false, section: 'signature' },
      { fieldId: 'guardianSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'signature' },
      { fieldId: 'therapistSignature', fieldLabel: 'Therapist Signature', fieldType: 'signature', required: false, section: 'signature' },
      { fieldId: 'therapistSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'signature' }
    ]
  }
];

// Continue with remaining forms (Part 2)...
const forms2 = [
  {
    formName: 'Payment Authorization',
    formDescription: 'Credit card authorization for recurring payments and sliding scale fee arrangements',
    formType: 'Financial',
    isRequired: false,
    assignedToNewClients: false,
    formFieldsJson: [
      // Credit Card Authorization
      { fieldId: 'section_card', fieldLabel: 'Credit Card Authorization for Recurring Payments', fieldType: 'section_header', section: 'card' },
      { fieldId: 'authorizationIntro', fieldLabel: 'I authorize MentalSpace to charge my credit card for therapy services, copays, and any other fees related to my treatment.', fieldType: 'info_text', section: 'card' },
      { fieldId: 'cardholderName', fieldLabel: 'Cardholder Name', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'billingAddress', fieldLabel: 'Billing Address', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'billingCity', fieldLabel: 'City', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'billingState', fieldLabel: 'State', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'billingZip', fieldLabel: 'ZIP', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'cardType', fieldLabel: 'Card Type', fieldType: 'radio', required: true, section: 'card', options: ['Visa', 'Mastercard', 'American Express', 'Discover', 'HSA/FSA'] },
      { fieldId: 'cardNumber', fieldLabel: 'Card Number', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'expirationDate', fieldLabel: 'Expiration Date (MM/YY)', fieldType: 'text', required: true, section: 'card' },
      { fieldId: 'cvv', fieldLabel: 'CVV', fieldType: 'text', required: true, section: 'card' },

      // Authorization Terms
      { fieldId: 'section_terms', fieldLabel: 'Authorization Terms', fieldType: 'section_header', section: 'terms' },
      { fieldId: 'termsInfo', fieldLabel: 'I authorize MentalSpace to charge my credit card on file for: Session fees, copays, and coinsurance at the time of each appointment; Missed appointment fees (within 24 hours of missed session); Outstanding balances (within 7 days of service date if insurance does not pay); Any additional fees for reports, letters, or other services as agreed. I understand that this authorization will remain in effect until I revoke it in writing or until my treatment at MentalSpace is terminated. I agree to notify MentalSpace immediately if my credit card information changes. If a charge is declined, I understand that I am still responsible for payment and may be charged a declined payment fee of $35. I also understand that MentalSpace may suspend services until payment arrangements are made.', fieldType: 'info_text', section: 'terms' },
      { fieldId: 'termsAcknowledge', fieldLabel: 'I acknowledge understanding the authorization terms', fieldType: 'checkbox', required: true, section: 'terms' },

      // Sliding Scale
      { fieldId: 'section_sliding', fieldLabel: 'Sliding Scale Fee Arrangement (if applicable)', fieldType: 'section_header', section: 'sliding' },
      { fieldId: 'slidingScaleInfo', fieldLabel: 'MentalSpace offers a limited number of sliding scale fee arrangements based on financial need. To qualify, you must provide documentation of income.', fieldType: 'info_text', section: 'sliding' },
      { fieldId: 'requestSlidingScale', fieldLabel: 'I am requesting a sliding scale fee', fieldType: 'checkbox', required: false, section: 'sliding' },
      { fieldId: 'agreedReducedFee', fieldLabel: 'Agreed reduced fee per session', fieldType: 'number', required: false, section: 'sliding' },
      { fieldId: 'slidingScaleNote', fieldLabel: 'I understand that this fee arrangement will be reviewed every 6 months and may be adjusted based on changes in my financial situation.', fieldType: 'info_text', section: 'sliding' },

      // Financial Hardship
      { fieldId: 'section_hardship', fieldLabel: 'Financial Hardship', fieldType: 'section_header', section: 'hardship' },
      { fieldId: 'hardshipInfo', fieldLabel: 'If you are experiencing financial hardship and cannot pay for services, please speak with your therapist or our billing department to discuss payment options. We want to work with you to ensure you can continue receiving care.', fieldType: 'info_text', section: 'hardship' },

      // Signature
      { fieldId: 'section_signature', fieldLabel: 'Signature', fieldType: 'section_header', section: 'signature' },
      { fieldId: 'clientSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'signature' },
      { fieldId: 'signatureDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'signature' },
      { fieldId: 'printName', fieldLabel: 'Print Name', fieldType: 'text', required: true, section: 'signature' }
    ]
  },

  {
    formName: 'Release of Information',
    formDescription: 'Authorization to release or obtain confidential health information',
    formType: 'Consent',
    isRequired: false,
    assignedToNewClients: false,
    formFieldsJson: [
      { fieldId: 'intro', fieldLabel: 'This form authorizes MentalSpace to release or obtain confidential health information. This authorization is voluntary and you may refuse to sign it. You may revoke this authorization at any time by providing written notice to MentalSpace.', fieldType: 'info_text', section: 'intro' },

      // Client Information
      { fieldId: 'section_client', fieldLabel: 'Client Information', fieldType: 'section_header', section: 'client' },
      { fieldId: 'clientName', fieldLabel: 'Client Name', fieldType: 'text', required: true, section: 'client' },
      { fieldId: 'dateOfBirth', fieldLabel: 'Date of Birth', fieldType: 'date', required: true, section: 'client' },
      { fieldId: 'clientAddress', fieldLabel: 'Address', fieldType: 'text', required: true, section: 'client' },

      // Authorization Direction
      { fieldId: 'section_direction', fieldLabel: 'Authorization', fieldType: 'section_header', section: 'direction' },
      { fieldId: 'authorizationDirection', fieldLabel: 'I authorize', fieldType: 'radio', required: true, section: 'direction', options: ['MentalSpace to RELEASE information TO the individual/organization listed below', 'MentalSpace to OBTAIN information FROM the individual/organization listed below', 'Two-way exchange of information between MentalSpace and the individual/organization below'] },

      // Recipient Information
      { fieldId: 'section_recipient', fieldLabel: 'Recipient of Information', fieldType: 'section_header', section: 'recipient' },
      { fieldId: 'recipientName', fieldLabel: 'Name of Individual/Organization', fieldType: 'text', required: true, section: 'recipient' },
      { fieldId: 'recipientAddress', fieldLabel: 'Address', fieldType: 'text', required: true, section: 'recipient' },
      { fieldId: 'recipientPhone', fieldLabel: 'Phone', fieldType: 'text', required: false, section: 'recipient' },
      { fieldId: 'recipientFax', fieldLabel: 'Fax', fieldType: 'text', required: false, section: 'recipient' },
      { fieldId: 'recipientEmail', fieldLabel: 'Email', fieldType: 'email', required: false, section: 'recipient' },

      // Information to be Released
      { fieldId: 'section_info', fieldLabel: 'Information to be Released', fieldType: 'section_header', section: 'info' },
      { fieldId: 'informationTypes', fieldLabel: 'Check all that apply', fieldType: 'checkbox_group', required: true, section: 'info', options: ['Complete clinical record', 'Treatment plan', 'Progress notes for specific dates', 'Psychological testing results', 'Diagnosis and treatment summary', 'Medication information', 'Discharge summary', 'Billing/insurance information', 'Other'] },
      { fieldId: 'progressNotesDates', fieldLabel: 'If Progress notes, specify dates', fieldType: 'text', required: false, section: 'info' },
      { fieldId: 'otherInfo', fieldLabel: 'If Other, please specify', fieldType: 'text', required: false, section: 'info' },

      // Special Categories
      { fieldId: 'section_special', fieldLabel: 'Special Categories of Information', fieldType: 'section_header', section: 'special' },
      { fieldId: 'specialInfo', fieldLabel: 'Federal and Georgia law provide special protections for certain types of health information. To release the following information, you must provide specific written authorization:', fieldType: 'info_text', section: 'special' },
      { fieldId: 'specialCategories', fieldLabel: 'I authorize release of', fieldType: 'checkbox_group', required: false, section: 'special', options: ['HIV/AIDS information', 'Substance abuse treatment information (covered by 42 CFR Part 2)', 'Mental health information', 'Genetic testing information'] },

      // Purpose
      { fieldId: 'section_purpose', fieldLabel: 'Purpose of Release', fieldType: 'section_header', section: 'purpose' },
      { fieldId: 'releaseReason', fieldLabel: 'Purpose (check all that apply)', fieldType: 'checkbox_group', required: true, section: 'purpose', options: ['Continuity of care/coordination with other providers', 'Insurance/billing purposes', 'Legal proceedings', 'School/educational purposes', 'Disability determination', 'Personal use', 'Other'] },
      { fieldId: 'purposeOther', fieldLabel: 'If Other, please specify', fieldType: 'text', required: false, section: 'purpose' },

      // Expiration
      { fieldId: 'section_expiration', fieldLabel: 'Expiration', fieldType: 'section_header', section: 'expiration' },
      { fieldId: 'expirationType', fieldLabel: 'This authorization will expire', fieldType: 'radio', required: true, section: 'expiration', options: ['On this date', 'Upon completion of treatment', 'One year from the date of signature', 'When the following event occurs'] },
      { fieldId: 'expirationDate', fieldLabel: 'If specific date, enter here', fieldType: 'date', required: false, section: 'expiration' },
      { fieldId: 'expirationEvent', fieldLabel: 'If specific event, describe here', fieldType: 'text', required: false, section: 'expiration' },

      // Client Rights
      { fieldId: 'section_rights', fieldLabel: 'Client Rights and Understanding', fieldType: 'section_header', section: 'rights' },
      { fieldId: 'rightsInfo', fieldLabel: 'By signing this authorization, I understand that: I have the right to revoke this authorization at any time by providing written notice to MentalSpace, except to the extent that action has already been taken based on this authorization; I have the right to refuse to sign this authorization and that my treatment will not be conditioned on signing this authorization, except in limited circumstances where treatment is provided solely for the purpose of creating health information to disclose to a third party; Information disclosed pursuant to this authorization may be subject to redisclosure by the recipient and may no longer be protected by federal or state privacy laws; I have the right to inspect or copy the health information to be disclosed as provided by law; MentalSpace will not receive any financial compensation in exchange for the release of my information except for reasonable fees associated with copying and transmitting records; If I refuse to sign this authorization, it will not affect my ability to receive treatment, payment, enrollment, or eligibility for benefits, except in limited circumstances.', fieldType: 'info_text', section: 'rights' },
      { fieldId: 'rightsAcknowledge', fieldLabel: 'I acknowledge understanding my rights', fieldType: 'checkbox', required: true, section: 'rights' },

      // Signatures
      { fieldId: 'section_signature', fieldLabel: 'Signatures', fieldType: 'section_header', section: 'signature' },
      { fieldId: 'clientSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'signature' },
      { fieldId: 'clientSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'signature' },
      { fieldId: 'clientPrintName', fieldLabel: 'Print Name', fieldType: 'text', required: true, section: 'signature' },
      { fieldId: 'guardianSignature', fieldLabel: 'Parent/Guardian Signature (if minor)', fieldType: 'signature', required: false, section: 'signature' },
      { fieldId: 'guardianSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'signature' },
      { fieldId: 'guardianPrintName', fieldLabel: 'Print Name', fieldType: 'text', required: false, section: 'signature' },
      { fieldId: 'guardianRelationship', fieldLabel: 'Relationship to Client', fieldType: 'text', required: false, section: 'signature' },

      // Revocation Section
      { fieldId: 'section_revocation', fieldLabel: 'Revocation of Authorization', fieldType: 'section_header', section: 'revocation' },
      { fieldId: 'revocationInfo', fieldLabel: 'To revoke this authorization, please complete the section below and return to MentalSpace. I wish to revoke the authorization signed on [date]. I understand that this revocation does not apply to information already released based on this authorization.', fieldType: 'info_text', section: 'revocation' },
      { fieldId: 'revocationSignature', fieldLabel: 'Signature', fieldType: 'signature', required: false, section: 'revocation' },
      { fieldId: 'revocationDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'revocation' }
    ]
  },

  {
    formName: 'Notice of Privacy Practices (HIPAA)',
    formDescription: 'HIPAA Notice of Privacy Practices for Protected Health Information',
    formType: 'Notice',
    isRequired: true,
    assignedToNewClients: true,
    formFieldsJson: [
      { fieldId: 'title', fieldLabel: 'HIPAA NOTICE OF PRIVACY PRACTICES FOR PROTECTED HEALTH INFORMATION', fieldType: 'section_header', section: 'title' },
      { fieldId: 'intro', fieldLabel: 'THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.', fieldType: 'info_text', section: 'intro' },

      { fieldId: 'section_commitment', fieldLabel: 'Our Commitment to Your Privacy', fieldType: 'section_header', section: 'commitment' },
      { fieldId: 'commitmentInfo', fieldLabel: 'MentalSpace is committed to protecting the privacy of your protected health information (PHI). This Notice of Privacy Practices describes how we may use and disclose your PHI to carry out treatment, payment, or healthcare operations, and for other purposes that are permitted or required by law. It also describes your rights regarding your health information. We are required by law to maintain the privacy of your PHI and to provide you with this notice of our legal duties and privacy practices. We are required to abide by the terms of this Notice of Privacy Practices currently in effect.', fieldType: 'info_text', section: 'commitment' },

      { fieldId: 'section_uses', fieldLabel: 'How We May Use and Disclose Your Health Information', fieldType: 'section_header', section: 'uses' },
      { fieldId: 'treatmentInfo', fieldLabel: '1. For Treatment: We may use and disclose your health information to provide, coordinate, or manage your healthcare and related services. For example, we may disclose information to other healthcare providers involved in your care, such as your primary care physician or psychiatrist, to coordinate your treatment.', fieldType: 'info_text', section: 'uses' },
      { fieldId: 'paymentInfo', fieldLabel: '2. For Payment: We may use and disclose your health information to obtain payment for services provided. For example, we may send claims to your insurance company that include information about your diagnosis and treatment. We may also contact your insurance company to verify coverage or obtain prior authorization.', fieldType: 'info_text', section: 'uses' },
      { fieldId: 'operationsInfo', fieldLabel: '3. For Healthcare Operations: We may use and disclose your health information for healthcare operations purposes, including quality assessment, training, accreditation, business planning, and management activities. For example, we may use information to improve the quality of care we provide or to train staff.', fieldType: 'info_text', section: 'uses' },
      { fieldId: 'otherUsesInfo', fieldLabel: '4. Other Uses and Disclosures Without Your Authorization: We may use or disclose your health information without your written authorization when required by law, for public health activities, in response to court orders, to avert serious threats to health or safety, for workers\' compensation, to coroners and funeral directors, for law enforcement, for specialized government functions, and for research purposes when approved by an institutional review board.', fieldType: 'info_text', section: 'uses' },

      { fieldId: 'section_authorization', fieldLabel: 'Uses and Disclosures That Require Your Authorization', fieldType: 'section_header', section: 'authorization' },
      { fieldId: 'authInfo', fieldLabel: 'Other uses and disclosures not described in this notice will be made only with your written authorization. You may revoke your authorization at any time by providing written notice to MentalSpace, except to the extent that we have already taken action in reliance on the authorization. The following uses and disclosures always require your specific written authorization: Most uses and disclosures of psychotherapy notes; Marketing purposes; Sale of your health information.', fieldType: 'info_text', section: 'authorization' },

      { fieldId: 'section_rights', fieldLabel: 'Your Rights Regarding Your Health Information', fieldType: 'section_header', section: 'rights' },
      { fieldId: 'rightsInfo', fieldLabel: '1. Right to Inspect and Copy: You have the right to inspect and obtain a copy of your health information. To request copies of your records, submit a written request to our Privacy Officer. We may charge a reasonable fee for copying and mailing. In limited circumstances, we may deny your request, and you may request a review of the denial. 2. Right to Amend: If you believe that information in your record is incorrect or incomplete, you may request that we amend it. Your request must be in writing and include a reason for the amendment. We may deny your request if the information was not created by us, is not part of our records, is not available for inspection, or is accurate and complete. 3. Right to an Accounting of Disclosures: You have the right to request an accounting of disclosures of your health information made by us for purposes other than treatment, payment, or healthcare operations. Your request must be in writing and specify the time period (not more than six years prior to the date of the request). 4. Right to Request Restrictions: You have the right to request restrictions on how we use or disclose your health information for treatment, payment, or healthcare operations. You may also request that we restrict disclosures to family members or others involved in your care. We are not required to agree to your request except in one situation: if you pay for a service or item out-of-pocket in full, you can ask us not to share information about that service or item with your health insurer, and we must honor that request. 5. Right to Request Confidential Communications: You have the right to request that we communicate with you about your health information in a certain way or at a certain location. For example, you may request that we contact you only at work or by mail. We will accommodate reasonable requests. 6. Right to a Paper Copy of This Notice: You have the right to obtain a paper copy of this notice, even if you have agreed to receive it electronically. 7. Right to Notification of a Breach: You have the right to be notified if there is a breach of your unsecured health information.', fieldType: 'info_text', section: 'rights' },

      { fieldId: 'section_complaints', fieldLabel: 'Complaints', fieldType: 'section_header', section: 'complaints' },
      { fieldId: 'complaintsInfo', fieldLabel: 'If you believe your privacy rights have been violated, you may file a complaint with MentalSpace or with the U.S. Department of Health and Human Services Office for Civil Rights. You will not be penalized or retaliated against for filing a complaint. To file a complaint with MentalSpace: Privacy Officer, MentalSpace (contact information will be provided). To file a complaint with HHS: Office for Civil Rights, U.S. Department of Health and Human Services, 200 Independence Avenue, S.W., Washington, D.C. 20201, Phone: 1-877-696-6775, Website: https://www.hhs.gov/ocr/privacy/hipaa/complaints/', fieldType: 'info_text', section: 'complaints' },

      // Acknowledgment
      { fieldId: 'section_acknowledgment', fieldLabel: 'Acknowledgment of Receipt', fieldType: 'section_header', section: 'acknowledgment' },
      { fieldId: 'acknowledgmentText', fieldLabel: 'I acknowledge that I have received a copy of MentalSpace\'s Notice of Privacy Practices.', fieldType: 'info_text', section: 'acknowledgment' },
      { fieldId: 'clientName', fieldLabel: 'Client Name (Print)', fieldType: 'text', required: true, section: 'acknowledgment' },
      { fieldId: 'clientSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'acknowledgment' },
      { fieldId: 'clientSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'acknowledgment' },
      { fieldId: 'guardianSignature', fieldLabel: 'Parent/Guardian Signature (if minor)', fieldType: 'signature', required: false, section: 'acknowledgment' },
      { fieldId: 'guardianSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'acknowledgment' }
    ]
  },

  {
    formName: 'Consent for Use of Artificial Intelligence',
    formDescription: 'Consent form for the use of AI tools in clinical care and documentation',
    formType: 'Consent',
    isRequired: false,
    assignedToNewClients: true,
    formFieldsJson: [
      { fieldId: 'intro', fieldLabel: 'MentalSpace utilizes artificial intelligence (AI) and machine learning tools to enhance the quality and efficiency of mental health services. This consent form explains how AI may be used in your care and your rights regarding this technology.', fieldType: 'info_text', section: 'intro' },

      { fieldId: 'section_what', fieldLabel: 'What is AI and How We Use It', fieldType: 'section_header', section: 'what' },
      { fieldId: 'whatInfo', fieldLabel: 'Artificial intelligence refers to computer systems that can perform tasks that typically require human intelligence. At MentalSpace, we may use AI tools for: Clinical documentation assistance (e.g., transcription of sessions, note-taking support); Treatment planning recommendations based on evidence-based practices; Symptom tracking and outcome monitoring; Risk assessment support (e.g., identifying elevated risk factors); Administrative tasks (e.g., appointment scheduling, insurance verification); Research and quality improvement (de-identified data only); Digital therapeutic tools (e.g., chatbots, symptom checkers, skill-building apps).', fieldType: 'info_text', section: 'what' },

      { fieldId: 'section_clinical', fieldLabel: 'How AI is Used in Clinical Care', fieldType: 'section_header', section: 'clinical' },
      { fieldId: 'recordingInfo', fieldLabel: 'Session Recording and Transcription: With your explicit consent, therapy sessions may be recorded and transcribed using AI-powered tools to assist your therapist with documentation. These recordings are stored securely and encrypted, used only by your therapist for clinical documentation, automatically deleted after a specified retention period, and never used for marketing or sold to third parties.', fieldType: 'info_text', section: 'clinical' },
      { fieldId: 'decisionSupportInfo', fieldLabel: 'Clinical Decision Support: AI tools may analyze your clinical information to provide your therapist with evidence-based treatment recommendations, identify patterns in your symptoms, or suggest appropriate interventions. Your therapist always maintains final clinical judgment and decision-making authority.', fieldType: 'info_text', section: 'clinical' },
      { fieldId: 'riskInfo', fieldLabel: 'Risk Assessment: AI tools may assist in identifying risk factors for harm to self or others by analyzing clinical data. These tools supplement, but do not replace, your therapist\'s professional clinical assessment. Your therapist will always conduct a comprehensive evaluation when safety concerns are present.', fieldType: 'info_text', section: 'clinical' },

      { fieldId: 'section_privacy', fieldLabel: 'Data Privacy and Security', fieldType: 'section_header', section: 'privacy' },
      { fieldId: 'privacyInfo', fieldLabel: 'We take the privacy and security of your health information seriously. All AI tools used by MentalSpace: Comply with HIPAA privacy and security regulations; Use encryption for data storage and transmission; Have executed Business Associate Agreements with MentalSpace; Are regularly audited for security vulnerabilities; Do not use your data to train AI models unless specifically authorized; Limit access to your information to only what is necessary for the specified purpose.', fieldType: 'info_text', section: 'privacy' },

      { fieldId: 'section_limitations', fieldLabel: 'Limitations of AI', fieldType: 'section_header', section: 'limitations' },
      { fieldId: 'limitationsInfo', fieldLabel: 'It is important to understand the limitations of AI in healthcare: AI tools are not perfect and may make errors or provide incomplete information; AI cannot replace human judgment, empathy, or the therapeutic relationship; AI may have biases based on the data used to train the system; AI recommendations are only tools to support your therapist\'s clinical decision-making; Your therapist remains fully responsible for your care and all clinical decisions.', fieldType: 'info_text', section: 'limitations' },

      { fieldId: 'section_rights', fieldLabel: 'Your Rights and Choices', fieldType: 'section_header', section: 'rights' },
      { fieldId: 'rightsInfo', fieldLabel: 'You have the following rights regarding the use of AI in your care: Right to Opt-Out: You may decline the use of AI tools in your care without affecting your ability to receive treatment. Some administrative AI uses (e.g., scheduling systems) may be necessary for practice operations. Right to Information: You may ask your therapist which AI tools are being used and how they impact your care. Right to Human Review: You may request that a human review any AI-generated recommendations or assessments. Right to Revoke Consent: You may revoke this consent at any time by providing written notice to MentalSpace. Right to Access: You may request information about how AI tools have been used in your care.', fieldType: 'info_text', section: 'rights' },

      // Specific Consents
      { fieldId: 'section_consents', fieldLabel: 'Specific Consents', fieldType: 'section_header', section: 'consents' },
      { fieldId: 'consentDocumentation', fieldLabel: 'I consent to the use of AI for clinical documentation assistance', fieldType: 'radio', required: true, section: 'consents', options: ['YES', 'NO'] },
      { fieldId: 'consentRecording', fieldLabel: 'I consent to session recording and AI transcription', fieldType: 'radio', required: true, section: 'consents', options: ['YES', 'NO'] },
      { fieldId: 'consentTreatment', fieldLabel: 'I consent to AI-assisted treatment planning recommendations', fieldType: 'radio', required: true, section: 'consents', options: ['YES', 'NO'] },
      { fieldId: 'consentRisk', fieldLabel: 'I consent to AI-assisted risk assessment', fieldType: 'radio', required: true, section: 'consents', options: ['YES', 'NO'] },
      { fieldId: 'consentDigital', fieldLabel: 'I consent to the use of AI-powered digital therapeutic tools', fieldType: 'radio', required: true, section: 'consents', options: ['YES', 'NO'] },
      { fieldId: 'consentResearch', fieldLabel: 'I consent to my de-identified data being used for research and quality improvement', fieldType: 'radio', required: true, section: 'consents', options: ['YES', 'NO'] },

      // Acknowledgment and Consent
      { fieldId: 'section_acknowledgment', fieldLabel: 'Acknowledgment and Consent', fieldType: 'section_header', section: 'acknowledgment' },
      { fieldId: 'acknowledgmentInfo', fieldLabel: 'By signing below, I acknowledge that: I have read and understand this consent form; I have had the opportunity to ask questions about AI use in my care; I understand the benefits and limitations of AI in mental healthcare; I understand my rights to opt-out, revoke consent, or request human review; I consent to the specific AI uses I have checked above; I understand that my therapist maintains final authority over all clinical decisions.', fieldType: 'info_text', section: 'acknowledgment' },
      { fieldId: 'clientName', fieldLabel: 'Client Name (Print)', fieldType: 'text', required: true, section: 'acknowledgment' },
      { fieldId: 'clientSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'acknowledgment' },
      { fieldId: 'clientSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'acknowledgment' },
      { fieldId: 'guardianSignature', fieldLabel: 'Parent/Guardian Signature (if minor)', fieldType: 'signature', required: false, section: 'acknowledgment' },
      { fieldId: 'guardianSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'acknowledgment' },
      { fieldId: 'therapistSignature', fieldLabel: 'Therapist Signature', fieldType: 'signature', required: false, section: 'acknowledgment' },
      { fieldId: 'therapistSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'acknowledgment' }
    ]
  },

  {
    formName: 'Psychiatric Advance Directive Information',
    formDescription: 'Information about creating a Psychiatric Advance Directive under Georgia law',
    formType: 'Notice',
    isRequired: false,
    assignedToNewClients: false,
    formFieldsJson: [
      { fieldId: 'section_what', fieldLabel: 'What is a Psychiatric Advance Directive?', fieldType: 'section_header', section: 'what' },
      { fieldId: 'whatInfo', fieldLabel: 'A Psychiatric Advance Directive (PAD) is a legal document that allows you to document your preferences for mental health treatment in advance, in case you become unable to make or communicate treatment decisions in the future. In Georgia, PADs are recognized under O.C.G.A. § 37-11-1 et seq. A PAD allows you to: State your preferences for mental health treatment, including medications and hospitalization; Identify treatments you do not want; Designate a healthcare agent to make decisions on your behalf if you cannot; Provide information about what helps you during a mental health crisis; Specify who should or should not be contacted during a crisis.', fieldType: 'info_text', section: 'what' },

      { fieldId: 'section_who', fieldLabel: 'Who Should Consider a PAD?', fieldType: 'section_header', section: 'who' },
      { fieldId: 'whoInfo', fieldLabel: 'A Psychiatric Advance Directive may be especially helpful if you: Have a mental illness that may affect your ability to make treatment decisions; Have experienced psychiatric hospitalization in the past; Want to ensure your treatment preferences are known and followed; Have had experiences with treatments that were helpful or harmful; Want to appoint someone you trust to make mental health decisions for you if needed.', fieldType: 'info_text', section: 'who' },

      { fieldId: 'section_georgia', fieldLabel: 'Georgia Law Requirements', fieldType: 'section_header', section: 'georgia' },
      { fieldId: 'georgiaInfo', fieldLabel: 'To be valid in Georgia, a Psychiatric Advance Directive must: Be in writing; Be signed by you or someone at your direction; Be dated; Be signed by two witnesses or notarized; Be completed while you have capacity to make healthcare decisions. Your PAD remains valid until you revoke it. You can revoke your PAD at any time while you have capacity by destroying it, writing a statement of revocation, or verbally revoking it in the presence of a witness.', fieldType: 'info_text', section: 'georgia' },

      { fieldId: 'section_includes', fieldLabel: 'What a PAD Can Include', fieldType: 'section_header', section: 'includes' },
      { fieldId: 'includesInfo', fieldLabel: 'Treatment Preferences: Medications you prefer or do not want; Treatments that have been helpful or harmful in the past; Your preferences about hospitalization; Your preferences about electroconvulsive therapy (ECT) or other treatments. Healthcare Agent: Name someone you trust to make mental health treatment decisions if you cannot; Provide specific instructions or limitations for your agent; Name an alternate agent in case your primary agent is unavailable. Crisis Information: Warning signs that you may be experiencing a mental health crisis; Strategies that help you de-escalate or cope; People who should or should not be contacted; Your preferred hospital or treatment facility.', fieldType: 'info_text', section: 'includes' },

      { fieldId: 'section_when', fieldLabel: 'When is a PAD Used?', fieldType: 'section_header', section: 'when' },
      { fieldId: 'whenInfo', fieldLabel: 'Your PAD will be used when healthcare providers determine that you lack capacity to make treatment decisions. This might occur during a severe mental health crisis when you are unable to understand or communicate decisions about your treatment. Your PAD helps ensure that your wishes are respected even when you cannot express them.', fieldType: 'info_text', section: 'when' },

      { fieldId: 'section_limitations', fieldLabel: 'Limitations of a PAD', fieldType: 'section_header', section: 'limitations' },
      { fieldId: 'limitationsInfo', fieldLabel: 'While PADs are legally recognized in Georgia, there are some limitations: Healthcare providers may decline to follow your PAD if they believe it endangers your life or the lives of others; In emergency situations, providers may provide emergency treatment even if it conflicts with your PAD; A court order may override your PAD in certain circumstances; Your PAD cannot require illegal or unethical treatment.', fieldType: 'info_text', section: 'limitations' },

      { fieldId: 'section_how', fieldLabel: 'How to Create a PAD', fieldType: 'section_header', section: 'how' },
      { fieldId: 'howInfo', fieldLabel: 'To create a Psychiatric Advance Directive: Discuss your treatment preferences with your therapist, healthcare providers, and loved ones; Complete a Georgia Psychiatric Advance Directive form (available from the Georgia Department of Behavioral Health and Developmental Disabilities); Have the form witnessed by two adults or notarized; Provide copies to your healthcare providers, healthcare agent, family members, and attorney; Keep a copy in a safe place and carry a wallet card indicating you have a PAD; Review and update your PAD periodically as your preferences or circumstances change.', fieldType: 'info_text', section: 'how' },

      { fieldId: 'section_resources', fieldLabel: 'Resources', fieldType: 'section_header', section: 'resources' },
      { fieldId: 'resourcesInfo', fieldLabel: 'Georgia Department of Behavioral Health and Developmental Disabilities - Phone: 1-800-715-4225, Website: https://dbhdd.georgia.gov. National Resource Center on Psychiatric Advance Directives - Website: https://www.nrc-pad.org. MentalSpace staff are available to discuss PADs and can assist you in locating resources and forms. We encourage you to discuss this with your therapist if you are interested in creating a Psychiatric Advance Directive.', fieldType: 'info_text', section: 'resources' },

      // Acknowledgment
      { fieldId: 'section_acknowledgment', fieldLabel: 'Acknowledgment', fieldType: 'section_header', section: 'acknowledgment' },
      { fieldId: 'acknowledgmentText', fieldLabel: 'I acknowledge that I have received information about Psychiatric Advance Directives and understand my right to create one. I have had the opportunity to ask questions.', fieldType: 'info_text', section: 'acknowledgment' },
      { fieldId: 'padInterest', fieldLabel: 'Please indicate your preference', fieldType: 'radio', required: true, section: 'acknowledgment', options: ['I am interested in creating a Psychiatric Advance Directive and would like assistance', 'I have already created a Psychiatric Advance Directive (please provide a copy)', 'I am not interested in creating a Psychiatric Advance Directive at this time'] },
      { fieldId: 'clientName', fieldLabel: 'Client Name (Print)', fieldType: 'text', required: true, section: 'acknowledgment' },
      { fieldId: 'clientSignature', fieldLabel: 'Client Signature', fieldType: 'signature', required: true, section: 'acknowledgment' },
      { fieldId: 'clientSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: true, section: 'acknowledgment' },
      { fieldId: 'staffMember', fieldLabel: 'Staff Member Providing Information', fieldType: 'text', required: false, section: 'acknowledgment' },
      { fieldId: 'staffSignatureDate', fieldLabel: 'Date', fieldType: 'date', required: false, section: 'acknowledgment' }
    ]
  }
];

async function seedForms() {
  try {
    const adminId = await getAdminUserId();

    if (!adminId) {
      console.error('No administrator user found. Please create an admin user first.');
      return;
    }

    console.log('Starting form seeding...');
    console.log('Using admin ID:', adminId);

    // Combine all forms
    const allForms = [...forms, ...forms2];

    // Delete existing forms
    console.log('\nDeleting existing forms...');
    await prisma.intakeForm.deleteMany({});
    console.log('Existing forms deleted.');

    // Create new forms
    console.log('\nCreating new forms...');
    let count = 0;

    for (const formData of allForms) {
      const form = await prisma.intakeForm.create({
        data: {
          formName: formData.formName,
          formDescription: formData.formDescription,
          formType: formData.formType,
          formFieldsJson: formData.formFieldsJson,
          isActive: true,
          isRequired: formData.isRequired,
          assignedToNewClients: formData.assignedToNewClients,
          createdBy: adminId,
          lastModifiedBy: adminId,
        },
      });

      count++;
      console.log(`✓ Created: ${form.formName} (${form.formType})`);
    }

    console.log(`\n✅ Successfully created ${count} forms!`);
    console.log('\nForms Summary:');
    console.log('1. Client Information (Initial_Intake) - Required, Auto-assigned');
    console.log('2. Client Insurance Information (Insurance) - Auto-assigned');
    console.log('3. Client History (Initial_Intake) - Required, Auto-assigned');
    console.log('4. Emergency & Other Contacts (Consent) - Required, Auto-assigned');
    console.log('5. Consent for Mental Health Services (Consent) - Required, Auto-assigned');
    console.log('6. Payment Authorization (Financial)');
    console.log('7. Release of Information (Consent)');
    console.log('8. Notice of Privacy Practices (Notice) - Required, Auto-assigned');
    console.log('9. Consent for Use of AI (Consent) - Auto-assigned');
    console.log('10. Psychiatric Advance Directive Information (Notice)');

  } catch (error) {
    console.error('Error seeding forms:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedForms();
