import { Router } from 'express';
import {
  upsertClinicianSchedule,
  getClinicianSchedule,
  getAllCliniciansSchedules,
  createScheduleException,
  getScheduleExceptions,
  approveScheduleException,
  denyScheduleException,
  deleteScheduleException,
  getClinicianAvailability,
  checkCapacity,
} from '../controllers/clinicianSchedule.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all clinicians schedules
router.get('/', getAllCliniciansSchedules);

// Create or update clinician schedule
router.post('/', upsertClinicianSchedule);

// Get clinician schedule
router.get('/:clinicianId', getClinicianSchedule);

// Get clinician availability
router.get('/:clinicianId/availability', getClinicianAvailability);

// Check clinician capacity
router.get('/:clinicianId/capacity', checkCapacity);

// Schedule exceptions
router.get('/:clinicianId/exceptions', getScheduleExceptions);
router.post('/exceptions', createScheduleException);
router.post('/exceptions/:id/approve', approveScheduleException);
router.post('/exceptions/:id/deny', denyScheduleException);
router.delete('/exceptions/:id', deleteScheduleException);

export default router;
