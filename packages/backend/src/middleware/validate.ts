import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';

// Extend ValidationError to include errors array
interface ValidationErrorWithDetails extends ValidationError {
  errors?: { path: string; message: string; code?: string; received?: string }[];
}

/**
 * Middleware to validate request body against Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
          received: e.message.includes('Required') ? 'undefined/empty' : 'invalid format',
        }));

        logger.warn('Validation failed', {
          path: req.originalUrl,
          method: req.method,
          errors,
          userId: req.user?.userId,
        });

        const err = new ValidationError('Validation failed') as ValidationErrorWithDetails;
        err.errors = errors;
        next(err);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware to validate request query parameters against Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));

        logger.warn('Query validation failed', {
          path: req.originalUrl,
          method: req.method,
          errors,
          userId: req.user?.userId,
        });

        const err = new ValidationError('Query validation failed') as ValidationErrorWithDetails;
        err.errors = errors;
        next(err);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware to validate request params against Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));

        logger.warn('Parameter validation failed', {
          path: req.originalUrl,
          method: req.method,
          errors,
          userId: req.user?.userId,
        });

        const err = new ValidationError('Parameter validation failed') as ValidationErrorWithDetails;
        err.errors = errors;
        next(err);
      } else {
        next(error);
      }
    }
  };
};
