/**
 * Compliance & Credentialing Route Group
 * Module 9: Credentialing, Training, Policies, Incidents
 */
import { Router } from 'express';
import credentialingRoutes from '../credentialing.routes';
import trainingRoutes from '../training.routes';
import policyRoutes from '../policy.routes';
import incidentRoutes from '../incident.routes';
import unlockRequestRoutes from '../unlockRequest.routes';

const router = Router();

// Credentialing & licensing
router.use('/credentialing', credentialingRoutes);

// Training & CEU tracking
router.use('/training', trainingRoutes);

// Policy management
router.use('/policies', policyRoutes);

// Incident reporting
router.use('/incidents', incidentRoutes);

// Unlock requests (Sunday lockout compliance)
router.use('/unlock-requests', unlockRequestRoutes);

export default router;
