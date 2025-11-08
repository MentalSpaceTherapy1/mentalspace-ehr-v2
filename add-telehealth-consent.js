const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTelehealthConsent() {
  try {
    console.log('Adding telehealth consent for test client...\n');

    // Get the test client (Kevin Johnson or first available)
    let client = await prisma.client.findFirst({
      where: {
        firstName: 'Kevin',
        lastName: 'Johnson'
      }
    });

    // If Kevin Johnson doesn't exist, get any client
    if (!client) {
      client = await prisma.client.findFirst();
    }

    if (!client) {
      console.error('No client found in database');
      return;
    }

    console.log(`Using client: ${client.firstName} ${client.lastName} (ID: ${client.id})`);

    // Check if consent already exists
    const existingConsent = await prisma.telehealthConsent.findFirst({
      where: {
        clientId: client.id,
        consentGiven: true,
        isActive: true
      }
    });

    if (existingConsent) {
      console.log('✅ Valid consent already exists for this client');
      console.log(`   Consent Date: ${existingConsent.consentDate}`);
      console.log(`   Expires: ${existingConsent.expirationDate}`);
      return existingConsent;
    }

    // Get a user ID for createdBy/lastModifiedBy (use first user/clinician)
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No user found for createdBy field');
      return;
    }

    // Georgia-compliant consent text
    const consentText = `
GEORGIA TELEHEALTH INFORMED CONSENT

I, ${client.firstName} ${client.lastName}, hereby consent to receiving mental health services via telehealth technology from MentalSpace EHR providers.

I UNDERSTAND AND AGREE TO THE FOLLOWING:

1. NATURE OF TELEHEALTH SERVICES:
   - Telehealth involves the use of electronic communications to enable mental health care providers to deliver services using interactive video and audio technology.
   - This service is an alternative to in-person therapy sessions when physical presence is not possible or practical.

2. TECHNOLOGY REQUIREMENTS:
   - I am responsible for providing the necessary technology and internet connectivity for telehealth sessions.
   - I understand that technical difficulties may disrupt or terminate our session.

3. PRIVACY AND CONFIDENTIALITY:
   - The laws that protect privacy and confidentiality of medical information also apply to telehealth.
   - I understand that no information obtained during a telehealth session will be shared without my written consent, except as required by law.

4. LOCATION AND JURISDICTION:
   - I confirm that I am physically located in the State of Georgia during all telehealth sessions.
   - I understand that my provider is licensed to practice in Georgia and can only provide services while I am in Georgia.

5. EMERGENCY PROTOCOLS:
   - I understand that in case of emergency, my provider may contact emergency contacts or appropriate authorities.
   - I have provided accurate emergency contact information.
   - I understand the crisis resources available to me including:
     • 988 Suicide & Crisis Lifeline
     • Crisis Text Line (Text HOME to 741741)
     • Emergency Services (911)

6. PATIENT RIGHTS:
   - I have the right to withdraw this consent at any time.
   - I have the right to request in-person sessions instead of telehealth.
   - I have been informed of alternative treatment options.

7. RISKS AND BENEFITS:
   - Benefits may include improved access to care, convenience, and reduced travel time.
   - Risks may include technology failures, interruptions, delays, and limitations in emergency response.

8. RECORDING:
   - Sessions will not be recorded without my explicit written consent.
   - If recording is requested, a separate consent form will be provided.

This consent is valid for one year from the date signed and must be renewed annually per Georgia state requirements.

By signing below, I acknowledge that I have read, understood, and agree to the terms of this consent.
`;

    // Create new consent with correct field names
    const consentData = {
      clientId: client.id,
      consentType: 'Georgia_Telehealth',
      consentVersion: '1.0',
      consentText: consentText,
      consentGiven: true,
      consentDate: new Date(),
      consentMethod: 'Electronic',

      // Georgia-specific requirements
      patientRightsAcknowledged: true,
      emergencyProtocolsUnderstood: true,
      privacyRisksAcknowledged: true,
      technologyRequirementsUnderstood: true,

      // Expiration (1 year from now as per Georgia requirements)
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      renewalRequired: true,

      // Signature
      clientSignature: `${client.firstName} ${client.lastName}`,
      clientIPAddress: '127.0.0.1',
      clientUserAgent: 'Node.js Test Script',

      // Active status
      isActive: true,

      // Audit fields
      createdBy: user.id,
      lastModifiedBy: user.id
    };

    console.log('\nCreating new telehealth consent...');
    const consent = await prisma.telehealthConsent.create({
      data: consentData
    });

    console.log('\n✅ SUCCESS! Telehealth consent created');
    console.log(`   Consent ID: ${consent.id}`);
    console.log(`   Client: ${consent.clientSignature}`);
    console.log(`   Valid until: ${consent.expirationDate}`);
    console.log(`   Type: ${consent.consentType}`);
    console.log(`   All Georgia requirements met: ✓`);

    // Also check if we need to update the client's emergency contact info
    if (!client.emergencyContactName) {
      console.log('\n⚠️  Client is missing emergency contact information');
      console.log('Adding emergency contact...');

      await prisma.client.update({
        where: { id: client.id },
        data: {
          emergencyContactName: 'Jane Johnson',
          emergencyContactPhone: '(555) 123-4567',
          emergencyContactRelationship: 'Spouse'
        }
      });

      console.log('✅ Emergency contact added');
    }

    return consent;

  } catch (error) {
    console.error('\n❌ ERROR adding telehealth consent:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addTelehealthConsent().then(consent => {
  if (consent) {
    console.log('\n========================================');
    console.log('  Telehealth consent ready for testing!');
    console.log('========================================\n');
    console.log('You can now test the telehealth session at:');
    console.log('http://localhost:5175/telehealth/session/cca89f1c-24b5-42a7-960f-8ae3939107c0');
    console.log('\nThe consent check should now pass ✅');
  }
});