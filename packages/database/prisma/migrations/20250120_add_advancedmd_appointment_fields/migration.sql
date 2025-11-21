-- Phase 3: AdvancedMD Appointment Integration Fields
-- Add fields to track appointment synchronization with AdvancedMD

-- Add AdvancedMD integration fields to appointments table
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "advancedMDVisitId" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "advancedMDProviderId" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "advancedMDFacilityId" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "lastSyncedToAMD" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "amdSyncStatus" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "amdSyncError" TEXT;

-- Create unique index for AdvancedMD visit ID
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_advancedMDVisitId_key" ON "appointments"("advancedMDVisitId");
