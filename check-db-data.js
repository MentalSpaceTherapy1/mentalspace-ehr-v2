const { PrismaClient } = require('@mentalspace/database');

async function checkDatabase(dbUrl, name) {
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    const [clients, users, appointments, therapists] = await Promise.all([
      prisma.client.count(),
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.user.count({ where: { roles: { has: 'CLINICIAN' } } })
    ]);

    console.log(`\n========== ${name} ==========`);
    console.log(`Clients: ${clients}`);
    console.log(`Users: ${users}`);
    console.log(`Appointments: ${appointments}`);
    console.log(`Therapists/Clinicians: ${therapists}`);
    console.log('='.repeat(40));

  } catch (error) {
    console.error(`\nError checking ${name}:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const prodDb = "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr";
  const devDb = "postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr";

  await checkDatabase(prodDb, "PRODUCTION DATABASE");
  await checkDatabase(devDb, "DEVELOPMENT DATABASE");
}

main();
