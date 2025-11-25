-- Enterprise Performance Indexes Migration
-- Critical for 50,000+ user scale
-- Created: November 25, 2025

-- ==============================================================================
-- APPOINTMENTS TABLE INDEXES (Critical for calendar/scheduling queries)
-- ==============================================================================

-- Primary query patterns: by date, by clinician, by client, by status
CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "appointments"("appointmentDate");
CREATE INDEX IF NOT EXISTS "idx_appointments_clinician" ON "appointments"("clinicianId");
CREATE INDEX IF NOT EXISTS "idx_appointments_client" ON "appointments"("clientId");
CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments"("status");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_appointments_clinician_date" ON "appointments"("clinicianId", "appointmentDate");
CREATE INDEX IF NOT EXISTS "idx_appointments_client_date" ON "appointments"("clientId", "appointmentDate");
CREATE INDEX IF NOT EXISTS "idx_appointments_status_date" ON "appointments"("status", "appointmentDate");
CREATE INDEX IF NOT EXISTS "idx_appointments_clinician_status_date" ON "appointments"("clinicianId", "status", "appointmentDate");

-- Billing status for charge entry queries
CREATE INDEX IF NOT EXISTS "idx_appointments_billing_status" ON "appointments"("billingStatus");

-- Room scheduling queries
CREATE INDEX IF NOT EXISTS "idx_appointments_room_date" ON "appointments"("room", "appointmentDate") WHERE "room" IS NOT NULL;

-- ==============================================================================
-- CLINICAL_NOTES TABLE INDEXES (Critical for note retrieval and reporting)
-- ==============================================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_client" ON "clinical_notes"("clientId");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_clinician" ON "clinical_notes"("clinicianId");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_appointment" ON "clinical_notes"("appointmentId");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_status" ON "clinical_notes"("status");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_note_type" ON "clinical_notes"("noteType");

-- Date-based queries
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_session_date" ON "clinical_notes"("sessionDate");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_created_at" ON "clinical_notes"("createdAt");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_client_date" ON "clinical_notes"("clientId", "sessionDate");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_clinician_date" ON "clinical_notes"("clinicianId", "sessionDate");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_client_status" ON "clinical_notes"("clientId", "status");
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_type_status" ON "clinical_notes"("noteType", "status");

-- Signature workflow queries
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_signature_status" ON "clinical_notes"("signatureStatus") WHERE "signatureStatus" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_locked" ON "clinical_notes"("isLocked");

-- ==============================================================================
-- CHARGE_ENTRIES TABLE INDEXES (Critical for billing operations)
-- ==============================================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS "idx_charge_entries_client" ON "charge_entries"("clientId");
CREATE INDEX IF NOT EXISTS "idx_charge_entries_provider" ON "charge_entries"("providerId");
CREATE INDEX IF NOT EXISTS "idx_charge_entries_service_date" ON "charge_entries"("serviceDate");
CREATE INDEX IF NOT EXISTS "idx_charge_entries_status" ON "charge_entries"("chargeStatus");

-- Composite indexes for billing workflows
CREATE INDEX IF NOT EXISTS "idx_charge_entries_status_date" ON "charge_entries"("chargeStatus", "serviceDate");
CREATE INDEX IF NOT EXISTS "idx_charge_entries_client_date" ON "charge_entries"("clientId", "serviceDate");
CREATE INDEX IF NOT EXISTS "idx_charge_entries_provider_date" ON "charge_entries"("providerId", "serviceDate");

-- CPT code analysis
CREATE INDEX IF NOT EXISTS "idx_charge_entries_cpt" ON "charge_entries"("cptCode");
CREATE INDEX IF NOT EXISTS "idx_charge_entries_cpt_date" ON "charge_entries"("cptCode", "serviceDate");

-- Claim tracking
CREATE INDEX IF NOT EXISTS "idx_charge_entries_claim" ON "charge_entries"("claimId") WHERE "claimId" IS NOT NULL;

-- ==============================================================================
-- AUDIT_LOGS TABLE INDEXES (Critical for compliance and security monitoring)
-- ==============================================================================

-- Primary query patterns for audit trails
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_client" ON "audit_logs"("clientId") WHERE "clientId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" ON "audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_id" ON "audit_logs"("entityId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");

