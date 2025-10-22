-- AlterTable: Add e-signature fields to intake_form_submissions
ALTER TABLE "intake_form_submissions" 
ADD COLUMN "signatureData" TEXT,
ADD COLUMN "signedByName" TEXT,
ADD COLUMN "signedDate" TIMESTAMP(3),
ADD COLUMN "signatureIpAddress" TEXT,
ADD COLUMN "consentAgreed" BOOLEAN NOT NULL DEFAULT false;
