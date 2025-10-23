import prisma from './database';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { JwtPayload } from '../utils/jwt';

const hasRole = (user: JwtPayload | undefined, role: string) =>
  Boolean(user?.roles?.includes(role));

export const isAdministrator = (user: JwtPayload | undefined) =>
  hasRole(user, 'ADMINISTRATOR');

export const isSupervisor = (user: JwtPayload | undefined) =>
  hasRole(user, 'SUPERVISOR');

export const isClinician = (user: JwtPayload | undefined) =>
  hasRole(user, 'CLINICIAN');

export const isBillingStaff = (user: JwtPayload | undefined) =>
  hasRole(user, 'BILLING_STAFF');

export const isFrontDesk = (user: JwtPayload | undefined) =>
  hasRole(user, 'FRONT_DESK');

export interface ClientAccessContext {
  clientId: string;
  allowBillingView?: boolean;
  clientRecord?: {
    primaryTherapistId: string;
  } | null;
}

/**
 * Ensure the current user can access the specified client record.
 * Administrators and supervisors have full access.
 * Clinicians must be the client's assigned primary therapist.
 * Billing staff can be allowed via configuration.
 */
export const assertCanAccessClient = async (
  user: JwtPayload | undefined,
  options: ClientAccessContext
) => {
  const { clientId, allowBillingView = false, clientRecord } = options;
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (isAdministrator(user) || isSupervisor(user)) {
    return;
  }

  if (allowBillingView && isBillingStaff(user)) {
    return;
  }

  const client =
    clientRecord ??
    (await prisma.client.findUnique({
      where: { id: clientId },
      select: { primaryTherapistId: true },
    }));

  if (!client) {
    throw new ForbiddenError('Client access denied');
  }

  if (client.primaryTherapistId !== user.userId) {
    throw new ForbiddenError('Client access denied');
  }
};

/**
 * Apply client-level scoping to Prisma where clauses.
 * Non-admin/non-supervisor users are limited to clients they are assigned to.
 */
export const applyClientScope = (
  user: JwtPayload | undefined,
  where: Record<string, unknown> = {},
  options: { allowBillingView?: boolean } = {}
) => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (
    isAdministrator(user) ||
    isSupervisor(user) ||
    (options.allowBillingView && isBillingStaff(user))
  ) {
    return where;
  }

  if (isClinician(user)) {
    return {
      ...where,
      primaryTherapistId: user.userId,
    };
  }

  throw new ForbiddenError('Client access denied');
};


const cloneWhere = (where: Record<string, unknown>): Record<string, unknown> => ({ ...where });

const combineWhere = (base: Record<string, unknown>, scope: Record<string, unknown>) => {
  const baseKeys = Object.keys(base || {});
  if (baseKeys.length === 0) {
    return scope;
  }
  return { AND: [base, scope] };
};

export const applyAppointmentScope = (
  user: JwtPayload | undefined,
  where: Record<string, unknown> = {},
  options: { allowBillingView?: boolean } = {}
) => {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (isAdministrator(user) || isSupervisor(user)) {
    return where;
  }

  if (options.allowBillingView && isBillingStaff(user)) {
    return where;
  }

  if (isClinician(user)) {
    const scope = {
      OR: [
        { clinicianId: user.userId },
        { client: { primaryTherapistId: user.userId } },
      ],
    };
    const baseCopy = cloneWhere(where);
    return combineWhere(baseCopy, scope);
  }

  throw new ForbiddenError('Appointment access denied');
};


