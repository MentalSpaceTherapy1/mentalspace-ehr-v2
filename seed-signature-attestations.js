/**
 * Seed SignatureAttestation records to enable note signing
 * Run with: node seed-signature-attestations.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAttestations() {
  console.log('Seeding SignatureAttestation records...');

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

  // Define attestation records - one generic 'ALL' for each role with US jurisdiction
  const attestations = [
    // Generic CLINICIAN attestation for all note types
    {
      role: 'CLINICIAN',
      noteType: 'ALL',
      jurisdiction: 'US',
      attestationText: clinicianAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    // Generic SUPERVISOR attestation for all note types
    {
      role: 'SUPERVISOR',
      noteType: 'ALL',
      jurisdiction: 'US',
      attestationText: supervisorAttestationText,
      isActive: true,
      effectiveDate: new Date('2024-01-01'),
      createdBy,
    },
    // Generic ADMIN attestation for all note types
    {
      role: 'ADMIN',
      noteType: 'ALL',
      jurisdiction: 'US',
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

  // Create attestations for each specific note type too (for more specific matching)
  for (const noteType of noteTypes) {
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

  console.log(`\nDone! Created ${created} new attestation records.`);
}

seedAttestations()
  .catch((error) => {
    console.error('Error seeding attestations:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
