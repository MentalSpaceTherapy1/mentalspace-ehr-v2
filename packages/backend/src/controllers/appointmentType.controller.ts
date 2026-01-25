import { Request, Response } from 'express';
import * as AppointmentTypeService from '../services/appointmentType.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendConflict } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';

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

    return sendSuccess(res, { data: appointmentTypes, total: appointmentTypes.length });
  } catch (error) {
    logger.error('Error fetching appointment types', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch appointment types');
  }
};

/**
 * GET /api/v1/appointment-types/active
 * Get only active appointment types
 */
export const getActiveAppointmentTypes = async (req: Request, res: Response) => {
  try {
    const appointmentTypes = await AppointmentTypeService.getActiveAppointmentTypes();

    return sendSuccess(res, { data: appointmentTypes, total: appointmentTypes.length });
  } catch (error) {
    logger.error('Error fetching active appointment types', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch active appointment types');
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
      return sendBadRequest(res, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    const appointmentTypes = await AppointmentTypeService.getAppointmentTypesByCategory(
      category as 'INDIVIDUAL' | 'GROUP' | 'FAMILY' | 'COUPLES'
    );

    return sendSuccess(res, { data: appointmentTypes, total: appointmentTypes.length });
  } catch (error) {
    logger.error('Error fetching appointment types by category', {
      error: getErrorMessage(error),
      category: req.params.category,
    });
    return sendServerError(res, 'Failed to fetch appointment types by category');
  }
};

/**
 * GET /api/v1/appointment-types/stats
 * Get appointment type statistics
 */
export const getAppointmentTypeStats = async (req: Request, res: Response) => {
  try {
    const stats = await AppointmentTypeService.getAppointmentTypeStats();

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching appointment type stats', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch appointment type statistics');
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
      return sendNotFound(res, 'Appointment type');
    }

    return sendSuccess(res, appointmentType);
  } catch (error) {
    logger.error('Error fetching appointment type', {
      error: getErrorMessage(error),
      appointmentTypeId: req.params.id,
    });
    return sendServerError(res, 'Failed to fetch appointment type');
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
      return sendBadRequest(res, 'Type name, default duration, and category are required');
    }

    const validCategories = ['INDIVIDUAL', 'GROUP', 'FAMILY', 'COUPLES'];
    if (!validCategories.includes(category)) {
      return sendBadRequest(res, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    if (typeof defaultDuration !== 'number' || defaultDuration <= 0) {
      return sendBadRequest(res, 'Default duration must be a positive number');
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

    return sendCreated(res, appointmentType, 'Appointment type created successfully');
  } catch (error) {
    logger.error('Error creating appointment type', { error: getErrorMessage(error), body: req.body });

    // Handle unique constraint violation
    if (getErrorMessage(error).includes('already exists')) {
      return sendConflict(res, getErrorMessage(error));
    }

    return sendServerError(res, 'Failed to create appointment type');
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
        return sendBadRequest(res, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }
    }

    // Validate duration if provided
    if (updates.defaultDuration !== undefined) {
      if (typeof updates.defaultDuration !== 'number' || updates.defaultDuration <= 0) {
        return sendBadRequest(res, 'Default duration must be a positive number');
      }
    }

    const appointmentType = await AppointmentTypeService.updateAppointmentType(id, updates);

    return sendSuccess(res, appointmentType, 'Appointment type updated successfully');
  } catch (error) {
    logger.error('Error updating appointment type', {
      error: getErrorMessage(error),
      appointmentTypeId: req.params.id,
    });

    // Handle unique constraint violation
    if (getErrorMessage(error).includes('already exists')) {
      return sendConflict(res, getErrorMessage(error));
    }

    // Handle not found error
    if (getErrorCode(error) === 'P2025') {
      return sendNotFound(res, 'Appointment type');
    }

    return sendServerError(res, 'Failed to update appointment type');
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

    const message = appointmentType.isActive === false
      ? 'Appointment type deactivated successfully (has existing appointments)'
      : 'Appointment type deleted successfully';
    return sendSuccess(res, appointmentType, message);
  } catch (error) {
    logger.error('Error deleting appointment type', {
      error: getErrorMessage(error),
      appointmentTypeId: req.params.id,
    });

    // Handle not found error
    if (getErrorCode(error) === 'P2025') {
      return sendNotFound(res, 'Appointment type');
    }

    return sendServerError(res, 'Failed to delete appointment type');
  }
};
