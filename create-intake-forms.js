/**
 * Script to create intake forms via direct database insertion
 * Run this with: node create-intake-forms.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const intakeForms = [
  {
    formName: 'Client Information Form',
    formDescription: 'Basic demographic and contact information for new clients',
    formType: 'Demographic',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'Informed Consent for Treatment',
    formDescription: 'Consent form outlining the nature of therapy, confidentiality limits, and client rights',
    formType: 'Consent',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'HIPAA Privacy Notice Acknowledgment',
    formDescription: 'Acknowledgment of receipt and understanding of HIPAA privacy practices',
    formType: 'Consent',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'Financial Agreement and Payment Policy',
    formDescription: 'Agreement regarding fees, payment methods, insurance, and cancellation policy',
    formType: 'Financial',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'Emergency Contact Information',
    formDescription: 'Emergency contact details and authorized persons to contact in case of emergency',
    formType: 'Safety',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'Medical History Questionnaire',
    formDescription: 'Comprehensive medical history including current medications, allergies, and past treatments',
    formType: 'Medical',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'Mental Health History',
    formDescription: 'Previous mental health treatment, hospitalizations, and current symptoms',
    formType: 'Clinical',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
  {
    formName: 'Substance Use Assessment',
    formDescription: 'Assessment of current and past substance use, including alcohol and drugs',
    formType: 'Clinical',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Trauma History Questionnaire',
    formDescription: 'Assessment of traumatic experiences and their impact',
    formType: 'Clinical',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Family History Form',
    formDescription: 'Family medical and mental health history, including genetic factors',
    formType: 'Clinical',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Social Support and Relationships',
    formDescription: 'Assessment of current relationships, social support system, and living situation',
    formType: 'Psychosocial',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Employment and Financial Stress Assessment',
    formDescription: 'Evaluation of work-related stress and financial concerns affecting mental health',
    formType: 'Psychosocial',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Cultural Background and Identity',
    formDescription: 'Information about cultural background, religious beliefs, and identity factors',
    formType: 'Psychosocial',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Treatment Goals and Expectations',
    formDescription: "Client's goals for therapy and expectations for the therapeutic process",
    formType: 'Treatment',
    isActive: true,
    isRequired: false,
    assignedToNewClients: true,
  },
  {
    formName: 'Insurance Information and Authorization',
    formDescription: 'Insurance details and authorization to bill insurance company',
    formType: 'Financial',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Release of Information',
    formDescription: 'Authorization to release or obtain information from other healthcare providers',
    formType: 'Consent',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Telehealth Consent Form',
    formDescription: 'Consent for telehealth services, including technology requirements and limitations',
    formType: 'Consent',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Medication Management Consent',
    formDescription: 'Consent for medication evaluation and management services',
    formType: 'Consent',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Couples Therapy Agreement',
    formDescription: 'Agreement for couples therapy, including confidentiality and session guidelines',
    formType: 'Consent',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Family Therapy Agreement',
    formDescription: 'Agreement for family therapy sessions, roles, and confidentiality considerations',
    formType: 'Consent',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Minor Consent Form (Parent/Guardian)',
    formDescription: 'Parental consent for treatment of minors and privacy considerations',
    formType: 'Consent',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Safety Plan',
    formDescription: 'Personalized safety plan for crisis situations and suicidal ideation',
    formType: 'Safety',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Client Satisfaction Survey',
    formDescription: 'Feedback on therapeutic services and client satisfaction',
    formType: 'Feedback',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'Termination Summary Form',
    formDescription: 'Summary of treatment outcomes and recommendations upon termination',
    formType: 'Clinical',
    isActive: true,
    isRequired: false,
    assignedToNewClients: false,
  },
  {
    formName: 'No-Show and Late Cancellation Policy',
    formDescription: 'Acknowledgment of policies regarding missed appointments and late cancellations',
    formType: 'Administrative',
    isActive: true,
    isRequired: true,
    assignedToNewClients: true,
  },
];

async function main() {
  console.log('Starting intake forms creation...');

  // Get admin user for createdBy and lastModifiedBy
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@mentalspace.com' },
  });

  if (!adminUser) {
    console.error('Admin user not found! Please run the main seed first.');
    process.exit(1);
  }

  console.log(`Found admin user: ${adminUser.email}`);

  // Check if forms already exist
  const existingFormsCount = await prisma.intakeForm.count();
  console.log(`Existing forms in database: ${existingFormsCount}`);

  if (existingFormsCount > 0) {
    console.log('Forms already exist. Deleting existing forms...');
    await prisma.intakeForm.deleteMany({});
    console.log('Existing forms deleted.');
  }

  // Create all forms
  for (const formData of intakeForms) {
    const form = await prisma.intakeForm.create({
      data: {
        ...formData,
        formFieldsJson: [],
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });
    console.log(`Created form: ${form.formName}`);
  }

  console.log(`\n✅ Successfully created ${intakeForms.length} intake forms!`);

  // Display summary
  const finalCount = await prisma.intakeForm.count();
  console.log(`\nTotal forms in database: ${finalCount}`);

  const activeCount = await prisma.intakeForm.count({ where: { isActive: true } });
  console.log(`Active forms: ${activeCount}`);

  const requiredCount = await prisma.intakeForm.count({ where: { isRequired: true } });
  console.log(`Required forms: ${requiredCount}`);

  const newClientCount = await prisma.intakeForm.count({
    where: { assignedToNewClients: true },
  });
  console.log(`Forms assigned to new clients: ${newClientCount}`);
}

main()
  .catch((e) => {
    console.error('Error during intake forms creation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
