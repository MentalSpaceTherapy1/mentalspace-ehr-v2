const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
    },
  },
});

async function testClientDiagnosis() {
  try {
    console.log('Testing client diagnosis creation with exact query from service...\n');

    // First, find a valid client and user
    const client = await prisma.client.findFirst({
      select: { id: true, firstName: true, lastName: true }
    });

    if (!client) {
      console.log('❌ No client found in database');
      return;
    }

    const user = await prisma.user.findFirst({
      select: { id: true }
    });

    if (!user) {
      console.log('❌ No user found in database');
      return;
    }

    console.log('Found client:', client.id);
    console.log('Found user:', user.id);
    console.log('\nAttempting to create diagnosis...\n');

    // Replicate exact query from addDiagnosis service
    const diagnosis = await prisma.clientDiagnosis.create({
      data: {
        clientId: client.id,
        diagnosisType: 'PRIMARY',
        icd10Code: 'F41.1',
        dsm5Code: '300.00',
        diagnosisName: 'Test Generalized Anxiety Disorder',
        diagnosisCategory: 'Anxiety Disorders',
        severitySpecifier: 'Moderate',
        courseSpecifier: 'Episodic',
        onsetDate: new Date('2024-01-01'),
        supportingEvidence: 'Test evidence',
        differentialConsiderations: 'Test differential',
        diagnosedById: user.id,
        status: 'ACTIVE'
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true
          }
        },
        diagnosedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true
          }
        }
      }
    });

    console.log('✅ Query successful!\n');
    console.log('Created diagnosis:');
    console.log(JSON.stringify(diagnosis, null, 2));

    // Clean up - delete the test diagnosis
    await prisma.clientDiagnosis.delete({
      where: { id: diagnosis.id }
    });
    console.log('\n✅ Test diagnosis cleaned up');

  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientDiagnosis();
