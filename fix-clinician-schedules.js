/**
 * Script to fix ClinicianSchedule weekly schedule format
 * Changes from slots array format to startTime/endTime format expected by available-slots.service.ts
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Correct weekly schedule format
const correctWeeklySchedule = {
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
  console.log('🔧 Fixing ClinicianSchedule weekly schedule format...\n');

  // Get all clinician schedules
  const schedules = await prisma.clinicianSchedule.findMany({
    select: {
      id: true,
      clinicianId: true,
      weeklyScheduleJson: true,
    },
  });

  console.log(`Found ${schedules.length} clinician schedule(s)\n`);

  if (schedules.length === 0) {
    console.log('❌ No schedules found.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    try {
      // Check if schedule has the old format (with slots arrays)
      const weeklySchedule = schedule.weeklyScheduleJson;
      const hasOldFormat = weeklySchedule.monday && Array.isArray(weeklySchedule.monday.slots);

      if (!hasOldFormat) {
        console.log(`⏭️  SKIP: Schedule ${schedule.id} (already in correct format)`);
        skipped++;
        continue;
      }

      // Update to correct format
      await prisma.clinicianSchedule.update({
        where: { id: schedule.id },
        data: {
          weeklyScheduleJson: correctWeeklySchedule,
        },
      });

      console.log(`✅ UPDATED: Schedule ${schedule.id}`);
      console.log(`   Clinician ID: ${schedule.clinicianId}`);
      console.log(`   Format: slots array → startTime/endTime`);
      console.log('');

      updated++;
    } catch (error) {
      console.error(`❌ FAILED: Could not update schedule ${schedule.id}`);
      console.error(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log(`✅ Updated: ${updated} schedule(s)`);
  console.log(`⏭️  Skipped: ${skipped} schedule(s) (already correct)`);
  console.log(`📊 Total: ${schedules.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (updated > 0) {
    console.log('🎉 Success! Clinician schedules now use the correct format.');
    console.log('📝 Next: The available-slots service should now generate time slots correctly.');
    console.log('🧪 Test: Refresh /portal/schedule and select a clinician to see available slots.');
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
