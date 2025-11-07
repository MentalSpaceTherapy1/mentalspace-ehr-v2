const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCreateAppointmentTypes() {
  try {
    // Check existing appointment types
    const appointmentTypes = await prisma.appointmentType.findMany({
      where: { isActive: true },
      select: { id: true, typeName: true }
    });

    console.log(`Found ${appointmentTypes.length} active appointment types:`);
    appointmentTypes.forEach(type => {
      console.log(`  - ${type.typeName} (ID: ${type.id})`);
    });

    // If no appointment types exist, create a default one
    if (appointmentTypes.length === 0) {
      console.log('\n❌ No appointment types found. Creating default...');

      const defaultType = await prisma.appointmentType.create({
        data: {
          typeName: 'Therapy Session',
          description: 'Standard therapy session',
          duration: 50,
          isActive: true,
          allowedServiceLocations: ['IN_PERSON', 'TELEHEALTH']
        }
      });

      console.log(`✅ Created default appointment type: ${defaultType.typeName} (ID: ${defaultType.id})`);
      return defaultType.id;
    }

    return appointmentTypes[0].id;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateAppointmentTypes();
