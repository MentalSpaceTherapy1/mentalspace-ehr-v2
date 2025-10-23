import { Router } from 'express';
import * as clientPortalController from '../controllers/clientPortal.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// EHR-SIDE PORTAL ENDPOINTS (For therapists to view client portal activity)
// All routes require EHR authentication (therapist/admin)
// ============================================================================

// Client Portal Overview
router.get(
  '/clients/:clientId/portal/activity',
  authenticate,
  clientPortalController.getClientPortalActivity
);

// Mood Tracking
router.get(
  '/clients/:clientId/portal/mood-data',
  authenticate,
  clientPortalController.getClientMoodData
);

router.get(
  '/clients/:clientId/portal/mood-summary',
  authenticate,
  clientPortalController.getClientMoodSummary
);

// Session Reviews
router.get('/clinicians/me/reviews', authenticate, clientPortalController.getMyReviews);

router.post(
  '/reviews/:reviewId/respond',
  authenticate,
  clientPortalController.respondToReview
);

router.put('/reviews/:reviewId/viewed', authenticate, clientPortalController.markReviewAsViewed);

// Client Messages
router.get(
  '/clients/:clientId/portal/messages',
  authenticate,
  clientPortalController.getClientMessages
);

export default router;
