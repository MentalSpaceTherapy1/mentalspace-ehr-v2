const { PrismaClient } = require('@mentalspace/database');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function createPortalAccount() {
  try {
    // Find Jessica Anderson's client record
    const client = await prisma.client.findFirst({
      where: {
        firstName: 'Jessica',
        lastName: 'Anderson'
      }
    });

    if (!client) {
      console.log('❌ Client Jessica Anderson not found');
      return;
    }

    console.log(`✅ Found client: ${client.firstName} ${client.lastName} (ID: ${client.id})`);

    // Check if portal account already exists
    const existingAccount = await prisma.portalAccount.findUnique({
      where: { clientId: client.id }
    });

    if (existingAccount) {
      console.log('⚠️  Portal account already exists for this client');

      // Update it to be active with the correct password
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

      await prisma.portalAccount.update({
        where: { id: existingAccount.id },
        data: {
          password: hashedPassword,
          accountStatus: 'ACTIVE',
          emailVerified: true,
          portalAccessGranted: true,
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });

      console.log('✅ Updated existing portal account to ACTIVE with new password');
      return;
    }

    // Create new portal account
    const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

    const portalAccount = await prisma.portalAccount.create({
      data: {
        clientId: client.id,
        email: client.email || 'jessica.anderson@example.com',
        password: hashedPassword,
        accountStatus: 'ACTIVE',
        emailVerified: true,
        portalAccessGranted: true,
        failedLoginAttempts: 0
      }
    });

    console.log('✅ Created portal account successfully!');
    console.log(`   Email: ${portalAccount.email}`);
    console.log(`   Password: SecurePass123!`);
    console.log(`   Status: ${portalAccount.accountStatus}`);
    console.log(`   Email Verified: ${portalAccount.emailVerified}`);
    console.log(`   Portal Access: ${portalAccount.portalAccessGranted}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createPortalAccount();
