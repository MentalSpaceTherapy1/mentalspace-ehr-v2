-- AlterTable: Make draft-related fields nullable for Progress Note drafts
ALTER TABLE "clinical_notes" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "clinical_notes" ALTER COLUMN "sessionDate" DROP NOT NULL;
ALTER TABLE "clinical_notes" ALTER COLUMN "dueDate" DROP NOT NULL;
