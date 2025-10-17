import { Request, Response } from 'express';
import userService from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '@mentalspace/shared';

export class UserController {
  /**
   * Get all users
   * GET /api/v1/users
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string,
      role: req.query.role as UserRole,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

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
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const createdBy = req.user!.userId;
    const user = await userService.createUser(req.body, createdBy);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
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
}

export default new UserController();
