/**
 * Purchase Order Controller
 *
 * REST API endpoints for purchase order management operations
 *
 * @module controllers/purchase-order
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import * as poService from '../services/purchase-order.service';
import { POStatus } from '@prisma/client';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * POST /api/purchase-orders
 * Create a new purchase order
 */
export async function createPurchaseOrder(req: Request, res: Response): Promise<void> {
  try {
    const purchaseOrder = await poService.createPurchaseOrder(req.body);
    sendCreated(res, purchaseOrder, 'Purchase order created successfully');
  } catch (error) {
    logControllerError('Error creating purchase order', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * GET /api/purchase-orders/:id
 * Get purchase order by ID
 */
export async function getPurchaseOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const purchaseOrder = await poService.getPurchaseOrderById(id);

    if (!purchaseOrder) {
      sendNotFound(res, 'Purchase order');
      return;
    }

    sendSuccess(res, purchaseOrder);
  } catch (error) {
    logControllerError('Error fetching purchase order', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/purchase-orders/number/:poNumber
 * Get purchase order by PO number
 */
export async function getPurchaseOrderByNumber(req: Request, res: Response): Promise<void> {
  try {
    const { poNumber } = req.params;
    const purchaseOrder = await poService.getPurchaseOrderByNumber(poNumber);

    if (!purchaseOrder) {
      sendNotFound(res, 'Purchase order');
      return;
    }

    sendSuccess(res, purchaseOrder);
  } catch (error) {
    logControllerError('Error fetching purchase order', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/purchase-orders
 * List purchase orders with filtering
 */
export async function listPurchaseOrders(req: Request, res: Response): Promise<void> {
  try {
    const {
      status,
      vendorId,
      budgetId,
      department,
      requestedById,
      approvedById,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      overdue,
      page,
      limit,
    } = req.query;

    const result = await poService.listPurchaseOrders({
      status: status as POStatus,
      vendorId: vendorId as string,
      budgetId: budgetId as string,
      department: department as string,
      requestedById: requestedById as string,
      approvedById: approvedById as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      overdue: overdue === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    sendSuccess(res, result);
  } catch (error) {
    logControllerError('Error listing purchase orders', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * PUT /api/purchase-orders/:id
 * Update purchase order information
 */
export async function updatePurchaseOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const purchaseOrder = await poService.updatePurchaseOrder(id, req.body);
    sendSuccess(res, purchaseOrder, 'Purchase order updated successfully');
  } catch (error) {
    logControllerError('Error updating purchase order', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/purchase-orders/:id/approve
 * Approve a purchase order
 */
export async function approvePurchaseOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { approvedById } = req.body;

    if (!approvedById) {
      sendBadRequest(res, 'Approver ID is required');
      return;
    }

    const purchaseOrder = await poService.approvePurchaseOrder(id, approvedById);
    sendSuccess(res, purchaseOrder, 'Purchase order approved successfully');
  } catch (error) {
    logControllerError('Error approving purchase order', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/purchase-orders/:id/mark-ordered
 * Mark purchase order as ordered
 */
export async function markPurchaseOrderOrdered(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const purchaseOrder = await poService.markPurchaseOrderOrdered(id);
    sendSuccess(res, purchaseOrder, 'Purchase order marked as ordered');
  } catch (error) {
    logControllerError('Error marking purchase order as ordered', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/purchase-orders/:id/mark-received
 * Mark purchase order as received
 */
export async function markPurchaseOrderReceived(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { receivedDate } = req.body;

    const purchaseOrder = await poService.markPurchaseOrderReceived(
      id,
      receivedDate ? new Date(receivedDate) : undefined
    );

    sendSuccess(res, purchaseOrder, 'Purchase order marked as received');
  } catch (error) {
    logControllerError('Error marking purchase order as received', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/purchase-orders/:id/cancel
 * Cancel a purchase order
 */
export async function cancelPurchaseOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const purchaseOrder = await poService.cancelPurchaseOrder(id, reason);
    sendSuccess(res, purchaseOrder, 'Purchase order cancelled successfully');
  } catch (error) {
    logControllerError('Error cancelling purchase order', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * GET /api/purchase-orders/summary
 * Get purchase order summary statistics
 */
export async function getPurchaseOrderSummary(req: Request, res: Response): Promise<void> {
  try {
    const { dateFrom, dateTo, department, vendorId } = req.query;

    const summary = await poService.getPurchaseOrderSummary({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      department: department as string,
      vendorId: vendorId as string,
    });

    sendSuccess(res, summary);
  } catch (error) {
    logControllerError('Error fetching purchase order summary', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/purchase-orders/overdue
 * Get overdue purchase orders
 */
export async function getOverduePurchaseOrders(req: Request, res: Response): Promise<void> {
  try {
    const purchaseOrders = await poService.getOverduePurchaseOrders();
    sendSuccess(res, purchaseOrders);
  } catch (error) {
    logControllerError('Error fetching overdue purchase orders', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/purchase-orders/pending-approvals
 * Get pending approval purchase orders
 */
export async function getPendingApprovals(req: Request, res: Response): Promise<void> {
  try {
    const { limit } = req.query;
    const purchaseOrders = await poService.getPendingApprovals(
      limit ? parseInt(limit as string) : undefined
    );
    sendSuccess(res, purchaseOrders);
  } catch (error) {
    logControllerError('Error fetching pending approvals', error);
    sendServerError(res, getErrorMessage(error));
  }
}
