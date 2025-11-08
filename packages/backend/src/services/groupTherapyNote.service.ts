import prisma from './database';
import logger from '../utils/logger';

/**
 * Group Therapy Note Service
 * Module 4 Phase 2.4: Group Therapy Support
 *
 * Handles creation of group therapy notes with:
 * - Multiple client tracking
 * - Attendance recording
 * - Group progress tracking
 */

export interface CreateGroupTherapyNoteParams {
  groupId?: string; // Optional for ad-hoc groups
  appointmentId: string;
  facilitatorId: string;
  sessionDate: Date;
  duration?: number;

  // Group session details
  sessionTopic?: string;
  sessionObjectives?: string;
  interventionsUsed?: string;
  groupDynamics?: string;
  therapeuticFactors?: string;

  // Group-level progress
  progressTowardGoals?: string;
  challengesEncountered?: string;
  planForNextSession?: string;

  // Clinical content
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;

  // Attendance data - supports both formal groups and ad-hoc groups
  attendance: Array<{
    groupMemberId?: string; // For formal groups
    clientId?: string; // For ad-hoc groups
    attended: boolean;
    notes?: string;
  }>;
}

export interface UpdateAttendanceParams {
  noteId: string;
  attendance: Array<{
    groupMemberId: string;
    attended: boolean;
    notes?: string;
  }>;
}

/**
 * Create a group therapy session note with attendance tracking
 * Supports both formal groups (with groupId) and ad-hoc groups (appointment-based)
 */
export async function createGroupTherapyNote(params: CreateGroupTherapyNoteParams) {
  try {
    const isAdHocGroup = !params.groupId;

    logger.info('Creating group therapy note', {
      groupId: params.groupId || 'ad-hoc',
      appointmentId: params.appointmentId,
      isAdHocGroup,
    });

    // Get appointment details (always needed)
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.appointmentId },
      include: {
        client: true,
        appointmentClients: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    let groupSession = null;
    let totalMembers = 0;

    if (!isAdHocGroup) {
      // Formal group: Get group session details
      groupSession = await prisma.groupSession.findUnique({
        where: { id: params.groupId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: {
              client: true,
            },
          },
          facilitator: true,
        },
      });

      if (!groupSession) {
        throw new Error('Group session not found');
      }

      totalMembers = groupSession.members.length;
    } else {
      // Ad-hoc group: Use appointment clients
      totalMembers = appointment.appointmentClients?.length || 0;
    }

    // Build group note content
    const attendanceCount = params.attendance.filter(a => a.attended).length;
    const noteContent = {
      sessionTopic: params.sessionTopic || '',
      sessionObjectives: params.sessionObjectives || '',
      interventionsUsed: params.interventionsUsed || '',
      groupDynamics: params.groupDynamics || '',
      therapeuticFactors: params.therapeuticFactors || '',
      progressTowardGoals: params.progressTowardGoals || '',
      challengesEncountered: params.challengesEncountered || '',
      planForNextSession: params.planForNextSession || '',
      attendanceCount,
      totalMembers,
      isAdHocGroup,
      // Store attendance for ad-hoc groups
      ...(isAdHocGroup && { attendance: params.attendance }),
    };

    // Create clinical note for the group session
    const clinicalNote = await prisma.clinicalNote.create({
      data: {
        clientId: appointment.clientId, // Primary client for the appointment
        clinicianId: params.facilitatorId,
        appointmentId: params.appointmentId,
        noteType: 'GROUP_THERAPY',
        sessionDate: params.sessionDate,
        sessionStartTime: appointment.startTime || undefined,
        sessionDuration: params.duration || appointment.duration,

        // SOAP format for group therapy
        subjective: params.subjective || `Group therapy session: ${params.sessionTopic}`,
        objective: params.objective || `Attendance: ${noteContent.attendanceCount}/${noteContent.totalMembers} members present. Group dynamics: ${params.groupDynamics}`,
        assessment: params.assessment || params.progressTowardGoals || '',
        plan: params.plan || params.planForNextSession || '',

        // Group-specific content stored in aiPrompt field (repurposed for structured data)
        aiPrompt: JSON.stringify(noteContent),

        status: 'DRAFT',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        lastModifiedBy: params.facilitatorId,
      },
      include: {
        client: true,
        clinician: true,
        appointment: true,
      },
    });

    // Create attendance records (only for formal groups with GroupMembers)
    let attendanceRecords: any[] = [];

    if (!isAdHocGroup && groupSession) {
      attendanceRecords = await Promise.all(
        params.attendance.map(async (attendanceData) => {
          const member = groupSession.members.find(m => m.id === attendanceData.groupMemberId);

          if (!member) {
            logger.warn('Group member not found', { groupMemberId: attendanceData.groupMemberId });
            return null;
          }

          // Create or update attendance record
          const attendance = await prisma.groupAttendance.upsert({
            where: {
              groupMemberId_appointmentId: {
                groupMemberId: attendanceData.groupMemberId!,
                appointmentId: params.appointmentId,
              },
            },
            create: {
              groupMemberId: attendanceData.groupMemberId!,
              appointmentId: params.appointmentId,
              attended: attendanceData.attended,
              checkedInAt: attendanceData.attended ? new Date() : null,
              notes: attendanceData.notes || null,
            },
            update: {
              attended: attendanceData.attended,
              checkedInAt: attendanceData.attended ? new Date() : null,
              notes: attendanceData.notes || null,
            },
          });

          // Update group member statistics
          if (attendanceData.attended) {
            await prisma.groupMember.update({
              where: { id: attendanceData.groupMemberId! },
              data: {
                attendanceCount: { increment: 1 },
                lastAttendance: new Date(),
              },
            });
          } else {
            await prisma.groupMember.update({
              where: { id: attendanceData.groupMemberId! },
              data: {
                absenceCount: { increment: 1 },
              },
            });
          }

          return attendance;
        })
      );
    }

    logger.info('Group therapy note created successfully', {
      noteId: clinicalNote.id,
      isAdHocGroup,
      attendanceRecordsCreated: attendanceRecords.filter(r => r !== null).length,
    });

    return {
      note: clinicalNote,
      attendance: attendanceRecords.filter(r => r !== null),
    };
  } catch (error: any) {
    logger.error('Failed to create group therapy note', {
      error: error.message,
      groupId: params.groupId,
    });
    throw error;
  }
}

