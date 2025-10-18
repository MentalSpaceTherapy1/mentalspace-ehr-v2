import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { sendEmail, EmailTemplates } from '../services/email.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/unlock-requests
 * Get all unlock requests (filtered by role)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    let unlockRequests;

    if (user?.roles.includes('ADMINISTRATOR')) {
      // Admins see all unlock requests
      unlockRequests = await prisma.clinicalNote.findMany({
        where: {
          unlockRequested: true,
          isLocked: true,
        },
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { unlockRequestDate: 'asc' },
      });
    } else if (user?.roles.includes('SUPERVISOR')) {
      // Supervisors see unlock requests from their supervisees
      const supervisees = await prisma.user.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      });

      const superviseeIds = supervisees.map((s) => s.id);

      unlockRequests = await prisma.clinicalNote.findMany({
        where: {
          unlockRequested: true,
          isLocked: true,
          clinicianId: { in: superviseeIds },
        },
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { unlockRequestDate: 'asc' },
      });
    } else {
      // Clinicians see their own unlock requests
      unlockRequests = await prisma.clinicalNote.findMany({
        where: {
          unlockRequested: true,
          isLocked: true,
          clinicianId: userId,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { unlockRequestDate: 'asc' },
      });
    }

    res.json(unlockRequests);
  } catch (error) {
    console.error('Error fetching unlock requests:', error);
    res.status(500).json({ error: 'Failed to fetch unlock requests' });
  }
});

/**
 * POST /api/v1/unlock-requests/:noteId/request
 * Request unlock for a specific note
 */
router.post('/:noteId/request', authenticate, async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = (req as any).user.userId;
    const { unlockReason } = req.body;

    if (!unlockReason || unlockReason.trim().length === 0) {
      return res.status(400).json({ error: 'Unlock reason is required' });
    }

    // Get the note
    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supervisorId: true,
            supervisor: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Verify the user is the note owner
    if (note.clinicianId !== userId) {
      return res.status(403).json({ error: 'You can only request unlock for your own notes' });
    }

    if (!note.isLocked) {
      return res.status(400).json({ error: 'Note is not locked' });
    }

    if (note.unlockRequested) {
      return res.status(400).json({ error: 'Unlock request already pending' });
    }

    // Update the note with unlock request
    const updatedNote = await prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        unlockRequested: true,
        unlockRequestDate: new Date(),
        unlockReason,
      },
    });

    // Determine who to notify (supervisor first, then admin if no supervisor)
    let notifyEmail: string;
    let notifyName: string;

    if (note.clinician.supervisor) {
      notifyEmail = note.clinician.supervisor.email;
      notifyName = `${note.clinician.supervisor.firstName} ${note.clinician.supervisor.lastName}`;
    } else {
      // Find an admin to notify
      const admin = await prisma.user.findFirst({
        where: {
          roles: { has: 'ADMINISTRATOR' },
          isActive: true,
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!admin) {
        return res.status(500).json({ error: 'No supervisor or administrator found to approve request' });
      }

      notifyEmail = admin.email;
      notifyName = `${admin.firstName} ${admin.lastName}`;
    }

    // Send notification email
    const approveLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unlock-requests`;

    await sendEmail({
      to: notifyEmail,
      ...EmailTemplates.unlockRequest(
        `${note.clinician.firstName} ${note.clinician.lastName}`,
        note.noteType,
        `${note.client.firstName} ${note.client.lastName}`,
        new Date(note.sessionDate),
        unlockReason,
        approveLink
      )
    });

    res.json({
      message: 'Unlock request submitted successfully',
      note: updatedNote,
      notifiedTo: notifyName,
    });
  } catch (error) {
    console.error('Error requesting unlock:', error);
    res.status(500).json({ error: 'Failed to request unlock' });
  }
});

/**
 * POST /api/v1/unlock-requests/:noteId/approve
 * Approve unlock request (supervisor/admin only)
 */
router.post('/:noteId/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        firstName: true,
        lastName: true,
      },
    });

    // Check if user is supervisor or admin
    if (!user?.roles.includes('SUPERVISOR') && !user?.roles.includes('ADMINISTRATOR')) {
      return res.status(403).json({ error: 'Only supervisors or administrators can approve unlock requests' });
    }

    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supervisorId: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.unlockRequested) {
      return res.status(400).json({ error: 'No unlock request pending for this note' });
    }

    // If user is supervisor, verify they supervise this clinician
    if (user.roles.includes('SUPERVISOR') && !user.roles.includes('ADMINISTRATOR')) {
      if (note.clinician.supervisorId !== userId) {
        return res.status(403).json({ error: 'You can only approve unlock requests for your supervisees' });
      }
    }

    // Unlock the note for 24 hours
    const unlockUntil = new Date();
    unlockUntil.setHours(unlockUntil.getHours() + 24);

    const updatedNote = await prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        isLocked: false,
        unlockRequested: false,
        unlockApprovedBy: userId,
        unlockApprovalDate: new Date(),
        unlockUntil: unlockUntil, // Note will re-lock in 24 hours if not completed
      },
    });

    // Send approval email to clinician
    const noteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/clients/${note.clientId}/notes/${note.id}`;

    await sendEmail({
      to: note.clinician.email,
      ...EmailTemplates.unlockApproved(
        `${note.clinician.firstName} ${note.clinician.lastName}`,
        note.noteType,
        `${note.client.firstName} ${note.client.lastName}`,
        `${user.firstName} ${user.lastName}`,
        noteLink
      )
    });

    res.json({
      message: 'Unlock request approved successfully',
      note: updatedNote,
      unlockUntil: unlockUntil,
    });
  } catch (error) {
    console.error('Error approving unlock request:', error);
    res.status(500).json({ error: 'Failed to approve unlock request' });
  }
});

