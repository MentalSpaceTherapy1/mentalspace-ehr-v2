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
 * Middleware to authenticate client portal requests
 */
export const authenticatePortal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret, {
      audience: 'mentalspace-portal',
      issuer: 'mentalspace-ehr',
    }) as PortalTokenPayload;

    // Verify token type/audience
    if (decoded.type && decoded.type !== 'client_portal') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    if (decoded.audience && decoded.audience !== 'mentalspace-portal') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token audience',
      });
    }

    // Verify portal account exists and is active
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId: decoded.userId }, // userId in token is the clientId
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
      return res.status(404).json({
        success: false,
        message: 'Portal account not found',
      });
    }

    if (portalAccount.accountStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Portal account is not active',
      });
    }

    if (!portalAccount.portalAccessGranted) {
      return res.status(403).json({
        success: false,
        message: 'Portal access not granted',
      });
    }

    if (portalAccount.client.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Client account is inactive',
      });
    }

    // Attach portal account info to request
    (req as any).portalAccount = {
      id: portalAccount.id,
      portalAccountId: portalAccount.id,
      clientId: portalAccount.clientId,
      email: portalAccount.email,
      isEmailVerified: portalAccount.emailVerified,
      client: portalAccount.client,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    logger.error('Portal authentication error', {
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to require email verification
 * Use this after authenticatePortal for endpoints that require verified email
 */
/**
 * Middleware to authenticate temp password change requests
 * Accepts tokens with type 'temp_password_change' for first-time password setup
 */
export const authenticateTempPasswordChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret, {
      audience: 'mentalspace-portal',
      issuer: 'mentalspace-ehr',
    }) as PortalTokenPayload & { portalAccountId?: string; clientId?: string };

    // Must be a temp password change token
    if (decoded.type !== 'temp_password_change') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type for password change',
      });
    }

    // Verify portal account exists
    const clientId = decoded.clientId || decoded.userId;
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
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
      return res.status(404).json({
        success: false,
        message: 'Portal account not found',
      });
    }

    // Verify this account actually requires password change
    if (!portalAccount.mustChangePassword) {
      return res.status(403).json({
        success: false,
        message: 'Password change not required for this account',
      });
    }

    // Attach portal account info to request
    (req as any).portalAccount = {
      id: portalAccount.id,
      portalAccountId: portalAccount.id,
      clientId: portalAccount.clientId,
      email: portalAccount.email,
      isEmailVerified: portalAccount.emailVerified,
      client: portalAccount.client,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Password change token expired. Please log in again to get a new token.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    logger.error('Temp password change authentication error', {
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to require email verification
 * Use this after authenticatePortal for endpoints that require verified email
 */
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  try {
    const portalAccount = (req as any).portalAccount;

    if (!portalAccount) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!portalAccount.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    next();
  } catch (error: any) {
    logger.error('Email verification check failed:', error);

    return res.status(403).json({
      success: false,
      message: 'Email verification required',
    });
  }
};
