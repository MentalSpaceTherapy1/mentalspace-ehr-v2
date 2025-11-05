import prisma from './database';
import type { TimeOffRequest, Appointment } from '@prisma/client';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * Module 3 Phase 2.3: Time-Off Request Service
 *
 * Manages provider time-off requests with approval workflows and auto-rescheduling
 */

export interface CreateTimeOffRequest {
  providerId: string;
  startDate: Date;
  endDate: Date;
  reason: 'VACATION' | 'SICK' | 'CONFERENCE' | 'PERSONAL';
  notes?: string;
  requestedBy: string;
  coverageProviderId?: string;
  autoReschedule?: boolean;
}

export interface UpdateTimeOffRequest {
  startDate?: Date;
  endDate?: Date;
  reason?: 'VACATION' | 'SICK' | 'CONFERENCE' | 'PERSONAL';
  notes?: string;
  coverageProviderId?: string;
  autoReschedule?: boolean;
}

export interface ApproveTimeOffRequest {
  approvedBy: string;
}

export interface DenyTimeOffRequest {
  approvedBy: string;
  denialReason: string;
}

export interface TimeOffFilters {
  providerId?: string;
  status?: 'PENDING' | 'APPROVED' | 'DENIED';
  startDate?: Date;
  endDate?: Date;
}

export interface AffectedAppointment {
  appointment: Appointment;
  client: any;
  suggestedCoverageProviders?: any[];
}

/**
 * Create a new time-off request
 */
export async function createTimeOffRequest(
  data: CreateTimeOffRequest
): Promise<TimeOffRequest> {
  // Validate provider exists
  const provider = await prisma.user.findUnique({
    where: { id: data.providerId },
  });

  if (!provider) {
    throw new Error('Provider not found');
  }

  // Validate requester exists
  const requester = await prisma.user.findUnique({
    where: { id: data.requestedBy },
  });

  if (!requester) {
    throw new Error('Requester not found');
  }

  // Validate date range
  if (data.startDate >= data.endDate) {
    throw new Error('End date must be after start date');
  }

  // Check for overlapping time-off requests
  const overlappingRequests = await prisma.timeOffRequest.findMany({
    where: {
      providerId: data.providerId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          startDate: { lte: data.endDate },
          endDate: { gte: data.startDate },
        },
      ],
    },
  });

  if (overlappingRequests.length > 0) {
    throw new Error(
      'Time-off request overlaps with existing request from ' +
      `${format(overlappingRequests[0].startDate, 'MMM dd, yyyy')} to ` +
      `${format(overlappingRequests[0].endDate, 'MMM dd, yyyy')}`
    );
  }

  // Validate coverage provider if provided
  if (data.coverageProviderId) {
    const coverageProvider = await prisma.user.findUnique({
      where: { id: data.coverageProviderId },
    });

    if (!coverageProvider) {
      throw new Error('Coverage provider not found');
    }
  }

  return await prisma.timeOffRequest.create({
    data: {
      providerId: data.providerId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      notes: data.notes,
      status: 'PENDING',
      requestedBy: data.requestedBy,
      coverageProviderId: data.coverageProviderId,
      autoReschedule: data.autoReschedule ?? false,
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      coverageProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Update a time-off request (only if PENDING)
 */
export async function updateTimeOffRequest(
  id: string,
  data: UpdateTimeOffRequest
): Promise<TimeOffRequest> {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new Error('Time-off request not found');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Cannot update a time-off request that has been approved or denied');
  }

  // Validate date range if being updated
  if (data.startDate && data.endDate && data.startDate >= data.endDate) {
    throw new Error('End date must be after start date');
  }

  return await prisma.timeOffRequest.update({
    where: { id },
    data,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      coverageProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Approve a time-off request
 */
export async function approveTimeOffRequest(
  id: string,
  data: ApproveTimeOffRequest
): Promise<TimeOffRequest> {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new Error('Time-off request not found');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Time-off request has already been processed');
  }

  // Validate approver exists
  const approver = await prisma.user.findUnique({
    where: { id: data.approvedBy },
  });

  if (!approver) {
    throw new Error('Approver not found');
  }

  // Update the request
  const updatedRequest = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: data.approvedBy,
      approvedDate: new Date(),
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      coverageProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });

  // Handle auto-rescheduling if enabled
  if (request.autoReschedule && request.coverageProviderId) {
    await autoRescheduleAffectedAppointments(
      request.providerId,
      request.startDate,
      request.endDate,
      request.coverageProviderId
    );
  }

  return updatedRequest;
}

/**
 * Deny a time-off request
 */
export async function denyTimeOffRequest(
  id: string,
  data: DenyTimeOffRequest
): Promise<TimeOffRequest> {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new Error('Time-off request not found');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Time-off request has already been processed');
  }

  // Validate approver exists
  const approver = await prisma.user.findUnique({
    where: { id: data.approvedBy },
  });

  if (!approver) {
    throw new Error('Approver not found');
  }

  return await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'DENIED',
      approvedBy: data.approvedBy,
      approvedDate: new Date(),
      denialReason: data.denialReason,
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approver: {
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

/**
 * Delete a time-off request (only if PENDING)
 */
export async function deleteTimeOffRequest(id: string): Promise<TimeOffRequest> {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new Error('Time-off request not found');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Cannot delete a time-off request that has been approved or denied');
  }

  return await prisma.timeOffRequest.delete({
    where: { id },
  });
}

/**
 * Get time-off request by ID
 */
export async function getTimeOffRequestById(id: string): Promise<TimeOffRequest | null> {
  return await prisma.timeOffRequest.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      coverageProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Get all time-off requests with optional filters
 */
export async function getAllTimeOffRequests(
  filters?: TimeOffFilters
): Promise<TimeOffRequest[]> {
  const where: any = {};

  if (filters?.providerId) {
    where.providerId = filters.providerId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate || filters?.endDate) {
    where.OR = [
      {
        startDate: {
          ...(filters.startDate ? { gte: filters.startDate } : {}),
          ...(filters.endDate ? { lte: filters.endDate } : {}),
        },
      },
      {
        endDate: {
          ...(filters.startDate ? { gte: filters.startDate } : {}),
          ...(filters.endDate ? { lte: filters.endDate } : {}),
        },
      },
    ];
  }

  return await prisma.timeOffRequest.findMany({
    where,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      coverageProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { startDate: 'desc' },
    ],
  });
}

/**
 * Get affected appointments for a time-off request
 */
export async function getAffectedAppointments(
  providerId: string,
  startDate: Date,
  endDate: Date
): Promise<AffectedAppointment[]> {
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicianId: providerId,
      appointmentDate: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryPhone: true,
          medicalRecordNumber: true,
        },
      },
    },
    orderBy: {
      appointmentDate: 'asc',
    },
  });

  const results: AffectedAppointment[] = [];

  for (const appointment of appointments) {
    // Find suggested coverage providers with similar availability
    const suggestedProviders = await findSuggestedCoverageProviders(
      providerId,
      appointment.appointmentDate,
      appointment.startTime,
      appointment.endTime
    );

    results.push({
      appointment,
      client: appointment.client,
      suggestedCoverageProviders: suggestedProviders,
    });
  }

  return results;
}

