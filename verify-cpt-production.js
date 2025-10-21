const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function verifyCPTCodes() {
  try {
    const codes = await prisma.serviceCode.findMany({
      orderBy: { code: 'asc' }
    });

    console.log(`\n✓ Found ${codes.length} CPT codes in PRODUCTION database:\n`);

    codes.forEach(code => {
      console.log(`${code.code} - ${code.description}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCPTCodes();
