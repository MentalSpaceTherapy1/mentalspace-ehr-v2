/**
 * Purchase Order Service
 *
 * Manages purchase order creation, approval workflows, order tracking,
 * and receiving processes for organizational procurement.
 *
 * @module services/purchase-order
 */

import { PrismaClient, PurchaseOrder, POStatus, Prisma } from '@prisma/client';
import { updateBudgetSpending } from './budget.service';

const prisma = new PrismaClient();

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Generate unique PO number
 */
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: {
      poNumber: { startsWith: `PO-${year}-` },
    },
  });
  const nextNumber = String(count + 1).padStart(5, '0');
  return `PO-${year}-${nextNumber}`;
}

/**
 * Validate line items and calculate totals
 */
function validateAndCalculateLineItems(items: LineItem[]): {
  isValid: boolean;
  subtotal: number;
  errors: string[];
} {
  const errors: string[] = [];
  let subtotal = 0;

  if (!items || items.length === 0) {
    errors.push('At least one line item is required');
    return { isValid: false, subtotal: 0, errors };
  }

  items.forEach((item, index) => {
    if (!item.description || item.description.trim() === '') {
      errors.push(`Item ${index + 1}: Description is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be positive`);
    }
    if (!item.unitPrice || item.unitPrice <= 0) {
      errors.push(`Item ${index + 1}: Unit price must be positive`);
    }
    const expectedTotal = item.quantity * item.unitPrice;
    if (Math.abs(item.total - expectedTotal) > 0.01) {
      errors.push(`Item ${index + 1}: Total doesn't match quantity × unit price`);
    }
    subtotal += item.total;
  });

  return { isValid: errors.length === 0, subtotal, errors };
}

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(data: {
  vendorId: string;
  items: LineItem[];
  tax?: number;
  shipping?: number;
  expectedDate?: Date;
  budgetId?: string;
  department?: string;
  requestedById: string;
  notes?: string;
}): Promise<PurchaseOrder> {
  // Validate line items
  const validation = validateAndCalculateLineItems(data.items);
  if (!validation.isValid) {
    throw new Error(`Invalid line items: ${validation.errors.join(', ')}`);
  }

  const subtotal = validation.subtotal;
  const tax = data.tax || 0;
  const shipping = data.shipping || 0;
  const total = subtotal + tax + shipping;

  // Validate vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Validate budget if specified
  if (data.budgetId) {
    const budget = await prisma.budget.findUnique({ where: { id: data.budgetId } });
    if (!budget) {
      throw new Error('Budget not found');
    }
    // Check budget availability
    const remaining = Number(budget.remainingAmount);
    if (remaining < total) {
      throw new Error(
        `Insufficient budget. Required: $${total.toFixed(2)}, Available: $${remaining.toFixed(2)}`
      );
    }
  }

  // Verify requester exists
  const requester = await prisma.user.findUnique({ where: { id: data.requestedById } });
  if (!requester) {
    throw new Error('Requester not found');
  }

  // Generate PO number
  const poNumber = await generatePONumber();

  // Create purchase order
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      vendorId: data.vendorId,
      items: data.items as any,
      subtotal,
      tax,
      shipping,
      total,
      expectedDate: data.expectedDate,
      budgetId: data.budgetId,
      department: data.department,
      requestedById: data.requestedById,
      notes: data.notes,
      status: 'PENDING',
    },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return purchaseOrder;
}

/**
 * Get purchase order by ID
 */
export async function getPurchaseOrderById(poId: string): Promise<PurchaseOrder | null> {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return purchaseOrder;
}

/**
 * Get purchase order by PO number
 */
export async function getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | null> {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { poNumber },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return purchaseOrder;
}

/**
 * List purchase orders with filtering and pagination
 */
