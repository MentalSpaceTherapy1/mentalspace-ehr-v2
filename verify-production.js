const { PrismaClient } = require('@mentalspace/database');

const prodPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

async function verify() {
  try {
    console.log('🔍 Production Database Verification\n');
    console.log('==================================\n');

    const [users, clients, appointments, emergency, insurance] = await Promise.all([
      prodPrisma.user.count(),
      prodPrisma.client.count(),
      prodPrisma.appointment.count(),
      prodPrisma.emergencyContact.count(),
      prodPrisma.insuranceInformation.count()
    ]);

    console.log(`✅ Users: ${users}`);
    console.log(`✅ Clients: ${clients}`);
    console.log(`✅ Appointments: ${appointments}`);
    console.log(`✅ Emergency Contacts: ${emergency}`);
    console.log(`✅ Insurance Records: ${insurance}\n`);

    const sampleClient = await prodPrisma.client.findFirst({
      include: {
        primaryTherapist: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    console.log('📋 Sample Client:');
    console.log(`   Name: ${sampleClient.firstName} ${sampleClient.lastName}`);
    console.log(`   Email: ${sampleClient.email}`);
    console.log(`   Primary Therapist: ${sampleClient.primaryTherapist?.firstName} ${sampleClient.primaryTherapist?.lastName}`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
  } finally {
    await prodPrisma.$disconnect();
  }
}

verify();
