import { Router } from 'express';
import authController from '../controllers/auth.controller';
import userController from '../controllers/user.controller';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../utils/validation';
import { authRateLimiter, accountCreationRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public (or Admin only, depending on requirements)
 * @security Rate limited to prevent automated account creation
 */
router.post('/register', accountCreationRateLimiter, validateBody(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @security Rate limited to prevent brute-force attacks
 */
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  userController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  userController.resetPasswordWithToken
);

export default router;
