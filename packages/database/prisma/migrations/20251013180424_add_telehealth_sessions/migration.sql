-- CreateEnum
CREATE TYPE "TelehealthSessionStatus" AS ENUM ('SCHEDULED', 'WAITING_ROOM', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "telehealth_sessions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "chimeMeetingId" TEXT NOT NULL,
    "chimeExternalMeetingId" TEXT,
    "chimeMeetingRegion" TEXT,
    "clinicianJoinUrl" TEXT NOT NULL,
    "clientJoinUrl" TEXT NOT NULL,
    "meetingDataJson" JSONB NOT NULL,
    "status" "TelehealthSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "statusUpdatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientInWaitingRoom" BOOLEAN NOT NULL DEFAULT false,
    "waitingRoomEnteredAt" TIMESTAMP(3),
    "sessionStartedAt" TIMESTAMP(3),
    "sessionEndedAt" TIMESTAMP(3),
    "clinicianAttendeeId" TEXT,
    "clientAttendeeId" TEXT,
    "attendeeDataJson" JSONB,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
    "recordingStartedAt" TIMESTAMP(3),
    "recordingStoppedAt" TIMESTAMP(3),
    "recordingS3Key" TEXT,
    "recordingUrl" TEXT,
    "actualDuration" INTEGER,
    "endReason" TEXT,
    "technicalIssues" TEXT,
    "hipaaAuditLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "telehealth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_sessions_appointmentId_key" ON "telehealth_sessions"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_sessions_chimeMeetingId_key" ON "telehealth_sessions"("chimeMeetingId");
