import { Request, Response, NextFunction } from 'express';
import guardianRelationshipService from '../services/guardian-relationship.service';
import logger from '../utils/logger';
import prisma from '../services/database';
// Phase 5.4: Import consolidated Express types (guardianContext is defined there)
import '../types/express.d';

/**
 * Middleware to check if user is accessing as a guardian
 * Populates req.guardianContext with relationship details
 */
export const checkGuardianContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const minorId = req.params.minorId || req.body.minorId;

    if (!userId || !minorId) {
      return next();
    }

    // Check if user has verified guardian relationship with this minor
    const relationship = await prisma.guardianRelationship.findFirst({
      where: {
        guardianId: userId,
        minorId,
        verificationStatus: 'VERIFIED',
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    if (relationship) {
      req.guardianContext = {
        isGuardian: true,
        guardianId: userId,
        minorId,
        relationshipId: relationship.id,
        accessLevel: relationship.accessLevel,
        permissions: {
          canScheduleAppointments: relationship.canScheduleAppointments,
          canViewRecords: relationship.canViewRecords,
          canCommunicateWithClinician: relationship.canCommunicateWithClinician,
        },
      };

      // Log guardian access for audit trail
      await logGuardianAccess(
        userId,
        minorId,
        relationship.id,
        req.method,
        req.originalUrl
      );
    }

    next();
  } catch (error) {
    logger.error('Error checking guardian context:', error);
    next();
  }
};

/**
 * Middleware to require verified guardian relationship
 */
export const requireGuardianAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const minorId = req.params.minorId || req.body.minorId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!minorId) {
      return res.status(400).json({
        success: false,
        message: 'Minor ID required',
      });
    }

    // Check if user has verified guardian relationship
    const hasAccess = await guardianRelationshipService.checkAccess(userId, minorId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have guardian access to this minor',
      });
    }

    // Populate guardian context
    await checkGuardianContext(req, res, next);
  } catch (error) {
    logger.error('Error requiring guardian access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify guardian access',
    });
  }
};

/**
 * Middleware to check specific permission
 */
export const requireGuardianPermission = (
  permission: 'schedule' | 'view' | 'communicate'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const minorId = req.params.minorId || req.body.minorId;

      if (!userId || !minorId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and Minor ID required',
        });
      }

      // Check if user has specific permission
      const hasPermission = await guardianRelationshipService.checkAccess(
        userId,
        minorId,
        permission
      );

      if (!hasPermission) {
        const permissionNames = {
          schedule: 'schedule appointments',
          view: 'view records',
          communicate: 'communicate with clinician',
        };

        return res.status(403).json({
          success: false,
          message: `You do not have permission to ${permissionNames[permission]} for this minor`,
        });
      }

      // Populate guardian context
      await checkGuardianContext(req, res, next);
    } catch (error) {
      logger.error('Error checking guardian permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify guardian permission',
      });
    }
  };
};

/**
 * Middleware to check access level
 */
export const requireAccessLevel = (
  minimumLevel: 'VIEW_ONLY' | 'LIMITED' | 'FULL'
) => {
  const levelHierarchy = {
    VIEW_ONLY: 1,
    LIMITED: 2,
    FULL: 3,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // First ensure guardian context is populated
      await checkGuardianContext(req, res, () => {});

      if (!req.guardianContext) {
        return res.status(403).json({
          success: false,
          message: 'Guardian access required',
        });
      }

      const userLevel = levelHierarchy[req.guardianContext.accessLevel as keyof typeof levelHierarchy];
      const requiredLevel = levelHierarchy[minimumLevel];

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `This action requires ${minimumLevel} access level`,
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking access level:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify access level',
      });
    }
  };
};

/**
 * Log guardian access for audit trail
 */
async function logGuardianAccess(
  guardianId: string,
  minorId: string,
  relationshipId: string,
  method: string,
  url: string
) {
  try {
    // Log to audit table (we'll create this)
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" (
        "id",
        "userId",
        "action",
        "resource",
        "resourceId",
        "metadata",
        "createdAt"
      ) VALUES (
        gen_random_uuid(),
        ${guardianId},
        ${method},
        'GuardianAccess',
        ${minorId},
        ${JSON.stringify({ relationshipId, url })},
        NOW()
      )
    `;

    logger.info('Guardian access logged', {
      guardianId,
      minorId,
      relationshipId,
      method,
      url,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error('Error logging guardian access:', error);
  }
}

/**
 * Middleware to ensure minor is actually a minor (under 18) or has healthcare proxy
 */
export const validateMinorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const minorId = req.params.minorId || req.body.minorId;

    if (!minorId) {
      return res.status(400).json({
        success: false,
        message: 'Minor ID required',
      });
    }

    const client = await prisma.client.findUnique({
      where: { id: minorId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Calculate age
    const age = calculateAge(client.dateOfBirth);

    // If client is 18+, only allow HEALTHCARE_PROXY relationships
    if (age >= 18) {
      const relationshipType = req.body.relationshipType;

      if (relationshipType && relationshipType !== 'HEALTHCARE_PROXY') {
        return res.status(400).json({
          success: false,
          message: 'For clients 18 and older, only HEALTHCARE_PROXY relationships are allowed',
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error validating minor status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate minor status',
    });
  }
};

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Middleware to allow either direct client access OR guardian access
 * Useful for endpoints that should work for both
 */
export const allowClientOrGuardian = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const clientId = req.params.clientId || req.params.minorId || req.body.clientId;

    if (!userId || !clientId) {
      return res.status(400).json({
        success: false,
        message: 'Authentication and client ID required',
      });
    }

    // TODO: Check if user is the client themselves
    // Note: Client model doesn't have userId field - clients don't have user accounts
    // This check may need to be implemented differently if clients can have portal access
    // const isDirectClient = await prisma.client.findFirst({
    //   where: {
    //     id: clientId,
    //     userId,
    //   },
    // });
    //
    // if (isDirectClient) {
    //   return next();
    // }

    // Check if user is a verified guardian
    const hasGuardianAccess = await guardianRelationshipService.checkAccess(
      userId,
      clientId
    );

    if (hasGuardianAccess) {
      await checkGuardianContext(req, res, next);
      return;
    }

    // Neither client nor guardian
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this client',
    });
  } catch (error) {
    logger.error('Error checking client or guardian access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify access',
    });
  }
};
