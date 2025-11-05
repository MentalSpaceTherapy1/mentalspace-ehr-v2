import { Router } from 'express';
import healthRoutes from './health.routes';
import versionRoutes from './version.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import clientRoutes from './client.routes';
import emergencyContactRoutes from './emergencyContact.routes';
import insuranceRoutes from './insurance.routes';
import guardianRoutes from './guardian.routes';
import clinicalNoteRoutes from './clinicalNote.routes';
import appointmentRoutes from './appointment.routes';
import billingRoutes from './billing.routes';
import productivityRoutes from './productivity.routes';
import serviceCodeRoutes from './serviceCode.routes';
import waitlistRoutes from './waitlist.routes';
import clinicianScheduleRoutes from './clinicianSchedule.routes';
import reminderRoutes from './reminder.routes';
import telehealthRoutes from './telehealth.routes';
import telehealthConsentRoutes from './telehealthConsent.routes';
import portalRoutes from './portal.routes';
import portalAuthRoutes from './portalAuth.routes';
import clientPortalRoutes from './clientPortal.routes';
import portalAdminRoutes from './portalAdmin.routes';
import clientFormsRoutes from './clientForms.routes';
import clientDocumentsRoutes from './clientDocuments.routes';
import clientAssessmentsRoutes from './clientAssessments.routes';
import adminRoutes from './admin.routes';
import reportsRoutes from './reports.routes';
import diagnosisRoutes from './diagnosis.routes';
import clientDiagnosisRoutes from './client-diagnosis.routes';
import supervisionRoutes from './supervision.routes';
import unlockRequestRoutes from './unlockRequest.routes';
import practiceSettingsRoutes from './practiceSettings.routes';
import aiRoutes from './ai.routes';
import signatureRoutes from './signature.routes';
import amendmentRoutes from './amendment.routes';
import payerRoutes from './payer.routes';
import payerRuleRoutes from './payerRule.routes';
import billingHoldRoutes from './billingHold.routes';
import priorAuthorizationRoutes from './priorAuthorization.routes';
import sessionRoutes from './session.routes';
import mfaRoutes from './mfa.routes';
import clientRelationshipRoutes from './clientRelationship.routes';
import duplicateDetectionRoutes from './duplicateDetection.routes';
import appointmentTypeRoutes from './appointmentType.routes';
import groupSessionRoutes from './groupSession.routes';
import availabilityRoutes from './availability.routes';
import timeOffRoutes from './timeOff.routes';
import waitlistMatchingRoutes from './waitlistMatching.routes';

const router = Router();

// Health check routes (no authentication required)
router.use('/health', healthRoutes);

// Version endpoint (no authentication required)
router.use('/', versionRoutes);

// API routes
router.use('/auth', authRoutes);
router.use('/portal-auth', portalAuthRoutes);
router.use('/users', userRoutes);

// Session management routes (Module 1: Authentication & User Management)
router.use('/sessions', sessionRoutes);

// MFA routes (Module 1: Optional Multi-Factor Authentication)
router.use('/mfa', mfaRoutes);

// Client Portal Management routes (EHR-side) - MUST come before general /clients routes
// Forms: /api/v1/clients/library, /api/v1/clients/:clientId/forms/*
router.use('/clients', clientFormsRoutes);
// Documents: /api/v1/clients/upload, /api/v1/clients/:clientId/documents/*
router.use('/clients', clientDocumentsRoutes);
// Assessments: /api/v1/clients/:clientId/assessments/*
router.use('/clients', clientAssessmentsRoutes);

// General client CRUD routes - comes after specific routes to avoid conflicts
router.use('/clients', clientRoutes);

router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/guardians', guardianRoutes);
router.use('/clinical-notes', clinicalNoteRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/billing', billingRoutes);
router.use('/productivity', productivityRoutes);
router.use('/service-codes', serviceCodeRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/clinician-schedules', clinicianScheduleRoutes);
router.use('/reminders', reminderRoutes);
router.use('/telehealth', telehealthRoutes);
router.use('/telehealth-consent', telehealthConsentRoutes);
router.use('/portal', portalRoutes);

// EHR-side portal routes (therapists view client portal activity)
router.use('/', clientPortalRoutes);

// Admin portal routes
router.use('/', portalAdminRoutes);

// Admin routes (temporary for database seeding)
router.use('/admin', adminRoutes);

// Reports routes
router.use('/reports', reportsRoutes);

// Diagnosis routes (Clinical Notes Business Rules)
router.use('/diagnoses', diagnosisRoutes);

// Client Diagnosis routes (Module 2: Client Management)
router.use('/', clientDiagnosisRoutes);

// Supervision routes (Phase 5)
router.use('/supervision', supervisionRoutes);

// Unlock request routes (Compliance - Sunday Lockout)
router.use('/unlock-requests', unlockRequestRoutes);

// Practice Settings routes (Admin Configuration)
router.use('/practice-settings', practiceSettingsRoutes);

// AI routes (AI-powered clinical features)
router.use('/ai', aiRoutes);

// Signature routes (Phase 1.4: Electronic Signatures)
router.use('/signatures', signatureRoutes);

// Amendment routes (Phase 1.5: Amendment History System)
router.use('/', amendmentRoutes);

// Payer routes (Phase 2.1: Payer Policy Engine)
router.use('/payers', payerRoutes);

// Payer Rule routes (Phase 2.1: Payer Policy Engine)
router.use('/payer-rules', payerRuleRoutes);

// Billing Hold routes (Phase 2.1: Payer Policy Engine)
router.use('/billing-holds', billingHoldRoutes);

// Prior Authorization routes (Module 2: Prior Authorizations)
router.use('/prior-authorizations', priorAuthorizationRoutes);

// Client Relationship routes (Module 2: Client Relationships & Providers)
router.use('/client-relationships', clientRelationshipRoutes);

// Duplicate Detection routes (Module 2: Client Management)
router.use('/', duplicateDetectionRoutes);

// Appointment Type routes (Module 3: Scheduling & Calendar Management)
router.use('/appointment-types', appointmentTypeRoutes);

// Group Session routes (Module 3 Phase 2: Group Appointment Management)
router.use('/group-sessions', groupSessionRoutes);

// Provider Availability routes (Module 3 Phase 2.3: Provider Availability & Time-Off)
router.use('/provider-availability', availabilityRoutes);

// Time-Off Request routes (Module 3 Phase 2.3: Provider Availability & Time-Off)
router.use('/time-off', timeOffRoutes);

// Waitlist Matching routes (Module 3 Phase 2.2: Waitlist Automation)
router.use('/waitlist-matching', waitlistMatchingRoutes);

export default router;
