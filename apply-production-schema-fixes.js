const { Client } = require('pg');

const client = new Client({
  host: 'mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspaceehr',
  user: 'postgres',
  password: 'ROInARVcjyQQZvqMqNgJ1835qzenNNxQ',
  ssl: { rejectUnauthorized: false }
});

async function applyProductionMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to PRODUCTION database\n');
    console.log('Host:', 'mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com');
    console.log('Database:', 'mentalspaceehr\n');

    console.log('=== STARTING PRODUCTION SCHEMA MIGRATION ===\n');
    console.log('This will add 38 missing columns across 4 tables\n');

    // ========================================
    // 1. FORM_ASSIGNMENTS TABLE - 3 columns
    // ========================================
    console.log('1️⃣  FORM_ASSIGNMENTS TABLE (3 columns)\n');

    try {
      console.log('   Adding assignmentNotes...');
      await client.query(`ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "assignmentNotes" TEXT;`);
      console.log('   ✅ assignmentNotes added\n');
    } catch (e) { console.log('   ⚠️  assignmentNotes already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding clientMessage...');
      await client.query(`ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "clientMessage" TEXT;`);
      console.log('   ✅ clientMessage added\n');
    } catch (e) { console.log('   ⚠️  clientMessage already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding lastReminderSent...');
      await client.query(`ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "lastReminderSent" TIMESTAMP;`);
      console.log('   ✅ lastReminderSent added\n');
    } catch (e) { console.log('   ⚠️  lastReminderSent already exists or error:', e.message, '\n'); }

    // ========================================
    // 2. CLIENT_DIAGNOSES TABLE - 17 columns
    // ========================================
    console.log('\n2️⃣  CLIENT_DIAGNOSES TABLE (17 columns)\n');

    try {
      console.log('   Adding diagnosisType...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosisType" TEXT;`);
      console.log('   ✅ diagnosisType added\n');
    } catch (e) { console.log('   ⚠️  diagnosisType already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding icd10Code...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "icd10Code" TEXT;`);
      console.log('   ✅ icd10Code added\n');
    } catch (e) { console.log('   ⚠️  icd10Code already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding dsm5Code...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "dsm5Code" TEXT;`);
      console.log('   ✅ dsm5Code added\n');
    } catch (e) { console.log('   ⚠️  dsm5Code already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding diagnosisName...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosisName" TEXT;`);
      console.log('   ✅ diagnosisName added\n');
    } catch (e) { console.log('   ⚠️  diagnosisName already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding diagnosisCategory...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosisCategory" TEXT;`);
      console.log('   ✅ diagnosisCategory added\n');
    } catch (e) { console.log('   ⚠️  diagnosisCategory already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding severitySpecifier...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "severitySpecifier" TEXT;`);
      console.log('   ✅ severitySpecifier added\n');
    } catch (e) { console.log('   ⚠️  severitySpecifier already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding courseSpecifier...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "courseSpecifier" TEXT;`);
      console.log('   ✅ courseSpecifier added\n');
    } catch (e) { console.log('   ⚠️  courseSpecifier already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding onsetDate...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "onsetDate" TIMESTAMP;`);
      console.log('   ✅ onsetDate added\n');
    } catch (e) { console.log('   ⚠️  onsetDate already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding supportingEvidence...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "supportingEvidence" TEXT;`);
      console.log('   ✅ supportingEvidence added\n');
    } catch (e) { console.log('   ⚠️  supportingEvidence already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding differentialConsiderations...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "differentialConsiderations" TEXT;`);
      console.log('   ✅ differentialConsiderations added\n');
    } catch (e) { console.log('   ⚠️  differentialConsiderations already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding diagnosedById...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosedById" TEXT;`);
      console.log('   ✅ diagnosedById added\n');
    } catch (e) { console.log('   ⚠️  diagnosedById already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding remissionDate...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "remissionDate" TIMESTAMP;`);
      console.log('   ✅ remissionDate added\n');
    } catch (e) { console.log('   ⚠️  remissionDate already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding dateDiagnosed...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "dateDiagnosed" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
      console.log('   ✅ dateDiagnosed added\n');
    } catch (e) { console.log('   ⚠️  dateDiagnosed already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding lastReviewedDate...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "lastReviewedDate" TIMESTAMP;`);
      console.log('   ✅ lastReviewedDate added\n');
    } catch (e) { console.log('   ⚠️  lastReviewedDate already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding lastReviewedById...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "lastReviewedById" TEXT;`);
      console.log('   ✅ lastReviewedById added\n');
    } catch (e) { console.log('   ⚠️  lastReviewedById already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding dateResolved...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "dateResolved" TIMESTAMP;`);
      console.log('   ✅ dateResolved added\n');
    } catch (e) { console.log('   ⚠️  dateResolved already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding resolutionNotes...');
      await client.query(`ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;`);
      console.log('   ✅ resolutionNotes added\n');
    } catch (e) { console.log('   ⚠️  resolutionNotes already exists or error:', e.message, '\n'); }

    // Make legacy diagnosisCode nullable
    try {
      console.log('   Making diagnosisCode nullable...');
      await client.query(`ALTER TABLE "client_diagnoses" ALTER COLUMN "diagnosisCode" DROP NOT NULL;`);
      console.log('   ✅ diagnosisCode is now nullable\n');
    } catch (e) { console.log('   ⚠️  diagnosisCode already nullable or error:', e.message, '\n'); }

    // ========================================
    // 3. CLINICAL_NOTES TABLE - 6 columns
    // ========================================
    console.log('\n3️⃣  CLINICAL_NOTES TABLE (6 columns)\n');

    try {
      console.log('   Adding unlockRequested...');
      await client.query(`ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockRequested" BOOLEAN NOT NULL DEFAULT false;`);
      console.log('   ✅ unlockRequested added\n');
    } catch (e) { console.log('   ⚠️  unlockRequested already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding unlockRequestDate...');
      await client.query(`ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockRequestDate" TIMESTAMP;`);
      console.log('   ✅ unlockRequestDate added\n');
    } catch (e) { console.log('   ⚠️  unlockRequestDate already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding unlockReason...');
      await client.query(`ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockReason" TEXT;`);
      console.log('   ✅ unlockReason added\n');
    } catch (e) { console.log('   ⚠️  unlockReason already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding unlockApprovedBy...');
      await client.query(`ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockApprovedBy" TEXT;`);
      console.log('   ✅ unlockApprovedBy added\n');
    } catch (e) { console.log('   ⚠️  unlockApprovedBy already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding unlockApprovalDate...');
      await client.query(`ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockApprovalDate" TIMESTAMP;`);
      console.log('   ✅ unlockApprovalDate added\n');
    } catch (e) { console.log('   ⚠️  unlockApprovalDate already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding unlockUntil...');
      await client.query(`ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockUntil" TIMESTAMP;`);
      console.log('   ✅ unlockUntil added\n');
    } catch (e) { console.log('   ⚠️  unlockUntil already exists or error:', e.message, '\n'); }

    // ========================================
    // 4. OUTCOME_MEASURES TABLE - 12 columns
    // ========================================
    console.log('\n4️⃣  OUTCOME_MEASURES TABLE (12 columns)\n');

    try {
      console.log('   Adding administeredById...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "administeredById" TEXT NOT NULL DEFAULT 'unknown';`);
      console.log('   ✅ administeredById added\n');
    } catch (e) { console.log('   ⚠️  administeredById already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding administeredDate...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "administeredDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
      console.log('   ✅ administeredDate added\n');
    } catch (e) { console.log('   ⚠️  administeredDate already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding clinicalNoteId...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "clinicalNoteId" TEXT;`);
      console.log('   ✅ clinicalNoteId added\n');
    } catch (e) { console.log('   ⚠️  clinicalNoteId already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding appointmentId...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;`);
      console.log('   ✅ appointmentId added\n');
    } catch (e) { console.log('   ⚠️  appointmentId already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding responses (JSONB)...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "responses" JSONB NOT NULL DEFAULT '{}'::jsonb;`);
      console.log('   ✅ responses added\n');
    } catch (e) { console.log('   ⚠️  responses already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding totalScore...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "totalScore" INTEGER NOT NULL DEFAULT 0;`);
      console.log('   ✅ totalScore added\n');
    } catch (e) { console.log('   ⚠️  totalScore already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding severity...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'MINIMAL';`);
      console.log('   ✅ severity added\n');
    } catch (e) { console.log('   ⚠️  severity already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding severityLabel...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "severityLabel" TEXT NOT NULL DEFAULT 'Unknown';`);
      console.log('   ✅ severityLabel added\n');
    } catch (e) { console.log('   ⚠️  severityLabel already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding clinicalNotes...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "clinicalNotes" TEXT;`);
      console.log('   ✅ clinicalNotes added\n');
    } catch (e) { console.log('   ⚠️  clinicalNotes already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding completionTime...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "completionTime" INTEGER;`);
      console.log('   ✅ completionTime added\n');
    } catch (e) { console.log('   ⚠️  completionTime already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding wasCompleted...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "wasCompleted" BOOLEAN NOT NULL DEFAULT true;`);
      console.log('   ✅ wasCompleted added\n');
    } catch (e) { console.log('   ⚠️  wasCompleted already exists or error:', e.message, '\n'); }

    try {
      console.log('   Adding updatedAt...');
      await client.query(`ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
      console.log('   ✅ updatedAt added\n');
    } catch (e) { console.log('   ⚠️  updatedAt already exists or error:', e.message, '\n'); }

    console.log('\n========================================');
    console.log('✅ PRODUCTION MIGRATION COMPLETED!');
    console.log('========================================\n');
    console.log('Total columns added: 38 across 4 tables');
    console.log('- form_assignments: 3 columns');
    console.log('- client_diagnoses: 17 columns');
    console.log('- clinical_notes: 6 columns');
    console.log('- outcome_measures: 12 columns\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error('Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Database connection closed\n');
  }
}

applyProductionMigration();
