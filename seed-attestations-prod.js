/**
 * Seed SignatureAttestation records to PRODUCTION database
 */
const { PrismaClient } = require('@prisma/client');

// Override to use production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function seedAttestations() {
  console.log('Seeding SignatureAttestation records to PRODUCTION...');

  // Generic attestation text for clinical note signatures
  const clinicianAttestationText = `I hereby certify that:
1. I have personally conducted the clinical services described in this documentation.
2. The information provided is true, accurate, and complete to the best of my knowledge.
3. The services documented were medically necessary and appropriate for this patient's condition.
4. I understand that falsification of records is subject to civil and criminal penalties.
5. I authorize the use of this electronic signature as the legal equivalent of my handwritten signature.`;

  const supervisorAttestationText = `As the supervising clinician, I hereby certify that:
1. I have reviewed the clinical documentation and services described herein.
2. The services were provided under my supervision in accordance with applicable regulations.
3. I verify the accuracy of this documentation and the clinical appropriateness of the services.
4. The treatment documented is consistent with the patient's treatment plan.
5. I authorize the use of this electronic signature as the legal equivalent of my handwritten signature.`;

  const adminAttestationText = `I hereby certify that:
1. I have reviewed and verify the accuracy of this documentation.
2. The information provided is true and complete to the best of my knowledge.
3. I authorize the use of this electronic signature as the legal equivalent of my handwritten signature.`;

  // Get a system admin user ID for createdBy field
  const systemUser = await prisma.user.findFirst({
    where: {
      roles: { hasSome: ['SUPER_ADMIN', 'ADMINISTRATOR'] }
    }
  });

  const createdBy = systemUser?.id || 'system';
  console.log('Using createdBy:', createdBy);

  // Define attestation records
  const attestations = [
    // Generic attestations for all note types
    {
      role: 'CLINICIAN',
      noteType: 'ALL',
      jurisdiction: 'US',
      attestationText: clinicianAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    {
      role: 'SUPERVISOR',
      noteType: 'ALL',
      jurisdiction: 'US',
      attestationText: supervisorAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    {
      role: 'ADMIN',
      noteType: 'ALL',
      jurisdiction: 'US',
      attestationText: adminAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    // Also add GA-specific (common state)
    {
      role: 'CLINICIAN',
      noteType: 'ALL',
      jurisdiction: 'GA',
      attestationText: clinicianAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    {
      role: 'SUPERVISOR',
      noteType: 'ALL',
      jurisdiction: 'GA',
      attestationText: supervisorAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    {
      role: 'ADMIN',
      noteType: 'ALL',
      jurisdiction: 'GA',
      attestationText: adminAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
  ];

  // Note types from the system (9 types)
  const noteTypes = [
    'Progress Note',
    'Intake Assessment',
    'Treatment Plan',
    'Consultation Note',
    'Contact Note',
    'Group Therapy Note',
    'Cancellation Note',
    'Termination Note',
    'Miscellaneous Note',
  ];

  // Create attestations for each specific note type too
  for (const noteType of noteTypes) {
    // US jurisdiction
    attestations.push(
      {
        role: 'CLINICIAN',
        noteType,
        jurisdiction: 'US',
        attestationText: clinicianAttestationText,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        createdBy,
      },
      {
        role: 'SUPERVISOR',
        noteType,
        jurisdiction: 'US',
        attestationText: supervisorAttestationText,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        createdBy,
      },
      {
        role: 'ADMIN',
        noteType,
        jurisdiction: 'US',
        attestationText: adminAttestationText,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        createdBy,
      }
    );
    // GA jurisdiction
    attestations.push(
      {
        role: 'CLINICIAN',
        noteType,
        jurisdiction: 'GA',
        attestationText: clinicianAttestationText,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        createdBy,
      },
      {
        role: 'SUPERVISOR',
        noteType,
        jurisdiction: 'GA',
        attestationText: supervisorAttestationText,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        createdBy,
      },
      {
        role: 'ADMIN',
        noteType,
        jurisdiction: 'GA',
        attestationText: adminAttestationText,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        createdBy,
      }
    );
  }

  // Insert attestations
  let created = 0;
  for (const attestation of attestations) {
    // Check if already exists
    const existing = await prisma.signatureAttestation.findFirst({
      where: {
        role: attestation.role,
        noteType: attestation.noteType,
        jurisdiction: attestation.jurisdiction,
        isActive: true,
      }
    });

    if (!existing) {
      await prisma.signatureAttestation.create({
        data: attestation,
      });
      created++;
      console.log(`Created: ${attestation.role} - ${attestation.noteType} - ${attestation.jurisdiction}`);
    } else {
      console.log(`Exists: ${attestation.role} - ${attestation.noteType} - ${attestation.jurisdiction}`);
    }
  }

  console.log(`\nDone! Created ${created} new attestation records in PRODUCTION.`);
}

seedAttestations()
  .catch((error) => {
    console.error('Error seeding attestations:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
