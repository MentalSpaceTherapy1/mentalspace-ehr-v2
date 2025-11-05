import { Request, Response } from 'express';
import * as PayerRuleService from '../services/payerRule.service';
import logger from '../utils/logger';

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

    return res.json({
      success: true,
      data: rules,
      total: rules.length,
    });
  } catch (error: any) {
    logger.error('Error fetching payer rules', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payer rules',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/payer-rules/stats
 * Get payer rule statistics
 */
export const getPayerRuleStats = async (req: Request, res: Response) => {
  try {
    const stats = await PayerRuleService.getPayerRuleStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching payer rule stats', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payer rule statistics',
      error: error.message,
    });
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
      return res.status(404).json({
        success: false,
        message: 'Payer rule not found',
      });
    }

    return res.json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    logger.error('Error fetching payer rule', { error: error.message, ruleId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payer rule',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/payer-rules
 * Create new payer rule
 */
export const createPayerRule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const ruleData = {
      ...req.body,
      effectiveDate: new Date(req.body.effectiveDate),
      terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : undefined,
      createdBy: userId,
    };

    // Validation
    if (!ruleData.payerId || !ruleData.clinicianCredential || !ruleData.placeOfService || !ruleData.serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Payer ID, clinician credential, place of service, and service type are required',
      });
    }

    const rule = await PayerRuleService.createPayerRule(ruleData);

    return res.status(201).json({
      success: true,
      message: 'Payer rule created successfully',
      data: rule,
    });
  } catch (error: any) {
    logger.error('Error creating payer rule', { error: error.message, body: req.body });
    return res.status(500).json({
      success: false,
      message: 'Failed to create payer rule',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Payer rule updated successfully',
      data: rule,
    });
  } catch (error: any) {
    logger.error('Error updating payer rule', { error: error.message, ruleId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to update payer rule',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Payer rule deleted successfully',
      data: rule,
    });
  } catch (error: any) {
    logger.error('Error deleting payer rule', { error: error.message, ruleId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete payer rule',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error testing payer rule', { error: error.message, ruleId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to test payer rule',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/payer-rules/bulk-import
 * Bulk import payer rules from CSV
 */
export const bulkImportPayerRules = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { rules } = req.body;

    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Expected "rules" array in request body',
      });
    }

    const result = await PayerRuleService.bulkImportPayerRules(rules, userId);

    const status = result.failed > 0 ? 206 : 200; // 206 Partial Content if some failed

    return res.status(status).json({
      success: result.failed === 0,
      message: `Import complete: ${result.success} succeeded, ${result.failed} failed`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error bulk importing payer rules', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to import payer rules',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Payer ID, clinician credential, service type, and place of service are required',
      });
    }

    const rule = await PayerRuleService.findMatchingRule(
      payerId as string,
      clinicianCredential as string,
      serviceType as string,
      placeOfService as string
    );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'No matching rule found',
      });
    }

    return res.json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    logger.error('Error finding matching rule', { error: error.message, query: req.query });
    return res.status(500).json({
      success: false,
      message: 'Failed to find matching rule',
      error: error.message,
    });
  }
};
