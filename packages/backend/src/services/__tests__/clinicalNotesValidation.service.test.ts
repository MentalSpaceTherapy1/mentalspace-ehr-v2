// Create mock functions first
const mockAppointmentFindUnique = jest.fn();
const mockClinicalNoteFindFirst = jest.fn();
const mockClinicalNoteFindUnique = jest.fn();
const mockDiagnosisFindUnique = jest.fn();
const mockDiagnosisFindMany = jest.fn();
const mockDiagnosisHistoryCreate = jest.fn();
const mockClinicalNoteDiagnosisCreate = jest.fn();
const mockClinicalNoteDiagnosisFindMany = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    appointment: {
      findUnique: mockAppointmentFindUnique,
    },
    clinicalNote: {
      findFirst: mockClinicalNoteFindFirst,
      findUnique: mockClinicalNoteFindUnique,
    },
    diagnosis: {
      findUnique: mockDiagnosisFindUnique,
      findMany: mockDiagnosisFindMany,
    },
    diagnosisHistory: {
      create: mockDiagnosisHistoryCreate,
    },
    clinicalNoteDiagnosis: {
      create: mockClinicalNoteDiagnosisCreate,
      findMany: mockClinicalNoteDiagnosisFindMany,
    },
  },
}));

// Import after mocking
import {
  validateAppointmentRequirement,
  validateSequentialDocumentation,
  validateDiagnosisModification,
  getClientActiveDiagnoses,
  createDiagnosisHistory,
  linkDiagnosisToNote,
  getNoteDiagnoses,
  validateNoteCreation,
} from '../clinical-notes-validation.service';

