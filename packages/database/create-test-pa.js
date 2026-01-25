const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = '4a95f594-85a5-485c-aea4-e1358a5ad953';

  // Get the insurance we created
  const insurance = await prisma.insuranceInformation.findFirst({
    where: { clientId }
  });

  if (!insurance) {
    console.log('No insurance found for client');
    return;
  }

  console.log('Found insurance:', insurance.id, insurance.insuranceCompany);

  // Get a provider
  const provider = await prisma.user.findFirst({
    where: { email: 'ejoseph@chctherapy.com' }
  });

  if (!provider) {
    console.log('No provider found');
    return;
  }

  console.log('Found provider:', provider.id, provider.firstName, provider.lastName);

  // Check for existing PA
  const existingPA = await prisma.priorAuthorization.findFirst({
    where: { clientId }
  });

  if (existingPA) {
    console.log('PA already exists:', existingPA.id, existingPA.authorizationNumber);
    return;
  }

  // Create test PA
  const pa = await prisma.priorAuthorization.create({
    data: {
      clientId,
      insuranceId: insurance.id,
      authorizationNumber: 'AUTH-2026-TEST-001',
      authorizationType: 'Outpatient Mental Health',
      cptCodes: ['90834', '90837'],
      diagnosisCodes: ['F32.1', 'F41.1'],
      sessionsAuthorized: 24,
      sessionsUsed: 0,
      sessionsRemaining: 24,
      sessionUnit: 'SESSIONS',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      requestingProviderId: provider.id,
      status: 'APPROVED',
      createdBy: provider.id
    }
  });

  console.log('Created PA:', pa.id, pa.authorizationNumber);
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
