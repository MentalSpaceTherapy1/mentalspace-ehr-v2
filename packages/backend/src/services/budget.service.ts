/**
 * Budget Service
 *
 * Manages organizational budgets, budget allocations, spending tracking,
 * and budget performance monitoring across departments and categories.
 *
 * @module services/budget
 */

import { PrismaClient, Budget, BudgetCategory, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new budget
 */
export async function createBudget(data: {
  name: string;
  fiscalYear: number;
  department?: string;
  category: BudgetCategory;
  allocatedAmount: number;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  notes?: string;
}): Promise<Budget> {
  // Validate fiscal year
  const currentYear = new Date().getFullYear();
  if (data.fiscalYear < currentYear - 5 || data.fiscalYear > currentYear + 10) {
    throw new Error('Fiscal year must be within reasonable range');
  }

  // Validate dates
  if (data.startDate >= data.endDate) {
    throw new Error('Start date must be before end date');
  }

  // Validate allocated amount
  if (data.allocatedAmount <= 0) {
    throw new Error('Allocated amount must be positive');
  }

  // Verify owner exists
  const owner = await prisma.user.findUnique({ where: { id: data.ownerId } });
  if (!owner) {
    throw new Error('Budget owner not found');
  }

  const budget = await prisma.budget.create({
    data: {
      name: data.name,
      fiscalYear: data.fiscalYear,
      department: data.department,
      category: data.category,
      allocatedAmount: data.allocatedAmount,
      spentAmount: 0,
      committedAmount: 0,
      remainingAmount: data.allocatedAmount,
      startDate: data.startDate,
      endDate: data.endDate,
      ownerId: data.ownerId,
      notes: data.notes,
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return budget;
}

/**
 * Get budget by ID with optional relations
 */
export async function getBudgetById(
  budgetId: string,
  includeExpenses = false,
  includePurchaseOrders = false
): Promise<Budget | null> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      expenses: includeExpenses,
      purchaseOrders: includePurchaseOrders,
    },
  });

  return budget;
}

/**
 * List budgets with filtering and pagination
 */
export async function listBudgets(params: {
  fiscalYear?: number;
  category?: BudgetCategory;
  department?: string;
  ownerId?: string;
  overBudget?: boolean;
  nearingLimit?: boolean; // >80% spent
  page?: number;
  limit?: number;
}): Promise<{ budgets: Budget[]; total: number; page: number; totalPages: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.BudgetWhereInput = {};

  if (params.fiscalYear) {
    where.fiscalYear = params.fiscalYear;
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.department) {
    where.department = params.department;
  }

  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }

  // Filter over-budget items
  if (params.overBudget) {
    where.spentAmount = { gt: prisma.budget.fields.allocatedAmount };
  }

  // Filter budgets nearing limit (>80% spent)
  if (params.nearingLimit) {
    // This requires custom filtering after fetching
  }

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      skip,
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ fiscalYear: 'desc' }, { name: 'asc' }],
    }),
    prisma.budget.count({ where }),
  ]);

  // Post-filter for nearing limit if needed
  let filteredBudgets = budgets;
  if (params.nearingLimit) {
    filteredBudgets = budgets.filter((budget) => {
      const percentSpent = (Number(budget.spentAmount) / Number(budget.allocatedAmount)) * 100;
      return percentSpent >= 80 && percentSpent < 100;
    });
  }

  return {
    budgets: filteredBudgets,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update budget information
 */
export async function updateBudget(
  budgetId: string,
  data: Partial<{
    name: string;
    department: string;
    allocatedAmount: number;
    startDate: Date;
    endDate: Date;
    ownerId: string;
    notes: string;
  }>
): Promise<Budget> {
  // If updating allocated amount, recalculate remaining
  if (data.allocatedAmount !== undefined) {
    const currentBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!currentBudget) {
      throw new Error('Budget not found');
    }

    const newRemaining =
      data.allocatedAmount - Number(currentBudget.spentAmount) - Number(currentBudget.committedAmount);

    return await prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...data,
        remainingAmount: newRemaining,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  const budget = await prisma.budget.update({
    where: { id: budgetId },
    data,
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return budget;
}

/**
 * Update budget spending amounts
 * Called when expenses are approved/paid or purchase orders are created
 */
export async function updateBudgetSpending(
  budgetId: string,
  spentDelta: number = 0,
  committedDelta: number = 0
): Promise<Budget> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!budget) {
    throw new Error('Budget not found');
  }

  const newSpentAmount = Number(budget.spentAmount) + spentDelta;
  const newCommittedAmount = Number(budget.committedAmount) + committedDelta;
  const newRemainingAmount =
    Number(budget.allocatedAmount) - newSpentAmount - newCommittedAmount;

  const updatedBudget = await prisma.budget.update({
    where: { id: budgetId },
    data: {
      spentAmount: newSpentAmount,
      committedAmount: newCommittedAmount,
      remainingAmount: newRemainingAmount,
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return updatedBudget;
}

/**
 * Get budget utilization metrics
 */
export async function getBudgetUtilization(budgetId: string): Promise<{
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  remainingAmount: number;
  percentSpent: number;
  percentCommitted: number;
  percentRemaining: number;
  status: 'healthy' | 'warning' | 'critical' | 'over_budget';
  expenseCount: number;
  purchaseOrderCount: number;
}> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      expenses: { where: { status: { in: ['APPROVED', 'PAID'] } } },
      purchaseOrders: { where: { status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] } } },
    },
  });

  if (!budget) {
    throw new Error('Budget not found');
  }

  const allocated = Number(budget.allocatedAmount);
  const spent = Number(budget.spentAmount);
  const committed = Number(budget.committedAmount);
  const remaining = Number(budget.remainingAmount);

  const percentSpent = (spent / allocated) * 100;
  const percentCommitted = (committed / allocated) * 100;
  const percentRemaining = (remaining / allocated) * 100;

  let status: 'healthy' | 'warning' | 'critical' | 'over_budget';
  if (percentSpent >= 100) {
    status = 'over_budget';
  } else if (percentSpent >= 90) {
    status = 'critical';
  } else if (percentSpent >= 80) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return {
    allocatedAmount: allocated,
    spentAmount: spent,
    committedAmount: committed,
    remainingAmount: remaining,
    percentSpent,
    percentCommitted,
    percentRemaining,
    status,
    expenseCount: budget.expenses.length,
    purchaseOrderCount: budget.purchaseOrders.length,
  };
}

