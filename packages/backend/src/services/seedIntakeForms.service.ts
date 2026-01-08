import prisma from './database';
import logger from '../utils/logger';

/**
 * Intake form definitions for seeding
 * These are the standard forms available in the MentalSpace EHR system
 */
const INTAKE_FORMS = [
  { formName: 'Client Information Form', formDescription: 'Basic demographic and contact information for new clients', formType: 'Demographic', isRequired: true, assignedToNewClients: true },
  { formName: 'Informed Consent for Treatment', formDescription: 'Consent form outlining the nature of therapy, confidentiality limits, and client rights', formType: 'Consent', isRequired: true, assignedToNewClients: true },
  { formName: 'HIPAA Privacy Notice Acknowledgment', formDescription: 'Acknowledgment of receipt and understanding of HIPAA privacy practices', formType: 'Consent', isRequired: true, assignedToNewClients: true },
  { formName: 'Financial Agreement and Payment Policy', formDescription: 'Agreement regarding fees, payment methods, insurance, and cancellation policy', formType: 'Financial', isRequired: true, assignedToNewClients: true },
  { formName: 'Emergency Contact Information', formDescription: 'Emergency contact details and authorized persons to contact in case of emergency', formType: 'Safety', isRequired: true, assignedToNewClients: true },
  { formName: 'Medical History Questionnaire', formDescription: 'Comprehensive medical history including current medications, allergies, and past treatments', formType: 'Medical', isRequired: true, assignedToNewClients: true },
  { formName: 'Mental Health History', formDescription: 'Previous mental health treatment, hospitalizations, and current symptoms', formType: 'Clinical', isRequired: true, assignedToNewClients: true },
  { formName: 'Substance Use Assessment', formDescription: 'Assessment of current and past substance use, including alcohol and drugs', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'Trauma History Questionnaire', formDescription: 'Assessment of traumatic experiences and their impact', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'Family History Form', formDescription: 'Family medical and mental health history, including genetic factors', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'Social Support and Relationships', formDescription: 'Assessment of current relationships, social support system, and living situation', formType: 'Psychosocial', isRequired: false, assignedToNewClients: false },
  { formName: 'Employment and Financial Stress Assessment', formDescription: 'Evaluation of work-related stress and financial concerns affecting mental health', formType: 'Psychosocial', isRequired: false, assignedToNewClients: false },
  { formName: 'Cultural Background and Identity', formDescription: 'Information about cultural background, religious beliefs, and identity factors', formType: 'Psychosocial', isRequired: false, assignedToNewClients: false },
  { formName: 'Treatment Goals and Expectations', formDescription: "Client's goals for therapy and expectations for the therapeutic process", formType: 'Treatment', isRequired: false, assignedToNewClients: true },
  { formName: 'Insurance Information and Authorization', formDescription: 'Insurance details and authorization to bill insurance company', formType: 'Financial', isRequired: false, assignedToNewClients: false },
  { formName: 'Release of Information', formDescription: 'Authorization to release or obtain information from other healthcare providers', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Telehealth Consent Form', formDescription: 'Consent for telehealth services, including technology requirements and limitations', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Medication Management Consent', formDescription: 'Consent for medication evaluation and management services', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Couples Therapy Agreement', formDescription: 'Agreement for couples therapy, including confidentiality and session guidelines', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Family Therapy Agreement', formDescription: 'Agreement for family therapy sessions, roles, and confidentiality considerations', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Minor Consent Form (Parent/Guardian)', formDescription: 'Parental consent for treatment of minors and privacy considerations', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Safety Plan', formDescription: 'Personalized safety plan for crisis situations and suicidal ideation', formType: 'Safety', isRequired: false, assignedToNewClients: false },
  { formName: 'Client Satisfaction Survey', formDescription: 'Feedback on therapeutic services and client satisfaction', formType: 'Feedback', isRequired: false, assignedToNewClients: false },
  { formName: 'Termination Summary Form', formDescription: 'Summary of treatment outcomes and recommendations upon termination', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'No-Show and Late Cancellation Policy', formDescription: 'Acknowledgment of policies regarding missed appointments and late cancellations', formType: 'Administrative', isRequired: true, assignedToNewClients: true },
];

/**
 * Seeds intake forms if none exist in the database
 * This runs automatically on server startup
 */
export async function seedIntakeFormsOnStartup(): Promise<void> {
  try {
    // Check if forms already exist
    const existingCount = await prisma.intakeForm.count();

    if (existingCount > 0) {
      logger.info(`📋 Intake forms already exist (${existingCount} forms), skipping seed`);
      return;
    }

    logger.info('📋 No intake forms found, seeding default forms...');

    // Find an admin user to use as creator
    const adminUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      logger.warn('📋 No users found in database, skipping intake form seeding');
      return;
    }

    // Seed all forms
    let createdCount = 0;
    for (const form of INTAKE_FORMS) {
      try {
        await prisma.intakeForm.create({
          data: {
            formName: form.formName,
            formDescription: form.formDescription,
            formType: form.formType,
            formFieldsJson: [],
            isActive: true,
            isRequired: form.isRequired,
            assignedToNewClients: form.assignedToNewClients,
            createdBy: adminUser.id,
            lastModifiedBy: adminUser.id,
          },
        });
        createdCount++;
      } catch (error) {
        // Form might already exist (race condition), skip it
        logger.debug(`📋 Form may already exist: ${form.formName}`);
      }
    }

    logger.info(`📋 Successfully seeded ${createdCount} intake forms`);
  } catch (error) {
    logger.error('📋 Failed to seed intake forms', { error });
    // Don't throw - seeding failure shouldn't prevent server startup
  }
}
