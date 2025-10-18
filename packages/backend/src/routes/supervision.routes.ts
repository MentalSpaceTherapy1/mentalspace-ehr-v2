import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// SUPERVISION SESSIONS
// ============================================================================

/**
 * GET /api/v1/supervision/sessions
 * Get all supervision sessions (filtered by role)
 * - Supervisors see sessions they conducted
 * - Supervisees see their own sessions
 * - Admins see all sessions
 */
router.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    let sessions;

    if (user?.roles.includes('ADMINISTRATOR')) {
      // Admins see all sessions
      sessions = await prisma.supervisionSession.findMany({
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
          supervisee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { sessionDate: 'desc' },
      });
    } else if (user?.roles.includes('SUPERVISOR')) {
      // Supervisors see sessions they conducted
      sessions = await prisma.supervisionSession.findMany({
        where: { supervisorId: userId },
        include: {
          supervisee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { sessionDate: 'desc' },
      });
    } else {
      // Supervisees see their own sessions
      sessions = await prisma.supervisionSession.findMany({
        where: { superviseeId: userId },
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { sessionDate: 'desc' },
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching supervision sessions:', error);
    res.status(500).json({ error: 'Failed to fetch supervision sessions' });
  }
});

/**
 * GET /api/v1/supervision/sessions/:id
 * Get a specific supervision session
 */
router.get('/sessions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.supervisionSession.findUnique({
      where: { id },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            credentials: true,
          },
        },
        supervisee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            credentials: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Supervision session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching supervision session:', error);
    res.status(500).json({ error: 'Failed to fetch supervision session' });
  }
});

/**
 * POST /api/v1/supervision/sessions
 * Create a new supervision session
 */
router.post('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      superviseeId,
      sessionDate,
      sessionStartTime,
      sessionEndTime,
      sessionDuration,
      sessionType,
      sessionFormat,
      casesDiscussedJson,
      topicsCovered,
      skillsDeveloped,
      feedbackProvided,
      areasOfStrength,
      areasForImprovement,
      actionItemsJson,
      nextSessionScheduled,
      nextSessionDate,
      hoursEarned,
      hourType,
      superviseeReflection,
      supervisorSignature,
      superviseeSignature,
    } = req.body;

    const session = await prisma.supervisionSession.create({
      data: {
        supervisorId: userId,
        superviseeId,
        sessionDate: new Date(sessionDate),
        sessionStartTime,
        sessionEndTime,
        sessionDuration,
        sessionType,
        sessionFormat,
        casesDiscussedJson: casesDiscussedJson || [],
        topicsCovered: topicsCovered || [],
        skillsDeveloped: skillsDeveloped || [],
        feedbackProvided,
        areasOfStrength: areasOfStrength || [],
        areasForImprovement: areasForImprovement || [],
        actionItemsJson: actionItemsJson || [],
        nextSessionScheduled: nextSessionScheduled || false,
        nextSessionDate: nextSessionDate ? new Date(nextSessionDate) : null,
        hoursEarned: parseFloat(hoursEarned),
        hourType,
        superviseeReflection,
        supervisorSignature,
        supervisorSignDate: new Date(),
        superviseeSignature,
        superviseeSignDate: new Date(),
        notesSigned: true,
        notesSignedAt: new Date(),
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        supervisee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    // Also create a supervision hours log entry
    await prisma.supervisionHoursLog.create({
      data: {
        superviseeId,
        supervisorId: userId,
        hourDate: new Date(sessionDate),
        hourType,
        hoursEarned: parseFloat(hoursEarned),
        sessionDescription: `${sessionType} supervision session`,
        topicsCovered: topicsCovered || [],
        verifiedBySupervisor: true,
        supervisorVerificationDate: new Date(),
        supervisorSignature,
        appliesTo: 'Clinical Licensure',
        status: 'Verified',
        createdBy: userId,
      },
    });

    // Update supervisee's completed supervision hours
    const supervisee = await prisma.user.findUnique({
      where: { id: superviseeId },
      select: { completedSupervisionHours: true },
    });

    await prisma.user.update({
      where: { id: superviseeId },
      data: {
        completedSupervisionHours: (supervisee?.completedSupervisionHours || 0) + parseFloat(hoursEarned),
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating supervision session:', error);
    res.status(500).json({ error: 'Failed to create supervision session' });
  }
});

/**
 * PUT /api/v1/supervision/sessions/:id
 * Update a supervision session
 */
router.put('/sessions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const session = await prisma.supervisionSession.update({
      where: { id },
      data: {
        ...updateData,
        sessionDate: updateData.sessionDate ? new Date(updateData.sessionDate) : undefined,
        nextSessionDate: updateData.nextSessionDate ? new Date(updateData.nextSessionDate) : undefined,
        hoursEarned: updateData.hoursEarned ? parseFloat(updateData.hoursEarned) : undefined,
      },
      include: {
        supervisor: true,
        supervisee: true,
      },
    });

    res.json(session);
  } catch (error) {
    console.error('Error updating supervision session:', error);
    res.status(500).json({ error: 'Failed to update supervision session' });
  }
});