/**
 * Get department budget summary
 */
export async function getDepartmentBudgetSummary(
  department: string,
  fiscalYear: number
): Promise<{
  totalAllocated: number;
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  budgetsByCategory: Array<{
    category: BudgetCategory;
    allocated: number;
    spent: number;
    remaining: number;
    percentUsed: number;
  }>;
}> {
  const budgets = await prisma.budget.findMany({
    where: {
      department,
      fiscalYear,
    },
  });

  const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocatedAmount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount), 0);
  const totalCommitted = budgets.reduce((sum, b) => sum + Number(b.committedAmount), 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + Number(b.remainingAmount), 0);

  // Group by category
  const categoryMap = new Map<
    BudgetCategory,
    { allocated: number; spent: number; remaining: number }
  >();

  budgets.forEach((budget) => {
    const existing = categoryMap.get(budget.category) || { allocated: 0, spent: 0, remaining: 0 };
    categoryMap.set(budget.category, {
      allocated: existing.allocated + Number(budget.allocatedAmount),
      spent: existing.spent + Number(budget.spentAmount),
      remaining: existing.remaining + Number(budget.remainingAmount),
    });
  });

  const budgetsByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    allocated: data.allocated,
    spent: data.spent,
    remaining: data.remaining,
    percentUsed: data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0,
  }));

  return {
    totalAllocated,
    totalSpent,
    totalCommitted,
    totalRemaining,
    budgetsByCategory,
  };
}

/**
 * Get organization-wide budget summary
 */
export async function getOrganizationBudgetSummary(fiscalYear: number): Promise<{
  totalAllocated: number;
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  percentSpent: number;
  budgetCount: number;
  departmentSummaries: Array<{
    department: string;
    allocated: number;
    spent: number;
    remaining: number;
    percentUsed: number;
  }>;
}> {
  const budgets = await prisma.budget.findMany({
    where: { fiscalYear },
  });

  const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocatedAmount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount), 0);
  const totalCommitted = budgets.reduce((sum, b) => sum + Number(b.committedAmount), 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + Number(b.remainingAmount), 0);
  const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Group by department
  const deptMap = new Map<string, { allocated: number; spent: number; remaining: number }>();

  budgets.forEach((budget) => {
    const dept = budget.department || 'Unassigned';
    const existing = deptMap.get(dept) || { allocated: 0, spent: 0, remaining: 0 };
    deptMap.set(dept, {
      allocated: existing.allocated + Number(budget.allocatedAmount),
      spent: existing.spent + Number(budget.spentAmount),
      remaining: existing.remaining + Number(budget.remainingAmount),
    });
  });

  const departmentSummaries = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    allocated: data.allocated,
    spent: data.spent,
    remaining: data.remaining,
    percentUsed: data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0,
  }));

  return {
    totalAllocated,
    totalSpent,
    totalCommitted,
    totalRemaining,
    percentSpent,
    budgetCount: budgets.length,
    departmentSummaries,
  };
}

/**
 * Check if budget has sufficient funds
 */
export async function checkBudgetAvailability(
  budgetId: string,
  requestedAmount: number
): Promise<{ available: boolean; remainingAmount: number; message: string }> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!budget) {
    throw new Error('Budget not found');
  }

  const remaining = Number(budget.remainingAmount);
  const available = remaining >= requestedAmount;

  return {
    available,
    remainingAmount: remaining,
    message: available
      ? `Sufficient funds available. Remaining: $${remaining.toFixed(2)}`
      : `Insufficient funds. Requested: $${requestedAmount.toFixed(2)}, Available: $${remaining.toFixed(2)}`,
  };
}
