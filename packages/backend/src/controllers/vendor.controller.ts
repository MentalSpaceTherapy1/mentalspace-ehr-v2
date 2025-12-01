/**
 * Vendor Controller
 *
 * REST API endpoints for vendor management operations
 *
 * @module controllers/vendor
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import * as vendorService from '../services/vendor.service';
import { VendorCategory } from '@prisma/client';

/**
 * POST /api/vendors
 * Create a new vendor
 */
export async function createVendor(req: Request, res: Response): Promise<void> {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json(vendor);
  } catch (error: any) {
    logControllerError('Error creating vendor', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /api/vendors/:id
 * Get vendor by ID
 */
export async function getVendor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const includeExpenses = req.query.includeExpenses === 'true';
    const includePurchaseOrders = req.query.includePurchaseOrders === 'true';

    const vendor = await vendorService.getVendorById(id, includeExpenses, includePurchaseOrders);

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    res.json(vendor);
  } catch (error: any) {
    logControllerError('Error fetching vendor', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vendors
 * List vendors with filtering
 */
export async function listVendors(req: Request, res: Response): Promise<void> {
  try {
    const {
      category,
      isActive,
      search,
      contractExpiringSoon,
      insuranceExpiringSoon,
      page,
      limit,
    } = req.query;

    const result = await vendorService.listVendors({
      category: category as VendorCategory,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      contractExpiringSoon: contractExpiringSoon === 'true',
      insuranceExpiringSoon: insuranceExpiringSoon === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    logControllerError('Error listing vendors', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/vendors/:id
 * Update vendor information
 */
export async function updateVendor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const vendor = await vendorService.updateVendor(id, req.body);
    res.json(vendor);
  } catch (error: any) {
    logControllerError('Error updating vendor', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * DELETE /api/vendors/:id
 * Deactivate a vendor
 */
export async function deactivateVendor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const vendor = await vendorService.deactivateVendor(id);
    res.json(vendor);
  } catch (error: any) {
    logControllerError('Error deactivating vendor', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vendors/:id/performance
 * Get vendor performance metrics
 */
export async function getVendorPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const metrics = await vendorService.getVendorPerformanceMetrics(id);
    res.json(metrics);
  } catch (error: any) {
    logControllerError('Error fetching vendor performance', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vendors/attention-required
 * Get vendors requiring attention
 */
export async function getVendorsRequiringAttention(req: Request, res: Response): Promise<void> {
  try {
    const result = await vendorService.getVendorsRequiringAttention();
    res.json(result);
  } catch (error: any) {
    logControllerError('Error fetching vendors requiring attention', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vendors/:id/spending
 * Get vendor spending summary
 */
export async function getVendorSpending(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { fiscalYear } = req.query;

    const summary = await vendorService.getVendorSpendingSummary(
      id,
      fiscalYear ? parseInt(fiscalYear as string) : undefined
    );

    res.json(summary);
  } catch (error: any) {
    logControllerError('Error fetching vendor spending', error);
    res.status(500).json({ error: error.message });
  }
}
