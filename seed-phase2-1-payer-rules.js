/**
 * Phase 2.1: Seed Payer Rules
 *
 * Seeds example payer rules for common insurance scenarios:
 * - BlueCross GA
 * - Medicaid GA
 * - Medicare
 * - EAP (All)
 * - Self-Pay
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Phase 2.1 Payer Rules...\n');

  // ============================================================================
  // STEP 1: Create Payers
  // ============================================================================
  console.log('📋 Creating Payers...');

  const blueCrossGA = await prisma.payer.upsert({
    where: { id: 'bluecross-ga' },
    update: {},
    create: {
      id: 'bluecross-ga',
      name: 'BlueCross BlueShield of Georgia',
      payerType: 'COMMERCIAL',
      requiresPreAuth: false,
      isActive: true,
    },
  });
  console.log('  ✅ BlueCross GA created');

  const medicaidGA = await prisma.payer.upsert({
    where: { id: 'medicaid-ga' },
    update: {},
    create: {
      id: 'medicaid-ga',
      name: 'Georgia Medicaid',
      payerType: 'MEDICAID',
      requiresPreAuth: true,
      isActive: true,
    },
  });
  console.log('  ✅ Medicaid GA created');

  const medicare = await prisma.payer.upsert({
    where: { id: 'medicare' },
    update: {},
    create: {
      id: 'medicare',
      name: 'Medicare',
      payerType: 'MEDICARE',
      requiresPreAuth: false,
      isActive: true,
    },
  });
  console.log('  ✅ Medicare created');

  const eap = await prisma.payer.upsert({
    where: { id: 'eap-all' },
    update: {},
    create: {
      id: 'eap-all',
      name: 'Employee Assistance Program (All)',
      payerType: 'EAP',
      requiresPreAuth: false,
      isActive: true,
    },
  });
  console.log('  ✅ EAP created');

  const selfPay = await prisma.payer.upsert({
    where: { id: 'self-pay' },
    update: {},
    create: {
      id: 'self-pay',
      name: 'Self-Pay / Cash',
      payerType: 'SELF_PAY',
      requiresPreAuth: false,
      isActive: true,
    },
  });
  console.log('  ✅ Self-Pay created\n');

  // ============================================================================
  // STEP 2: Create BlueCross GA Rules
  // ============================================================================
  console.log('📋 Creating BlueCross GA Rules...');

  // LAMFT + Psychotherapy - Requires supervision and cosign
  await prisma.payerRule.upsert({
    where: { id: 'bc-ga-lamft-psychotherapy' },
    update: {},
    create: {
      id: 'bc-ga-lamft-psychotherapy',
      payerId: blueCrossGA.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: true,
      cosignRequired: true,
      incidentToBillingAllowed: true,
      renderingClinicianOverride: false,
      cosignTimeframeDays: 7,
      noteCompletionDays: 7,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAMFT + Psychotherapy (supervision required)');

  // LAMFT + Telehealth - Same requirements
  await prisma.payerRule.upsert({
    where: { id: 'bc-ga-lamft-telehealth' },
    update: {},
    create: {
      id: 'bc-ga-lamft-telehealth',
      payerId: blueCrossGA.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'TELEHEALTH',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: true,
      cosignRequired: true,
      incidentToBillingAllowed: true,
      renderingClinicianOverride: false,
      cosignTimeframeDays: 7,
      noteCompletionDays: 7,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAMFT + Telehealth (supervision required)');

  // LMFT + Psychotherapy - No requirements
  await prisma.payerRule.upsert({
    where: { id: 'bc-ga-lmft-psychotherapy' },
    update: {},
    create: {
      id: 'bc-ga-lmft-psychotherapy',
      payerId: blueCrossGA.id,
      clinicianCredential: 'LMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 14,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LMFT + Psychotherapy (no supervision)');

  // LMFT + Telehealth
  await prisma.payerRule.upsert({
    where: { id: 'bc-ga-lmft-telehealth' },
    update: {},
    create: {
      id: 'bc-ga-lmft-telehealth',
      payerId: blueCrossGA.id,
      clinicianCredential: 'LMFT',
      placeOfService: 'TELEHEALTH',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 14,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LMFT + Telehealth (no supervision)\n');

  // ============================================================================
  // STEP 3: Create Medicaid GA Rules
  // ============================================================================
  console.log('📋 Creating Medicaid GA Rules...');

  // LAMFT + Psychotherapy - Must bill under supervisor
  await prisma.payerRule.upsert({
    where: { id: 'medicaid-ga-lamft-psychotherapy' },
    update: {},
    create: {
      id: 'medicaid-ga-lamft-psychotherapy',
      payerId: medicaidGA.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: true,
      cosignRequired: true,
      incidentToBillingAllowed: false, // CRITICAL: No incident-to
      renderingClinicianOverride: true, // Bill under supervisor
      cosignTimeframeDays: 7,
      noteCompletionDays: 5,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: true,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAMFT + Psychotherapy (bill under supervisor)');

  // LAMFT + Telehealth
  await prisma.payerRule.upsert({
    where: { id: 'medicaid-ga-lamft-telehealth' },
    update: {},
    create: {
      id: 'medicaid-ga-lamft-telehealth',
      payerId: medicaidGA.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'TELEHEALTH',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: true,
      cosignRequired: true,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: true,
      cosignTimeframeDays: 7,
      noteCompletionDays: 5,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: true,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAMFT + Telehealth (bill under supervisor)');

  // LPC + Psychotherapy - No requirements
  await prisma.payerRule.upsert({
    where: { id: 'medicaid-ga-lpc-psychotherapy' },
    update: {},
    create: {
      id: 'medicaid-ga-lpc-psychotherapy',
      payerId: medicaidGA.id,
      clinicianCredential: 'LPC',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 5,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: true,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LPC + Psychotherapy (no supervision)');

  // LMFT + Psychotherapy - No requirements
  await prisma.payerRule.upsert({
    where: { id: 'medicaid-ga-lmft-psychotherapy' },
    update: {},
    create: {
      id: 'medicaid-ga-lmft-psychotherapy',
      payerId: medicaidGA.id,
      clinicianCredential: 'LMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 5,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: true,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LMFT + Psychotherapy (no supervision)\n');

  // ============================================================================
  // STEP 4: Create Medicare Rules (Prohibited)
  // ============================================================================
  console.log('📋 Creating Medicare Rules (Prohibited)...');

  // LAMFT + Any Service - PROHIBITED
  await prisma.payerRule.upsert({
    where: { id: 'medicare-lamft-prohibited' },
    update: {},
    create: {
      id: 'medicare-lamft-prohibited',
      payerId: medicare.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: null,
      diagnosisRequired: false,
      treatmentPlanRequired: false,
      medicalNecessityRequired: false,
      priorAuthRequired: false,
      isProhibited: true,
      prohibitionReason: 'Medicare does not credential associate-level Marriage and Family Therapists (LAMFT). Services must be provided by fully licensed clinicians (LMFT, LPC, LCSW, or PhD/PsyD).',
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAMFT prohibited');

  // LAPC + Any Service - PROHIBITED
  await prisma.payerRule.upsert({
    where: { id: 'medicare-lapc-prohibited' },
    update: {},
    create: {
      id: 'medicare-lapc-prohibited',
      payerId: medicare.id,
      clinicianCredential: 'LAPC',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: null,
      diagnosisRequired: false,
      treatmentPlanRequired: false,
      medicalNecessityRequired: false,
      priorAuthRequired: false,
      isProhibited: true,
      prohibitionReason: 'Medicare does not credential associate-level Professional Counselors (LAPC). Services must be provided by fully licensed clinicians (LPC, LCSW, LMFT, or PhD/PsyD).',
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAPC prohibited');

  // LMFT + Psychotherapy - Allowed
  await prisma.payerRule.upsert({
    where: { id: 'medicare-lmft-psychotherapy' },
    update: {},
    create: {
      id: 'medicare-lmft-psychotherapy',
      payerId: medicare.id,
      clinicianCredential: 'LMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 14,
      diagnosisRequired: true,
      treatmentPlanRequired: true,
      medicalNecessityRequired: true,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LMFT allowed\n');

  // ============================================================================
  // STEP 5: Create EAP Rules (Lenient)
  // ============================================================================
  console.log('📋 Creating EAP Rules (Lenient)...');

  // LAMFT + Psychotherapy - Optional cosign
  await prisma.payerRule.upsert({
    where: { id: 'eap-lamft-psychotherapy' },
    update: {},
    create: {
      id: 'eap-lamft-psychotherapy',
      payerId: eap.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false, // Optional
      incidentToBillingAllowed: true,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 14,
      diagnosisRequired: false, // EAP often doesn't require diagnosis
      treatmentPlanRequired: false,
      medicalNecessityRequired: false,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LAMFT + Psychotherapy (lenient)');

  // LMFT + Psychotherapy
  await prisma.payerRule.upsert({
    where: { id: 'eap-lmft-psychotherapy' },
    update: {},
    create: {
      id: 'eap-lmft-psychotherapy',
      payerId: eap.id,
      clinicianCredential: 'LMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: 14,
      diagnosisRequired: false,
      treatmentPlanRequired: false,
      medicalNecessityRequired: false,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ LMFT + Psychotherapy (lenient)\n');

  // ============================================================================
  // STEP 6: Create Self-Pay Rules (No requirements)
  // ============================================================================
  console.log('📋 Creating Self-Pay Rules (No requirements)...');

  // Any credential + Any service - No requirements
  await prisma.payerRule.upsert({
    where: { id: 'self-pay-any' },
    update: {},
    create: {
      id: 'self-pay-any',
      payerId: selfPay.id,
      clinicianCredential: 'LAMFT',
      placeOfService: 'OFFICE',
      serviceType: 'PSYCHOTHERAPY',
      supervisionRequired: false,
      cosignRequired: false,
      incidentToBillingAllowed: false,
      renderingClinicianOverride: false,
      cosignTimeframeDays: null,
      noteCompletionDays: null,
      diagnosisRequired: false,
      treatmentPlanRequired: false,
      medicalNecessityRequired: false,
      priorAuthRequired: false,
      isProhibited: false,
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('  ✅ Self-Pay (no requirements)\n');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('✅ Seeding Complete!\n');
  console.log('📊 Summary:');
  console.log('   - 5 Payers created');
  console.log('   - 17 Payer Rules created');
  console.log('   - 2 Prohibited combinations (Medicare LAMFT/LAPC)');
  console.log('   - Rules cover: BlueCross GA, Medicaid GA, Medicare, EAP, Self-Pay\n');

  const stats = await prisma.payer.findMany({
    include: {
      _count: {
        select: { rules: true },
      },
    },
  });

  console.log('📋 Payers and Rule Counts:');
  stats.forEach((payer) => {
    console.log(`   - ${payer.name}: ${payer._count.rules} rules`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding payer rules:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
