import { Router } from 'express';
import userController from '../controllers/user.controller';
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

export default router;
