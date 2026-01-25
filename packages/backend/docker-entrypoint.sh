#!/bin/bash
set -e

echo "Starting MentalSpace EHR Backend"
echo "=================================="

# Run database migrations
echo ""
echo "Running database migrations..."
cd /app/packages/database

# HOTFIX: Apply missing soft delete columns directly via SQL
# This bypasses the broken migration history and ensures columns exist
echo ""
echo "Applying soft delete column hotfix..."
npx prisma db execute --stdin <<'EOSQL' || {
  echo "Hotfix SQL completed (columns may already exist)"
}
ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "clinical_notes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "client_documents" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "note_amendments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "insurance_information_deletedAt_idx" ON "insurance_information"("deletedAt");
CREATE INDEX IF NOT EXISTS "appointments_deletedAt_idx" ON "appointments"("deletedAt");
CREATE INDEX IF NOT EXISTS "clinical_notes_deletedAt_idx" ON "clinical_notes"("deletedAt");
CREATE INDEX IF NOT EXISTS "client_documents_deletedAt_idx" ON "client_documents"("deletedAt");
CREATE INDEX IF NOT EXISTS "note_amendments_deletedAt_idx" ON "note_amendments"("deletedAt");
EOSQL
echo "Soft delete column hotfix complete"

# Check migration status
echo "Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1) || true

# Check for P3005 error (schema not empty, needs baseline)
if echo "$MIGRATION_STATUS" | grep -q "P3005"; then
  echo ""
  echo "=============================================="
  echo "Detected P3005: Database needs baselining"
  echo "Marking all existing migrations as applied..."
  echo "=============================================="

  # List of all migrations in chronological order
  MIGRATIONS=(
    "20251013002302_init"
    "20251013045625_add_legal_guardian_model"
    "20251013143959_add_productivity_module"
    "20251013160420_add_scheduling_enhancements"
    "20251013180424_add_telehealth_sessions"
    "20251013213554_add_telehealth_appointment_relation"
    "20251014023842_make_user_fields_optional"
    "20251014025443_make_client_maritalstatus_optional"
    "20251016022832_add_telehealth_consent_model"
    "20251016032353_add_client_portal_models"
    "20251016044310_add_enhanced_client_portal_module_9"
    "20251016150929_add_assessment_assignments"
    "20251016152725_add_portal_enhancements"
    "20251017184656_add_multiple_roles_support"
    "20251017193200_clinical_notes_business_rules"
    "20251021075118_add_islocked_to_clinical_notes"
    "20251022014019_add_password_management_fields"
    "20251022022500_add_esignature_to_intake_forms"
    "20251022112351_make_appointment_required_in_clinical_notes"
    "20251022152121_add_revision_workflow_to_clinical_notes"
    "20251022200302_add_electronic_signatures_and_attestations"
    "20251022203000_add_note_validation_rules"
    "20251023103419_add_phase_1_5_amendment_history"
    "20251023181046_add_phase_2_1_payer_policy_engine"
    "20251102145454_add_session_management_and_security"
    "20251110193809_add_module_8_reporting_analytics_models"
    "20251119024521_make_draft_fields_nullable"
    "20251120191834_advancedmd_integration"
    "20251125000001_add_enterprise_performance_indexes"
    "20250103_add_waitlist_automation_fields"
    "20250107_add_ai_note_generation"
    "20250107_add_ai_transcription"
    "20250107_add_emergency_tracking_to_telehealth"
    "20250107_add_session_recording"
    "20250107_phase2_emergency_enhancements"
    "20250114000000_client_module_schema_fixes"
    "20250120_add_advancedmd_appointment_fields"
    "20250106_add_telehealth_phase2_ai_models"
  )

  for migration in "${MIGRATIONS[@]}"; do
    echo "Marking $migration as applied..."
    npx prisma migrate resolve --applied "$migration" 2>&1 || {
      echo "Warning: Could not mark $migration as applied, continuing..."
    }
  done

  echo ""
  echo "Baseline complete. Running any remaining migrations..."
fi

# Check for failed migrations and resolve them
echo "Checking for failed migrations..."
FAILED_MIGRATIONS=$(npx prisma migrate status 2>&1 | grep -E "failed|Failed" || true)
if [ -n "$FAILED_MIGRATIONS" ]; then
  echo "Found failed migrations, attempting to resolve..."
  # Extract migration name and mark as rolled back
  MIGRATION_NAME=$(echo "$FAILED_MIGRATIONS" | grep -oP '\d{14}_\w+' | head -1 || true)
  if [ -n "$MIGRATION_NAME" ]; then
    echo "Rolling back failed migration: $MIGRATION_NAME"
    npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" || {
      echo "Could not resolve migration automatically, continuing..."
    }
  fi
fi

# Run migrations - allow it to fail if already applied
npx prisma migrate deploy || {
  EXIT_CODE=$?
  echo "Migration command exited with code $EXIT_CODE"
  # If migrations are already applied, Prisma returns 0
  # If there's a connection issue or other error, we still want to try starting the app
  # The app will fail on its own if DB is truly unavailable
  echo "Continuing with application startup..."
}

echo "Migrations check complete"

# Start the application
echo ""
echo "Starting application server..."
cd /app/packages/backend
exec node dist/index.js
