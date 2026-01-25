/**
 * Express Type Extensions
 * Phase 5.4: Consolidated Express.Request extensions to eliminate `as any` casts
 *
 * This file defines all custom properties added to Express.Request by middleware.
 * Import this file in your tsconfig.json or at the app entry point.
 */
import { Request, Response } from 'express';
import { JwtPayload } from '../utils/jwt';

// ============================================================================
// Custom Property Types
// ============================================================================

/**
 * User payload attached by auth middleware
 * Supports both staff users and portal users
 * Extends JwtPayload for compatibility with existing services
 */
export interface AuthUser extends JwtPayload {
  clientId?: string;    // Portal user's client ID from dualAuth.ts
  firstName?: string;   // Staff user name from dualAuth.ts
  lastName?: string;    // Staff user name from dualAuth.ts
}

/**
 * Session data attached by auth middleware
 */
export interface SessionData {
  sessionId: string;
  token: string;
}

/**
 * Portal account data attached by portal authentication middleware
 */
export interface PortalAccount {
  id: string;
  portalAccountId: string;  // Same as id, for backward compatibility
  clientId: string;
  email: string;
  isEmailVerified: boolean; // Renamed from emailVerified for consistency with middleware
  client?: {                // Client object from database - matches Prisma types
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;  // Database column allows null
    status?: string;        // Client status from database
    [key: string]: unknown;
  };
}

/**
 * Guardian context attached by guardian-access middleware
 */
export interface GuardianContext {
  isGuardian: boolean;
  guardianId: string;
  minorId: string;
  relationshipId: string;
  accessLevel: string;
  permissions: {
    canScheduleAppointments: boolean;
    canViewRecords: boolean;
    canCommunicateWithClinician: boolean;
  };
}

/**
 * Row-level security context attached by RLS middleware
 * Matches the interface in rowLevelSecurity.ts
 */
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

// ============================================================================
// Global Express Type Extensions
// ============================================================================

declare global {
  namespace Express {
    // Multer file type for file upload middleware
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer: Buffer;
      }
    }

    interface Request {
      // Auth middleware
      user?: AuthUser;
      session?: SessionData;

      // Portal auth middleware
      portalAccount?: PortalAccount;

      // Guardian access middleware
      guardianContext?: GuardianContext;

      // Row-level security middleware
      rlsContext?: RLSContext;

      // Dual auth middleware flags
      requiresClinicianClientCheck?: boolean;
      targetClientId?: string;

      // Request tracking
      correlationId?: string;

      // Multer file upload middleware
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Type for requests that have passed through authentication middleware
 * Use this type in controller functions that require authentication
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  session?: SessionData;
}

/**
 * Type for requests that have passed through portal authentication middleware
 * Use this type in portal controller functions
 */
export interface PortalRequest extends Request {
  portalAccount: PortalAccount;
}

/**
 * Type for requests with guardian context
 */
export interface GuardianRequest extends Request {
  guardianContext: GuardianContext;
}

/**
 * Type for requests with RLS context
 */
export interface RLSRequest extends Request {
  rlsContext: RLSContext;
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
export function getAuthenticatedUser(req: Request): AuthUser {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

/**
 * Type guard to assert request has portal account
 * Use in portal controllers after authentication middleware
 */
export function assertPortalAuthenticated(req: Request): asserts req is PortalRequest {
  if (!req.portalAccount) {
    throw new Error('Portal account not authenticated');
  }
}

/**
 * Helper to get portal account from request with non-null assertion
 * Only use in routes that have portal authentication middleware
 */
export function getPortalAccount(req: Request): PortalAccount {
  if (!req.portalAccount) {
    throw new Error('Portal account not authenticated');
  }
  return req.portalAccount;
}

/**
 * Type guard to assert request has guardian context
 */
export function assertGuardianContext(req: Request): asserts req is GuardianRequest {
  if (!req.guardianContext) {
    throw new Error('Guardian context not available');
  }
}

/**
 * Helper to get guardian context from request
 */
export function getGuardianContext(req: Request): GuardianContext {
  if (!req.guardianContext) {
    throw new Error('Guardian context not available');
  }
  return req.guardianContext;
}

/**
 * Type guard to assert request has RLS context
 */
export function assertRLSContext(req: Request): asserts req is RLSRequest {
  if (!req.rlsContext) {
    throw new Error('RLS context not available');
  }
}

/**
 * Helper to get RLS context from request
 */
export function getRLSContext(req: Request): RLSContext {
  if (!req.rlsContext) {
    throw new Error('RLS context not available');
  }
  return req.rlsContext;
}

export {};