// ============================================================================
// SUPERVISION HOURS TRACKING
// ============================================================================

/**
 * GET /api/v1/supervision/hours/:superviseeId
 * Get supervision hours summary for a supervisee
 */
router.get('/hours/:superviseeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { superviseeId } = req.params;

    const supervisee = await prisma.user.findUnique({
      where: { id: superviseeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        requiredSupervisionHours: true,
        completedSupervisionHours: true,
        supervisionStartDate: true,
        supervisionEndDate: true,
      },
    });

    if (!supervisee) {
      return res.status(404).json({ error: 'Supervisee not found' });
    }

    // Get all hours logs
    const hoursLogs = await prisma.supervisionHoursLog.findMany({
      where: { superviseeId },
      orderBy: { hourDate: 'desc' },
    });

    // Calculate breakdown by type
    const directIndividual = hoursLogs
      .filter((log) => log.hourType === 'Direct Individual')
      .reduce((sum, log) => sum + log.hoursEarned, 0);

    const directTriadic = hoursLogs
      .filter((log) => log.hourType === 'Direct Triadic')
      .reduce((sum, log) => sum + log.hoursEarned, 0);

    const group = hoursLogs
      .filter((log) => log.hourType === 'Group')
      .reduce((sum, log) => sum + log.hoursEarned, 0);

    const observation = hoursLogs
      .filter((log) => log.hourType === 'Observation')
      .reduce((sum, log) => sum + log.hoursEarned, 0);

    const other = hoursLogs
      .filter((log) => !['Direct Individual', 'Direct Triadic', 'Group', 'Observation'].includes(log.hourType))
      .reduce((sum, log) => sum + log.hoursEarned, 0);

    const totalCompleted = supervisee.completedSupervisionHours || 0;
    const totalRequired = supervisee.requiredSupervisionHours || 0;
    const totalRemaining = Math.max(0, totalRequired - totalCompleted);
    const percentComplete = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;

    // Get recent sessions
    const recentSessions = await prisma.supervisionSession.findMany({
      where: { superviseeId },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
      take: 10,
    });

    const summary = {
      supervisee: {
        id: supervisee.id,
        name: `${supervisee.firstName} ${supervisee.lastName}`,
        supervisionStartDate: supervisee.supervisionStartDate,
        supervisionEndDate: supervisee.supervisionEndDate,
      },
      totalHoursRequired: totalRequired,
      totalHoursCompleted: totalCompleted,
      totalHoursRemaining: totalRemaining,
      percentComplete: Math.round(percentComplete),
      breakdownByType: {
        directIndividual: {
          completed: directIndividual,
          required: 0, // These would come from supervision requirements
          remaining: 0,
        },
        directTriadic: {
          completed: directTriadic,
          required: 0,
          remaining: 0,
        },
        group: {
          completed: group,
          required: 0,
          remaining: 0,
        },
        observation: {
          completed: observation,
          required: 0,
          remaining: 0,
        },
        other: {
          completed: other,
          required: 0,
          remaining: 0,
        },
      },
      lastSupervisionDate: recentSessions[0]?.sessionDate || null,
      nextSupervisionDate: recentSessions[0]?.nextSessionDate || null,
      recentSessions: recentSessions.slice(0, 5),
      onTrack: true, // Would calculate based on dates and required hours
      hoursLogs,
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching supervision hours summary:', error);
    res.status(500).json({ error: 'Failed to fetch supervision hours summary' });
  }
});

/**
 * GET /api/v1/supervision/hours
 * Get all supervision hours logs (filtered by role)
 */
router.get('/hours', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    let hoursLogs;

    if (user?.roles.includes('ADMINISTRATOR')) {
      hoursLogs = await prisma.supervisionHoursLog.findMany({
        include: {
          supervisee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { hourDate: 'desc' },
      });
    } else if (user?.roles.includes('SUPERVISOR')) {
      hoursLogs = await prisma.supervisionHoursLog.findMany({
        where: { supervisorId: userId },
        include: {
          supervisee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { hourDate: 'desc' },
      });
    } else {
      hoursLogs = await prisma.supervisionHoursLog.findMany({
        where: { superviseeId: userId },
        orderBy: { hourDate: 'desc' },
      });
    }

    res.json(hoursLogs);
  } catch (error) {
    console.error('Error fetching supervision hours logs:', error);
    res.status(500).json({ error: 'Failed to fetch supervision hours logs' });
  }
});

/**
 * POST /api/v1/supervision/hours
 * Create a supervision hours log entry
 */
