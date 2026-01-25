/**
 * Guardian Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma, AppointmentStatus } from '@mentalspace/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateGuardianInput {
  clientId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateGuardianInput {
  firstName?: string;
  lastName?: string;
  relationship?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
  notes?: string;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get all guardians for a client
 */
export async function getClientGuardians(clientId: string) {
  return prisma.legalGuardian.findMany({
    where: { clientId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

/**
 * Get single guardian by ID
 */
export async function getGuardianById(id: string) {
  return prisma.legalGuardian.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true,
        },
      },
    },
  });
}

/**
 * Create guardian
 */
export async function createGuardian(data: CreateGuardianInput) {
  // If this guardian is marked as primary, unset any other primary guardians for this client
  if (data.isPrimary) {
    await prisma.legalGuardian.updateMany({
      where: {
        clientId: data.clientId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  }

  // Convert empty strings to undefined for database
  const dataToCreate = {
    ...data,
    email: data.email === '' ? undefined : data.email,
    address: data.address === '' ? undefined : data.address,
  };

  return prisma.legalGuardian.create({
    data: dataToCreate as Prisma.LegalGuardianUncheckedCreateInput,
  });
}

/**
 * Update guardian
 */
export async function updateGuardian(id: string, data: UpdateGuardianInput) {
  const existingGuardian = await prisma.legalGuardian.findUnique({
    where: { id },
  });

  if (!existingGuardian) {
    return null;
  }

  // If this guardian is being set as primary, unset other primary guardians
  if (data.isPrimary) {
    await prisma.legalGuardian.updateMany({
      where: {
        clientId: existingGuardian.clientId,
        isPrimary: true,
        id: { not: id },
      },
      data: {
        isPrimary: false,
      },
    });
  }

  return prisma.legalGuardian.update({
    where: { id },
    data,
  });
}

/**
 * Delete guardian
 */
export async function deleteGuardian(id: string) {
  const existingGuardian = await prisma.legalGuardian.findUnique({
    where: { id },
  });

  if (!existingGuardian) {
    return null;
  }

  await prisma.legalGuardian.delete({
    where: { id },
  });

  return true;
}

// ============================================================================
// NEW GUARDIAN CONTROLLER METHODS (Phase 3.2)
// ============================================================================

export interface MinorAppointmentFilters {
  minorId: string;
  status?: AppointmentStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateAppointmentInput {
  clientId: string;
  clinicianId: string;
  appointmentTypeId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  serviceLocation: string;
  status: AppointmentStatus;
  statusUpdatedBy: string;
  createdBy: string;
  lastModifiedBy: string;
  appointmentNotes?: string;
}

/**
 * Get minor client profile by ID
 */
export async function getMinorProfileById(minorId: string) {
  return prisma.client.findUnique({
    where: { id: minorId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true,
      dateOfBirth: true,
      email: true,
      primaryPhone: true,
      addressCity: true,
      addressState: true,
      addressZipCode: true,
    },
  });
}

/**
 * Get appointments for a minor
 */
export async function getMinorAppointments(filters: MinorAppointmentFilters) {
  const where: Prisma.AppointmentWhereInput = { clientId: filters.minorId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    const appointmentDateFilter: Prisma.DateTimeFilter = {};
    if (filters.startDate) appointmentDateFilter.gte = filters.startDate;
    if (filters.endDate) appointmentDateFilter.lte = filters.endDate;
    where.appointmentDate = appointmentDateFilter;
  }

  return prisma.appointment.findMany({
    where,
    include: {
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialties: true,
        },
      },
      appointmentTypeObj: {
        select: {
          id: true,
          typeName: true,
          defaultDuration: true,
        },
      },
    },
    orderBy: { appointmentDate: 'desc' },
  });
}

/**
 * Create appointment for a minor
 */
export async function createMinorAppointment(data: CreateAppointmentInput) {
  return prisma.appointment.create({
    data: {
      clientId: data.clientId,
      clinicianId: data.clinicianId,
      appointmentTypeId: data.appointmentTypeId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      appointmentType: data.appointmentType,
      serviceLocation: data.serviceLocation,
      status: data.status,
      statusUpdatedBy: data.statusUpdatedBy,
      createdBy: data.createdBy,
      lastModifiedBy: data.lastModifiedBy,
      appointmentNotes: data.appointmentNotes,
    },
    include: {
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      appointmentTypeObj: {
        select: {
          id: true,
          typeName: true,
          defaultDuration: true,
        },
      },
    },
  });
}
