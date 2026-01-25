/**
 * Treatment Plan Compliance Controller
 * Phase 5.x: Endpoints for treatment plan compliance tracking
 */

import { Request, Response } from 'express';
import { getErrorMessage } from '../utils/errorHelpers';
import logger from '../utils/logger';
import {
  getClientTreatmentPlanStatus,
  getAllClientsTreatmentPlanStatus,
  getTreatmentPlanComplianceSummary,
  getDashboardTreatmentPlanData,
  isClientTreatmentPlanOverdue,
} from '../services/treatmentPlanCompliance.service';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '../utils/apiResponse';

/**
 * GET /api/treatment-plan-compliance/client/:clientId
 * Get treatment plan status for a specific client
 */
export const getClientStatus = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const status = await getClientTreatmentPlanStatus(clientId);

    if (!status) {
      return sendNotFound(res, 'Client');
    }

    logger.info('Treatment plan status retrieved', {
      userId: req.user?.userId,
      clientId,
      status: status.status,
    });

    return sendSuccess(res, status);
  } catch (error) {
    logger.error('Error getting client treatment plan status', {
      error: getErrorMessage(error),
      clientId: req.params.clientId,
    });
    return sendServerError(res, 'Failed to retrieve treatment plan status');
  }
};

/**
 * GET /api/treatment-plan-compliance/check/:clientId
 * Check if client's treatment plan is overdue (for note blocking)
 */
export const checkClientCompliance = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const result = await isClientTreatmentPlanOverdue(clientId);

    logger.info('Treatment plan compliance check', {
      userId: req.user?.userId,
      clientId,
      isOverdue: result.isOverdue,
      status: result.status,
    });

    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Error checking treatment plan compliance', {
      error: getErrorMessage(error),
      clientId: req.params.clientId,
    });
    return sendServerError(res, 'Failed to check treatment plan compliance');
  }
};

/**
 * GET /api/treatment-plan-compliance/all
 * Get treatment plan status for all active clients
 * Optional query param: clinicianId to filter by clinician
 */
export const getAllClientsStatus = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.query;
    const userId = req.user?.userId;

    // If user is a clinician (not admin/supervisor), only show their clients
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.some((r: string) =>
      ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR', 'CLINICAL_DIRECTOR'].includes(r)
    );

    const effectiveClinicianId = isAdmin
      ? (clinicianId as string | undefined)
      : userId;

    const statuses = await getAllClientsTreatmentPlanStatus(effectiveClinicianId);

    logger.info('All treatment plan statuses retrieved', {
      userId,
      clinicianId: effectiveClinicianId,
      count: statuses.length,
    });

    return sendSuccess(res, { clients: statuses, total: statuses.length });
  } catch (error) {
    logger.error('Error getting all treatment plan statuses', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve treatment plan statuses');
  }
};

/**
 * GET /api/treatment-plan-compliance/summary
 * Get compliance summary statistics
 */
export const getComplianceSummary = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.query;
    const userId = req.user?.userId;

    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.some((r: string) =>
      ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR', 'CLINICAL_DIRECTOR'].includes(r)
    );

    const effectiveClinicianId = isAdmin
      ? (clinicianId as string | undefined)
      : userId;

    const summary = await getTreatmentPlanComplianceSummary(effectiveClinicianId);

    logger.info('Treatment plan compliance summary retrieved', {
      userId,
      clinicianId: effectiveClinicianId,
      summary,
    });

    return sendSuccess(res, summary);
  } catch (error) {
    logger.error('Error getting compliance summary', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve compliance summary');
  }
};

/**
 * GET /api/treatment-plan-compliance/dashboard
 * Get dashboard widget data for treatment plan compliance
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { clinicianId, limit } = req.query;
    const userId = req.user?.userId;

    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.some((r: string) =>
      ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR', 'CLINICAL_DIRECTOR'].includes(r)
    );

    const effectiveClinicianId = isAdmin
      ? (clinicianId as string | undefined)
      : userId;

    const data = await getDashboardTreatmentPlanData(
      effectiveClinicianId,
      limit ? parseInt(limit as string, 10) : 10
    );

    logger.info('Treatment plan dashboard data retrieved', {
      userId,
      clinicianId: effectiveClinicianId,
      overdueCount: data.overdueClients.length,
      dueSoonCount: data.dueSoonClients.length,
    });

    return sendSuccess(res, data);
  } catch (error) {
    logger.error('Error getting dashboard data', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve dashboard data');
  }
};
