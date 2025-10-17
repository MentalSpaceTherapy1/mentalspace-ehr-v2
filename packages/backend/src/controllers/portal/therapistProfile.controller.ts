import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedPortalRequest } from '../../middleware/portalAuth';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Get client's assigned therapist profile
 * GET /api/v1/portal/therapist/profile
 */
export const getMyTherapistProfile = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get client's primary therapist
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { primaryTherapistId: true },
    });

    if (!client?.primaryTherapistId) {
      return res.status(404).json({
        success: false,
        message: 'No therapist assigned',
      });
    }

    // Get therapist profile with client-facing information only
    const therapist = await prisma.user.findUnique({
      where: { id: client.primaryTherapistId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        credentials: true,
        specialties: true,
        languagesSpoken: true,
        profileBio: true,
        profilePhotoS3: true,
        yearsOfExperience: true,
        education: true,
        approachesToTherapy: true,
        treatmentPhilosophy: true,
        acceptsNewClients: true,
        licenseNumber: true,
        licenseState: true,
      },
    });

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist profile not found',
      });
    }

    logger.info(`Client ${clientId} viewed therapist profile ${therapist.id}`);

    return res.status(200).json({
      success: true,
      data: therapist,
    });
  } catch (error) {
    logger.error('Error fetching therapist profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch therapist profile',
    });
  }
};

/**
 * Get a specific therapist's public profile (for browsing/selection)
 * GET /api/v1/portal/therapist/profile/:therapistId
 */
export const getTherapistProfile = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { therapistId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get therapist profile with client-facing information only
    const therapist = await prisma.user.findFirst({
      where: {
        id: therapistId,
        role: 'CLINICIAN',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        credentials: true,
        specialties: true,
        languagesSpoken: true,
        profileBio: true,
        profilePhotoS3: true,
        yearsOfExperience: true,
        education: true,
        approachesToTherapy: true,
        treatmentPhilosophy: true,
        acceptsNewClients: true,
        licenseState: true,
      },
    });

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found',
      });
    }

    logger.info(`Client ${clientId} viewed therapist profile ${therapistId}`);

    return res.status(200).json({
      success: true,
      data: therapist,
    });
  } catch (error) {
    logger.error('Error fetching therapist profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch therapist profile',
    });
  }
};

/**
 * Get list of available therapists (for therapist change requests)
 * GET /api/v1/portal/therapist/available
 */
export const getAvailableTherapists = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get client's current therapist to exclude from list
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { primaryTherapistId: true },
    });

    // Get all active clinicians who accept new clients
    const therapists = await prisma.user.findMany({
      where: {
        role: 'CLINICIAN',
        isActive: true,
        acceptsNewClients: true,
        id: {
          not: client?.primaryTherapistId || undefined, // Exclude current therapist
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        credentials: true,
        specialties: true,
        languagesSpoken: true,
        profileBio: true,
        profilePhotoS3: true,
        yearsOfExperience: true,
        approachesToTherapy: true,
        acceptsNewClients: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    logger.info(`Client ${clientId} viewed available therapists list`);

    return res.status(200).json({
      success: true,
      data: therapists,
    });
  } catch (error) {
    logger.error('Error fetching available therapists:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available therapists',
    });
  }
};

/**
 * Search therapists by specialty, language, or approach
 * GET /api/v1/portal/therapist/search
 */
export const searchTherapists = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { specialty, language, approach } = req.query;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Build dynamic where clause
    const where: any = {
      role: 'CLINICIAN',
      isActive: true,
      acceptsNewClients: true,
    };

    if (specialty) {
      where.specialties = {
        has: specialty as string,
      };
    }

    if (language) {
      where.languagesSpoken = {
        has: language as string,
      };
    }

    if (approach) {
      where.approachesToTherapy = {
        has: approach as string,
      };
    }

    const therapists = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        credentials: true,
        specialties: true,
        languagesSpoken: true,
        profileBio: true,
        profilePhotoS3: true,
        yearsOfExperience: true,
        approachesToTherapy: true,
        acceptsNewClients: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    logger.info(`Client ${clientId} searched therapists with filters`);

    return res.status(200).json({
      success: true,
      data: therapists,
    });
  } catch (error) {
    logger.error('Error searching therapists:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search therapists',
    });
  }
};
