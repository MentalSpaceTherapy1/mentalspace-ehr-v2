const { PrismaClient } = require('@mentalspace/database');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function verifyAccount() {
  try {
    const account = await prisma.portalAccount.findUnique({
      where: { clientId: '926d9465-27fe-464d-9b3f-8fb852182e87' },
      select: {
        id: true,
        email: true,
        password: true,
        accountStatus: true,
        emailVerified: true,
        portalAccessGranted: true
      }
    });

    if (!account) {
      console.log('❌ Portal account not found');
      return;
    }

    console.log('✅ Portal Account Found:');
    console.log(`   Email: ${account.email}`);
    console.log(`   Status: ${account.accountStatus}`);
    console.log(`   Email Verified: ${account.emailVerified}`);
    console.log(`   Portal Access Granted: ${account.portalAccessGranted}`);

    // Test password
    const testPassword = 'SecurePass123!';
    const passwordMatch = await bcrypt.compare(testPassword, account.password);

    console.log(`\n🔑 Password Test:`);
    console.log(`   Testing password: "${testPassword}"`);
    console.log(`   Password matches: ${passwordMatch ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAccount();
