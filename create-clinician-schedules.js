/**
 * Script to create ClinicianSchedule records for existing clinicians
 * This enables them to appear in the self-scheduling system
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sample weekly schedule: Monday-Friday, 9 AM - 5 PM
// Format matches what available-slots.service.ts expects
const standardWeeklySchedule = {
  monday: {
    isAvailable: true,
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  },
  tuesday: {
    isAvailable: true,
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  },
  wednesday: {
    isAvailable: true,
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  },
  thursday: {
    isAvailable: true,
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  },
  friday: {
    isAvailable: true,
    startTime: '09:00',
    endTime: '16:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  },
  saturday: {
    isAvailable: false,
  },
  sunday: {
    isAvailable: false,
  },
};

async function main() {
  console.log('🏥 Creating ClinicianSchedule records for existing clinicians...\n');

  // Get all users with CLINICIAN role
  const clinicians = await prisma.user.findMany({
    where: {
      roles: {
        has: 'CLINICIAN',
      },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Found ${clinicians.length} active clinician(s)\n`);

  if (clinicians.length === 0) {
    console.log('❌ No clinicians found. Create users with CLINICIAN role first.');
    return;
  }

  // Check which clinicians already have schedules
  const existingSchedules = await prisma.clinicianSchedule.findMany({
    select: {
      clinicianId: true,
    },
  });

  const existingClinicianIds = new Set(existingSchedules.map(s => s.clinicianId));

  console.log(`Existing schedules: ${existingSchedules.length}\n`);

  // Create schedules for clinicians who don't have one
  let created = 0;
  let skipped = 0;

  for (const clinician of clinicians) {
    if (existingClinicianIds.has(clinician.id)) {
      console.log(`⏭️  SKIP: ${clinician.firstName} ${clinician.lastName} (schedule already exists)`);
      skipped++;
      continue;
    }

    try {
      const schedule = await prisma.clinicianSchedule.create({
        data: {
          clinicianId: clinician.id,
          weeklyScheduleJson: standardWeeklySchedule,
          acceptNewClients: true,
          maxAppointmentsPerDay: 8,
          maxAppointmentsPerWeek: 40,
          bufferTimeBetweenAppointments: 15,
          availableLocations: ['Main Office', 'Telehealth'],
          effectiveStartDate: new Date(),
          effectiveEndDate: null,
          createdBy: clinician.id, // Required field: who created this schedule
          lastModifiedBy: clinician.id, // Required field: who last modified
        },
      });

      console.log(`✅ CREATED: Schedule for ${clinician.firstName} ${clinician.lastName}`);
      console.log(`   ID: ${schedule.id}`);
      console.log(`   Accepts New Clients: ${schedule.acceptNewClients}`);
      console.log(`   Max Appointments/Day: ${schedule.maxAppointmentsPerDay}`);
      console.log(`   Buffer Time: ${schedule.bufferTimeBetweenAppointments} minutes`);
      console.log('');

      created++;
    } catch (error) {
      console.error(`❌ FAILED: Could not create schedule for ${clinician.firstName} ${clinician.lastName}`);
      console.error(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log(`✅ Created: ${created} schedule(s)`);
  console.log(`⏭️  Skipped: ${skipped} schedule(s) (already exist)`);
  console.log(`📊 Total clinicians: ${clinicians.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (created > 0) {
    console.log('🎉 Success! Clinicians should now appear in the self-scheduling system.');
    console.log('📝 Next: Refresh the /portal/schedule page to see clinicians.');
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
