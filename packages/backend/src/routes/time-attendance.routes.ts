import express from 'express';
import timeAttendanceController from '../controllers/time-attendance.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Clock in/out endpoints
router.post('/clock-in', timeAttendanceController.clockIn.bind(timeAttendanceController));
router.post('/clock-out', timeAttendanceController.clockOut.bind(timeAttendanceController));

// Break endpoints (frontend compatibility)
router.post('/break-start', timeAttendanceController.startBreak.bind(timeAttendanceController));
router.post('/break-end', timeAttendanceController.endBreak.bind(timeAttendanceController));

// Current status endpoint (frontend compatibility)
router.get('/current/:userId', timeAttendanceController.getCurrentStatus.bind(timeAttendanceController));

// Entries and records endpoints (frontend compatibility)
router.get('/entries', timeAttendanceController.getAllRecords.bind(timeAttendanceController));
router.get('/records', timeAttendanceController.getAllRecords.bind(timeAttendanceController));

// Stats endpoint (frontend compatibility) - alias for summary
router.get('/stats/:userId', timeAttendanceController.getUserAttendanceSummary.bind(timeAttendanceController));

// Export endpoint (frontend compatibility)
router.get('/export', timeAttendanceController.exportAttendance.bind(timeAttendanceController));

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
