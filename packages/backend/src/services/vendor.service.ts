/**
 * Vendor Service
 *
 * Manages vendor registration, contracts, performance tracking,
 * and vendor relationship management for the organization.
 *
 * @module services/vendor
 */

import { PrismaClient, Vendor, VendorCategory, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new vendor
 */
export async function createVendor(data: {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: any;
  website?: string;
  servicesProvided: string[];
  category: VendorCategory;
  contractStart?: Date;
  contractEnd?: Date;
  contractValue?: number;
  paymentTerms?: string;
  insuranceExpiration?: Date;
  insuranceCertUrl?: string;
  performanceScore?: number;
  notes?: string;
  isActive?: boolean;
}): Promise<Vendor> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }

  // Validate phone format (basic validation)
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  if (!phoneRegex.test(data.phone)) {
    throw new Error('Invalid phone format');
  }

  // Validate performance score if provided
  if (data.performanceScore !== undefined && (data.performanceScore < 0 || data.performanceScore > 100)) {
    throw new Error('Performance score must be between 0 and 100');
  }

  // Validate contract dates
  if (data.contractStart && data.contractEnd && data.contractStart > data.contractEnd) {
    throw new Error('Contract start date must be before end date');
  }

  const vendor = await prisma.vendor.create({
    data: {
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      address: data.address,
      website: data.website,
      servicesProvided: data.servicesProvided,
      category: data.category,
      contractStart: data.contractStart,
      contractEnd: data.contractEnd,
      contractValue: data.contractValue,
      paymentTerms: data.paymentTerms,
      insuranceExpiration: data.insuranceExpiration,
      insuranceCertUrl: data.insuranceCertUrl,
      performanceScore: data.performanceScore,
      notes: data.notes,
      isActive: data.isActive ?? true,
    },
  });

  return vendor;
}

/**
 * Get vendor by ID with optional relations
 */
export async function getVendorById(
  vendorId: string,
  includeExpenses = false,
  includePurchaseOrders = false
): Promise<Vendor | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      expenses: includeExpenses,
      purchaseOrders: includePurchaseOrders,
    },
  });

  return vendor;
}

/**
 * List all vendors with filtering and pagination
 */
