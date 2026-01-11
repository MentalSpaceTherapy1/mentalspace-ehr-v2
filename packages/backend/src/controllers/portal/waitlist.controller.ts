import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import * as waitlistService from '../../services/waitlist.service';

// ============================================================================
// PORTAL WAITLIST CONTROLLER
// Allows clients to join and manage their waitlist entries from the portal
// ============================================================================

// Validation schemas
const joinWaitlistSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID').optional(),
  appointmentTypeId: z.string().min(1, 'Appointment type is required'),
  preferredDays: z.array(z.string()).min(1, 'At least one preferred day required'),
  preferredTimes: z.array(z.string()).min(1, 'At least one preferred time required'),
  priority: z.number().int().min(1).max(5).default(1),
  notes: z.string().optional(),
});

/**
 * POST /portal/waitlist
 * Join the waitlist as a client
 */
export const joinWaitlist = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const validation = joinWaitlistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { clinicianId, appointmentTypeId, preferredDays, preferredTimes, priority, notes } = validation.data;

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, primaryTherapistId: true },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Get appointment type name
    const appointmentType = await prisma.appointmentType.findUnique({
      where: { id: appointmentTypeId },
      select: { typeName: true },
    });

    if (!appointmentType) {
      throw new AppError('Appointment type not found', 404);
    }

    // Use specified clinician or client's primary therapist
    const requestedClinicianId = clinicianId || client.primaryTherapistId;

    if (!requestedClinicianId) {
      throw new AppError('No clinician specified. Please select a clinician.', 400);
    }

    // Check if already on waitlist for same clinician and type
    const existingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        clientId,
        AND: [
          {
            OR: [
              { clinicianId: requestedClinicianId },
              { requestedClinicianId },
            ],
          },
          {
            OR: [
              { appointmentType: appointmentType.typeName },
              { requestedAppointmentType: appointmentType.typeName },
            ],
          },
        ],
        status: { in: ['ACTIVE', 'MATCHED'] },
      },
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'You are already on the waitlist for this clinician and appointment type',
      });
    }

    // Create waitlist entry using service
    // Service expects preferredTimes as string[] and priority as number
    const entry = await waitlistService.addToWaitlist({
      clientId,
      requestedClinicianId,
      requestedAppointmentType: appointmentType.typeName,
      preferredDays,
      preferredTimes: preferredTimes, // Already an array
      priority: priority, // Already a number
      notes,
      addedBy: clientId, // Client added themselves
    });

    logger.info(`Client ${clientId} joined waitlist`, { entryId: entry.id });

    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist',
      data: entry,
    });
  } catch (error: any) {
    logger.error('Error joining waitlist:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to join waitlist',
    });
  }
};

/**
 * DELETE /portal/waitlist/:entryId
 * Remove self from waitlist
 */
export const leaveWaitlist = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { entryId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify the entry belongs to this client
    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        id: entryId,
        clientId,
        status: { in: ['ACTIVE', 'MATCHED'] },
      },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found or already processed',
      });
    }

    // Remove from waitlist
    await waitlistService.removeFromWaitlist(
      entryId,
      'Client removed themselves from waitlist',
      clientId
    );

    logger.info(`Client ${clientId} left waitlist`, { entryId });

    res.status(200).json({
      success: true,
      message: 'Successfully removed from waitlist',
    });
  } catch (error: any) {
    logger.error('Error leaving waitlist:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to leave waitlist',
    });
  }
};

/**
 * GET /portal/waitlist/my-entries
 * Get current client's waitlist entries
 */
export const getMyWaitlistEntries = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const entries = await prisma.waitlistEntry.findMany({
      where: {
        clientId,
        status: { in: ['ACTIVE', 'MATCHED'] },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: entries.map(entry => ({
        id: entry.id,
        clinicianId: entry.clinicianId || entry.requestedClinicianId,
        appointmentType: entry.appointmentType || entry.requestedAppointmentType,
        preferredDays: entry.preferredDays,
        preferredTimes: entry.preferredTimes,
        priority: entry.priority,
        status: entry.status,
        joinedAt: entry.joinedAt || entry.createdAt,
        notes: entry.notes,
        clinician: entry.clinician,
      })),
    });
  } catch (error: any) {
    logger.error('Error getting waitlist entries:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get waitlist entries',
    });
  }
};

/**
 * GET /portal/waitlist/my-offers
 * Get current client's waitlist offers
 */
export const getMyWaitlistOffers = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get entries with pending offers
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        clientId,
        status: 'MATCHED',
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        offers: {
          where: {
            status: 'PENDING',
          },
          include: {
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Flatten offers
    const offers = entries.flatMap(entry =>
      entry.offers.map(offer => ({
        id: offer.id,
        waitlistEntryId: entry.id,
        clinicianId: offer.clinicianId,
        appointmentDate: offer.appointmentDate,
        startTime: offer.startTime,
        endTime: offer.endTime,
        status: offer.status,
        expiresAt: offer.expiresAt,
        matchScore: offer.matchScore,
        matchReasons: offer.matchReasons,
        clinician: offer.clinician,
        appointmentType: entry.appointmentType || entry.requestedAppointmentType,
      }))
    );

    res.status(200).json({
      success: true,
      data: offers,
    });
  } catch (error: any) {
    logger.error('Error getting waitlist offers:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get waitlist offers',
    });
  }
};
