import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';

/**
 * Type for requests that have passed through authentication middleware
 * Use this type in controller functions that require authentication
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload & { userId: string; roles: string[] };
  session?: {
    sessionId: string;
    token: string;
  };
}

/**
 * Portal account data attached to authenticated portal requests
 */
export interface PortalAccount {
  id: string;
  clientId: string;
  email: string;
  emailVerified: boolean;
  accountStatus: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';
  portalAccessGranted: boolean;
}

/**
 * Type for requests that have passed through portal authentication middleware
 * Use this type in portal controller functions
 */
export interface PortalRequest extends Request {
  portalAccount: PortalAccount;
}

/**
 * Type guard to assert request has portal account
 * Use in portal controllers after authentication middleware
 */
export function assertPortalAuthenticated(req: Request): asserts req is PortalRequest {
  if (!(req as PortalRequest).portalAccount) {
    throw new Error('Portal account not authenticated');
  }
}

/**
 * Helper to get portal account from request with non-null assertion
 * Only use in routes that have portal authentication middleware
 */
export function getPortalAccount(req: Request): PortalAccount {
  const portalReq = req as PortalRequest;
  if (!portalReq.portalAccount) {
    throw new Error('Portal account not authenticated');
  }
  return portalReq.portalAccount;
}

/**
 * Type guard to assert request has authenticated user
 * Use in controllers after authentication middleware
 */
export function assertAuthenticated(req: Request): asserts req is AuthenticatedRequest {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
}

/**
 * Helper to get user from request with non-null assertion
 * Only use in routes that have authentication middleware
 */
export function getAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}
