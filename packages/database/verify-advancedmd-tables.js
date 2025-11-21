const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyTables() {
  console.log('Verifying AdvancedMD tables...\n');

  const tablesToCheck = [
    { name: 'AdvancedMDConfig', model: 'advancedMDConfig' },
    { name: 'AdvancedMDRateLimitState', model: 'advancedMDRateLimitState' },
    { name: 'AdvancedMDSyncLog', model: 'advancedMDSyncLog' },
    { name: 'EligibilityCheck', model: 'eligibilityCheck' },
    { name: 'Claim', model: 'claim' },
    { name: 'ClaimCharge', model: 'claimCharge' },
    { name: 'ClaimPayment', model: 'claimPayment' },
    { name: 'ERARecord', model: 'eRARecord' },
    { name: 'PaymentClaimMapping', model: 'paymentClaimMapping' },
    { name: 'ClaimValidationRule', model: 'claimValidationRule' },
    { name: 'CPTCode', model: 'cPTCode' },
    { name: 'ICDCode', model: 'iCDCode' },
  ];

  let allTablesExist = true;

  for (const table of tablesToCheck) {
    try {
      const count = await prisma[table.model].count();
      console.log(`✅ ${table.name} table exists (${count} records)`);
    } catch (error) {
      console.error(`❌ ${table.name} table missing or error: ${error.message}`);
      allTablesExist = false;
    }
  }

  // Check if Client model has AdvancedMD fields
  try {
    const client = await prisma.client.findFirst({
      select: {
        id: true,
        advancedMDPatientId: true,
        lastSyncedToAMD: true,
        amdSyncStatus: true,
        amdSyncError: true,
      },
    });
    console.log('\n✅ Client model has AdvancedMD fields');
  } catch (error) {
    console.error('\n❌ Client model missing AdvancedMD fields:', error.message);
    allTablesExist = false;
  }

  // Check if InsuranceInformation model has AdvancedMD fields
  try {
    const insurance = await prisma.insuranceInformation.findFirst({
      select: {
        id: true,
        advancedMDPayerId: true,
        advancedMDPayerName: true,
        lastEligibilityCheck: true,
      },
    });
    console.log('✅ InsuranceInformation model has AdvancedMD fields');
  } catch (error) {
    console.error('❌ InsuranceInformation model missing AdvancedMD fields:', error.message);
    allTablesExist = false;
  }

  // Check if ChargeEntry model has AdvancedMD fields
  try {
    const charge = await prisma.chargeEntry.findFirst({
      select: {
        id: true,
        advancedMDChargeId: true,
        advancedMDVisitId: true,
        syncStatus: true,
        syncError: true,
        lastSyncAttempt: true,
      },
    });
    console.log('✅ ChargeEntry model has AdvancedMD fields');
  } catch (error) {
    console.error('❌ ChargeEntry model missing AdvancedMD fields:', error.message);
    allTablesExist = false;
  }

  console.log('\n' + '='.repeat(50));
  if (allTablesExist) {
    console.log('✅ All AdvancedMD tables and fields verified successfully!');
  } else {
    console.log('❌ Some tables or fields are missing');
    process.exit(1);
  }

  await prisma.$disconnect();
}

verifyTables().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
