/**
 * Row-Level Security (RLS) Middleware
 *
 * HIPAA Compliance: Ensures users can only access data they are authorized to see.
 * This implements the "Minimum Necessary" principle - users should only access
 * the minimum amount of PHI necessary for their job function.
 *
 * Access Control Rules:
 * - SUPER_ADMIN: Full access to all data
 * - ADMINISTRATOR: Full access within their organization
 * - CLINICAL_DIRECTOR: Access to all clinical data in their organization
 * - SUPERVISOR: Access to their supervisees' data
 * - CLINICIAN: Access only to their assigned clients
 * - BILLING_STAFF: Access to billing data only
 * - FRONT_DESK: Limited access to scheduling data
 * - INTERN: Access to assigned clients under supervision
 * - Portal Users: Access only to their own data
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import prisma from '../services/database';
import logger from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMINISTRATOR'
  | 'CLINICAL_DIRECTOR'
  | 'SUPERVISOR'
  | 'CLINICIAN'
  | 'BILLING_STAFF'
  | 'OFFICE_MANAGER'
  | 'FRONT_DESK'
  | 'SCHEDULER'
  | 'RECEPTIONIST'
  | 'INTERN';

export interface RLSContext {
  userId: string;
  roles: UserRole[];
  organizationId?: string;
  allowedClientIds?: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isClinicalStaff: boolean;
  isBillingStaff: boolean;
}

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/**
 * Roles that have full data access within their organization
 */
const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMINISTRATOR'];

/**
 * Roles that have clinical data access
 */
const CLINICAL_ROLES: UserRole[] = [
  'CLINICAL_DIRECTOR',
  'SUPERVISOR',
  'CLINICIAN',
  'INTERN',
];

/**
 * Roles that have billing data access
 */
const BILLING_ROLES: UserRole[] = ['BILLING_STAFF', 'OFFICE_MANAGER'];

/**
 * Roles that have scheduling data access
 */
const SCHEDULING_ROLES: UserRole[] = [
  'FRONT_DESK',
  'SCHEDULER',
  'RECEPTIONIST',
  ...CLINICAL_ROLES,
  ...ADMIN_ROLES,
];

// =============================================================================
// RLS CONTEXT BUILDER
// =============================================================================

/**
 * Build RLS context from request
 * This extracts user information and builds access control context
 */
export async function buildRLSContext(req: Request): Promise<RLSContext> {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated');
  }

  const userId = req.user.userId || req.user.id;
  const roles = (req.user.roles || [req.user.role]).filter(Boolean) as UserRole[];

  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isAdmin = roles.some(r => ADMIN_ROLES.includes(r));
  const isClinicalStaff = roles.some(r => CLINICAL_ROLES.includes(r));
  const isBillingStaff = roles.some(r => BILLING_ROLES.includes(r));

  // Organization-level filtering is not yet implemented
  // When Organization model is added, this should query the user's organizationId
  const organizationId: string | undefined = undefined;

  // For clinicians, get their assigned client IDs
  let allowedClientIds: string[] | undefined;
  if (isClinicalStaff && !isAdmin) {
    const assignments = await prisma.client.findMany({
      where: {
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
          // Include supervisees' clients for supervisors
          ...(roles.includes('SUPERVISOR') ? [{
            primaryTherapist: {
              supervisorId: userId,
            },
          }] : []),
        ],
      },
      select: { id: true },
    });
    allowedClientIds = assignments.map(a => a.id);
  }

  return {
    userId,
    roles,
    organizationId,
    allowedClientIds,
    isSuperAdmin,
    isAdmin,
    isClinicalStaff,
    isBillingStaff,
  };
}

// =============================================================================
// ACCESS CHECK FUNCTIONS
// =============================================================================

/**
 * Check if user can access a specific client's data
 */
export async function canAccessClient(
  context: RLSContext,
  clientId: string
): Promise<boolean> {
  // Super admin can access everything
  if (context.isSuperAdmin) {
    return true;
  }

  // Admin can access all clients (organization filtering not yet implemented)
  if (context.isAdmin) {
    return true;
  }

  // Clinical staff can access their assigned clients
  if (context.isClinicalStaff && context.allowedClientIds) {
    return context.allowedClientIds.includes(clientId);
  }

  // Billing staff can access clients for billing purposes
  if (context.isBillingStaff) {
    // Billing staff have limited access - only billing-related data
    return true; // Access granted, but data should be filtered
  }

  return false;
}

