/**
 * Clinical Note Service Tests
 * Phase 5.1: Comprehensive test coverage for clinicalNote.service.ts
 *
 * Tests all clinical note-related business operations including:
 * - Note CRUD operations
 * - Workflow validation
 * - Signing and co-signing
 * - Treatment plan tracking
 * - Compliance dashboard
 * - Revision workflow
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserRoles } from '@mentalspace/shared';

// Mock dependencies before importing the service
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    clinicalNote: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../clinical-notes-validation.service', () => ({
  ClinicalNotesValidationService: {
    validateNoteCreation: jest.fn(),
    validateNote: jest.fn().mockResolvedValue({ isValid: true }),
  },
}));

jest.mock('../appointment-eligibility.service', () => ({
  AppointmentEligibilityService: {
    getEligibleAppointments: jest.fn().mockResolvedValue([]),
    getDefaultAppointmentConfig: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../diagnosis-inheritance.service', () => ({
  DiagnosisInheritanceService: {
    getInheritedDiagnosesForNote: jest.fn().mockResolvedValue([]),
    validateDiagnosesForNoteType: jest.fn().mockResolvedValue({ valid: true, message: null }),
  },
}));

jest.mock('../signature.service', () => ({
  verifySignatureAuth: jest.fn().mockResolvedValue(true),
  createSignatureEvent: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
import { clinicalNoteService, NOTE_TYPES } from '../clinicalNote.service';
import prisma from '../database';
import { ClinicalNotesValidationService } from '../clinical-notes-validation.service';
import * as SignatureService from '../signature.service';
import { NotFoundError, BadRequestError, ForbiddenError, UnauthorizedError } from '../../utils/errors';
import { JwtPayload } from '../../utils/jwt';

describe('ClinicalNoteService', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockValidationService = ClinicalNotesValidationService as jest.Mocked<typeof ClinicalNotesValidationService>;
  const mockSignatureService = SignatureService as jest.Mocked<typeof SignatureService>;

  const mockUser: JwtPayload = {
    userId: 'clinician-123',
    email: 'clinician@test.com',
    roles: ['CLINICIAN'],
    sessionId: 'session-123',
    practiceId: 'practice-123',
  };

  const mockNote = {
    id: 'note-123',
    clientId: 'client-123',
    clinicianId: 'clinician-123',
    appointmentId: 'appointment-123',
    noteType: 'Progress Note',
    status: 'DRAFT',
    sessionDate: new Date('2024-01-15'),
    signedDate: null,
    cosignedDate: null,
    isLocked: false,
    requiresCosign: false,
    revisionCount: 0,
    revisionHistory: [],
    subjective: 'Client reports...',
    objective: 'Client presented...',
    assessment: 'Assessment findings...',
    plan: 'Continue treatment...',
    diagnosisCodes: ['F41.1'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastModifiedBy: 'clinician-123',
    clinician: {
      id: 'clinician-123',
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'LCSW',
      supervisorId: 'supervisor-123',
    },
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Doe',
      medicalRecordNumber: 'MRN-123456789',
      dateOfBirth: new Date('1990-01-01'),
    },
    cosigner: null,
    appointment: {
      id: 'appointment-123',
      appointmentDate: new Date('2024-01-15'),
      startTime: '10:00',
      endTime: '11:00',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationService.validateNoteCreation.mockResolvedValue(undefined);
    mockValidationService.validateNote.mockResolvedValue({ isValid: true } as any);
    mockSignatureService.verifySignatureAuth.mockResolvedValue(true);
    mockSignatureService.createSignatureEvent.mockResolvedValue({} as any);
  });

  // ============================================================================
  // Treatment Plan Status Tests
  // ============================================================================
  describe('checkTreatmentPlanStatus', () => {
    it('should return needsUpdate true when no treatment plan exists', async () => {
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(null);

      const result = await clinicalNoteService.checkTreatmentPlanStatus('client-123');

      expect(result.needsUpdate).toBe(true);
      expect(result.daysOverdue).toBeNull();
    });

    it('should return needsUpdate true when treatment plan is over 90 days old', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      mockPrisma.clinicalNote.findFirst.mockResolvedValue({
        ...mockNote,
        noteType: 'Treatment Plan',
        signedDate: oldDate,
      } as any);

      const result = await clinicalNoteService.checkTreatmentPlanStatus('client-123');

      expect(result.needsUpdate).toBe(true);
      expect(result.daysOverdue).toBe(10); // 100 - 90 = 10
    });

    it('should return needsUpdate false when treatment plan is recent', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);

      mockPrisma.clinicalNote.findFirst.mockResolvedValue({
        ...mockNote,
        noteType: 'Treatment Plan',
        signedDate: recentDate,
      } as any);

      const result = await clinicalNoteService.checkTreatmentPlanStatus('client-123');

      expect(result.needsUpdate).toBe(false);
      expect(result.daysOverdue).toBeNull();
    });
  });

  // ============================================================================
  // Compliance Metrics Tests
  // ============================================================================
  describe('calculateComplianceMetrics', () => {
    it('should calculate days to complete from session date', () => {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - 5);

      const result = clinicalNoteService.calculateComplianceMetrics(sessionDate, null);

      expect(result.daysToComplete).toBe(5);
      expect(result.isOverdue).toBe(true); // > 3 days
      expect(result.completedOnTime).toBe(false);
    });

    it('should mark as urgent when over 7 days', () => {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - 10);

      const result = clinicalNoteService.calculateComplianceMetrics(sessionDate, null);

      expect(result.isUrgent).toBe(true);
      expect(result.isOverdue).toBe(true);
    });

    it('should mark completedOnTime when signed within 7 days', () => {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - 10);
      const signedDate = new Date(sessionDate);
      signedDate.setDate(signedDate.getDate() + 5);

      const result = clinicalNoteService.calculateComplianceMetrics(sessionDate, signedDate);

      expect(result.completedOnTime).toBe(true);
    });

    it('should use current date when sessionDate is null', () => {
      const result = clinicalNoteService.calculateComplianceMetrics(null, null);

      expect(result.daysToComplete).toBe(0);
      expect(result.isOverdue).toBe(false);
    });
  });

  // ============================================================================
  // Workflow Validation Tests
  // ============================================================================
  describe('validateNoteWorkflow', () => {
    it('should return valid when validation passes', async () => {
      const result = await clinicalNoteService.validateNoteWorkflow(
        'client-123',
        'clinician-123',
        'Progress Note',
        'appointment-123'
      );

      expect(result.valid).toBe(true);
    });

    it('should return invalid with message when validation fails', async () => {
      mockValidationService.validateNoteCreation.mockRejectedValue(
        new Error('Duplicate note for this appointment')
      );

      const result = await clinicalNoteService.validateNoteWorkflow(
        'client-123',
        'clinician-123',
        'Progress Note',
        'appointment-123'
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Duplicate note for this appointment');
    });
  });

  // ============================================================================
  // Get Note By ID Tests
  // ============================================================================
  describe('getNoteById', () => {
    it('should return note when found', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(mockNote as any);

      const result = await clinicalNoteService.getNoteById('note-123');

      expect(result).toEqual(mockNote);
      expect(mockPrisma.clinicalNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundError when note does not exist', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(null);

      await expect(clinicalNoteService.getNoteById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================================================
  // Get Client Notes Tests
  // ============================================================================
  describe('getClientNotes', () => {
    it('should return notes and treatment plan status', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([mockNote as any]);
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(null); // No treatment plan

      const result = await clinicalNoteService.getClientNotes('client-123');

      expect(result.notes).toHaveLength(1);
      expect(result.treatmentPlanStatus.needsUpdate).toBe(true);
    });
  });

  // ============================================================================
  // Create Note Tests
  // ============================================================================
  describe('createNote', () => {
    const createData = {
      clientId: 'client-123',
      appointmentId: 'appointment-123',
      noteType: 'Progress Note' as const,
      sessionDate: '2024-01-15T10:00:00Z',
      subjective: 'Client reports...',
      objective: 'Client presented...',
      assessment: 'Assessment findings...',
      plan: 'Continue treatment...',
      status: 'DRAFT' as const,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'clinician-123',
        isUnderSupervision: false,
        supervisorId: null,
      } as any);
      mockPrisma.clinicalNote.create.mockResolvedValue(mockNote as any);
    });

    it('should create draft note without appointment', async () => {
      const draftData = { ...createData, appointmentId: null };

      await clinicalNoteService.createNote(draftData, 'clinician-123');

      expect(mockPrisma.clinicalNote.create).toHaveBeenCalled();
    });

    it('should require appointment for non-draft notes', async () => {
      const signedData = { ...createData, appointmentId: null, status: 'SIGNED' as const };

      await expect(clinicalNoteService.createNote(signedData, 'clinician-123')).rejects.toThrow(
        BadRequestError
      );
    });

    it('should set requiresCosign when clinician is under supervision', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'clinician-123',
        isUnderSupervision: true,
        supervisorId: 'supervisor-123',
      } as any);

      await clinicalNoteService.createNote(createData, 'clinician-123');

      expect(mockPrisma.clinicalNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiresCosign: true,
          }),
        })
      );
    });

    it('should validate workflow for non-draft notes', async () => {
      const pendingData = { ...createData, status: undefined };

      await clinicalNoteService.createNote(pendingData, 'clinician-123');

      expect(mockValidationService.validateNoteCreation).toHaveBeenCalled();
    });

    it('should throw BadRequestError on duplicate note', async () => {
      mockPrisma.clinicalNote.create.mockRejectedValue({ code: 'P2002' });

      await expect(clinicalNoteService.createNote(createData, 'clinician-123')).rejects.toThrow(
        BadRequestError
      );
    });
  });

  // ============================================================================
  // Update Note Tests
  // ============================================================================
  describe('updateNote', () => {
    const updateData = {
      subjective: 'Updated subjective',
      objective: 'Updated objective',
    };

    beforeEach(() => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(mockNote as any);
      mockPrisma.clinicalNote.update.mockResolvedValue({ ...mockNote, ...updateData } as any);
    });

    it('should update draft note', async () => {
      const result = await clinicalNoteService.updateNote('note-123', updateData, 'clinician-123');

      expect(result.subjective).toBe('Updated subjective');
      expect(mockPrisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-123' },
          data: expect.objectContaining({
            subjective: 'Updated subjective',
            lastModifiedBy: 'clinician-123',
          }),
        })
      );
    });

    it('should throw NotFoundError when note does not exist', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(null);

      await expect(
        clinicalNoteService.updateNote('nonexistent', updateData, 'clinician-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for locked notes', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'LOCKED',
      } as any);

      await expect(
        clinicalNoteService.updateNote('note-123', updateData, 'clinician-123')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for signed notes', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'SIGNED',
      } as any);

      await expect(
        clinicalNoteService.updateNote('note-123', updateData, 'clinician-123')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should map frontend field names to database names', async () => {
      await clinicalNoteService.updateNote(
        'note-123',
        { riskAssessmentNotes: 'Test notes', interventions: 'Test interventions' },
        'clinician-123'
      );

      expect(mockPrisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            riskAssessmentDetails: 'Test notes',
            interventionsTaken: 'Test interventions',
          }),
        })
      );
    });
  });

  // ============================================================================
  // Sign Note Tests
  // ============================================================================
  describe('signNote', () => {
    const requestInfo = {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    };

    beforeEach(() => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(mockNote as any);
      mockPrisma.clinicalNote.update.mockResolvedValue({
        ...mockNote,
        status: 'SIGNED',
        signedDate: new Date(),
      } as any);
    });

    it('should sign note successfully', async () => {
      const result = await clinicalNoteService.signNote(
        'note-123',
        'clinician-123',
        { pin: '1234' },
        requestInfo
      );

      expect(result.status).toBe('SIGNED');
      expect(mockSignatureService.verifySignatureAuth).toHaveBeenCalled();
      expect(mockSignatureService.createSignatureEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundError when note does not exist', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(null);

      await expect(
        clinicalNoteService.signNote('nonexistent', 'clinician-123', { pin: '1234' }, requestInfo)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when not the note creator', async () => {
      await expect(
        clinicalNoteService.signNote('note-123', 'other-user', { pin: '1234' }, requestInfo)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when already signed', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'SIGNED',
      } as any);

      await expect(
        clinicalNoteService.signNote('note-123', 'clinician-123', { pin: '1234' }, requestInfo)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw UnauthorizedError on invalid signature', async () => {
      mockSignatureService.verifySignatureAuth.mockResolvedValue(false);

      await expect(
        clinicalNoteService.signNote('note-123', 'clinician-123', { pin: 'wrong' }, requestInfo)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should set status to PENDING_COSIGN when requiresCosign is true', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        requiresCosign: true,
      } as any);
      mockPrisma.clinicalNote.update.mockResolvedValue({
        ...mockNote,
        status: 'PENDING_COSIGN',
      } as any);

      const result = await clinicalNoteService.signNote(
        'note-123',
        'clinician-123',
        { pin: '1234' },
        requestInfo
      );

      expect(mockPrisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_COSIGN',
          }),
        })
      );
    });
  });

  // ============================================================================
  // Co-sign Note Tests
  // ============================================================================
  describe('cosignNote', () => {
    const requestInfo = {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    };

    beforeEach(() => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'PENDING_COSIGN',
        clinician: {
          ...mockNote.clinician,
          supervisorId: 'supervisor-123',
        },
      } as any);
      mockPrisma.clinicalNote.update.mockResolvedValue({
        ...mockNote,
        status: 'COSIGNED',
        cosignedDate: new Date(),
      } as any);
    });

    it('should cosign note successfully', async () => {
      const result = await clinicalNoteService.cosignNote(
        'note-123',
        'supervisor-123',
        { supervisorComments: 'Approved', pin: '5678' },
        requestInfo
      );

      expect(result.status).toBe('COSIGNED');
      expect(mockSignatureService.createSignatureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          signatureType: 'COSIGN',
        })
      );
    });

    it('should throw ForbiddenError when not the assigned supervisor', async () => {
      await expect(
        clinicalNoteService.cosignNote(
          'note-123',
          'other-supervisor',
          { pin: '5678' },
          requestInfo
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when note is not pending co-sign', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'DRAFT',
        clinician: { supervisorId: 'supervisor-123' },
      } as any);

      await expect(
        clinicalNoteService.cosignNote('note-123', 'supervisor-123', { pin: '5678' }, requestInfo)
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ============================================================================
  // Delete Note Tests
  // ============================================================================
  describe('deleteNote', () => {
    it('should delete draft note', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(mockNote as any);
      mockPrisma.clinicalNote.delete.mockResolvedValue(mockNote as any);

      await clinicalNoteService.deleteNote('note-123', 'clinician-123');

      expect(mockPrisma.clinicalNote.delete).toHaveBeenCalledWith({
        where: { id: 'note-123' },
      });
    });

    it('should throw NotFoundError when note does not exist', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue(null);

      await expect(clinicalNoteService.deleteNote('nonexistent', 'clinician-123')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError for non-draft notes', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'SIGNED',
      } as any);

      await expect(clinicalNoteService.deleteNote('note-123', 'clinician-123')).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should throw ForbiddenError when not the note creator', async () => {
      await expect(clinicalNoteService.deleteNote('note-123', 'other-user')).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  // ============================================================================
  // Get Notes For Cosigning Tests
  // ============================================================================
  describe('getNotesForCosigning', () => {
    it('should return notes pending cosign for supervisees', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'supervisee-1' },
        { id: 'supervisee-2' },
      ] as any);
      mockPrisma.clinicalNote.findMany.mockResolvedValue([mockNote as any]);

      const result = await clinicalNoteService.getNotesForCosigning('supervisor-123');

      expect(result).toHaveLength(1);
      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clinicianId: { in: ['supervisee-1', 'supervisee-2'] },
            status: 'PENDING_COSIGN',
          },
        })
      );
    });
  });

  // ============================================================================
  // Get Client Diagnosis Tests
  // ============================================================================
  describe('getClientDiagnosis', () => {
    it('should return diagnosis codes from latest note', async () => {
      mockPrisma.clinicalNote.findFirst.mockResolvedValue({
        diagnosisCodes: ['F41.1', 'F32.1'],
      } as any);

      const result = await clinicalNoteService.getClientDiagnosis('client-123');

      expect(result).toEqual(['F41.1', 'F32.1']);
    });

    it('should return empty array when no diagnosis note exists', async () => {
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(null);

      const result = await clinicalNoteService.getClientDiagnosis('client-123');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Return For Revision Tests
  // ============================================================================
  describe('returnForRevision', () => {
    const revisionData = {
      comments: 'Please revise the assessment section',
      requiredChanges: ['Update diagnosis justification', 'Add treatment goals'],
    };

    beforeEach(() => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'PENDING_COSIGN',
      } as any);
      mockPrisma.clinicalNote.update.mockResolvedValue({
        ...mockNote,
        status: 'RETURNED_FOR_REVISION',
        revisionCount: 1,
      } as any);
    });

    it('should return note for revision', async () => {
      const result = await clinicalNoteService.returnForRevision(
        'note-123',
        'supervisor-123',
        'Dr. Supervisor',
        UserRoles.SUPERVISOR,
        revisionData
      );

      expect(result.status).toBe('RETURNED_FOR_REVISION');
      expect(mockPrisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RETURNED_FOR_REVISION',
            currentRevisionComments: revisionData.comments,
            currentRevisionRequiredChanges: revisionData.requiredChanges,
          }),
        })
      );
    });

    it('should throw ForbiddenError for non-supervisors', async () => {
      await expect(
        clinicalNoteService.returnForRevision(
          'note-123',
          'clinician-123',
          'Clinician Name',
          UserRoles.CLINICIAN,
          revisionData
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when note is not PENDING_COSIGN', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'DRAFT',
      } as any);

      await expect(
        clinicalNoteService.returnForRevision(
          'note-123',
          'supervisor-123',
          'Dr. Supervisor',
          UserRoles.SUPERVISOR,
          revisionData
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ============================================================================
  // Resubmit For Review Tests
  // ============================================================================
  describe('resubmitForReview', () => {
    beforeEach(() => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'RETURNED_FOR_REVISION',
        revisionHistory: [
          {
            date: '2024-01-15',
            returnedBy: 'supervisor-123',
            comments: 'Revise assessment',
          },
        ],
      } as any);
      mockPrisma.clinicalNote.update.mockResolvedValue({
        ...mockNote,
        status: 'PENDING_COSIGN',
      } as any);
    });

    it('should resubmit note for review', async () => {
      const result = await clinicalNoteService.resubmitForReview('note-123', 'clinician-123');

      expect(result.status).toBe('PENDING_COSIGN');
      expect(mockPrisma.clinicalNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_COSIGN',
            currentRevisionComments: null,
            currentRevisionRequiredChanges: [],
          }),
        })
      );
    });

    it('should throw ForbiddenError when not the note creator', async () => {
      await expect(
        clinicalNoteService.resubmitForReview('note-123', 'other-user')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when note is not RETURNED_FOR_REVISION', async () => {
      mockPrisma.clinicalNote.findUnique.mockResolvedValue({
        ...mockNote,
        status: 'DRAFT',
      } as any);

      await expect(
        clinicalNoteService.resubmitForReview('note-123', 'clinician-123')
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ============================================================================
  // Get My Notes Tests
  // ============================================================================
  describe('getMyNotes', () => {
    beforeEach(() => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([
        { ...mockNote, status: 'DRAFT' },
        { ...mockNote, id: 'note-456', status: 'SIGNED', signedDate: new Date() },
      ] as any);
    });

    it('should return notes with stats', async () => {
      const result = await clinicalNoteService.getMyNotes('clinician-123', {});

      expect(result.notes).toHaveLength(2);
      expect(result.stats.total).toBe(2);
      expect(result.stats.draft).toBe(1);
      expect(result.stats.signed).toBe(1);
    });

    it('should apply status filter', async () => {
      await clinicalNoteService.getMyNotes('clinician-123', { status: 'DRAFT' });

      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
          }),
        })
      );
    });

    it('should apply date range filter', async () => {
      await clinicalNoteService.getMyNotes('clinician-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should apply search filter across multiple fields', async () => {
      await clinicalNoteService.getMyNotes('clinician-123', { search: 'anxiety' });

      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  // ============================================================================
  // Compliance Dashboard Tests
  // ============================================================================
  describe('getComplianceDashboard', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'clinician-123',
        roles: [UserRoles.CLINICIAN],
      } as any);
      mockPrisma.clinicalNote.findMany.mockResolvedValue([]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
    });

    it('should return compliance dashboard data', async () => {
      const result = await clinicalNoteService.getComplianceDashboard('clinician-123');

      expect(result).toHaveProperty('notesAwaitingCosign');
      expect(result).toHaveProperty('overdueNotes');
      expect(result).toHaveProperty('lockedNotes');
      expect(result).toHaveProperty('draftNotes');
      expect(result).toHaveProperty('appointmentsWithoutNotes');
      expect(result).toHaveProperty('stats');
    });

    it('should calculate stats correctly', async () => {
      mockPrisma.clinicalNote.findMany
        .mockResolvedValueOnce([mockNote as any]) // awaiting cosign
        .mockResolvedValueOnce([mockNote as any, mockNote as any]) // overdue
        .mockResolvedValueOnce([]) // locked
        .mockResolvedValueOnce([mockNote as any]); // drafts

      const result = await clinicalNoteService.getComplianceDashboard('clinician-123');

      expect(result.stats.awaitingCosign).toBe(1);
      expect(result.stats.overdue).toBe(2);
      expect(result.stats.locked).toBe(0);
      expect(result.stats.drafts).toBe(1);
    });
  });

  // ============================================================================
  // Get Clinical Notes Tests
  // ============================================================================
  describe('getClinicalNotes', () => {
    it('should return notes with filters', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([mockNote as any]);

      const result = await clinicalNoteService.getClinicalNotes('clinician-123', UserRoles.CLINICIAN, {
        status: 'SIGNED',
      });

      expect(result).toHaveLength(1);
      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SIGNED',
          }),
        })
      );
    });

    it('should handle comma-separated status filter', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([]);

      await clinicalNoteService.getClinicalNotes('clinician-123', UserRoles.CLINICIAN, {
        status: 'SIGNED,COSIGNED',
      });

      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['SIGNED', 'COSIGNED'] },
          }),
        })
      );
    });

    it('should not apply clinician filter for admin roles', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([]);

      await clinicalNoteService.getClinicalNotes('admin-123', UserRoles.ADMINISTRATOR, {});

      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should apply limit cap', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([]);

      await clinicalNoteService.getClinicalNotes('clinician-123', UserRoles.CLINICIAN, { limit: 200 });

      expect(mockPrisma.clinicalNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Capped at 100
        })
      );
    });
  });
});
