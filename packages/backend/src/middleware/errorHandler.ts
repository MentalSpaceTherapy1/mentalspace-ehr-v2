import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;

  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    statusCode = 400;

    if (prismaError.code === 'P2002') {
      message = 'A record with this value already exists';
      errors = { field: prismaError.meta?.target };
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      message = 'Database error';
    }
  }

  // Handle Zod validation errors
  if (err.constructor.name === 'ZodError') {
    const zodError = err as any;
    statusCode = 400;
    message = 'Validation error';
    errors = zodError.errors.map((e: any) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Internal server error', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      url: req.url,
      method: req.method,
      statusCode,
    });
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    message,
  };

  if (errors) {
    errorResponse.errors = errors;
  }

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Handle 404 errors
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
};
