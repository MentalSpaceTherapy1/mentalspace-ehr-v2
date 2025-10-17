-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'REQUESTED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approachesToTherapy" TEXT[],
ADD COLUMN     "education" TEXT[],
ADD COLUMN     "profileBio" TEXT,
ADD COLUMN     "profilePhotoS3" TEXT,
ADD COLUMN     "treatmentPhilosophy" TEXT,
ADD COLUMN     "yearsOfExperience" INTEGER;

-- CreateTable
CREATE TABLE "client_referrals" (
    "id" TEXT NOT NULL,
    "referredByClientId" TEXT NOT NULL,
    "referredPersonName" TEXT NOT NULL,
    "referredPersonEmail" TEXT,
    "referredPersonPhone" TEXT NOT NULL,
    "relationship" TEXT,
    "referralReason" TEXT,
    "additionalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "contactedDate" TIMESTAMP(3),
    "contactedBy" TEXT,
    "contactNotes" TEXT,
    "intakeScheduledDate" TIMESTAMP(3),
    "appointmentScheduled" BOOLEAN NOT NULL DEFAULT false,
    "convertedToClientId" TEXT,
    "convertedDate" TIMESTAMP(3),
    "incentiveEarned" BOOLEAN NOT NULL DEFAULT false,
    "incentiveAmount" DECIMAL(10,2),
    "incentiveAppliedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_referrals_referredByClientId_status_idx" ON "client_referrals"("referredByClientId", "status");

-- CreateIndex
CREATE INDEX "client_referrals_status_createdAt_idx" ON "client_referrals"("status", "createdAt");
