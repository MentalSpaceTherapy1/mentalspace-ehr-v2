const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function createAllMissingTables() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');
    console.log('=== CREATING ALL 42 MISSING TABLES ===\n');

    let successCount = 0;
    let errorCount = 0;

    // 1. practice_settings
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "practice_settings" (
          "id" TEXT NOT NULL,
          "practiceName" TEXT NOT NULL,
          "address" TEXT,
          "city" TEXT,
          "state" TEXT,
          "zipCode" TEXT,
          "phone" TEXT,
          "email" TEXT,
          "website" TEXT,
          "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
          "fiscalYearStart" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "practice_settings_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ practice_settings created');
      successCount++;
    } catch (err) {
      console.log('✗ practice_settings failed:', err.message);
      errorCount++;
    }

    // 2. client_diagnoses
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "client_diagnoses" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "diagnosisCode" TEXT NOT NULL,
          "description" TEXT,
          "isPrimary" BOOLEAN NOT NULL DEFAULT false,
          "diagnosedDate" TIMESTAMP(3),
          "diagnosedBy" TEXT,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "client_diagnoses_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ client_diagnoses created');
      successCount++;
    } catch (err) {
      console.log('✗ client_diagnoses failed:', err.message);
      errorCount++;
    }

    // 3. session_ratings
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "session_ratings" (
          "id" TEXT NOT NULL,
          "appointmentId" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "rating" INTEGER NOT NULL,
          "feedback" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "session_ratings_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ session_ratings created');
      successCount++;
    } catch (err) {
      console.log('✗ session_ratings failed:', err.message);
      errorCount++;
    }

    // 4. waitlist_offers
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "waitlist_offers" (
          "id" TEXT NOT NULL,
          "waitlistEntryId" TEXT NOT NULL,
          "appointmentSlotStart" TIMESTAMP(3) NOT NULL,
          "appointmentSlotEnd" TIMESTAMP(3) NOT NULL,
          "providerId" TEXT NOT NULL,
          "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "respondedAt" TIMESTAMP(3),
          "declineReason" TEXT,
          CONSTRAINT "waitlist_offers_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ waitlist_offers created');
      successCount++;
    } catch (err) {
      console.log('✗ waitlist_offers failed:', err.message);
      errorCount++;
    }

    // 5. scheduling_rules
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "scheduling_rules" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "ruleType" TEXT NOT NULL,
          "priority" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "conditions" JSONB NOT NULL DEFAULT '{}',
          "actions" JSONB NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "scheduling_rules_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ scheduling_rules created');
      successCount++;
    } catch (err) {
      console.log('✗ scheduling_rules failed:', err.message);
      errorCount++;
    }

    // 6. outcome_measures
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "outcome_measures" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "measureType" TEXT NOT NULL,
          "measureDate" TIMESTAMP(3) NOT NULL,
          "score" DOUBLE PRECISION NOT NULL,
          "interpretation" TEXT,
          "administeredBy" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "outcome_measures_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ outcome_measures created');
      successCount++;
    } catch (err) {
      console.log('✗ outcome_measures failed:', err.message);
      errorCount++;
    }

    // 7. crisis_detection_logs
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "crisis_detection_logs" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "riskLevel" TEXT NOT NULL,
          "triggerSource" TEXT NOT NULL,
          "triggerContent" TEXT,
          "flaggedKeywords" TEXT[],
          "sentimentScore" DOUBLE PRECISION,
          "actionTaken" TEXT,
          "reviewedBy" TEXT,
          "reviewedAt" TIMESTAMP(3),
          "notes" TEXT,
          CONSTRAINT "crisis_detection_logs_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ crisis_detection_logs created');
      successCount++;
    } catch (err) {
      console.log('✗ crisis_detection_logs failed:', err.message);
      errorCount++;
    }

    // 8. symptom_logs
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "symptom_logs" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "symptomType" TEXT NOT NULL,
          "severity" INTEGER NOT NULL,
          "description" TEXT,
          "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "notes" TEXT,
          CONSTRAINT "symptom_logs_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ symptom_logs created');
      successCount++;
    } catch (err) {
      console.log('✗ symptom_logs failed:', err.message);
      errorCount++;
    }

    // 9. sleep_logs
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "sleep_logs" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "sleepDate" DATE NOT NULL,
          "bedtime" TIMESTAMP(3),
          "wakeTime" TIMESTAMP(3),
          "hoursSlept" DOUBLE PRECISION,
          "quality" INTEGER,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ sleep_logs created');
      successCount++;
    } catch (err) {
      console.log('✗ sleep_logs failed:', err.message);
      errorCount++;
    }

    // 10. exercise_logs
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "exercise_logs" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "exerciseDate" DATE NOT NULL,
          "exerciseType" TEXT NOT NULL,
          "durationMinutes" INTEGER,
          "intensity" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ exercise_logs created');
      successCount++;
    } catch (err) {
      console.log('✗ exercise_logs failed:', err.message);
      errorCount++;
    }

    // 11. guardian_relationships
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "guardian_relationships" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "guardianId" TEXT NOT NULL,
          "relationshipType" TEXT NOT NULL,
          "isPrimary" BOOLEAN NOT NULL DEFAULT false,
          "hasLegalAuthority" BOOLEAN NOT NULL DEFAULT false,
          "canAccessRecords" BOOLEAN NOT NULL DEFAULT false,
          "canMakeDecisions" BOOLEAN NOT NULL DEFAULT false,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "guardian_relationships_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ guardian_relationships created');
      successCount++;
    } catch (err) {
      console.log('✗ guardian_relationships failed:', err.message);
      errorCount++;
    }

    // 12. medication_adherence
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "medication_adherence" (
          "id" TEXT NOT NULL,
          "medicationId" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "scheduledDate" DATE NOT NULL,
          "scheduledTime" TEXT NOT NULL,
          "taken" BOOLEAN NOT NULL DEFAULT false,
          "takenAt" TIMESTAMP(3),
          "missedReason" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "medication_adherence_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ medication_adherence created');
      successCount++;
    } catch (err) {
      console.log('✗ medication_adherence failed:', err.message);
      errorCount++;
    }

    // 13. client_relationships
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "client_relationships" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "relatedClientId" TEXT NOT NULL,
          "relationshipType" TEXT NOT NULL,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "client_relationships_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ client_relationships created');
      successCount++;
    } catch (err) {
      console.log('✗ client_relationships failed:', err.message);
      errorCount++;
    }

    // 14. client_providers
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "client_providers" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "isPrimary" BOOLEAN NOT NULL DEFAULT false,
          "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "unassignedAt" TIMESTAMP(3),
          "notes" TEXT,
          CONSTRAINT "client_providers_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ client_providers created');
      successCount++;
    } catch (err) {
      console.log('✗ client_providers failed:', err.message);
      errorCount++;
    }

    // 15. prior_authorizations
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "prior_authorizations" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "insuranceId" TEXT NOT NULL,
          "authorizationNumber" TEXT NOT NULL,
          "serviceType" TEXT NOT NULL,
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "approvedUnits" INTEGER,
          "usedUnits" INTEGER NOT NULL DEFAULT 0,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "prior_authorizations_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ prior_authorizations created');
      successCount++;
    } catch (err) {
      console.log('✗ prior_authorizations failed:', err.message);
      errorCount++;
    }

    // 16. appointment_reminders
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "appointment_reminders" (
          "id" TEXT NOT NULL,
          "appointmentId" TEXT NOT NULL,
          "reminderType" TEXT NOT NULL,
          "scheduledFor" TIMESTAMP(3) NOT NULL,
          "sentAt" TIMESTAMP(3),
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "deliveryMethod" TEXT NOT NULL,
          "recipientContact" TEXT NOT NULL,
          "messageContent" TEXT,
          "errorMessage" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ appointment_reminders created');
      successCount++;
    } catch (err) {
      console.log('✗ appointment_reminders failed:', err.message);
      errorCount++;
    }

    // 17. reminder_configurations
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "reminder_configurations" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "reminderType" TEXT NOT NULL,
          "timeBeforeAppointment" INTEGER NOT NULL,
          "deliveryMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "messageTemplate" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "reminder_configurations_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ reminder_configurations created');
      successCount++;
    } catch (err) {
      console.log('✗ reminder_configurations failed:', err.message);
      errorCount++;
    }

    // 18. appointment_types
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "appointment_types" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "duration" INTEGER NOT NULL,
          "color" TEXT,
          "isTelehealthAvailable" BOOLEAN NOT NULL DEFAULT false,
          "requiresIntakeForm" BOOLEAN NOT NULL DEFAULT false,
          "allowOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ appointment_types created');
      successCount++;
    } catch (err) {
      console.log('✗ appointment_types failed:', err.message);
      errorCount++;
    }

    // 19. noshow_prediction_logs
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "noshow_prediction_logs" (
          "id" TEXT NOT NULL,
          "appointmentId" TEXT NOT NULL,
          "predictionScore" DOUBLE PRECISION NOT NULL,
          "riskLevel" TEXT NOT NULL,
          "factors" JSONB NOT NULL DEFAULT '{}',
          "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "actualOutcome" TEXT,
          CONSTRAINT "noshow_prediction_logs_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ noshow_prediction_logs created');
      successCount++;
    } catch (err) {
      console.log('✗ noshow_prediction_logs failed:', err.message);
      errorCount++;
    }

    // 20. provider_availability
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "provider_availability" (
          "id" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "dayOfWeek" INTEGER NOT NULL,
          "startTime" TEXT NOT NULL,
          "endTime" TEXT NOT NULL,
          "isRecurring" BOOLEAN NOT NULL DEFAULT true,
          "effectiveDate" DATE,
          "expirationDate" DATE,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "provider_availability_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ provider_availability created');
      successCount++;
    } catch (err) {
      console.log('✗ provider_availability failed:', err.message);
      errorCount++;
    }

    // 21. time_off_requests
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "time_off_requests" (
          "id" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "reason" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "reviewedBy" TEXT,
          "reviewedAt" TIMESTAMP(3),
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ time_off_requests created');
      successCount++;
    } catch (err) {
      console.log('✗ time_off_requests failed:', err.message);
      errorCount++;
    }

    // 22. scheduling_suggestions
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "scheduling_suggestions" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "suggestedSlotStart" TIMESTAMP(3) NOT NULL,
          "suggestedSlotEnd" TIMESTAMP(3) NOT NULL,
          "confidenceScore" DOUBLE PRECISION NOT NULL,
          "reasoningFactors" JSONB NOT NULL DEFAULT '{}',
          "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
          "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "acceptedAt" TIMESTAMP(3),
          "rejectedAt" TIMESTAMP(3),
          CONSTRAINT "scheduling_suggestions_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ scheduling_suggestions created');
      successCount++;
    } catch (err) {
      console.log('✗ scheduling_suggestions failed:', err.message);
      errorCount++;
    }

    // 23. provider_client_compatibility
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "provider_client_compatibility" (
          "id" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "compatibilityScore" DOUBLE PRECISION NOT NULL,
          "factors" JSONB NOT NULL DEFAULT '{}',
          "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "provider_client_compatibility_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ provider_client_compatibility created');
      successCount++;
    } catch (err) {
      console.log('✗ provider_client_compatibility failed:', err.message);
      errorCount++;
    }

    // 24. scheduling_patterns
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "scheduling_patterns" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "providerId" TEXT,
          "preferredDayOfWeek" INTEGER,
          "preferredTimeOfDay" TEXT,
          "averageFrequencyDays" INTEGER,
          "lastAppointmentDate" TIMESTAMP(3),
          "totalAppointments" INTEGER NOT NULL DEFAULT 0,
          "totalNoShows" INTEGER NOT NULL DEFAULT 0,
          "totalCancellations" INTEGER NOT NULL DEFAULT 0,
          "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "scheduling_patterns_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ scheduling_patterns created');
      successCount++;
    } catch (err) {
      console.log('✗ scheduling_patterns failed:', err.message);
      errorCount++;
    }

    // 25. nlp_scheduling_logs (NaturalLanguageSchedulingLog)
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "nlp_scheduling_logs" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "clientId" TEXT,
          "inputText" TEXT NOT NULL,
          "parsedIntent" TEXT NOT NULL,
          "extractedEntities" JSONB NOT NULL DEFAULT '{}',
          "confidenceScore" DOUBLE PRECISION NOT NULL,
          "suggestedAction" TEXT,
          "wasAccepted" BOOLEAN,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "nlp_scheduling_logs_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ nlp_scheduling_logs created');
      successCount++;
    } catch (err) {
      console.log('✗ nlp_scheduling_logs failed:', err.message);
      errorCount++;
    }

    // 26. policies
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "policies" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "content" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "version" TEXT NOT NULL,
          "effectiveDate" DATE NOT NULL,
          "expirationDate" DATE,
          "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdBy" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ policies created');
      successCount++;
    } catch (err) {
      console.log('✗ policies failed:', err.message);
      errorCount++;
    }

    // 27. policy_acknowledgments
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "policy_acknowledgments" (
          "id" TEXT NOT NULL,
          "policyId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          CONSTRAINT "policy_acknowledgments_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ policy_acknowledgments created');
      successCount++;
    } catch (err) {
      console.log('✗ policy_acknowledgments failed:', err.message);
      errorCount++;
    }

    // 28. incidents
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "incidents" (
          "id" TEXT NOT NULL,
          "incidentType" TEXT NOT NULL,
          "severity" TEXT NOT NULL,
          "reportedBy" TEXT NOT NULL,
          "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "incidentDate" TIMESTAMP(3) NOT NULL,
          "location" TEXT,
          "description" TEXT NOT NULL,
          "involvedParties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "witnessIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "status" TEXT NOT NULL DEFAULT 'REPORTED',
          "investigatedBy" TEXT,
          "investigationNotes" TEXT,
          "resolution" TEXT,
          "closedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ incidents created');
      successCount++;
    } catch (err) {
      console.log('✗ incidents failed:', err.message);
      errorCount++;
    }

    // 29. training_records
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "training_records" (
          "id" TEXT NOT NULL,
          "employeeId" TEXT NOT NULL,
          "courseId" TEXT NOT NULL,
          "completedAt" TIMESTAMP(3),
          "expiresAt" TIMESTAMP(3),
          "score" DOUBLE PRECISION,
          "certificateUrl" TEXT,
          "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ training_records created');
      successCount++;
    } catch (err) {
      console.log('✗ training_records failed:', err.message);
      errorCount++;
    }

    // 30. courses
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "courses" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "category" TEXT NOT NULL,
          "durationMinutes" INTEGER NOT NULL,
          "isRequired" BOOLEAN NOT NULL DEFAULT false,
          "validityPeriodDays" INTEGER,
          "contentUrl" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ courses created');
      successCount++;
    } catch (err) {
      console.log('✗ courses failed:', err.message);
      errorCount++;
    }

    // 31. vendors
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "vendors" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "contactName" TEXT,
          "email" TEXT,
          "phone" TEXT,
          "address" TEXT,
          "taxId" TEXT,
          "paymentTerms" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ vendors created');
      successCount++;
    } catch (err) {
      console.log('✗ vendors failed:', err.message);
      errorCount++;
    }

    // 32. budgets
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "budgets" (
          "id" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "fiscalYear" INTEGER NOT NULL,
          "allocatedAmount" DOUBLE PRECISION NOT NULL,
          "spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "description" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ budgets created');
      successCount++;
    } catch (err) {
      console.log('✗ budgets failed:', err.message);
      errorCount++;
    }

    // 33. expenses
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "expenses" (
          "id" TEXT NOT NULL,
          "budgetId" TEXT,
          "vendorId" TEXT,
          "category" TEXT NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "description" TEXT NOT NULL,
          "expenseDate" DATE NOT NULL,
          "receiptUrl" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "submittedBy" TEXT NOT NULL,
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ expenses created');
      successCount++;
    } catch (err) {
      console.log('✗ expenses failed:', err.message);
      errorCount++;
    }

    // 34. purchase_orders
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "purchase_orders" (
          "id" TEXT NOT NULL,
          "poNumber" TEXT NOT NULL,
          "vendorId" TEXT NOT NULL,
          "orderDate" DATE NOT NULL,
          "expectedDeliveryDate" DATE,
          "totalAmount" DOUBLE PRECISION NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "requestedBy" TEXT NOT NULL,
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP(3),
          "receivedAt" TIMESTAMP(3),
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ purchase_orders created');
      successCount++;
    } catch (err) {
      console.log('✗ purchase_orders failed:', err.message);
      errorCount++;
    }

    // 35. messages
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "messages" (
          "id" TEXT NOT NULL,
          "senderId" TEXT NOT NULL,
          "recipientId" TEXT,
          "channelId" TEXT,
          "parentMessageId" TEXT,
          "subject" TEXT,
          "body" TEXT NOT NULL,
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "readAt" TIMESTAMP(3),
          "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "priority" TEXT NOT NULL DEFAULT 'NORMAL',
          "isArchived" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ messages created');
      successCount++;
    } catch (err) {
      console.log('✗ messages failed:', err.message);
      errorCount++;
    }

    // 36. channels
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "channels" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "channelType" TEXT NOT NULL,
          "createdBy" TEXT NOT NULL,
          "isPrivate" BOOLEAN NOT NULL DEFAULT false,
          "isArchived" BOOLEAN NOT NULL DEFAULT false,
          "memberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ channels created');
      successCount++;
    } catch (err) {
      console.log('✗ channels failed:', err.message);
      errorCount++;
    }

    // 37. documents
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "documents" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "fileName" TEXT NOT NULL,
          "fileUrl" TEXT NOT NULL,
          "fileSize" INTEGER NOT NULL,
          "mimeType" TEXT NOT NULL,
          "folderId" TEXT,
          "uploadedBy" TEXT NOT NULL,
          "version" INTEGER NOT NULL DEFAULT 1,
          "isPublic" BOOLEAN NOT NULL DEFAULT false,
          "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ documents created');
      successCount++;
    } catch (err) {
      console.log('✗ documents failed:', err.message);
      errorCount++;
    }

    // 38. document_folders
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "document_folders" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "parentFolderId" TEXT,
          "createdBy" TEXT NOT NULL,
          "isPublic" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ document_folders created');
      successCount++;
    } catch (err) {
      console.log('✗ document_folders failed:', err.message);
      errorCount++;
    }

    // 39. performance_reviews
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "performance_reviews" (
          "id" TEXT NOT NULL,
          "employeeId" TEXT NOT NULL,
          "reviewerId" TEXT NOT NULL,
          "reviewPeriodStart" DATE NOT NULL,
          "reviewPeriodEnd" DATE NOT NULL,
          "overallRating" DOUBLE PRECISION,
          "strengths" TEXT,
          "areasForImprovement" TEXT,
          "goals" TEXT,
          "reviewerComments" TEXT,
          "employeeComments" TEXT,
          "status" TEXT NOT NULL DEFAULT 'DRAFT',
          "submittedAt" TIMESTAMP(3),
          "acknowledgedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ performance_reviews created');
      successCount++;
    } catch (err) {
      console.log('✗ performance_reviews failed:', err.message);
      errorCount++;
    }

    // 40. time_attendance
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "time_attendance" (
          "id" TEXT NOT NULL,
          "employeeId" TEXT NOT NULL,
          "clockIn" TIMESTAMP(3) NOT NULL,
          "clockOut" TIMESTAMP(3),
          "breakStart" TIMESTAMP(3),
          "breakEnd" TIMESTAMP(3),
          "totalHours" DOUBLE PRECISION,
          "status" TEXT NOT NULL DEFAULT 'CLOCKED_IN',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "time_attendance_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ time_attendance created');
      successCount++;
    } catch (err) {
      console.log('✗ time_attendance failed:', err.message);
      errorCount++;
    }

    // 41. pto_requests
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "pto_requests" (
          "id" TEXT NOT NULL,
          "employeeId" TEXT NOT NULL,
          "requestType" TEXT NOT NULL,
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "totalDays" DOUBLE PRECISION NOT NULL,
          "reason" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "reviewedBy" TEXT,
          "reviewedAt" TIMESTAMP(3),
          "reviewNotes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "pto_requests_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ pto_requests created');
      successCount++;
    } catch (err) {
      console.log('✗ pto_requests failed:', err.message);
      errorCount++;
    }

    // 42. pto_balances
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "pto_balances" (
          "id" TEXT NOT NULL,
          "employeeId" TEXT NOT NULL,
          "ptoType" TEXT NOT NULL,
          "totalAllocated" DOUBLE PRECISION NOT NULL,
          "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "available" DOUBLE PRECISION NOT NULL,
          "year" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "pto_balances_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ pto_balances created');
      successCount++;
    } catch (err) {
      console.log('✗ pto_balances failed:', err.message);
      errorCount++;
    }

    console.log('\n=== SUMMARY ===');
    console.log(`✅ Successfully created: ${successCount} tables`);
    console.log(`❌ Failed to create: ${errorCount} tables`);
    console.log(`\nTotal: ${successCount + errorCount} / 42 tables processed`);

  } catch (error) {
    console.error('\nFatal error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createAllMissingTables();
