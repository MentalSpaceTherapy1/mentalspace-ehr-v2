/**
 * Appointment Service
 * Phase 3.2: Business logic extracted from appointment.controller.ts
 *
 * Handles all appointment-related business operations including:
 * - Time normalization and conflict detection
 * - Appointment CRUD operations
 * - Scheduling validation
 * - Room/resource management
 * - Bulk operations
 */

import prisma from './database';
import { Prisma, Appointment, AppointmentStatus } from '@mentalspace/database';
import { z } from 'zod';
import logger, { auditLogger } from '../utils/logger';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { JwtPayload } from '../utils/jwt';
import { applyAppointmentScope, assertCanAccessClient } from './accessControl.service';
import { calculateNoteDueDate } from './compliance.service';
import * as telehealthService from './telehealth.service';
import * as waitlistIntegrationService from './waitlist-integration.service';
import * as recurringService from './recurringAppointment.service';
import { AppointmentStatus as AppointmentStatusConst, StatusGroups } from '@mentalspace/shared';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const baseAppointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID').optional(),
  isGroupAppointment: z.boolean().default(false),
  clientIds: z.array(z.string().uuid('Invalid client ID')).min(2, 'Group appointments require at least 2 clients').optional(),
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)'),
  duration: z.number().int().min(15).max(480, 'Duration must be between 15 and 480 minutes'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  serviceLocation: z.string().min(1, 'Service location is required'),
  officeLocationId: z.string().uuid().optional(),
  room: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  cptCode: z.string().optional(),
  icdCodes: z.array(z.string()).optional(),
  appointmentNotes: z.string().optional(),
});

export const createAppointmentSchema = baseAppointmentSchema.refine(
  (data) => {
    if (data.isGroupAppointment) {
      return data.clientIds && data.clientIds.length >= 2;
    }
    return !!data.clientId;
  },
  {
    message: 'Either clientId (individual) or clientIds (group with 2+ clients) is required',
    path: ['clientId'],
  }
);

export const updateAppointmentSchema = baseAppointmentSchema.partial().omit({
  clientId: true,
  clinicianId: true,
});

export const rescheduleSchema = z.object({
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format'),
  appointmentNotes: z.string().optional(),
});

export const cancelSchema = z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  cancellationNotes: z.string().optional(),
  cancellationFeeApplied: z.boolean().default(false),
});

export const checkInSchema = z.object({
  checkedInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
});

