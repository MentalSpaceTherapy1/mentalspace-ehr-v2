const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  },
  log: ['error']
});

async function testQuery() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'ejoseph@chctherapy.com' }
    });

    console.log('✅ User query successful!');
    console.log('User:', JSON.stringify(user, null, 2));

  } catch (error) {
    console.error('❌ Query failed');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
