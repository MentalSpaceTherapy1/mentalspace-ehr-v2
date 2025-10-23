import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  RateLimitError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 400);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should have default status code of 500', () => {
      const error = new AppError('Test');

      expect(error.statusCode).toBe(500);
    });

    it('should have errorCode when provided', () => {
      const error = new AppError('Test', 400, true, 'TEST_ERROR');

      expect(error.errorCode).toBe('TEST_ERROR');
    });

    it('should have metadata when provided', () => {
      const metadata = { field: 'value' };
      const error = new AppError('Test', 400, true, undefined, metadata);

      expect(error.metadata).toEqual(metadata);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should accept metadata', () => {
      const metadata = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid', metadata);

      expect(error.metadata).toEqual(metadata);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('Resource not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
    });

    it('should have default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError('Not authenticated');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Not authenticated');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
    });

    it('should have default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should create forbidden error with 403 status', () => {
      const error = new ForbiddenError('No permission');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No permission');
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('FORBIDDEN');
    });

    it('should have default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with 409 status', () => {
      const error = new ConflictError('Duplicate resource');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Duplicate resource');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
    });
  });

  describe('BadRequestError', () => {
    it('should create bad request error with 400 status', () => {
      const error = new BadRequestError('Bad request');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('BAD_REQUEST');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with 429 status', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should have default message', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
    });

    it('should accept custom message', () => {
      const error = new RateLimitError('Rate limit exceeded for API');

      expect(error.message).toBe('Rate limit exceeded for API');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create service unavailable error with 503 status', () => {
      const error = new ServiceUnavailableError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('SERVICE_UNAVAILABLE');
    });

    it('should have default message', () => {
      const error = new ServiceUnavailableError();

      expect(error.message).toBe('Service temporarily unavailable');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with 500 status', () => {
      const error = new DatabaseError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('DATABASE_ERROR');
    });

    it('should have default message', () => {
      const error = new DatabaseError();

      expect(error.message).toBe('Database operation failed');
    });

    it('should accept custom message', () => {
      const error = new DatabaseError('Connection timeout');

      expect(error.message).toBe('Connection timeout');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with 502 status', () => {
      const error = new ExternalServiceError('Third-party API failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Third-party API failed');
      expect(error.statusCode).toBe(502);
      expect(error.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('Error throwing and catching', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw new ValidationError('Test validation');
      }).toThrow('Test validation');
    });

    it('should be instanceof Error', () => {
      const error = new NotFoundError();

      expect(error instanceof Error).toBe(true);
    });

    it('should preserve stack trace', () => {
      const error = new AppError('Test', 500);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should be catchable with try-catch', () => {
      try {
        throw new UnauthorizedError('Not logged in');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).statusCode).toBe(401);
      }
    });
  });

  describe('Error metadata', () => {
    it('should allow passing metadata', () => {
      const metadata = { userId: '123', action: 'delete' };
      const error = new ForbiddenError('Cannot delete', metadata);

      expect(error.metadata).toEqual(metadata);
    });

    it('should work without metadata', () => {
      const error = new ValidationError('Error');

      expect(error.metadata).toBeUndefined();
    });
  });

  describe('Operational errors', () => {
    it('should mark errors as operational by default', () => {
      const error = new AppError('Test', 500);

      expect(error.isOperational).toBe(true);
    });

    it('should allow non-operational errors', () => {
      const error = new AppError('Programming error', 500, false);

      expect(error.isOperational).toBe(false);
    });
  });
});
