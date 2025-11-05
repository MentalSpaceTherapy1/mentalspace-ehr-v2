import { Request, Response } from 'express';
import * as AppointmentTypeService from '../services/appointmentType.service';
import logger from '../utils/logger';

/**
 * Module 3 Phase 1.2: Appointment Type Controller
 * Manages appointment types with smart defaults and business rules
 */

/**
 * GET /api/v1/appointment-types
 * List all appointment types with optional filters
 */
export const getAllAppointmentTypes = async (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      isBillable: req.query.isBillable ? req.query.isBillable === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    const appointmentTypes = await AppointmentTypeService.getAllAppointmentTypes(filters);

    return res.json({
      success: true,
      data: appointmentTypes,
      total: appointmentTypes.length,
    });
  } catch (error: any) {
    logger.error('Error fetching appointment types', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment types',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/appointment-types/active
 * Get only active appointment types
 */
export const getActiveAppointmentTypes = async (req: Request, res: Response) => {
  try {
    const appointmentTypes = await AppointmentTypeService.getActiveAppointmentTypes();

    return res.json({
      success: true,
      data: appointmentTypes,
      total: appointmentTypes.length,
    });
  } catch (error: any) {
    logger.error('Error fetching active appointment types', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active appointment types',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/appointment-types/category/:category
 * Get appointment types by category
 */
export const getAppointmentTypesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const validCategories = ['INDIVIDUAL', 'GROUP', 'FAMILY', 'COUPLES'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const appointmentTypes = await AppointmentTypeService.getAppointmentTypesByCategory(
      category as 'INDIVIDUAL' | 'GROUP' | 'FAMILY' | 'COUPLES'
    );

    return res.json({
      success: true,
      data: appointmentTypes,
      total: appointmentTypes.length,
    });
  } catch (error: any) {
    logger.error('Error fetching appointment types by category', {
      error: error.message,
      category: req.params.category,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment types by category',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/appointment-types/stats
 * Get appointment type statistics
 */
export const getAppointmentTypeStats = async (req: Request, res: Response) => {
  try {
    const stats = await AppointmentTypeService.getAppointmentTypeStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching appointment type stats', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment type statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/appointment-types/:id
 * Get appointment type by ID
 */
export const getAppointmentTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointmentType = await AppointmentTypeService.getAppointmentTypeById(id);

    if (!appointmentType) {
      return res.status(404).json({
        success: false,
        message: 'Appointment type not found',
      });
    }

    return res.json({
      success: true,
      data: appointmentType,
    });
  } catch (error: any) {
    logger.error('Error fetching appointment type', {
      error: error.message,
      appointmentTypeId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment type',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/appointment-types
 * Create new appointment type
 */
export const createAppointmentType = async (req: Request, res: Response) => {
  try {
    const {
      typeName,
      category,
      description,
      defaultDuration,
      bufferBefore,
      bufferAfter,
      isBillable,
      requiresAuth,
      requiresSupervisor,
      maxPerDay,
      cptCode,
      defaultRate,
      colorCode,
      iconName,
      isActive,
      allowOnlineBooking,
    } = req.body;

    // Validation
    if (!typeName || !defaultDuration || !category) {
      return res.status(400).json({
        success: false,
        message: 'Type name, default duration, and category are required',
      });
    }

    const validCategories = ['INDIVIDUAL', 'GROUP', 'FAMILY', 'COUPLES'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    if (typeof defaultDuration !== 'number' || defaultDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Default duration must be a positive number',
      });
    }

    const appointmentType = await AppointmentTypeService.createAppointmentType({
      typeName,
      category,
      description,
      defaultDuration,
      bufferBefore,
      bufferAfter,
      isBillable,
      requiresAuth,
      requiresSupervisor,
      maxPerDay,
      cptCode,
      defaultRate,
      colorCode,
      iconName,
      isActive,
      allowOnlineBooking,
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment type created successfully',
      data: appointmentType,
    });
  } catch (error: any) {
    logger.error('Error creating appointment type', { error: error.message, body: req.body });

    // Handle unique constraint violation
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create appointment type',
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/appointment-types/:id
 * Update appointment type
 */
export const updateAppointmentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate category if provided
    if (updates.category) {
      const validCategories = ['INDIVIDUAL', 'GROUP', 'FAMILY', 'COUPLES'];
      if (!validCategories.includes(updates.category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
      }
    }

    // Validate duration if provided
    if (updates.defaultDuration !== undefined) {
      if (typeof updates.defaultDuration !== 'number' || updates.defaultDuration <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Default duration must be a positive number',
        });
      }
    }

    const appointmentType = await AppointmentTypeService.updateAppointmentType(id, updates);

    return res.json({
      success: true,
      message: 'Appointment type updated successfully',
      data: appointmentType,
    });
  } catch (error: any) {
    logger.error('Error updating appointment type', {
      error: error.message,
      appointmentTypeId: req.params.id,
    });

    // Handle unique constraint violation
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    // Handle not found error
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Appointment type not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment type',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/appointment-types/:id
 * Delete appointment type (soft delete)
 */
export const deleteAppointmentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointmentType = await AppointmentTypeService.deleteAppointmentType(id);

    return res.json({
      success: true,
      message: appointmentType.isActive === false
        ? 'Appointment type deactivated successfully (has existing appointments)'
        : 'Appointment type deleted successfully',
      data: appointmentType,
    });
  } catch (error: any) {
    logger.error('Error deleting appointment type', {
      error: error.message,
      appointmentTypeId: req.params.id,
    });

    // Handle not found error
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Appointment type not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete appointment type',
      error: error.message,
    });
  }
};