router.post('/hours', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      superviseeId,
      supervisorId,
      hourDate,
      hourType,
      hoursEarned,
      sessionDescription,
      topicsCovered,
      verifiedBySupervisor,
      supervisorSignature,
      appliesTo,
    } = req.body;

    const hoursLog = await prisma.supervisionHoursLog.create({
      data: {
        superviseeId,
        supervisorId: supervisorId || userId,
        hourDate: new Date(hourDate),
        hourType,
        hoursEarned: parseFloat(hoursEarned),
        sessionDescription,
        topicsCovered: topicsCovered || [],
        verifiedBySupervisor: verifiedBySupervisor || false,
        supervisorVerificationDate: verifiedBySupervisor ? new Date() : null,
        supervisorSignature: supervisorSignature || null,
        appliesTo: appliesTo || 'Clinical Licensure',
        status: verifiedBySupervisor ? 'Verified' : 'Pending',
        createdBy: userId,
      },
      include: {
        supervisee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update supervisee's completed hours if verified
    if (verifiedBySupervisor) {
      const supervisee = await prisma.user.findUnique({
        where: { id: superviseeId },
        select: { completedSupervisionHours: true },
      });

      await prisma.user.update({
        where: { id: superviseeId },
        data: {
          completedSupervisionHours: (supervisee?.completedSupervisionHours || 0) + parseFloat(hoursEarned),
        },
      });
    }

    res.status(201).json(hoursLog);
  } catch (error) {
    console.error('Error creating supervision hours log:', error);
    res.status(500).json({ error: 'Failed to create supervision hours log' });
  }
});

/**
 * PUT /api/v1/supervision/hours/:id/verify
 * Verify a supervision hours log entry
 */
router.put('/hours/:id/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const { supervisorSignature } = req.body;

    const hoursLog = await prisma.supervisionHoursLog.findUnique({
      where: { id },
    });

    if (!hoursLog) {
      return res.status(404).json({ error: 'Hours log not found' });
    }

    const updatedLog = await prisma.supervisionHoursLog.update({
      where: { id },
      data: {
        verifiedBySupervisor: true,
        supervisorVerificationDate: new Date(),
        supervisorSignature,
        status: 'Verified',
      },
    });

    // Update supervisee's completed hours
    const supervisee = await prisma.user.findUnique({
      where: { id: hoursLog.superviseeId },
      select: { completedSupervisionHours: true },
    });

    await prisma.user.update({
      where: { id: hoursLog.superviseeId },
      data: {
        completedSupervisionHours: (supervisee?.completedSupervisionHours || 0) + hoursLog.hoursEarned,
      },
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error verifying supervision hours:', error);
    res.status(500).json({ error: 'Failed to verify supervision hours' });
  }
});

// ============================================================================
// CO-SIGNING WORKFLOW
// ============================================================================

/**
 * GET /api/v1/supervision/cosign-queue
 * Get notes pending co-signature for a supervisor
 */
router.get('/cosign-queue', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get all supervisees for this supervisor
    const supervisees = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });

    const superviseeIds = supervisees.map((s) => s.id);

    // Get all notes requiring co-signature
    const notes = await prisma.clinicalNote.findMany({
      where: {
        clinicianId: { in: superviseeIds },
        requiresCosign: true,
        cosignedDate: null,
        status: { in: ['SIGNED', 'PENDING_COSIGN'] },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching co-sign queue:', error);
    res.status(500).json({ error: 'Failed to fetch co-sign queue' });
  }
});

/**
 * POST /api/v1/supervision/cosign/:noteId
 * Co-sign a clinical note
 */
router.post('/cosign/:noteId', authenticate, async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = (req as any).user.userId;
    const { supervisorComments, approved } = req.body;

    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      include: {
        clinician: {
          select: { supervisorId: true },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Verify this user is the supervisor
    if (note.clinician.supervisorId !== userId) {
      return res.status(403).json({ error: 'You are not the supervisor for this clinician' });
    }

    if (approved) {
      // Approve and co-sign
      const updatedNote = await prisma.clinicalNote.update({
        where: { id: noteId },
        data: {
          cosignedDate: new Date(),
          cosignedBy: userId,
          supervisorComments: supervisorComments || null,
          status: 'COSIGNED',
        },
        include: {
          clinician: true,
          client: true,
        },
      });

      res.json(updatedNote);
    } else {
      // Request revisions - send back to clinician
      const updatedNote = await prisma.clinicalNote.update({
        where: { id: noteId },
        data: {
          supervisorComments,
          status: 'DRAFT', // Send back to draft for revisions
        },
        include: {
          clinician: true,
          client: true,
        },
      });

      res.json(updatedNote);
    }
  } catch (error) {
    console.error('Error co-signing note:', error);
    res.status(500).json({ error: 'Failed to co-sign note' });
  }
});

/**
 * GET /api/v1/supervision/supervisees
 * Get all supervisees for the current supervisor
 */
router.get('/supervisees', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const supervisees = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        email: true,
        requiredSupervisionHours: true,
        completedSupervisionHours: true,
        supervisionStartDate: true,
        supervisionEndDate: true,
        isActive: true,
      },
    });

    res.json(supervisees);
  } catch (error) {
    console.error('Error fetching supervisees:', error);
    res.status(500).json({ error: 'Failed to fetch supervisees' });
  }
});

export default router;
