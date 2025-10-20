const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findClient() {
  try {
    const client = await prisma.client.findUnique({
      where: { id: '954bd6ff-8259-4290-ae68-46ff26ad603a' }
    });

    console.log('=== CLIENT WITH FORM ASSIGNMENTS ===');
    console.log('Name:', `${client.firstName} ${client.lastName}`);
    console.log('Email:', client.email);
    console.log('ID:', client.id);
    console.log('Status:', client.status);

    const portal = await prisma.portalAccount.findFirst({
      where: { clientId: client.id }
    });

    console.log('\n=== PORTAL ACCOUNT ===');
    if (portal) {
      console.log('Email:', portal.email);
      console.log('Status:', portal.accountStatus);
      console.log('Access Granted:', portal.portalAccessGranted);
      console.log('Email Verified:', portal.emailVerified);
      console.log('Has Password:', !!portal.passwordHash);
    } else {
      console.log('NO PORTAL ACCOUNT FOUND!');
      console.log('\nThis client needs a portal account to access forms.');
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

findClient();
