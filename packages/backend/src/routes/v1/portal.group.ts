/**
 * Client Portal Route Group
 * Module 7: Client Portal, Progress Tracking, Crisis Detection
 */
import { Router } from 'express';
import portalRoutes from '../portal.routes';
import clientPortalRoutes from '../clientPortal.routes';
import portalAdminRoutes from '../portalAdmin.routes';
import progressTrackingRoutes from '../progress-tracking.routes';
import crisisDetectionRoutes from '../crisis-detection.routes';
import logger from '../../utils/logger';

const router = Router();

// Portal routes
router.use('/portal', portalRoutes);

// EHR-side portal routes (therapists view client portal activity)
router.use('/client-portal', clientPortalRoutes);

// Progress tracking (Module 7: Client Progress & Wellness Tracking)
// CRITICAL: Must be registered before catch-all routes
logger.debug('[ROUTES] Registering progress tracking routes at /tracking');
router.use('/tracking', progressTrackingRoutes);

// Crisis detection (Module 7: Safety & Crisis Management)
router.use('/crisis', crisisDetectionRoutes);

// Admin portal routes (catch-all, should be last in portal group)
router.use('/', portalAdminRoutes);

export default router;
