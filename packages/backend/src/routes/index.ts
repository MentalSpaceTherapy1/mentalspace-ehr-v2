import { Router } from 'express';
import healthRoutes from './health.routes';
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

const router = Router();

// Health check routes (no authentication required)
router.use('/health', healthRoutes);

// API routes
router.use('/auth', authRoutes);
router.use('/portal-auth', portalAuthRoutes);
router.use('/users', userRoutes);
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

// Client Portal Management routes (EHR-side)
// Forms: /api/v1/clients/library, /api/v1/clients/:clientId/forms/*
router.use('/clients', clientFormsRoutes);
// Documents: /api/v1/clients/upload, /api/v1/clients/:clientId/documents/*
router.use('/clients', clientDocumentsRoutes);
// Assessments: /api/v1/clients/:clientId/assessments/*
router.use('/clients', clientAssessmentsRoutes);

// Admin routes (temporary for database seeding)
router.use('/admin', adminRoutes);

// Reports routes
router.use('/reports', reportsRoutes);

// Diagnosis routes (Clinical Notes Business Rules)
router.use('/diagnoses', diagnosisRoutes);

export default router;
