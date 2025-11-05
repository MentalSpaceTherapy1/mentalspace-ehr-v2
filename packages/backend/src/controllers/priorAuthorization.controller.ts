import { Request, Response } from 'express';
import * as PriorAuthService from '../services/priorAuthorization.service';
import logger from '../utils/logger';

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

    return res.json({
      success: true,
      data: authorizations,
      total: authorizations.length,
    });
  } catch (error: any) {
    logger.error('Error fetching prior authorizations', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch prior authorizations',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/prior-authorizations/stats
 * Get authorization statistics
 */
export const getAuthorizationStats = async (req: Request, res: Response) => {
  try {
    const stats = await PriorAuthService.getAuthorizationStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching authorization stats', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch authorization statistics',
      error: error.message,
    });
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
      return res.status(404).json({
        success: false,
        message: 'Prior authorization not found',
      });
    }

    return res.json({
      success: true,
      data: authorization,
    });
  } catch (error: any) {
    logger.error('Error fetching prior authorization', {
      error: error.message,
      authId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch prior authorization',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: [
          'clientId',
          'insuranceId',
          'authorizationNumber',
          'authorizationType',
          'sessionsAuthorized',
          'startDate',
          'endDate',
          'requestingProviderId',
        ],
      });
    }

    const validTypes = [
      'OUTPATIENT_THERAPY',
      'INPATIENT',
      'ASSESSMENT',
      'MEDICATION_MANAGEMENT',
    ];
    if (!validTypes.includes(authorizationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid authorization type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    if (sessionsAuthorized <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sessions authorized must be greater than 0',
      });
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
      createdBy: (req as any).user.id, // From auth middleware
    });

    return res.status(201).json({
      success: true,
      message: 'Prior authorization created successfully',
      data: authorization,
    });
  } catch (error: any) {
    logger.error('Error creating prior authorization', {
      error: error.message,
      body: req.body,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to create prior authorization',
      error: error.message,
    });
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
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
    }

    // Convert date strings to Date objects
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.approvalDate) updates.approvalDate = new Date(updates.approvalDate);

    const authorization = await PriorAuthService.updateAuthorization(id, updates);

    return res.json({
      success: true,
      message: 'Prior authorization updated successfully',
      data: authorization,
    });
  } catch (error: any) {
    logger.error('Error updating prior authorization', {
      error: error.message,
      authId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to update prior authorization',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionDate and providerId',
      });
    }

    const authorization = await PriorAuthService.useSession({
      authId: id,
      sessionDate: new Date(sessionDate),
      providerId,
    });

    return res.json({
      success: true,
      message: 'Session used successfully',
      data: authorization,
      sessionsRemaining: authorization.sessionsRemaining,
    });
  } catch (error: any) {
    logger.error('Error using session', {
      error: error.message,
      authId: req.params.id,
    });

    // Return 400 for business logic errors (expired, exhausted, etc.)
    const status = error.message.includes('expired') || error.message.includes('exhausted')
      ? 400
      : 500;

    return res.status(status).json({
      success: false,
      message: 'Failed to use session',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['newSessionsRequested', 'newEndDate', 'renewalJustification'],
      });
    }

    if (newSessionsRequested <= 0) {
      return res.status(400).json({
        success: false,
        message: 'New sessions requested must be greater than 0',
      });
    }

    const newAuthorization = await PriorAuthService.initiateRenewal({
      currentAuthId: id,
      newSessionsRequested,
      newEndDate: new Date(newEndDate),
      renewalJustification,
      requestingProviderId: (req as any).user.id, // From auth middleware
    });

    return res.status(201).json({
      success: true,
      message: 'Renewal initiated successfully',
      data: newAuthorization,
    });
  } catch (error: any) {
    logger.error('Error initiating renewal', {
      error: error.message,
      authId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate renewal',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Expiring authorizations checked successfully',
    });
  } catch (error: any) {
    logger.error('Error checking expiring authorizations', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to check expiring authorizations',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Prior authorization deleted successfully',
      data: authorization,
    });
  } catch (error: any) {
    logger.error('Error deleting prior authorization', {
      error: error.message,
      authId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete prior authorization',
      error: error.message,
    });
  }
};
