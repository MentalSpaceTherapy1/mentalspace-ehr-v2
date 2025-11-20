const { PrismaClient } = require('@mentalspace/database');

const devPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

const prodPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

async function migrate() {
  try {
    console.log('🔍 Checking current data...\n');

    const [devClients, prodClients] = await Promise.all([
      devPrisma.client.count(),
      prodPrisma.client.count()
    ]);

    console.log(`Dev Database: ${devClients} clients`);
    console.log(`Prod Database: ${prodClients} clients\n`);

    console.log('⚠️  WARNING: This will DELETE ALL existing production data and replace it with dev data!');
    console.log('Starting migration in 3 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Step 1: Clearing production database using TRUNCATE CASCADE...');

    // Use raw SQL to truncate tables with CASCADE to avoid FK constraint issues
    const tablesToTruncate = [
      'clinical_notes',
      'outcome_measures',
      'appointments',
      'client_diagnoses',
      'legal_guardians',
      'emergency_contacts',
      'insurance_information',
      'clients',
      'users'
    ];

    for (const tableName of tablesToTruncate) {
      try {
        await prodPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
        console.log(`  ✓ Cleared ${tableName}`);
      } catch (error) {
        console.log(`  ⚠ Skipping ${tableName} (${error.message.substring(0, 50)}...)`);
      }
    }

    console.log('✅ Production database cleared\n');

    console.log('📦 Step 2: Copying users from dev to prod...');
    const users = await devPrisma.user.findMany();

    // First pass: Create users without supervisor references
    const userMap = new Map();
    for (const user of users) {
      const { supervisorId, ...userData } = user;
      const createdUser = await prodPrisma.user.create({
        data: { ...userData, supervisorId: null }
      });
      userMap.set(user.id, supervisorId);
    }

    // Second pass: Update supervisor references
    for (const [userId, supervisorId] of userMap.entries()) {
      if (supervisorId) {
        await prodPrisma.user.update({
          where: { id: userId },
          data: { supervisorId }
        });
      }
    }

    console.log(`✅ Copied ${users.length} users\n`);

    console.log('📦 Step 3: Copying clients from dev to prod...');
    const clients = await devPrisma.client.findMany();
    for (const client of clients) {
      await prodPrisma.client.create({ data: client });
    }
    console.log(`✅ Copied ${clients.length} clients\n`);

    console.log('📦 Step 4: Copying appointments from dev to prod...');
    const appointments = await devPrisma.appointment.findMany();
    for (const appt of appointments) {
      await prodPrisma.appointment.create({ data: appt });
    }
    console.log(`✅ Copied ${appointments.length} appointments\n`);

    console.log('📦 Step 5: Copying emergency contacts...');
    const emergencyContacts = await devPrisma.emergencyContact.findMany();
    for (const contact of emergencyContacts) {
      await prodPrisma.emergencyContact.create({ data: contact });
    }
    console.log(`✅ Copied ${emergencyContacts.length} emergency contacts\n`);

    console.log('📦 Step 6: Copying legal guardians...');
    const legalGuardians = await devPrisma.legalGuardian.findMany();
    for (const guardian of legalGuardians) {
      await prodPrisma.legalGuardian.create({ data: guardian });
    }
    console.log(`✅ Copied ${legalGuardians.length} legal guardians\n`);

    console.log('📦 Step 7: Copying insurance information...');
    const insurance = await devPrisma.insuranceInformation.findMany();
    for (const ins of insurance) {
      await prodPrisma.insuranceInformation.create({ data: ins });
    }
    console.log(`✅ Copied ${insurance.length} insurance records\n`);

    console.log('📦 Step 8: Copying diagnoses...');
    const diagnoses = await devPrisma.clientDiagnosis.findMany();
    for (const diagnosis of diagnoses) {
      await prodPrisma.clientDiagnosis.create({ data: diagnosis });
    }
    console.log(`✅ Copied ${diagnoses.length} diagnoses\n`);

    console.log('✅ MIGRATION COMPLETE!\n');
    console.log('📊 Final counts:');
    const [finalClients, finalUsers, finalAppts] = await Promise.all([
      prodPrisma.client.count(),
      prodPrisma.user.count(),
      prodPrisma.appointment.count()
    ]);
    console.log(`  Clients: ${finalClients}`);
    console.log(`  Users: ${finalUsers}`);
    console.log(`  Appointments: ${finalAppts}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

migrate();
