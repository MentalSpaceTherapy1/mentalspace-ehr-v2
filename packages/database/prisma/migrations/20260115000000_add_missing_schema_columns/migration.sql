-- Add Missing Schema Columns Migration
-- This migration adds all columns that exist in the Prisma schema but are missing from the database
-- All operations are idempotent to support re-running

-- ========================================
-- 1. USERS TABLE - Employment and Password fields
-- ========================================

-- Create EmploymentStatus enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentStatus') THEN
    CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'SUSPENDED');
  END IF;
END $$;

-- Add employmentStatus column to users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employmentStatus') THEN
    ALTER TABLE "users" ADD COLUMN "employmentStatus" "EmploymentStatus" DEFAULT 'ACTIVE';
  END IF;
END $$;

-- Add tempPasswordExpiry column to users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tempPasswordExpiry') THEN
    ALTER TABLE "users" ADD COLUMN "tempPasswordExpiry" TIMESTAMP(3);
  END IF;
END $$;

-- Add passwordExpiresAt column to users (if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordExpiresAt') THEN
    ALTER TABLE "users" ADD COLUMN "passwordExpiresAt" TIMESTAMP(3);
  END IF;
END $$;

-- Add employeeId column to users (Module 9: Staff Management)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employeeId') THEN
    ALTER TABLE "users" ADD COLUMN "employeeId" TEXT;
  END IF;
END $$;

-- Create unique index on employeeId (only if column exists)
CREATE UNIQUE INDEX IF NOT EXISTS "users_employeeId_key" ON "users"("employeeId") WHERE "employeeId" IS NOT NULL;

-- ========================================
-- 2. APPOINTMENTS TABLE - Confirmation and Risk Prediction fields
-- ========================================

-- Add confirmation tracking fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'confirmedAt') THEN
    ALTER TABLE "appointments" ADD COLUMN "confirmedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'confirmedBy') THEN
    ALTER TABLE "appointments" ADD COLUMN "confirmedBy" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'confirmationMethod') THEN
    ALTER TABLE "appointments" ADD COLUMN "confirmationMethod" TEXT;
  END IF;
END $$;

-- Add no-show risk prediction fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'noShowRiskScore') THEN
    ALTER TABLE "appointments" ADD COLUMN "noShowRiskScore" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'noShowRiskLevel') THEN
    ALTER TABLE "appointments" ADD COLUMN "noShowRiskLevel" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'noShowRiskFactors') THEN
    ALTER TABLE "appointments" ADD COLUMN "noShowRiskFactors" TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'riskCalculatedAt') THEN
    ALTER TABLE "appointments" ADD COLUMN "riskCalculatedAt" TIMESTAMP(3);
  END IF;
END $$;

-- Add appointment type relation field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointmentTypeId') THEN
    ALTER TABLE "appointments" ADD COLUMN "appointmentTypeId" TEXT;
  END IF;
END $$;

-- Add group session fields (Module 3 Phase 2: Group Appointments)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'groupSessionId') THEN
    ALTER TABLE "appointments" ADD COLUMN "groupSessionId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'isGroupSession') THEN
    ALTER TABLE "appointments" ADD COLUMN "isGroupSession" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index on groupSessionId
CREATE INDEX IF NOT EXISTS "appointments_groupSessionId_idx" ON "appointments"("groupSessionId");

-- ========================================
-- 3. CLIENTS TABLE - Employment status field
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'employmentStatus') THEN
    ALTER TABLE "clients" ADD COLUMN "employmentStatus" TEXT;
  END IF;
END $$;

-- ========================================
-- 4. Create indexes for performance
-- ========================================

CREATE INDEX IF NOT EXISTS "users_employmentStatus_idx" ON "users"("employmentStatus");
CREATE INDEX IF NOT EXISTS "appointments_confirmedAt_idx" ON "appointments"("confirmedAt");
CREATE INDEX IF NOT EXISTS "appointments_noShowRiskLevel_idx" ON "appointments"("noShowRiskLevel");
CREATE INDEX IF NOT EXISTS "appointments_appointmentTypeId_idx" ON "appointments"("appointmentTypeId");

-- ========================================
-- 5. Add comments for documentation
-- ========================================

COMMENT ON COLUMN "users"."employmentStatus" IS 'Current employment status: ACTIVE, ON_LEAVE, TERMINATED, SUSPENDED';
COMMENT ON COLUMN "users"."tempPasswordExpiry" IS 'Expiry time for temporary passwords (72 hours from creation)';
COMMENT ON COLUMN "appointments"."confirmedAt" IS 'Timestamp when appointment was confirmed by client';
COMMENT ON COLUMN "appointments"."confirmedBy" IS 'Who confirmed: USER, CLIENT_SMS, CLIENT_PORTAL, CLIENT_VOICE';
COMMENT ON COLUMN "appointments"."confirmationMethod" IS 'How confirmed: SMS_REPLY, PORTAL_CLICK, VOICE_RESPONSE, MANUAL';
COMMENT ON COLUMN "appointments"."noShowRiskScore" IS 'ML-predicted probability of no-show (0.0 to 1.0)';
COMMENT ON COLUMN "appointments"."noShowRiskLevel" IS 'Categorized risk level: LOW, MEDIUM, HIGH';
COMMENT ON COLUMN "appointments"."noShowRiskFactors" IS 'Array of factors contributing to risk score';
