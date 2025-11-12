/**
 * Expense Service
 *
 * Manages expense submission, approval workflows, reimbursements,
 * and expense tracking for the organization.
 *
 * @module services/expense
 */

import { PrismaClient, Expense, ExpenseStatus, BudgetCategory, Prisma } from '@prisma/client';
import { updateBudgetSpending } from './budget.service';

const prisma = new PrismaClient();

/**
 * Create a new expense submission
 */
export async function createExpense(data: {
  description: string;
  category: BudgetCategory;
  amount: number;
  taxAmount?: number;
  expenseDate: Date;
  vendorId?: string;
  vendorName?: string;
  budgetId?: string;
  department?: string;
  submittedById: string;
  paymentMethod?: string;
  receiptUrl?: string;
}): Promise<Expense> {
  // Validate amount
  if (data.amount <= 0) {
    throw new Error('Expense amount must be positive');
  }

  // Calculate total amount
  const totalAmount = data.amount + (data.taxAmount || 0);

  // Validate vendor reference
  if (data.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor) {
      throw new Error('Vendor not found');
    }
  }

  // Validate budget reference
  if (data.budgetId) {
    const budget = await prisma.budget.findUnique({ where: { id: data.budgetId } });
    if (!budget) {
      throw new Error('Budget not found');
    }
  }

  // Verify submitter exists
  const submitter = await prisma.user.findUnique({ where: { id: data.submittedById } });
  if (!submitter) {
    throw new Error('Submitter not found');
  }

  const expense = await prisma.expense.create({
    data: {
      description: data.description,
      category: data.category,
      amount: data.amount,
      taxAmount: data.taxAmount,
      totalAmount,
      expenseDate: data.expenseDate,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      budgetId: data.budgetId,
      department: data.department,
      submittedById: data.submittedById,
      paymentMethod: data.paymentMethod,
      receiptUrl: data.receiptUrl,
      status: 'PENDING',
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      vendor: true,
      budget: true,
    },
  });

  return expense;
}

/**
 * Get expense by ID
 */
export async function getExpenseById(expenseId: string): Promise<Expense | null> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      submittedBy: {
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
      vendor: true,
      budget: true,
    },
  });

  return expense;
}

/**
 * List expenses with filtering and pagination
 */
export async function listExpenses(params: {
  status?: ExpenseStatus;
  category?: BudgetCategory;
  submittedById?: string;
  approvedById?: string;
  vendorId?: string;
  budgetId?: string;
  department?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}): Promise<{ expenses: Expense[]; total: number; page: number; totalPages: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.submittedById) {
    where.submittedById = params.submittedById;
  }

  if (params.approvedById) {
    where.approvedById = params.approvedById;
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

  // Date range filter
  if (params.dateFrom || params.dateTo) {
    where.expenseDate = {};
    if (params.dateFrom) {
      where.expenseDate.gte = params.dateFrom;
    }
    if (params.dateTo) {
      where.expenseDate.lte = params.dateTo;
    }
  }

  // Amount range filter
  if (params.minAmount !== undefined || params.maxAmount !== undefined) {
    where.totalAmount = {};
    if (params.minAmount !== undefined) {
      where.totalAmount.gte = params.minAmount;
    }
    if (params.maxAmount !== undefined) {
      where.totalAmount.lte = params.maxAmount;
    }
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      include: {
        submittedBy: {
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
        vendor: true,
        budget: true,
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update expense information (limited fields)
 */
export async function updateExpense(
  expenseId: string,
  data: Partial<{
    description: string;
    category: BudgetCategory;
    amount: number;
    taxAmount: number;
    expenseDate: Date;
    vendorId: string;
    vendorName: string;
    budgetId: string;
    department: string;
    paymentMethod: string;
    receiptUrl: string;
  }>
): Promise<Expense> {
  const currentExpense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!currentExpense) {
    throw new Error('Expense not found');
  }

  // Only allow updates to pending expenses
  if (currentExpense.status !== 'PENDING') {
    throw new Error('Can only update pending expenses');
  }

  // Recalculate total if amount or tax changed
  const amount = data.amount !== undefined ? data.amount : Number(currentExpense.amount);
  const taxAmount = data.taxAmount !== undefined ? data.taxAmount : Number(currentExpense.taxAmount || 0);
  const totalAmount = amount + taxAmount;

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...data,
      totalAmount,
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      vendor: true,
      budget: true,
    },
  });

  return expense;
}

/**
 * Approve an expense
 */
