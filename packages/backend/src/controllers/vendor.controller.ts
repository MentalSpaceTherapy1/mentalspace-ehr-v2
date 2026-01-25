/**
 * Vendor Controller
 *
 * REST API endpoints for vendor management operations
 *
 * @module controllers/vendor
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import * as vendorService from '../services/vendor.service';
import { VendorCategory } from '@prisma/client';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * POST /api/vendors
 * Create a new vendor
 */
export async function createVendor(req: Request, res: Response): Promise<void> {
  try {
    const vendor = await vendorService.createVendor(req.body);
    sendCreated(res, vendor, 'Vendor created successfully');
  } catch (error) {
    logControllerError('Error creating vendor', error);
    sendBadRequest(res, getErrorMessage(error));
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
      sendNotFound(res, 'Vendor');
      return;
    }

    sendSuccess(res, vendor);
  } catch (error) {
    logControllerError('Error fetching vendor', error);
    sendServerError(res, getErrorMessage(error));
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

    sendSuccess(res, result);
  } catch (error) {
    logControllerError('Error listing vendors', error);
    sendServerError(res, getErrorMessage(error));
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
    sendSuccess(res, vendor, 'Vendor updated successfully');
  } catch (error) {
    logControllerError('Error updating vendor', error);
    sendBadRequest(res, getErrorMessage(error));
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
    sendSuccess(res, vendor, 'Vendor deactivated successfully');
  } catch (error) {
    logControllerError('Error deactivating vendor', error);
    sendServerError(res, getErrorMessage(error));
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
    sendSuccess(res, metrics);
  } catch (error) {
    logControllerError('Error fetching vendor performance', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/vendors/attention-required
 * Get vendors requiring attention
 */
export async function getVendorsRequiringAttention(req: Request, res: Response): Promise<void> {
  try {
    const result = await vendorService.getVendorsRequiringAttention();
    sendSuccess(res, result);
  } catch (error) {
    logControllerError('Error fetching vendors requiring attention', error);
    sendServerError(res, getErrorMessage(error));
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

    sendSuccess(res, summary);
  } catch (error) {
    logControllerError('Error fetching vendor spending', error);
    sendServerError(res, getErrorMessage(error));
  }
}
