import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Temporary admin endpoint to seed intake forms
 * DELETE after forms are populated
 */
export const seedIntakeForms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check if forms already exist
    const existingCount = await prisma.intakeForm.count();
    logger.info(`Found ${existingCount} existing intake forms`);

    const intakeForms = [
      {
        formName: 'Client Information Form',
        formDescription: 'Basic demographic and contact information for new clients',
        formType: 'Demographic',
      },
      {
        formName: 'Informed Consent for Treatment',
        formDescription: 'Consent form outlining the nature of therapy, confidentiality limits, and client rights',
        formType: 'Consent',
      },
      {
        formName: 'HIPAA Privacy Notice Acknowledgment',
        formDescription: 'Acknowledgment of receipt and understanding of HIPAA privacy practices',
        formType: 'Consent',
      },
      {
        formName: 'Financial Agreement and Payment Policy',
        formDescription: 'Agreement regarding fees, payment methods, insurance, and cancellation policy',
        formType: 'Financial',
      },
      {
        formName: 'Emergency Contact Information',
        formDescription: 'Emergency contact details and authorized persons to contact in case of emergency',
        formType: 'Safety',
      },
      {
        formName: 'Medical History Questionnaire',
        formDescription: 'Comprehensive medical history including current medications, allergies, and past treatments',
        formType: 'Medical',
      },
      {
        formName: 'Mental Health History',
        formDescription: 'Previous mental health treatment, hospitalizations, and current symptoms',
        formType: 'Clinical',
      },
      {
        formName: 'Substance Use Assessment',
        formDescription: 'Assessment of current and past substance use, including alcohol and drugs',
        formType: 'Clinical',
      },
      {
        formName: 'Trauma History Questionnaire',
        formDescription: 'Assessment of traumatic experiences and their impact',
        formType: 'Clinical',
      },
      {
        formName: 'Family History Form',
        formDescription: 'Family medical and mental health history, including genetic factors',
        formType: 'Clinical',
      },
      {
        formName: 'Social Support and Relationships',
        formDescription: 'Assessment of current relationships, social support system, and living situation',
        formType: 'Psychosocial',
      },
      {
        formName: 'Employment and Financial Stress Assessment',
        formDescription: 'Evaluation of work-related stress and financial concerns affecting mental health',
        formType: 'Psychosocial',
      },
      {
        formName: 'Cultural Background and Identity',
        formDescription: 'Information about cultural background, religious beliefs, and identity factors',
        formType: 'Psychosocial',
      },
      {
        formName: 'Treatment Goals and Expectations',
        formDescription: "Client's goals for therapy and expectations for the therapeutic process",
        formType: 'Treatment',
      },
      {
        formName: 'Insurance Information and Authorization',
        formDescription: 'Insurance details and authorization to bill insurance company',
        formType: 'Financial',
      },
      {
        formName: 'Release of Information',
        formDescription: 'Authorization to release or obtain information from other healthcare providers',
        formType: 'Consent',
      },
      {
        formName: 'Telehealth Consent Form',
        formDescription: 'Consent for telehealth services, including technology requirements and limitations',
        formType: 'Consent',
      },
      {
        formName: 'Medication Management Consent',
        formDescription: 'Consent for medication evaluation and management services',
        formType: 'Consent',
      },
      {
        formName: 'Couples Therapy Agreement',
        formDescription: 'Agreement for couples therapy, including confidentiality and session guidelines',
        formType: 'Consent',
      },
      {
        formName: 'Family Therapy Agreement',
        formDescription: 'Agreement for family therapy sessions, roles, and confidentiality considerations',
        formType: 'Consent',
      },
      {
        formName: 'Minor Consent Form (Parent/Guardian)',
        formDescription: 'Parental consent for treatment of minors and privacy considerations',
        formType: 'Consent',
      },
      {
        formName: 'Safety Plan',
        formDescription: 'Personalized safety plan for crisis situations and suicidal ideation',
        formType: 'Safety',
      },
      {
        formName: 'Client Satisfaction Survey',
        formDescription: 'Feedback on therapeutic services and client satisfaction',
        formType: 'Feedback',
      },
      {
        formName: 'Termination Summary Form',
        formDescription: 'Summary of treatment outcomes and recommendations upon termination',
        formType: 'Clinical',
      },
      {
        formName: 'No-Show and Late Cancellation Policy',
        formDescription: 'Acknowledgment of policies regarding missed appointments and late cancellations',
        formType: 'Administrative',
      },
    ];

    // Determine isRequired and assignedToNewClients based on form type
    const requiredTypes = ['Demographic', 'Consent', 'Financial', 'Safety', 'Administrative', 'Medical', 'Clinical'];
    const autoAssignTypes = ['Demographic', 'Consent', 'Financial', 'Safety', 'Administrative', 'Treatment'];

    let createdCount = 0;

    for (const formData of intakeForms) {
      // Check if this form already exists
      const existing = await prisma.intakeForm.findFirst({
        where: { formName: formData.formName },
      });

      if (existing) {
        logger.info(`Form already exists: ${formData.formName}`);
        continue;
      }

      const isRequired = requiredTypes.includes(formData.formType);
      const assignedToNewClients = autoAssignTypes.includes(formData.formType);

      await prisma.intakeForm.create({
        data: {
          ...formData,
          formFieldsJson: [],
          isActive: true,
          isRequired,
          assignedToNewClients,
          createdBy: userId,
          lastModifiedBy: userId,
        },
      });

      createdCount++;
      logger.info(`Created form: ${formData.formName}`);
    }

    const finalCount = await prisma.intakeForm.count();

    logger.info(`Successfully created ${createdCount} new intake forms`);
    logger.info(`Total forms in database: ${finalCount}`);

    return res.status(200).json({
      success: true,
      message: `Successfully created ${createdCount} intake forms`,
      data: {
        existingCount,
        createdCount,
        totalCount: finalCount,
      },
    });
  } catch (error) {
    logger.error('Error seeding intake forms:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed intake forms',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