/**
 * Check if user can access a specific appointment
 */
export async function canAccessAppointment(
  context: RLSContext,
  appointmentId: string
): Promise<boolean> {
  if (context.isSuperAdmin) return true;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      clientId: true,
      clinicianId: true,
    },
  });

  if (!appointment) return false;

  // Admin can access all appointments (organization filtering not yet implemented)
  if (context.isAdmin) {
    return true;
  }

  // Clinician can access their own appointments
  if (appointment.clinicianId === context.userId) {
    return true;
  }

  // Clinical staff can access appointments for their assigned clients
  if (context.isClinicalStaff && context.allowedClientIds) {
    return context.allowedClientIds.includes(appointment.clientId);
  }

  // Scheduling roles can see appointments
  if (context.roles.some(r => SCHEDULING_ROLES.includes(r))) {
    return true;
  }

  return false;
}

/**
 * Check if user can access a specific clinical note
 */
export async function canAccessClinicalNote(
  context: RLSContext,
  noteId: string
): Promise<boolean> {
  if (context.isSuperAdmin) return true;

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: {
      clientId: true,
      clinicianId: true,
    },
  });

  if (!note) return false;

  // Only clinical staff and admins can access clinical notes
  if (context.isBillingStaff && !context.isAdmin) {
    return false; // Billing staff cannot see clinical notes content
  }

  // Admin can access all notes (organization filtering not yet implemented)
  if (context.isAdmin) {
    return true;
  }

  // Clinician can access their own notes
  if (note.clinicianId === context.userId) {
    return true;
  }

  // Clinical staff can access notes for their assigned clients
  if (context.isClinicalStaff && context.allowedClientIds) {
    return context.allowedClientIds.includes(note.clientId);
  }

  return false;
}

/**
 * Check if user can access billing data
 */
