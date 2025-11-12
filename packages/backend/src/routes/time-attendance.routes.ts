import express from 'express';
import timeAttendanceController from '../controllers/time-attendance.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Clock in/out endpoints
router.post('/clock-in', timeAttendanceController.clockIn.bind(timeAttendanceController));
router.post('/clock-out', timeAttendanceController.clockOut.bind(timeAttendanceController));

// Bulk operations and special endpoints (must come before :id routes)
router.get('/statistics', timeAttendanceController.getStatistics.bind(timeAttendanceController));
router.get('/pending-approvals', timeAttendanceController.getPendingApprovals.bind(timeAttendanceController));
router.post('/bulk-approve', timeAttendanceController.bulkApprove.bind(timeAttendanceController));
router.get('/summary/:userId', timeAttendanceController.getUserAttendanceSummary.bind(timeAttendanceController));

// CRUD operations
router.post('/', timeAttendanceController.createRecord.bind(timeAttendanceController));
router.get('/', timeAttendanceController.getAllRecords.bind(timeAttendanceController));
router.get('/:id', timeAttendanceController.getRecordById.bind(timeAttendanceController));
router.put('/:id', timeAttendanceController.updateRecord.bind(timeAttendanceController));
router.delete('/:id', timeAttendanceController.deleteRecord.bind(timeAttendanceController));

// Approval action
router.post('/:id/approve', timeAttendanceController.approveRecord.bind(timeAttendanceController));

export default router;