export async function approveExpense(
  expenseId: string,
  approvedById: string,
  approvalNotes?: string
): Promise<Expense> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { budget: true },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== 'PENDING') {
    throw new Error('Can only approve pending expenses');
  }

  // Verify approver exists
  const approver = await prisma.user.findUnique({ where: { id: approvedById } });
  if (!approver) {
    throw new Error('Approver not found');
  }

  // Check budget availability if budget is specified
  if (expense.budgetId && expense.budget) {
    const remaining = Number(expense.budget.remainingAmount);
    const expenseAmount = Number(expense.totalAmount);
    if (remaining < expenseAmount) {
      throw new Error(
        `Insufficient budget. Required: $${expenseAmount}, Available: $${remaining}`
      );
    }
  }

  // Update expense status
  const updatedExpense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'APPROVED',
      approvedById,
      approvalDate: new Date(),
      approvalNotes,
    },
    include: {
      submittedBy: {
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
      vendor: true,
      budget: true,
    },
  });

  // Update budget committed amount
  if (expense.budgetId) {
    await updateBudgetSpending(expense.budgetId, 0, Number(expense.totalAmount));
  }

  return updatedExpense;
}

/**
 * Deny an expense
 */
export async function denyExpense(
  expenseId: string,
  approvedById: string,
  approvalNotes: string
): Promise<Expense> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== 'PENDING') {
    throw new Error('Can only deny pending expenses');
  }

  const updatedExpense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'DENIED',
      approvedById,
      approvalDate: new Date(),
      approvalNotes,
    },
    include: {
      submittedBy: {
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
      vendor: true,
      budget: true,
    },
  });

  return updatedExpense;
}

/**
 * Mark expense as paid
 */
export async function markExpensePaid(
  expenseId: string,
  reimbursementDate: Date
): Promise<Expense> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== 'APPROVED') {
    throw new Error('Can only mark approved expenses as paid');
  }

  const updatedExpense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'PAID',
      reimbursed: true,
      reimbursementDate,
    },
    include: {
      submittedBy: {
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
      vendor: true,
      budget: true,
    },
  });

  // Update budget: move from committed to spent
  if (expense.budgetId) {
    await updateBudgetSpending(
      expense.budgetId,
      Number(expense.totalAmount),
      -Number(expense.totalAmount)
    );
  }

  return updatedExpense;
}

/**
 * Get expense summary statistics
 */
export async function getExpenseSummary(params: {
  dateFrom?: Date;
  dateTo?: Date;
  department?: string;
  category?: BudgetCategory;
}): Promise<{
  totalExpenses: number;
  pendingCount: number;
  approvedCount: number;
  deniedCount: number;
  paidCount: number;
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  averageExpense: number;
  expensesByCategory: Record<string, { count: number; total: number }>;
  expensesByDepartment: Record<string, { count: number; total: number }>;
}> {
  const where: Prisma.ExpenseWhereInput = {};

  if (params.department) {
    where.department = params.department;
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.dateFrom || params.dateTo) {
    where.expenseDate = {};
    if (params.dateFrom) {
      where.expenseDate.gte = params.dateFrom;
    }
    if (params.dateTo) {
      where.expenseDate.lte = params.dateTo;
    }
  }

  const expenses = await prisma.expense.findMany({ where });

  const totalExpenses = expenses.length;
  const pendingCount = expenses.filter((e) => e.status === 'PENDING').length;
  const approvedCount = expenses.filter((e) => e.status === 'APPROVED').length;
  const deniedCount = expenses.filter((e) => e.status === 'DENIED').length;
  const paidCount = expenses.filter((e) => e.status === 'PAID').length;

  const totalPending = expenses
    .filter((e) => e.status === 'PENDING')
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  const totalApproved = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  const totalPaid = expenses
    .filter((e) => e.status === 'PAID')
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.totalAmount), 0);
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

  // Group by category
  const expensesByCategory: Record<string, { count: number; total: number }> = {};
  expenses.forEach((expense) => {
    const cat = expense.category;
    if (!expensesByCategory[cat]) {
      expensesByCategory[cat] = { count: 0, total: 0 };
    }
    expensesByCategory[cat].count++;
    expensesByCategory[cat].total += Number(expense.totalAmount);
  });

  // Group by department
  const expensesByDepartment: Record<string, { count: number; total: number }> = {};
  expenses.forEach((expense) => {
    const dept = expense.department || 'Unassigned';
    if (!expensesByDepartment[dept]) {
      expensesByDepartment[dept] = { count: 0, total: 0 };
    }
    expensesByDepartment[dept].count++;
    expensesByDepartment[dept].total += Number(expense.totalAmount);
  });

  return {
    totalExpenses,
    pendingCount,
    approvedCount,
    deniedCount,
    paidCount,
    totalPending,
    totalApproved,
    totalPaid,
    averageExpense,
    expensesByCategory,
    expensesByDepartment,
  };
}

/**
 * Get expenses pending approval
 */
export async function getPendingExpenses(limit = 50): Promise<Expense[]> {
  const expenses = await prisma.expense.findMany({
    where: { status: 'PENDING' },
    take: limit,
    include: {
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      vendor: true,
      budget: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return expenses;
}

/**
 * Get user's expense history
 */
export async function getUserExpenseHistory(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ expenses: Expense[]; total: number; totalAmount: number }> {
  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: { submittedById: userId },
      skip,
      take: limit,
      include: {
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        vendor: true,
        budget: true,
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.expense.count({ where: { submittedById: userId } }),
  ]);

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.totalAmount), 0);

  return { expenses, total, totalAmount };
}
