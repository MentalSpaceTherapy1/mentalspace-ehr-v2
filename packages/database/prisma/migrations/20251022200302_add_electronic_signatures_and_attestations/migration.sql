-- AlterTable: Add signature authentication fields to User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signaturePin" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signaturePassword" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signatureBiometric" TEXT;

-- CreateTable: SignatureAttestation
CREATE TABLE IF NOT EXISTS "signature_attestations" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "payerId" TEXT,
    "attestationText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SignatureEvent
CREATE TABLE IF NOT EXISTS "signature_events" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureType" TEXT NOT NULL,
    "attestationId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL,
    "signatureData" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "signature_attestations_role_noteType_jurisdiction_isActive_idx" ON "signature_attestations"("role", "noteType", "jurisdiction", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "signature_events_noteId_signatureType_idx" ON "signature_events"("noteId", "signatureType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "signature_events_userId_idx" ON "signature_events"("userId");

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "signature_attestations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed Default Attestations
-- Georgia Clinician Attestation
INSERT INTO "signature_attestations" ("id", "role", "noteType", "jurisdiction", "attestationText", "effectiveDate", "createdBy", "updatedAt")
VALUES (
  gen_random_uuid(),
  'CLINICIAN',
  'ALL',
  'GA',
  E'I attest that:\n• I am a licensed mental health professional in good standing\n• I provided the services described on the date indicated\n• This documentation is accurate and complete to the best of my knowledge\n• I have reviewed and approve this clinical record\n• The client was informed of their rights and consented to treatment',
  CURRENT_TIMESTAMP,
  'SYSTEM',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Georgia Supervisor Attestation (Incident-to)
INSERT INTO "signature_attestations" ("id", "role", "noteType", "jurisdiction", "attestationText", "effectiveDate", "createdBy", "updatedAt")
VALUES (
  gen_random_uuid(),
  'SUPERVISOR',
  'ALL',
  'GA',
  E'I attest that:\n• I am the designated clinical supervisor for this provider\n• I was on-site or immediately available during service delivery\n• I have reviewed this note and the services provided meet professional standards\n• I accept clinical and billing responsibility for these services\n• This co-signature is provided within required timeframes per payer rules',
  CURRENT_TIMESTAMP,
  'SYSTEM',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Florida Clinician Attestation
INSERT INTO "signature_attestations" ("id", "role", "noteType", "jurisdiction", "attestationText", "effectiveDate", "createdBy", "updatedAt")
VALUES (
  gen_random_uuid(),
  'CLINICIAN',
  'ALL',
  'FL',
  E'I attest that:\n• I am a licensed mental health professional in good standing\n• I provided the services described on the date indicated\n• This documentation is accurate and complete to the best of my knowledge\n• I have reviewed and approve this clinical record\n• The client was informed of their rights and consented to treatment\n• I comply with all Florida Board requirements for clinical documentation',
  CURRENT_TIMESTAMP,
  'SYSTEM',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Generic Clinician Attestation (fallback)
INSERT INTO "signature_attestations" ("id", "role", "noteType", "jurisdiction", "attestationText", "effectiveDate", "createdBy", "updatedAt")
VALUES (
  gen_random_uuid(),
  'CLINICIAN',
  'ALL',
  'US',
  E'I attest that:\n• I provided the services described on the date indicated\n• This documentation is accurate and complete to the best of my knowledge\n• I have reviewed and approve this clinical record\n• The client consented to treatment and services',
  CURRENT_TIMESTAMP,
  'SYSTEM',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;
