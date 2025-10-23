import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../utils/logger';

/**
 * PHI Access Audit Logging Middleware
 *
 * HIPAA Requirement: All access to Protected Health Information (PHI) must be logged
 * This middleware logs all successful PHI access for audit trail purposes
 *
 * Implementation:
 * - Logs successful GET, POST, PUT, DELETE requests to PHI endpoints
 * - Captures user ID, resource type, resource ID, action, IP, timestamp
 * - Only logs successful requests (status < 400)
 * - Stores in secure audit log with 90-day retention
 */

export const auditPHIAccess = (resourceType: 'CLIENT' | 'CLINICAL_NOTE' | 'APPOINTMENT' | 'INSURANCE' | 'DOCUMENT') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capture response time
    const startTime = Date.now();

    // Intercept response send to log after processing
    const originalSend = res.send;
    const originalJson = res.json;

    const logAccess = () => {
      // Only log successful requests (not errors)
      if (res.statusCode < 400) {
        const duration = Date.now() - startTime;

        auditLogger.info('PHI Access', {
          // User information
          userId: (req as any).user?.userId || 'anonymous',
          userRole: (req as any).user?.roles?.join(',') || 'unknown',

          // Resource information
          resourceType,
          resourceId: req.params.id || req.params.clientId || 'list',
          action: req.method,

          // Request details
          path: req.path,
          query: req.query,
          ip: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),

          // Response details
          statusCode: res.statusCode,
          duration,

          // Timestamp
          timestamp: new Date().toISOString(),

          // Compliance tag
          complianceType: 'HIPAA_PHI_ACCESS',
        });
      }
    };

    res.send = function (data) {
      logAccess();
      return originalSend.call(this, data);
    };

    res.json = function (data) {
      logAccess();
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * PHI Modification Audit Logging
 * Logs creation, update, and deletion of PHI records
 */
export const auditPHIModification = (
  resourceType: 'CLIENT' | 'CLINICAL_NOTE' | 'APPOINTMENT' | 'INSURANCE' | 'DOCUMENT',
  action: 'CREATE' | 'UPDATE' | 'DELETE'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    const logModification = () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        auditLogger.info('PHI Modification', {
          userId: (req as any).user?.userId,
          userRole: (req as any).user?.roles?.join(','),
          resourceType,
          resourceId: req.params.id || 'new',
          action,
          path: req.path,
          ip: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString(),
          complianceType: 'HIPAA_PHI_MODIFICATION',
        });
      }
    };

    res.send = function (data) {
      logModification();
      return originalSend.call(this, data);
    };

    res.json = function (data) {
      logModification();
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Failed Access Attempt Logging
 * Logs all failed authentication/authorization attempts
 */
export const logFailedAccess = (req: Request, reason: string) => {
  auditLogger.warn('Failed PHI Access Attempt', {
    userId: (req as any).user?.userId || 'anonymous',
    reason,
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
    complianceType: 'HIPAA_ACCESS_DENIED',
  });
};
