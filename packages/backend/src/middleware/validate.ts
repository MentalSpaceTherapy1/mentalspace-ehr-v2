import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

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
        }));

        const err = new ValidationError('Validation failed');
        (err as any).errors = errors;
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

        const err = new ValidationError('Query validation failed');
        (err as any).errors = errors;
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

        const err = new ValidationError('Parameter validation failed');
        (err as any).errors = errors;
        next(err);
      } else {
        next(error);
      }
    }
  };
};