export async function listPurchaseOrders(params: {
  status?: POStatus;
  vendorId?: string;
  budgetId?: string;
  department?: string;
  requestedById?: string;
  approvedById?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  overdue?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ purchaseOrders: PurchaseOrder[]; total: number; page: number; totalPages: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseOrderWhereInput = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.vendorId) {
    where.vendorId = params.vendorId;
  }

  if (params.budgetId) {
    where.budgetId = params.budgetId;
  }

  if (params.department) {
    where.department = params.department;
  }

  if (params.requestedById) {
    where.requestedById = params.requestedById;
  }

  if (params.approvedById) {
    where.approvedById = params.approvedById;
  }

  // Date range filter
  if (params.dateFrom || params.dateTo) {
    where.orderDate = {};
    if (params.dateFrom) {
      where.orderDate.gte = params.dateFrom;
    }
    if (params.dateTo) {
      where.orderDate.lte = params.dateTo;
    }
  }

  // Amount range filter
  if (params.minAmount !== undefined || params.maxAmount !== undefined) {
    where.total = {};
    if (params.minAmount !== undefined) {
      where.total.gte = params.minAmount;
    }
    if (params.maxAmount !== undefined) {
      where.total.lte = params.maxAmount;
    }
  }

  // Overdue filter (expected date passed and not received)
  if (params.overdue) {
    where.status = { in: ['APPROVED', 'ORDERED'] };
    where.expectedDate = { lt: new Date() };
  }

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        vendor: true,
        budget: true,
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    purchaseOrders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update purchase order (limited fields for pending orders)
 */
export async function updatePurchaseOrder(
  poId: string,
  data: Partial<{
    items: LineItem[];
    tax: number;
    shipping: number;
    expectedDate: Date;
    budgetId: string;
    department: string;
    notes: string;
  }>
): Promise<PurchaseOrder> {
  const currentPO = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });

  if (!currentPO) {
    throw new Error('Purchase order not found');
  }

  // Only allow updates to pending purchase orders
  if (currentPO.status !== 'PENDING') {
    throw new Error('Can only update pending purchase orders');
  }

  let updateData: Prisma.PurchaseOrderWhereInput = { ...data };

  // If items are updated, recalculate totals
  if (data.items) {
    const validation = validateAndCalculateLineItems(data.items);
    if (!validation.isValid) {
      throw new Error(`Invalid line items: ${validation.errors.join(', ')}`);
    }
    const subtotal = validation.subtotal;
    const tax = data.tax !== undefined ? data.tax : Number(currentPO.tax || 0);
    const shipping = data.shipping !== undefined ? data.shipping : Number(currentPO.shipping || 0);
    const total = subtotal + tax + shipping;

    updateData = {
      ...updateData,
      items: data.items as any,
      subtotal,
      total,
    };
  }

  const purchaseOrder = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: updateData,
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return purchaseOrder;
}

/**
 * Approve a purchase order
 */
export async function approvePurchaseOrder(
  poId: string,
  approvedById: string
): Promise<PurchaseOrder> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { budget: true },
  });

  if (!po) {
    throw new Error('Purchase order not found');
  }

  if (po.status !== 'PENDING') {
    throw new Error('Can only approve pending purchase orders');
  }

  // Verify approver exists
  const approver = await prisma.user.findUnique({ where: { id: approvedById } });
  if (!approver) {
    throw new Error('Approver not found');
  }

  // Check budget availability
  if (po.budgetId && po.budget) {
    const remaining = Number(po.budget.remainingAmount);
    const total = Number(po.total);
    if (remaining < total) {
      throw new Error(`Insufficient budget. Required: $${total}, Available: $${remaining}`);
    }
  }

  // Update PO status
  const updatedPO = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'APPROVED',
      approvedById,
      approvalDate: new Date(),
    },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Update budget committed amount
  if (po.budgetId) {
    await updateBudgetSpending(po.budgetId, 0, Number(po.total));
  }

  return updatedPO;
}

/**
 * Mark purchase order as ordered (sent to vendor)
 */
export async function markPurchaseOrderOrdered(poId: string): Promise<PurchaseOrder> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });

  if (!po) {
    throw new Error('Purchase order not found');
  }

  if (po.status !== 'APPROVED') {
    throw new Error('Can only mark approved purchase orders as ordered');
  }

  const updatedPO = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: 'ORDERED' },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return updatedPO;
}

/**
 * Mark purchase order as received
 */
export async function markPurchaseOrderReceived(
  poId: string,
  receivedDate?: Date
): Promise<PurchaseOrder> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });

  if (!po) {
    throw new Error('Purchase order not found');
  }

  if (po.status !== 'ORDERED') {
    throw new Error('Can only mark ordered purchase orders as received');
  }

  const updatedPO = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'RECEIVED',
      receivedDate: receivedDate || new Date(),
    },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Update budget: move from committed to spent
  if (po.budgetId) {
    await updateBudgetSpending(po.budgetId, Number(po.total), -Number(po.total));
  }

  return updatedPO;
}

