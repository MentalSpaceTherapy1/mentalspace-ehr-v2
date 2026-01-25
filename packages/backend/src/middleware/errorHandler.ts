import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';

// Type definitions for external library errors to avoid `as any` casts
interface PrismaClientError extends Error {
  code?: string;
  meta?: { target?: string | string[] };
}

interface ZodValidationError extends Error {
  errors: Array<{
    path: (string | number)[];
    message: string;
    code: string;
  }>;
}

// Generate unique error ID for tracking
const generateErrorId = () => {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorId = generateErrorId();

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode: string | undefined;
  let errors: any = undefined;
  let metadata: any = undefined;

  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    metadata = err.metadata;
  }

  // Handle Prisma errors with comprehensive coverage
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as PrismaClientError;
    errorCode = 'DATABASE_ERROR';

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409;
        message = 'A record with this value already exists';
        errors = { field: prismaError.meta?.target };
        errorCode = 'DUPLICATE_RECORD';
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        message = 'Record not found';
        errorCode = 'RECORD_NOT_FOUND';
        break;
      case 'P2003': // Foreign key constraint failed
        statusCode = 400;
        message = 'Related record not found';
        errorCode = 'FOREIGN_KEY_CONSTRAINT';
        break;
      case 'P2014': // Required relation violation
        statusCode = 400;
        message = 'The change violates a required relation';
        errorCode = 'RELATION_VIOLATION';
        break;
      case 'P2015': // Related record not found
        statusCode = 404;
        message = 'A related record could not be found';
        errorCode = 'RELATED_RECORD_NOT_FOUND';
        break;
      case 'P2021': // Table does not exist
        statusCode = 500;
        message = 'Database schema error';
        errorCode = 'SCHEMA_ERROR';
        break;
      case 'P2022': // Column does not exist
        statusCode = 500;
        message = 'Database column not found';
        errorCode = 'COLUMN_NOT_FOUND';
        break;
      default:
        statusCode = 500;
        message = 'Database operation failed';
        metadata = { prismaCode: prismaError.code };
    }
  }

  // Handle Prisma validation errors
  if (err.constructor.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Invalid data provided';
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle Prisma initialization errors
  if (err.constructor.name === 'PrismaClientInitializationError') {
    statusCode = 503;
    message = 'Database connection failed';
    errorCode = 'DATABASE_CONNECTION_ERROR';
  }

  // Handle Zod validation errors with detailed field-level errors
  if (err.constructor.name === 'ZodError') {
    const zodError = err as ZodValidationError;
    statusCode = 400;
    message = 'Validation error';
    errorCode = 'VALIDATION_ERROR';
    errors = zodError.errors.map((e) => ({
      path: e.path,
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
  }

  // Handle JSON syntax errors
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    errorCode = 'INVALID_JSON';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Extract user information for logging
  const userId = req.user?.userId;
  const userRole = req.user?.roles?.join(',');

  // Comprehensive error logging
  const logContext = {
    errorId,
    errorCode,
    statusCode,
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId,
    userRole,
    metadata,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    logger.error('Internal server error', {
      ...logContext,
      stack: err.stack,
      error: err,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error', logContext);
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    message,
    errorId,
  };

  if (errorCode) {
    errorResponse.errorCode = errorCode;
  }

  if (errors) {
    errorResponse.errors = errors;
  }

  if (metadata) {
    errorResponse.metadata = metadata;
  }

  // Include stack trace and additional debug info in development
  if (config.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.debug = {
      originalError: err.message,
      errorType: err.constructor.name,
    };
  }

  // Set appropriate headers
  res.setHeader('X-Error-Id', errorId);

  res.status(statusCode).json(errorResponse);
};

// Handle 404 errors with detailed information
export const notFoundHandler = (req: Request, res: Response) => {
  const errorId = generateErrorId();

  logger.warn('Route not found', {
    errorId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    errorCode: 'ROUTE_NOT_FOUND',
    errorId,
  });
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Process-level error handlers
export const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    type: 'UNCAUGHT_EXCEPTION',
  });

  // Give logger time to flush, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};

export const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    type: 'UNHANDLED_REJECTION',
  });
};

// Graceful shutdown handler
export const handleGracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Close server connections, database pools, etc.
  setTimeout(() => {
    logger.info('Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};
