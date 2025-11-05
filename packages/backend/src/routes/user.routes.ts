import { Router } from 'express';
import userController from '../controllers/user.controller';
import * as signatureController from '../controllers/signature.controller';
import { validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createUserSchema,
  updateUserAdminSchema,
  resetPasswordSchema,
} from '../utils/validation';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Admin, Supervisor
 */
router.get(
  '/stats',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  userController.getUserStats
);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filters
 * @access  Admin, Supervisor
 */
router.get(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  userController.getUsers
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Admin, Supervisor
 */
router.get(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  userController.getUserById
);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Admin only
 */
router.post(
  '/',
  authorize('ADMINISTRATOR'),
  validateBody(createUserSchema),
  userController.createUser
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Admin only
 */
router.put(
  '/:id',
  authorize('ADMINISTRATOR'),
  validateBody(updateUserAdminSchema),
  userController.updateUser
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Deactivate user (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  authorize('ADMINISTRATOR'),
  userController.deactivateUser
);

/**
 * @route   POST /api/v1/users/:id/activate
 * @desc    Activate user
 * @access  Admin only
 */
router.post(
  '/:id/activate',
  authorize('ADMINISTRATOR'),
  userController.activateUser
);

/**
 * @route   POST /api/v1/users/:id/unlock
 * @desc    Unlock user account (remove account lockout)
 * @access  Admin only
 */
router.post(
  '/:id/unlock',
  authorize('ADMINISTRATOR'),
  userController.unlockAccount
);

/**
 * @route   POST /api/v1/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin only
 */
router.post(
  '/:id/reset-password',
  authorize('ADMINISTRATOR'),
  validateBody(resetPasswordSchema),
  userController.resetPassword
);

/**
 * @route   POST /api/v1/users/invite
 * @desc    Create user and send invitation email
 * @access  Admin only
 */
router.post(
  '/invite',
  authorize('ADMINISTRATOR'),
  validateBody(createUserSchema),
  userController.inviteUser
);

/**
 * @route   POST /api/v1/users/:id/resend-invitation
 * @desc    Resend invitation email to user
 * @access  Admin only
 */
router.post(
  '/:id/resend-invitation',
  authorize('ADMINISTRATOR'),
  userController.resendInvitation
);

/**
 * @route   POST /api/v1/users/change-password
 * @desc    Change own password
 * @access  Authenticated user
 */
router.post(
  '/change-password',
  userController.changeOwnPassword
);

/**
 * @route   POST /api/v1/users/force-password-change
 * @desc    Force password change on first login
 * @access  Authenticated user with mustChangePassword flag
 */
router.post(
  '/force-password-change',
  userController.forcePasswordChange
);

/**
 * @route   POST /api/v1/users/signature-pin
 * @desc    Set or update signature PIN
 * @access  Authenticated user
 */
router.post(
  '/signature-pin',
  signatureController.setSignaturePin
);

/**
 * @route   POST /api/v1/users/signature-password
 * @desc    Set or update signature password
 * @access  Authenticated user
 */
router.post(
  '/signature-password',
  signatureController.setSignaturePassword
);

/**
 * @route   GET /api/v1/users/signature-status
 * @desc    Check if user has signature PIN or password configured
 * @access  Authenticated user
 */
router.get(
  '/signature-status',
  signatureController.getSignatureStatus
);

export default router;
// Phase 1.4: Electronic Signatures - Deployed Wed, Oct 22, 2025 10:11:52 PM
