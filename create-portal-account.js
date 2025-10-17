const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createPortalAccount() {
  try {
    console.log('Creating portal account for test client...');

    // Find Jessica Anderson (Client 1)
    const client = await prisma.client.findFirst({
      where: {
        email: 'jessica.anderson@example.com'
      }
    });

    if (!client) {
      console.error('Client not found. Please run: npm run seed');
      process.exit(1);
    }

    console.log(`Found client: ${client.firstName} ${client.lastName}`);

    // Check if portal account already exists
    const existingAccount = await prisma.portalAccount.findUnique({
      where: { clientId: client.id }
    });

    if (existingAccount) {
      console.log('Portal account already exists!');
      console.log('\n=== LOGIN CREDENTIALS ===');
      console.log('Email:', client.email);
      console.log('Password: Portal123!');
      console.log('URL: http://localhost:5173/portal/login');
      console.log('========================\n');
      return;
    }

    // Create portal account
    const hashedPassword = await bcrypt.hash('Portal123!', 10);

    const portalAccount = await prisma.portalAccount.create({
      data: {
        clientId: client.id,
        email: client.email,
        password: hashedPassword,
        accountStatus: 'ACTIVE',
        emailVerified: true,
        emailNotifications: true,
        smsNotifications: false,
        appointmentReminders: true,
        portalAccessGranted: true,
        grantedDate: new Date(),
      }
    });

    console.log('✅ Portal account created successfully!');
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Email:', client.email);
    console.log('Password: Portal123!');
    console.log('URL: http://localhost:5173/portal/login');
    console.log('========================\n');
    console.log('Client Info:');
    console.log('- Name:', client.firstName, client.lastName);
    console.log('- MRN:', client.medicalRecordNumber);
    console.log('- DOB:', client.dateOfBirth.toISOString().split('T')[0]);
    console.log('- Primary Therapist ID:', client.primaryTherapistId);

  } catch (error) {
    console.error('Error creating portal account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createPortalAccount();
