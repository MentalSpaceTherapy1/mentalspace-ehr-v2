/**
 * Access Control Service
 *
 * HIPAA Compliance: Implements the "Minimum Necessary" principle
 * ensuring users can only access the minimum PHI required for their role.
 *
 * Enhanced with Row-Level Security (RLS) context for comprehensive access control.
 */

import prisma from './database';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { JwtPayload } from '../utils/jwt';
import logger from '../utils/logger';

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/**
 * Roles that have full data access within their organization
 */
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'] as const;

/**
 * Roles that have clinical data access
 */
const CLINICAL_ROLES = ['CLINICAL_DIRECTOR', 'SUPERVISOR', 'CLINICIAN', 'INTERN'] as const;

/**
 * Roles that have billing data access
 */
const BILLING_ROLES = ['BILLING_STAFF', 'OFFICE_MANAGER'] as const;

/**
 * Roles that have scheduling data access
 */
const SCHEDULING_ROLES = [
  'FRONT_DESK',
  'SCHEDULER',
  'RECEPTIONIST',
  ...CLINICAL_ROLES,
  ...ADMIN_ROLES,
] as const;

// =============================================================================
// ROLE CHECKS
// =============================================================================

const hasRole = (user: JwtPayload | undefined, role: string) =>
  Boolean(user?.roles?.includes(role) || user?.role === role);

const hasAnyRole = (user: JwtPayload | undefined, roles: readonly string[]) =>
  roles.some(role => hasRole(user, role));

export const isSuperAdmin = (user: JwtPayload | undefined) =>
  hasRole(user, 'SUPER_ADMIN');

export const isAdministrator = (user: JwtPayload | undefined) =>
  hasAnyRole(user, ADMIN_ROLES);

export const isSupervisor = (user: JwtPayload | undefined) =>
  hasRole(user, 'SUPERVISOR');

export const isClinicalDirector = (user: JwtPayload | undefined) =>
  hasRole(user, 'CLINICAL_DIRECTOR');

export const isClinician = (user: JwtPayload | undefined) =>
  hasRole(user, 'CLINICIAN');

export const isIntern = (user: JwtPayload | undefined) =>
  hasRole(user, 'INTERN');

export const isBillingStaff = (user: JwtPayload | undefined) =>
  hasAnyRole(user, BILLING_ROLES);

export const isFrontDesk = (user: JwtPayload | undefined) =>
  hasAnyRole(user, ['FRONT_DESK', 'SCHEDULER', 'RECEPTIONIST']);

export const isClinicalStaff = (user: JwtPayload | undefined) =>
  hasAnyRole(user, CLINICAL_ROLES);

export const hasSchedulingAccess = (user: JwtPayload | undefined) =>
  hasAnyRole(user, SCHEDULING_ROLES);

// =============================================================================
// RLS CONTEXT
// =============================================================================

export interface RLSContext {
  userId: string;
  roles: string[];
  organizationId?: string;
  allowedClientIds?: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isClinicalStaff: boolean;
  isBillingStaff: boolean;
}

/**
 * Build RLS context for a user
 * Caches allowed client IDs to avoid repeated database queries
 */
