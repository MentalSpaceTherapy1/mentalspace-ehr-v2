/**
 * Seed Script for Module 7: Self-Scheduling & Waitlist Management
 *
 * This script creates the necessary data for testing:
 * 1. Clinician schedules with acceptNewClients = true
 * 2. Appointment types with allowOnlineBooking = true
 * 3. Scheduling rules for each clinician
 *
 * Run with: node seed-self-scheduling-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Days of week enum mapping
const DAYS = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
};

async function main() {
  console.log('🌱 Starting Self-Scheduling & Waitlist data seed...\n');

  try {
    // ============================================================================
    // 1. Get existing clinicians or create test clinicians
    // ============================================================================
    console.log('📋 Step 1: Finding clinicians...');

    let clinicians = await prisma.user.findMany({
      where: {
        roles: {
          has: 'CLINICIAN',
        },
      },
      take: 3,
    });

    if (clinicians.length === 0) {
      console.log('   ⚠️  No clinicians found. Creating test clinicians...');

      const clinician1 = await prisma.user.create({
        data: {
          email: 'dr.smith@mentalspace.com',
          passwordHash: '$2b$10$hashedpassword', // Placeholder - not used for this test
          firstName: 'Sarah',
          lastName: 'Smith',
          title: 'PhD, Licensed Psychologist',
          roles: ['CLINICIAN'],
          isActive: true,
          emailVerified: true,
        },
      });

      const clinician2 = await prisma.user.create({
        data: {
          email: 'dr.johnson@mentalspace.com',
          passwordHash: '$2b$10$hashedpassword',
          firstName: 'Michael',
          lastName: 'Johnson',
          title: 'LCSW, Clinical Social Worker',
          roles: ['CLINICIAN'],
          isActive: true,
          emailVerified: true,
        },
      });

      const clinician3 = await prisma.user.create({
        data: {
          email: 'dr.williams@mentalspace.com',
          passwordHash: '$2b$10$hashedpassword',
          firstName: 'Jennifer',
          lastName: 'Williams',
          title: 'MD, Psychiatrist',
          roles: ['CLINICIAN'],
          isActive: true,
          emailVerified: true,
        },
      });

      clinicians = [clinician1, clinician2, clinician3];
      console.log(`   ✅ Created ${clinicians.length} test clinicians`);
    } else {
      console.log(`   ✅ Found ${clinicians.length} existing clinicians`);
    }

    // ============================================================================
    // 2. Create/Update Clinician Schedules
    // ============================================================================
    console.log('\n📅 Step 2: Creating clinician schedules...');

    const schedulePromises = clinicians.map(async (clinician, index) => {
      // Delete existing schedules to start fresh
      await prisma.clinicianSchedule.deleteMany({
        where: { clinicianId: clinician.id },
      });

      // Create different schedules for variety
      let weeklySchedule;
      if (index === 0) {
        // Full-time clinician (Monday-Friday, 9AM-5PM)
        weeklySchedule = {
          monday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          friday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          saturday: { isAvailable: false },
          sunday: { isAvailable: false },
        };
      } else if (index === 1) {
        // Part-time with evening hours (Tuesday-Thursday, 1PM-8PM)
        weeklySchedule = {
          monday: { isAvailable: false },
          tuesday: { isAvailable: true, startTime: '13:00', endTime: '20:00', breakStart: '16:00', breakEnd: '16:30' },
          wednesday: { isAvailable: true, startTime: '13:00', endTime: '20:00', breakStart: '16:00', breakEnd: '16:30' },
          thursday: { isAvailable: true, startTime: '13:00', endTime: '20:00', breakStart: '16:00', breakEnd: '16:30' },
          friday: { isAvailable: false },
          saturday: { isAvailable: false },
          sunday: { isAvailable: false },
        };
      } else {
        // Weekend availability (Thursday-Saturday, 10AM-6PM)
        weeklySchedule = {
          monday: { isAvailable: false },
          tuesday: { isAvailable: false },
          wednesday: { isAvailable: false },
          thursday: { isAvailable: true, startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
          friday: { isAvailable: true, startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
          saturday: { isAvailable: true, startTime: '10:00', endTime: '16:00', breakStart: null, breakEnd: null },
          sunday: { isAvailable: false },
        };
      }

      return prisma.clinicianSchedule.create({
        data: {
          clinicianId: clinician.id,
          effectiveStartDate: new Date(),
          effectiveEndDate: null, // Ongoing
          weeklyScheduleJson: weeklySchedule,
          acceptNewClients: true, // Critical for self-scheduling
          maxAppointmentsPerDay: 8,
          maxAppointmentsPerWeek: 40,
          bufferTimeBetweenAppointments: 10, // 10-minute buffer between sessions
          availableLocations: ['OFFICE', 'TELEHEALTH'],
          createdBy: clinician.id,
          lastModifiedBy: clinician.id,
        },
      });
    });

    const schedules = await Promise.all(schedulePromises);
    console.log(`   ✅ Created ${schedules.length} clinician schedules with acceptNewClients = true`);

    // ============================================================================
    // 3. Create Scheduling Rules for each clinician
    // ============================================================================
    console.log('\n⚙️  Step 3: Creating scheduling rules...');

    const rulesPromises = clinicians.map(async (clinician) => {
      // Delete existing rules
      await prisma.schedulingRule.deleteMany({
        where: { clinicianId: clinician.id },
      });

      return prisma.schedulingRule.create({
        data: {
          clinician: {
            connect: {
              id: clinician.id,
            },
          },
          maxAdvanceBookingDays: 60,
          minNoticeHours: 24,
          cancellationWindowHours: 24,
          allowWeekends: false,
          allowedDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          slotDuration: 50,
          bufferTime: 10,
          isActive: true,
        },
      });
    });

    const rules = await Promise.all(rulesPromises);
    console.log(`   ✅ Created ${rules.length} scheduling rules`);

    // ============================================================================
    // 4. Check existing Appointment Types
    // ============================================================================
    console.log('\n📝 Step 4: Checking appointment types...');

    // Just query existing appointment types instead of creating new ones
    const appointmentTypes = await prisma.appointmentType.findMany({
      where: {
        isActive: true,
      },
    });

    console.log(`   ✅ Found ${appointmentTypes.length} active appointment types`);
    console.log(`   ℹ️  ${appointmentTypes.filter(t => t.allowOnlineBooking).length} types available for online booking`);

    // If no appointment types with allowOnlineBooking, update existing ones
    const onlineBookableTypes = appointmentTypes.filter(t => t.allowOnlineBooking);
    if (onlineBookableTypes.length === 0 && appointmentTypes.length > 0) {
      console.log('   ⚠️  No appointment types allow online booking. Updating first type...');
      const firstType = appointmentTypes[0];
      await prisma.appointmentType.update({
        where: { id: firstType.id },
        data: { allowOnlineBooking: true },
      });
      console.log(`   ✅ Updated "${firstType.typeName}" to allow online booking`);
    }

    // Skip the old creation code
    /*
    const appointmentTypesData = [
      prisma.appointmentType.create({
        data: {
          typeName: 'Initial Consultation',
          category: 'INITIAL_ASSESSMENT',
          description: 'First-time consultation to discuss your needs and treatment plan',
          defaultDuration: 60,
          colorCode: '#4F46E5', // Indigo
          iconName: 'person_add',
          isActive: true,
          allowOnlineBooking: true, // Critical for self-scheduling
          requiresApproval: false,
          allowTelehealth: true,
          allowInPerson: true,
        },
      }),
      prisma.appointmentType.create({
        data: {
          typeName: 'Individual Therapy',
          category: 'THERAPY',
          description: 'One-on-one therapy session',
          defaultDuration: 50,
          colorCode: '#10B981', // Green
          iconName: 'psychology',
          isActive: true,
          allowOnlineBooking: true,
          requiresApproval: false,
          allowTelehealth: true,
          allowInPerson: true,
        },
      }),
      prisma.appointmentType.create({
        data: {
          typeName: 'Follow-up Session',
          category: 'FOLLOW_UP',
          description: 'Follow-up session to review progress',
          defaultDuration: 30,
          colorCode: '#F59E0B', // Amber
          iconName: 'refresh',
          isActive: true,
          allowOnlineBooking: true,
          requiresApproval: false,
          allowTelehealth: true,
          allowInPerson: false,
        },
      }),
      prisma.appointmentType.create({
        data: {
          typeName: 'Couples Therapy',
          category: 'THERAPY',
          description: 'Therapy session for couples',
          defaultDuration: 75,
          colorCode: '#EC4899', // Pink
          iconName: 'favorite',
          isActive: true,
          allowOnlineBooking: true,
          requiresApproval: false,
          allowTelehealth: true,
          allowInPerson: true,
        },
      }),
      prisma.appointmentType.create({
        data: {
          typeName: 'Crisis Intervention',
          category: 'CRISIS',
          description: 'Urgent crisis intervention session',
          defaultDuration: 45,
          colorCode: '#EF4444', // Red
          iconName: 'warning',
          isActive: true,
          allowOnlineBooking: false, // Crisis requires staff coordination
          requiresApproval: true,
          allowTelehealth: true,
          allowInPerson: true,
        },
      }),
    ]);

    console.log(`   ✅ Created ${appointmentTypes.length} appointment types`);
    console.log(`   ℹ️  ${appointmentTypes.filter(t => t.allowOnlineBooking).length} types available for online booking`);
    */

    // ============================================================================
    // Summary
    // ============================================================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ SEED COMPLETE - Self-Scheduling & Waitlist Ready');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   • ${clinicians.length} clinicians configured`);
    console.log(`   • ${schedules.length} schedules created (acceptNewClients = true)`);
    console.log(`   • ${rules.length} scheduling rules created`);
    console.log(`   • ${appointmentTypes.length} appointment types found`);
    console.log(`   • ${appointmentTypes.filter(t => t.allowOnlineBooking).length} types available for self-scheduling`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Navigate to /portal/schedule to test self-scheduling');
    console.log('   2. Book an appointment as a client');
    console.log('   3. Test reschedule and cancel features');
    console.log('   4. Test waitlist by adding clients when no slots available');

    console.log('\n🔗 Available Endpoints:');
    console.log('   • GET  /api/v1/self-schedule/clinicians');
    console.log('   • GET  /api/v1/self-schedule/appointment-types');
    console.log('   • GET  /api/v1/self-schedule/available-slots/:clinicianId');
    console.log('   • POST /api/v1/self-schedule/book');
    console.log('   • PUT  /api/v1/self-schedule/reschedule/:appointmentId');
    console.log('   • DELETE /api/v1/self-schedule/cancel/:appointmentId');
    console.log('   • GET  /api/v1/waitlist');
    console.log('   • POST /api/v1/waitlist');

    console.log('\n🌟 Features Enabled:');
    console.log('   ✓ Self-Scheduling (Book/Reschedule/Cancel)');
    console.log('   ✓ Smart slot calculation with buffer times');
    console.log('   ✓ Conflict prevention & double-booking protection');
    console.log('   ✓ Auto-confirm appointments (no manual approval)');
    console.log('   ✓ Waitlist management');
    console.log('   ✓ Automated waitlist matching');
    console.log('   ✓ Slot offer notifications\n');

  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
