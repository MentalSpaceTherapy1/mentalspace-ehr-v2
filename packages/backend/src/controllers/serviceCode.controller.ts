import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

/**
 * Get all service codes
 * GET /api/v1/service-codes
 */
export const getAllServiceCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive, serviceType, category } = req.query;

    const where: any = {};

    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Filter by service type
    if (serviceType) {
      where.serviceType = serviceType as string;
    }

    // Filter by category
    if (category) {
      where.category = category as string;
    }

    const serviceCodes = await prisma.serviceCode.findMany({
      where,
      orderBy: [
        { serviceType: 'asc' },
        { code: 'asc' },
      ],
    });

    res.status(200).json({
      success: true,
      data: serviceCodes,
      count: serviceCodes.length,
    });
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

    const serviceCode = await prisma.serviceCode.findUnique({
      where: { id },
    });

    if (!serviceCode) {
      return res.status(404).json({
        success: false,
        message: 'Service code not found',
      });
    }

    res.status(200).json({
      success: true,
      data: serviceCode,
    });
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

    const serviceCode = await prisma.serviceCode.findUnique({
      where: { code },
    });

    if (!serviceCode) {
      return res.status(404).json({
        success: false,
        message: 'Service code not found',
      });
    }

    res.status(200).json({
      success: true,
      data: serviceCode,
    });
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
    const {
      code,
      description,
      serviceType,
      category,
      defaultDuration,
      defaultRate,
      isActive,
      requiresAuthorization,
    } = req.body;

    const userId = req.user?.userId;

    const serviceCode = await prisma.serviceCode.create({
      data: {
        code,
        description,
        serviceType,
        category,
        defaultDuration,
        defaultRate,
        isActive: isActive !== undefined ? isActive : true,
        requiresAuthorization: requiresAuthorization !== undefined ? requiresAuthorization : false,
        createdBy: userId,
        lastModifiedBy: userId,
      },
    });

    res.status(201).json({
      success: true,
      data: serviceCode,
      message: 'Service code created successfully',
    });
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
    const {
      code,
      description,
      serviceType,
      category,
      defaultDuration,
      defaultRate,
      isActive,
      requiresAuthorization,
    } = req.body;

    const userId = req.user?.userId;

    const serviceCode = await prisma.serviceCode.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(description && { description }),
        ...(serviceType && { serviceType }),
        ...(category !== undefined && { category }),
        ...(defaultDuration !== undefined && { defaultDuration }),
        ...(defaultRate !== undefined && { defaultRate }),
        ...(isActive !== undefined && { isActive }),
        ...(requiresAuthorization !== undefined && { requiresAuthorization }),
        lastModifiedBy: userId,
      },
    });

    res.status(200).json({
      success: true,
      data: serviceCode,
      message: 'Service code updated successfully',
    });
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

    const serviceCode = await prisma.serviceCode.update({
      where: { id },
      data: {
        isActive: false,
        lastModifiedBy: userId,
      },
    });

    res.status(200).json({
      success: true,
      data: serviceCode,
      message: 'Service code deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};
