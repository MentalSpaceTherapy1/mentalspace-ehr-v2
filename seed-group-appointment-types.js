const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GROUP appointment types...');

  const groupAppointmentTypes = [
    {
      typeName: 'Group Therapy',
      category: 'GROUP',
      description: 'Standard group therapy session',
      defaultDuration: 90,
      bufferBefore: 0,
      bufferAfter: 15,
      isBillable: true,
      requiresAuth: false,
      requiresSupervisor: false,
      cptCode: '90853',
      defaultRate: 150.00,
      colorCode: '#10b981',
      isActive: true,
      allowOnlineBooking: false,
    },
    {
      typeName: 'Psychoeducational Group',
      category: 'GROUP',
      description: 'Educational group session focused on mental health topics',
      defaultDuration: 60,
      bufferBefore: 0,
      bufferAfter: 15,
      isBillable: true,
      requiresAuth: false,
      requiresSupervisor: false,
      cptCode: '90853',
      defaultRate: 100.00,
      colorCode: '#14b8a6',
      isActive: true,
      allowOnlineBooking: false,
    },
    {
      typeName: 'Skills Training Group',
      category: 'GROUP',
      description: 'Group session focused on teaching coping and life skills',
      defaultDuration: 90,
      bufferBefore: 0,
      bufferAfter: 15,
      isBillable: true,
      requiresAuth: false,
      requiresSupervisor: false,
      cptCode: '90853',
      defaultRate: 125.00,
      colorCode: '#06b6d4',
      isActive: true,
      allowOnlineBooking: false,
    },
    {
      typeName: 'Support Group',
      category: 'GROUP',
      description: 'Peer support group session',
      defaultDuration: 60,
      bufferBefore: 0,
      bufferAfter: 15,
      isBillable: true,
      requiresAuth: false,
      requiresSupervisor: false,
      cptCode: '90853',
      defaultRate: 75.00,
      colorCode: '#0ea5e9',
      isActive: true,
      allowOnlineBooking: false,
    },
  ];

  for (const type of groupAppointmentTypes) {
    try {
      // Check if appointment type already exists
      const existing = await prisma.appointmentType.findUnique({
        where: { typeName: type.typeName },
      });

      if (existing) {
        console.log(`Appointment type "${type.typeName}" already exists, skipping...`);
        continue;
      }

      // Create the appointment type
      const created = await prisma.appointmentType.create({
        data: type,
      });

      console.log(`Created appointment type: ${created.typeName} (${created.cptCode})`);
    } catch (error) {
      console.error(`Error creating appointment type "${type.typeName}":`, error.message);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
