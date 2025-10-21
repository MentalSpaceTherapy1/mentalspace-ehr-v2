// Script to create default service codes in production database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const serviceCodes = [
  // Therapy Services
  { code: '90791', description: 'Psychiatric Diagnostic Evaluation', serviceType: 'Initial Consultation', category: 'Therapy', defaultDuration: 60, defaultRate: 250.00, isActive: true, requiresAuthorization: false },
  { code: '90834', description: 'Psychotherapy, 45 minutes', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 45, defaultRate: 150.00, isActive: true, requiresAuthorization: false },
  { code: '90837', description: 'Psychotherapy, 60 minutes', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 60, defaultRate: 180.00, isActive: true, requiresAuthorization: false },
  { code: '90832', description: 'Psychotherapy, 30 minutes', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 30, defaultRate: 120.00, isActive: true, requiresAuthorization: false },
  { code: '90846', description: 'Family Psychotherapy without Patient', serviceType: 'Family Therapy', category: 'Therapy', defaultDuration: 50, defaultRate: 160.00, isActive: true, requiresAuthorization: false },
  { code: '90847', description: 'Family Psychotherapy with Patient', serviceType: 'Family Therapy', category: 'Therapy', defaultDuration: 50, defaultRate: 170.00, isActive: true, requiresAuthorization: false },
  { code: '90853', description: 'Group Psychotherapy', serviceType: 'Group Therapy', category: 'Therapy', defaultDuration: 60, defaultRate: 80.00, isActive: true, requiresAuthorization: false },

  // Crisis Services
  { code: '90839', description: 'Psychotherapy for Crisis (First 60 min)', serviceType: 'Crisis Intervention', category: 'Crisis', defaultDuration: 60, defaultRate: 200.00, isActive: true, requiresAuthorization: false },
  { code: '90840', description: 'Psychotherapy for Crisis (Each Additional 30 min)', serviceType: 'Crisis Intervention', category: 'Crisis', defaultDuration: 30, defaultRate: 100.00, isActive: true, requiresAuthorization: false },

  // Testing & Assessment
  { code: '96130', description: 'Psychological Testing Evaluation (First Hour)', serviceType: 'Psychiatric Evaluation', category: 'Assessment', defaultDuration: 60, defaultRate: 180.00, isActive: true, requiresAuthorization: true },
  { code: '96131', description: 'Psychological Testing Evaluation (Each Additional Hour)', serviceType: 'Psychiatric Evaluation', category: 'Assessment', defaultDuration: 60, defaultRate: 150.00, isActive: true, requiresAuthorization: true },
];

async function createServiceCodes() {
  try {
    console.log('Creating default service codes in production database...\n');

    for (const code of serviceCodes) {
      const created = await prisma.serviceCode.upsert({
        where: { code: code.code },
        update: code,
        create: {
          ...code,
          createdBy: 'system',
          lastModifiedBy: 'system'
        }
      });
      console.log(`✓ ${created.code} - ${created.description}`);
    }

    console.log(`\n✅ Successfully created/updated ${serviceCodes.length} service codes!`);

  } catch (error) {
    console.error('❌ Error creating service codes:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createServiceCodes();
