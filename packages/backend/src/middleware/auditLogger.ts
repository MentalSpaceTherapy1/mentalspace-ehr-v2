import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import prisma from '../services/database';

/**
 * HIPAA Audit Logging Middleware
 *
 * HIPAA Security Rule requires audit controls that record and examine
 * activity in information systems containing PHI.
 *
 * This middleware logs:
 * - Who accessed/modified PHI (userId)
 * - What was accessed/modified (entity type and ID)
 * - When it occurred (timestamp)
 * - What action was performed (view, create, update, delete)
 * - IP address and user agent
 * - Success or failure status
 */

// Define audit types locally since they're not in Prisma schema
export type AuditAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'DENY' | 'SUBMIT' | 'SIGN';
export type AuditEntityType =
  | 'Client'
  | 'Appointment'
  | 'ClinicalNote'
  | 'User'
  | 'Insurance'
  | 'Other'
  // HR-specific entity types
  | 'Staff'
  | 'PTORequest'
  | 'PerformanceReview'
  | 'TimeAttendance'
  | 'Training'
  | 'Credential'
  | 'Onboarding';

export interface AuditLogOptions {
  entityType: AuditEntityType;
  action: AuditAction;
  requireEntityId?: boolean; // If true, entityId must be present in request
}

/**
 * Create audit log middleware for specific entity and action
 */
export const auditLog = (options: AuditLogOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();

    // Override res.send to capture the response
    res.send = function (data: any): Response {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Log the audit record asynchronously (don't block the response)
      // Use 'unknown' as fallback if entityId cannot be extracted (e.g., list endpoints)
      createAuditLog({
        userId: req.user?.userId || null,
        entityType: options.entityType,
        entityId: extractEntityId(req) || 'unknown',
        action: options.action,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent') || null,
        success,
        statusCode: res.statusCode,
        duration,
        details: getAuditDetails(req, options.action),
      }).catch((error) => {
        // Log error but don't fail the request
        logger.error('Failed to create audit log', { error, userId: req.user?.userId });
      });

      // Call the original send
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Extract entity ID from request params or body
 */
function extractEntityId(req: Request): string | null {
  // Try params first (e.g., /clients/:id)
  if (req.params.id) {
    return req.params.id;
  }

  // Try params with different names
  if (req.params.clientId) return req.params.clientId;
  if (req.params.noteId) return req.params.noteId;
  if (req.params.appointmentId) return req.params.appointmentId;
  if (req.params.userId) return req.params.userId;

  // For POST requests, might be in response (handled in controller)
  return null;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Get audit details based on action and request
 */
function getAuditDetails(req: Request, action: AuditAction): any {
  const details: any = {
    method: req.method,
    path: req.path,
    query: req.query,
  };

  // For update/delete actions, include what changed (but sanitize sensitive data)
  if (action === 'UPDATE' && req.body) {
    details.updatedFields = Object.keys(req.body).filter(
      (key) => !['password', 'ssn', 'creditCard'].includes(key)
    );
  }

  return details;
}

/**
 * Create an audit log entry in the database
 */
async function createAuditLog(data: {
  userId: string | null;
  entityType: AuditEntityType;
  entityId: string | null;
  action: AuditAction;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  statusCode: number;
  duration: number;
  details: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        changes: {
          success: data.success,
          statusCode: data.statusCode,
          duration: data.duration,
          ...data.details,
        },
      },
    });

    logger.info('Audit log created', {
      userId: data.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      success: data.success,
    });
  } catch (error) {
    // Critical: audit logging failure should be escalated
    logger.error('CRITICAL: Failed to create audit log', {
      error,
      auditData: data,
    });

    // In production, this should trigger an alert
    // For now, log to console as well
    console.error('AUDIT LOG FAILURE:', error);
  }
}

/**
 * Audit log for PHI access (viewing client data)
 * This should be called in controllers when sensitive data is accessed
 */
export const logPhiAccess = async (
  userId: string,
  entityType: AuditEntityType,
  entityId: string,
  action: AuditAction,
  req: Request,
  success: boolean = true
) => {
  await createAuditLog({
    userId,
    entityType,
    entityId,
    action,
    ipAddress: getClientIp(req),
    userAgent: req.get('user-agent') || null,
    success,
    statusCode: success ? 200 : 403,
    duration: 0,
    details: {
      method: req.method,
      path: req.path,
    },
  });
};

/**
 * Export audit failed access attempt (for security monitoring)
 */
export const logFailedAccess = async (
  userId: string | null,
  entityType: AuditEntityType,
  entityId: string | null,
  action: AuditAction,
  req: Request,
  reason: string
) => {
  await createAuditLog({
    userId,
    entityType,
    entityId,
    action,
    ipAddress: getClientIp(req),
    userAgent: req.get('user-agent') || null,
    success: false,
    statusCode: 403,
    duration: 0,
    details: {
      method: req.method,
      path: req.path,
      reason,
    },
  });

  logger.warn('Failed access attempt', {
    userId,
    entityType,
    entityId,
    action,
    reason,
    ip: getClientIp(req),
  });
};
