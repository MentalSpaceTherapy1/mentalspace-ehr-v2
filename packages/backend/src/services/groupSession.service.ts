import prisma from './database';
import type { GroupSession, Appointment } from '@prisma/client';
import { addDays, addWeeks, format, parseISO } from 'date-fns';

/**
 * Module 3 Phase 2.1: Group Session Service
 *
 * Manages group therapy sessions with recurring appointment generation
 */

export interface CreateGroupSessionRequest {
  groupName: string;
  description?: string;
  facilitatorId: string;
  coFacilitatorId?: string;
  maxCapacity: number;
  groupType: 'THERAPY' | 'SUPPORT' | 'EDUCATION' | 'SKILLS';
  isOpenEnrollment?: boolean;
  requiresScreening?: boolean;
  isTelehealthAvailable?: boolean;
  appointmentTypeId: string;
  recurringPattern?: 'WEEKLY' | 'BIWEEKLY' | null;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  startTime?: string; // HH:mm format
  duration?: number; // minutes
  billingType: 'PER_MEMBER' | 'FLAT_RATE';
  ratePerMember?: number;
  status?: 'ACTIVE' | 'FULL' | 'CLOSED' | 'ARCHIVED';
  startDate: Date;
  endDate?: Date;
}

export interface UpdateGroupSessionRequest {
  groupName?: string;
  description?: string;
  facilitatorId?: string;
  coFacilitatorId?: string;
  maxCapacity?: number;
  groupType?: 'THERAPY' | 'SUPPORT' | 'EDUCATION' | 'SKILLS';
  isOpenEnrollment?: boolean;
  requiresScreening?: boolean;
  isTelehealthAvailable?: boolean;
  appointmentTypeId?: string;
  recurringPattern?: 'WEEKLY' | 'BIWEEKLY' | null;
  dayOfWeek?: number;
  startTime?: string;
  duration?: number;
  billingType?: 'PER_MEMBER' | 'FLAT_RATE';
  ratePerMember?: number;
  status?: 'ACTIVE' | 'FULL' | 'CLOSED' | 'ARCHIVED';
  startDate?: Date;
  endDate?: Date;
}

export interface GroupSessionFilters {
  facilitatorId?: string;
  groupType?: string;
  status?: string;
  search?: string;
  includeArchived?: boolean;
}

