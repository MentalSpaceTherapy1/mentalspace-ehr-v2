const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function checkForms() {
  try {
    console.log('Searching for Client Information and Client History forms...\n');

    const forms = await prisma.intakeForm.findMany({
      where: {
        OR: [
          { name: { contains: 'Client', mode: 'insensitive' } },
          { name: { contains: 'History', mode: 'insensitive' } },
          { name: { contains: 'Information', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        formType: true,
        isActive: true,
      },
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${forms.length} forms:\n`);
    forms.forEach(form => {
      console.log(`ID: ${form.id}`);
      console.log(`Name: ${form.name}`);
      console.log(`Description: ${form.description || 'N/A'}`);
      console.log(`Type: ${form.formType}`);
      console.log(`Active: ${form.isActive}`);
      console.log('---');
    });

    // Check specifically for our target forms
    const clientInfoForm = forms.find(f => f.name === 'Client Information Form' || f.name === 'Client Information');
    const clientHistoryForm = forms.find(f => f.name === 'Client History Form' || f.name === 'Client History');

    console.log('\nTarget Forms Status:');
    console.log(`Client Information Form: ${clientInfoForm ? 'EXISTS (ID: ' + clientInfoForm.id + ')' : 'DOES NOT EXIST - Need to create'}`);
    console.log(`Client History Form: ${clientHistoryForm ? 'EXISTS (ID: ' + clientHistoryForm.id + ')' : 'DOES NOT EXIST - Need to create'}`);

  } catch (error) {
    console.error('Error checking forms:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkForms();
