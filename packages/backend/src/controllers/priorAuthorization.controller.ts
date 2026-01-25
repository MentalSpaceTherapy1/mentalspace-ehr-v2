import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as PriorAuthService from '../services/priorAuthorization.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * Phase 2: Prior Authorization Controller (Module 2)
 * Handles HTTP requests for prior authorization management
 */

/**
 * GET /api/v1/prior-authorizations
 * List all prior authorizations with optional filters
 */
export const getAuthorizations = async (req: Request, res: Response) => {
  try {
    const filters = {
      clientId: req.query.clientId as string | undefined,
      insuranceId: req.query.insuranceId as string | undefined,
      status: req.query.status as string | undefined,
      authorizationType: req.query.authorizationType as string | undefined,
      expiringWithinDays: req.query.expiringWithinDays
        ? parseInt(req.query.expiringWithinDays as string)
        : undefined,
      lowSessionsThreshold: req.query.lowSessionsThreshold
        ? parseInt(req.query.lowSessionsThreshold as string)
        : undefined,
    };

    const authorizations = await PriorAuthService.getAuthorizations(filters);

    return sendSuccess(res, { authorizations, total: authorizations.length });
  } catch (error) {
    logger.error('Error fetching prior authorizations', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch prior authorizations');
  }
};

/**
 * GET /api/v1/prior-authorizations/stats
 * Get authorization statistics
 */
export const getAuthorizationStats = async (req: Request, res: Response) => {
  try {
    const stats = await PriorAuthService.getAuthorizationStats();

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching authorization stats', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch authorization statistics');
  }
};

/**
 * GET /api/v1/prior-authorizations/:id
 * Get prior authorization by ID
 */
export const getAuthorizationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authorization = await PriorAuthService.getAuthorizationById(id);

    if (!authorization) {
      return sendNotFound(res, 'Prior authorization');
    }

    return sendSuccess(res, authorization);
  } catch (error) {
    logger.error('Error fetching prior authorization', {
      error: getErrorMessage(error),
      authId: req.params.id,
    });
    return sendServerError(res, 'Failed to fetch prior authorization');
  }
};

/**
 * POST /api/v1/prior-authorizations
 * Create new prior authorization
 */
