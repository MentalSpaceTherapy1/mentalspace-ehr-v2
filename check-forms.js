const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkForms() {
  try {
    const assignments = await prisma.formAssignment.findMany({
      where: { clientId: '954bd6ff-8259-4290-ae68-46ff26ad603a' },
      include: { form: { select: { formName: true, id: true } } },
      orderBy: { assignedAt: 'desc' }
    });

    console.log('===== FORM ASSIGNMENTS FOR CLIENT =====');
    console.log('Total:', assignments.length);
    assignments.forEach((a, i) => {
      console.log(`${i+1}. ${a.form.formName} - Status: ${a.status} - ID: ${a.id}`);
    });

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkForms();