describe('ClinicalNotesValidation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseParams = {
    noteType: 'Progress Note',
    clientId: 'client-123',
    clinicianId: 'clinician-456',
    appointmentId: 'apt-789',
    status: 'DRAFT',
  };

  describe('validateAppointmentRequirement', () => {
    it('should skip validation for draft notes', async () => {
      const params = { ...baseParams, status: 'DRAFT' };

      await expect(validateAppointmentRequirement(params)).resolves.not.toThrow();
      expect(mockAppointmentFindUnique).not.toHaveBeenCalled();
    });

    it('should skip validation for note types that do not require appointments', async () => {
      const params = { ...baseParams, noteType: 'Treatment Plan', status: 'SIGNED' };

      await expect(validateAppointmentRequirement(params)).resolves.not.toThrow();
      expect(mockAppointmentFindUnique).not.toHaveBeenCalled();
    });

    it('should throw error when appointment-required note has no appointmentId', async () => {
      const params = {
        ...baseParams,
        noteType: 'Progress Note',
        appointmentId: undefined,
        status: 'SIGNED',
      };

      await expect(validateAppointmentRequirement(params)).rejects.toThrow(
        /requires an appointment/i
      );
    });

    it('should throw error when appointment does not exist', async () => {
      mockAppointmentFindUnique.mockResolvedValue(null);

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateAppointmentRequirement(params)).rejects.toThrow(
        /does not exist/i
      );
    });

    it('should throw error when appointment belongs to different client', async () => {
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'different-client',
        clinicianId: 'clinician-456',
        status: 'SCHEDULED',
      });

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateAppointmentRequirement(params)).rejects.toThrow(
        /does not belong to this client/i
      );
    });

    it('should throw error when appointment belongs to different clinician', async () => {
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'client-123',
        clinicianId: 'different-clinician',
        status: 'SCHEDULED',
      });

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateAppointmentRequirement(params)).rejects.toThrow(
        /does not belong to this clinician/i
      );
    });

    it('should throw error when appointment status is invalid', async () => {
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'client-123',
        clinicianId: 'clinician-456',
        status: 'CANCELLED',
      });

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateAppointmentRequirement(params)).rejects.toThrow(
        /not valid for creating notes/i
      );
    });

    it('should pass validation when all conditions are met', async () => {
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'client-123',
        clinicianId: 'clinician-456',
        status: 'SCHEDULED',
      });

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateAppointmentRequirement(params)).resolves.not.toThrow();
    });

    it('should validate for different appointment-required note types', async () => {
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'client-123',
        clinicianId: 'clinician-456',
        status: 'CHECKED_IN',
      });

      const noteTypes = ['Intake Assessment', 'SOAP', 'Group Therapy Note', 'Contact Note'];

      for (const noteType of noteTypes) {
        await expect(
          validateAppointmentRequirement({ ...baseParams, noteType, status: 'SIGNED' })
        ).resolves.not.toThrow();
      }
    });
  });

  describe('validateSequentialDocumentation', () => {
    it('should skip validation for note types that do not require intake', async () => {
      const params = { ...baseParams, noteType: 'Intake Assessment' };

      await expect(validateSequentialDocumentation(params)).resolves.not.toThrow();
      expect(mockClinicalNoteFindFirst).not.toHaveBeenCalled();
    });

    it('should throw error when Progress Note created without completed Intake', async () => {
      mockClinicalNoteFindFirst.mockResolvedValue(null);

      const params = { ...baseParams, noteType: 'Progress Note' };

      await expect(validateSequentialDocumentation(params)).rejects.toThrow(
        /without a completed Intake Assessment/i
      );
    });

    it('should throw error when Treatment Plan created without completed Intake', async () => {
      mockClinicalNoteFindFirst.mockResolvedValue(null);

      const params = { ...baseParams, noteType: 'Treatment Plan' };

      await expect(validateSequentialDocumentation(params)).rejects.toThrow(
        /without a completed Intake Assessment/i
      );
    });

    it('should pass validation when completed Intake exists', async () => {
      mockClinicalNoteFindFirst.mockResolvedValue({
        id: 'intake-123',
        sessionDate: new Date(),
        status: 'SIGNED',
      });

      const params = { ...baseParams, noteType: 'Progress Note' };

      await expect(validateSequentialDocumentation(params)).resolves.not.toThrow();
      expect(mockClinicalNoteFindFirst).toHaveBeenCalledWith({
        where: {
          clientId: 'client-123',
          noteType: 'Intake Assessment',
          status: { in: ['SIGNED', 'LOCKED', 'COSIGNED'] },
        },
        select: expect.any(Object),
        orderBy: { sessionDate: 'desc' },
      });
    });
  });

  describe('validateDiagnosisModification', () => {
    it('should throw error when trying to modify diagnosis in Progress Note', async () => {
      const params = {
        diagnosisId: 'diag-123',
        noteType: 'Progress Note',
        noteId: 'note-123',
        clinicianId: 'clinician-456',
      };

      await expect(validateDiagnosisModification(params)).rejects.toThrow(
        /diagnoses are read-only/i
      );
    });

    it('should allow diagnosis modification in Intake Assessment', async () => {
      mockDiagnosisFindUnique.mockResolvedValue({
        id: 'diag-123',
        clientId: 'client-123',
      });
      mockClinicalNoteFindUnique.mockResolvedValue({
        clientId: 'client-123',
      });

      const params = {
        diagnosisId: 'diag-123',
        noteType: 'Intake Assessment',
        noteId: 'note-123',
        clinicianId: 'clinician-456',
      };

      await expect(validateDiagnosisModification(params)).resolves.not.toThrow();
    });

    it('should allow diagnosis modification in Treatment Plan', async () => {
      mockDiagnosisFindUnique.mockResolvedValue({
        id: 'diag-123',
        clientId: 'client-123',
      });
      mockClinicalNoteFindUnique.mockResolvedValue({
        clientId: 'client-123',
      });

      const params = {
        diagnosisId: 'diag-123',
        noteType: 'Treatment Plan',
        noteId: 'note-123',
        clinicianId: 'clinician-456',
      };

      await expect(validateDiagnosisModification(params)).resolves.not.toThrow();
    });

    it('should throw error when diagnosis not found', async () => {
      mockDiagnosisFindUnique.mockResolvedValue(null);

      const params = {
        diagnosisId: 'diag-nonexistent',
        noteType: 'Intake Assessment',
        noteId: 'note-123',
        clinicianId: 'clinician-456',
      };

      await expect(validateDiagnosisModification(params)).rejects.toThrow(
        /Diagnosis not found/i
      );
    });

    it('should throw error when note belongs to different client than diagnosis', async () => {
      mockDiagnosisFindUnique.mockResolvedValue({
        id: 'diag-123',
        clientId: 'client-123',
      });
      mockClinicalNoteFindUnique.mockResolvedValue({
        clientId: 'different-client',
      });

      const params = {
        diagnosisId: 'diag-123',
        noteType: 'Intake Assessment',
        noteId: 'note-123',
        clinicianId: 'clinician-456',
      };

      await expect(validateDiagnosisModification(params)).rejects.toThrow(
        /belongs to a different client/i
      );
    });
  });

  describe('getClientActiveDiagnoses', () => {
    it('should return active diagnoses for a client', async () => {
      const mockDiagnoses = [
        {
          id: 'diag-1',
          icdCode: 'F32.1',
          diagnosisDescription: 'Major depressive disorder, single episode, moderate',
          diagnosisType: 'PRIMARY',
          severity: 'Moderate',
        },
        {
          id: 'diag-2',
          icdCode: 'F41.1',
          diagnosisDescription: 'Generalized anxiety disorder',
          diagnosisType: 'SECONDARY',
          severity: 'Mild',
        },
      ];

      mockDiagnosisFindMany.mockResolvedValue(mockDiagnoses);

      const result = await getClientActiveDiagnoses('client-123');

      expect(mockDiagnosisFindMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-123',
          status: 'Active',
        },
        orderBy: [{ diagnosisType: 'asc' }, { diagnosisDate: 'desc' }],
        select: expect.any(Object),
      });
      expect(result).toEqual(mockDiagnoses);
    });

    it('should return empty array when no active diagnoses', async () => {
      mockDiagnosisFindMany.mockResolvedValue([]);

      const result = await getClientActiveDiagnoses('client-123');

      expect(result).toEqual([]);
    });
  });

  describe('createDiagnosisHistory', () => {
    it('should create diagnosis history entry', async () => {
      mockDiagnosisHistoryCreate.mockResolvedValue({ id: 'history-123' });

      await createDiagnosisHistory(
        'diag-123',
        'user-456',
        'note-789',
        'Intake Assessment',
        'CREATED',
        null,
        { icdCode: 'F32.1' },
        'Initial diagnosis'
      );

      expect(mockDiagnosisHistoryCreate).toHaveBeenCalledWith({
        data: {
          diagnosisId: 'diag-123',
          changedBy: 'user-456',
          changedInNoteId: 'note-789',
          changedInNoteType: 'Intake Assessment',
          changeType: 'CREATED',
          oldValues: null,
          newValues: { icdCode: 'F32.1' },
          changeReason: 'Initial diagnosis',
        },
      });
    });

    it('should create history for MODIFIED change type', async () => {
      mockDiagnosisHistoryCreate.mockResolvedValue({ id: 'history-124' });

      await createDiagnosisHistory(
        'diag-123',
        'user-456',
        'note-789',
        'Treatment Plan',
        'MODIFIED',
        { severity: 'Mild' },
        { severity: 'Moderate' },
        'Symptoms worsened'
      );

      expect(mockDiagnosisHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changeType: 'MODIFIED',
          oldValues: { severity: 'Mild' },
          newValues: { severity: 'Moderate' },
        }),
      });
    });
  });

  describe('linkDiagnosisToNote', () => {
    it('should link diagnosis to note with default pointer order', async () => {
      mockClinicalNoteDiagnosisCreate.mockResolvedValue({ id: 'link-123' });

      await linkDiagnosisToNote('note-123', 'diag-456');

      expect(mockClinicalNoteDiagnosisCreate).toHaveBeenCalledWith({
        data: {
          noteId: 'note-123',
          diagnosisId: 'diag-456',
          pointerOrder: 1,
        },
      });
    });

    it('should link diagnosis with custom pointer order', async () => {
      mockClinicalNoteDiagnosisCreate.mockResolvedValue({ id: 'link-124' });

      await linkDiagnosisToNote('note-123', 'diag-789', 3);

      expect(mockClinicalNoteDiagnosisCreate).toHaveBeenCalledWith({
        data: {
          noteId: 'note-123',
          diagnosisId: 'diag-789',
          pointerOrder: 3,
        },
      });
    });
  });

  describe('getNoteDiagnoses', () => {
    it('should return diagnoses linked to a note', async () => {
      const mockLinkedDiagnoses = [
        {
          id: 'link-1',
          pointerOrder: 1,
          diagnosis: {
            id: 'diag-1',
            icdCode: 'F32.1',
            diagnosisDescription: 'Major depressive disorder',
            diagnosisType: 'PRIMARY',
          },
        },
        {
          id: 'link-2',
          pointerOrder: 2,
          diagnosis: {
            id: 'diag-2',
            icdCode: 'F41.1',
            diagnosisDescription: 'Generalized anxiety disorder',
            diagnosisType: 'SECONDARY',
          },
        },
      ];

      mockClinicalNoteDiagnosisFindMany.mockResolvedValue(mockLinkedDiagnoses);

      const result = await getNoteDiagnoses('note-123');

      expect(mockClinicalNoteDiagnosisFindMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123' },
        include: {
          diagnosis: {
            select: expect.any(Object),
          },
        },
        orderBy: { pointerOrder: 'asc' },
      });
      expect(result).toEqual(mockLinkedDiagnoses);
    });
  });

  describe('validateNoteCreation', () => {
    it('should validate both appointment requirement and sequential documentation', async () => {
      // Setup for passing both validations
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'client-123',
        clinicianId: 'clinician-456',
        status: 'COMPLETED',
      });
      mockClinicalNoteFindFirst.mockResolvedValue({
        id: 'intake-123',
        sessionDate: new Date(),
        status: 'SIGNED',
      });

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateNoteCreation(params)).resolves.not.toThrow();
      expect(mockAppointmentFindUnique).toHaveBeenCalled();
      expect(mockClinicalNoteFindFirst).toHaveBeenCalled();
    });

    it('should fail if appointment validation fails', async () => {
      mockAppointmentFindUnique.mockResolvedValue(null);

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateNoteCreation(params)).rejects.toThrow(/does not exist/i);
    });

    it('should fail if sequential documentation fails', async () => {
      mockAppointmentFindUnique.mockResolvedValue({
        id: 'apt-789',
        clientId: 'client-123',
        clinicianId: 'clinician-456',
        status: 'COMPLETED',
      });
      mockClinicalNoteFindFirst.mockResolvedValue(null);

      const params = { ...baseParams, noteType: 'Progress Note', status: 'SIGNED' };

      await expect(validateNoteCreation(params)).rejects.toThrow(
        /without a completed Intake Assessment/i
      );
    });
  });
});