export const buildRLSContext = async (user: JwtPayload | undefined): Promise<RLSContext> => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;
  const roles = user.roles || (user.role ? [user.role] : []);

  const userIsSuperAdmin = isSuperAdmin(user);
  const userIsAdmin = isAdministrator(user);
  const userIsClinicalStaff = isClinicalStaff(user);
  const userIsBillingStaff = isBillingStaff(user);

  // Get user's organization
  let organizationId: string | undefined;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  organizationId = dbUser?.organizationId || undefined;

  // For clinical staff (non-admin), get their assigned client IDs
  let allowedClientIds: string[] | undefined;
  if (userIsClinicalStaff && !userIsAdmin) {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
          // Include supervisees' clients for supervisors
          ...(isSupervisor(user)
            ? [
                {
                  primaryTherapist: {
                    supervisorId: userId,
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    allowedClientIds = clients.map(c => c.id);
  }

  return {
    userId,
    roles,
    organizationId,
    allowedClientIds,
    isSuperAdmin: userIsSuperAdmin,
    isAdmin: userIsAdmin,
    isClinicalStaff: userIsClinicalStaff,
    isBillingStaff: userIsBillingStaff,
  };
};

// =============================================================================
// CLIENT ACCESS
// =============================================================================

export interface ClientAccessContext {
  clientId: string;
  allowBillingView?: boolean;
  clientRecord?: {
    primaryTherapistId: string | null;
    secondaryTherapistId?: string | null;
    organizationId?: string | null;
  } | null;
}

/**
 * Ensure the current user can access the specified client record.
 *
 * Access rules:
 * - SUPER_ADMIN: Full access to all clients
 * - ADMINISTRATOR: Access to clients in their organization
 * - CLINICAL_DIRECTOR: Access to all clinical data in their organization
 * - SUPERVISOR: Access to their own clients + supervisees' clients
 * - CLINICIAN: Access only to their assigned clients
 * - BILLING_STAFF: Access to billing data only (when allowBillingView is true)
 * - INTERN: Access to assigned clients under supervision
 */
export const assertCanAccessClient = async (
  user: JwtPayload | undefined,
  options: ClientAccessContext
) => {
  const { clientId, allowBillingView = false, clientRecord } = options;

  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // SUPER_ADMIN has full access
  if (isSuperAdmin(user)) {
    logAccess(userId, 'client', clientId, 'SUPER_ADMIN', true);
    return;
  }

  // Get client record if not provided
  const client =
    clientRecord ??
    (await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        primaryTherapistId: true,
        secondaryTherapistId: true,
        organizationId: true,
      },
    }));

  if (!client) {
    logAccess(userId, 'client', clientId, 'CLIENT_NOT_FOUND', false);
    throw new ForbiddenError('Client access denied');
  }

  // ADMINISTRATOR access within their organization
  if (isAdministrator(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId && client.organizationId === dbUser.organizationId) {
      logAccess(userId, 'client', clientId, 'ADMINISTRATOR', true);
      return;
    }
    // Admin cannot access clients from other organizations
    logAccess(userId, 'client', clientId, 'ADMIN_WRONG_ORG', false);
    throw new ForbiddenError('Client access denied');
  }

  // Billing staff can view client for billing purposes
  if (allowBillingView && isBillingStaff(user)) {
    logAccess(userId, 'client', clientId, 'BILLING_STAFF', true);
    return;
  }

  // Clinical staff checks
  if (isClinicalStaff(user)) {
    // Direct assignment (primary or secondary therapist)
    if (client.primaryTherapistId === userId || client.secondaryTherapistId === userId) {
      logAccess(userId, 'client', clientId, 'ASSIGNED_CLINICIAN', true);
      return;
    }

    // Supervisor can access supervisees' clients
    if (isSupervisor(user)) {
      const superviseeClient = await prisma.client.findFirst({
        where: {
          id: clientId,
          primaryTherapist: {
            supervisorId: userId,
          },
        },
      });

      if (superviseeClient) {
        logAccess(userId, 'client', clientId, 'SUPERVISOR_SUPERVISEE', true);
        return;
      }
    }

    // Clinical director has access to all in organization
    if (isClinicalDirector(user)) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (dbUser?.organizationId && client.organizationId === dbUser.organizationId) {
        logAccess(userId, 'client', clientId, 'CLINICAL_DIRECTOR', true);
        return;
      }
    }
  }

  logAccess(userId, 'client', clientId, 'DENIED', false);
  throw new ForbiddenError('Client access denied');
};

// =============================================================================
// CLINICAL NOTE ACCESS
// =============================================================================

export interface ClinicalNoteAccessContext {
  noteId: string;
  noteRecord?: {
    clientId: string;
    clinicianId: string;
    client?: { organizationId?: string | null } | null;
  } | null;
}

/**
 * Ensure the current user can access the specified clinical note.
 *
 * Access rules:
 * - SUPER_ADMIN: Full access
 * - ADMINISTRATOR: Access to notes in their organization
 * - CLINICAL_DIRECTOR: Access to all notes in their organization
 * - SUPERVISOR: Access to their own notes + supervisees' notes
 * - CLINICIAN: Access to their own notes + notes for assigned clients
 * - BILLING_STAFF: NO ACCESS to clinical note content (PHI protection)
 */
