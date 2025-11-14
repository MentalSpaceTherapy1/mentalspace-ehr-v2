const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testFormAssignments() {
  try {
    console.log('Testing exact Prisma query from clientForms.controller.ts...\n');

    const clientId = 'fd871d2a-15ce-47df-bdda-2394b14730a4'; // Test client ID

    const assignments = await prisma.formAssignment.findMany({
      where: { clientId },
      include: {
        form: {
          select: {
            id: true,
            formName: true,
            formDescription: true,
            formType: true,
          },
        },
        submission: {
          select: {
            id: true,
            submittedDate: true,
            reviewedDate: true,
            reviewedBy: true,
            reviewerNotes: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    console.log('✅ Query successful!\n');
    console.log(`Found ${assignments.length} form assignments`);
    if (assignments.length > 0) {
      console.log('\nFirst assignment:');
      console.log(JSON.stringify(assignments[0], null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFormAssignments();
