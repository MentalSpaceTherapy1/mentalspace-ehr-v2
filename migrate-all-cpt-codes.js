const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function migrateAllCPTCodes() {
  try {
    // Read the exported codes
    const codes = JSON.parse(fs.readFileSync('local-cpt-codes.json', 'utf8'));

    console.log(`Migrating ${codes.length} CPT codes to production...\n`);

    for (const code of codes) {
      const migrated = await prisma.serviceCode.upsert({
        where: { code: code.code },
        update: {
          description: code.description,
          serviceType: code.serviceType,
          category: code.category,
          defaultDuration: code.defaultDuration,
          defaultRate: parseFloat(code.defaultRate),
          isActive: code.isActive,
          requiresAuthorization: code.requiresAuthorization,
          lastModifiedBy: 'system-migration'
        },
        create: {
          code: code.code,
          description: code.description,
          serviceType: code.serviceType,
          category: code.category,
          defaultDuration: code.defaultDuration,
          defaultRate: parseFloat(code.defaultRate),
          isActive: code.isActive,
          requiresAuthorization: code.requiresAuthorization,
          createdBy: 'system-migration',
          lastModifiedBy: 'system-migration'
        }
      });

      console.log(`✓ ${migrated.code} - ${migrated.description}`);
    }

    console.log(`\n✅ Successfully migrated all ${codes.length} CPT codes to production!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAllCPTCodes();
