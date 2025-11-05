import { Router } from 'express';
import * as waitlistMatchingController from '../controllers/waitlistMatching.controller';
import { authenticate, authorize } from '../middleware/auth';

/**
 * Module 3 Phase 2.2: Waitlist Automation Routes
 * Smart matching, priority scoring, and automated notifications
 */

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Priority Score Management
 */

// Calculate priority score for specific entry
router.get(
  '/:id/priority-score',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'FRONT_DESK'),
  waitlistMatchingController.calculatePriorityScore
);

// Update all priority scores
router.post(
  '/update-all-scores',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  waitlistMatchingController.updateAllPriorityScores
);

/**
 * Smart Matching
 */

// Find matching slots for specific entry
router.get(
  '/:id/matches',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'FRONT_DESK', 'CLINICIAN'),
  waitlistMatchingController.findMatchingSlots
);

// Run matching algorithm for all entries
router.post(
  '/match-all',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  waitlistMatchingController.matchAllEntries
);

/**
 * Slot Offers
 */

// Send slot offer to waitlist member
router.post(
  '/:id/send-offer',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'FRONT_DESK'),
  waitlistMatchingController.sendSlotOffer
);

// Record offer response (accepted/declined)
router.post(
  '/:id/offer-response',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'FRONT_DESK'),
  waitlistMatchingController.recordOfferResponse
);

/**
 * Statistics & Monitoring
 */

// Get matching statistics
router.get(
  '/stats',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  waitlistMatchingController.getMatchingStats
);

// Get job status
router.get(
  '/job-status',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  waitlistMatchingController.getJobStatus
);

/**
 * Manual Triggers (Admin only)
 */

// Manually trigger waitlist processing
router.post(
  '/process-now',
  authorize('ADMINISTRATOR'),
  waitlistMatchingController.triggerManualProcessing
);

export default router;
