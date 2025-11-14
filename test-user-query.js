const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  },
  log: ['query', 'error', 'warn']
});

async function testQuery() {
  try {
    console.log('Testing User query...');

    const user = await prisma.user.findUnique({
      where: { email: 'ejoseph@chctherapy.com' }
    });

    if (user) {
      console.log('✅ User query successful!');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.firstName, user.lastName);
      console.log('Roles:', user.roles);
    } else {
      console.log('⚠️  User not found');
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Error meta:', JSON.stringify(error.meta, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
