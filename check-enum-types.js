const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

async function checkEnums() {
  try {
    const result = await prisma.$queryRaw`
      SELECT
        t.typname as enum_name,
        t.typtype as type_type
      FROM pg_type t
      WHERE t.typtype = 'e'
      ORDER BY t.typname
    `;

    console.log('\n📋 Enum types in production database:');
    result.forEach(r => console.log(`  ${r.enum_name}`));
    console.log(`\nTotal: ${result.length} enum types`);

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnums();
