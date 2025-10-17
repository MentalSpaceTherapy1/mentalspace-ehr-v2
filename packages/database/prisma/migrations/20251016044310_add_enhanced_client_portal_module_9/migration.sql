-- CreateTable
CREATE TABLE "insurance_cards" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "insuranceType" TEXT NOT NULL,
    "frontImageS3Key" TEXT NOT NULL,
    "backImageS3Key" TEXT NOT NULL,
    "insuranceName" TEXT,
    "policyNumber" TEXT,
    "groupNumber" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "cardExpMonth" INTEGER NOT NULL,
    "cardExpYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_assignments" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "submissionId" TEXT,

    CONSTRAINT "form_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signedBy" TEXT NOT NULL,
    "signatureImageS3" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "signatureType" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_documents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentS3Key" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shared_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_reviews" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "categories" JSONB,
    "isSharedWithClinician" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "clinicianViewed" BOOLEAN NOT NULL DEFAULT false,
    "clinicianViewedAt" TIMESTAMP(3),
    "clinicianResponse" TEXT,
    "clinicianRespondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_change_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "currentClinicianId" TEXT NOT NULL,
    "requestReason" TEXT NOT NULL,
    "reasonDetails" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "newClinicianId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "transferCompletedAt" TIMESTAMP(3),
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "moodScore" INTEGER NOT NULL,
    "symptoms" TEXT[],
    "customMetrics" JSONB,
    "notes" TEXT,
    "sharedWithClinician" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mood_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_definitions" (
    "id" TEXT NOT NULL,
    "symptomName" TEXT NOT NULL,
    "symptomType" TEXT NOT NULL,
    "createdBy" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_symptom_trackers" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "symptomId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_symptom_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_prompts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "promptType" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_responses" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "imageS3Key" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_streaks" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCheckInDate" TIMESTAMP(3),
    "totalCheckIns" INTEGER NOT NULL DEFAULT 0,
    "milestonesAchieved" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "milestoneType" TEXT NOT NULL,
    "milestoneValue" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "badgeName" TEXT NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_session_preps" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "topicsToDiscuss" TEXT,
    "recentFeelings" TEXT,
    "homeworkStatus" TEXT,
    "urgentConcerns" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedByClinician" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "pre_session_preps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentUrl" TEXT,
    "contentS3Key" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "createdBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_assignments" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'OPTIONAL',
    "therapistNotes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "clientRating" INTEGER,
    "clientFeedback" TEXT,

    CONSTRAINT "resource_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_toolkits" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "enabledTools" TEXT[],
    "safetyPlanS3Key" TEXT,
    "customInstructions" TEXT,
    "emergencyContacts" JSONB NOT NULL,
    "lastUpdatedBy" TEXT NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crisis_toolkits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_toolkit_usage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "toolkitId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toolUsed" TEXT,
    "durationSeconds" INTEGER,

    CONSTRAINT "crisis_toolkit_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_messages" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "audioS3Key" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_play_logs" (
    "id" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationPlayed" INTEGER NOT NULL,
    "completedFully" BOOLEAN NOT NULL DEFAULT false,
    "helpfulRating" INTEGER,

    CONSTRAINT "audio_play_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_assignments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "homeworkType" TEXT NOT NULL,
    "instructions" TEXT,
    "attachmentS3Keys" TEXT[],
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "completionNotes" TEXT,
    "completionAttachments" TEXT[],
    "therapistFeedback" TEXT,

    CONSTRAINT "homework_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapeutic_goals" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "goalTitle" TEXT NOT NULL,
    "goalDescription" TEXT,
    "goalCategory" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "achievedAt" TIMESTAMP(3),

    CONSTRAINT "therapeutic_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_goals" (
    "id" TEXT NOT NULL,
    "parentGoalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_progress_updates" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL,
    "updateNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "win_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "winText" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "imageS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "win_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "win_comments" (
    "id" TEXT NOT NULL,
    "winId" TEXT NOT NULL,
    "commentedBy" TEXT NOT NULL,
    "commentText" TEXT NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "win_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coping_skill_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillCategory" TEXT NOT NULL,
    "feelingBefore" INTEGER NOT NULL,
    "feelingAfter" INTEGER NOT NULL,
    "effectiveness" INTEGER NOT NULL,
    "reflection" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coping_skill_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_check_ins" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "sentAt" TIMESTAMP(3),
    "responseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_nudges" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nudgeType" TEXT NOT NULL,
    "nudgeText" TEXT NOT NULL,
    "triggerRule" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_nudges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudge_deliveries" (
    "id" TEXT NOT NULL,
    "nudgeId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasActioned" BOOLEAN NOT NULL DEFAULT false,
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "nudge_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_content" (
    "id" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "categories" TEXT[],
    "createdBy" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "micro_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_content_deliveries" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "helpfulRating" INTEGER,

    CONSTRAINT "micro_content_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "entryText" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSharedWithClinician" BOOLEAN NOT NULL DEFAULT false,
    "aiPromptsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceToText" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_journal_prompts" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasAnswered" BOOLEAN NOT NULL DEFAULT false,
    "answerText" TEXT,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "ai_journal_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_comments" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "commentedBy" TEXT NOT NULL,
    "commentText" TEXT NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_memos" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "audioS3Key" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "transcription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_summaries" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "keyPoints" TEXT[],
    "homeworkAssigned" TEXT,
    "goalsDiscussed" TEXT[],
    "isSharedWithClient" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" TIMESTAMP(3),
    "pdfS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insurance_cards_clientId_isActive_idx" ON "insurance_cards"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripePaymentMethodId_key" ON "payment_methods"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "payment_methods_clientId_isDefault_idx" ON "payment_methods"("clientId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "form_assignments_submissionId_key" ON "form_assignments"("submissionId");

-- CreateIndex
CREATE INDEX "form_assignments_clientId_status_idx" ON "form_assignments"("clientId", "status");

-- CreateIndex
CREATE INDEX "document_signatures_documentId_signedBy_idx" ON "document_signatures"("documentId", "signedBy");

-- CreateIndex
CREATE INDEX "shared_documents_clientId_isActive_idx" ON "shared_documents"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "session_reviews_appointmentId_key" ON "session_reviews"("appointmentId");

-- CreateIndex
CREATE INDEX "session_reviews_clinicianId_isSharedWithClinician_idx" ON "session_reviews"("clinicianId", "isSharedWithClinician");

-- CreateIndex
CREATE INDEX "session_reviews_clientId_createdAt_idx" ON "session_reviews"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "therapist_change_requests_clientId_status_idx" ON "therapist_change_requests"("clientId", "status");

-- CreateIndex
CREATE INDEX "therapist_change_requests_status_reviewedAt_idx" ON "therapist_change_requests"("status", "reviewedAt");

-- CreateIndex
CREATE INDEX "mood_entries_clientId_entryDate_idx" ON "mood_entries"("clientId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "client_symptom_trackers_clientId_symptomId_key" ON "client_symptom_trackers"("clientId", "symptomId");

-- CreateIndex
CREATE INDEX "daily_prompts_clientId_isActive_startDate_idx" ON "daily_prompts"("clientId", "isActive", "startDate");

-- CreateIndex
CREATE INDEX "prompt_responses_clientId_respondedAt_idx" ON "prompt_responses"("clientId", "respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_streaks_clientId_key" ON "engagement_streaks"("clientId");

-- CreateIndex
CREATE INDEX "milestones_clientId_achievedAt_idx" ON "milestones"("clientId", "achievedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pre_session_preps_appointmentId_key" ON "pre_session_preps"("appointmentId");

-- CreateIndex
CREATE INDEX "pre_session_preps_clientId_submittedAt_idx" ON "pre_session_preps"("clientId", "submittedAt");

-- CreateIndex
CREATE INDEX "resource_assignments_clientId_assignedAt_idx" ON "resource_assignments"("clientId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crisis_toolkits_clientId_key" ON "crisis_toolkits"("clientId");

-- CreateIndex
CREATE INDEX "crisis_toolkit_usage_clientId_accessedAt_idx" ON "crisis_toolkit_usage"("clientId", "accessedAt");

-- CreateIndex
CREATE INDEX "audio_play_logs_clientId_playedAt_idx" ON "audio_play_logs"("clientId", "playedAt");

-- CreateIndex
CREATE INDEX "homework_assignments_clientId_status_dueDate_idx" ON "homework_assignments"("clientId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "therapeutic_goals_clientId_status_idx" ON "therapeutic_goals"("clientId", "status");

-- CreateIndex
CREATE INDEX "goal_progress_updates_goalId_updatedAt_idx" ON "goal_progress_updates"("goalId", "updatedAt");

-- CreateIndex
CREATE INDEX "win_entries_clientId_createdAt_idx" ON "win_entries"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "win_comments_winId_commentedAt_idx" ON "win_comments"("winId", "commentedAt");

-- CreateIndex
CREATE INDEX "coping_skill_logs_clientId_usedAt_idx" ON "coping_skill_logs"("clientId", "usedAt");

-- CreateIndex
CREATE INDEX "coping_skill_logs_clientId_skillName_idx" ON "coping_skill_logs"("clientId", "skillName");

-- CreateIndex
CREATE INDEX "scheduled_check_ins_clientId_scheduledFor_idx" ON "scheduled_check_ins"("clientId", "scheduledFor");

-- CreateIndex
CREATE INDEX "nudge_deliveries_nudgeId_sentAt_idx" ON "nudge_deliveries"("nudgeId", "sentAt");

-- CreateIndex
CREATE INDEX "micro_content_deliveries_clientId_deliveredAt_idx" ON "micro_content_deliveries"("clientId", "deliveredAt");

-- CreateIndex
CREATE INDEX "journal_entries_clientId_entryDate_idx" ON "journal_entries"("clientId", "entryDate");

-- CreateIndex
CREATE INDEX "voice_memos_messageId_idx" ON "voice_memos"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "session_summaries_appointmentId_key" ON "session_summaries"("appointmentId");

-- CreateIndex
CREATE INDEX "session_summaries_clientId_sharedAt_idx" ON "session_summaries"("clientId", "sharedAt");

-- AddForeignKey
ALTER TABLE "insurance_cards" ADD CONSTRAINT "insurance_cards_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_formId_fkey" FOREIGN KEY ("formId") REFERENCES "intake_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "intake_form_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reviews" ADD CONSTRAINT "session_reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reviews" ADD CONSTRAINT "session_reviews_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reviews" ADD CONSTRAINT "session_reviews_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_change_requests" ADD CONSTRAINT "therapist_change_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_change_requests" ADD CONSTRAINT "therapist_change_requests_currentClinicianId_fkey" FOREIGN KEY ("currentClinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_change_requests" ADD CONSTRAINT "therapist_change_requests_newClinicianId_fkey" FOREIGN KEY ("newClinicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_symptom_trackers" ADD CONSTRAINT "client_symptom_trackers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_prompts" ADD CONSTRAINT "daily_prompts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_prompts" ADD CONSTRAINT "daily_prompts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_responses" ADD CONSTRAINT "prompt_responses_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "daily_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_responses" ADD CONSTRAINT "prompt_responses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_streaks" ADD CONSTRAINT "engagement_streaks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_session_preps" ADD CONSTRAINT "pre_session_preps_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_session_preps" ADD CONSTRAINT "pre_session_preps_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_toolkits" ADD CONSTRAINT "crisis_toolkits_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_toolkits" ADD CONSTRAINT "crisis_toolkits_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_toolkit_usage" ADD CONSTRAINT "crisis_toolkit_usage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_toolkit_usage" ADD CONSTRAINT "crisis_toolkit_usage_toolkitId_fkey" FOREIGN KEY ("toolkitId") REFERENCES "crisis_toolkits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_messages" ADD CONSTRAINT "audio_messages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_messages" ADD CONSTRAINT "audio_messages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_play_logs" ADD CONSTRAINT "audio_play_logs_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "audio_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_play_logs" ADD CONSTRAINT "audio_play_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapeutic_goals" ADD CONSTRAINT "therapeutic_goals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapeutic_goals" ADD CONSTRAINT "therapeutic_goals_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_goals" ADD CONSTRAINT "sub_goals_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "therapeutic_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "therapeutic_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "win_entries" ADD CONSTRAINT "win_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "win_comments" ADD CONSTRAINT "win_comments_winId_fkey" FOREIGN KEY ("winId") REFERENCES "win_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "win_comments" ADD CONSTRAINT "win_comments_commentedBy_fkey" FOREIGN KEY ("commentedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coping_skill_logs" ADD CONSTRAINT "coping_skill_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_check_ins" ADD CONSTRAINT "scheduled_check_ins_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_check_ins" ADD CONSTRAINT "scheduled_check_ins_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_nudges" ADD CONSTRAINT "reminder_nudges_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudge_deliveries" ADD CONSTRAINT "nudge_deliveries_nudgeId_fkey" FOREIGN KEY ("nudgeId") REFERENCES "reminder_nudges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_content_deliveries" ADD CONSTRAINT "micro_content_deliveries_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "micro_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_content_deliveries" ADD CONSTRAINT "micro_content_deliveries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_journal_prompts" ADD CONSTRAINT "ai_journal_prompts_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_comments" ADD CONSTRAINT "journal_comments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_comments" ADD CONSTRAINT "journal_comments_commentedBy_fkey" FOREIGN KEY ("commentedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
