import express from 'express';
import credentialingController from '../controllers/credentialing.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Credentialing Routes
 *
 * All routes require authentication.
 * Admin/HR role required for most operations (can be added as needed).
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/credentialing
 * @desc    Create a new credential
 * @access  Private (Admin/HR)
 */
router.post('/', credentialingController.createCredential.bind(credentialingController));

/**
 * @route   GET /api/credentialing
 * @desc    Get all credentials with optional filters
 * @access  Private (Admin/HR)
 * @query   userId, credentialType, verificationStatus, screeningStatus, expiringWithinDays, expired, page, limit
 */
router.get('/', credentialingController.getCredentials.bind(credentialingController));

/**
 * @route   GET /api/credentialing/stats
 * @desc    Get compliance statistics for dashboard
 * @access  Private (Admin/HR)
 */
router.get('/stats', credentialingController.getStats.bind(credentialingController));

/**
 * @route   GET /api/credentialing/expiring
 * @desc    Get credentials expiring within specified days
 * @access  Private (Admin/HR)
 * @query   days (default: 90)
 */
router.get('/expiring', credentialingController.getExpiringCredentials.bind(credentialingController));

/**
 * @route   GET /api/credentialing/alerts
 * @desc    Get credential alerts (critical and expired)
 * @access  Private (Admin/HR)
 */
router.get('/alerts', credentialingController.getCredentialAlerts.bind(credentialingController));

/**
 * @route   GET /api/credentialing/report
 * @desc    Generate credentialing report
 * @access  Private (Admin/HR)
 * @query   userId, credentialType, verificationStatus, screeningStatus, expiringWithinDays, expired
 */
router.get('/report', credentialingController.generateReport.bind(credentialingController));

/**
 * @route   POST /api/credentialing/send-reminders
 * @desc    Send expiration reminders manually
 * @access  Private (Admin/HR)
 */
router.post('/send-reminders', credentialingController.sendExpirationReminders.bind(credentialingController));

/**
 * @route   GET /api/credentialing/user/:userId
 * @desc    Get all credentials for a specific user
 * @access  Private
 */
router.get('/user/:userId', credentialingController.getUserCredentials.bind(credentialingController));

/**
 * @route   GET /api/credentialing/compliance/:userId
 * @desc    Check compliance status for a user
 * @access  Private (Admin/HR)
 */
router.get('/compliance/:userId', credentialingController.checkUserCompliance.bind(credentialingController));

/**
 * @route   GET /api/credentialing/:id
 * @desc    Get credential by ID
 * @access  Private
 */
router.get('/:id', credentialingController.getCredentialById.bind(credentialingController));

/**
 * @route   PUT /api/credentialing/:id
 * @desc    Update credential
 * @access  Private (Admin/HR)
 */
router.put('/:id', credentialingController.updateCredential.bind(credentialingController));

/**
 * @route   DELETE /api/credentialing/:id
 * @desc    Delete credential
 * @access  Private (Admin/HR)
 */
router.delete('/:id', credentialingController.deleteCredential.bind(credentialingController));

/**
 * @route   POST /api/credentialing/:id/verify
 * @desc    Verify credential
 * @access  Private (Admin/HR)
 */
router.post('/:id/verify', credentialingController.verifyCredential.bind(credentialingController));

/**
 * @route   POST /api/credentialing/:id/screening
 * @desc    Run OIG/SAM screening for credential
 * @access  Private (Admin/HR)
 */
router.post('/:id/screening', credentialingController.runScreening.bind(credentialingController));

/**
 * @route   POST /api/credentialing/:id/renewal
 * @desc    Initiate credential renewal
 * @access  Private (Admin/HR)
 */
router.post('/:id/renewal', credentialingController.initiateRenewal.bind(credentialingController));

/**
 * @route   POST /api/credentialing/:id/documents
 * @desc    Add document to credential
 * @access  Private (Admin/HR)
 */
router.post('/:id/documents', credentialingController.addDocument.bind(credentialingController));

/**
 * @route   DELETE /api/credentialing/:id/documents
 * @desc    Remove document from credential
 * @access  Private (Admin/HR)
 */
router.delete('/:id/documents', credentialingController.removeDocument.bind(credentialingController));

export default router;
