-- Add composite indexes for query performance optimization
-- Phase 3: Database Indexes (P1 - High Priority)

-- Appointment indexes for common query patterns
-- Clinician schedule lookup
CREATE INDEX "appointments_clinicianId_appointmentDate_idx" ON "appointments"("clinicianId", "appointmentDate");

-- Client appointment history
CREATE INDEX "appointments_clientId_appointmentDate_idx" ON "appointments"("clientId", "appointmentDate");

-- Status filtering with date range
CREATE INDEX "appointments_status_appointmentDate_idx" ON "appointments"("status", "appointmentDate");

-- ClinicalNote indexes for common query patterns
-- Clinician note review with status and due date filtering
CREATE INDEX "clinical_notes_clinicianId_status_dueDate_idx" ON "clinical_notes"("clinicianId", "status", "dueDate");

-- Client note history lookup
CREATE INDEX "clinical_notes_clientId_sessionDate_idx" ON "clinical_notes"("clientId", "sessionDate");

-- Status filtering with creation date
CREATE INDEX "clinical_notes_status_createdAt_idx" ON "clinical_notes"("status", "createdAt");

-- ChargeEntry indexes for billing query patterns
-- Client billing history
CREATE INDEX "charge_entries_clientId_serviceDate_idx" ON "charge_entries"("clientId", "serviceDate");

-- Status filtering for billing workflows
CREATE INDEX "charge_entries_chargeStatus_createdAt_idx" ON "charge_entries"("chargeStatus", "createdAt");

-- Provider productivity reports
CREATE INDEX "charge_entries_providerId_serviceDate_idx" ON "charge_entries"("providerId", "serviceDate");
