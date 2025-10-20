import { Router } from 'express';
import {
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByClientId,
  createAppointment,
  createRecurringAppointments,
  updateAppointment,
  checkInAppointment,
  checkOutAppointment,
  cancelAppointment,
  rescheduleAppointment,
  markNoShow,
  deleteAppointment,
} from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess } from '../middleware/clientAccess';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all appointments (with filters)
router.get(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF'),
  getAllAppointments
);

// Get all appointments for a specific client (must be before /:id to avoid route collision)
router.get(
  '/client/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF'),
  requireClientAccess('clientId', { allowBillingView: true }),
  getAppointmentsByClientId
);

// Get single appointment
router.get(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF'),
  getAppointmentById
);

// Create new appointment
router.post('/', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), createAppointment);

// Create recurring appointments
router.post(
  '/recurring',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'),
  createRecurringAppointments
);

// Update appointment
router.put('/:id', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), updateAppointment);

// Check-in appointment
router.post('/:id/check-in', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), checkInAppointment);

// Check-out appointment
router.post('/:id/check-out', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), checkOutAppointment);

// Cancel appointment
router.post('/:id/cancel', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), cancelAppointment);

// Reschedule appointment
router.post('/:id/reschedule', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), rescheduleAppointment);

// Mark as no-show
router.post('/:id/no-show', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), markNoShow);

// Delete appointment
router.delete('/:id', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), deleteAppointment);

export default router;
