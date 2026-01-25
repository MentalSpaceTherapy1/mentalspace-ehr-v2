const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find John Doe and add insurance
  const johnDoe = await prisma.client.findFirst({
    where: { firstName: 'John', lastName: 'Doe' },
    include: { insuranceInfo: true }
  });

  if (johnDoe) {
    console.log('Found John Doe, ID:', johnDoe.id);
    console.log('Insurance count:', johnDoe.insuranceInfo ? johnDoe.insuranceInfo.length : 0);

    if (!johnDoe.insuranceInfo || johnDoe.insuranceInfo.length === 0) {
      const insurance = await prisma.insuranceInformation.create({
        data: {
          clientId: johnDoe.id,
          rank: 'Primary',
          insuranceCompany: 'CareSource Georgia Medicaid',
          planName: 'CareSource Just4Me',
          planType: 'Medicaid HMO',
          memberId: 'CS123456789',
          groupNumber: 'GA-MED-001',
          effectiveDate: new Date('2024-01-01'),
        }
      });
      console.log('Created insurance:', insurance.id);
    } else {
      console.log('Already has insurance:', johnDoe.insuranceInfo[0].insuranceCompany);
    }

    // Also get a provider ID for the PA form
    const provider = await prisma.user.findFirst({
      where: {
        email: { contains: '@mentalspacetherapy.com' }
      }
    });
    if (provider) {
      console.log('Provider ID:', provider.id);
      console.log('Provider name:', provider.firstName, provider.lastName);
    }
  } else {
    console.log('John Doe not found');
  }
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