export async function listVendors(params: {
  category?: VendorCategory;
  isActive?: boolean;
  search?: string;
  contractExpiringSoon?: boolean; // Within 90 days
  insuranceExpiringSoon?: boolean; // Within 30 days
  page?: number;
  limit?: number;
}): Promise<{ vendors: Vendor[]; total: number; page: number; totalPages: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.VendorWhereInput = {};

  // Filter by category
  if (params.category) {
    where.category = params.category;
  }

  // Filter by active status
  if (params.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  // Search by company name, contact person, or email
  if (params.search) {
    where.OR = [
      { companyName: { contains: params.search, mode: 'insensitive' } },
      { contactPerson: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  // Filter contracts expiring soon (within 90 days)
  if (params.contractExpiringSoon) {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    where.contractEnd = {
      lte: ninetyDaysFromNow,
      gte: new Date(),
    };
  }

  // Filter insurance expiring soon (within 30 days)
  if (params.insuranceExpiringSoon) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    where.insuranceExpiration = {
      lte: thirtyDaysFromNow,
      gte: new Date(),
    };
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { companyName: 'asc' },
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    vendors,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update vendor information
 */
export async function updateVendor(
  vendorId: string,
  data: Partial<{
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: any;
    website: string;
    servicesProvided: string[];
    category: VendorCategory;
    contractStart: Date;
    contractEnd: Date;
    contractValue: number;
    paymentTerms: string;
    insuranceExpiration: Date;
    insuranceCertUrl: string;
    performanceScore: number;
    notes: string;
    isActive: boolean;
  }>
): Promise<Vendor> {
  // Validate performance score if provided
  if (data.performanceScore !== undefined && (data.performanceScore < 0 || data.performanceScore > 100)) {
    throw new Error('Performance score must be between 0 and 100');
  }

  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data,
  });

  return vendor;
}

/**
 * Deactivate a vendor
 */
export async function deactivateVendor(vendorId: string): Promise<Vendor> {
  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: { isActive: false },
  });

  return vendor;
}

/**
 * Get vendor performance metrics
 */
export async function getVendorPerformanceMetrics(vendorId: string): Promise<{
  totalExpenses: number;
  totalPurchaseOrders: number;
  averageExpenseAmount: number;
  averagePOAmount: number;
  performanceScore: number | null;
  activeContract: boolean;
  contractDaysRemaining: number | null;
  insuranceDaysRemaining: number | null;
}> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      expenses: true,
      purchaseOrders: true,
    },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const totalExpenses = vendor.expenses.length;
  const totalPurchaseOrders = vendor.purchaseOrders.length;

  const totalExpenseAmount = vendor.expenses.reduce(
    (sum, expense) => sum + Number(expense.totalAmount),
    0
  );
  const averageExpenseAmount = totalExpenses > 0 ? totalExpenseAmount / totalExpenses : 0;

  const totalPOAmount = vendor.purchaseOrders.reduce(
    (sum, po) => sum + Number(po.total),
    0
  );
  const averagePOAmount = totalPurchaseOrders > 0 ? totalPOAmount / totalPurchaseOrders : 0;

  const now = new Date();
  const contractDaysRemaining = vendor.contractEnd
    ? Math.ceil((vendor.contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const insuranceDaysRemaining = vendor.insuranceExpiration
    ? Math.ceil((vendor.insuranceExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const activeContract =
    vendor.contractStart &&
    vendor.contractEnd &&
    now >= vendor.contractStart &&
    now <= vendor.contractEnd;

  return {
    totalExpenses,
    totalPurchaseOrders,
    averageExpenseAmount,
    averagePOAmount,
    performanceScore: vendor.performanceScore,
    activeContract: activeContract || false,
    contractDaysRemaining,
    insuranceDaysRemaining,
  };
}

/**
 * Get vendors requiring attention (expiring contracts/insurance)
 */
export async function getVendorsRequiringAttention(): Promise<{
  contractsExpiringSoon: Vendor[];
  insuranceExpiringSoon: Vendor[];
  expiredContracts: Vendor[];
  expiredInsurance: Vendor[];
}> {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const [contractsExpiringSoon, insuranceExpiringSoon, expiredContracts, expiredInsurance] =
    await Promise.all([
      // Contracts expiring within 90 days
      prisma.vendor.findMany({
        where: {
          isActive: true,
          contractEnd: {
            gte: now,
            lte: ninetyDaysFromNow,
          },
        },
        orderBy: { contractEnd: 'asc' },
      }),

      // Insurance expiring within 30 days
      prisma.vendor.findMany({
        where: {
          isActive: true,
          insuranceExpiration: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        orderBy: { insuranceExpiration: 'asc' },
      }),

      // Expired contracts
      prisma.vendor.findMany({
        where: {
          isActive: true,
          contractEnd: {
            lt: now,
          },
        },
        orderBy: { contractEnd: 'desc' },
      }),

      // Expired insurance
      prisma.vendor.findMany({
        where: {
          isActive: true,
          insuranceExpiration: {
            lt: now,
          },
        },
        orderBy: { insuranceExpiration: 'desc' },
      }),
    ]);

  return {
    contractsExpiringSoon,
    insuranceExpiringSoon,
    expiredContracts,
    expiredInsurance,
  };
}

/**
 * Get vendor spending summary
 */
export async function getVendorSpendingSummary(vendorId: string, fiscalYear?: number): Promise<{
  totalExpenses: number;
  totalPurchaseOrders: number;
  totalSpent: number;
  expensesByCategory: Record<string, number>;
  monthlySpending: Array<{ month: string; amount: number }>;
}> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Build date filter for fiscal year if provided
  const dateFilter = fiscalYear
    ? {
        gte: new Date(`${fiscalYear}-01-01`),
        lt: new Date(`${fiscalYear + 1}-01-01`),
      }
    : undefined;

  const [expenses, purchaseOrders] = await Promise.all([
    prisma.expense.findMany({
      where: {
        vendorId,
        status: 'PAID',
        ...(dateFilter && { expenseDate: dateFilter }),
      },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        vendorId,
        status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] },
        ...(dateFilter && { orderDate: dateFilter }),
      },
    }),
  ]);

  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
  const totalPOAmount = purchaseOrders.reduce((sum, po) => sum + Number(po.total), 0);

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach((expense) => {
    const category = expense.category;
    expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(expense.totalAmount);
  });

  // Calculate monthly spending
  const monthlySpending: Array<{ month: string; amount: number }> = [];
  const monthlyData: Record<string, number> = {};

  expenses.forEach((expense) => {
    const month = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM
    monthlyData[month] = (monthlyData[month] || 0) + Number(expense.totalAmount);
  });

  Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, amount]) => {
      monthlySpending.push({ month, amount });
    });

  return {
    totalExpenses: expenses.length,
    totalPurchaseOrders: purchaseOrders.length,
    totalSpent: totalExpenseAmount + totalPOAmount,
    expensesByCategory,
    monthlySpending,
  };
}
