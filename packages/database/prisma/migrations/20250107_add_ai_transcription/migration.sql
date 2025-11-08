-- AlterTable
ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transcriptionConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transcriptionStartedAt" TIMESTAMP(3),
ADD COLUMN "transcriptionStoppedAt" TIMESTAMP(3),
ADD COLUMN "transcriptionStatus" TEXT,
ADD COLUMN "transcriptionJobId" TEXT,
ADD COLUMN "transcriptionError" TEXT;

-- CreateTable
CREATE TABLE "session_transcripts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "speakerLabel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "itemType" TEXT NOT NULL DEFAULT 'pronunciation',
    "vocabulary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_transcripts_sessionId_idx" ON "session_transcripts"("sessionId");

-- CreateIndex
CREATE INDEX "session_transcripts_sessionId_startTime_idx" ON "session_transcripts"("sessionId", "startTime");

-- AddForeignKey
ALTER TABLE "session_transcripts" ADD CONSTRAINT "session_transcripts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "telehealth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
