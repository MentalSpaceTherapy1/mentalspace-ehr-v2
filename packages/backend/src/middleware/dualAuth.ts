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

// Cookie name for access token (must match auth.ts)
const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Extract token from request
 * For portal users: Authorization header (Bearer token)
 * For staff users: httpOnly cookie (preferred) or Authorization header
 */
const extractToken = (req: Request): { token: string | null; source: 'cookie' | 'header' | null } => {
  // 1. Check Authorization header first (for portal users)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.substring(7), source: 'header' };
  }

  // 2. Check httpOnly cookie (for staff users)
  if (req.cookies?.[ACCESS_TOKEN_COOKIE]) {
    return { token: req.cookies[ACCESS_TOKEN_COOKIE], source: 'cookie' };
  }

  return { token: null, source: null };
};

/**
 * Dual authentication middleware that accepts BOTH staff tokens AND portal tokens
 *
 * This middleware tries:
 * 1. First, portal authentication (client portal tokens from Authorization header)
 * 2. If that fails, staff authentication (staff session tokens from cookies or header)
 *
 * This allows endpoints to be accessed by both:
 * - Clients accessing their own data via portal
 * - Staff (clinicians/admins) accessing client data
 */
export const authenticateDual = async (req: Request, res: Response, next: NextFunction) => {
  // DETAILED DEBUG LOGGING for tracking route issues
  logger.info('[DUAL AUTH] Middleware executing', {
    method: req.method,
    url: req.url,
    hasCookies: !!req.cookies,
    cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
    hasAuthHeader: !!req.headers.authorization,
    hasAccessTokenCookie: !!req.cookies?.access_token,
    origin: req.headers.origin,
    referer: req.headers.referer,
  });

  try {
    const { token, source } = extractToken(req);
    logger.info('[DUAL AUTH] Token extraction result', {
      hasToken: !!token,
      source,
      tokenLength: token ? token.length : 0,
    });

    if (!token) {
      logger.warn('[DUAL AUTH] No token found', {
        url: req.url,
        cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
        hasAccessTokenCookie: !!req.cookies?.access_token,
        origin: req.headers.origin,
      });
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
        debug: {
          hasCookies: !!req.cookies,
          cookieCount: req.cookies ? Object.keys(req.cookies).length : 0,
          hasAccessToken: !!req.cookies?.access_token,
        },
      });
    }

    // Try portal authentication first (most common for progress tracking)
    logger.info('[DUAL AUTH] Attempting portal JWT authentication', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10),
    });
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        audience: 'mentalspace-portal',
        issuer: 'mentalspace-ehr',
      }) as PortalTokenPayload;
      logger.info('[DUAL AUTH] JWT verify succeeded (portal token)');

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
      logger.info('[DUAL AUTH] Portal JWT failed, trying staff session auth', {
        error: portalError.message,
        errorName: portalError.name,
      });

      // Try staff authentication (session-based token validation)
      try {
        // Import session service dynamically to avoid circular dependency
        logger.info('[DUAL AUTH] Loading session service...');
        const sessionService = (await import('../services/session.service.js')).default;
        logger.info('[DUAL AUTH] Session service loaded, validating session...');

        // Validate session token
        const sessionData = await sessionService.validateSession(token);
        logger.info('[DUAL AUTH] Session validation result', {
          hasSessionData: !!sessionData,
          userId: sessionData?.userId,
          sessionId: sessionData?.sessionId,
        });

        if (!sessionData) {
          logger.warn('[DUAL AUTH] Session validation returned null');
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

        logger.info('[DUAL AUTH] Staff authentication successful', {
          userId: user.id,
          roles: user.roles,
        });

        return next();
      } catch (staffError: any) {
        logger.warn('[DUAL AUTH] Staff authentication FAILED', {
          error: staffError.message,
          errorName: staffError.name,
          stack: staffError.stack?.substring(0, 200),
        });

        // Both authentication methods failed
        logger.error('[DUAL AUTH] ALL AUTH METHODS FAILED - returning 401', {
          url: req.url,
          method: req.method,
          portalError: (portalError as any).message,
          staffError: staffError.message,
        });
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
          { primaryTherapistId: clinicianUserId },
          { secondaryTherapistId: clinicianUserId },
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
    // Query clients where the supervisor's supervisees are assigned as primary therapist
    const superviseeClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        primaryTherapist: {
          supervisorId: clinicianUserId,
        },
      },
    });

    return !!superviseeClient;
  } catch (error) {
    logger.error('Error verifying clinician-client access', {
      clinicianUserId,
      clientId,
      error,
    });
    return false;
  }
};
