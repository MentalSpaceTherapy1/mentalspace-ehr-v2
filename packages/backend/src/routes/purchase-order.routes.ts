/**
 * Purchase Order Routes
 *
 * Defines API routes for purchase order management
 *
 * @module routes/purchase-order
 */

import { Router } from 'express';
import * as poController from '../controllers/purchase-order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All purchase order routes require authentication
router.use(authenticate);

// Purchase Order CRUD operations
router.post('/', poController.createPurchaseOrder);
router.get('/summary', poController.getPurchaseOrderSummary);
router.get('/overdue', poController.getOverduePurchaseOrders);
router.get('/pending-approvals', poController.getPendingApprovals);
router.get('/number/:poNumber', poController.getPurchaseOrderByNumber);
router.get('/:id', poController.getPurchaseOrder);
router.get('/', poController.listPurchaseOrders);
router.put('/:id', poController.updatePurchaseOrder);

// Purchase Order workflow operations
router.post('/:id/approve', poController.approvePurchaseOrder);
router.post('/:id/mark-ordered', poController.markPurchaseOrderOrdered);
router.post('/:id/mark-received', poController.markPurchaseOrderReceived);
router.post('/:id/cancel', poController.cancelPurchaseOrder);

export default router;
