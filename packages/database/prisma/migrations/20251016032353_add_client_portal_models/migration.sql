-- CreateTable
CREATE TABLE "intake_forms" (
    "id" TEXT NOT NULL,
    "formName" TEXT NOT NULL,
    "formDescription" TEXT,
    "formType" TEXT NOT NULL,
    "formFieldsJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "assignedToNewClients" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "intake_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_form_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "responsesJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "submittedDate" TIMESTAMP(3),
    "reviewedDate" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewerNotes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_messages" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentByClient" BOOLEAN NOT NULL DEFAULT true,
    "sentBy" TEXT NOT NULL,
    "recipientId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readDate" TIMESTAMP(3),
    "threadId" TEXT,
    "parentMessageId" TEXT,
    "attachmentsJson" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "respondedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_refill_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "currentDosage" TEXT NOT NULL,
    "prescriberId" TEXT NOT NULL,
    "pharmacyName" TEXT,
    "pharmacyPhone" TEXT,
    "requestReason" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'Routine',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "statusDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusUpdatedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedDate" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "denialReason" TEXT,
    "approvedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedDosage" TEXT,
    "approvedQuantity" INTEGER,
    "refillsAuthorized" INTEGER,
    "prescriptionSentDate" TIMESTAMP(3),
    "prescriptionNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_refill_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portal_messages_clientId_createdAt_idx" ON "portal_messages"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "portal_messages_threadId_idx" ON "portal_messages"("threadId");

-- CreateIndex
CREATE INDEX "prescription_refill_requests_clientId_status_idx" ON "prescription_refill_requests"("clientId", "status");

-- AddForeignKey
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "intake_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