export async function canAccessBillingData(
  context: RLSContext,
  clientId?: string
): Promise<boolean> {
  if (context.isSuperAdmin) return true;

  // Admin and billing staff can access billing data
  if (context.isAdmin || context.isBillingStaff) {
    return true;
  }

  // Clinicians can see billing for their assigned clients
  if (context.isClinicalStaff && clientId && context.allowedClientIds) {
    return context.allowedClientIds.includes(clientId);
  }

  return false;
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

/**
 * Build Prisma where clause to filter clients based on RLS context
 */
export function buildClientFilter(context: RLSContext): Record<string, any> {
  if (context.isSuperAdmin) {
    return {}; // No filter for super admin
  }

  // Admin can see all clients (organization filtering not yet implemented)
  if (context.isAdmin) {
    return {};
  }

  if (context.isClinicalStaff && context.allowedClientIds) {
    return { id: { in: context.allowedClientIds } };
  }

  // Default: no access
  return { id: { in: [] } };
}

/**
 * Build Prisma where clause to filter appointments based on RLS context
 */
export function buildAppointmentFilter(context: RLSContext): Record<string, any> {
  if (context.isSuperAdmin) {
    return {};
  }

  // Admin can see all appointments (organization filtering not yet implemented)
  if (context.isAdmin) {
    return {};
  }

  if (context.isClinicalStaff) {
    const filters: any[] = [
      { clinicianId: context.userId },
    ];

    if (context.allowedClientIds && context.allowedClientIds.length > 0) {
      filters.push({ clientId: { in: context.allowedClientIds } });
    }

    return { OR: filters };
  }

  // Scheduling roles can see all appointments (organization filtering not yet implemented)
  if (context.roles.some(r => SCHEDULING_ROLES.includes(r))) {
    return {};
  }

  return { id: { in: [] } };
}

/**
 * Build Prisma where clause to filter clinical notes based on RLS context
 */
export function buildClinicalNoteFilter(context: RLSContext): Record<string, any> {
  if (context.isSuperAdmin) {
    return {};
  }

  // Billing staff cannot access clinical notes
  if (context.isBillingStaff && !context.isAdmin) {
    return { id: { in: [] } };
  }

  // Admin can see all notes (organization filtering not yet implemented)
  if (context.isAdmin) {
    return {};
  }

  if (context.isClinicalStaff) {
    const filters: any[] = [
      { clinicianId: context.userId },
    ];

    if (context.allowedClientIds && context.allowedClientIds.length > 0) {
      filters.push({ clientId: { in: context.allowedClientIds } });
    }

    return { OR: filters };
  }

  return { id: { in: [] } };
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

/**
 * Middleware to attach RLS context to request
 */
export const attachRLSContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      (req as any).rlsContext = await buildRLSContext(req);
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware factory to enforce client access
 */
export const enforceClientAccess = (paramName: string = 'clientId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.params[paramName] || req.body[paramName] || req.query[paramName];

      if (!clientId) {
        return next(); // No client ID to check
      }

      const context = (req as any).rlsContext || await buildRLSContext(req);
      const hasAccess = await canAccessClient(context, String(clientId));

      if (!hasAccess) {
        logger.warn('RLS: Client access denied', {
          userId: context.userId,
          clientId,
          roles: context.roles,
        });
        throw new ForbiddenError('Access denied to this client record');
      }

      // Log access for audit trail
      logger.info('RLS: Client access granted', {
        userId: context.userId,
        clientId,
        roles: context.roles,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory to enforce appointment access
 */
export const enforceAppointmentAccess = (paramName: string = 'appointmentId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params[paramName] || req.params.id;

      if (!appointmentId) {
        return next();
      }

      const context = (req as any).rlsContext || await buildRLSContext(req);
      const hasAccess = await canAccessAppointment(context, String(appointmentId));

      if (!hasAccess) {
        logger.warn('RLS: Appointment access denied', {
          userId: context.userId,
          appointmentId,
          roles: context.roles,
        });
        throw new ForbiddenError('Access denied to this appointment');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory to enforce clinical note access
 */
export const enforceClinicalNoteAccess = (paramName: string = 'noteId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noteId = req.params[paramName] || req.params.id;

      if (!noteId) {
        return next();
      }

      const context = (req as any).rlsContext || await buildRLSContext(req);
      const hasAccess = await canAccessClinicalNote(context, String(noteId));

      if (!hasAccess) {
        logger.warn('RLS: Clinical note access denied', {
          userId: context.userId,
          noteId,
          roles: context.roles,
        });
        throw new ForbiddenError('Access denied to this clinical note');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to enforce billing data access
 */
export const enforceBillingAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.params.clientId || req.body.clientId || req.query.clientId;
    const context = (req as any).rlsContext || await buildRLSContext(req);

    const hasAccess = await canAccessBillingData(context, clientId ? String(clientId) : undefined);

    if (!hasAccess) {
      logger.warn('RLS: Billing access denied', {
        userId: context.userId,
        clientId,
        roles: context.roles,
      });
      throw new ForbiddenError('Access denied to billing data');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// HELPER TO GET FILTERED QUERY
// =============================================================================

/**
 * Get a pre-filtered Prisma query for clients
 */
export function getFilteredClientQuery(context: RLSContext) {
  return {
    where: buildClientFilter(context),
  };
}

/**
 * Get a pre-filtered Prisma query for appointments
 */
export function getFilteredAppointmentQuery(context: RLSContext) {
  return {
    where: buildAppointmentFilter(context),
  };
}

/**
 * Get a pre-filtered Prisma query for clinical notes
 */
export function getFilteredClinicalNoteQuery(context: RLSContext) {
  return {
    where: buildClinicalNoteFilter(context),
  };
}

// =============================================================================
// AUDIT LOGGING FOR RLS
// =============================================================================

/**
 * Log RLS access decision for audit trail
 */
export async function logRLSAccess(
  context: RLSContext,
  resource: string,
  resourceId: string,
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE',
  granted: boolean,
  reason?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: `RLS_${action}`,
        entityType: resource,
        entityId: resourceId,
        details: {
          roles: context.roles,
          granted,
          reason: reason || (granted ? 'Access granted by RLS policy' : 'Access denied by RLS policy'),
          organizationId: context.organizationId,
        },
        ipAddress: 'system',
        userAgent: 'RLS-Middleware',
      },
    });
  } catch (error) {
    logger.error('Failed to log RLS access', { error, context, resource, resourceId });
  }
}
