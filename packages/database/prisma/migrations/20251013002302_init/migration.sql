-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF', 'FRONT_DESK', 'ASSOCIATE');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCHARGED', 'DECEASED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'SIGNED', 'LOCKED', 'PENDING_COSIGN', 'COSIGNED');

-- CreateEnum
CREATE TYPE "PortalAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING_VERIFICATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "suffix" TEXT,
    "preferredName" TEXT,
    "role" "UserRole" NOT NULL,
    "title" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "licenseExpiration" TIMESTAMP(3) NOT NULL,
    "npiNumber" TEXT,
    "deaNumber" TEXT,
    "taxonomyCode" TEXT,
    "credentials" TEXT[],
    "specialties" TEXT[],
    "languagesSpoken" TEXT[],
    "isUnderSupervision" BOOLEAN NOT NULL DEFAULT false,
    "supervisorId" TEXT,
    "supervisionStartDate" TIMESTAMP(3),
    "supervisionEndDate" TIMESTAMP(3),
    "requiredSupervisionHours" INTEGER,
    "completedSupervisionHours" DOUBLE PRECISION,
    "isSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "supervisionLicenses" TEXT[],
    "phoneNumber" TEXT NOT NULL,
    "officeExtension" TEXT,
    "personalEmail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "defaultOfficeLocation" TEXT,
    "availableForScheduling" BOOLEAN NOT NULL DEFAULT true,
    "acceptsNewClients" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "noteReminders" BOOLEAN NOT NULL DEFAULT true,
    "supervisoryAlerts" BOOLEAN NOT NULL DEFAULT true,
    "defaultRate" DECIMAL(10,2),
    "hourlyPayrollRate" DECIMAL(10,2),
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginDate" TIMESTAMP(3),
    "digitalSignature" TEXT,
    "signatureDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "medicalRecordNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "suffix" TEXT,
    "previousNames" TEXT[],
    "preferredName" TEXT,
    "pronouns" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "primaryPhoneType" TEXT NOT NULL DEFAULT 'Mobile',
    "secondaryPhone" TEXT,
    "secondaryPhoneType" TEXT,
    "email" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'Phone',
    "okayToLeaveMessage" BOOLEAN NOT NULL DEFAULT true,
    "addressStreet1" TEXT NOT NULL,
    "addressStreet2" TEXT,
    "addressCity" TEXT NOT NULL,
    "addressState" TEXT NOT NULL,
    "addressZipCode" TEXT NOT NULL,
    "addressCounty" TEXT,
    "isTemporaryAddress" BOOLEAN NOT NULL DEFAULT false,
    "temporaryUntil" TIMESTAMP(3),
    "mailingStreet1" TEXT,
    "mailingStreet2" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZipCode" TEXT,
    "gender" "Gender" NOT NULL,
    "genderIdentity" TEXT,
    "sexAssignedAtBirth" TEXT,
    "sexualOrientation" TEXT,
    "maritalStatus" TEXT NOT NULL,
    "race" TEXT[],
    "ethnicity" TEXT,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'English',
    "otherLanguages" TEXT[],
    "needsInterpreter" BOOLEAN NOT NULL DEFAULT false,
    "interpreterLanguage" TEXT,
    "religion" TEXT,
    "education" TEXT,
    "employmentStatus" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "livingArrangement" TEXT,
    "housingStatus" TEXT,
    "isVeteran" BOOLEAN NOT NULL DEFAULT false,
    "militaryBranch" TEXT,
    "militaryDischargeType" TEXT,
    "legalStatus" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianRelationship" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "dischargeReason" TEXT,
    "deceasedDate" TIMESTAMP(3),
    "primaryTherapistId" TEXT NOT NULL,
    "psychiatristId" TEXT,
    "caseManagerId" TEXT,
    "treatmentConsent" BOOLEAN NOT NULL DEFAULT false,
    "treatmentConsentDate" TIMESTAMP(3),
    "hipaaAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
    "hipaaAcknowledgmentDate" TIMESTAMP(3),
    "releaseOfInformation" BOOLEAN NOT NULL DEFAULT false,
    "releaseOfInformationDate" TIMESTAMP(3),
    "electronicCommunication" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "photographyConsent" BOOLEAN NOT NULL DEFAULT false,
    "specialNeeds" TEXT,
    "accessibilityNeeds" TEXT[],
    "allergyAlerts" TEXT[],
    "previousMRN" TEXT,
    "previousSystemName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "okayToDiscussHealth" BOOLEAN NOT NULL DEFAULT false,
    "okayToLeaveMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_information" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "insuranceCompany" TEXT NOT NULL,
    "insuranceCompanyId" TEXT,
    "planName" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupNumber" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "subscriberIsClient" BOOLEAN NOT NULL DEFAULT true,
    "subscriberFirstName" TEXT,
    "subscriberLastName" TEXT,
    "subscriberDOB" TIMESTAMP(3),
    "subscriberSSN" TEXT,
    "relationshipToSubscriber" TEXT,
    "subscriberEmployer" TEXT,
    "customerServicePhone" TEXT,
    "precertificationPhone" TEXT,
    "providerPhone" TEXT,
    "requiresReferral" BOOLEAN NOT NULL DEFAULT false,
    "requiresPriorAuth" BOOLEAN NOT NULL DEFAULT false,
    "mentalHealthCoverage" BOOLEAN NOT NULL DEFAULT true,
    "copay" DECIMAL(10,2),
    "coinsurance" INTEGER,
    "deductible" DECIMAL(10,2),
    "deductibleMet" DECIMAL(10,2),
    "outOfPocketMax" DECIMAL(10,2),
    "outOfPocketMet" DECIMAL(10,2),
    "lastVerificationDate" TIMESTAMP(3),
    "lastVerifiedBy" TEXT,
    "verificationNotes" TEXT,
    "remainingSessions" INTEGER,
    "frontCardImage" TEXT,
    "backCardImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "appointmentType" TEXT NOT NULL,
    "serviceLocation" TEXT NOT NULL,
    "officeLocationId" TEXT,
    "room" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "statusUpdatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusUpdatedBy" TEXT NOT NULL,
    "cancellationDate" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationNotes" TEXT,
    "cancelledBy" TEXT,
    "cancellationFeeApplied" BOOLEAN NOT NULL DEFAULT false,
    "noShowDate" TIMESTAMP(3),
    "noShowFeeApplied" BOOLEAN NOT NULL DEFAULT false,
    "noShowNotes" TEXT,
    "checkedInTime" TEXT,
    "checkedInBy" TEXT,
    "checkedOutTime" TEXT,
    "checkedOutBy" TEXT,
    "actualDuration" INTEGER,
    "cptCode" TEXT,
    "icdCodes" TEXT[],
    "chargeAmount" DECIMAL(10,2),
    "billingStatus" TEXT NOT NULL DEFAULT 'Not Billed',
    "emailReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "emailReminderDate" TIMESTAMP(3),
    "smsReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "smsReminderDate" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" TEXT,
    "recurrenceInterval" INTEGER,
    "recurrenceDaysOfWeek" TEXT[],
    "recurrenceEndDate" TIMESTAMP(3),
    "parentRecurrenceId" TEXT,
    "appointmentNotes" TEXT,
    "clientNotes" TEXT,
    "telehealthLink" TEXT,
    "telehealthPlatform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "noteType" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionStartTime" TEXT,
    "sessionEndTime" TEXT,
    "sessionDuration" INTEGER,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "suicidalIdeation" BOOLEAN NOT NULL DEFAULT false,
    "suicidalPlan" BOOLEAN NOT NULL DEFAULT false,
    "homicidalIdeation" BOOLEAN NOT NULL DEFAULT false,
    "selfHarm" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT,
    "riskAssessmentDetails" TEXT,
    "interventionsTaken" TEXT,
    "diagnosisCodes" TEXT[],
    "interventionsUsed" TEXT[],
    "progressTowardGoals" TEXT,
    "nextSessionPlan" TEXT,
    "nextSessionDate" TIMESTAMP(3),
    "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT',
    "signedDate" TIMESTAMP(3),
    "signedBy" TEXT,
    "lockedDate" TIMESTAMP(3),
    "lockReason" TEXT,
    "requiresCosign" BOOLEAN NOT NULL DEFAULT false,
    "cosignedDate" TIMESTAMP(3),
    "cosignedBy" TEXT,
    "supervisorComments" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedOnTime" BOOLEAN NOT NULL DEFAULT false,
    "daysToComplete" INTEGER,
    "cptCode" TEXT,
    "billingCode" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT,
    "aiPrompt" TEXT,
    "inputTranscript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "presentingProblems" TEXT[],
    "goalsJson" JSONB NOT NULL,
    "interventions" TEXT[],
    "frequency" TEXT NOT NULL,
    "estimatedDuration" TEXT NOT NULL,
    "dischargeCriteria" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "clinicianSignature" TEXT,
    "clinicianSignDate" TIMESTAMP(3),
    "clientSignature" TEXT,
    "clientSignDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "icdCode" TEXT NOT NULL,
    "diagnosisDescription" TEXT NOT NULL,
    "diagnosisType" TEXT NOT NULL DEFAULT 'Primary',
    "onsetDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "diagnosedBy" TEXT NOT NULL,
    "diagnosisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "prescribedBy" TEXT NOT NULL,
    "prescribedDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "discontinuedDate" TIMESTAMP(3),
    "discontinuedReason" TEXT,
    "instructions" TEXT,
    "sideEffects" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_sessions" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "superviseeId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionStartTime" TEXT NOT NULL,
    "sessionEndTime" TEXT NOT NULL,
    "sessionDuration" INTEGER NOT NULL,
    "sessionType" TEXT NOT NULL,
    "sessionFormat" TEXT NOT NULL,
    "casesDiscussedJson" JSONB NOT NULL,
    "topicsCovered" TEXT[],
    "skillsDeveloped" TEXT[],
    "feedbackProvided" TEXT NOT NULL,
    "areasOfStrength" TEXT[],
    "areasForImprovement" TEXT[],
    "actionItemsJson" JSONB NOT NULL,
    "nextSessionScheduled" BOOLEAN NOT NULL DEFAULT false,
    "nextSessionDate" TIMESTAMP(3),
    "hoursEarned" DOUBLE PRECISION NOT NULL,
    "hourType" TEXT NOT NULL,
    "supervisorSignature" TEXT NOT NULL,
    "supervisorSignDate" TIMESTAMP(3) NOT NULL,
    "superviseeSignature" TEXT NOT NULL,
    "superviseeSignDate" TIMESTAMP(3) NOT NULL,
    "superviseeReflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_hours_log" (
    "id" TEXT NOT NULL,
    "superviseeId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "hourDate" TIMESTAMP(3) NOT NULL,
    "hourType" TEXT NOT NULL,
    "hoursEarned" DOUBLE PRECISION NOT NULL,
    "sessionDescription" TEXT NOT NULL,
    "topicsCovered" TEXT[],
    "verifiedBySupervisor" BOOLEAN NOT NULL DEFAULT false,
    "supervisorVerificationDate" TIMESTAMP(3),
    "supervisorSignature" TEXT,
    "appliesTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "supervision_hours_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_accounts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" TEXT,
    "accountStatus" "PortalAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "lastLoginDate" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "accountLockedUntil" TIMESTAMP(3),
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "billingReminders" BOOLEAN NOT NULL DEFAULT true,
    "messageNotifications" BOOLEAN NOT NULL DEFAULT true,
    "portalAccessGranted" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "grantedDate" TIMESTAMP(3),
    "isGuardianAccount" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "supervisingProviderId" TEXT,
    "cptCode" TEXT NOT NULL,
    "cptDescription" TEXT NOT NULL,
    "modifiers" TEXT[],
    "units" INTEGER NOT NULL DEFAULT 1,
    "diagnosisCodesJson" JSONB NOT NULL,
    "placeOfService" TEXT NOT NULL,
    "locationId" TEXT,
    "chargeAmount" DECIMAL(10,2) NOT NULL,
    "allowedAmount" DECIMAL(10,2),
    "adjustmentAmount" DECIMAL(10,2),
    "paymentAmount" DECIMAL(10,2),
    "clientResponsibility" DECIMAL(10,2),
    "primaryInsuranceId" TEXT,
    "secondaryInsuranceId" TEXT,
    "chargeStatus" TEXT NOT NULL DEFAULT 'Unbilled',
    "claimId" TEXT,
    "claimStatus" TEXT,
    "billedDate" TIMESTAMP(3),
    "denialCode" TEXT,
    "denialReason" TEXT,
    "appealFiled" BOOLEAN NOT NULL DEFAULT false,
    "appealDate" TIMESTAMP(3),
    "writeOffAmount" DECIMAL(10,2),
    "writeOffReason" TEXT,
    "writeOffDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "charge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentAmount" DECIMAL(10,2) NOT NULL,
    "paymentSource" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "checkNumber" TEXT,
    "cardLast4" TEXT,
    "transactionId" TEXT,
    "appliedPaymentsJson" JSONB NOT NULL,
    "eobDate" TIMESTAMP(3),
    "eobAttachment" TEXT,
    "claimNumber" TEXT,
    "adjustmentsJson" JSONB,
    "overpaymentAmount" DECIMAL(10,2),
    "refundIssued" BOOLEAN NOT NULL DEFAULT false,
    "refundDate" TIMESTAMP(3),
    "refundAmount" DECIMAL(10,2),
    "unappliedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Posted',
    "postedBy" TEXT NOT NULL,
    "postedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_statements" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "previousBalance" DECIMAL(10,2) NOT NULL,
    "currentCharges" DECIMAL(10,2) NOT NULL,
    "payments" DECIMAL(10,2) NOT NULL,
    "adjustments" DECIMAL(10,2) NOT NULL,
    "currentBalance" DECIMAL(10,2) NOT NULL,
    "aging0to30" DECIMAL(10,2) NOT NULL,
    "aging31to60" DECIMAL(10,2) NOT NULL,
    "aging61to90" DECIMAL(10,2) NOT NULL,
    "aging91to120" DECIMAL(10,2) NOT NULL,
    "aging120Plus" DECIMAL(10,2) NOT NULL,
    "statementMessage" TEXT,
    "dueDate" TIMESTAMP(3),
    "statementStatus" TEXT NOT NULL DEFAULT 'Generated',
    "sentDate" TIMESTAMP(3),
    "sentMethod" TEXT,
    "viewedInPortal" BOOLEAN NOT NULL DEFAULT false,
    "viewedDate" TIMESTAMP(3),
    "inCollections" BOOLEAN NOT NULL DEFAULT false,
    "collectionDate" TIMESTAMP(3),
    "collectionAgency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentCategory" TEXT,
    "documentDescription" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedMethod" TEXT NOT NULL,
    "documentSource" TEXT NOT NULL,
    "externalProvider" TEXT,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "signaturesJson" JSONB,
    "sharedWithClient" BOOLEAN NOT NULL DEFAULT false,
    "sharedViaPortal" BOOLEAN NOT NULL DEFAULT false,
    "sharedDate" TIMESTAMP(3),
    "clientViewedDate" TIMESTAMP(3),
    "isEmbeddedForm" BOOLEAN NOT NULL DEFAULT false,
    "formResponsesJson" JSONB,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "latestVersion" BOOLEAN NOT NULL DEFAULT true,
    "ocrProcessed" BOOLEAN NOT NULL DEFAULT false,
    "extractedText" TEXT,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_medicalRecordNumber_key" ON "clients"("medicalRecordNumber");

-- CreateIndex
CREATE UNIQUE INDEX "portal_accounts_clientId_key" ON "portal_accounts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "portal_accounts_email_key" ON "portal_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_primaryTherapistId_fkey" FOREIGN KEY ("primaryTherapistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_information" ADD CONSTRAINT "insurance_information_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_cosignedBy_fkey" FOREIGN KEY ("cosignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_sessions" ADD CONSTRAINT "supervision_sessions_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_sessions" ADD CONSTRAINT "supervision_sessions_superviseeId_fkey" FOREIGN KEY ("superviseeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_hours_log" ADD CONSTRAINT "supervision_hours_log_superviseeId_fkey" FOREIGN KEY ("superviseeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_entries" ADD CONSTRAINT "charge_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_statements" ADD CONSTRAINT "client_statements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
