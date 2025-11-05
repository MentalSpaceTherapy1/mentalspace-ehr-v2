import prisma from './database';
import type { GroupMember, GroupAttendance } from '@prisma/client';
import { updateGroupEnrollmentCount } from './groupSession.service';

/**
 * Module 3 Phase 2.1: Group Member Service
 *
 * Manages group membership, screening, and attendance tracking
 */

export interface EnrollMemberRequest {
  groupId: string;
  clientId: string;
  screenedBy?: string;
  screeningDate?: Date;
  screeningNotes?: string;
  approved?: boolean;
  status?: 'ACTIVE' | 'ON_HOLD' | 'EXITED';
}

export interface UpdateMemberRequest {
  status?: 'ACTIVE' | 'ON_HOLD' | 'EXITED';
  exitDate?: Date;
  exitReason?: string;
  screenedBy?: string;
  screeningDate?: Date;
  screeningNotes?: string;
  approved?: boolean;
}

export interface MarkAttendanceRequest {
  groupMemberId: string;
  appointmentId: string;
  attended: boolean;
  checkedInAt?: Date;
  notes?: string;
}

export interface BatchAttendanceRequest {
  appointmentId: string;
  attendance: Array<{
    groupMemberId: string;
    attended: boolean;
    checkedInAt?: Date;
    notes?: string;
  }>;
}

export interface GroupMemberFilters {
  groupId?: string;
  status?: string;
  search?: string;
}

/**
 * Enroll a member in a group
 */
export async function enrollMember(data: EnrollMemberRequest): Promise<GroupMember> {
  // Validate group exists
  const group = await prisma.groupSession.findUnique({
    where: { id: data.groupId },
    include: {
      members: {
        where: { status: 'ACTIVE' },
      },
    },
  });

  if (!group) {
    throw new Error('Group session not found');
  }

  // Check if group is at capacity
  if (group.members.length >= group.maxCapacity) {
    throw new Error('Group is at maximum capacity');
  }

  // Check if group is closed
  if (group.status === 'CLOSED' || group.status === 'ARCHIVED') {
    throw new Error('Group is not accepting new members');
  }

  // Validate client exists
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Check if client is already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_clientId: {
        groupId: data.groupId,
        clientId: data.clientId,
      },
    },
  });

  if (existingMember && existingMember.status !== 'EXITED') {
    throw new Error('Client is already a member of this group');
  }

  // Check screening requirements
  if (group.requiresScreening && !data.approved) {
    if (!data.screenedBy || !data.screeningDate) {
      throw new Error('Screening is required for this group');
    }
  }

  // Validate screener if provided
  if (data.screenedBy) {
    const screener = await prisma.user.findUnique({
      where: { id: data.screenedBy },
    });

    if (!screener) {
      throw new Error('Screener not found');
    }
  }

  const member = await prisma.groupMember.create({
    data: {
      groupId: data.groupId,
      clientId: data.clientId,
      screenedBy: data.screenedBy,
      screeningDate: data.screeningDate,
      screeningNotes: data.screeningNotes,
      approved: data.approved ?? false,
      status: data.status ?? 'ACTIVE',
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
      screener: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      group: {
        select: {
          id: true,
          groupName: true,
          facilitatorId: true,
        },
      },
    },
  });

  // Update group enrollment count
  await updateGroupEnrollmentCount(data.groupId);

  return member;
}

/**
 * Update a group member
 */
export async function updateMember(
  id: string,
  data: UpdateMemberRequest
): Promise<GroupMember> {
  const member = await prisma.groupMember.findUnique({
    where: { id },
    include: { group: true },
  });

  if (!member) {
    throw new Error('Group member not found');
  }

  // Validate screener if provided
  if (data.screenedBy) {
    const screener = await prisma.user.findUnique({
      where: { id: data.screenedBy },
    });

    if (!screener) {
      throw new Error('Screener not found');
    }
  }

  // If exiting member, validate exit data
  if (data.status === 'EXITED' && !data.exitDate) {
    data.exitDate = new Date();
  }

  const updatedMember = await prisma.groupMember.update({
    where: { id },
    data,
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
      group: {
        select: {
          id: true,
          groupName: true,
          facilitatorId: true,
        },
      },
    },
  });

  // Update group enrollment count if status changed
  if (data.status && data.status !== member.status) {
    await updateGroupEnrollmentCount(member.groupId);
  }

  return updatedMember;
}

/**
 * Remove a member from a group (exit)
 */
export async function removeMember(
  id: string,
  exitReason?: string
): Promise<GroupMember> {
  const member = await prisma.groupMember.findUnique({
    where: { id },
  });

  if (!member) {
    throw new Error('Group member not found');
  }

  const updatedMember = await prisma.groupMember.update({
    where: { id },
    data: {
      status: 'EXITED',
      exitDate: new Date(),
      exitReason,
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
      group: {
        select: {
          id: true,
          groupName: true,
          facilitatorId: true,
        },
      },
    },
  });

  // Update group enrollment count
  await updateGroupEnrollmentCount(member.groupId);

  return updatedMember;
}

/**
 * Delete a group member (hard delete)
 */
export async function deleteMember(id: string): Promise<GroupMember> {
  const member = await prisma.groupMember.findUnique({
    where: { id },
  });

  if (!member) {
    throw new Error('Group member not found');
  }

  const deletedMember = await prisma.groupMember.delete({
    where: { id },
  });

  // Update group enrollment count
  await updateGroupEnrollmentCount(member.groupId);

  return deletedMember;
}

