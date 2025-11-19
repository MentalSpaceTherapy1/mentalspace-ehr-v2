-- AlterTable: Make draft-related fields nullable for Progress Note drafts
ALTER TABLE "ClinicalNote" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "ClinicalNote" ALTER COLUMN "sessionDate" DROP NOT NULL;
ALTER TABLE "ClinicalNote" ALTER COLUMN "dueDate" DROP NOT NULL;
