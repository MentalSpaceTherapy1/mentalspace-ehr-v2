const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPortal() {
  try {
    const client = await prisma.client.findFirst({
      where: { email: 'lelejosel@gmail.com' }
    });

    console.log('=== CLIENT INFO ===');
    console.log('Client:', client ? `${client.firstName} ${client.lastName} (${client.id})` : 'NOT FOUND');

    if (!client) {
      console.log('\nNo client found with that email. Checking all clients...');
      const allClients = await prisma.client.findMany({ take: 5 });
      allClients.forEach(c => console.log(`- ${c.firstName} ${c.lastName} <${c.email}>`));
    } else {
      const portal = await prisma.portalAccount.findFirst({
        where: { clientId: client.id }
      });

      console.log('\n=== PORTAL ACCOUNT ===');
      console.log('Email:', portal?.email || 'NOT FOUND');
      console.log('Status:', portal?.accountStatus || 'N/A');
      console.log('Access Granted:', portal?.portalAccessGranted || false);
      console.log('Email Verified:', portal?.emailVerified || false);

      const assignments = await prisma.formAssignment.count({
        where: { clientId: client.id }
      });

      console.log('\n=== FORM ASSIGNMENTS ===');
      console.log('Total Assigned:', assignments);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkPortal();
