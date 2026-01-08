import { Request, Response } from 'express';
import logger, { logControllerError } from '../../utils/logger';
import prisma from '../../services/database';

/**
 * Get guardian verification statistics
 * GET /admin/guardian/stats
 */
export const getGuardianStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get counts by status
    const [pending, verified, rejectedThisMonth] = await Promise.all([
      prisma.guardianRelationship.count({
        where: { verificationStatus: 'PENDING' },
      }),
      prisma.guardianRelationship.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      prisma.guardianRelationship.count({
        where: {
          verificationStatus: 'REJECTED',
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Calculate average verification time (days) for verified relationships
    const verifiedRelationships = await prisma.guardianRelationship.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        verifiedAt: { not: null },
      },
      select: {
        createdAt: true,
        verifiedAt: true,
      },
    });

    let averageVerificationDays = 0;
    if (verifiedRelationships.length > 0) {
      const totalDays = verifiedRelationships.reduce((acc, rel) => {
        if (rel.verifiedAt) {
          const days = Math.floor(
            (rel.verifiedAt.getTime() - rel.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return acc + days;
        }
        return acc;
      }, 0);
      averageVerificationDays = Math.round(totalDays / verifiedRelationships.length);
    }

    return res.status(200).json({
      success: true,
      data: {
        pending,
        verified,
        rejected: rejectedThisMonth,
        averageVerificationDays,
      },
    });
  } catch (error) {
    const errorId = logControllerError('Get guardian stats', error, {
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve guardian statistics',
      errorId,
    });
  }
};

/**
 * Get guardian relationships with filtering and pagination
 * GET /admin/guardian/relationships
 */
export const getGuardianRelationships = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      page = '1',
      limit = '20',
      verificationStatus,
      search,
      relationshipType,
      accessLevel,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    if (relationshipType) {
      where.relationshipType = relationshipType;
    }

    if (accessLevel) {
      where.accessLevel = accessLevel;
    }

    if (search) {
      where.OR = [
        {
          guardian: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
            ],
          },
        },
        {
          minor: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { medicalRecordNumber: { contains: search as string, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Get relationships with pagination
    const [relationships, totalCount] = await Promise.all([
      prisma.guardianRelationship.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
              dateOfBirth: true,
            },
          },
        },
      }),
      prisma.guardianRelationship.count({ where }),
    ]);

    // Transform data for frontend (map phoneNumber from phone)
    const transformedRelationships = relationships.map((rel) => ({
      id: rel.id,
      guardian: {
        id: rel.guardian.id,
        firstName: rel.guardian.firstName,
        lastName: rel.guardian.lastName,
        email: rel.guardian.email,
        phoneNumber: rel.guardian.phoneNumber,
      },
      minor: {
        id: rel.minor.id,
        firstName: rel.minor.firstName,
        lastName: rel.minor.lastName,
        medicalRecordNumber: rel.minor.medicalRecordNumber,
        dateOfBirth: rel.minor.dateOfBirth,
      },
      relationshipType: rel.relationshipType,
      accessLevel: rel.accessLevel,
      permissions: {
        canScheduleAppointments: rel.canScheduleAppointments,
        canViewRecords: rel.canViewRecords,
        canCommunicateWithClinician: rel.canCommunicateWithClinician,
      },
      verificationStatus: rel.verificationStatus,
      verificationDocuments: rel.verificationDocuments.map((doc, index) => ({
        id: `doc-${index}`,
        fileName: `Document ${index + 1}`,
        storageLocation: doc,
        uploadedAt: rel.createdAt.toISOString(),
      })),
      createdAt: rel.createdAt,
      verifiedAt: rel.verifiedAt,
      verifiedBy: null, // Would need to join with User table if verifiedBy is stored
      notes: rel.notes,
      rejectionReason: null, // Could be stored in notes or a separate field
    }));

    return res.status(200).json({
      success: true,
      data: transformedRelationships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    const errorId = logControllerError('Get guardian relationships', error, {
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve guardian relationships',
      errorId,
    });
  }
};

/**
 * Verify a guardian relationship
 * PUT /admin/guardian/:id/verify
 */
export const verifyGuardianRelationship = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const relationship = await prisma.guardianRelationship.findUnique({
      where: { id },
    });

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Guardian relationship not found',
      });
    }

    if (relationship.verificationStatus !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Relationship is not pending verification',
      });
    }

    const updatedRelationship = await prisma.guardianRelationship.update({
      where: { id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        notes: notes || relationship.notes,
      },
    });

    logger.info(`Guardian relationship ${id} verified by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Guardian relationship verified successfully',
      data: updatedRelationship,
    });
  } catch (error) {
    const errorId = logControllerError('Verify guardian relationship', error, {
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to verify guardian relationship',
      errorId,
    });
  }
};

/**
 * Reject a guardian relationship
 * PUT /admin/guardian/:id/reject
 */
export const rejectGuardianRelationship = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const relationship = await prisma.guardianRelationship.findUnique({
      where: { id },
    });

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Guardian relationship not found',
      });
    }

    if (relationship.verificationStatus !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Relationship is not pending verification',
      });
    }

    const updatedRelationship = await prisma.guardianRelationship.update({
      where: { id },
      data: {
        verificationStatus: 'REJECTED',
        notes: `Rejected: ${reason}`,
      },
    });

    logger.info(`Guardian relationship ${id} rejected by user ${userId}: ${reason}`);

    return res.status(200).json({
      success: true,
      message: 'Guardian relationship rejected',
      data: updatedRelationship,
    });
  } catch (error) {
    const errorId = logControllerError('Reject guardian relationship', error, {
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to reject guardian relationship',
      errorId,
    });
  }
};

/**
 * Revoke a verified guardian relationship
 * PUT /admin/guardian/:id/revoke
 */
export const revokeGuardianRelationship = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Revocation reason is required',
      });
    }

    const relationship = await prisma.guardianRelationship.findUnique({
      where: { id },
    });

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Guardian relationship not found',
      });
    }

    if (relationship.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Only verified relationships can be revoked',
      });
    }

    // Set end date to now to revoke access
    const updatedRelationship = await prisma.guardianRelationship.update({
      where: { id },
      data: {
        verificationStatus: 'REJECTED',
        endDate: new Date(),
        notes: `Revoked: ${reason}`,
      },
    });

    logger.info(`Guardian relationship ${id} revoked by user ${userId}: ${reason}`);

    return res.status(200).json({
      success: true,
      message: 'Guardian relationship revoked',
      data: updatedRelationship,
    });
  } catch (error) {
    const errorId = logControllerError('Revoke guardian relationship', error, {
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke guardian relationship',
      errorId,
    });
  }
};

/**
 * Get presigned URL for viewing verification documents
 * POST /admin/guardian/document-url
 */
export const getDocumentUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { storageLocation } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!storageLocation) {
      return res.status(400).json({
        success: false,
        message: 'Storage location is required',
      });
    }

    // For now, return the storage location directly
    // In production, this would generate a presigned S3 URL
    // TODO: Implement presigned URL generation for S3 documents

    return res.status(200).json({
      success: true,
      data: {
        url: storageLocation,
      },
    });
  } catch (error) {
    const errorId = logControllerError('Get document URL', error, {
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to get document URL',
      errorId,
    });
  }
};
