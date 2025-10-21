-- AlterTable
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;
