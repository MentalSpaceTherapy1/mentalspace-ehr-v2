const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

async function checkTables() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log('\nTables in production database:');
    result.forEach(r => console.log('  -', r.table_name));
    console.log(`\nTotal: ${result.length} tables`);

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
