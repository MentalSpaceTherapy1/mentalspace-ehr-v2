const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
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

    console.log('\nTables in DEV database:');
    result.forEach(r => console.log('  -', r.table_name));
    console.log(`\nTotal: ${result.length} tables`);

    // Check if client_diagnoses exists
    const hasClientDiagnoses = result.some(r => r.table_name === 'client_diagnoses');
    console.log(`\nHas client_diagnoses table: ${hasClientDiagnoses}`);

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
