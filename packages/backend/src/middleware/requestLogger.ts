import { Request, Response, NextFunction } from 'express';
import { logRequest, performanceLogger } from '../utils/logger';

/**
 * Enhanced request logger middleware with performance tracking
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Generate correlation ID for request tracking
  const correlationId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).correlationId = correlationId;

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-Id', correlationId);

  // Capture response data
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Use the enhanced logRequest helper
    logRequest(req, res, duration);

    // Log slow queries separately for monitoring
    if (duration > 5000) {
      performanceLogger.error('Very slow request (>5s)', {
        correlationId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        userId: (req as any).user?.userId,
      });
    }
  });

  next();
};
