import { Router } from 'express';
import {
  getAllAppointments,
  getAppointmentById,
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
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all appointments (with filters)
router.get('/', getAllAppointments);

// Get single appointment
router.get('/:id', getAppointmentById);

// Create new appointment
router.post('/', createAppointment);

// Create recurring appointments
router.post('/recurring', createRecurringAppointments);

// Update appointment
router.put('/:id', updateAppointment);

// Check-in appointment
router.post('/:id/check-in', checkInAppointment);

// Check-out appointment
router.post('/:id/check-out', checkOutAppointment);

// Cancel appointment
router.post('/:id/cancel', cancelAppointment);

// Reschedule appointment
router.post('/:id/reschedule', rescheduleAppointment);

// Mark as no-show
router.post('/:id/no-show', markNoShow);

// Delete appointment
router.delete('/:id', deleteAppointment);

export default router;