/**
 * Update attendance for a group therapy session
 */
export async function updateGroupAttendance(params: UpdateAttendanceParams) {
  try {
    logger.info('Updating group attendance', { noteId: params.noteId });

    // Get the note to find the appointment
    const note = await prisma.clinicalNote.findUnique({
      where: { id: params.noteId },
      include: {
        appointment: true,
      },
    });

    if (!note) {
      throw new Error('Clinical note not found');
    }

    if (note.noteType !== 'GROUP_THERAPY') {
      throw new Error('Note is not a group therapy note');
    }

    // Update attendance records
    const updatedRecords = await Promise.all(
      params.attendance.map(async (attendanceData) => {
        const attendance = await prisma.groupAttendance.upsert({
          where: {
            groupMemberId_appointmentId: {
              groupMemberId: attendanceData.groupMemberId,
              appointmentId: note.appointmentId,
            },
          },
          create: {
            groupMemberId: attendanceData.groupMemberId,
            appointmentId: note.appointmentId,
            attended: attendanceData.attended,
            checkedInAt: attendanceData.attended ? new Date() : null,
            notes: attendanceData.notes || null,
          },
          update: {
            attended: attendanceData.attended,
            checkedInAt: attendanceData.attended ? new Date() : null,
            notes: attendanceData.notes || null,
          },
        });

        return attendance;
      })
    );

    // Update note's objective field with new attendance count
    const attendedCount = params.attendance.filter(a => a.attended).length;
    const totalCount = params.attendance.length;

    await prisma.clinicalNote.update({
      where: { id: params.noteId },
      data: {
        objective: note.objective?.replace(
          /Attendance: \d+\/\d+/,
          `Attendance: ${attendedCount}/${totalCount}`
        ) || `Attendance: ${attendedCount}/${totalCount} members present`,
      },
    });

    logger.info('Group attendance updated successfully', {
      noteId: params.noteId,
      updatedRecords: updatedRecords.length,
    });

    return updatedRecords;
  } catch (error: any) {
    logger.error('Failed to update group attendance', {
      error: error.message,
      noteId: params.noteId,
    });
    throw error;
  }
}

/**
 * Get attendance records for a group therapy session
 */
export async function getGroupAttendance(appointmentId: string) {
  try {
    const attendance = await prisma.groupAttendance.findMany({
      where: { appointmentId },
      include: {
        member: {
          include: {
            client: true,
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

    return attendance;
  } catch (error: any) {
    logger.error('Failed to get group attendance', {
      error: error.message,
      appointmentId,
    });
    throw error;
  }
}

/**
 * Get group members for a session
 */
export async function getGroupMembers(groupId: string) {
  try {
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
      },
      include: {
        client: true,
      },
      orderBy: {
        client: {
          lastName: 'asc',
        },
      },
    });

    return members;
  } catch (error: any) {
    logger.error('Failed to get group members', {
      error: error.message,
      groupId,
    });
    throw error;
  }
}
