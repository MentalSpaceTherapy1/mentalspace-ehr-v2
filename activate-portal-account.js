const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateAccount() {
  try {
    // Find the client by MRN
    const client = await prisma.client.findFirst({
      where: { medicalRecordNumber: 'MRN-21813489' },
      include: { portalAccount: true }
    });

    if (!client) {
      console.log('Client not found');
      return;
    }

    console.log('Client found:', client.firstName, client.lastName);

    if (!client.portalAccount) {
      console.log('No portal account found');
      return;
    }

    console.log('Current portal account status:', {
      accountStatus: client.portalAccount.accountStatus,
      emailVerified: client.portalAccount.emailVerified,
      portalAccessGranted: client.portalAccount.portalAccessGranted
    });

    // Update to activate
    const updated = await prisma.portalAccount.update({
      where: { id: client.portalAccount.id },
      data: {
        accountStatus: 'ACTIVE',
        emailVerified: true,
        portalAccessGranted: true,
        grantedDate: new Date()
      }
    });

    console.log('Account activated:', {
      accountStatus: updated.accountStatus,
      emailVerified: updated.emailVerified,
      portalAccessGranted: updated.portalAccessGranted
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAccount();
