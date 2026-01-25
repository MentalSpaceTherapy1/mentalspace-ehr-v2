-- Migration: Fix missing soft delete columns
-- This is a remediation migration to add columns that should have been added
-- by the 20260123000000_remove_ssn_add_soft_deletes migration but were not applied
-- Uses IF NOT EXISTS to be idempotent and safe to run multiple times

-- ============================================================================
-- Add soft delete columns (deletedAt) to PHI models
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
-- Add indexes on deletedAt for efficient soft delete queries
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
