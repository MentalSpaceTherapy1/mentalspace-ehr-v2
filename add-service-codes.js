const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addServiceCodes() {
  try {
    console.log('📋 Adding common CPT service codes to database...\n');

    const serviceCodes = [
      // Psychotherapy codes
      {
        code: '90832',
        description: 'Psychotherapy, 30 minutes with patient',
        serviceType: 'Therapy Session',
        category: 'Therapy',
        defaultDuration: 30,
        defaultRate: 90.00,
        isActive: true,
        requiresAuthorization: false,
      },
      {
        code: '90834',
        description: 'Psychotherapy, 45 minutes with patient',
        serviceType: 'Therapy Session',
        category: 'Therapy',
        defaultDuration: 45,
        defaultRate: 120.00,
        isActive: true,
        requiresAuthorization: false,
      },
      {
        code: '90837',
        description: 'Psychotherapy, 60 minutes with patient',
        serviceType: 'Therapy Session',
        category: 'Therapy',
        defaultDuration: 60,
        defaultRate: 150.00,
        isActive: true,
        requiresAuthorization: false,
      },
      {
        code: '90853',
        description: 'Group psychotherapy (other than of a multiple-family group)',
        serviceType: 'Group Therapy',
        category: 'Therapy',
        defaultDuration: 60,
        defaultRate: 80.00,
        isActive: true,
        requiresAuthorization: false,
      },
      // Intake/Assessment codes
      {
        code: '90791',
        description: 'Psychiatric diagnostic evaluation without medical services',
        serviceType: 'Therapy Intake',
        category: 'Assessment',
        defaultDuration: 60,
        defaultRate: 200.00,
        isActive: true,
        requiresAuthorization: false,
      },
      {
        code: '90792',
        description: 'Psychiatric diagnostic evaluation with medical services',
        serviceType: 'Therapy Intake',
        category: 'Assessment',
        defaultDuration: 60,
        defaultRate: 220.00,
        isActive: true,
        requiresAuthorization: false,
      },
      // Family therapy
      {
        code: '90846',
        description: 'Family psychotherapy (without the patient present)',
        serviceType: 'Family Therapy',
        category: 'Therapy',
        defaultDuration: 50,
        defaultRate: 140.00,
        isActive: true,
        requiresAuthorization: false,
      },
      {
        code: '90847',
        description: 'Family psychotherapy (with patient present)',
        serviceType: 'Family Therapy',
        category: 'Therapy',
        defaultDuration: 50,
        defaultRate: 140.00,
        isActive: true,
        requiresAuthorization: false,
      },
      // Crisis intervention
      {
        code: '90839',
        description: 'Psychotherapy for crisis; first 60 minutes',
        serviceType: 'Crisis Intervention',
        category: 'Therapy',
        defaultDuration: 60,
        defaultRate: 180.00,
        isActive: true,
        requiresAuthorization: false,
      },
      {
        code: '90840',
        description: 'Psychotherapy for crisis; each additional 30 minutes',
        serviceType: 'Crisis Intervention',
        category: 'Therapy',
        defaultDuration: 30,
        defaultRate: 90.00,
        isActive: true,
        requiresAuthorization: false,
      },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const serviceCode of serviceCodes) {
      // Check if code already exists
      const existing = await prisma.serviceCode.findUnique({
        where: { code: serviceCode.code }
      });

      if (existing) {
        console.log(`⚠️  CPT code ${serviceCode.code} already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Create service code
      await prisma.serviceCode.create({
        data: serviceCode
      });

      console.log(`✅ Added: ${serviceCode.code} - ${serviceCode.description}`);
      addedCount++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${addedCount} service codes`);
    console.log(`   Skipped: ${skippedCount} existing codes`);
    console.log(`\n✅ Service codes are now available for appointment scheduling!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addServiceCodes();