/**
 * Cancel a purchase order
 */
export async function cancelPurchaseOrder(poId: string, reason?: string): Promise<PurchaseOrder> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });

  if (!po) {
    throw new Error('Purchase order not found');
  }

  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
    throw new Error('Cannot cancel received or already cancelled purchase orders');
  }

  const updatedPO = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'CANCELLED',
      notes: reason ? `${po.notes || ''}\n\nCancellation reason: ${reason}` : po.notes,
    },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Release budget commitment if approved
  if (po.budgetId && (po.status === 'APPROVED' || po.status === 'ORDERED')) {
    await updateBudgetSpending(po.budgetId, 0, -Number(po.total));
  }

  return updatedPO;
}

/**
 * Get purchase order summary statistics
 */
export async function getPurchaseOrderSummary(params: {
  dateFrom?: Date;
  dateTo?: Date;
  department?: string;
  vendorId?: string;
}): Promise<{
  totalPOs: number;
  pendingCount: number;
  approvedCount: number;
  orderedCount: number;
  receivedCount: number;
  cancelledCount: number;
  totalPending: number;
  totalApproved: number;
  totalOrdered: number;
  totalReceived: number;
  averagePOValue: number;
  overdueCount: number;
}> {
  const where: Prisma.PurchaseOrderWhereInput = {};

  if (params.department) {
    where.department = params.department;
  }

  if (params.vendorId) {
    where.vendorId = params.vendorId;
  }

  if (params.dateFrom || params.dateTo) {
    where.orderDate = {};
    if (params.dateFrom) {
      where.orderDate.gte = params.dateFrom;
    }
    if (params.dateTo) {
      where.orderDate.lte = params.dateTo;
    }
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({ where });

  const totalPOs = purchaseOrders.length;
  const pendingCount = purchaseOrders.filter((po) => po.status === 'PENDING').length;
  const approvedCount = purchaseOrders.filter((po) => po.status === 'APPROVED').length;
  const orderedCount = purchaseOrders.filter((po) => po.status === 'ORDERED').length;
  const receivedCount = purchaseOrders.filter((po) => po.status === 'RECEIVED').length;
  const cancelledCount = purchaseOrders.filter((po) => po.status === 'CANCELLED').length;

  const totalPending = purchaseOrders
    .filter((po) => po.status === 'PENDING')
    .reduce((sum, po) => sum + Number(po.total), 0);

  const totalApproved = purchaseOrders
    .filter((po) => po.status === 'APPROVED')
    .reduce((sum, po) => sum + Number(po.total), 0);

  const totalOrdered = purchaseOrders
    .filter((po) => po.status === 'ORDERED')
    .reduce((sum, po) => sum + Number(po.total), 0);

  const totalReceived = purchaseOrders
    .filter((po) => po.status === 'RECEIVED')
    .reduce((sum, po) => sum + Number(po.total), 0);

  const totalAmount = purchaseOrders
    .filter((po) => po.status !== 'CANCELLED')
    .reduce((sum, po) => sum + Number(po.total), 0);
  const averagePOValue =
    totalPOs - cancelledCount > 0 ? totalAmount / (totalPOs - cancelledCount) : 0;

  const now = new Date();
  const overdueCount = purchaseOrders.filter(
    (po) =>
      (po.status === 'APPROVED' || po.status === 'ORDERED') &&
      po.expectedDate &&
      po.expectedDate < now
  ).length;

  return {
    totalPOs,
    pendingCount,
    approvedCount,
    orderedCount,
    receivedCount,
    cancelledCount,
    totalPending,
    totalApproved,
    totalOrdered,
    totalReceived,
    averagePOValue,
    overdueCount,
  };
}

/**
 * Get overdue purchase orders
 */
export async function getOverduePurchaseOrders(): Promise<PurchaseOrder[]> {
  const now = new Date();

  const overduePOs = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ['APPROVED', 'ORDERED'] },
      expectedDate: { lt: now },
    },
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { expectedDate: 'asc' },
  });

  return overduePOs;
}

/**
 * Get pending approvals
 */
export async function getPendingApprovals(limit = 50): Promise<PurchaseOrder[]> {
  const pendingPOs = await prisma.purchaseOrder.findMany({
    where: { status: 'PENDING' },
    take: limit,
    include: {
      vendor: true,
      budget: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return pendingPOs;
}
