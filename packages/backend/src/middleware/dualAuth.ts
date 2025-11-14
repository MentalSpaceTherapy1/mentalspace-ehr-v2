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
  console.log('[DUAL AUTH] Middleware executing for:', req.method, req.url);
  logger.info('[DUAL AUTH] Middleware executing', { method: req.method, url: req.url });

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

      // Try staff authentication (session-based)
      try {
        // Check if there's a session with userId
        if (req.session && (req.session as any).userId) {
          const userId = (req.session as any).userId;

          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              isLocked: true,
            },
          });

          if (!user) {
            throw new Error('User not found');
          }

          if (!user.isActive) {
            throw new Error('User account is inactive');
          }

          if (user.isLocked) {
            throw new Error('User account is locked');
          }

          // Staff authentication successful
          req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          };

          logger.debug('Dual auth: Staff authentication successful', {
            userId: user.id,
          });

          return next();
        }

        throw new Error('No valid session');
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
 * Rules:
 * - SUPER_ADMIN can access all data
 * - Portal users can only access their own data
 * - Staff users can access any client's data (subject to role authorization)
 */
export const canAccessClientData = (req: Request, targetClientId: string): boolean => {
  // SUPER_ADMIN has absolute access to everything
  if (req.user?.roles) {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.roles];
    const isSuperAdmin = userRoles.some((role: string) =>
      role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN'
    );
    if (isSuperAdmin) {
      return true;
    }
  }

  // Portal account - can only access own data
  const portalAccount = (req as any).portalAccount;
  if (portalAccount?.clientId) {
    return portalAccount.clientId === targetClientId;
  }

  // Staff user - can access any client data (role checks handled separately)
  if (req.user?.userId) {
    return true;
  }

  return false;
};