/**
 * Find suggested coverage providers
 */
export async function findSuggestedCoverageProviders(
  originalProviderId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<any[]> {
  const dayOfWeek = date.getDay();

  // Get original provider's specialties
  const originalProvider = await prisma.user.findUnique({
    where: { id: originalProviderId },
    select: { specialties: true },
  });

  if (!originalProvider) {
    return [];
  }

  // Find providers with availability at this time who have similar specialties
  const availableSchedules = await prisma.providerAvailability.findMany({
    where: {
      providerId: { not: originalProviderId },
      dayOfWeek,
      isActive: true,
      OR: [
        { effectiveDate: null, expiryDate: null },
        { effectiveDate: { lte: date }, expiryDate: null },
        { effectiveDate: null, expiryDate: { gte: date } },
        { effectiveDate: { lte: date }, expiryDate: { gte: date } },
      ],
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
          specialties: true,
        },
      },
    },
  });

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const requestStart = startHour * 60 + startMin;
  const requestEnd = endHour * 60 + endMin;

  const candidates = [];

  for (const schedule of availableSchedules) {
    // Check if time falls within schedule
    const [scheduleStartHour, scheduleStartMin] = schedule.startTime.split(':').map(Number);
    const [scheduleEndHour, scheduleEndMin] = schedule.endTime.split(':').map(Number);
    const scheduleStart = scheduleStartHour * 60 + scheduleStartMin;
    const scheduleEnd = scheduleEndHour * 60 + scheduleEndMin;

    if (requestStart >= scheduleStart && requestEnd <= scheduleEnd) {
      // Check if they have time-off on this date
      const hasTimeOff = await prisma.timeOffRequest.findFirst({
        where: {
          providerId: schedule.providerId,
          status: 'APPROVED',
          startDate: { lte: endOfDay(date) },
          endDate: { gte: startOfDay(date) },
        },
      });

      if (!hasTimeOff) {
        // Check for appointment conflicts
        const hasConflict = await prisma.appointment.findFirst({
          where: {
            clinicianId: schedule.providerId,
            appointmentDate: date,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            OR: [
              {
                startTime: { lte: startTime },
                endTime: { gt: startTime },
              },
              {
                startTime: { lt: endTime },
                endTime: { gte: endTime },
              },
              {
                startTime: { gte: startTime },
                endTime: { lte: endTime },
              },
            ],
          },
        });

        if (!hasConflict) {
          // Calculate specialty match score
          const matchingSpecialties = schedule.provider.specialties.filter(s =>
            originalProvider.specialties.includes(s)
          );

          candidates.push({
            ...schedule.provider,
            matchScore: matchingSpecialties.length,
          });
        }
      }
    }
  }

  // Sort by specialty match score
  return candidates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Auto-reschedule affected appointments to coverage provider
 */
