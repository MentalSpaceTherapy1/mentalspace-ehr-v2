import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log();

  // Count records in each table
  const users = await prisma.user.count();
  const clients = await prisma.client.count();
  const emergencyContacts = await prisma.emergencyContact.count();
  const insuranceInfo = await prisma.insuranceInformation.count();
  const appointments = await prisma.appointment.count();
  const clinicalNotes = await prisma.clinicalNote.count();
  const treatmentPlans = await prisma.treatmentPlan.count();
  const diagnoses = await prisma.diagnosis.count();
  const medications = await prisma.medication.count();
  const supervisionSessions = await prisma.supervisionSession.count();
  const supervisionHoursLog = await prisma.supervisionHoursLog.count();
  const portalAccounts = await prisma.portalAccount.count();
  const chargeEntries = await prisma.chargeEntry.count();
  const paymentRecords = await prisma.paymentRecord.count();
  const clientStatements = await prisma.clientStatement.count();
  const clientDocuments = await prisma.clientDocument.count();
  const auditLogs = await prisma.auditLog.count();
  const systemConfig = await prisma.systemConfig.count();

  console.log('RECORD COUNTS BY TABLE:');
  console.log('-'.repeat(60));
  console.log(`Users:                     ${users}`);
  console.log(`Clients:                   ${clients}`);
  console.log(`Emergency Contacts:        ${emergencyContacts}`);
  console.log(`Insurance Information:     ${insuranceInfo}`);
  console.log(`Appointments:              ${appointments}`);
  console.log(`Clinical Notes:            ${clinicalNotes}`);
  console.log(`Treatment Plans:           ${treatmentPlans}`);
  console.log(`Diagnoses:                 ${diagnoses}`);
  console.log(`Medications:               ${medications}`);
  console.log(`Supervision Sessions:      ${supervisionSessions}`);
  console.log(`Supervision Hours Log:     ${supervisionHoursLog}`);
  console.log(`Portal Accounts:           ${portalAccounts}`);
  console.log(`Charge Entries:            ${chargeEntries}`);
  console.log(`Payment Records:           ${paymentRecords}`);
  console.log(`Client Statements:         ${clientStatements}`);
  console.log(`Client Documents:          ${clientDocuments}`);
  console.log(`Audit Logs:                ${auditLogs}`);
  console.log(`System Config:             ${systemConfig}`);
  console.log('-'.repeat(60));

  const totalRecords = users + clients + emergencyContacts + insuranceInfo +
    appointments + clinicalNotes + treatmentPlans + diagnoses + medications +
    supervisionSessions + supervisionHoursLog + portalAccounts + chargeEntries +
    paymentRecords + clientStatements + clientDocuments + auditLogs + systemConfig;

  console.log(`TOTAL RECORDS:             ${totalRecords}`);
  console.log();

  // Get table count
  const tables = await prisma.$queryRaw<Array<{count: bigint}>>`
    SELECT COUNT(*) as count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  `;

  console.log(`TOTAL TABLES:              ${tables[0].count}`);
  console.log();

  // Show sample data
  console.log('SAMPLE DATA:');
  console.log('-'.repeat(60));

  const sampleUsers = await prisma.user.findMany({
    take: 3,
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true
    }
  });

  console.log('\nUsers:');
  sampleUsers.forEach(user => {
    console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
  });

  const sampleClients = await prisma.client.findMany({
    take: 3,
    select: {
      medicalRecordNumber: true,
      firstName: true,
      lastName: true,
      status: true
    }
  });

  console.log('\nClients:');
  sampleClients.forEach(client => {
    console.log(`  - ${client.firstName} ${client.lastName} (${client.medicalRecordNumber}) - ${client.status}`);
  });

  const sampleAppointments = await prisma.appointment.findMany({
    take: 3,
    select: {
      appointmentDate: true,
      appointmentType: true,
      status: true,
      client: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      appointmentDate: 'desc'
    }
  });

  console.log('\nRecent Appointments:');
  sampleAppointments.forEach(appt => {
    console.log(`  - ${appt.client.firstName} ${appt.client.lastName} - ${appt.appointmentType} - ${appt.status} (${appt.appointmentDate.toLocaleDateString()})`);
  });

  console.log();
  console.log('='.repeat(60));
  console.log('DATABASE SETUP COMPLETE!');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
