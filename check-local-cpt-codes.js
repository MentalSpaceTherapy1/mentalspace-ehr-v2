const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCPTCodes() {
  try {
    const codes = await prisma.serviceCode.findMany({
      orderBy: { code: 'asc' }
    });

    console.log(`\nFound ${codes.length} CPT codes in local database:\n`);

    codes.forEach(code => {
      console.log(`${code.code} - ${code.description} (${code.category || 'N/A'})`);
    });

    // Save to JSON for migration
    const fs = require('fs');
    fs.writeFileSync('local-cpt-codes.json', JSON.stringify(codes, null, 2));
    console.log(`\n✓ Saved to local-cpt-codes.json`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkCPTCodes();