async function autoRescheduleAffectedAppointments(
  originalProviderId: string,
  startDate: Date,
  endDate: Date,
  coverageProviderId: string
): Promise<number> {
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicianId: originalProviderId,
      appointmentDate: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
  });

  let rescheduledCount = 0;

  for (const appointment of appointments) {
    try {
      // Check if coverage provider is available at this time
      const dayOfWeek = appointment.appointmentDate.getDay();

      const coverageSchedule = await prisma.providerAvailability.findFirst({
        where: {
          providerId: coverageProviderId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (coverageSchedule) {
        const [scheduleStartHour, scheduleStartMin] = coverageSchedule.startTime.split(':').map(Number);
        const [scheduleEndHour, scheduleEndMin] = coverageSchedule.endTime.split(':').map(Number);
        const [apptStartHour, apptStartMin] = appointment.startTime.split(':').map(Number);
        const [apptEndHour, apptEndMin] = appointment.endTime.split(':').map(Number);

        const scheduleStart = scheduleStartHour * 60 + scheduleStartMin;
        const scheduleEnd = scheduleEndHour * 60 + scheduleEndMin;
        const apptStart = apptStartHour * 60 + apptStartMin;
        const apptEnd = apptEndHour * 60 + apptEndMin;

        if (apptStart >= scheduleStart && apptEnd <= scheduleEnd) {
          // Check for conflicts
          const hasConflict = await prisma.appointment.findFirst({
            where: {
              clinicianId: coverageProviderId,
              appointmentDate: appointment.appointmentDate,
              status: { in: ['SCHEDULED', 'CONFIRMED'] },
              OR: [
                {
                  startTime: { lte: appointment.startTime },
                  endTime: { gt: appointment.startTime },
                },
                {
                  startTime: { lt: appointment.endTime },
                  endTime: { gte: appointment.endTime },
                },
              ],
            },
          });

          if (!hasConflict) {
            // Reschedule to coverage provider
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: {
                clinicianId: coverageProviderId,
                notes: appointment.notes
                  ? `${appointment.notes}\n\nRescheduled to coverage provider due to time-off.`
                  : 'Rescheduled to coverage provider due to time-off.',
                lastModifiedBy: coverageProviderId,
              },
            });

            rescheduledCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to reschedule appointment ${appointment.id}:`, error);
      // Continue with other appointments
    }
  }

  return rescheduledCount;
}

/**
 * Get time-off statistics
 */
export async function getTimeOffStats(providerId?: string) {
  const where: any = providerId ? { providerId } : {};

  const [total, pending, approved, denied, byReason] = await Promise.all([
    prisma.timeOffRequest.count({ where }),
    prisma.timeOffRequest.count({ where: { ...where, status: 'PENDING' } }),
    prisma.timeOffRequest.count({ where: { ...where, status: 'APPROVED' } }),
    prisma.timeOffRequest.count({ where: { ...where, status: 'DENIED' } }),
    prisma.timeOffRequest.groupBy({
      by: ['reason'],
      _count: { id: true },
      where,
    }),
  ]);

  return {
    total,
    pending,
    approved,
    denied,
    byReason: byReason.reduce((acc, item) => {
      acc[item.reason] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
