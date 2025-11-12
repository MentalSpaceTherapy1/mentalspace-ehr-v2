/**
 * Policy Routes
 * Module 9: Compliance Management - Agent 3
 */

import express from 'express';
import policyController from '../controllers/policy.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Policy CRUD operations
router.post('/', policyController.createPolicy.bind(policyController));
router.get('/', policyController.listPolicies.bind(policyController));
router.get('/due-for-review', policyController.getPoliciesDueForReview.bind(policyController));
router.get('/number/:policyNumber', policyController.getPolicyByNumber.bind(policyController));
router.get('/pending-acknowledgments/:userId', policyController.getPendingAcknowledgments.bind(policyController));
router.get('/reports/compliance', policyController.getComplianceReport.bind(policyController));
router.get('/:id', policyController.getPolicyById.bind(policyController));
router.put('/:id', policyController.updatePolicy.bind(policyController));
router.delete('/:id', policyController.deletePolicy.bind(policyController));

// Policy workflow operations
router.post('/:id/version', policyController.createNewVersion.bind(policyController));
router.post('/:id/distribute', policyController.distributePolicy.bind(policyController));
router.post('/:id/acknowledge', policyController.acknowledgePolicy.bind(policyController));
router.post('/:id/approve', policyController.approvePolicy.bind(policyController));

export default router;
