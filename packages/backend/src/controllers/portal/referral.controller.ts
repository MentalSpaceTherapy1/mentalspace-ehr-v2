import { Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendConflict, sendServerError } from '../../utils/apiResponse';

/**
 * Submit a new client referral
 * POST /api/v1/portal/referrals
 */
export const submitReferral = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const {
      referredPersonName,
      referredPersonEmail,
      referredPersonPhone,
      relationship,
      referralReason,
      additionalNotes,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate required fields
    if (!referredPersonName || !referredPersonPhone) {
      return sendBadRequest(res, 'Name and phone number are required');
    }

    // Check for duplicate referral (same phone number from same client)
    const existingReferral = await prisma.clientReferral.findFirst({
      where: {
        referredByClientId: clientId,
        referredPersonPhone,
        status: {
          in: ['PENDING', 'CONTACTED', 'SCHEDULED_INTAKE'],
        },
      },
    });

    if (existingReferral) {
      return sendConflict(res, 'You have already referred this person. We will contact them soon.');
    }

    // Create referral
    const referral = await prisma.clientReferral.create({
      data: {
        referredByClientId: clientId,
        referredPersonName,
        referredPersonEmail,
        referredPersonPhone,
        relationship,
        referralReason,
        additionalNotes,
        status: 'PENDING',
      },
    });

    logger.info(`Client ${clientId} submitted referral for ${referredPersonName}`);

    return sendCreated(res, referral, 'Thank you for your referral! We will reach out to them soon.');
  } catch (error) {
    logger.error('Error submitting referral:', error);
    return sendServerError(res, 'Failed to submit referral');
  }
};

/**
 * Get client's referral history
 * GET /api/v1/portal/referrals
 */
export const getReferrals = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const referrals = await prisma.clientReferral.findMany({
      where: {
        referredByClientId: clientId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referredPersonName: true,
        relationship: true,
        status: true,
        createdAt: true,
        contactedDate: true,
        intakeScheduledDate: true,
        convertedToClientId: true,
        convertedDate: true,
        incentiveEarned: true,
        incentiveAmount: true,
        // Don't expose contact info back to referrer for privacy
      },
    });

    logger.info(`Retrieved ${referrals.length} referrals for client ${clientId}`);

    return sendSuccess(res, referrals);
  } catch (error) {
    logger.error('Error fetching referrals:', error);
    return sendServerError(res, 'Failed to fetch referrals');
  }
};

/**
 * Get referral statistics for the client
 * GET /api/v1/portal/referrals/stats
 */
export const getReferralStats = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get counts by status
    const totalReferrals = await prisma.clientReferral.count({
      where: { referredByClientId: clientId },
    });

    const pendingReferrals = await prisma.clientReferral.count({
      where: {
        referredByClientId: clientId,
        status: 'PENDING',
      },
    });

    const contactedReferrals = await prisma.clientReferral.count({
      where: {
        referredByClientId: clientId,
        status: {
          in: ['CONTACTED', 'SCHEDULED_INTAKE'],
        },
      },
    });

    const convertedReferrals = await prisma.clientReferral.count({
      where: {
        referredByClientId: clientId,
        status: 'BECAME_CLIENT',
      },
    });

    // Calculate total incentives earned
    const incentivesResult = await prisma.clientReferral.aggregate({
      where: {
        referredByClientId: clientId,
        incentiveEarned: true,
      },
      _sum: {
        incentiveAmount: true,
      },
    });

    const stats = {
      totalReferrals,
      pendingReferrals,
      contactedReferrals,
      convertedReferrals,
      totalIncentivesEarned: incentivesResult._sum.incentiveAmount || 0,
    };

    logger.info(`Retrieved referral stats for client ${clientId}`);

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching referral stats:', error);
    return sendServerError(res, 'Failed to fetch referral statistics');
  }
};

/**
 * Get referral details
 * GET /api/v1/portal/referrals/:referralId
 */
export const getReferralDetails = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { referralId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const referral = await prisma.clientReferral.findFirst({
      where: {
        id: referralId,
        referredByClientId: clientId,
      },
      select: {
        id: true,
        referredPersonName: true,
        relationship: true,
        referralReason: true,
        additionalNotes: true,
        status: true,
        createdAt: true,
        contactedDate: true,
        intakeScheduledDate: true,
        appointmentScheduled: true,
        convertedToClientId: true,
        convertedDate: true,
        incentiveEarned: true,
        incentiveAmount: true,
        // Don't expose contact info or internal notes
      },
    });

    if (!referral) {
      return sendNotFound(res, 'Referral');
    }

    logger.info(`Client ${clientId} viewed referral ${referralId}`);

    return sendSuccess(res, referral);
  } catch (error) {
    logger.error('Error fetching referral details:', error);
    return sendServerError(res, 'Failed to fetch referral details');
  }
};
