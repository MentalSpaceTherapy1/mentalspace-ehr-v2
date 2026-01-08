import { Request, Response } from 'express';
import userService from '../services/user.service';
import authService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '@mentalspace/shared';
import { ValidationError } from '../utils/errors';

export class UserController {
  /**
   * Get all users
   * GET /api/v1/users
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const filters: any = {};

    if (req.query.search) filters.search = req.query.search as string;
    if (req.query.role) filters.role = req.query.role as UserRole;
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    }
    if (req.query.page) filters.page = parseInt(req.query.page as string);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string);

    const result = await userService.getUsers(filters);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  });

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const user = await userService.getUserById(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  /**
   * Create new user
   * POST /api/v1/users
   * If no password provided, generates temporary password (72-hour expiration)
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const createdBy = req.user!.userId;
    const result = await userService.createUser(req.body, createdBy);

    // Customize message based on whether temp password was generated
    const message = result.tempPassword
      ? 'User created with temporary password. Password expires in 72 hours.'
      : 'User created successfully';

    res.status(201).json({
      success: true,
      message,
      data: result,
    });
  });

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const updatedBy = req.user!.userId;
    const user = await userService.updateUser(userId, req.body, updatedBy);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  });

  /**
   * Deactivate user
   * DELETE /api/v1/users/:id
   */
  deactivateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const deactivatedBy = req.user!.userId;
    const result = await userService.deactivateUser(userId, deactivatedBy);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Activate user
   * POST /api/v1/users/:id/activate
   */
  activateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const activatedBy = req.user!.userId;
    const result = await userService.activateUser(userId, activatedBy);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Reset user password
   * POST /api/v1/users/:id/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const resetBy = req.user!.userId;
    const { newPassword } = req.body;

    const result = await userService.resetUserPassword(userId, newPassword, resetBy);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await userService.getUserStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /**
   * Invite user (create and send email)
   * POST /api/v1/users/invite
   */
  inviteUser = asyncHandler(async (req: Request, res: Response) => {
    const createdBy = req.user!.userId;
    const result = await userService.createUserWithInvitation(req.body, createdBy);

    res.status(201).json({
      success: true,
      message: 'User invited successfully',
      data: result,
    });
  });

  /**
   * Resend user invitation
   * POST /api/v1/users/:id/resend-invitation
   */
  resendInvitation = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const resendBy = req.user!.userId;
    const result = await userService.resendInvitation(userId, resendBy);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  });

  /**
   * Request password reset (forgot password)
   * POST /api/v1/users/forgot-password
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await userService.requestPasswordReset(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  });

  /**
   * Reset password with token
   * POST /api/v1/users/reset-password-with-token
   */
  resetPasswordWithToken = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    const result = await userService.resetPasswordWithToken(token, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Change own password
   * POST /api/v1/users/change-password
   */
  changeOwnPassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;
    const result = await userService.changePassword(userId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Force password change (first login)
   * POST /api/v1/users/force-password-change
   */
  forcePasswordChange = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { newPassword } = req.body;
    const result = await userService.forcePasswordChange(userId, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Unlock user account (admin only)
   * POST /api/v1/users/:id/unlock
   */
  unlockAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const adminId = req.user!.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const result = await authService.unlockAccount(userId, adminId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Force user to change password on next login (admin only)
   * POST /api/v1/users/:id/force-password-change
   */
  forceUserPasswordChange = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const adminId = req.user!.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const result = await authService.forcePasswordChange(userId, adminId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}

export default new UserController();