export const assertCanAccessClinicalNote = async (
  user: JwtPayload | undefined,
  options: ClinicalNoteAccessContext
) => {
  const { noteId, noteRecord } = options;

  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // SUPER_ADMIN has full access
  if (isSuperAdmin(user)) {
    logAccess(userId, 'clinicalNote', noteId, 'SUPER_ADMIN', true);
    return;
  }

  // Billing staff CANNOT access clinical notes - HIPAA protection
  if (isBillingStaff(user) && !isAdministrator(user)) {
    logAccess(userId, 'clinicalNote', noteId, 'BILLING_STAFF_DENIED', false);
    throw new ForbiddenError('Clinical note access denied');
  }

  // Get note record if not provided
  const note =
    noteRecord ??
    (await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      select: {
        clientId: true,
        clinicianId: true,
        client: { select: { organizationId: true } },
      },
    }));

  if (!note) {
    logAccess(userId, 'clinicalNote', noteId, 'NOTE_NOT_FOUND', false);
    throw new ForbiddenError('Clinical note access denied');
  }

  // Administrator access within their organization
  if (isAdministrator(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId && note.client?.organizationId === dbUser.organizationId) {
      logAccess(userId, 'clinicalNote', noteId, 'ADMINISTRATOR', true);
      return;
    }
    logAccess(userId, 'clinicalNote', noteId, 'ADMIN_WRONG_ORG', false);
    throw new ForbiddenError('Clinical note access denied');
  }

  // The clinician who created the note always has access
  if (note.clinicianId === userId) {
    logAccess(userId, 'clinicalNote', noteId, 'NOTE_AUTHOR', true);
    return;
  }

  // Clinical staff can access notes for their assigned clients
  if (isClinicalStaff(user)) {
    // Check if user is assigned to this client
    const clientAssignment = await prisma.client.findFirst({
      where: {
        id: note.clientId,
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
          // Supervisors can access supervisees' client notes
          ...(isSupervisor(user)
            ? [
                {
                  primaryTherapist: {
                    supervisorId: userId,
                  },
                },
              ]
            : []),
        ],
      },
    });

    if (clientAssignment) {
      logAccess(userId, 'clinicalNote', noteId, 'CLIENT_ASSIGNED', true);
      return;
    }

    // Clinical director has access to all notes in organization
    if (isClinicalDirector(user)) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (dbUser?.organizationId && note.client?.organizationId === dbUser.organizationId) {
        logAccess(userId, 'clinicalNote', noteId, 'CLINICAL_DIRECTOR', true);
        return;
      }
    }
  }

  logAccess(userId, 'clinicalNote', noteId, 'DENIED', false);
  throw new ForbiddenError('Clinical note access denied');
};

// =============================================================================
// APPOINTMENT ACCESS
// =============================================================================

export interface AppointmentAccessContext {
  appointmentId: string;
  appointmentRecord?: {
    clientId: string;
    clinicianId: string;
    organizationId?: string | null;
  } | null;
}

/**
 * Ensure the current user can access the specified appointment.
 *
 * Access rules:
 * - SUPER_ADMIN: Full access
 * - ADMINISTRATOR: Access to appointments in their organization
 * - CLINICAL_DIRECTOR: Access to all appointments in their organization
 * - SUPERVISOR: Access to their own + supervisees' appointments
 * - CLINICIAN: Access to their own appointments + assigned clients' appointments
 * - FRONT_DESK/SCHEDULER: Access for scheduling purposes (limited view)
 * - BILLING_STAFF: Access for billing purposes
 */
