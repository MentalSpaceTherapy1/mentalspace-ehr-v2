/**
 * Script to update existing AppointmentType records to enable online booking
 * This fixes the issue where appointment types were created without allowOnlineBooking=true
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating AppointmentType records to enable online booking...\n');

  // Get all appointment types
  const allTypes = await prisma.appointmentType.findMany({
    select: {
      id: true,
      typeName: true,
      isActive: true,
      allowOnlineBooking: true,
    },
  });

  console.log(`Found ${allTypes.length} appointment type(s)\n`);

  if (allTypes.length === 0) {
    console.log('❌ No appointment types found.');
    return;
  }

  // Update all types to enable online booking
  let updated = 0;
  let skipped = 0;

  for (const type of allTypes) {
    if (type.allowOnlineBooking && type.isActive) {
      console.log(`⏭️  SKIP: ${type.typeName} (already enabled)`);
      skipped++;
      continue;
    }

    try {
      await prisma.appointmentType.update({
        where: { id: type.id },
        data: {
          isActive: true,
          allowOnlineBooking: true,
        },
      });

      console.log(`✅ UPDATED: ${type.typeName}`);
      console.log(`   isActive: ${type.isActive} → true`);
      console.log(`   allowOnlineBooking: ${type.allowOnlineBooking} → true`);
      console.log('');

      updated++;
    } catch (error) {
      console.error(`❌ FAILED: Could not update ${type.typeName}`);
      console.error(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log(`✅ Updated: ${updated} appointment type(s)`);
  console.log(`⏭️  Skipped: ${skipped} appointment type(s) (already enabled)`);
  console.log(`📊 Total: ${allTypes.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (updated > 0) {
    console.log('🎉 Success! Appointment types are now available for online booking.');
    console.log('📝 Next: Refresh the /portal/schedule page to see appointment types in Step 2.');
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