-- Composite indexes for common audit queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_timestamp" ON "audit_logs"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_timestamp" ON "audit_logs"("action", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_timestamp" ON "audit_logs"("entityType", "entityId", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_action" ON "audit_logs"("userId", "action");

-- Security monitoring queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_ip_timestamp" ON "audit_logs"("ipAddress", "timestamp") WHERE "ipAddress" IS NOT NULL;

-- ==============================================================================
-- SESSIONS TABLE INDEXES (Critical for authentication performance)
-- ==============================================================================

-- Already has: idx on userId+isActive, idx on token
-- Add additional indexes for session management
CREATE INDEX IF NOT EXISTS "idx_sessions_expires" ON "sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_sessions_last_activity" ON "sessions"("lastActivity");
CREATE INDEX IF NOT EXISTS "idx_sessions_user_expires" ON "sessions"("userId", "expiresAt");

-- ==============================================================================
-- USERS TABLE INDEXES (Critical for auth and lookup)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users"("isActive");
CREATE INDEX IF NOT EXISTS "idx_users_roles" ON "users" USING GIN("roles");

-- ==============================================================================
-- CLIENTS TABLE INDEXES (Critical for client lookup and filtering)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_clients_status" ON "clients"("status");
CREATE INDEX IF NOT EXISTS "idx_clients_primary_therapist" ON "clients"("primaryTherapistId");
CREATE INDEX IF NOT EXISTS "idx_clients_last_name" ON "clients"("lastName");
CREATE INDEX IF NOT EXISTS "idx_clients_first_name" ON "clients"("firstName");
CREATE INDEX IF NOT EXISTS "idx_clients_dob" ON "clients"("dateOfBirth");
CREATE INDEX IF NOT EXISTS "idx_clients_mrn" ON "clients"("medicalRecordNumber");

-- Full text search optimization (if needed)
CREATE INDEX IF NOT EXISTS "idx_clients_name_search" ON "clients"("lastName", "firstName");

-- ==============================================================================
-- INSURANCE_INFORMATION TABLE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_insurance_client" ON "insurance_information"("clientId");
CREATE INDEX IF NOT EXISTS "idx_insurance_active" ON "insurance_information"("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "idx_insurance_payer" ON "insurance_information"("payerName");

-- ==============================================================================
-- TREATMENT_PLANS TABLE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_treatment_plans_client" ON "treatment_plans"("clientId");
CREATE INDEX IF NOT EXISTS "idx_treatment_plans_clinician" ON "treatment_plans"("clinicianId");
CREATE INDEX IF NOT EXISTS "idx_treatment_plans_status" ON "treatment_plans"("status");

-- ==============================================================================
-- MEDICATIONS TABLE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_medications_client" ON "medications"("clientId");
CREATE INDEX IF NOT EXISTS "idx_medications_status" ON "medications"("status");
CREATE INDEX IF NOT EXISTS "idx_medications_client_status" ON "medications"("clientId", "status");

-- ==============================================================================
-- WAITLIST_ENTRIES TABLE INDEXES (for scheduling optimization)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_waitlist_client" ON "waitlist_entries"("clientId");
CREATE INDEX IF NOT EXISTS "idx_waitlist_status" ON "waitlist_entries"("status");
CREATE INDEX IF NOT EXISTS "idx_waitlist_priority" ON "waitlist_entries"("priority");
CREATE INDEX IF NOT EXISTS "idx_waitlist_preferred_clinician" ON "waitlist_entries"("preferredClinicianId") WHERE "preferredClinicianId" IS NOT NULL;

-- ==============================================================================
-- CLAIMS TABLE INDEXES (AdvancedMD Integration)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_claims_client" ON "claims"("clientId");
CREATE INDEX IF NOT EXISTS "idx_claims_status" ON "claims"("status");
CREATE INDEX IF NOT EXISTS "idx_claims_submission_date" ON "claims"("submissionDate");
CREATE INDEX IF NOT EXISTS "idx_claims_amd_id" ON "claims"("advancedMDClaimId") WHERE "advancedMDClaimId" IS NOT NULL;

-- ==============================================================================
-- ELIGIBILITY_CHECKS TABLE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "idx_eligibility_client" ON "eligibility_checks"("clientId");
CREATE INDEX IF NOT EXISTS "idx_eligibility_check_date" ON "eligibility_checks"("checkDate");
CREATE INDEX IF NOT EXISTS "idx_eligibility_status" ON "eligibility_checks"("status");

-- ==============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ==============================================================================

-- Active appointments only (very common filter)
CREATE INDEX IF NOT EXISTS "idx_appointments_active" ON "appointments"("appointmentDate", "clinicianId")
  WHERE "status" NOT IN ('CANCELLED', 'NO_SHOW');

-- Unsigned notes (workflow queue)
CREATE INDEX IF NOT EXISTS "idx_clinical_notes_unsigned" ON "clinical_notes"("clinicianId", "sessionDate")
  WHERE "status" = 'DRAFT' OR "signatureStatus" IS NULL OR "signatureStatus" != 'SIGNED';

-- Unbilled charges (billing queue)
CREATE INDEX IF NOT EXISTS "idx_charge_entries_unbilled" ON "charge_entries"("serviceDate")
  WHERE "chargeStatus" IN ('PENDING', 'READY_TO_BILL');

-- ==============================================================================
-- ANALYZE TABLES for query optimizer
-- ==============================================================================

ANALYZE "appointments";
ANALYZE "clinical_notes";
ANALYZE "charge_entries";
ANALYZE "audit_logs";
ANALYZE "sessions";
ANALYZE "users";
ANALYZE "clients";
