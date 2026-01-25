const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check raw table count
  const rawCount = await prisma.$queryRaw`SELECT COUNT(*) FROM prior_authorizations`;
  console.log('Raw table count:', rawCount);

  // Try the exact same query the API would run
  console.log('\n--- Running API-style query ---');
  const results = await prisma.priorAuthorization.findMany({
    where: { clientId: '4a95f594-85a5-485c-aea4-e1358a5ad953' },
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true
    }
  });
  console.log('Query results count:', results.length);
  if (results.length > 0) {
    console.log('First result auth#:', results[0].authorizationNumber);
    console.log('First result client:', results[0].client?.firstName, results[0].client?.lastName);
  }

  // Get count without filter
  const allCount = await prisma.priorAuthorization.count();
  console.log('\nTotal PAs (no filter):', allCount);
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
