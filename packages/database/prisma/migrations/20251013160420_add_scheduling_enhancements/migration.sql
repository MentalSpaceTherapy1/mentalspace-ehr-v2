-- CreateTable
CREATE TABLE "clinician_schedules" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "weeklyScheduleJson" JSONB NOT NULL,
    "acceptNewClients" BOOLEAN NOT NULL DEFAULT true,
    "maxAppointmentsPerDay" INTEGER,
    "maxAppointmentsPerWeek" INTEGER,
    "bufferTimeBetweenAppointments" INTEGER,
    "availableLocations" TEXT[],
    "effectiveStartDate" TIMESTAMP(3) NOT NULL,
    "effectiveEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "clinician_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedClinicianId" TEXT NOT NULL,
    "alternateClinicianIds" TEXT[],
    "requestedAppointmentType" TEXT NOT NULL,
    "preferredDays" TEXT[],
    "preferredTimes" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "addedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedDate" TIMESTAMP(3),
    "notificationMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "scheduledAppointmentId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_settings" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emailRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailReminderTimings" INTEGER[],
    "emailTemplate" TEXT,
    "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsReminderTimings" INTEGER[],
    "smsTemplate" TEXT,
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "includeRescheduleLink" BOOLEAN NOT NULL DEFAULT true,
    "includeCancelLink" BOOLEAN NOT NULL DEFAULT true,
    "includeTelehealthLink" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "category" TEXT,
    "defaultDuration" INTEGER,
    "defaultRate" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,

    CONSTRAINT "service_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_settings_clinicianId_key" ON "reminder_settings"("clinicianId");

-- CreateIndex
CREATE UNIQUE INDEX "service_codes_code_key" ON "service_codes"("code");