export const assertCanAccessAppointment = async (
  user: JwtPayload | undefined,
  options: AppointmentAccessContext
) => {
  const { appointmentId, appointmentRecord } = options;

  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // SUPER_ADMIN has full access
  if (isSuperAdmin(user)) {
    logAccess(userId, 'appointment', appointmentId, 'SUPER_ADMIN', true);
    return;
  }

  // Get appointment record if not provided
  const appointment =
    appointmentRecord ??
    (await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        clientId: true,
        clinicianId: true,
        organizationId: true,
      },
    }));

  if (!appointment) {
    logAccess(userId, 'appointment', appointmentId, 'APPOINTMENT_NOT_FOUND', false);
    throw new ForbiddenError('Appointment access denied');
  }

  // Administrator access within their organization
  if (isAdministrator(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId && appointment.organizationId === dbUser.organizationId) {
      logAccess(userId, 'appointment', appointmentId, 'ADMINISTRATOR', true);
      return;
    }
    logAccess(userId, 'appointment', appointmentId, 'ADMIN_WRONG_ORG', false);
    throw new ForbiddenError('Appointment access denied');
  }

  // The clinician assigned to the appointment always has access
  if (appointment.clinicianId === userId) {
    logAccess(userId, 'appointment', appointmentId, 'ASSIGNED_CLINICIAN', true);
    return;
  }

  // Front desk and scheduling roles have access for scheduling
  if (hasSchedulingAccess(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId && appointment.organizationId === dbUser.organizationId) {
      logAccess(userId, 'appointment', appointmentId, 'SCHEDULING_ACCESS', true);
      return;
    }
  }

  // Billing staff have access for billing purposes
  if (isBillingStaff(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId && appointment.organizationId === dbUser.organizationId) {
      logAccess(userId, 'appointment', appointmentId, 'BILLING_STAFF', true);
      return;
    }
  }

  // Clinical staff can access appointments for their assigned clients
  if (isClinicalStaff(user)) {
    const clientAssignment = await prisma.client.findFirst({
      where: {
        id: appointment.clientId,
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
          ...(isSupervisor(user)
            ? [
                {
                  primaryTherapist: {
                    supervisorId: userId,
                  },
                },
              ]
            : []),
        ],
      },
    });

    if (clientAssignment) {
      logAccess(userId, 'appointment', appointmentId, 'CLIENT_ASSIGNED', true);
      return;
    }
  }

  logAccess(userId, 'appointment', appointmentId, 'DENIED', false);
  throw new ForbiddenError('Appointment access denied');
};

// =============================================================================
// BILLING DATA ACCESS
// =============================================================================

/**
 * Ensure the current user can access billing data.
 *
 * Access rules:
 * - SUPER_ADMIN: Full access
 * - ADMINISTRATOR: Full access within organization
 * - BILLING_STAFF: Full access to billing data within organization
 * - CLINICIAN: Access to billing for their assigned clients only
 */
export const assertCanAccessBillingData = async (
  user: JwtPayload | undefined,
  clientId?: string
) => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // SUPER_ADMIN has full access
  if (isSuperAdmin(user)) {
    logAccess(userId, 'billing', clientId || 'all', 'SUPER_ADMIN', true);
    return;
  }

  // Administrator and billing staff have full billing access
  if (isAdministrator(user) || isBillingStaff(user)) {
    logAccess(userId, 'billing', clientId || 'all', 'BILLING_ACCESS', true);
    return;
  }

  // Clinicians can access billing for their assigned clients
  if (isClinicalStaff(user) && clientId) {
    const clientAssignment = await prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
        ],
      },
    });

    if (clientAssignment) {
      logAccess(userId, 'billing', clientId, 'ASSIGNED_CLINICIAN', true);
      return;
    }
  }

  logAccess(userId, 'billing', clientId || 'all', 'DENIED', false);
  throw new ForbiddenError('Billing access denied');
};

// =============================================================================
// QUERY SCOPE FILTERS
// =============================================================================

const cloneWhere = (where: Record<string, unknown>): Record<string, unknown> => ({ ...where });

const combineWhere = (base: Record<string, unknown>, scope: Record<string, unknown>) => {
  const baseKeys = Object.keys(base || {});
  if (baseKeys.length === 0) {
    return scope;
  }
  return { AND: [base, scope] };
};

/**
 * Apply client-level scoping to Prisma where clauses.
 * Non-admin users are limited to clients they are authorized to access.
 */
export const applyClientScope = async (
  user: JwtPayload | undefined,
  where: Record<string, unknown> = {},
  options: { allowBillingView?: boolean } = {}
): Promise<Record<string, unknown>> => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // SUPER_ADMIN sees all
  if (isSuperAdmin(user)) {
    return where;
  }

  // Administrator sees clients in their organization
  if (isAdministrator(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId) {
      return combineWhere(cloneWhere(where), { organizationId: dbUser.organizationId });
    }
    return where;
  }

  // Billing staff sees clients for billing purposes
  if (options.allowBillingView && isBillingStaff(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId) {
      return combineWhere(cloneWhere(where), { organizationId: dbUser.organizationId });
    }
    return where;
  }

  // Clinical staff sees assigned clients
  if (isClinicalStaff(user)) {
    const scope: Record<string, unknown> = {
      OR: [
        { primaryTherapistId: userId },
        { secondaryTherapistId: userId },
      ],
    };

    // Supervisors also see supervisees' clients
    if (isSupervisor(user)) {
      (scope.OR as unknown[]).push({
        primaryTherapist: { supervisorId: userId },
      });
    }

    return combineWhere(cloneWhere(where), scope);
  }

  throw new ForbiddenError('Client access denied');
};

