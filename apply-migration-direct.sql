-- Direct SQL Migration for E-Signature Feature
-- Migration: 20251022022500_add_esignature_to_intake_forms
-- Run this directly on the production database

-- Add e-signature columns to intake_form_submissions table
ALTER TABLE intake_form_submissions
ADD COLUMN IF NOT EXISTS "signatureData" TEXT,
ADD COLUMN IF NOT EXISTS "signedByName" TEXT,
ADD COLUMN IF NOT EXISTS "signedDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "signatureIpAddress" TEXT,
ADD COLUMN IF NOT EXISTS "consentAgreed" BOOLEAN NOT NULL DEFAULT false;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'intake_form_submissions'
AND column_name IN ('signatureData', 'signedByName', 'signedDate', 'signatureIpAddress', 'consentAgreed')
ORDER BY column_name;

-- This should return 5 rows if successful
