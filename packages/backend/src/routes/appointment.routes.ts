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
  getOrCreateAppointment,
  getProviderComparison,
  quickReschedule,
  validateTimeSlot,
  getRoomView,
  bulkUpdateStatus,
  bulkCancelAppointments,
  bulkDeleteAppointments,
  bulkAssignRoom,
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

// Get provider comparison view (must be before /:id to avoid route collision)
router.get(
  '/provider-comparison',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'),
  getProviderComparison
);

// Get room view for resource scheduling (must be before /:id to avoid route collision)
router.get(
  '/room-view',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'),
  getRoomView
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

// Get or create appointment (for clinical notes)
router.post(
  '/get-or-create',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'),
  getOrCreateAppointment
);

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

// Quick reschedule (for drag-and-drop)
router.post('/:id/quick-reschedule', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), quickReschedule);

// Validate time slot availability (for drag-and-drop preview)
router.post('/validate-slot', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), validateTimeSlot);

// Bulk operations
router.post('/bulk/update-status', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), bulkUpdateStatus);
router.post('/bulk/cancel', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), bulkCancelAppointments);
router.post('/bulk/assign-room', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), bulkAssignRoom);
router.delete('/bulk/delete', authorize('ADMINISTRATOR', 'SUPERVISOR'), bulkDeleteAppointments);

// Mark as no-show
router.post('/:id/no-show', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), markNoShow);

// Delete appointment
router.delete('/:id', authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'), deleteAppointment);

export default router;