export const createAuthorization = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      insuranceId,
      authorizationNumber,
      authorizationType,
      cptCodes,
      diagnosisCodes,
      sessionsAuthorized,
      sessionUnit,
      startDate,
      endDate,
      requestingProviderId,
      performingProviderId,
      clinicalJustification,
      supportingDocuments,
    } = req.body;

    // Validation
    if (
      !clientId ||
      !insuranceId ||
      !authorizationNumber ||
      !authorizationType ||
      !sessionsAuthorized ||
      !startDate ||
      !endDate ||
      !requestingProviderId
    ) {
      return sendBadRequest(res, 'Missing required fields: clientId, insuranceId, authorizationNumber, authorizationType, sessionsAuthorized, startDate, endDate, requestingProviderId');
    }

    const validTypes = [
      'OUTPATIENT_THERAPY',
      'INPATIENT',
      'ASSESSMENT',
      'MEDICATION_MANAGEMENT',
    ];
    if (!validTypes.includes(authorizationType)) {
      return sendBadRequest(res, `Invalid authorization type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (sessionsAuthorized <= 0) {
      return sendBadRequest(res, 'Sessions authorized must be greater than 0');
    }

    const authorization = await PriorAuthService.createAuthorization({
      clientId,
      insuranceId,
      authorizationNumber,
      authorizationType,
      cptCodes: cptCodes || [],
      diagnosisCodes: diagnosisCodes || [],
      sessionsAuthorized,
      sessionUnit,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      requestingProviderId,
      performingProviderId,
      clinicalJustification,
      supportingDocuments,
      createdBy: req.user!.userId, // From auth middleware
    });

    return sendCreated(res, authorization, 'Prior authorization created successfully');
  } catch (error) {
    logger.error('Error creating prior authorization', {
      error: getErrorMessage(error),
      body: req.body,
    });
    return sendServerError(res, 'Failed to create prior authorization');
  }
};

/**
 * PUT /api/v1/prior-authorizations/:id
 * Update prior authorization
 */
export const updateAuthorization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate status if being updated
    if (updates.status) {
      const validStatuses = ['PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'EXHAUSTED'];
      if (!validStatuses.includes(updates.status)) {
        return sendBadRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Convert date strings to Date objects
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.approvalDate) updates.approvalDate = new Date(updates.approvalDate);

    const authorization = await PriorAuthService.updateAuthorization(id, updates);

    return sendSuccess(res, authorization, 'Prior authorization updated successfully');
  } catch (error) {
    logger.error('Error updating prior authorization', {
      error: getErrorMessage(error),
      authId: req.params.id,
    });
    return sendServerError(res, 'Failed to update prior authorization');
  }
};

/**
 * POST /api/v1/prior-authorizations/:id/use-session
 * Use a session from an authorization
 */
export const useSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionDate, providerId } = req.body;

    if (!sessionDate || !providerId) {
      return sendBadRequest(res, 'Missing required fields: sessionDate and providerId');
    }

    const authorization = await PriorAuthService.useSession({
      authId: id,
      sessionDate: new Date(sessionDate),
      providerId,
    });

    return sendSuccess(res, { authorization, sessionsRemaining: authorization.sessionsRemaining }, 'Session used successfully');
  } catch (error) {
    logger.error('Error using session', {
      error: getErrorMessage(error),
      authId: req.params.id,
    });

    // Return 400 for business logic errors (expired, exhausted, etc.)
    const status = getErrorMessage(error).includes('expired') || getErrorMessage(error).includes('exhausted')
      ? 400
      : 500;

    if (status === 400) {
      return sendBadRequest(res, getErrorMessage(error));
    }
    return sendServerError(res, 'Failed to use session');
  }
};

/**
 * POST /api/v1/prior-authorizations/:id/renew
 * Initiate a renewal for an authorization
 */
export const renewAuthorization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newSessionsRequested, newEndDate, renewalJustification } = req.body;

    if (!newSessionsRequested || !newEndDate || !renewalJustification) {
      return sendBadRequest(res, 'Missing required fields: newSessionsRequested, newEndDate, renewalJustification');
    }

    if (newSessionsRequested <= 0) {
      return sendBadRequest(res, 'New sessions requested must be greater than 0');
    }

    const newAuthorization = await PriorAuthService.initiateRenewal({
      currentAuthId: id,
      newSessionsRequested,
      newEndDate: new Date(newEndDate),
      renewalJustification,
      requestingProviderId: req.user!.userId, // From auth middleware
    });

    return sendCreated(res, newAuthorization, 'Renewal initiated successfully');
  } catch (error) {
    logger.error('Error initiating renewal', {
      error: getErrorMessage(error),
      authId: req.params.id,
    });
    return sendServerError(res, 'Failed to initiate renewal');
  }
};

/**
 * POST /api/v1/prior-authorizations/check-expiring
 * Manually trigger check for expiring authorizations
 * (Typically run by cron job, but can be triggered manually)
 */
export const checkExpiringAuthorizations = async (req: Request, res: Response) => {
  try {
    await PriorAuthService.checkExpiringAuthorizations();

    return sendSuccess(res, null, 'Expiring authorizations checked successfully');
  } catch (error) {
    logger.error('Error checking expiring authorizations', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to check expiring authorizations');
  }
};

/**
 * DELETE /api/v1/prior-authorizations/:id
 * Delete prior authorization
 */
export const deleteAuthorization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authorization = await PriorAuthService.deleteAuthorization(id);

    return sendSuccess(res, authorization, 'Prior authorization deleted successfully');
  } catch (error) {
    logger.error('Error deleting prior authorization', {
      error: getErrorMessage(error),
      authId: req.params.id,
    });
    return sendServerError(res, 'Failed to delete prior authorization');
  }
};
