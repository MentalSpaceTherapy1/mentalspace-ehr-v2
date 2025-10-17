const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAccount() {
  try {
    const account = await prisma.portalAccount.findUnique({
      where: { email: 'jessica.anderson@example.com' }
    });

    console.log('Portal Account Details:');
    console.log('- Email:', account?.email);
    console.log('- Account Status:', account?.accountStatus);
    console.log('- Portal Access Granted:', account?.portalAccessGranted);
    console.log('- Email Verified:', account?.emailVerified);

    // Update account to be active
    if (account && account.accountStatus !== 'ACTIVE') {
      console.log('\nUpdating account to ACTIVE...');
      await prisma.portalAccount.update({
        where: { id: account.id },
        data: {
          accountStatus: 'ACTIVE',
          portalAccessGranted: true,
          emailVerified: true,
        }
      });
      console.log('✅ Account updated successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccount();
