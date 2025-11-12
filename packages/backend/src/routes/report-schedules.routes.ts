import { Router } from 'express';
import { reportSchedulesController } from '../controllers/report-schedules.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Schedule management
router.post('/', reportSchedulesController.createSchedule);
router.get('/', reportSchedulesController.getSchedules);
router.get('/:id', reportSchedulesController.getScheduleById);
router.put('/:id', reportSchedulesController.updateSchedule);
router.delete('/:id', reportSchedulesController.deleteSchedule);

// Schedule actions
router.post('/:id/pause', reportSchedulesController.pauseSchedule);
router.post('/:id/resume', reportSchedulesController.resumeSchedule);
router.post('/:id/execute', reportSchedulesController.executeSchedule);

// Schedule history and stats
router.get('/:id/history', reportSchedulesController.getScheduleHistory);
router.get('/:id/stats', reportSchedulesController.getScheduleStats);

export default router;
