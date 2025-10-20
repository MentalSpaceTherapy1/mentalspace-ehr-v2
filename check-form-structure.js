const { PrismaClient } = require('@mentalspace/database');

async function checkFormStructure() {
  const prisma = new PrismaClient();

  try {
    const form = await prisma.intakeForm.findFirst();

    if (form) {
      console.log('=== EXISTING FORM STRUCTURE ===');
      console.log(JSON.stringify(form, null, 2));
    } else {
      console.log('No forms found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFormStructure();
