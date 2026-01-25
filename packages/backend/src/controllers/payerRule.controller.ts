import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as PayerRuleService from '../services/payerRule.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * Phase 2.1: Payer Rule Controller
 * Manages payer-specific billing rules
 */

/**
 * GET /api/v1/payer-rules
 * List all payer rules with optional filters
 */
export const getPayerRules = async (req: Request, res: Response) => {
  try {
    const filters = {
      payerId: req.query.payerId as string | undefined,
      clinicianCredential: req.query.clinicianCredential as string | undefined,
      serviceType: req.query.serviceType as string | undefined,
      placeOfService: req.query.placeOfService as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      isProhibited: req.query.isProhibited ? req.query.isProhibited === 'true' : undefined,
    };

    const rules = await PayerRuleService.getPayerRules(filters);

    return sendSuccess(res, { rules, total: rules.length });
  } catch (error) {
    logger.error('Error fetching payer rules', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch payer rules');
  }
};

/**
 * GET /api/v1/payer-rules/stats
 * Get payer rule statistics
 */
export const getPayerRuleStats = async (req: Request, res: Response) => {
  try {
    const stats = await PayerRuleService.getPayerRuleStats();

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching payer rule stats', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch payer rule statistics');
  }
};

/**
 * GET /api/v1/payer-rules/:id
 * Get payer rule by ID
 */
export const getPayerRuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await PayerRuleService.getPayerRuleById(id);

    if (!rule) {
      return sendNotFound(res, 'Payer rule');
    }

    return sendSuccess(res, rule);
  } catch (error) {
    logger.error('Error fetching payer rule', { error: getErrorMessage(error), ruleId: req.params.id });
    return sendServerError(res, 'Failed to fetch payer rule');
  }
};

/**
 * POST /api/v1/payer-rules
 * Create new payer rule
 */
export const createPayerRule = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const ruleData = {
      ...req.body,
      effectiveDate: new Date(req.body.effectiveDate),
      terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : undefined,
      createdBy: userId,
    };

    // Validation
    if (!ruleData.payerId || !ruleData.clinicianCredential || !ruleData.placeOfService || !ruleData.serviceType) {
      return sendBadRequest(res, 'Payer ID, clinician credential, place of service, and service type are required');
    }

    const rule = await PayerRuleService.createPayerRule(ruleData);

    return sendCreated(res, rule, 'Payer rule created successfully');
  } catch (error) {
    logger.error('Error creating payer rule', { error: getErrorMessage(error), body: req.body });
    return sendServerError(res, 'Failed to create payer rule');
  }
};

/**
 * PUT /api/v1/payer-rules/:id
 * Update payer rule
 */
export const updatePayerRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
      terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : undefined,
    };

    const rule = await PayerRuleService.updatePayerRule(id, updates);

    return sendSuccess(res, rule, 'Payer rule updated successfully');
  } catch (error) {
    logger.error('Error updating payer rule', { error: getErrorMessage(error), ruleId: req.params.id });
    return sendServerError(res, 'Failed to update payer rule');
  }
};

/**
 * DELETE /api/v1/payer-rules/:id
 * Delete payer rule (soft delete)
 */
export const deletePayerRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await PayerRuleService.deletePayerRule(id);

    return sendSuccess(res, rule, 'Payer rule deleted successfully');
  } catch (error) {
    logger.error('Error deleting payer rule', { error: getErrorMessage(error), ruleId: req.params.id });
    return sendServerError(res, 'Failed to delete payer rule');
  }
};

/**
 * POST /api/v1/payer-rules/:id/test
 * Test rule against existing notes
 */
export const testPayerRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const result = await PayerRuleService.testRuleAgainstNotes(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Error testing payer rule', { error: getErrorMessage(error), ruleId: req.params.id });
    return sendServerError(res, 'Failed to test payer rule');
  }
};

/**
 * POST /api/v1/payer-rules/bulk-import
 * Bulk import payer rules from CSV
 */
export const bulkImportPayerRules = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { rules } = req.body;

    if (!rules || !Array.isArray(rules)) {
      return sendBadRequest(res, 'Invalid request. Expected "rules" array in request body');
    }

    const result = await PayerRuleService.bulkImportPayerRules(rules, userId);

    const status = result.failed > 0 ? 206 : 200; // 206 Partial Content if some failed
    const message = `Import complete: ${result.success} succeeded, ${result.failed} failed`;

    return res.status(status).json({
      success: result.failed === 0,
      message,
      data: result,
    });
  } catch (error) {
    logger.error('Error bulk importing payer rules', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to import payer rules');
  }
};

/**
 * GET /api/v1/payer-rules/find-match
 * Find matching rule for specific parameters
 */
export const findMatchingRule = async (req: Request, res: Response) => {
  try {
    const { payerId, clinicianCredential, serviceType, placeOfService } = req.query;

    if (!payerId || !clinicianCredential || !serviceType || !placeOfService) {
      return sendBadRequest(res, 'Payer ID, clinician credential, service type, and place of service are required');
    }

    const rule = await PayerRuleService.findMatchingRule(
      payerId as string,
      clinicianCredential as string,
      serviceType as string,
      placeOfService as string
    );

    if (!rule) {
      return sendNotFound(res, 'Matching rule');
    }

    return sendSuccess(res, rule);
  } catch (error) {
    logger.error('Error finding matching rule', { error: getErrorMessage(error), query: req.query });
    return sendServerError(res, 'Failed to find matching rule');
  }
};
