import { Request, Response } from 'express';
import * as PayerService from '../services/payer.service';
import logger from '../utils/logger';

/**
 * Phase 2.1: Payer Controller
 * Manages insurance payers
 */

/**
 * GET /api/v1/payers
 * List all payers with optional filters
 */
export const getPayers = async (req: Request, res: Response) => {
  try {
    const filters = {
      payerType: req.query.payerType as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    const payers = await PayerService.getPayers(filters);

    return res.json({
      success: true,
      data: payers,
      total: payers.length,
    });
  } catch (error: any) {
    logger.error('Error fetching payers', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payers',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/payers/stats
 * Get payer statistics
 */
export const getPayerStats = async (req: Request, res: Response) => {
  try {
    const stats = await PayerService.getPayerStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching payer stats', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payer statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/payers/:id
 * Get payer by ID
 */
export const getPayerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payer = await PayerService.getPayerById(id);

    if (!payer) {
      return res.status(404).json({
        success: false,
        message: 'Payer not found',
      });
    }

    return res.json({
      success: true,
      data: payer,
    });
  } catch (error: any) {
    logger.error('Error fetching payer', { error: error.message, payerId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payer',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/payers
 * Create new payer
 */
export const createPayer = async (req: Request, res: Response) => {
  try {
    const { name, payerType, requiresPreAuth, isActive } = req.body;

    // Validation
    if (!name || !payerType) {
      return res.status(400).json({
        success: false,
        message: 'Name and payer type are required',
      });
    }

    const validPayerTypes = ['COMMERCIAL', 'MEDICAID', 'MEDICARE', 'EAP', 'SELF_PAY'];
    if (!validPayerTypes.includes(payerType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payer type. Must be one of: ${validPayerTypes.join(', ')}`,
      });
    }

    const payer = await PayerService.createPayer({
      name,
      payerType,
      requiresPreAuth,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Payer created successfully',
      data: payer,
    });
  } catch (error: any) {
    logger.error('Error creating payer', { error: error.message, body: req.body });
    return res.status(500).json({
      success: false,
      message: 'Failed to create payer',
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/payers/:id
 * Update payer
 */
export const updatePayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const payer = await PayerService.updatePayer(id, updates);

    return res.json({
      success: true,
      message: 'Payer updated successfully',
      data: payer,
    });
  } catch (error: any) {
    logger.error('Error updating payer', { error: error.message, payerId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to update payer',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/payers/:id
 * Delete payer (soft delete)
 */
export const deletePayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payer = await PayerService.deletePayer(id);

    return res.json({
      success: true,
      message: 'Payer deleted successfully',
      data: payer,
    });
  } catch (error: any) {
    logger.error('Error deleting payer', { error: error.message, payerId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete payer',
      error: error.message,
    });
  }
};
