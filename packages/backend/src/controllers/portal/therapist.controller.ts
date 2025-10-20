import { Request, Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';

/**
 * Get therapist profile for client's assigned therapist
 * GET /api/v1/portal/therapist/profile
 */
export const getTherapistProfile = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get client with their primary therapist
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        primaryTherapistId: true,
        primaryTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
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
            licenseNumber: true,
            licenseState: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    if (!client.primaryTherapist) {
      return res.status(404).json({
        success: false,
        message: 'No therapist assigned',
      });
    }

    const therapist = client.primaryTherapist;

    logger.info(`Retrieved therapist profile for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: {
        id: therapist.id,
        name: therapist.preferredName || `${therapist.firstName} ${therapist.lastName}`,
        firstName: therapist.firstName,
        lastName: therapist.lastName,
        title: therapist.title,
        credentials: therapist.credentials,
        specialties: therapist.specialties,
        languagesSpoken: therapist.languagesSpoken,
        bio: therapist.profileBio,
        photoUrl: therapist.profilePhotoS3,
        yearsOfExperience: therapist.yearsOfExperience,
        education: therapist.education,
        approaches: therapist.approachesToTherapy,
        philosophy: therapist.treatmentPhilosophy,
        licenseNumber: therapist.licenseNumber,
        licenseState: therapist.licenseState,
        phone: therapist.phoneNumber,
        email: therapist.email,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching therapist profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch therapist profile',
    });
  }
};

/**
 * Get therapist availability (upcoming available slots)
 * GET /api/v1/portal/therapist/availability
 */
export const getTherapistAvailability = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { startDate, endDate } = req.query;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get client's therapist
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { primaryTherapistId: true },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Get therapist's schedule
    const schedule = await prisma.clinicianSchedule.findFirst({
      where: { clinicianId: client.primaryTherapistId },
      orderBy: { effectiveStartDate: 'desc' },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Therapist schedule not found',
      });
    }

    logger.info(`Retrieved therapist availability for client ${clientId}`);

    // Note: In a full implementation, you'd calculate available slots
    // based on schedule and existing appointments
    return res.status(200).json({
      success: true,
      data: {
        scheduleId: schedule.id,
        availability: schedule.weeklyScheduleJson,
        message: 'Please contact your therapist to schedule an appointment',
      },
    });
  } catch (error: any) {
    logger.error('Error fetching therapist availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch therapist availability',
    });
  }
};
