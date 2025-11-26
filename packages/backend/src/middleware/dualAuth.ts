import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import prisma from '../services/database';

interface PortalTokenPayload {
  userId: string; // This is the clientId in portal tokens
  email: string;
  role: string;
  type?: string;
  audience?: string;
}

/**
 * Dual authentication middleware that accepts BOTH staff tokens AND portal tokens
 *
 * This middleware tries:
 * 1. First, portal authentication (client portal tokens)
 * 2. If that fails, staff authentication (staff JWT tokens)
 *
 * This allows endpoints to be accessed by both:
 * - Clients accessing their own data via portal
 * - Staff (clinicians/admins) accessing client data
 */
export const authenticateDual = async (req: Request, res: Response, next: NextFunction) => {
  logger.debug('[DUAL AUTH] Middleware executing', { method: req.method, url: req.url });

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try portal authentication first (most common for progress tracking)
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        audience: 'mentalspace-portal',
        issuer: 'mentalspace-ehr',
      }) as PortalTokenPayload;

      // Verify token type/audience
      if (decoded.type && decoded.type !== 'client_portal') {
        throw new Error('Invalid token type');
      }

      if (decoded.audience && decoded.audience !== 'mentalspace-portal') {
        throw new Error('Invalid token audience');
      }

      // Verify portal account exists and is active
      const portalAccount = await prisma.portalAccount.findUnique({
        where: { clientId: decoded.userId },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
            },
          },
        },
      });

      if (!portalAccount) {
        throw new Error('Portal account not found');
      }

      if (portalAccount.accountStatus !== 'ACTIVE') {
        throw new Error('Portal account is not active');
      }

      if (!portalAccount.portalAccessGranted) {
        throw new Error('Portal access not granted');
      }

      if (portalAccount.client.status !== 'ACTIVE') {
        throw new Error('Client account is inactive');
      }

      // Portal authentication successful - attach portal account info
      (req as any).portalAccount = {
        id: portalAccount.id,
        portalAccountId: portalAccount.id,
        clientId: portalAccount.clientId,
        email: portalAccount.email,
        isEmailVerified: portalAccount.emailVerified,
        client: portalAccount.client,
      };

      // Also set req.user for compatibility with authorize middleware
      req.user = {
        userId: portalAccount.clientId,
        clientId: portalAccount.clientId, // Add clientId for self-scheduling controller compatibility
        email: portalAccount.email,
        roles: ['CLIENT'], // Portal users have CLIENT role
      } as any;

      logger.debug('Dual auth: Portal authentication successful', {
        clientId: portalAccount.clientId,
      });

      return next();
    } catch (portalError: any) {
      // Portal authentication failed, try staff authentication
      logger.debug('Portal authentication failed, trying staff auth', {
        error: portalError.message,
      });

      // Try staff authentication (session-based token validation)
      try {
        // Import session service dynamically to avoid circular dependency
        const sessionService = (await import('../services/session.service')).default;

        // Validate session token
        const sessionData = await sessionService.validateSession(token);

        if (!sessionData) {
          throw new Error('Invalid session token');
        }

        // Fetch user data
        const user = await prisma.user.findUnique({
          where: { id: sessionData.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
            isActive: true,
            mfaEnabled: true,
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        if (!user.isActive) {
          throw new Error('User account is inactive');
        }

        // Staff authentication successful
        req.user = {
          userId: user.id,
          email: user.email,
          roles: user.roles,
          firstName: user.firstName,
          lastName: user.lastName,
        } as any;

        req.session = {
          sessionId: sessionData.sessionId,
          token: token,
        } as any;

        // Update session activity
        await sessionService.updateActivity(sessionData.sessionId);

        logger.debug('Dual auth: Staff authentication successful', {
          userId: user.id,
        });

        return next();
      } catch (staffError: any) {
        logger.debug('Staff authentication also failed', {
          error: staffError.message,
        });

        // Both authentication methods failed
        return res.status(401).json({
          success: false,
          message: 'Authentication failed. Invalid or expired token.',
        });
      }
    }
  } catch (error: any) {
    logger.error('Dual authentication error', {
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Get client ID from either portal account or request parameters
 * Useful for controllers that need to determine which client's data to access
 */
export const getClientId = (req: Request): string | null => {
  // If authenticated via portal, use the portal account's clientId
  const portalAccount = (req as any).portalAccount;
  if (portalAccount?.clientId) {
    return portalAccount.clientId;
  }

  // If authenticated via staff, use the clientId from route params
  if (req.params.clientId) {
    return req.params.clientId;
  }

  return null;
};

/**
 * Check if the authenticated user has permission to access a client's data
 *
 * SECURITY FIX: Implements proper RBAC to prevent IDOR vulnerabilities
 *
 * Rules:
 * - SUPER_ADMIN, ADMINISTRATOR, CLINICAL_DIRECTOR can access all client data
 * - BILLING_STAFF, OFFICE_MANAGER, SCHEDULER can access all client data (operational need)
 * - Portal users can only access their own data
 * - CLINICIAN/SUPERVISOR can only access clients assigned to them (checked async)
 */
export const canAccessClientData = (req: Request, targetClientId: string): boolean => {
  // Get user roles (handle both array and single role formats)
  const userRoles: string[] = req.user?.roles
    ? (Array.isArray(req.user.roles) ? req.user.roles : [req.user.roles])
    : [];

  // Roles with global client access (administrative/operational roles)
  const GLOBAL_ACCESS_ROLES = [
    'SUPER_ADMIN',
    'ADMINISTRATOR',
    'CLINICAL_DIRECTOR',
    'BILLING_STAFF',
    'OFFICE_MANAGER',
    'SCHEDULER',
    'RECEPTIONIST',
  ];

  // Check if user has a role with global access
  const hasGlobalAccess = userRoles.some((role: string) =>
    GLOBAL_ACCESS_ROLES.includes(role)
  );

  if (hasGlobalAccess) {
    logger.debug('User has global client access', {
      userId: req.user?.userId,
      roles: userRoles,
      targetClientId,
    });
    return true;
  }

  // Portal account - can only access own data
  const portalAccount = (req as any).portalAccount;
  if (portalAccount?.clientId) {
    return portalAccount.clientId === targetClientId;
  }

  // For CLINICIAN/SUPERVISOR roles without global access:
  // Return true here to allow the request to proceed, but controllers MUST
  // verify clinician-client assignment using verifyClinicianClientAccess()
  // This is a security gate, not the final authorization check
  if (req.user?.userId && (userRoles.includes('CLINICIAN') || userRoles.includes('SUPERVISOR') || userRoles.includes('INTERN'))) {
    // Mark request to indicate clinician-level access check is needed
    (req as any).requiresClinicianClientCheck = true;
    (req as any).targetClientId = targetClientId;
    return true;
  }

  logger.warn('Client data access denied', {
    userId: req.user?.userId,
    roles: userRoles,
    targetClientId,
  });
  return false;
};

/**
 * Async function to verify clinician has access to specific client
 * Must be called in controllers after canAccessClientData returns true
 * when requiresClinicianClientCheck is set
 */
export const verifyClinicianClientAccess = async (
  clinicianUserId: string,
  clientId: string
): Promise<boolean> => {
  try {
    // Check if clinician is assigned to this client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { primaryClinicianId: clinicianUserId },
          { secondaryClinicianId: clinicianUserId },
          // Also check if clinician has any appointments with this client
          {
            appointments: {
              some: {
                clinicianId: clinicianUserId,
              },
            },
          },
        ],
      },
    });

    if (client) {
      return true;
    }

    // Check if supervisor has supervisees assigned to this client
    const superviseeAccess = await prisma.user.findFirst({
      where: {
        supervisorId: clinicianUserId,
        OR: [
          {
            primaryClients: {
              some: { id: clientId },
            },
          },
          {
            secondaryClients: {
              some: { id: clientId },
            },
          },
        ],
      },
    });

    return !!superviseeAccess;
  } catch (error) {
    logger.error('Error verifying clinician-client access', {
      clinicianUserId,
      clientId,
      error,
    });
    return false;
  }
};
