-- Manual Migration Application for Task Definition 50
-- Migration: 20251119024521_make_draft_fields_nullable
-- Purpose: Make appointmentId, sessionDate, and dueDate nullable for draft notes
-- Date: 2025-11-19

-- Connect to production database:
-- psql "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr"

BEGIN;

-- Step 1: Apply schema changes
ALTER TABLE "ClinicalNote" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "ClinicalNote" ALTER COLUMN "sessionDate" DROP NOT NULL;
ALTER TABLE "ClinicalNote" ALTER COLUMN "dueDate" DROP NOT NULL;

-- Step 2: Record migration in Prisma's tracking table
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
VALUES (
  '20251119024521_make_draft_fields_nullable',
  '3f8c5a9e2b1d7c4f6e8a0b2c4d6e8f0a',
  NOW(),
  '20251119024521_make_draft_fields_nullable',
  '-- AlterTable: Make draft-related fields nullable for Progress Note drafts
ALTER TABLE "ClinicalNote" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "ClinicalNote" ALTER COLUMN "sessionDate" DROP NOT NULL;
ALTER TABLE "ClinicalNote" ALTER COLUMN "dueDate" DROP NOT NULL;',
  NULL,
  NOW(),
  1
)
ON CONFLICT (migration_name) DO NOTHING;

-- Step 3: Verify the changes
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'ClinicalNote'
  AND column_name IN ('appointmentId', 'sessionDate', 'dueDate')
ORDER BY column_name;

-- Expected output:
-- column_name    | is_nullable | data_type
-- ---------------+-------------+--------------------------
-- appointmentId  | YES         | text
-- dueDate        | YES         | timestamp with time zone
-- sessionDate    | YES         | timestamp with time zone

COMMIT;

-- If successful, you should see:
-- ALTER TABLE (3 times)
-- INSERT 0 1 (or INSERT 0 0 if already exists)
-- 3 rows showing is_nullable = YES
