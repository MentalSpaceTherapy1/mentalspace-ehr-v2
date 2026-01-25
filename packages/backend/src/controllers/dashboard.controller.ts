/**
 * Dashboard Controller
 * Phase 3.2: Thin controller - delegates to dashboardService
 *
 * Handles HTTP request/response only - all business logic is in dashboard.service.ts
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import logger, { logControllerError, auditLogger } from '../utils/logger';
import { dashboardService } from '../services/dashboard.service';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendForbidden,
  sendServerError,
} from '../utils/apiResponse';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDashboardSchema = z.object({
  name: z.string().min(1, 'Dashboard name is required').max(100),
  description: z.string().optional(),
  layout: z.record(z.unknown()).optional().default({}),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  role: z.string().optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  layout: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  role: z.string().optional().nullable(),
});

const addWidgetSchema = z.object({
  widgetType: z.string().min(1, 'Widget type is required'),
  title: z.string().min(1, 'Widget title is required').max(200),
  config: z.record(z.unknown()).default({}),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(20),
  }),
  refreshRate: z.number().int().min(5).max(3600).default(60),
});

const updateWidgetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  config: z.record(z.unknown()).optional(),
  position: z
    .object({
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      w: z.number().int().min(1).max(12),
      h: z.number().int().min(1).max(20),
    })
    .optional(),
  refreshRate: z.number().int().min(5).max(3600).optional(),
});

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

/**
 * Create a new dashboard
 * POST /api/v1/dashboards
 */
export const createDashboard = async (req: Request, res: Response) => {
  try {
    const validatedData = createDashboardSchema.parse(req.body);
    const userId = req.user!.userId;

    const dashboard = await dashboardService.createDashboard(validatedData, userId);

    auditLogger.log('dashboard.create', userId, {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
    });

    return sendCreated(res, dashboard);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendBadRequest(res, 'Validation failed');
    }
    logControllerError('createDashboard', error);
    return sendServerError(res, 'Failed to create dashboard');
  }
};

/**
 * Get all dashboards for the current user
 * GET /api/v1/dashboards
 */
export const getDashboards = async (req: Request, res: Response) => {
  try {
    const result = await dashboardService.getDashboards(req.user!);
    return sendSuccess(res, result);
  } catch (error) {
    logControllerError('getDashboards', error);
    return sendServerError(res, 'Failed to fetch dashboards');
  }
};

/**
 * Get a specific dashboard by ID
 * GET /api/v1/dashboards/:id
 */
export const getDashboardById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dashboard = await dashboardService.getDashboardById(id, req.user!);
    return sendSuccess(res, dashboard);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Dashboard');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('getDashboardById', error);
    return sendServerError(res, 'Failed to fetch dashboard');
  }
};

/**
 * Update a dashboard
 * PUT /api/v1/dashboards/:id
 */
export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateDashboardSchema.parse(req.body);
    const userId = req.user!.userId;

    const dashboard = await dashboardService.updateDashboard(id, validatedData, userId);

    auditLogger.log('dashboard.update', userId, {
      dashboardId: dashboard.id,
      changes: validatedData,
    });

    return sendSuccess(res, dashboard);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendBadRequest(res, 'Validation failed');
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Dashboard');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('updateDashboard', error);
    return sendServerError(res, 'Failed to update dashboard');
  }
};

/**
 * Delete a dashboard
 * DELETE /api/v1/dashboards/:id
 */
export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await dashboardService.deleteDashboard(id, userId);

    auditLogger.log('dashboard.delete', userId, {
      dashboardId: id,
    });

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Dashboard');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('deleteDashboard', error);
    return sendServerError(res, 'Failed to delete dashboard');
  }
};

/**
 * Add a widget to a dashboard
 * POST /api/v1/dashboards/:id/widgets
 */
export const addWidget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = addWidgetSchema.parse(req.body);
    const userId = req.user!.userId;

    const widget = await dashboardService.addWidget(id, validatedData, userId);

    auditLogger.log('widget.create', userId, {
      widgetId: widget.id,
      dashboardId: id,
      widgetType: widget.widgetType,
    });

    return sendCreated(res, widget);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendBadRequest(res, 'Validation failed');
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Dashboard');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('addWidget', error);
    return sendServerError(res, 'Failed to add widget');
  }
};

/**
 * Update a widget
 * PUT /api/v1/dashboards/widgets/:widgetId
 */
export const updateWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const validatedData = updateWidgetSchema.parse(req.body);
    const userId = req.user!.userId;

    const widget = await dashboardService.updateWidget(widgetId, validatedData, userId);

    auditLogger.log('widget.update', userId, {
      widgetId,
      changes: validatedData,
    });

    return sendSuccess(res, widget);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendBadRequest(res, 'Validation failed');
    }
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Widget');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('updateWidget', error);
    return sendServerError(res, 'Failed to update widget');
  }
};

/**
 * Delete a widget
 * DELETE /api/v1/dashboards/widgets/:widgetId
 */
export const deleteWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const userId = req.user!.userId;

    const result = await dashboardService.deleteWidget(widgetId, userId);

    auditLogger.log('widget.delete', userId, {
      widgetId,
    });

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Widget');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('deleteWidget', error);
    return sendServerError(res, 'Failed to delete widget');
  }
};

/**
 * Get real-time widget data for a dashboard
 * GET /api/v1/dashboards/:id/data
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await dashboardService.getDashboardData(id, req.user!);
    return sendSuccess(res, data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Dashboard');
    }
    if (error instanceof ForbiddenError) {
      return sendForbidden(res, (error as Error).message);
    }
    logControllerError('getDashboardData', error);
    return sendServerError(res, 'Failed to fetch dashboard data');
  }
};
