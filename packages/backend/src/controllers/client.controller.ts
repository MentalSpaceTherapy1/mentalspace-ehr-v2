/**
 * Client Controller
 * Phase 3.2: Refactored to thin controller pattern
 *
 * Handles HTTP request/response only - all business logic delegated to clientService
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { clientService } from '../services/client.service';
import logger, { logControllerError } from '../utils/logger';
import { sanitizeSearchInput, sanitizePagination } from '../utils/sanitize';
import { AppError } from '../utils/errors';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode, getErrorCodeString } from '../utils/errorHelpers';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNotFound,
  sendValidationError,
  sendError,
  sendServerError,
  calculatePagination,
} from '../utils/apiResponse';
import { ClientStatus } from '@prisma/client';

/**
 * Get all clients with search and filters
 * GET /api/clients
 */
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const { search, status, therapistId, page, limit } = req.query;

    // Sanitize inputs
    const pagination = sanitizePagination(
      typeof page === 'string' ? page : undefined,
      typeof limit === 'string' ? limit : undefined
    );

    const sanitizedSearch = search ? sanitizeSearchInput(search as string) : undefined;

    // Validate status if provided
    const validatedStatus = status && Object.values(ClientStatus).includes(status as ClientStatus)
      ? (status as ClientStatus)
      : undefined;

    // Delegate to service (req.user is guaranteed by auth middleware)
    const result = await clientService.getClients(
      {
        search: sanitizedSearch,
        status: validatedStatus,
        therapistId: therapistId as string,
        page: pagination.page,
        limit: pagination.limit,
      },
      req.user!
    );

    return sendPaginated(
      res,
      result.clients,
      calculatePagination(result.pagination.page, result.pagination.limit, result.pagination.total)
    );
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get clients error', error, {
      userId: req.user?.userId,
      url: req.url,
    });
    return sendServerError(res, 'Failed to retrieve clients', errorId);
  }
};

/**
 * Get client by ID
 * GET /api/clients/:id
 */
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await clientService.getClientById(id, req.user!);

    return sendSuccess(res, client);
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error) === 'Client not found') {
        return sendNotFound(res, 'Client');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get client error', error, {
      userId: req.user?.userId,
      clientId: req.params.id,
    });
    return sendServerError(res, 'Failed to retrieve client', errorId);
  }
};

/**
 * Create new client
 * POST /api/clients
 */
export const createClient = async (req: Request, res: Response) => {
  logger.debug('Client create request received', {
    userId: req.user?.userId,
    bodyKeys: Object.keys(req.body || {}),
  });

  try {
    const userId = req.user!.userId;

    const client = await clientService.createClient(req.body, userId);

    return sendCreated(res, client, 'Client created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));

      logger.warn('Client creation validation failed', {
        errors: formattedErrors,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.userId,
      });

      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    // Type-safe error property access for Prisma errors
    const prismaError = error as { code?: string; meta?: unknown };
    logger.error('Create client error', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? getErrorMessage(error) : String(error),
      prismaCode: prismaError?.code,
      prismaMeta: prismaError?.meta,
      userId: req.user?.userId,
      requestBody: Object.keys(req.body || {}),
    });

    const errorId = logControllerError('Create client error', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create client', errorId);
  }
};

/**
 * Update client
 * PUT /api/clients/:id
 */
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const client = await clientService.updateClient(id, req.body, userId);

    return sendSuccess(res, client, 'Client updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error) === 'Client not found') {
        return sendNotFound(res, 'Client');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Update client error', error, {
      userId: req.user?.userId,
      clientId: req.params.id,
    });
    return sendServerError(res, 'Failed to update client', errorId);
  }
};

/**
 * Delete client (soft delete by setting status to INACTIVE)
 * DELETE /api/clients/:id
 */
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const client = await clientService.deleteClient(id, userId);

    return sendSuccess(res, client, 'Client deactivated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error) === 'Client not found') {
        return sendNotFound(res, 'Client');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Delete client error', error, {
      userId: req.user?.userId,
      clientId: req.params.id,
    });
    return sendServerError(res, 'Failed to deactivate client', errorId);
  }
};

/**
 * Get client statistics
 * GET /api/clients/stats
 */
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const stats = await clientService.getClientStats(req.user!);

    return sendSuccess(res, stats);
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get client stats error', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve client statistics', errorId);
  }
};
