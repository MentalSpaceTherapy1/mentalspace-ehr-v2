/**
 * Incident Routes
 * Module 9: Compliance Management - Agent 3
 */

import express from 'express';
import incidentController from '../controllers/incident.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard statistics (must come before :id routes)
router.get('/stats', incidentController.getStats.bind(incidentController));

// Incident CRUD operations
router.post('/', incidentController.createIncident.bind(incidentController));
router.get('/', incidentController.listIncidents.bind(incidentController));
router.get('/requiring-follow-up', incidentController.getIncidentsRequiringFollowUp.bind(incidentController));
router.get('/high-severity-open', incidentController.getHighSeverityOpenIncidents.bind(incidentController));
router.get('/reports/trend-analysis', incidentController.getTrendAnalysis.bind(incidentController));
router.get('/number/:incidentNumber', incidentController.getIncidentByNumber.bind(incidentController));
router.get('/:id', incidentController.getIncidentById.bind(incidentController));
router.put('/:id', incidentController.updateIncident.bind(incidentController));

// Incident investigation workflow
router.post('/:id/assign', incidentController.assignInvestigator.bind(incidentController));
router.post('/:id/investigation-notes', incidentController.updateInvestigationNotes.bind(incidentController));
router.post('/:id/root-cause', incidentController.addRootCause.bind(incidentController));
router.post('/:id/corrective-actions', incidentController.addCorrectiveActions.bind(incidentController));
router.post('/:id/preventive-actions', incidentController.addPreventiveActions.bind(incidentController));
router.put('/:id/corrective-actions/:actionId', incidentController.updateCorrectiveActionStatus.bind(incidentController));
router.post('/:id/resolve', incidentController.resolveIncident.bind(incidentController));
router.post('/:id/close', incidentController.closeIncident.bind(incidentController));

export default router;
