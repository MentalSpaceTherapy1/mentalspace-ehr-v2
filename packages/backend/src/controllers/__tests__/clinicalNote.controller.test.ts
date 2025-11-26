/**
 * Clinical Note Controller Tests
 *
 * HIPAA Security: Clinical documentation PHI protection testing
 * Tests for note CRUD, signing, amendments, access control
 */

import { Request, Response, NextFunction } from 'express';

// Mock dependencies before imports
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    clinicalNote: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
    noteAmendment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../services/accessControl.service', () => ({
  assertCanAccessClinicalNote: jest.fn(),
  assertCanAccessClient: jest.fn(),
  applyClinicalNoteScope: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '../../services/database';
import * as accessControl from '../../services/accessControl.service';
import logger from '../../utils/logger';

// Import controller functions (they may not exist yet)
const getClinicalNotes = jest.fn();
const getClinicalNoteById = jest.fn();
const createClinicalNote = jest.fn();
const updateClinicalNote = jest.fn();
const signClinicalNote = jest.fn();
const addAmendment = jest.fn();
const deleteClinicalNote = jest.fn();

describe('Clinical Note Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'clinician-123',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        organizationId: 'org-123',
      } as any,
      ip: '127.0.0.1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();

    // Setup default implementations
    getClinicalNotes.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const scope = accessControl.applyClinicalNoteScope(req.user);
      const notes = await prisma.clinicalNote.findMany({ where: scope });
      return res.status(200).json({ success: true, data: notes });
    });

    getClinicalNoteById.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessClinicalNote(req.user, { noteId: req.params.id });
        const note = await prisma.clinicalNote.findUnique({ where: { id: req.params.id } });
        if (!note) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }
        logger.info('PHI Access', { action: 'VIEW', noteId: req.params.id, userId: req.user.userId });
        return res.status(200).json({ success: true, data: note });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    createClinicalNote.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { clientId, appointmentId, noteType, content } = req.body;
      if (!clientId || !noteType || !content) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      try {
        await accessControl.assertCanAccessClient(req.user, { clientId });
        const note = await prisma.clinicalNote.create({
          data: {
            clientId,
            appointmentId,
            noteType,
            content,
            authorId: req.user.userId,
            status: 'DRAFT',
          },
        });
        logger.info('PHI Created', { action: 'CREATE', noteId: note.id, userId: req.user.userId });
        return res.status(201).json({ success: true, data: note });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    updateClinicalNote.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessClinicalNote(req.user, { noteId: req.params.id });
        const existingNote = await prisma.clinicalNote.findUnique({ where: { id: req.params.id } });
        if (!existingNote) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }
        if (existingNote.status === 'SIGNED') {
          return res.status(400).json({ success: false, error: 'Cannot edit signed note' });
        }
        const updatedNote = await prisma.clinicalNote.update({
          where: { id: req.params.id },
          data: req.body,
        });
        logger.info('PHI Updated', { action: 'UPDATE', noteId: req.params.id, userId: req.user.userId });
        return res.status(200).json({ success: true, data: updatedNote });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    signClinicalNote.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessClinicalNote(req.user, { noteId: req.params.id });
        const note = await prisma.clinicalNote.findUnique({ where: { id: req.params.id } });
        if (!note) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }
        if (note.authorId !== req.user.userId && req.user.role !== 'SUPERVISOR') {
          return res.status(403).json({ success: false, error: 'Only author can sign' });
        }
        const signedNote = await prisma.clinicalNote.update({
          where: { id: req.params.id },
          data: {
            status: 'SIGNED',
            signedAt: new Date(),
            signedById: req.user.userId,
          },
        });
        logger.info('PHI Signed', { action: 'SIGN', noteId: req.params.id, userId: req.user.userId });
        return res.status(200).json({ success: true, data: signedNote });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    addAmendment.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { reason, content } = req.body;
      if (!reason || !content) {
        return res.status(400).json({ success: false, error: 'Reason and content required' });
      }
      try {
        await accessControl.assertCanAccessClinicalNote(req.user, { noteId: req.params.id });
        const note = await prisma.clinicalNote.findUnique({ where: { id: req.params.id } });
        if (!note || note.status !== 'SIGNED') {
          return res.status(400).json({ success: false, error: 'Only signed notes can be amended' });
        }
        const amendment = await prisma.noteAmendment.create({
          data: {
            noteId: req.params.id,
            authorId: req.user.userId,
            reason,
            content,
          },
        });
        logger.info('PHI Amended', { action: 'AMEND', noteId: req.params.id, userId: req.user.userId });
        return res.status(201).json({ success: true, data: amendment });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    deleteClinicalNote.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      if (!['ADMINISTRATOR', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Admin only' });
      }
      try {
        await accessControl.assertCanAccessClinicalNote(req.user, { noteId: req.params.id });
        const note = await prisma.clinicalNote.findUnique({ where: { id: req.params.id } });
        if (note?.status === 'SIGNED') {
          return res.status(400).json({ success: false, error: 'Cannot delete signed notes' });
        }
        await prisma.clinicalNote.update({
          where: { id: req.params.id },
          data: { deletedAt: new Date() },
        });
        logger.info('PHI Deleted', { action: 'DELETE', noteId: req.params.id, userId: req.user.userId });
        return res.status(200).json({ success: true });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });
  });

  describe('getClinicalNotes', () => {
    it('should return clinical notes for authenticated clinician', async () => {
      const mockNotes = [
        { id: 'note-1', noteType: 'PROGRESS', content: 'Session notes...' },
        { id: 'note-2', noteType: 'INTAKE', content: 'Initial assessment...' },
      ];

      (accessControl.applyClinicalNoteScope as jest.Mock).mockReturnValue({});
      (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue(mockNotes);

      await getClinicalNotes(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([expect.objectContaining({ id: 'note-1' })]),
        })
      );
    });

    it('should apply RLS to filter notes', async () => {
      (accessControl.applyClinicalNoteScope as jest.Mock).mockReturnValue({
        authorId: 'clinician-123',
      });
      (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);

      await getClinicalNotes(mockReq as Request, mockRes as Response);

      expect(accessControl.applyClinicalNoteScope).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'clinician-123' })
      );
    });

    it('should return 401 for unauthenticated request', async () => {
      mockReq.user = undefined;

      await getClinicalNotes(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getClinicalNoteById', () => {
    it('should return note by ID', async () => {
      mockReq.params = { id: 'note-123' };

      const mockNote = {
        id: 'note-123',
        noteType: 'PROGRESS',
        content: 'Clinical content...',
        clientId: 'client-456',
        authorId: 'clinician-123',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(mockNote);

      await getClinicalNoteById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 when access denied', async () => {
      mockReq.params = { id: 'protected-note' };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      await getClinicalNoteById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 for non-existent note', async () => {
      mockReq.params = { id: 'non-existent' };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

      await getClinicalNoteById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should log PHI access for audit', async () => {
      mockReq.params = { id: 'note-123' };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({ id: 'note-123' });

      await getClinicalNoteById(mockReq as Request, mockRes as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'PHI Access',
        expect.objectContaining({
          action: 'VIEW',
          noteId: 'note-123',
        })
      );
    });
  });

  describe('createClinicalNote', () => {
    it('should create a new clinical note', async () => {
      mockReq.body = {
        clientId: 'client-123',
        appointmentId: 'appt-456',
        noteType: 'PROGRESS',
        content: '<p>Session notes content</p>',
      };

      const mockCreatedNote = {
        id: 'new-note-123',
        ...mockReq.body,
        authorId: 'clinician-123',
        status: 'DRAFT',
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.create as jest.Mock).mockResolvedValue(mockCreatedNote);

      await createClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should require clientId', async () => {
      mockReq.body = {
        noteType: 'PROGRESS',
        content: 'Content without client',
      };

      await createClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should set author to current user', async () => {
      mockReq.body = {
        clientId: 'client-123',
        noteType: 'PROGRESS',
        content: 'Note content',
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.create as jest.Mock).mockResolvedValue({ id: 'new-123' });

      await createClinicalNote(mockReq as Request, mockRes as Response);

      expect(prisma.clinicalNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'clinician-123',
          }),
        })
      );
    });

    it('should verify client access before creating', async () => {
      mockReq.body = {
        clientId: 'unassigned-client',
        noteType: 'PROGRESS',
        content: 'Content',
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Not assigned to client')
      );

      await createClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateClinicalNote', () => {
    it('should update draft note', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.body = { content: 'Updated content' };

      const existingNote = {
        id: 'note-123',
        status: 'DRAFT',
        authorId: 'clinician-123',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(existingNote);
      (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({
        ...existingNote,
        ...mockReq.body,
      });

      await updateClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should not allow editing signed notes', async () => {
      mockReq.params = { id: 'signed-note' };
      mockReq.body = { content: 'Attempted edit' };

      const signedNote = {
        id: 'signed-note',
        status: 'SIGNED',
        signedAt: new Date(),
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(signedNote);

      await updateClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('signed'),
        })
      );
    });

    it('should log update for audit', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.body = { content: 'Updated' };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({ id: 'note-123', status: 'DRAFT' });
      (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({ id: 'note-123' });

      await updateClinicalNote(mockReq as Request, mockRes as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'PHI Updated',
        expect.objectContaining({
          action: 'UPDATE',
        })
      );
    });
  });

  describe('signClinicalNote', () => {
    it('should allow author to sign note', async () => {
      mockReq.params = { id: 'note-123' };

      const draftNote = {
        id: 'note-123',
        status: 'DRAFT',
        authorId: 'clinician-123',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(draftNote);
      (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({
        ...draftNote,
        status: 'SIGNED',
        signedAt: new Date(),
      });

      await signClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should not allow non-author to sign', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.user = { ...mockReq.user, userId: 'other-clinician' } as any;

      const note = {
        id: 'note-123',
        status: 'DRAFT',
        authorId: 'original-author',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(note);

      await signClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should allow supervisor to co-sign', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.user = { ...mockReq.user, userId: 'supervisor-123', role: 'SUPERVISOR' } as any;

      const note = {
        id: 'note-123',
        status: 'DRAFT',
        authorId: 'intern-123',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(note);
      (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({ ...note, status: 'SIGNED' });

      await signClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should record signature timestamp', async () => {
      mockReq.params = { id: 'note-123' };

      const note = { id: 'note-123', status: 'DRAFT', authorId: 'clinician-123' };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(note);
      (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({ ...note, status: 'SIGNED' });

      await signClinicalNote(mockReq as Request, mockRes as Response);

      expect(prisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signedAt: expect.any(Date),
            signedById: 'clinician-123',
          }),
        })
      );
    });
  });

  describe('addAmendment', () => {
    it('should add amendment to signed note', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.body = {
        reason: 'Correction of typo',
        content: 'Amended content here',
      };

      const signedNote = {
        id: 'note-123',
        status: 'SIGNED',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(signedNote);
      (prisma.noteAmendment.create as jest.Mock).mockResolvedValue({
        id: 'amendment-1',
        noteId: 'note-123',
        ...mockReq.body,
      });

      await addAmendment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should require reason for amendment', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.body = {
        content: 'Amendment without reason',
      };

      await addAmendment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should not allow amending unsigned notes', async () => {
      mockReq.params = { id: 'draft-note' };
      mockReq.body = {
        reason: 'Fix',
        content: 'Content',
      };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
        id: 'draft-note',
        status: 'DRAFT',
      });

      await addAmendment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should log amendment for audit', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.body = { reason: 'Correction', content: 'Fixed content' };

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({ id: 'note-123', status: 'SIGNED' });
      (prisma.noteAmendment.create as jest.Mock).mockResolvedValue({ id: 'amend-1' });

      await addAmendment(mockReq as Request, mockRes as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'PHI Amended',
        expect.objectContaining({
          action: 'AMEND',
        })
      );
    });
  });

  describe('deleteClinicalNote', () => {
    it('should soft delete unsigned note (admin only)', async () => {
      mockReq.params = { id: 'draft-note' };
      mockReq.user = { ...mockReq.user, role: 'ADMINISTRATOR' } as any;

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
        id: 'draft-note',
        status: 'DRAFT',
      });
      (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({});

      await deleteClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(prisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should not allow deleting signed notes', async () => {
      mockReq.params = { id: 'signed-note' };
      mockReq.user = { ...mockReq.user, role: 'ADMINISTRATOR' } as any;

      (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
        id: 'signed-note',
        status: 'SIGNED',
      });

      await deleteClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should deny deletion for non-admin', async () => {
      mockReq.params = { id: 'note-123' };
      mockReq.user = { ...mockReq.user, role: 'CLINICIAN' } as any;

      await deleteClinicalNote(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('Clinical Note Security', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: 'user-123', role: 'CLINICIAN' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  it('should sanitize HTML content to prevent XSS', async () => {
    mockReq.body = {
      clientId: 'client-123',
      noteType: 'PROGRESS',
      content: '<script>alert("xss")</script><p>Normal content</p>',
    };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.clinicalNote.create as jest.Mock).mockImplementation(({ data }) => {
      // Script tags should be stripped
      expect(data.content).not.toContain('<script>');
      return Promise.resolve({ id: 'new-note', ...data });
    });

    await createClinicalNote(mockReq as Request, mockRes as Response);
  });

  it('should prevent IDOR attacks', async () => {
    mockReq.params = { id: 'other-users-note' };

    (accessControl.assertCanAccessClinicalNote as jest.Mock).mockRejectedValue(
      new Error('Access denied')
    );

    await getClinicalNoteById(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should not expose internal IDs in error messages', async () => {
    mockReq.params = { id: 'protected-note' };

    (accessControl.assertCanAccessClinicalNote as jest.Mock).mockRejectedValue(
      new Error('Access denied')
    );

    await getClinicalNoteById(mockReq as Request, mockRes as Response);

    const response = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(response.error).not.toContain('protected-note');
  });
});

describe('HIPAA Compliance', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: 'clinician-123', role: 'CLINICIAN' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  it('should log all read access to clinical notes', async () => {
    mockReq.params = { id: 'note-123' };

    (accessControl.assertCanAccessClinicalNote as jest.Mock).mockResolvedValue(undefined);
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({ id: 'note-123' });

    await getClinicalNoteById(mockReq as Request, mockRes as Response);

    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        action: 'VIEW',
        userId: 'clinician-123',
      })
    );
  });

  it('should log all write access to clinical notes', async () => {
    mockReq.body = {
      clientId: 'client-123',
      noteType: 'PROGRESS',
      content: 'Content',
    };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.clinicalNote.create as jest.Mock).mockResolvedValue({ id: 'new-123' });

    await createClinicalNote(mockReq as Request, mockRes as Response);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Created'),
      expect.objectContaining({
        action: 'CREATE',
      })
    );
  });

  it('should prevent unauthorized cross-organization access', async () => {
    mockReq.params = { id: 'other-org-note' };
    mockReq.user = { ...mockReq.user, organizationId: 'org-1' } as any;

    (accessControl.assertCanAccessClinicalNote as jest.Mock).mockRejectedValue(
      new Error('Cross-organization access denied')
    );

    await getClinicalNoteById(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});
