import express from 'express';
import ptoController from '../controllers/pto.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { auditLog } from '../middleware/auditLogger';
import {
  createPTORequestSchema,
  updatePTORequestSchema,
  approveDenyPTOSchema,
  denyPTOSchema,
  updatePTOBalanceSchema,
  ptoCalendarQuerySchema,
  uuidParamSchema,
  userIdParamSchema,
} from '../validators/pto.validator';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Special endpoints (must come before :id routes)
// Calendar is viewable by supervisors/admins to see team availability
router.get('/calendar', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']), validateQuery(ptoCalendarQuerySchema), ptoController.getPTOCalendar.bind(ptoController));
// Alias for frontend compatibility
router.get('/team-calendar', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']), validateQuery(ptoCalendarQuerySchema), ptoController.getPTOCalendar.bind(ptoController));
// Check conflicts endpoint for PTO scheduling
router.get('/check-conflicts', ptoController.checkConflicts.bind(ptoController));
// Process accruals - admin only (financial/payroll operation)
router.post('/process-accruals', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), ptoController.processAccruals.bind(ptoController));

// PTO Request routes
// Create request - any authenticated user can create their own request (ownership validated in controller)
router.post('/requests', validateBody(createPTORequestSchema), auditLog({ entityType: 'PTORequest', action: 'CREATE' }), ptoController.createRequest.bind(ptoController));
// Get all requests - admins/supervisors see all, others see own (filtered in controller)
router.get('/requests', ptoController.getAllRequests.bind(ptoController));
// Get pending requests - supervisors/admins only (to approve others' requests)
router.get('/requests/pending', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']), ptoController.getPendingRequests.bind(ptoController));
// Get/update/delete by ID - ownership validated in controller
router.get('/requests/:id', validateParams(uuidParamSchema), auditLog({ entityType: 'PTORequest', action: 'VIEW' }), ptoController.getRequestById.bind(ptoController));
router.put('/requests/:id', validateParams(uuidParamSchema), validateBody(updatePTORequestSchema), auditLog({ entityType: 'PTORequest', action: 'UPDATE' }), ptoController.updateRequest.bind(ptoController));
router.delete('/requests/:id', validateParams(uuidParamSchema), auditLog({ entityType: 'PTORequest', action: 'DELETE' }), ptoController.deleteRequest.bind(ptoController));

// Request workflow actions - require supervisor/admin role
router.post('/requests/:id/approve', validateParams(uuidParamSchema), requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']), validateBody(approveDenyPTOSchema), auditLog({ entityType: 'PTORequest', action: 'APPROVE' }), ptoController.approveRequest.bind(ptoController));
router.post('/requests/:id/deny', validateParams(uuidParamSchema), requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']), validateBody(denyPTOSchema), auditLog({ entityType: 'PTORequest', action: 'DENY' }), ptoController.denyRequest.bind(ptoController));
// Cancel - users can cancel their own, admins can cancel any (validated in controller)
router.post('/requests/:id/cancel', validateParams(uuidParamSchema), auditLog({ entityType: 'PTORequest', action: 'UPDATE' }), ptoController.cancelRequest.bind(ptoController));

// PTO Balance routes
// View balance - users can view own, admins can view any (validated in controller)
router.get('/balance/:userId', validateParams(userIdParamSchema), ptoController.getBalance.bind(ptoController));
// Update balance - admin only operation
router.put('/balance/:userId', validateParams(userIdParamSchema), requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), validateBody(updatePTOBalanceSchema), auditLog({ entityType: 'PTORequest', action: 'UPDATE' }), ptoController.updateBalance.bind(ptoController));

export default router;
