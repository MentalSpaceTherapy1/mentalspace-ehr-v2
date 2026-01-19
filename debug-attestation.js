const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'ejoseph@chctherapy.com' },
    select: {
      id: true,
      email: true,
      roles: true,
      licenseState: true,
      firstName: true,
      lastName: true
    }
  });
  console.log('User:', JSON.stringify(user, null, 2));

  // Try the attestation lookup logic
  const attestationRole = 'ADMIN';
  const noteType = 'Progress Note';
  const jurisdiction = user.licenseState || 'GA';

  console.log('\nLookup params:');
  console.log('  role:', attestationRole);
  console.log('  noteType:', noteType);
  console.log('  jurisdiction:', jurisdiction);

  // First try
  let att = await prisma.signatureAttestation.findFirst({
    where: {
      role: attestationRole,
      noteType: noteType,
      jurisdiction: jurisdiction,
      isActive: true
    }
  });
  console.log('\n1st lookup (specific noteType + state):', att ? 'FOUND' : 'NOT FOUND');

  // Second try
  if (!att) {
    att = await prisma.signatureAttestation.findFirst({
      where: {
        role: attestationRole,
        noteType: 'ALL',
        jurisdiction: jurisdiction,
        isActive: true
      }
    });
    console.log('2nd lookup (ALL noteType + state):', att ? 'FOUND' : 'NOT FOUND');
  }

  // Third try
  if (!att) {
    att = await prisma.signatureAttestation.findFirst({
      where: {
        role: attestationRole,
        noteType: 'ALL',
        jurisdiction: 'US',
        isActive: true
      }
    });
    console.log('3rd lookup (ALL noteType + US):', att ? 'FOUND' : 'NOT FOUND');
  }

  if (att) {
    console.log('\nFound attestation:', JSON.stringify(att, null, 2));
  } else {
    console.log('\nNo attestation found!');
  }

  await prisma.$disconnect();
}
check();
