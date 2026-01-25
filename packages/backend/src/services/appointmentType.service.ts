import prisma from './database';
import type { AppointmentType } from '@prisma/client';

/**
 * Module 3 Phase 1.2: Appointment Type Service
 *
 * Manages appointment types with smart defaults and business rules
 */

export interface CreateAppointmentTypeRequest {
  typeName: string;
  category: 'INDIVIDUAL' | 'GROUP' | 'FAMILY' | 'COUPLES';
  description?: string;
  defaultDuration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  isBillable?: boolean;
  requiresAuth?: boolean;
  requiresSupervisor?: boolean;
  maxPerDay?: number;
  cptCode?: string;
  defaultRate?: number;
  colorCode?: string;
  iconName?: string;
  isActive?: boolean;
  allowOnlineBooking?: boolean;
}

export interface UpdateAppointmentTypeRequest {
  typeName?: string;
  category?: 'INDIVIDUAL' | 'GROUP' | 'FAMILY' | 'COUPLES';
  description?: string;
  defaultDuration?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  isBillable?: boolean;
  requiresAuth?: boolean;
  requiresSupervisor?: boolean;
  maxPerDay?: number;
  cptCode?: string;
  defaultRate?: number;
  colorCode?: string;
  iconName?: string;
  isActive?: boolean;
  allowOnlineBooking?: boolean;
}

export interface AppointmentTypeFilters {
  category?: string;
  isActive?: boolean;
  isBillable?: boolean;
  search?: string;
}

/**
 * Create a new appointment type
 */
export async function createAppointmentType(
  data: CreateAppointmentTypeRequest
): Promise<AppointmentType> {
  // Check if typeName already exists
  const existing = await prisma.appointmentType.findUnique({
    where: { typeName: data.typeName },
  });

  if (existing) {
    throw new Error(`Appointment type with name "${data.typeName}" already exists`);
  }

  return await prisma.appointmentType.create({
    data: {
      typeName: data.typeName,
      category: data.category,
      description: data.description,
      defaultDuration: data.defaultDuration,
      bufferBefore: data.bufferBefore ?? 0,
      bufferAfter: data.bufferAfter ?? 15,
      isBillable: data.isBillable ?? true,
      requiresAuth: data.requiresAuth ?? false,
      requiresSupervisor: data.requiresSupervisor ?? false,
      maxPerDay: data.maxPerDay,
      cptCode: data.cptCode,
      defaultRate: data.defaultRate,
      colorCode: data.colorCode,
      iconName: data.iconName,
      isActive: data.isActive ?? true,
      allowOnlineBooking: data.allowOnlineBooking ?? false,
    },
  });
}

/**
 * Update an existing appointment type
 */
export async function updateAppointmentType(
  id: string,
  data: UpdateAppointmentTypeRequest
): Promise<AppointmentType> {
  // If typeName is being changed, check for uniqueness
  if (data.typeName) {
    const existing = await prisma.appointmentType.findFirst({
      where: {
        typeName: data.typeName,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error(`Appointment type with name "${data.typeName}" already exists`);
    }
  }

  return await prisma.appointmentType.update({
    where: { id },
    data,
  });
}

/**
 * Delete an appointment type (soft delete by setting isActive = false)
 */
export async function deleteAppointmentType(id: string): Promise<AppointmentType> {
  // Check if appointment type has any appointments
  const appointmentsCount = await prisma.appointment.count({
    where: { appointmentTypeId: id },
  });

  if (appointmentsCount > 0) {
    // Soft delete - set inactive
    return await prisma.appointmentType.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    // Hard delete if no appointments
    return await prisma.appointmentType.delete({
      where: { id },
    });
  }
}

/**
 * Get appointment type by ID
 */
export async function getAppointmentTypeById(
  id: string
): Promise<AppointmentType | null> {
  return await prisma.appointmentType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { appointments: true },
      },
    },
  });
}

/**
 * Get all appointment types with optional filters
 */
export async function getAllAppointmentTypes(
  filters?: AppointmentTypeFilters
): Promise<AppointmentType[]> {
  const where: Prisma.AppointmentTypeWhereInput = {};

  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.isBillable !== undefined) {
    where.isBillable = filters.isBillable;
  }

  if (filters?.search) {
    where.OR = [
      {
        typeName: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  return await prisma.appointmentType.findMany({
    where,
    include: {
      _count: {
        select: { appointments: true },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { typeName: 'asc' },
    ],
  });
}

/**
 * Get only active appointment types
 */
export async function getActiveAppointmentTypes(): Promise<AppointmentType[]> {
  return await prisma.appointmentType.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { appointments: true },
      },
    },
    orderBy: [
      { category: 'asc' },
      { typeName: 'asc' },
    ],
  });
}

/**
 * Get appointment types by category
 */
export async function getAppointmentTypesByCategory(
  category: 'INDIVIDUAL' | 'GROUP' | 'FAMILY' | 'COUPLES'
): Promise<AppointmentType[]> {
  return await prisma.appointmentType.findMany({
    where: {
      category,
      isActive: true,
    },
    include: {
      _count: {
        select: { appointments: true },
      },
    },
    orderBy: { typeName: 'asc' },
  });
}

/**
 * Get appointment type statistics
 */
export async function getAppointmentTypeStats() {
  const [total, active, byCategory] = await Promise.all([
    prisma.appointmentType.count(),
    prisma.appointmentType.count({ where: { isActive: true } }),
    prisma.appointmentType.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isActive: true },
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
