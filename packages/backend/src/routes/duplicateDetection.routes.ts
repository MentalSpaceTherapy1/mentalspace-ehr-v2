/**
 * Duplicate Detection Routes
 * API routes for duplicate client detection and resolution
 */

import { Router } from 'express';
import * as duplicateDetectionController from '../controllers/duplicateDetection.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/clients/check-duplicates
 * Check for potential duplicate clients
 * Body: { firstName, lastName, dateOfBirth, primaryPhone, addressStreet1?, addressZipCode?, excludeClientId? }
 */
router.post('/clients/check-duplicates', duplicateDetectionController.checkDuplicates);

/**
 * POST /api/v1/clients/:clientId/save-duplicates
 * Save detected duplicates to database for review
 * Body: { matches: DuplicateMatch[] }
 */
router.post('/clients/:clientId/save-duplicates', duplicateDetectionController.saveDuplicates);

/**
 * GET /api/v1/duplicates/pending
 * Get all pending duplicate records for review
 */
router.get('/duplicates/pending', duplicateDetectionController.getPendingDuplicates);

/**
 * GET /api/v1/duplicates/stats
 * Get duplicate detection statistics
 */
router.get('/duplicates/stats', duplicateDetectionController.getDuplicateStats);

/**
 * POST /api/v1/duplicates/:id/merge
 * Merge two client records
 * Body: { sourceClientId, targetClientId, resolutionNotes? }
 */
router.post('/duplicates/:id/merge', duplicateDetectionController.mergeDuplicate);

/**
 * POST /api/v1/duplicates/:id/dismiss
 * Dismiss a potential duplicate
 * Body: { resolutionNotes? }
 */
router.post('/duplicates/:id/dismiss', duplicateDetectionController.dismissDuplicate);

export default router;
