import prisma from './database';
import type { Payer } from '@prisma/client';

/**
 * Phase 2.1: Payer Service
 *
 * Manages insurance payers (BlueCross, Medicaid, Medicare, EAP, etc.)
 */

export interface CreatePayerRequest {
  name: string;
  payerType: 'COMMERCIAL' | 'MEDICAID' | 'MEDICARE' | 'EAP' | 'SELF_PAY';
  requiresPreAuth?: boolean;
  isActive?: boolean;
}

export interface UpdatePayerRequest {
  name?: string;
  payerType?: 'COMMERCIAL' | 'MEDICAID' | 'MEDICARE' | 'EAP' | 'SELF_PAY';
  requiresPreAuth?: boolean;
  isActive?: boolean;
}

export interface PayerFilters {
  payerType?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * Create a new payer
 */
export async function createPayer(data: CreatePayerRequest): Promise<Payer> {
  return await prisma.payer.create({
    data: {
      name: data.name,
      payerType: data.payerType,
      requiresPreAuth: data.requiresPreAuth ?? false,
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * Update an existing payer
 */
export async function updatePayer(
  id: string,
  data: UpdatePayerRequest
): Promise<Payer> {
  return await prisma.payer.update({
    where: { id },
    data,
  });
}

/**
 * Delete a payer (soft delete by setting isActive = false)
 */
export async function deletePayer(id: string): Promise<Payer> {
  // Check if payer has any rules
  const rulesCount = await prisma.payerRule.count({
    where: { payerId: id },
  });

  if (rulesCount > 0) {
    // Soft delete - set inactive
    return await prisma.payer.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    // Hard delete if no rules
    return await prisma.payer.delete({
      where: { id },
    });
  }
}

/**
 * Get payer by ID
 */
export async function getPayerById(id: string): Promise<Payer | null> {
  return await prisma.payer.findUnique({
    where: { id },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Get all payers with optional filters
 */
export async function getPayers(filters?: PayerFilters): Promise<Payer[]> {
  const where: Prisma.PayerWhereInput = {};

  if (filters?.payerType) {
    where.payerType = filters.payerType;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.search) {
    where.name = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  return await prisma.payer.findMany({
    where,
    include: {
      _count: {
        select: { rules: true },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Get payer statistics
 */
export async function getPayerStats() {
  const [total, active, byType] = await Promise.all([
    prisma.payer.count(),
    prisma.payer.count({ where: { isActive: true } }),
    prisma.payer.groupBy({
      by: ['payerType'],
      _count: { id: true },
      where: { isActive: true },
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byType: byType.reduce((acc, item) => {
      acc[item.payerType] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
