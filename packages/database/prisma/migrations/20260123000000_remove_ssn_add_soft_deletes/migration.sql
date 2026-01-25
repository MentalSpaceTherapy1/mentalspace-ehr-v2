-- Migration: Remove subscriberSSN and add soft deletes to PHI models
-- HIPAA Compliance: SSN should never be collected
-- Soft deletes required for audit trail on PHI

-- ============================================================================
-- STEP 1: Remove subscriberSSN from insurance_information
-- SSN is never collected by MentalSpace EHR
-- ============================================================================
ALTER TABLE "insurance_information" DROP COLUMN IF EXISTS "subscriberSSN";

-- ============================================================================
-- STEP 2: Add soft delete support (deletedAt) to PHI models
-- Required for HIPAA compliance - audit trail for all PHI
-- ============================================================================

-- insurance_information soft delete
ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- appointments soft delete
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- clinical_notes soft delete
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- client_documents soft delete
ALTER TABLE "client_documents" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- note_amendments soft delete
ALTER TABLE "note_amendments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ============================================================================
-- STEP 3: Add indexes on deletedAt for efficient soft delete queries
-- ============================================================================

-- Index for insurance_information soft delete queries
CREATE INDEX IF NOT EXISTS "insurance_information_deletedAt_idx" ON "insurance_information"("deletedAt");

-- Index for appointments soft delete queries
CREATE INDEX IF NOT EXISTS "appointments_deletedAt_idx" ON "appointments"("deletedAt");

-- Index for clinical_notes soft delete queries
CREATE INDEX IF NOT EXISTS "clinical_notes_deletedAt_idx" ON "clinical_notes"("deletedAt");

-- Index for client_documents soft delete queries
CREATE INDEX IF NOT EXISTS "client_documents_deletedAt_idx" ON "client_documents"("deletedAt");

-- Index for note_amendments soft delete queries
CREATE INDEX IF NOT EXISTS "note_amendments_deletedAt_idx" ON "note_amendments"("deletedAt");
