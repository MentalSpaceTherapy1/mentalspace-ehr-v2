/**
 * Service Code Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceCodeFilters {
  isActive?: boolean;
  serviceType?: string;
  category?: string;
}

export interface CreateServiceCodeInput {
  code: string;
  description: string;
  serviceType: string;
  category?: string;
  defaultDuration?: number;
  defaultRate?: number;
  isActive?: boolean;
  requiresAuthorization?: boolean;
}

export interface UpdateServiceCodeInput {
  code?: string;
  description?: string;
  serviceType?: string;
  category?: string;
  defaultDuration?: number;
  defaultRate?: number;
  isActive?: boolean;
  requiresAuthorization?: boolean;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get all service codes with optional filtering
 */
export async function getAllServiceCodes(filters: ServiceCodeFilters = {}) {
  const where: Prisma.ServiceCodeWhereInput = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.serviceType) {
    where.serviceType = filters.serviceType;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return prisma.serviceCode.findMany({
    where,
    orderBy: [
      { serviceType: 'asc' },
      { code: 'asc' },
    ],
  });
}

/**
 * Get service code by ID
 */
export async function getServiceCodeById(id: string) {
  return prisma.serviceCode.findUnique({
    where: { id },
  });
}

/**
 * Get service code by code (e.g., '90791')
 */
export async function getServiceCodeByCode(code: string) {
  return prisma.serviceCode.findUnique({
    where: { code },
  });
}

/**
 * Create a new service code
 */
export async function createServiceCode(data: CreateServiceCodeInput, userId?: string) {
  return prisma.serviceCode.create({
    data: {
      code: data.code,
      description: data.description,
      serviceType: data.serviceType,
      category: data.category,
      defaultDuration: data.defaultDuration,
      defaultRate: data.defaultRate,
      isActive: data.isActive !== undefined ? data.isActive : true,
      requiresAuthorization: data.requiresAuthorization !== undefined ? data.requiresAuthorization : false,
      createdBy: userId,
      lastModifiedBy: userId,
    },
  });
}

/**
 * Update a service code
 */
export async function updateServiceCode(id: string, data: UpdateServiceCodeInput, userId?: string) {
  const updateData: Prisma.ServiceCodeUpdateInput = {
    lastModifiedBy: userId,
  };

  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.defaultDuration !== undefined) updateData.defaultDuration = data.defaultDuration;
  if (data.defaultRate !== undefined) updateData.defaultRate = data.defaultRate;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.requiresAuthorization !== undefined) updateData.requiresAuthorization = data.requiresAuthorization;

  return prisma.serviceCode.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete (soft delete) a service code by setting isActive = false
 */
export async function deleteServiceCode(id: string, userId?: string) {
  return prisma.serviceCode.update({
    where: { id },
    data: {
      isActive: false,
      lastModifiedBy: userId,
    },
  });
}
