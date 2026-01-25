/**
 * Client Management Route Group
 * Module 2: Client CRUD, Relationships, Documents, Forms
 */
import { Router } from 'express';
import clientRoutes from '../client.routes';
import emergencyContactRoutes from '../emergencyContact.routes';
import guardianRoutes from '../guardian.routes';
import clientRelationshipRoutes from '../clientRelationship.routes';
import duplicateDetectionRoutes from '../duplicateDetection.routes';
import clientDiagnosisRoutes from '../client-diagnosis.routes';
import clientFormsRoutes from '../clientForms.routes';
import clientDocumentsRoutes from '../clientDocuments.routes';
import clientAssessmentsRoutes from '../clientAssessments.routes';

const router = Router();

// Client Portal Management routes - MUST come before general /clients routes
// Forms: /api/v1/clients/library, /api/v1/clients/:clientId/forms/*
router.use('/clients', clientFormsRoutes);

// Documents: /api/v1/clients/upload, /api/v1/clients/:clientId/documents/*
router.use('/clients', clientDocumentsRoutes);

// Assessments: /api/v1/clients/:clientId/assessments/*
router.use('/clients', clientAssessmentsRoutes);

// General client CRUD routes - comes after specific routes to avoid conflicts
router.use('/clients', clientRoutes);

// Related entities
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/guardians', guardianRoutes);
router.use('/client-relationships', clientRelationshipRoutes);

// Client diagnosis (registers routes under /clients)
router.use('/', clientDiagnosisRoutes);

// Duplicate detection (registers routes under /duplicate-detection)
router.use('/', duplicateDetectionRoutes);

export default router;