/**
 * Get member by ID
 */
export async function getMemberById(id: string): Promise<GroupMember | null> {
  return await prisma.groupMember.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryPhone: true,
          medicalRecordNumber: true,
          dateOfBirth: true,
        },
      },
      screener: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      group: {
        include: {
          facilitator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
          appointmentType: true,
        },
      },
      attendance: {
        include: {
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

/**
 * Get all members with optional filters
 */
export async function getAllMembers(
  filters?: GroupMemberFilters
): Promise<GroupMember[]> {
  const where: any = {};

  if (filters?.groupId) {
    where.groupId = filters.groupId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    where.client = {
      OR: [
        {
          firstName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          medicalRecordNumber: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  return await prisma.groupMember.findMany({
    where,
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
      group: {
        select: {
          id: true,
          groupName: true,
          groupType: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { enrollmentDate: 'asc' },
    ],
  });
}

/**
 * Get members for a specific group
 */
export async function getMembersByGroup(groupId: string): Promise<GroupMember[]> {
  return await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryPhone: true,
          medicalRecordNumber: true,
          dateOfBirth: true,
        },
      },
      screener: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      attendance: {
        include: {
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { enrollmentDate: 'asc' },
    ],
  });
}

/**
 * Mark attendance for a member at a session
 */
export async function markAttendance(
  data: MarkAttendanceRequest
): Promise<GroupAttendance> {
  // Validate member exists
  const member = await prisma.groupMember.findUnique({
    where: { id: data.groupMemberId },
  });

  if (!member) {
    throw new Error('Group member not found');
  }

  // Validate appointment exists and is a group session
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (!appointment.isGroupSession) {
    throw new Error('Appointment is not a group session');
  }

  // Check if attendance already exists
  const existingAttendance = await prisma.groupAttendance.findUnique({
    where: {
      groupMemberId_appointmentId: {
        groupMemberId: data.groupMemberId,
        appointmentId: data.appointmentId,
      },
    },
  });

  if (existingAttendance) {
    // Update existing attendance
    return await prisma.groupAttendance.update({
      where: { id: existingAttendance.id },
      data: {
        attended: data.attended,
        checkedInAt: data.checkedInAt,
        notes: data.notes,
      },
      include: {
        member: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            startTime: true,
            status: true,
          },
        },
      },
    });
  } else {
    // Create new attendance record
    const attendance = await prisma.groupAttendance.create({
      data: {
        groupMemberId: data.groupMemberId,
        appointmentId: data.appointmentId,
        attended: data.attended,
        checkedInAt: data.checkedInAt,
        notes: data.notes,
      },
      include: {
        member: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            startTime: true,
            status: true,
          },
        },
      },
    });

    // Update member attendance counts
    const attendanceCount = member.attendanceCount + (data.attended ? 1 : 0);
    const absenceCount = member.absenceCount + (data.attended ? 0 : 1);
    const lastAttendance = data.attended ? new Date() : member.lastAttendance;

    await prisma.groupMember.update({
      where: { id: data.groupMemberId },
      data: {
        attendanceCount,
        absenceCount,
        lastAttendance,
      },
    });

    return attendance;
  }
}

/**
 * Mark attendance for multiple members at once (batch)
 */
export async function markBatchAttendance(
  data: BatchAttendanceRequest
): Promise<GroupAttendance[]> {
  const results: GroupAttendance[] = [];

  for (const attendance of data.attendance) {
    const result = await markAttendance({
      groupMemberId: attendance.groupMemberId,
      appointmentId: data.appointmentId,
      attended: attendance.attended,
      checkedInAt: attendance.checkedInAt,
      notes: attendance.notes,
    });
    results.push(result);
  }

  return results;
}

/**
 * Get attendance for a specific appointment
 */
export async function getAttendanceByAppointment(
  appointmentId: string
): Promise<GroupAttendance[]> {
  return await prisma.groupAttendance.findMany({
    where: { appointmentId },
    include: {
      member: {
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
      },
    },
    orderBy: {
      member: {
        client: {
          lastName: 'asc',
        },
      },
    },
  });
}

/**
 * Get attendance history for a member
 */
export async function getAttendanceByMember(
  groupMemberId: string
): Promise<GroupAttendance[]> {
  return await prisma.groupAttendance.findMany({
    where: { groupMemberId },
    include: {
      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
    },
    orderBy: {
      appointment: {
        appointmentDate: 'desc',
      },
    },
  });
}

/**
 * Get member statistics
 */
export async function getMemberStats(groupId?: string) {
  const where = groupId ? { groupId } : {};

  const [total, active, byStatus] = await Promise.all([
    prisma.groupMember.count({ where }),
    prisma.groupMember.count({ where: { ...where, status: 'ACTIVE' } }),
    prisma.groupMember.groupBy({
      by: ['status'],
      _count: { id: true },
      where,
    }),
  ]);

  // Calculate average attendance rate
  const members = await prisma.groupMember.findMany({
    where: { ...where, status: 'ACTIVE' },
    select: {
      attendanceCount: true,
      absenceCount: true,
    },
  });

  const totalSessions = members.reduce(
    (sum, m) => sum + m.attendanceCount + m.absenceCount,
    0
  );
  const totalAttended = members.reduce((sum, m) => sum + m.attendanceCount, 0);
  const averageAttendanceRate =
    totalSessions > 0 ? (totalAttended / totalSessions) * 100 : 0;

  return {
    total,
    active,
    averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
