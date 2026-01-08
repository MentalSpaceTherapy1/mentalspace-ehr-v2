const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMissingColumns() {
  console.log('Applying missing columns to insurance_information table...');

  try {
    // Add missing columns from advancedmd_integration migration
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "advancedMDPayerId" TEXT;
    `);
    console.log('Added advancedMDPayerId column');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "advancedMDPayerName" TEXT;
    `);
    console.log('Added advancedMDPayerName column');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "lastEligibilityCheck" TIMESTAMP(3);
    `);
    console.log('Added lastEligibilityCheck column');

    // Also add missing columns to clients table if needed
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "advancedMDPatientId" TEXT;
    `);
    console.log('Added advancedMDPatientId column to clients');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "lastSyncedToAMD" TIMESTAMP(3);
    `);
    console.log('Added lastSyncedToAMD column to clients');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amdSyncStatus" TEXT;
    `);
    console.log('Added amdSyncStatus column to clients');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amdSyncError" TEXT;
    `);
    console.log('Added amdSyncError column to clients');

    console.log('All columns applied successfully!');

  } catch (error) {
    console.error('Error applying columns:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMissingColumns();
