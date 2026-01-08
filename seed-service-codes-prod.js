// Script to seed service codes in production database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const serviceCodes = [
  // Psychiatric Diagnostic Evaluation
  {
    code: '90791',
    description: 'Psychiatric diagnostic evaluation without medical services',
    serviceType: 'Psychiatric Evaluation',
    category: 'Evaluation and Management',
    defaultDuration: 60,
    defaultRate: 200.00,
    requiresAuthorization: false,
  },
  {
    code: '90792',
    description: 'Psychiatric diagnostic evaluation with medical services',
    serviceType: 'Psychiatric Evaluation',
    category: 'Evaluation and Management',
    defaultDuration: 60,
    defaultRate: 250.00,
    requiresAuthorization: false,
  },
  // Psychotherapy
  {
    code: '90832',
    description: 'Psychotherapy, 30 minutes with patient',
    serviceType: 'Therapy Session',
    category: 'Psychotherapy',
    defaultDuration: 30,
    defaultRate: 90.00,
    requiresAuthorization: false,
  },
  {
    code: '90834',
    description: 'Psychotherapy, 45 minutes with patient',
    serviceType: 'Therapy Session',
    category: 'Psychotherapy',
    defaultDuration: 45,
    defaultRate: 120.00,
    requiresAuthorization: false,
  },
  {
    code: '90837',
    description: 'Psychotherapy, 60 minutes with patient',
    serviceType: 'Therapy Session',
    category: 'Psychotherapy',
    defaultDuration: 60,
    defaultRate: 150.00,
    requiresAuthorization: false,
  },
  // Psychotherapy with E/M
  {
    code: '90833',
    description: 'Psychotherapy, 30 minutes with patient when performed with an evaluation and management service',
    serviceType: 'Therapy Session',
    category: 'Psychotherapy',
    defaultDuration: 30,
    defaultRate: 95.00,
    requiresAuthorization: false,
  },
  {
    code: '90836',
    description: 'Psychotherapy, 45 minutes with patient when performed with an evaluation and management service',
    serviceType: 'Therapy Session',
    category: 'Psychotherapy',
    defaultDuration: 45,
    defaultRate: 125.00,
    requiresAuthorization: false,
  },
  {
    code: '90838',
    description: 'Psychotherapy, 60 minutes with patient when performed with an evaluation and management service',
    serviceType: 'Therapy Session',
    category: 'Psychotherapy',
    defaultDuration: 60,
    defaultRate: 160.00,
    requiresAuthorization: false,
  },
  // Crisis Psychotherapy
  {
    code: '90839',
    description: 'Psychotherapy for crisis; first 60 minutes',
    serviceType: 'Crisis Intervention',
    category: 'Crisis Services',
    defaultDuration: 60,
    defaultRate: 180.00,
    requiresAuthorization: false,
  },
  {
    code: '90840',
    description: 'Psychotherapy for crisis; each additional 30 minutes',
    serviceType: 'Crisis Intervention',
    category: 'Crisis Services',
    defaultDuration: 30,
    defaultRate: 90.00,
    requiresAuthorization: false,
  },
  // Group Therapy
  {
    code: '90853',
    description: 'Group psychotherapy (other than of a multiple-family group)',
    serviceType: 'Group Therapy',
    category: 'Psychotherapy',
    defaultDuration: 60,
    defaultRate: 60.00,
    requiresAuthorization: false,
  },
  // Family Therapy
  {
    code: '90846',
    description: 'Family psychotherapy (without the patient present), 50 minutes',
    serviceType: 'Family Therapy',
    category: 'Psychotherapy',
    defaultDuration: 50,
    defaultRate: 130.00,
    requiresAuthorization: false,
  },
  {
    code: '90847',
    description: 'Family psychotherapy (conjoint psychotherapy) (with patient present), 50 minutes',
    serviceType: 'Family Therapy',
    category: 'Psychotherapy',
    defaultDuration: 50,
    defaultRate: 140.00,
    requiresAuthorization: false,
  },
  // Medication Management
  {
    code: '99212',
    description: 'Office or other outpatient visit for the evaluation and management of an established patient (10-19 minutes)',
    serviceType: 'Medication Management',
    category: 'Evaluation and Management',
    defaultDuration: 15,
    defaultRate: 75.00,
    requiresAuthorization: false,
  },
  {
    code: '99213',
    description: 'Office or other outpatient visit for the evaluation and management of an established patient (20-29 minutes)',
    serviceType: 'Medication Management',
    category: 'Evaluation and Management',
    defaultDuration: 25,
    defaultRate: 110.00,
    requiresAuthorization: false,
  },
  {
    code: '99214',
    description: 'Office or other outpatient visit for the evaluation and management of an established patient (30-39 minutes)',
    serviceType: 'Medication Management',
    category: 'Evaluation and Management',
    defaultDuration: 35,
    defaultRate: 165.00,
    requiresAuthorization: false,
  },
  // Add-on
  {
    code: '90785',
    description: 'Interactive complexity (add-on code for difficult communication)',
    serviceType: 'Therapy Session',
    category: 'Add-on Services',
    defaultDuration: 0,
    defaultRate: 40.00,
    requiresAuthorization: false,
  },
  // Testing
  {
    code: '96130',
    description: 'Psychological testing evaluation services, first hour',
    serviceType: 'Initial Consultation',
    category: 'Testing and Assessment',
    defaultDuration: 60,
    defaultRate: 200.00,
    requiresAuthorization: true,
  },
  {
    code: '96131',
    description: 'Psychological testing evaluation services, each additional hour',
    serviceType: 'Follow-up',
    category: 'Testing and Assessment',
    defaultDuration: 60,
    defaultRate: 150.00,
    requiresAuthorization: true,
  },
];

async function main() {
  console.log('Seeding service codes to production...');

  // Get the first admin user to use as createdBy
  const adminUser = await prisma.user.findFirst({
    where: { roles: { hasSome: ['ADMINISTRATOR'] } },
  });

  if (!adminUser) {
    console.error('No administrator user found. Please create an admin user first.');
    process.exit(1);
  }

  console.log(`Using admin user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.id})`);

  let created = 0;
  let skipped = 0;

  for (const code of serviceCodes) {
    try {
      // Check if code already exists
      const existing = await prisma.serviceCode.findUnique({
        where: { code: code.code },
      });

      if (existing) {
        console.log(`Skipping ${code.code} - already exists`);
        skipped++;
        continue;
      }

      await prisma.serviceCode.create({
        data: {
          ...code,
          isActive: true,
          createdBy: adminUser.id,
          lastModifiedBy: adminUser.id,
        },
      });

      console.log(`Created service code: ${code.code} - ${code.description}`);
      created++;
    } catch (error) {
      console.error(`Failed to create ${code.code}:`, error.message);
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`   Created: ${created} service codes`);
  console.log(`   Skipped: ${skipped} service codes`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
