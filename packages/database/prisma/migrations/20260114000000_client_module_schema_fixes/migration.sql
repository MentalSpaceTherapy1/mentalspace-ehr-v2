-- Client Module Schema Fixes
-- Adds 38 missing columns across 4 tables to fix 500 errors

-- ========================================
-- 1. FORM_ASSIGNMENTS TABLE - 3 columns
-- ========================================

-- Add assignment notes for internal tracking
ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "assignmentNotes" TEXT;

-- Add client message for communication
ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "clientMessage" TEXT;

-- Add timestamp for last reminder sent
ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "lastReminderSent" TIMESTAMP(3);

-- ========================================
-- 2. CLIENT_DIAGNOSES TABLE - 17 columns
-- ========================================

-- Add diagnosis classification fields
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosisType" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "icd10Code" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "dsm5Code" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosisName" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosisCategory" TEXT;

-- Add diagnosis severity and course specifiers
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "severitySpecifier" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "courseSpecifier" TEXT;

-- Add diagnosis timeline fields
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "onsetDate" TIMESTAMP(3);
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "remissionDate" TIMESTAMP(3);
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "dateDiagnosed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "dateResolved" TIMESTAMP(3);

-- Add clinical evidence and considerations
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "supportingEvidence" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "differentialConsiderations" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;

-- Add diagnosis review tracking
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "diagnosedById" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "lastReviewedDate" TIMESTAMP(3);
ALTER TABLE "client_diagnoses" ADD COLUMN IF NOT EXISTS "lastReviewedById" TEXT;

-- Make legacy diagnosisCode column nullable
DO $$
BEGIN
    ALTER TABLE "client_diagnoses" ALTER COLUMN "diagnosisCode" DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ========================================
-- 3. CLINICAL_NOTES TABLE - 6 columns
-- ========================================
-- Sunday Lockout & Unlock Request System

-- Add unlock request tracking
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockRequestDate" TIMESTAMP(3);
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockReason" TEXT;

-- Add unlock approval tracking
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockApprovedBy" TEXT;
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockApprovalDate" TIMESTAMP(3);
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "unlockUntil" TIMESTAMP(3);

-- ========================================
-- 4. OUTCOME_MEASURES TABLE - 12 columns
-- ========================================

-- Add administration tracking
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "administeredById" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "administeredDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add relational linking to clinical notes and appointments
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "clinicalNoteId" TEXT;
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;

-- Add response data storage
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "responses" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add scoring fields
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "totalScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'MINIMAL';
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "severityLabel" TEXT NOT NULL DEFAULT 'Unknown';

-- Add clinical interpretation
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "clinicalNotes" TEXT;

-- Add completion tracking
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "completionTime" INTEGER;
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "wasCompleted" BOOLEAN NOT NULL DEFAULT true;

-- Add timestamp tracking
ALTER TABLE "outcome_measures" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
