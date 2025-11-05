-- CreateTable
CREATE TABLE "payers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payerType" TEXT NOT NULL,
    "requiresPreAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payer_rules" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "clinicianCredential" TEXT NOT NULL,
    "placeOfService" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "supervisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "cosignRequired" BOOLEAN NOT NULL DEFAULT false,
    "incidentToBillingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "renderingClinicianOverride" BOOLEAN NOT NULL DEFAULT false,
    "cosignTimeframeDays" INTEGER,
    "noteCompletionDays" INTEGER,
    "diagnosisRequired" BOOLEAN NOT NULL DEFAULT true,
    "treatmentPlanRequired" BOOLEAN NOT NULL DEFAULT true,
    "medicalNecessityRequired" BOOLEAN NOT NULL DEFAULT true,
    "priorAuthRequired" BOOLEAN NOT NULL DEFAULT false,
    "isProhibited" BOOLEAN NOT NULL DEFAULT false,
    "prohibitionReason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "payer_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_holds" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "holdReason" TEXT NOT NULL,
    "holdDetails" TEXT NOT NULL,
    "payerRuleId" TEXT,
    "holdPlacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "holdPlacedBy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_holds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payers_payerType_idx" ON "payers"("payerType");

-- CreateIndex
CREATE INDEX "payers_isActive_idx" ON "payers"("isActive");

-- CreateIndex
CREATE INDEX "payer_rules_payerId_idx" ON "payer_rules"("payerId");

-- CreateIndex
CREATE INDEX "payer_rules_clinicianCredential_idx" ON "payer_rules"("clinicianCredential");

-- CreateIndex
CREATE INDEX "payer_rules_serviceType_idx" ON "payer_rules"("serviceType");

-- CreateIndex
CREATE INDEX "payer_rules_isActive_idx" ON "payer_rules"("isActive");

-- CreateIndex
CREATE INDEX "payer_rules_effectiveDate_terminationDate_idx" ON "payer_rules"("effectiveDate", "terminationDate");

-- CreateIndex
CREATE INDEX "billing_holds_noteId_idx" ON "billing_holds"("noteId");

-- CreateIndex
CREATE INDEX "billing_holds_isActive_idx" ON "billing_holds"("isActive");

-- CreateIndex
CREATE INDEX "billing_holds_holdReason_idx" ON "billing_holds"("holdReason");

-- CreateIndex
CREATE INDEX "billing_holds_holdPlacedAt_idx" ON "billing_holds"("holdPlacedAt");

-- AddForeignKey
ALTER TABLE "payer_rules" ADD CONSTRAINT "payer_rules_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "payers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_holds" ADD CONSTRAINT "billing_holds_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_holds" ADD CONSTRAINT "billing_holds_payerRuleId_fkey" FOREIGN KEY ("payerRuleId") REFERENCES "payer_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
