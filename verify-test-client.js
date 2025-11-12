const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTestClient() {
  try {
    console.log('🔍 Verifying test client exists...\n');

    // Find the client by email
    const client = await prisma.client.findFirst({
      where: {
        email: 'john.doe@example.com'
      },
      include: {
        portalAccount: true,
        primaryTherapist: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!client) {
      console.log('❌ Client not found!');
      return;
    }

    console.log('✅ Client verified successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 CLIENT DETAILS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`🔹 Client ID:       ${client.id}`);
    console.log(`🔹 Name:            ${client.firstName} ${client.lastName}`);
    console.log(`🔹 MRN:             ${client.medicalRecordNumber}`);
    console.log(`🔹 Email:           ${client.email}`);
    console.log(`🔹 Status:          ${client.status}`);
    console.log(`🔹 Therapist:       Dr. ${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔐 PORTAL ACCOUNT');
    console.log('═══════════════════════════════════════════════════════\n');

    if (client.portalAccount) {
      console.log(`🔹 Portal Email:     ${client.portalAccount.email}`);
      console.log(`🔹 Account Status:   ${client.portalAccount.accountStatus}`);
      console.log(`🔹 Email Verified:   ${client.portalAccount.emailVerified ? 'Yes' : 'No'}`);
      console.log(`🔹 Access Granted:   ${client.portalAccount.portalAccessGranted ? 'Yes' : 'No'}`);
      console.log(`🔹 MFA Enabled:      ${client.portalAccount.mfaEnabled ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ No portal account found!');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error verifying client:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTestClient();
