import { Response } from 'express';

/**
 * Standardized API Response Utilities
 *
 * Provides consistent response format across all controllers.
 * All responses follow the structure:
 * {
 *   success: boolean,
 *   data?: T,
 *   message?: string,
 *   errorCode?: string,
 *   errorId?: string,
 *   pagination?: PaginationInfo
 * }
 */

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  errorId?: string;
  pagination?: PaginationInfo;
}

/**
 * Create a success response object
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  const response: ApiResponse<T> = { success: true, data };
  if (message) response.message = message;
  return response;
}

/**
 * Create an error response object
 */
export function errorResponse(
  message: string,
  errorCode?: string,
  errorId?: string
): ApiResponse<never> {
  const response: ApiResponse<never> = { success: false, message };
  if (errorCode) response.errorCode = errorCode;
  if (errorId) response.errorId = errorId;
  return response;
}

/**
 * Create a paginated response object
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message?: string
): ApiResponse<T[]> {
  const response: ApiResponse<T[]> = { success: true, data, pagination };
  if (message) response.message = message;
  return response;
}

/**
 * Send a success response (200 OK)
 */
export function sendSuccess<T>(res: Response, data: T, message?: string): Response {
  return res.status(200).json(successResponse(data, message));
}

/**
 * Send a created response (201 Created)
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return res.status(201).json(successResponse(data, message || 'Created successfully'));
}

/**
 * Send a paginated success response (200 OK)
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationInfo
): Response {
  return res.status(200).json(paginatedResponse(data, pagination));
}

/**
 * Send an error response with appropriate status code
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  errorCode?: string,
  errorId?: string
): Response {
  return res.status(statusCode).json(errorResponse(message, errorCode, errorId));
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(res: Response, entity: string = 'Resource'): Response {
  return sendError(res, 404, `${entity} not found`, 'NOT_FOUND');
}

/**
 * Send a bad request error (400)
 */
export function sendBadRequest(res: Response, message: string, errorCode?: string): Response {
  return sendError(res, 400, message, errorCode || 'BAD_REQUEST');
}

/**
 * Send a validation error (400)
 */
export function sendValidationError(
  res: Response,
  errors: Array<{ path: string; message: string; code?: string }>
): Response {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}

/**
 * Send an unauthorized error (401)
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): Response {
  return sendError(res, 401, message, 'UNAUTHORIZED');
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(res: Response, message: string = 'Access denied'): Response {
  return sendError(res, 403, message, 'FORBIDDEN');
}

/**
 * Send a conflict error (409)
 */
export function sendConflict<T = unknown>(
  res: Response,
  message: string = 'Conflict',
  data?: T
): Response {
  const response: ApiResponse<T> = {
    success: false,
    message,
    errorCode: 'CONFLICT',
  };
  if (data !== undefined) {
    response.data = data;
  }
  return res.status(409).json(response);
}

/**
 * Send a server error (500)
 */
export function sendServerError(
  res: Response,
  message: string = 'Internal server error',
  errorId?: string
): Response {
  return sendError(res, 500, message, 'SERVER_ERROR', errorId);
}

/**
 * Calculate pagination info from query params
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export default {
  successResponse,
  errorResponse,
  paginatedResponse,
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendServerError,
  calculatePagination,
};
