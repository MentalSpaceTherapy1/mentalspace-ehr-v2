/**
 * API v1 Route Index
 *
 * Organizes all routes into logical domain groups for better maintainability.
 * Each group contains related routes for a specific module or feature area.
 *
 * Route Groups:
 * - auth: Authentication, sessions, MFA, user management
 * - client: Client CRUD, relationships, forms, documents
 * - scheduling: Appointments, availability, waitlist, AI scheduling
 * - clinical: Clinical notes, signatures, diagnoses, outcome measures
 * - billing: Billing, insurance, payers, AdvancedMD integration
 * - telehealth: Video sessions, consent management
 * - portal: Client portal, progress tracking, crisis detection
 * - reporting: Reports, dashboards, analytics, BI integrations
 * - compliance: Credentialing, training, policies, incidents
 * - staff: Staff management, onboarding, performance, time & attendance
 * - admin: Practice settings, AI features, financial administration
 */
import { Router } from 'express';

// Route groups
import authGroup from './auth.group';
import clientGroup from './client.group';
import schedulingGroup from './scheduling.group';
import clinicalGroup from './clinical.group';
import billingGroup from './billing.group';
import telehealthGroup from './telehealth.group';
import portalGroup from './portal.group';
import reportingGroup from './reporting.group';
import complianceGroup from './compliance.group';
import staffGroup from './staff.group';
import adminGroup from './admin.group';

import logger from '../../utils/logger';

const router = Router();

logger.info('[ROUTES] Initializing API v1 routes with modular groups');

// Mount all route groups
// Order matters - more specific routes should come before catch-all routes

// Core authentication & user management
router.use(authGroup);

// Client management (includes forms, documents, assessments)
router.use(clientGroup);

// Scheduling & calendar
router.use(schedulingGroup);

// Clinical documentation
router.use(clinicalGroup);

// Billing & insurance
router.use(billingGroup);

// Telehealth
router.use(telehealthGroup);

// Reporting & analytics
router.use(reportingGroup);

// Compliance & credentialing
router.use(complianceGroup);

// Staff & HR
router.use(staffGroup);

// Administration (includes catch-all routes, should be near end)
router.use(adminGroup);

// Portal (includes catch-all portalAdmin routes, should be last)
router.use(portalGroup);

logger.info('[ROUTES] API v1 routes initialized successfully');

export default router;
