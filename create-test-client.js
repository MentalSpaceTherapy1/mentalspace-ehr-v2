const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestClient() {
  try {
    console.log('🔧 Creating test client account...\n');

    // Hash the password
    const password = 'TestClient123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use existing therapist (Dr. John Smith)
    const therapistId = '73819251-ecba-4976-a281-3bfe5947ef94';
    const adminId = '3b8e0405-d629-407f-ab40-c77f8b83527e';

    // Create the client
    const client = await prisma.client.create({
      data: {
        medicalRecordNumber: 'MRN-TEST-001',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        preferredName: 'John',
        pronouns: 'he/him',
        dateOfBirth: new Date('1990-01-15'),

        // Contact
        primaryPhone: '555-0123',
        primaryPhoneType: 'Mobile',
        email: 'john.doe@example.com',
        preferredContactMethod: 'Email',
        okayToLeaveMessage: true,

        // Address
        addressStreet1: '123 Main Street',
        addressCity: 'Atlanta',
        addressState: 'GA',
        addressZipCode: '30301',

        // Demographics
        gender: 'MALE',
        genderIdentity: 'Male',
        sexAssignedAtBirth: 'Male',
        maritalStatus: 'Single',
        race: ['White'],
        ethnicity: 'Not Hispanic or Latino',
        primaryLanguage: 'English',
        otherLanguages: [],

        // Social
        education: 'Bachelor\'s Degree',
        employmentStatus: 'Employed Full-time',
        occupation: 'Software Engineer',
        livingArrangement: 'Lives alone',

        // Status
        status: 'ACTIVE',
        statusDate: new Date(),
        registrationDate: new Date(),

        // Assignment
        primaryTherapistId: therapistId,

        // Consent
        treatmentConsent: true,
        treatmentConsentDate: new Date(),
        hipaaAcknowledgment: true,
        hipaaAcknowledgmentDate: new Date(),

        // System fields
        createdBy: adminId,
        lastModifiedBy: adminId,

        // Portal Account
        portalAccount: {
          create: {
            email: 'john.doe@example.com',
            password: hashedPassword,
            accountStatus: 'ACTIVE',
            emailVerified: true,
            portalAccessGranted: true,
            grantedBy: adminId,
            grantedDate: new Date(),
            isGuardianAccount: false,
          }
        }
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

    console.log('✅ Test client created successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 CLIENT PORTAL LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🔹 URL:       http://localhost:5175/portal/login');
    console.log('🔹 Email:     john.doe@example.com');
    console.log('🔹 Password:  TestClient123!');
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📝 CLIENT DETAILS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`🔹 Client ID:       ${client.id}`);
    console.log(`🔹 Name:            ${client.firstName} ${client.lastName}`);
    console.log(`🔹 MRN:             ${client.medicalRecordNumber}`);
    console.log(`🔹 DOB:             ${client.dateOfBirth.toISOString().split('T')[0]}`);
    console.log(`🔹 Phone:           ${client.primaryPhone}`);
    console.log(`🔹 Status:          ${client.status}`);
    console.log(`🔹 Therapist:       Dr. ${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔐 PORTAL ACCOUNT DETAILS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`🔹 Account ID:       ${client.portalAccount.id}`);
    console.log(`🔹 Status:           ${client.portalAccount.accountStatus}`);
    console.log(`🔹 Email Verified:   ${client.portalAccount.emailVerified ? 'Yes' : 'No'}`);
    console.log(`🔹 Access Granted:   ${client.portalAccount.portalAccessGranted ? 'Yes' : 'No'}`);
    console.log(`🔹 MFA Enabled:      ${client.portalAccount.mfaEnabled ? 'Yes' : 'No'}`);
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('✨ You can now log in to the client portal!');
    console.log('🌐 Navigate to: http://localhost:5175/portal/login');
    console.log('📧 Use Email:    john.doe@example.com');
    console.log('🔑 Use Password: TestClient123!\n');

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('\n❌ Error: A client or portal account with this email already exists.');
      console.error('   Email: john.doe@example.com');
      console.error('\n💡 The test client may already exist. Try logging in with:');
      console.error('   Email:    john.doe@example.com');
      console.error('   Password: TestClient123!\n');
    } else {
      console.error('\n❌ Error creating test client:', error.message);
      console.error('Full error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestClient();
