/**
 * Script to create AppointmentType records for the self-scheduling system
 * This enables clients to select appointment types during booking
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const appointmentTypes = [
  {
    typeName: 'Initial Consultation',
    category: 'INDIVIDUAL',
    description: 'First-time comprehensive assessment and treatment planning session',
    defaultDuration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 3,
    cptCode: '90791',
    defaultRate: 200.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Follow-up Session',
    category: 'INDIVIDUAL',
    description: 'Standard follow-up therapy session for existing clients',
    defaultDuration: 50,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 8,
    cptCode: '90834',
    defaultRate: 150.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Therapy Session',
    category: 'INDIVIDUAL',
    description: 'Individual psychotherapy session',
    defaultDuration: 50,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 8,
    cptCode: '90837',
    defaultRate: 150.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Extended Therapy Session',
    category: 'INDIVIDUAL',
    description: 'Extended individual psychotherapy session for complex cases',
    defaultDuration: 90,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 4,
    cptCode: '90837',
    defaultRate: 225.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Group Therapy',
    category: 'GROUP',
    description: 'Group psychotherapy session with multiple participants',
    defaultDuration: 90,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 2,
    cptCode: '90853',
    defaultRate: 75.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Family Therapy',
    category: 'FAMILY',
    description: 'Family therapy session with client and family members',
    defaultDuration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 4,
    cptCode: '90847',
    defaultRate: 175.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Couples Therapy',
    category: 'COUPLES',
    description: 'Couples therapy session for relationship counseling',
    defaultDuration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 4,
    cptCode: '90847',
    defaultRate: 175.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Crisis Intervention',
    category: 'INDIVIDUAL',
    description: 'Emergency crisis intervention session for urgent mental health needs',
    defaultDuration: 45,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: true,
    maxPerDay: 2,
    cptCode: '90839',
    defaultRate: 200.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Medication Management',
    category: 'INDIVIDUAL',
    description: 'Psychiatric medication evaluation and management appointment',
    defaultDuration: 30,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 10,
    cptCode: '90863',
    defaultRate: 125.00,
    isActive: true,
    allowOnlineBooking: true,
  },
  {
    typeName: 'Brief Check-in',
    category: 'INDIVIDUAL',
    description: 'Short check-in session for established clients',
    defaultDuration: 25,
    bufferBefore: 0,
    bufferAfter: 10,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: 12,
    cptCode: '90832',
    defaultRate: 100.00,
    isActive: true,
    allowOnlineBooking: true,
  },
];

async function main() {
  console.log('🏥 Creating AppointmentType records for self-scheduling...\n');

  // Check which appointment types already exist
  const existingTypes = await prisma.appointmentType.findMany({
    select: {
      typeName: true,
    },
  });

  const existingTypeNames = new Set(existingTypes.map(t => t.typeName));

  console.log(`Existing appointment types: ${existingTypes.length}\n`);

  let created = 0;
  let skipped = 0;

  for (const appointmentType of appointmentTypes) {
    if (existingTypeNames.has(appointmentType.typeName)) {
      console.log(`⏭️  SKIP: ${appointmentType.typeName} (already exists)`);
      skipped++;
      continue;
    }

    try {
      const created_type = await prisma.appointmentType.create({
        data: appointmentType,
      });

      console.log(`✅ CREATED: ${appointmentType.typeName}`);
      console.log(`   Category: ${appointmentType.category}`);
      console.log(`   Duration: ${appointmentType.defaultDuration} minutes`);
      console.log(`   Rate: $${appointmentType.defaultRate}`);
      console.log(`   CPT Code: ${appointmentType.cptCode || 'N/A'}`);
      console.log('');

      created++;
    } catch (error) {
      console.error(`❌ FAILED: Could not create ${appointmentType.typeName}`);
      console.error(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log(`✅ Created: ${created} appointment type(s)`);
  console.log(`⏭️  Skipped: ${skipped} appointment type(s) (already exist)`);
  console.log(`📊 Total defined: ${appointmentTypes.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (created > 0) {
    console.log('🎉 Success! Appointment types are now available for self-scheduling.');
    console.log('📝 Next: Refresh the /portal/schedule page to see appointment types.');
  }
}

main()
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