export interface GenerateRecurringSessionsRequest {
  groupSessionId: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

/**
 * Create a new group session
 */
export async function createGroupSession(
  data: CreateGroupSessionRequest
): Promise<GroupSession> {
  // Validate facilitator exists
  const facilitator = await prisma.user.findUnique({
    where: { id: data.facilitatorId },
  });

  if (!facilitator) {
    throw new Error('Facilitator not found');
  }

  // Validate co-facilitator if provided
  if (data.coFacilitatorId) {
    const coFacilitator = await prisma.user.findUnique({
      where: { id: data.coFacilitatorId },
    });

    if (!coFacilitator) {
      throw new Error('Co-facilitator not found');
    }
  }

  // Validate appointment type exists
  const appointmentType = await prisma.appointmentType.findUnique({
    where: { id: data.appointmentTypeId },
  });

  if (!appointmentType) {
    throw new Error('Appointment type not found');
  }

  // Check for duplicate group name
  const existing = await prisma.groupSession.findFirst({
    where: {
      groupName: data.groupName,
      status: { in: ['ACTIVE', 'FULL', 'CLOSED'] },
    },
  });

  if (existing) {
    throw new Error(`Group session with name "${data.groupName}" already exists`);
  }

  return await prisma.groupSession.create({
    data: {
      groupName: data.groupName,
      description: data.description,
      facilitatorId: data.facilitatorId,
      coFacilitatorId: data.coFacilitatorId,
      maxCapacity: data.maxCapacity,
      groupType: data.groupType,
      isOpenEnrollment: data.isOpenEnrollment ?? false,
      requiresScreening: data.requiresScreening ?? true,
      isTelehealthAvailable: data.isTelehealthAvailable ?? false,
      appointmentTypeId: data.appointmentTypeId,
      recurringPattern: data.recurringPattern,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      duration: data.duration,
      billingType: data.billingType,
      ratePerMember: data.ratePerMember,
      status: data.status ?? 'ACTIVE',
      startDate: data.startDate,
      endDate: data.endDate,
    },
    include: {
      facilitator: true,
      coFacilitator: true,
      appointmentType: true,
      members: {
        include: {
          client: true,
        },
      },
    },
  });
}

/**
 * Update an existing group session
 */
export async function updateGroupSession(
  id: string,
  data: UpdateGroupSessionRequest
): Promise<GroupSession> {
  // Validate facilitator if provided
  if (data.facilitatorId) {
    const facilitator = await prisma.user.findUnique({
      where: { id: data.facilitatorId },
    });

    if (!facilitator) {
      throw new Error('Facilitator not found');
    }
  }

  // Validate co-facilitator if provided
  if (data.coFacilitatorId) {
    const coFacilitator = await prisma.user.findUnique({
      where: { id: data.coFacilitatorId },
    });

    if (!coFacilitator) {
      throw new Error('Co-facilitator not found');
    }
  }

  // Check for duplicate group name if being changed
  if (data.groupName) {
    const existing = await prisma.groupSession.findFirst({
      where: {
        groupName: data.groupName,
        status: { in: ['ACTIVE', 'FULL', 'CLOSED'] },
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error(`Group session with name "${data.groupName}" already exists`);
    }
  }

  // If maxCapacity is being reduced, check current enrollment
  if (data.maxCapacity) {
    const currentGroup = await prisma.groupSession.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (currentGroup && currentGroup.members.length > data.maxCapacity) {
      throw new Error(
        `Cannot reduce capacity below current enrollment (${currentGroup.members.length})`
      );
    }
  }

  return await prisma.groupSession.update({
    where: { id },
    data,
    include: {
      facilitator: true,
      coFacilitator: true,
      appointmentType: true,
      members: {
        include: {
          client: true,
        },
      },
    },
  });
}

/**
 * Delete a group session (soft delete by setting status to ARCHIVED)
 */
export async function deleteGroupSession(id: string): Promise<GroupSession> {
  // Check if group has active members
  const activeMembersCount = await prisma.groupMember.count({
    where: {
      groupId: id,
      status: 'ACTIVE',
    },
  });

  if (activeMembersCount > 0) {
    // Soft delete - set to archived
    return await prisma.groupSession.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: {
        facilitator: true,
        coFacilitator: true,
        appointmentType: true,
      },
    });
  } else {
    // Hard delete if no active members
    return await prisma.groupSession.delete({
      where: { id },
      include: {
        facilitator: true,
        coFacilitator: true,
        appointmentType: true,
      },
    });
  }
}

/**
 * Get group session by ID
 */
export async function getGroupSessionById(id: string): Promise<GroupSession | null> {
  return await prisma.groupSession.findUnique({
    where: { id },
    include: {
      facilitator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      coFacilitator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
      appointmentType: true,
      members: {
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
          screener: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          enrollmentDate: 'asc',
        },
      },
      sessions: {
        orderBy: {
          appointmentDate: 'desc',
        },
        take: 10,
      },
      _count: {
        select: {
          members: true,
          sessions: true,
        },
      },
    },
  });
}

/**
 * Get all group sessions with optional filters
 */
