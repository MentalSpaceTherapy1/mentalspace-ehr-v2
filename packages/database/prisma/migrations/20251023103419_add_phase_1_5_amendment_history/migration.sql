-- ========================================
-- PHASE 1.5: AMENDMENT HISTORY SYSTEM
-- ========================================

-- Add amendmentId to signature_events for linking amendment signatures
ALTER TABLE "signature_events" ADD COLUMN IF NOT EXISTS "amendmentId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "signature_events_amendmentId_key" ON "signature_events"("amendmentId");

-- Create note_amendments table
CREATE TABLE IF NOT EXISTS "note_amendments" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "amendmentNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "amendedBy" TEXT NOT NULL,
    "amendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fieldsChanged" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "changeSummary" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "newVersionId" TEXT,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,

    CONSTRAINT "note_amendments_pkey" PRIMARY KEY ("id")
);

-- Create indexes for note_amendments
CREATE INDEX IF NOT EXISTS "note_amendments_noteId_amendmentNumber_idx" ON "note_amendments"("noteId", "amendmentNumber");

-- Create note_versions table
CREATE TABLE IF NOT EXISTS "note_versions" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "noteData" JSONB NOT NULL,
    "versionType" TEXT NOT NULL,

    CONSTRAINT "note_versions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for note_versions
CREATE INDEX IF NOT EXISTS "note_versions_noteId_versionNumber_idx" ON "note_versions"("noteId", "versionNumber");

-- Add foreign key constraints
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_amendmentId_fkey"
    FOREIGN KEY ("amendmentId") REFERENCES "note_amendments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "note_amendments" ADD CONSTRAINT "note_amendments_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "note_amendments" ADD CONSTRAINT "note_amendments_amendedBy_fkey"
    FOREIGN KEY ("amendedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "note_amendments" ADD CONSTRAINT "note_amendments_previousVersionId_fkey"
    FOREIGN KEY ("previousVersionId") REFERENCES "note_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "note_amendments" ADD CONSTRAINT "note_amendments_newVersionId_fkey"
    FOREIGN KEY ("newVersionId") REFERENCES "note_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "note_amendments" IS 'Phase 1.5: Tracks amendments made to clinical notes after signing';
COMMENT ON TABLE "note_versions" IS 'Phase 1.5: Stores complete snapshots of clinical note content at each version';
COMMENT ON COLUMN "signature_events"."amendmentId" IS 'Phase 1.5: Links signature to an amendment if this is an amendment signature';
