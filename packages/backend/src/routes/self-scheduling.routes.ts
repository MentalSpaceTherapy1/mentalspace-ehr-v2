import { Router } from 'express';
import {
  getAvailableClinicians,
  getAvailableSlots,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getMyAppointments,
  getAppointmentTypes,
} from '../controllers/self-scheduling.controller';
import { authenticateDual } from '../middleware/dualAuth';

/**
 * Module 7: Self-Scheduling Routes
 *
 * Client-facing routes for self-scheduling functionality
 */

const router = Router();

// All routes require authentication
router.use(authenticateDual);

/**
 * GET /api/self-schedule/clinicians
 * Get list of clinicians available for self-scheduling
 * Access: CLIENT
 */
router.get(
  '/clinicians',
  
  getAvailableClinicians
);

/**
 * GET /api/self-schedule/appointment-types
 * Get available appointment types for self-scheduling
 * Access: CLIENT
 */
router.get(
  '/appointment-types',
  
  getAppointmentTypes
);

/**
 * GET /api/self-schedule/available-slots/:clinicianId
 * Get available appointment slots for a specific clinician
 * Query params: startDate, endDate (ISO date strings)
 * Access: CLIENT
 */
router.get(
  '/available-slots/:clinicianId',
  
  getAvailableSlots
);

/**
 * GET /api/self-schedule/my-appointments
 * Get client's upcoming appointments
 * Access: CLIENT
 */
router.get(
  '/my-appointments',
  
  getMyAppointments
);

/**
 * POST /api/self-schedule/book
 * Book a new appointment
 * Access: CLIENT
 */
router.post(
  '/book',
  
  bookAppointment
);

/**
 * PUT /api/self-schedule/reschedule/:appointmentId
 * Reschedule an existing appointment
 * Access: CLIENT
 */
router.put(
  '/reschedule/:appointmentId',
  
  rescheduleAppointment
);

/**
 * DELETE /api/self-schedule/cancel/:appointmentId
 * Cancel an appointment
 * Access: CLIENT
 */
router.delete(
  '/cancel/:appointmentId',
  
  cancelAppointment
);

export default router;