export async function getAllGroupSessions(
  filters?: GroupSessionFilters
): Promise<GroupSession[]> {
  const where: any = {};

  if (filters?.facilitatorId) {
    where.OR = [
      { facilitatorId: filters.facilitatorId },
      { coFacilitatorId: filters.facilitatorId },
    ];
  }

  if (filters?.groupType) {
    where.groupType = filters.groupType;
  }

  if (filters?.status) {
    where.status = filters.status;
  } else if (!filters?.includeArchived) {
    where.status = { not: 'ARCHIVED' };
  }

  if (filters?.search) {
    where.OR = [
      {
        groupName: {
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

  return await prisma.groupSession.findMany({
    where,
    include: {
      facilitator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
      coFacilitator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
      appointmentType: true,
      _count: {
        select: {
          members: true,
          sessions: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { groupName: 'asc' },
    ],
  });
}

/**
 * Get active group sessions
 */
export async function getActiveGroupSessions(): Promise<GroupSession[]> {
  return await prisma.groupSession.findMany({
    where: { status: 'ACTIVE' },
    include: {
      facilitator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
      coFacilitator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
      appointmentType: true,
      _count: {
        select: {
          members: true,
          sessions: true,
        },
      },
    },
    orderBy: { groupName: 'asc' },
  });
}

/**
 * Generate recurring appointments for a group session
 */
export async function generateRecurringSessions(
  request: GenerateRecurringSessionsRequest
): Promise<Appointment[]> {
  const groupSession = await prisma.groupSession.findUnique({
    where: { id: request.groupSessionId },
    include: {
      appointmentType: true,
    },
  });

  if (!groupSession) {
    throw new Error('Group session not found');
  }

  if (!groupSession.recurringPattern) {
    throw new Error('Group session does not have a recurring pattern configured');
  }

  if (!groupSession.dayOfWeek || !groupSession.startTime || !groupSession.duration) {
    throw new Error('Group session missing required scheduling information');
  }

  const appointments: Appointment[] = [];
  let currentDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);

  // Find the first occurrence of the target day of week
  while (currentDate.getDay() !== groupSession.dayOfWeek && currentDate <= endDate) {
    currentDate = addDays(currentDate, 1);
  }

  // Generate appointments based on recurring pattern
  while (currentDate <= endDate) {
    // Calculate end time
    const [startHour, startMinute] = groupSession.startTime.split(':').map(Number);
    const endHour = Math.floor((startHour * 60 + startMinute + groupSession.duration) / 60);
    const endMinute = (startHour * 60 + startMinute + groupSession.duration) % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Check if appointment already exists for this date
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        groupSessionId: request.groupSessionId,
        appointmentDate: currentDate,
      },
    });

    if (!existingAppointment) {
      // Create the appointment (without client assignment - it's a group session)
      const appointment = await prisma.appointment.create({
        data: {
          clientId: groupSession.facilitatorId, // Use facilitator as placeholder
          clinicianId: groupSession.facilitatorId,
          appointmentDate: currentDate,
          startTime: groupSession.startTime,
          endTime: endTime,
          duration: groupSession.duration,
          appointmentType: groupSession.appointmentType.typeName,
          appointmentTypeId: groupSession.appointmentTypeId,
          serviceLocation: 'In-Office',
          status: 'SCHEDULED',
          statusUpdatedBy: request.createdBy,
          createdBy: request.createdBy,
          lastModifiedBy: request.createdBy,
          isGroupSession: true,
          groupSessionId: request.groupSessionId,
        },
      });

      appointments.push(appointment);
    }

    // Move to next occurrence
    if (groupSession.recurringPattern === 'WEEKLY') {
      currentDate = addWeeks(currentDate, 1);
    } else if (groupSession.recurringPattern === 'BIWEEKLY') {
      currentDate = addWeeks(currentDate, 2);
    }
  }

  return appointments;
}

/**
 * Get group session statistics
 */
export async function getGroupSessionStats() {
  const [total, active, byType, byStatus] = await Promise.all([
    prisma.groupSession.count(),
    prisma.groupSession.count({ where: { status: 'ACTIVE' } }),
    prisma.groupSession.groupBy({
      by: ['groupType'],
      _count: { id: true },
      where: { status: { not: 'ARCHIVED' } },
    }),
    prisma.groupSession.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  // Calculate total enrollment across all groups
  const totalEnrollment = await prisma.groupMember.count({
    where: { status: 'ACTIVE' },
  });

  return {
    total,
    active,
    totalEnrollment,
    byType: byType.reduce((acc, item) => {
      acc[item.groupType] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Update group enrollment count
 */
export async function updateGroupEnrollmentCount(groupId: string): Promise<void> {
  const activeMembers = await prisma.groupMember.count({
    where: {
      groupId,
      status: 'ACTIVE',
    },
  });

  const group = await prisma.groupSession.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new Error('Group session not found');
  }

  // Update enrollment count and status
  let status = group.status;
  if (activeMembers >= group.maxCapacity) {
    status = 'FULL';
  } else if (status === 'FULL' && activeMembers < group.maxCapacity) {
    status = 'ACTIVE';
  }

  await prisma.groupSession.update({
    where: { id: groupId },
    data: {
      currentEnrollment: activeMembers,
      status,
    },
  });
}