/**
 * POST /api/v1/unlock-requests/:noteId/deny
 * Deny unlock request (supervisor/admin only)
 */
router.post('/:noteId/deny', authenticate, async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = (req as any).user.userId;
    const { denialReason } = req.body;

    if (!denialReason || denialReason.trim().length === 0) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        firstName: true,
        lastName: true,
      },
    });

    // Check if user is supervisor or admin
    if (!user?.roles.includes('SUPERVISOR') && !user?.roles.includes('ADMINISTRATOR')) {
      return res.status(403).json({ error: 'Only supervisors or administrators can deny unlock requests' });
    }

    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supervisorId: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.unlockRequested) {
      return res.status(400).json({ error: 'No unlock request pending for this note' });
    }

    // If user is supervisor, verify they supervise this clinician
    if (user.roles.includes('SUPERVISOR') && !user.roles.includes('ADMINISTRATOR')) {
      if (note.clinician.supervisorId !== userId) {
        return res.status(403).json({ error: 'You can only deny unlock requests for your supervisees' });
      }
    }

    // Deny the unlock request
    const updatedNote = await prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        unlockRequested: false,
        unlockApprovedBy: null,
        unlockApprovalDate: null,
      },
    });

    // Send denial email to clinician
    await sendEmail({
      to: note.clinician.email,
      ...EmailTemplates.unlockDenied(
        `${note.clinician.firstName} ${note.clinician.lastName}`,
        note.noteType,
        `${note.client.firstName} ${note.client.lastName}`,
        `${user.firstName} ${user.lastName}`,
        denialReason
      )
    });

    res.json({
      message: 'Unlock request denied',
      note: updatedNote,
    });
  } catch (error) {
    console.error('Error denying unlock request:', error);
    res.status(500).json({ error: 'Failed to deny unlock request' });
  }
});

/**
 * GET /api/v1/unlock-requests/stats
 * Get unlock request statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    let whereClause: any = { unlockRequested: true, isLocked: true };

    if (user?.roles.includes('SUPERVISOR') && !user.roles.includes('ADMINISTRATOR')) {
      // Supervisors only see their supervisees' requests
      const supervisees = await prisma.user.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      });

      whereClause.clinicianId = { in: supervisees.map((s) => s.id) };
    } else if (!user?.roles.includes('ADMINISTRATOR')) {
      // Regular clinicians see their own
      whereClause.clinicianId = userId;
    }

    const [total, pending, oldestRequest] = await Promise.all([
      prisma.clinicalNote.count({ where: whereClause }),
      prisma.clinicalNote.count({
        where: {
          ...whereClause,
          unlockApprovedBy: null,
        },
      }),
      prisma.clinicalNote.findFirst({
        where: whereClause,
        orderBy: { unlockRequestDate: 'asc' },
        select: { unlockRequestDate: true },
      }),
    ]);

    res.json({
      total,
      pending,
      approved: total - pending,
      oldestRequestDate: oldestRequest?.unlockRequestDate || null,
    });
  } catch (error) {
    console.error('Error fetching unlock request stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