export const checkOutSchema = z.object({
  checkedOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  actualDuration: z.number().int().min(1).optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export interface AppointmentFilters {
  clientId?: string;
  clinicianId?: string;
  status?: AppointmentStatus;
  startDate?: Date;
  endDate?: Date;
  appointmentType?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AppointmentListResult {
  appointments: Appointment[];
  pagination: PaginationInfo;
}

export interface ConflictInfo {
  id: string;
  clientName?: string;
  startTime: string;
  endTime: string;
  status?: string;
}

export interface TimeSlotValidation {
  isAvailable: boolean;
  conflicts: ConflictInfo[];
}

export interface RoomOccupancyInfo {
  room: string;
  appointments: any[];
  totalAppointments: number;
  occupancyRate: number;
}

// Valid statuses for active appointments - use shared constants
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatusConst.SCHEDULED,
  AppointmentStatusConst.CONFIRMED,
  AppointmentStatusConst.CHECKED_IN,
  AppointmentStatusConst.IN_PROGRESS, // IN_SESSION maps to IN_PROGRESS in shared constants
] as AppointmentStatus[];

const VALID_STATUSES: AppointmentStatus[] = [
  AppointmentStatusConst.SCHEDULED,
  AppointmentStatusConst.CONFIRMED,
  AppointmentStatusConst.CHECKED_IN,
  AppointmentStatusConst.IN_PROGRESS,
  AppointmentStatusConst.COMPLETED,
  AppointmentStatusConst.NO_SHOW,
  AppointmentStatusConst.CANCELLED,
  AppointmentStatusConst.RESCHEDULED,
] as AppointmentStatus[];

// ============================================================================
// APPOINTMENT SERVICE CLASS
// ============================================================================

class AppointmentService {
  // ==========================================================================
  // TIME UTILITIES
  // ==========================================================================

  /**
   * Normalize time strings to HH:MM format (with leading zero)
   * This fixes the bug where "8:30" > "09:00" in string comparison
   */
  normalizeTimeFormat(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  /**
   * Convert time string to minutes for accurate comparison
   */
  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculate duration in minutes from start and end time strings
   */
  calculateDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return endMinutes - startMinutes;
  }

  // ==========================================================================
  // CONFLICT DETECTION
  // ==========================================================================

  /**
   * Check for scheduling conflicts at a given time slot
   * Uses proper numerical time comparison to fix time string comparison bugs
   */
  async checkConflicts(
    clinicianId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<ConflictInfo[]> {
    const normalizedStartTime = this.normalizeTimeFormat(startTime);
    const normalizedEndTime = this.normalizeTimeFormat(endTime);
    const newStartMinutes = this.timeToMinutes(normalizedStartTime);
    const newEndMinutes = this.timeToMinutes(normalizedEndTime);

    // Fetch all active appointments for the clinician on that date
    const whereClause: Prisma.AppointmentWhereInput = {
      clinicianId,
      appointmentDate,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
    };

    if (excludeAppointmentId) {
      whereClause.id = { not: excludeAppointmentId };
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter conflicts using proper numerical time comparison
    const conflicts = existingAppointments.filter((apt) => {
      const existingStart = this.timeToMinutes(apt.startTime);
      const existingEnd = this.timeToMinutes(apt.endTime);

      // Check for overlap:
      // 1. New start is within existing appointment
      // 2. New end is within existing appointment
      // 3. New appointment completely contains existing
      const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;

      return startsWithinExisting || endsWithinExisting || containsExisting;
    });

    return conflicts.map((c) => ({
      id: c.id,
      clientName: `${c.client.firstName} ${c.client.lastName}`,
      startTime: c.startTime,
      endTime: c.endTime,
      status: c.status,
    }));
  }

  /**
   * Validate a time slot is available (for drag-and-drop preview)
   */
  async validateTimeSlot(
    clinicianId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<TimeSlotValidation> {
    const conflicts = await this.checkConflicts(
      clinicianId,
      appointmentDate,
      startTime,
      endTime,
      excludeAppointmentId
    );

    return {
      isAvailable: conflicts.length === 0,
      conflicts,
    };
  }

  // ==========================================================================
  // ROOM OCCUPANCY
  // ==========================================================================

  /**
   * Calculate room occupancy rate as a percentage
   * Assumes 12-hour workday (8 AM to 8 PM = 720 minutes)
   */
  calculateRoomOccupancy(appointments: Appointment[], startDate: Date, endDate: Date): number {
    if (appointments.length === 0) return 0;

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalAvailableMinutes = daysDiff * 720; // 12 hours per day

    const totalOccupiedMinutes = appointments.reduce((sum, appt) => sum + appt.duration, 0);

    return Math.round((totalOccupiedMinutes / totalAvailableMinutes) * 100);
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Get all appointments with filtering, pagination, and access control
   */
  async getAppointments(
    filters: AppointmentFilters,
    user: JwtPayload
  ): Promise<AppointmentListResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const baseWhere: Prisma.AppointmentWhereInput = {};

    if (filters.clientId) baseWhere.clientId = filters.clientId;
    if (filters.clinicianId) baseWhere.clinicianId = filters.clinicianId;
    if (filters.status) baseWhere.status = filters.status;
    if (filters.appointmentType) baseWhere.appointmentType = filters.appointmentType;

    if (filters.startDate || filters.endDate) {
      baseWhere.appointmentDate = {};
      if (filters.startDate) baseWhere.appointmentDate.gte = filters.startDate;
      if (filters.endDate) baseWhere.appointmentDate.lte = filters.endDate;
    }

    // Apply access control scope
    const scopedWhere = await applyAppointmentScope(user, baseWhere, { allowBillingView: true });

    // Execute queries in parallel
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: scopedWhere,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              primaryPhone: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
            },
          },
        },
        orderBy: { appointmentDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where: scopedWhere }),
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single appointment by ID with access control
   */
  async getAppointmentById(id: string, user: JwtPayload): Promise<Appointment> {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            primaryPhone: true,
            dateOfBirth: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment');
    }

    // Verify access
    await assertCanAccessClient(user, {
      clientId: appointment.clientId,
      allowBillingView: true,
    });

    return appointment;
  }

  /**
   * Get appointments by client ID
   */
  async getAppointmentsByClientId(clientId: string, user: JwtPayload): Promise<Appointment[]> {
    await assertCanAccessClient(user, { clientId, allowBillingView: true });

    return prisma.appointment.findMany({
      where: { clientId },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    data: z.infer<typeof createAppointmentSchema>,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const validatedData = createAppointmentSchema.parse(data);

    // Validate client access based on appointment type
    if (validatedData.isGroupAppointment && validatedData.clientIds) {
      for (const clientId of validatedData.clientIds) {
        await assertCanAccessClient(user, { clientId });
      }
    } else if (validatedData.clientId) {
      await assertCanAccessClient(user, { clientId: validatedData.clientId });
    }

    // Check for scheduling conflicts
    const conflicts = await this.checkConflicts(
      validatedData.clinicianId,
      new Date(validatedData.appointmentDate),
      validatedData.startTime,
      validatedData.endTime
    );

    if (conflicts.length > 0) {
      throw new ConflictError('Scheduling conflict detected', { conflicts });
    }

    // Determine primary client for group appointments
    const primaryClientId = validatedData.isGroupAppointment
      ? validatedData.clientIds![0]
      : validatedData.clientId!;

    // Create appointment data
    const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
      clientId: primaryClientId,
      clinicianId: validatedData.clinicianId,
      appointmentDate: new Date(validatedData.appointmentDate),
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      duration: validatedData.duration,
      appointmentType: validatedData.appointmentType,
      serviceLocation: validatedData.serviceLocation,
      timezone: validatedData.timezone,
      status: AppointmentStatusConst.SCHEDULED,
      statusUpdatedBy: userId,
      createdBy: userId,
      lastModifiedBy: userId,
      icdCodes: validatedData.icdCodes || [],
      cptCode: validatedData.cptCode || null,
      appointmentNotes: validatedData.appointmentNotes,
      isGroupSession: validatedData.isGroupAppointment || false,
    };

    // Use transaction to create appointment
    const appointment = await prisma.$transaction(async (tx) => {
      const newAppointment = await tx.appointment.create({
        data: appointmentData,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
      });

      return newAppointment;
    });

    // Audit log
    if (validatedData.isGroupAppointment && validatedData.clientIds) {
      auditLogger.info('Group appointment created', {
        userId,
        appointmentId: appointment.id,
        clientIds: validatedData.clientIds,
        clientCount: validatedData.clientIds.length,
        action: 'GROUP_APPOINTMENT_CREATED',
      });
    } else {
      auditLogger.info('Appointment created', {
        userId,
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        action: 'APPOINTMENT_CREATED',
      });
    }

    // Auto-create telehealth session if service location is Telehealth
    if (appointment.serviceLocation === 'Telehealth') {
      try {
        const telehealthSession = await telehealthService.createTelehealthSession({
          appointmentId: appointment.id,
          createdBy: userId,
        });
        logger.info('Telehealth session auto-created for appointment', {
          appointmentId: appointment.id,
          sessionId: telehealthSession.id,
        });
      } catch (telehealthError) {
        // Log error but don't fail appointment creation
        logger.error('Failed to auto-create telehealth session', {
          appointmentId: appointment.id,
          error: telehealthError instanceof Error ? telehealthError.message : 'Unknown error',
        });
      }
    }

    return appointment;
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(
    id: string,
    data: z.infer<typeof updateAppointmentSchema>,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const validatedData = updateAppointmentSchema.parse(data);

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    // Check for scheduling conflicts if time/date is being changed
    if (validatedData.appointmentDate || validatedData.startTime || validatedData.endTime) {
      const appointmentDate = validatedData.appointmentDate
        ? new Date(validatedData.appointmentDate)
        : existingAppointment.appointmentDate;
      const startTime = validatedData.startTime || existingAppointment.startTime;
      const endTime = validatedData.endTime || existingAppointment.endTime;

      const conflicts = await this.checkConflicts(
        existingAppointment.clinicianId,
        appointmentDate,
        startTime,
        endTime,
        id
      );

      if (conflicts.length > 0) {
        throw new ConflictError('Scheduling conflict detected', { conflicts });
      }
    }

    // Strip out fields that don't exist in the Prisma Appointment model
    const { isGroupAppointment, clientIds, ...dbFields } = validatedData;

    const updateData: Prisma.AppointmentUncheckedUpdateInput = {
      ...dbFields,
      lastModifiedBy: userId,
      updatedAt: new Date(),
    };

    if (dbFields.appointmentDate) {
      updateData.appointmentDate = new Date(dbFields.appointmentDate);
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    auditLogger.info('Appointment updated', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_UPDATED',
    });

    return appointment;
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(
    id: string,
    data: z.infer<typeof rescheduleSchema>,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const validatedData = rescheduleSchema.parse(data);

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    // Check for conflicts at new time
    const conflicts = await this.checkConflicts(
      existingAppointment.clinicianId,
      new Date(validatedData.appointmentDate),
      validatedData.startTime,
      validatedData.endTime,
      id
    );

    if (conflicts.length > 0) {
      throw new ConflictError('Scheduling conflict detected at new time', { conflicts });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: new Date(validatedData.appointmentDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        status: 'RESCHEDULED',
        appointmentNotes: validatedData.appointmentNotes,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    // Sync linked clinical notes with the rescheduled appointment date
    const newSessionDate = new Date(validatedData.appointmentDate);
    await prisma.clinicalNote.updateMany({
      where: { appointmentId: id },
      data: {
        sessionDate: newSessionDate,
        dueDate: calculateNoteDueDate(newSessionDate),
      },
    });

    auditLogger.info('Appointment rescheduled', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_RESCHEDULED',
    });

    return appointment;
  }

  /**
   * Quick reschedule for drag-and-drop operations
   */
  async quickReschedule(
    id: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    clinicianId: string | undefined,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true, clinician: true },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    const targetClinicianId = clinicianId || existingAppointment.clinicianId;

    // Check for conflicts
    const conflicts = await this.checkConflicts(
      targetClinicianId,
      appointmentDate,
      startTime,
      endTime,
      id
    );

    if (conflicts.length > 0) {
      throw new ConflictError('Scheduling conflict detected at new time', { conflicts });
    }

    const duration = this.calculateDuration(startTime, endTime);

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate,
        startTime,
        endTime,
        duration,
        clinicianId: targetClinicianId,
        status: 'RESCHEDULED',
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        appointmentTypeObj: {
          select: {
            typeName: true,
            colorCode: true,
          },
        },
      },
    });

    // Sync linked clinical notes
    await prisma.clinicalNote.updateMany({
      where: { appointmentId: id },
      data: {
        sessionDate: appointmentDate,
        dueDate: calculateNoteDueDate(appointmentDate),
      },
    });

    auditLogger.info('Appointment quick rescheduled', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_QUICK_RESCHEDULE',
      from: {
        date: existingAppointment.appointmentDate,
        startTime: existingAppointment.startTime,
        clinicianId: existingAppointment.clinicianId,
      },
      to: {
        date: appointmentDate,
        startTime,
        clinicianId: targetClinicianId,
      },
    });

    return appointment;
  }

  /**
   * Check in an appointment
   */
  async checkInAppointment(
    id: string,
    checkedInTime: string,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkedInTime,
        checkedInBy: userId,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Client checked in', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_CHECKED_IN',
    });

    return appointment;
  }

  /**
   * Check out an appointment
   */
  async checkOutAppointment(
    id: string,
    data: z.infer<typeof checkOutSchema>,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const validatedData = checkOutSchema.parse(data);

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        checkedOutTime: validatedData.checkedOutTime,
        checkedOutBy: userId,
        actualDuration: validatedData.actualDuration,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Client checked out', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_CHECKED_OUT',
    });

    return appointment;
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    id: string,
    data: z.infer<typeof cancelSchema>,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const validatedData = cancelSchema.parse(data);

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationDate: new Date(),
        cancellationReason: validatedData.cancellationReason,
        cancellationNotes: validatedData.cancellationNotes,
        cancellationFeeApplied: validatedData.cancellationFeeApplied,
        cancelledBy: userId,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Appointment cancelled', {
      userId,
      appointmentId: id,
      reason: validatedData.cancellationReason,
      action: 'APPOINTMENT_CANCELLED',
    });

    // Trigger waitlist matching for the freed slot (async, don't block)
    waitlistIntegrationService.handleAppointmentCancellation(id, {
      clinicianId: appointment.clinicianId,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      appointmentType: appointment.appointmentType,
    }).catch((error) => {
      logger.error('Error triggering waitlist after cancellation', {
        appointmentId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return appointment;
  }

  /**
   * Mark an appointment as no-show
   */
  async markNoShow(
    id: string,
    noShowFeeApplied: boolean,
    noShowNotes: string | undefined,
    userId: string,
    user: JwtPayload
  ): Promise<Appointment> {
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        noShowDate: new Date(),
        noShowFeeApplied: noShowFeeApplied || false,
        noShowNotes,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Appointment marked as no-show', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_NO_SHOW',
    });

    return appointment;
  }

  /**
   * Delete an appointment (hard delete)
   */
  async deleteAppointment(id: string, userId: string, user: JwtPayload): Promise<void> {
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!existingAppointment) {
      throw new NotFoundError('Appointment');
    }

    await assertCanAccessClient(user, { clientId: existingAppointment.clientId });

    await prisma.appointment.delete({
      where: { id },
    });

    auditLogger.info('Appointment deleted', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_DELETED',
    });
  }

  /**
   * Get or create appointment for clinical note
   */
  async getOrCreateAppointment(
    clientId: string,
    clinicianId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    appointmentType: string,
    serviceLocation: string,
    userId: string,
    user: JwtPayload
  ): Promise<{ appointment: Appointment; created: boolean }> {
    await assertCanAccessClient(user, { clientId });

    // Check if appointment already exists
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        clientId,
        clinicianId,
        appointmentDate,
        startTime,
        endTime,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        clinician: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
      },
    });

    if (existingAppointment) {
      return { appointment: existingAppointment, created: false };
    }

    // Calculate duration
    const duration = this.calculateDuration(startTime, endTime);

    if (duration <= 0 || duration > 480) {
      throw new BadRequestError('Invalid time range. Duration must be between 1 and 480 minutes');
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(
      clinicianId,
      appointmentDate,
      startTime,
      endTime
    );

    if (conflicts.length > 0) {
      throw new ConflictError('Scheduling conflict detected', { conflicts });
    }

    // Create new appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        clientId,
        clinicianId,
        appointmentDate,
        startTime,
        endTime,
        duration,
        appointmentType,
        serviceLocation,
        timezone: 'America/New_York',
        status: AppointmentStatusConst.SCHEDULED,
        statusUpdatedBy: userId,
        createdBy: userId,
        lastModifiedBy: userId,
        icdCodes: [],
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        clinician: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
      },
    });

    auditLogger.info('Appointment created via getOrCreate', {
      userId,
      appointmentId: newAppointment.id,
      clientId,
      action: 'APPOINTMENT_GET_OR_CREATE',
    });

    return { appointment: newAppointment, created: true };
  }

  // ==========================================================================
  // RECURRING APPOINTMENTS
  // ==========================================================================

  /**
   * Create recurring appointments in a transaction
   * Phase 3.2: Moved from controller to service
   */
  async createRecurringAppointmentsInTransaction(
    appointments: Prisma.AppointmentUncheckedCreateInput[]
  ): Promise<Appointment[]> {
    const createdAppointments = await prisma.$transaction(
      appointments.map((appointmentData) =>
        prisma.appointment.create({ data: appointmentData })
      )
    );

    return createdAppointments;
  }

  // ==========================================================================
  // ELIGIBILITY HELPERS
  // ==========================================================================

  /**
   * Get appointment with client info for eligibility checking
   * Phase 3.2: Moved from controller to service
   */
  async getAppointmentForEligibility(id: string): Promise<{
    id: string;
    clientId: string;
    appointmentDate: Date;
    client: {
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date | null;
    };
  } | null> {
    return prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        appointmentDate: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Bulk update appointment statuses
   */
  async bulkUpdateStatus(
    appointmentIds: string[],
    status: AppointmentStatus,
    notes: string | undefined,
    userId: string
  ): Promise<number> {
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const updateData: Prisma.AppointmentUpdateManyMutationInput = {
      status,
      statusUpdatedDate: new Date(),
      statusUpdatedBy: userId,
    };

    if (notes) {
      updateData.appointmentNotes = notes;
    }

    const result = await prisma.appointment.updateMany({
      where: { id: { in: appointmentIds } },
      data: updateData,
    });

    auditLogger.info('Bulk status update', {
      userId,
      appointmentCount: result.count,
      newStatus: status,
      action: 'BULK_STATUS_UPDATE',
    });

    return result.count;
  }

  /**
   * Bulk cancel appointments
   */
  async bulkCancelAppointments(
    appointmentIds: string[],
    cancellationReason: string,
    cancellationNotes: string | undefined,
    userId: string
  ): Promise<number> {
    const result = await prisma.appointment.updateMany({
      where: { id: { in: appointmentIds } },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Bulk cancellation',
        cancellationNotes,
        cancellationDate: new Date(),
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
    });

    auditLogger.info('Bulk cancellation', {
      userId,
      appointmentCount: result.count,
      reason: cancellationReason,
      action: 'BULK_CANCEL',
    });

    return result.count;
  }

  /**
   * Bulk delete appointments
   */
  async bulkDeleteAppointments(appointmentIds: string[], userId: string): Promise<number> {
    // Delete associated reminders first
    await prisma.appointmentReminder.deleteMany({
      where: { appointmentId: { in: appointmentIds } },
    });

    // Delete appointments
    const result = await prisma.appointment.deleteMany({
      where: { id: { in: appointmentIds } },
    });

    auditLogger.info('Bulk deletion', {
      userId,
      appointmentCount: result.count,
      action: 'BULK_DELETE',
    });

    return result.count;
  }

  /**
   * Bulk assign room to appointments
   */
  async bulkAssignRoom(appointmentIds: string[], room: string, userId: string): Promise<number> {
    const result = await prisma.appointment.updateMany({
      where: { id: { in: appointmentIds } },
      data: { room },
    });

    auditLogger.info('Bulk room assignment', {
      userId,
      appointmentCount: result.count,
      room,
      action: 'BULK_ASSIGN_ROOM',
    });

    return result.count;
  }

  // ==========================================================================
  // RESOURCE VIEWS
  // ==========================================================================

  /**
   * Get room view for resource scheduling
   */
  async getRoomView(startDate: Date, endDate: Date): Promise<{
    summary: any;
    roomSchedules: RoomOccupancyInfo[];
  }> {
    // Fetch all appointments within date range that have a room assigned
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startDate, lte: endDate },
        room: { not: null },
        status: { not: 'CANCELLED' },
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        clinician: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        appointmentTypeObj: {
          select: { typeName: true, colorCode: true, category: true },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    // Get unique rooms
    const rooms = [...new Set(
      appointments.map((apt) => apt.room).filter((room): room is string => room !== null)
    )].sort();

    // Group appointments by room
    const roomSchedules = rooms.map((room) => {
      const roomAppts = appointments.filter((appt) => appt.room === room);

      return {
        room,
        appointments: roomAppts.map((appt) => ({
          id: appt.id,
          clientName: `${appt.client.firstName} ${appt.client.lastName}`,
          clientId: appt.client.id,
          clinicianName: `${appt.clinician.firstName} ${appt.clinician.lastName}`,
          clinicianId: appt.clinician.id,
          appointmentDate: appt.appointmentDate,
          startTime: appt.startTime,
          endTime: appt.endTime,
          duration: appt.duration,
          status: appt.status,
          appointmentType: appt.appointmentType,
          serviceLocation: appt.serviceLocation,
          colorCode: appt.appointmentTypeObj?.colorCode || '#3b82f6',
          confirmedAt: appt.confirmedAt,
        })),
        totalAppointments: roomAppts.length,
        occupancyRate: this.calculateRoomOccupancy(roomAppts, startDate, endDate),
      };
    });

    const summary = {
      totalRooms: rooms.length,
      totalAppointments: appointments.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      averageOccupancy:
        roomSchedules.length > 0
          ? roomSchedules.reduce((sum, r) => sum + r.occupancyRate, 0) / roomSchedules.length
          : 0,
    };

    return { summary, roomSchedules };
  }

  /**
   * Get provider comparison view
   */
  async getProviderComparison(
    providerIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: any;
    providerSchedules: any[];
  }> {
    // Fetch all provider information first
    const providers = await prisma.user.findMany({
      where: { id: { in: providerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
      },
    });

    const providerMap = new Map(providers.map((p) => [p.id, p]));

    // Fetch appointments for all providers
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: { in: providerIds },
        appointmentDate: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        appointmentTypeObj: {
          select: { typeName: true, colorCode: true, category: true },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    // Group appointments by provider
    const providerSchedules = providerIds.map((providerId) => {
      const providerAppts = appointments.filter((appt) => appt.clinicianId === providerId);
      const provider = providerMap.get(providerId);

      return {
        providerId,
        provider: provider || null,
        appointments: providerAppts.map((appt) => ({
          id: appt.id,
          clientName: `${appt.client.firstName} ${appt.client.lastName}`,
          clientId: appt.client.id,
          appointmentDate: appt.appointmentDate,
          startTime: appt.startTime,
          endTime: appt.endTime,
          duration: appt.duration,
          status: appt.status,
          appointmentType: appt.appointmentType,
          serviceLocation: appt.serviceLocation,
          room: appt.room,
          colorCode: appt.appointmentTypeObj?.colorCode || '#3b82f6',
          confirmedAt: appt.confirmedAt,
          noShowRiskLevel: appt.noShowRiskLevel,
        })),
        totalAppointments: providerAppts.length,
        confirmedCount: providerAppts.filter((a) => a.confirmedAt).length,
        pendingCount: providerAppts.filter((a) => !a.confirmedAt).length,
      };
    });

    const summary = {
      totalProviders: providerIds.length,
      totalAppointments: appointments.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };

    return { summary, providerSchedules };
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();
export default appointmentService;
