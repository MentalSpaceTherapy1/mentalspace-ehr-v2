import { Request, Response, NextFunction } from 'express';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as serviceCodeService from '../services/serviceCode.service';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/apiResponse';

/**
 * Get all service codes
 * GET /api/v1/service-codes
 */
export const getAllServiceCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive, serviceType, category } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const serviceCodes = await serviceCodeService.getAllServiceCodes({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      serviceType: serviceType as string | undefined,
      category: category as string | undefined,
    });

    return sendSuccess(res, serviceCodes);
  } catch (error) {
    next(error);
  }
};

/**
 * Get service code by ID
 * GET /api/v1/service-codes/:id
 */
export const getServiceCodeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const serviceCode = await serviceCodeService.getServiceCodeById(id);

    if (!serviceCode) {
      return sendNotFound(res, 'Service code');
    }

    return sendSuccess(res, serviceCode);
  } catch (error) {
    next(error);
  }
};

/**
 * Get service code by code (e.g., '90791')
 * GET /api/v1/service-codes/code/:code
 */
export const getServiceCodeByCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const serviceCode = await serviceCodeService.getServiceCodeByCode(code);

    if (!serviceCode) {
      return sendNotFound(res, 'Service code');
    }

    return sendSuccess(res, serviceCode);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new service code
 * POST /api/v1/service-codes
 * Requires: ADMIN or SUPERVISOR role
 */
export const createServiceCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    const serviceCode = await serviceCodeService.createServiceCode(req.body, userId);

    return sendCreated(res, serviceCode, 'Service code created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update service code
 * PUT /api/v1/service-codes/:id
 * Requires: ADMIN or SUPERVISOR role
 */
export const updateServiceCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    const serviceCode = await serviceCodeService.updateServiceCode(id, req.body, userId);

    return sendSuccess(res, serviceCode, 'Service code updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete service code (soft delete by setting isActive = false)
 * DELETE /api/v1/service-codes/:id
 * Requires: ADMIN role
 */
export const deleteServiceCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    const serviceCode = await serviceCodeService.deleteServiceCode(id, userId);

    return sendSuccess(res, serviceCode, 'Service code deactivated successfully');
  } catch (error) {
    next(error);
  }
};
