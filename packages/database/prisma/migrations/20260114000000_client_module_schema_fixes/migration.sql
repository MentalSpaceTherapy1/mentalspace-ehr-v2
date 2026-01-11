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
-- NOTE: Only run if table exists (it may not exist in all environments)

DO $$
BEGIN
  -- Check if client_diagnoses table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_diagnoses') THEN
    -- Add diagnosis classification fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'diagnosisType') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosisType" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'icd10Code') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "icd10Code" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'dsm5Code') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "dsm5Code" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'diagnosisName') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosisName" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'diagnosisCategory') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosisCategory" TEXT;
    END IF;

    -- Add diagnosis severity and course specifiers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'severitySpecifier') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "severitySpecifier" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'courseSpecifier') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "courseSpecifier" TEXT;
    END IF;

    -- Add diagnosis timeline fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'onsetDate') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "onsetDate" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'remissionDate') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "remissionDate" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'dateDiagnosed') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "dateDiagnosed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'dateResolved') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "dateResolved" TIMESTAMP(3);
    END IF;

    -- Add clinical evidence and considerations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'supportingEvidence') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "supportingEvidence" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'differentialConsiderations') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "differentialConsiderations" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'resolutionNotes') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "resolutionNotes" TEXT;
    END IF;

    -- Add diagnosis review tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'diagnosedById') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosedById" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'lastReviewedDate') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "lastReviewedDate" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_diagnoses' AND column_name = 'lastReviewedById') THEN
      ALTER TABLE "client_diagnoses" ADD COLUMN "lastReviewedById" TEXT;
    END IF;

    -- Make legacy diagnosisCode column nullable (if it exists)
    BEGIN
      ALTER TABLE "client_diagnoses" ALTER COLUMN "diagnosisCode" DROP NOT NULL;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;
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
-- NOTE: Only run if table exists (it may not exist in all environments)

DO $$
BEGIN
  -- Check if outcome_measures table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outcome_measures') THEN
    -- Add administration tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'administeredById') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "administeredById" TEXT NOT NULL DEFAULT 'unknown';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'administeredDate') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "administeredDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add relational linking to clinical notes and appointments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'clinicalNoteId') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "clinicalNoteId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'appointmentId') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "appointmentId" TEXT;
    END IF;

    -- Add response data storage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'responses') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "responses" JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Add scoring fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'totalScore') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "totalScore" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'severity') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MINIMAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'severityLabel') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "severityLabel" TEXT NOT NULL DEFAULT 'Unknown';
    END IF;

    -- Add clinical interpretation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'clinicalNotes') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "clinicalNotes" TEXT;
    END IF;

    -- Add completion tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'completionTime') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "completionTime" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'wasCompleted') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "wasCompleted" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Add timestamp tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outcome_measures' AND column_name = 'updatedAt') THEN
      ALTER TABLE "outcome_measures" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
  END IF;
END $$;
