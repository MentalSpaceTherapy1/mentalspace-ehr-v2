import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serviceCodes = [
  // Therapy Intake
  { code: '021701', description: 'Private Pay - Therapy Intake', serviceType: 'Therapy Intake', category: 'Therapy', defaultDuration: 60, isActive: true },
  { code: '021702', description: 'Subscription Private Pay - Therapy Intake', serviceType: 'Therapy Intake', category: 'Therapy', defaultDuration: 60, isActive: true },
  { code: '90791', description: 'Psychiatric Diagnostic Evaluation', serviceType: 'Therapy Intake', category: 'Assessment', defaultDuration: 60, isActive: true },
  { code: '96156', description: 'H&B Assessment or reassessment (60 minutes)', serviceType: 'Therapy Intake', category: 'Assessment', defaultDuration: 60, isActive: true },
  { code: '+90785', description: 'Interactive Complexity Add-on (Intake)', serviceType: 'Therapy Intake', category: 'Add-On', defaultDuration: 0, isActive: true },
  { code: '+90840', description: 'Crisis Intervention Add-On', serviceType: 'Therapy Intake', category: 'Add-On', defaultDuration: 0, isActive: true },

  // Therapy Session
  { code: '90834', description: 'Psychotherapy, 45 min', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 45, isActive: true },
  { code: '021703', description: 'Private Pay - Therapy Session', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 50, isActive: true },
  { code: '021704', description: 'Subscription Private Pay - 30 Min Therapy Session', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 30, isActive: true },
  { code: '90832', description: 'EAP Individual Therapy 30 - 37 Minutes', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 30, isActive: true },
  { code: '90837', description: 'Psychotherapy, 60 min', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 60, isActive: true },
  { code: '90839', description: 'Psychotherapy Crisis', serviceType: 'Therapy Session', category: 'Crisis', defaultDuration: 60, isActive: true },
  { code: '90846', description: 'EAP Family therapy without the patient in attendance', serviceType: 'Therapy Session', category: 'Family Therapy', defaultDuration: 50, isActive: true },
  { code: '90847', description: 'Family Therapy w/ Client', serviceType: 'Therapy Session', category: 'Family Therapy', defaultDuration: 50, isActive: true },
  { code: '90853', description: 'EAP Group therapy other than family', serviceType: 'Therapy Session', category: 'Group Therapy', defaultDuration: 60, isActive: true },
  { code: '96158', description: 'H&B Intervention individual, 30 minutes', serviceType: 'Therapy Session', category: 'Intervention', defaultDuration: 30, isActive: true },
  { code: '99404', description: 'Therapy Session', serviceType: 'Therapy Session', category: 'Therapy', defaultDuration: 50, isActive: true },
  { code: 'H0004', description: 'Family Counseling', serviceType: 'Therapy Session', category: 'Family Therapy', defaultDuration: 50, isActive: true },
  { code: 'H2011', description: 'Crisis Intervention', serviceType: 'Therapy Session', category: 'Crisis', defaultDuration: 50, isActive: true },
  { code: 'H2014', description: 'Family Training', serviceType: 'Therapy Session', category: 'Family Therapy', defaultDuration: 50, isActive: true },
  { code: 'H2015', description: 'Comprehensive Community Support Services CSS', serviceType: 'Therapy Session', category: 'Support Services', defaultDuration: 50, isActive: true },
  { code: '+90785', description: 'Interactive Complexity Add-on (Session)', serviceType: 'Therapy Session', category: 'Add-On', defaultDuration: 0, isActive: true },
  { code: '+90840', description: 'Psychotherapy Crisis 30 Minutes Add-On', serviceType: 'Therapy Session', category: 'Add-On', defaultDuration: 30, isActive: true },
  { code: '+96159', description: 'H&B Intervention individual, add on 15 minutes', serviceType: 'Therapy Session', category: 'Add-On', defaultDuration: 15, isActive: true },
  { code: '+99354', description: 'Psychotherapy 30 Minutes After First Hour', serviceType: 'Therapy Session', category: 'Add-On', defaultDuration: 30, isActive: true },
  { code: '+99355', description: 'Psychotherapy 30 Minutes Add-On After 99354', serviceType: 'Therapy Session', category: 'Add-On', defaultDuration: 30, isActive: true },

  // Group Therapy
  { code: '90853', description: 'Group Therapy', serviceType: 'Group Therapy', category: 'Group Therapy', defaultDuration: 60, isActive: true },

  // Psychological Evaluation
  { code: '96136', description: 'Psychological test administration and scoring, first 30m', serviceType: 'Psychological Evaluation', category: 'Assessment', defaultDuration: 30, isActive: true },
  { code: '+96137', description: 'Psychological test administration and scoring, add 30m', serviceType: 'Psychological Evaluation', category: 'Add-On', defaultDuration: 30, isActive: true },

  // Consultation
  { code: '90000', description: 'Consultation - Coaching', serviceType: 'Consultation', category: 'Consultation', defaultDuration: 50, isActive: true },
  { code: '90001', description: 'Consultation Intake - Coaching', serviceType: 'Consultation', category: 'Consultation', defaultDuration: 60, isActive: true },
];

async function seedServiceCodes() {
  console.log('🌱 Seeding service codes...');

  for (const codeData of serviceCodes) {
    try {
      await prisma.serviceCode.upsert({
        where: { code: codeData.code },
        update: codeData,
        create: {
          ...codeData,
          createdBy: 'system',
          lastModifiedBy: 'system',
        },
      });
      console.log(`✅ Added/Updated: ${codeData.code} - ${codeData.description}`);
    } catch (error) {
      console.error(`❌ Error adding ${codeData.code}:`, error);
    }
  }

  console.log('✅ Service codes seed completed!');
}

seedServiceCodes()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
