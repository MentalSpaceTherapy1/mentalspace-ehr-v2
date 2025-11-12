import express from 'express';
import ptoController from '../controllers/pto.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Special endpoints (must come before :id routes)
router.get('/calendar', ptoController.getPTOCalendar.bind(ptoController));
router.post('/process-accruals', ptoController.processAccruals.bind(ptoController));

// PTO Request routes
router.post('/requests', ptoController.createRequest.bind(ptoController));
router.get('/requests', ptoController.getAllRequests.bind(ptoController));
router.get('/requests/pending', ptoController.getPendingRequests.bind(ptoController));
router.get('/requests/:id', ptoController.getRequestById.bind(ptoController));
router.put('/requests/:id', ptoController.updateRequest.bind(ptoController));
router.delete('/requests/:id', ptoController.deleteRequest.bind(ptoController));

// Request workflow actions
router.post('/requests/:id/approve', ptoController.approveRequest.bind(ptoController));
router.post('/requests/:id/deny', ptoController.denyRequest.bind(ptoController));
router.post('/requests/:id/cancel', ptoController.cancelRequest.bind(ptoController));

// PTO Balance routes
router.get('/balance/:userId', ptoController.getBalance.bind(ptoController));
router.put('/balance/:userId', ptoController.updateBalance.bind(ptoController));

export default router;
