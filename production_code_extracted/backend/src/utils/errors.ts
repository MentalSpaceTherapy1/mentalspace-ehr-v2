export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errorCode?: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, true, 'VALIDATION_ERROR', metadata);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', metadata?: Record<string, any>) {
    super(message, 401, true, 'UNAUTHORIZED', metadata);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', metadata?: Record<string, any>) {
    super(message, 403, true, 'FORBIDDEN', metadata);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', metadata?: Record<string, any>) {
    super(message, 404, true, 'NOT_FOUND', metadata);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 409, true, 'CONFLICT', metadata);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, true, 'BAD_REQUEST', metadata);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', metadata?: Record<string, any>) {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED', metadata);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', metadata?: Record<string, any>) {
    super(message, 503, true, 'SERVICE_UNAVAILABLE', metadata);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', metadata?: Record<string, any>) {
    super(message, 500, true, 'DATABASE_ERROR', metadata);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 502, true, 'EXTERNAL_SERVICE_ERROR', metadata);
  }
}
