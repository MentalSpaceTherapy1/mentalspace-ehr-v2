import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  requireGuardianAccess,
  requireGuardianPermission,
  checkGuardianContext,
  validateMinorStatus,
  allowClientOrGuardian,
} from '../middleware/guardian-access.middleware';
import * as guardianController from '../controllers/guardian.controller.new';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, TIFF, and DOC files are allowed.'));
    }
  },
});

// ============================================================================
// GUARDIAN PORTAL ROUTES
// ============================================================================

/**
 * POST /api/guardian/relationship
 * Request guardian access to a minor
 */
router.post(
  '/relationship',
  authenticateToken,
  validateMinorStatus,
  guardianController.requestGuardianAccess
);

/**
 * GET /api/guardian/my-minors
 * Get all minors the current user has guardian access to
 */
router.get(
  '/my-minors',
  authenticateToken,
  guardianController.getMyMinors
);

/**
 * GET /api/guardian/minors/:minorId/profile
 * View minor's profile (requires verified guardian access)
 */
router.get(
  '/minors/:minorId/profile',
  authenticateToken,
  requireGuardianAccess,
  requireGuardianPermission('view'),
  guardianController.getMinorProfile
);

/**
 * GET /api/guardian/minors/:minorId/appointments
 * View minor's appointments (requires view permission)
 */
router.get(
  '/minors/:minorId/appointments',
  authenticateToken,
  requireGuardianAccess,
  requireGuardianPermission('view'),
  guardianController.getMinorAppointments
);

/**
 * POST /api/guardian/minors/:minorId/appointments
 * Schedule appointment for minor (requires schedule permission)
 */
router.post(
  '/minors/:minorId/appointments',
  authenticateToken,
  requireGuardianAccess,
  requireGuardianPermission('schedule'),
  guardianController.scheduleMinorAppointment
);

/**
 * GET /api/guardian/minors/:minorId/messages
 * View messages/communications for minor (requires communicate permission)
 */
router.get(
  '/minors/:minorId/messages',
  authenticateToken,
  requireGuardianAccess,
  requireGuardianPermission('communicate'),
  guardianController.getMinorMessages
);

/**
 * POST /api/guardian/minors/:minorId/messages
 * Send message to clinician on behalf of minor (requires communicate permission)
 */
router.post(
  '/minors/:minorId/messages',
  authenticateToken,
  requireGuardianAccess,
  requireGuardianPermission('communicate'),
  guardianController.sendMinorMessage
);

/**
 * POST /api/guardian/relationship/:relationshipId/documents
 * Upload verification document for a relationship
 */
router.post(
  '/relationship/:relationshipId/documents',
  authenticateToken,
  upload.single('document'),
  guardianController.uploadVerificationDocument
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/admin/guardian/pending
 * Get pending verification requests (admin only)
 */
router.get(
  '/admin/pending',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.getPendingVerifications
);

/**
 * GET /api/admin/guardian/relationships
 * Get all guardian relationships with filters (admin only)
 */
router.get(
  '/admin/relationships',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.getAllRelationships
);

/**
 * GET /api/admin/guardian/:id
 * Get specific relationship by ID (admin only)
 */
router.get(
  '/admin/:id',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.getRelationshipById
);

/**
 * PUT /api/admin/guardian/:id/verify
 * Verify a guardian relationship (admin only)
 */
router.put(
  '/admin/:id/verify',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.verifyRelationship
);

/**
 * PUT /api/admin/guardian/:id/reject
 * Reject a guardian relationship (admin only)
 */
router.put(
  '/admin/:id/reject',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.rejectRelationship
);

/**
 * PUT /api/admin/guardian/:id/revoke
 * Revoke a guardian relationship (admin only)
 */
router.put(
  '/admin/:id/revoke',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.revokeRelationship
);

/**
 * PUT /api/admin/guardian/:id
 * Update a guardian relationship (admin only)
 */
router.put(
  '/admin/:id',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.updateGuardianRelationship
);

/**
 * POST /api/admin/guardian/document-url
 * Get presigned URL for viewing verification document (admin only)
 */
router.post(
  '/admin/document-url',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.getDocumentUrl
);

/**
 * GET /api/admin/guardian/audit-log
 * Get guardian access audit log (admin only)
 */
router.get(
  '/admin/audit-log',
  authenticateToken,
  // TODO: Add admin role check middleware
  guardianController.getGuardianAuditLog
);

// ============================================================================
// LEGACY ROUTES (for backward compatibility with LegalGuardian model)
// ============================================================================

/**
 * GET /api/guardian/client/:clientId
 * Get all guardians for a specific client
 */
router.get(
  '/client/:clientId',
  authenticateToken,
  guardianController.getClientGuardians
);

/**
 * GET /api/guardian/:id
 * Get a specific guardian by ID
 */
router.get(
  '/:id',
  authenticateToken,
  guardianController.getGuardianById
);

/**
 * POST /api/guardian
 * Create a new guardian
 */
router.post(
  '/',
  authenticateToken,
  guardianController.createGuardian
);

/**
 * PUT /api/guardian/:id
 * Update a guardian
 */
router.put(
  '/:id',
  authenticateToken,
  guardianController.updateGuardian
);

/**
 * DELETE /api/guardian/:id
 * Delete a guardian
 */
router.delete(
  '/:id',
  authenticateToken,
  guardianController.deleteGuardian
);

export default router;
