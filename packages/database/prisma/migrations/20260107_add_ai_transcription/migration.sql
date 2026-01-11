-- AlterTable (idempotent - skip if columns exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionEnabled') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionConsent') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionConsent" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionStartedAt') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionStartedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionStoppedAt') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionStoppedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionStatus') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionStatus" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionJobId') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionJobId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'transcriptionError') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "transcriptionError" TEXT;
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "session_transcripts" (
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

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "session_transcripts_sessionId_idx" ON "session_transcripts"("sessionId");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "session_transcripts_sessionId_startTime_idx" ON "session_transcripts"("sessionId", "startTime");

-- AddForeignKey (idempotent)
ALTER TABLE "session_transcripts" DROP CONSTRAINT IF EXISTS "session_transcripts_sessionId_fkey";
ALTER TABLE "session_transcripts" ADD CONSTRAINT "session_transcripts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "telehealth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
