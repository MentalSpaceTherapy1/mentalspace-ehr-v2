import { Router } from 'express';
import * as appointmentTypeController from '../controllers/appointmentType.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All appointment type routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/appointment-types/stats
 * Get appointment type statistics
 */
router.get('/stats', appointmentTypeController.getAppointmentTypeStats);

/**
 * GET /api/v1/appointment-types/active
 * Get only active appointment types
 */
router.get('/active', appointmentTypeController.getActiveAppointmentTypes);

/**
 * GET /api/v1/appointment-types/category/:category
 * Get appointment types by category (INDIVIDUAL, GROUP, FAMILY, COUPLES)
 */
router.get('/category/:category', appointmentTypeController.getAppointmentTypesByCategory);

/**
 * GET /api/v1/appointment-types
 * List all appointment types with optional filters
 */
router.get('/', appointmentTypeController.getAllAppointmentTypes);

/**
 * GET /api/v1/appointment-types/:id
 * Get appointment type by ID
 */
router.get('/:id', appointmentTypeController.getAppointmentTypeById);

/**
 * POST /api/v1/appointment-types
 * Create new appointment type
 */
router.post('/', appointmentTypeController.createAppointmentType);

/**
 * PUT /api/v1/appointment-types/:id
 * Update appointment type
 */
router.put('/:id', appointmentTypeController.updateAppointmentType);

/**
 * DELETE /api/v1/appointment-types/:id
 * Delete appointment type (soft delete if has appointments)
 */
router.delete('/:id', appointmentTypeController.deleteAppointmentType);

export default router;