/**
 * Apply appointment-level scoping to Prisma where clauses.
 */
export const applyAppointmentScope = async (
  user: JwtPayload | undefined,
  where: Record<string, unknown> = {},
  options: { allowBillingView?: boolean } = {}
): Promise<Record<string, unknown>> => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // SUPER_ADMIN sees all
  if (isSuperAdmin(user)) {
    return where;
  }

  // Administrator sees appointments in their organization
  if (isAdministrator(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId) {
      return combineWhere(cloneWhere(where), { organizationId: dbUser.organizationId });
    }
    return where;
  }

  // Billing staff and scheduling roles see appointments in organization
  if ((options.allowBillingView && isBillingStaff(user)) || hasSchedulingAccess(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId) {
      return combineWhere(cloneWhere(where), { organizationId: dbUser.organizationId });
    }
    return where;
  }

  // Clinical staff sees their appointments and assigned clients' appointments
  if (isClinicalStaff(user)) {
    const scope: Record<string, unknown> = {
      OR: [
        { clinicianId: userId },
        { client: { primaryTherapistId: userId } },
        { client: { secondaryTherapistId: userId } },
      ],
    };

    // Supervisors also see supervisees' appointments
    if (isSupervisor(user)) {
      (scope.OR as unknown[]).push({
        client: { primaryTherapist: { supervisorId: userId } },
      });
    }

    return combineWhere(cloneWhere(where), scope);
  }

  throw new ForbiddenError('Appointment access denied');
};

/**
 * Apply clinical note scoping to Prisma where clauses.
 * IMPORTANT: Billing staff are excluded from clinical note access (HIPAA)
 */
export const applyClinicalNoteScope = async (
  user: JwtPayload | undefined,
  where: Record<string, unknown> = {}
): Promise<Record<string, unknown>> => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.userId || user.id;

  // Billing staff CANNOT access clinical notes
  if (isBillingStaff(user) && !isAdministrator(user)) {
    throw new ForbiddenError('Clinical note access denied');
  }

  // SUPER_ADMIN sees all
  if (isSuperAdmin(user)) {
    return where;
  }

  // Administrator sees notes in their organization
  if (isAdministrator(user)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (dbUser?.organizationId) {
      return combineWhere(cloneWhere(where), {
        client: { organizationId: dbUser.organizationId },
      });
    }
    return where;
  }

  // Clinical staff sees their notes and assigned clients' notes
  if (isClinicalStaff(user)) {
    const scope: Record<string, unknown> = {
      OR: [
        { clinicianId: userId },
        { client: { primaryTherapistId: userId } },
        { client: { secondaryTherapistId: userId } },
      ],
    };

    // Supervisors also see supervisees' notes
    if (isSupervisor(user)) {
      (scope.OR as unknown[]).push({
        client: { primaryTherapist: { supervisorId: userId } },
      });
    }

    return combineWhere(cloneWhere(where), scope);
  }

  throw new ForbiddenError('Clinical note access denied');
};

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log access decision for audit trail (HIPAA requirement)
 */
const logAccess = (
  userId: string,
  resource: string,
  resourceId: string,
  reason: string,
  granted: boolean
) => {
  if (granted) {
    logger.info('RLS: Access granted', {
      userId,
      resource,
      resourceId,
      reason,
    });
  } else {
    logger.warn('RLS: Access denied', {
      userId,
      resource,
      resourceId,
      reason,
    });
  }

  // Asynchronously log to database for audit trail
  prisma.auditLog
    .create({
      data: {
        userId,
        action: `RLS_${granted ? 'GRANTED' : 'DENIED'}`,
        entityType: resource,
        entityId: resourceId,
        details: {
          reason,
          granted,
        },
        ipAddress: 'system',
        userAgent: 'RLS-Middleware',
      },
    })
    .catch(err => {
      logger.error('Failed to log RLS access', { error: err });
    });
};
