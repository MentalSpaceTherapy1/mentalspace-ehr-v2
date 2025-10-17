-- CreateTable
CREATE TABLE "telehealth_consents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "consentText" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "consentMethod" TEXT,
    "patientRightsAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "emergencyProtocolsUnderstood" BOOLEAN NOT NULL DEFAULT false,
    "privacyRisksAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "technologyRequirementsUnderstood" BOOLEAN NOT NULL DEFAULT false,
    "consentWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    "withdrawalDate" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "renewalRequired" BOOLEAN NOT NULL DEFAULT true,
    "renewalDate" TIMESTAMP(3),
    "clientSignature" TEXT,
    "clientIPAddress" TEXT,
    "clientUserAgent" TEXT,
    "witnessName" TEXT,
    "witnessSignature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "telehealth_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telehealth_consents_clientId_consentType_isActive_idx" ON "telehealth_consents"("clientId", "consentType", "isActive");

-- AddForeignKey
ALTER TABLE "telehealth_consents" ADD CONSTRAINT "telehealth_consents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
