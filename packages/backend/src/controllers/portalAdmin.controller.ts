import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as portalAdminService from '../services/portalAdmin.service';
import {
  sessionReviewsService,
  therapistChangeService,
} from '../services/portal';
import logger from '../utils/logger';
import { sendSuccess, sendServerError } from '../utils/apiResponse';

// ============================================================================
// ADMIN: PORTAL OVERSIGHT
// These endpoints are for admin users only
// ============================================================================

// ============================================================================
// SESSION REVIEWS (Admin View - Including Private)
// ============================================================================

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const clinicianId = req.query.clinicianId as string;
    const minRating = req.query.minRating ? parseInt(req.query.minRating as string) : undefined;
    const maxRating = req.query.maxRating ? parseInt(req.query.maxRating as string) : undefined;

    const reviews = await sessionReviewsService.getAllReviews({
      clinicianId,
      minRating,
      maxRating,
    });

    return sendSuccess(res, reviews);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch reviews';
    logger.error('Error fetching all reviews:', error);
    return sendServerError(res, errorMessage);
  }
};

export const getReviewStatistics = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.query.clinicianId as string;

    const stats = await sessionReviewsService.getReviewStatistics(clinicianId);

    return sendSuccess(res, stats);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch statistics';
    logger.error('Error fetching review statistics:', error);
    return sendServerError(res, errorMessage);
  }
};

// ============================================================================
// THERAPIST CHANGE REQUESTS (Admin Workflow)
// ============================================================================

export const getAllChangeRequests = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const isSensitive = req.query.isSensitive === 'true';

    const requests = await therapistChangeService.getAllChangeRequests({
      status,
      onlySensitive: isSensitive,
    });

    return sendSuccess(res, requests);
  } catch (error: unknown) {
    logger.error('Error fetching change requests:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch change requests';
    return sendServerError(res, errorMessage);
  }
};

const reviewChangeRequestSchema = z.object({
  reviewNotes: z.string().optional(),
});

export const reviewChangeRequest = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      return sendServerError(res, 'User not authenticated');
    }
    const { requestId } = req.params;
    const data = reviewChangeRequestSchema.parse(req.body);

    const request = await therapistChangeService.reviewChangeRequest({
      adminUserId,
      requestId,
      reviewNotes: data.reviewNotes,
    });

    return sendSuccess(res, request, 'Change request marked as under review');
  } catch (error: unknown) {
    logger.error('Error reviewing change request:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to review change request';
    return sendServerError(res, errorMessage);
  }
};

const assignNewTherapistSchema = z.object({
  newClinicianId: z.string().uuid(),
});

export const assignNewTherapist = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      return sendServerError(res, 'User not authenticated');
    }
    const { requestId } = req.params;
    const data = assignNewTherapistSchema.parse(req.body);

    const request = await therapistChangeService.assignNewTherapist({
      adminUserId,
      requestId,
      newClinicianId: data.newClinicianId,
    });

    return sendSuccess(res, request, 'New therapist assigned. Ready to complete transfer.');
  } catch (error: unknown) {
    logger.error('Error assigning new therapist:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to assign new therapist';
    return sendServerError(res, errorMessage);
  }
};

export const completeTransfer = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      return sendServerError(res, 'User not authenticated');
    }
    const { requestId } = req.params;

    const request = await therapistChangeService.completeTransfer({
      adminUserId,
      requestId,
    });

    return sendSuccess(res, request, 'Therapist transfer completed successfully');
  } catch (error: unknown) {
    logger.error('Error completing transfer:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to complete transfer';
    return sendServerError(res, errorMessage);
  }
};

const denyChangeRequestSchema = z.object({
  denialReason: z.string().min(1),
});

export const denyChangeRequest = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      return sendServerError(res, 'User not authenticated');
    }
    const { requestId } = req.params;
    const data = denyChangeRequestSchema.parse(req.body);

    const request = await therapistChangeService.denyChangeRequest({
      adminUserId,
      requestId,
      denialReason: data.denialReason,
    });

    return sendSuccess(res, request, 'Change request denied');
  } catch (error: unknown) {
    logger.error('Error denying change request:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to deny change request';
    return sendServerError(res, errorMessage);
  }
};

export const getChangeRequestStatistics = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.query.clinicianId as string | undefined;

    const stats = await therapistChangeService.getChangeRequestStatistics({
      clinicianId,
    });

    return sendSuccess(res, stats);
  } catch (error: unknown) {
    logger.error('Error fetching change request statistics:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch statistics';
    return sendServerError(res, errorMessage);
  }
};

// ============================================================================
// PORTAL ACCOUNTS (Admin Management)
// ============================================================================

export const getAllPortalAccounts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await portalAdminService.getAllPortalAccounts({
      isActive,
      limit,
      offset,
    });

    return sendSuccess(res, result);
  } catch (error: unknown) {
    logger.error('Error fetching portal accounts:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch portal accounts';
    return sendServerError(res, errorMessage);
  }
};

export const activatePortalAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const adminUserId = req.user?.userId || 'unknown';

    // Phase 3.2: Use service method instead of direct prisma call
    const account = await portalAdminService.activatePortalAccount(accountId, adminUserId);

    return sendSuccess(res, account, 'Portal account activated');
  } catch (error: unknown) {
    logger.error('Error activating portal account:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to activate portal account';
    return sendServerError(res, errorMessage);
  }
};

export const deactivatePortalAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const adminUserId = req.user?.userId || 'unknown';

    // Phase 3.2: Use service method instead of direct prisma call
    const account = await portalAdminService.deactivatePortalAccount(accountId, adminUserId);

    return sendSuccess(res, account, 'Portal account deactivated');
  } catch (error: unknown) {
    logger.error('Error deactivating portal account:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to deactivate portal account';
    return sendServerError(res, errorMessage);
  }
};

// ============================================================================
// PORTAL ANALYTICS (Admin Dashboard)
// ============================================================================

export const getPortalAnalytics = async (req: Request, res: Response) => {
  try {
    // Phase 3.2: Use service method instead of direct prisma calls
    const analytics = await portalAdminService.getPortalAnalytics();

    return sendSuccess(res, analytics);
  } catch (error: unknown) {
    logger.error('Error fetching portal analytics:', error);
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch portal analytics';
    return sendServerError(res, errorMessage);
  }
};
