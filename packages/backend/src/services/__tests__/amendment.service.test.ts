// Create mock functions first
const mockClinicalNoteFindUnique = jest.fn();
const mockClinicalNoteUpdate = jest.fn();
const mockNoteVersionCreate = jest.fn();
const mockNoteVersionCount = jest.fn();
const mockNoteVersionFindUnique = jest.fn();
const mockNoteVersionFindMany = jest.fn();
const mockNoteAmendmentCreate = jest.fn();
const mockNoteAmendmentCount = jest.fn();
const mockNoteAmendmentFindUnique = jest.fn();
const mockNoteAmendmentFindMany = jest.fn();
const mockNoteAmendmentUpdate = jest.fn();
const mockSignatureEventCreate = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    clinicalNote: {
      findUnique: mockClinicalNoteFindUnique,
      update: mockClinicalNoteUpdate,
    },
    noteVersion: {
      create: mockNoteVersionCreate,
      count: mockNoteVersionCount,
      findUnique: mockNoteVersionFindUnique,
      findMany: mockNoteVersionFindMany,
    },
    noteAmendment: {
      create: mockNoteAmendmentCreate,
      count: mockNoteAmendmentCount,
      findUnique: mockNoteAmendmentFindUnique,
      findMany: mockNoteAmendmentFindMany,
      update: mockNoteAmendmentUpdate,
    },
    signatureEvent: {
      create: mockSignatureEventCreate,
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Import after mocking
import {
  createNoteVersion,
  createAmendment,
  amendNote,
  signAmendment,
  getAmendmentsForNote,
  getVersionHistory,
  compareVersions,
} from '../amendment.service';

describe('Amendment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNote = {
    id: 'note-123',
    noteType: 'Progress Note',
    clinicianId: 'clinician-456',
    clientId: 'client-789',
    subjective: 'Patient reports improved mood',
    objective: 'Appears calm and engaged',
    assessment: 'Making progress',
    plan: 'Continue therapy',
  };

  describe('createNoteVersion', () => {
    it('should create a version snapshot of a note', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      mockNoteVersionCount.mockResolvedValue(0);
      mockNoteVersionCreate.mockResolvedValue({
        id: 'version-1',
        noteId: 'note-123',
        versionNumber: 1,
        versionType: 'ORIGINAL',
        noteData: mockNote,
      });

      const result = await createNoteVersion('note-123', 'user-456', 'ORIGINAL');

      expect(mockClinicalNoteFindUnique).toHaveBeenCalledWith({
        where: { id: 'note-123' },
      });
      expect(mockNoteVersionCreate).toHaveBeenCalledWith({
        data: {
          noteId: 'note-123',
          versionNumber: 1,
          createdBy: 'user-456',
          versionType: 'ORIGINAL',
          noteData: mockNote,
        },
      });
      expect(result.versionNumber).toBe(1);
    });

    it('should increment version number for subsequent versions', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      mockNoteVersionCount.mockResolvedValue(2);
      mockNoteVersionCreate.mockResolvedValue({
        id: 'version-3',
        versionNumber: 3,
        versionType: 'AMENDMENT',
      });

      const result = await createNoteVersion('note-123', 'user-456', 'AMENDMENT');

      expect(mockNoteVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          versionNumber: 3,
        }),
      });
      expect(result.versionNumber).toBe(3);
    });

    it('should throw error when note not found', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue(null);

      await expect(createNoteVersion('nonexistent', 'user-456', 'ORIGINAL')).rejects.toThrow(
        /Clinical note not found/i
      );
    });
  });

  describe('createAmendment', () => {
    const amendmentRequest = {
      noteId: 'note-123',
      reason: 'Correcting documentation error',
      amendedBy: 'clinician-456',
      fieldsChanged: ['subjective', 'assessment'],
      changeSummary: 'Updated patient symptoms and assessment',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create an amendment record', async () => {
      mockNoteAmendmentCount.mockResolvedValue(0);
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      mockNoteVersionCount.mockResolvedValue(1);
      mockNoteVersionCreate.mockResolvedValue({
        id: 'version-2',
        versionNumber: 2,
      });
      mockNoteAmendmentCreate.mockResolvedValue({
        id: 'amend-1',
        noteId: 'note-123',
        amendmentNumber: 1,
        reason: 'Correcting documentation error',
        status: 'PENDING',
      });

      const result = await createAmendment(amendmentRequest);

      expect(mockNoteAmendmentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          noteId: 'note-123',
          amendmentNumber: 1,
          reason: 'Correcting documentation error',
          amendedBy: 'clinician-456',
          fieldsChanged: ['subjective', 'assessment'],
          status: 'PENDING',
          requiresSignature: true,
        }),
        include: expect.any(Object),
      });
      expect(result.amendmentNumber).toBe(1);
    });

    it('should increment amendment number for subsequent amendments', async () => {
      mockNoteAmendmentCount.mockResolvedValue(2);
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      mockNoteVersionCount.mockResolvedValue(3);
      mockNoteVersionCreate.mockResolvedValue({ id: 'version-4', versionNumber: 4 });
      mockNoteAmendmentCreate.mockResolvedValue({
        id: 'amend-3',
        amendmentNumber: 3,
      });

      const result = await createAmendment(amendmentRequest);

      expect(mockNoteAmendmentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amendmentNumber: 3,
        }),
        include: expect.any(Object),
      });
      expect(result.amendmentNumber).toBe(3);
    });
  });

  describe('amendNote', () => {
    const amendNoteRequest = {
      noteId: 'note-123',
      reason: 'Correcting error',
      amendedBy: 'clinician-456',
      fieldsChanged: ['subjective'],
      changeSummary: 'Updated subjective section',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      newNoteData: {
        subjective: 'Updated patient symptoms',
      },
    };

    it('should amend a note with new data', async () => {
      mockNoteAmendmentCount.mockResolvedValue(0);
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      mockNoteVersionCount
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);
      mockNoteVersionCreate
        .mockResolvedValueOnce({ id: 'version-2', versionNumber: 2 })
        .mockResolvedValueOnce({ id: 'version-3', versionNumber: 3 });
      mockNoteAmendmentCreate.mockResolvedValue({
        id: 'amend-1',
        amendmentNumber: 1,
      });
      mockClinicalNoteUpdate.mockResolvedValue({
        ...mockNote,
        subjective: 'Updated patient symptoms',
      });
      mockNoteAmendmentUpdate.mockResolvedValue({});

      const result = await amendNote(amendNoteRequest);

      expect(mockClinicalNoteUpdate).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        data: { subjective: 'Updated patient symptoms' },
      });
      expect(result.amendment).toBeDefined();
      expect(result.updatedNote).toBeDefined();
      expect(result.newVersion).toBeDefined();
    });
  });

  describe('signAmendment', () => {
    beforeEach(() => {
      // Mock the signature service import
      jest.mock('../signature.service', () => ({
        getApplicableAttestation: jest.fn().mockResolvedValue({
          id: 'attest-123',
        }),
      }));
    });

    it('should throw error when amendment not found', async () => {
      mockNoteAmendmentFindUnique.mockResolvedValue(null);

      await expect(
        signAmendment('nonexistent', 'user-123', 'PASSWORD', '192.168.1.1', 'Mozilla')
      ).rejects.toThrow(/Amendment not found/i);
    });

    it('should throw error when amendment already signed', async () => {
      mockNoteAmendmentFindUnique.mockResolvedValue({
        id: 'amend-123',
        status: 'SIGNED',
        note: { noteType: 'Progress Note' },
      });

      await expect(
        signAmendment('amend-123', 'user-123', 'PASSWORD', '192.168.1.1', 'Mozilla')
      ).rejects.toThrow(/already signed/i);
    });
  });

  describe('getAmendmentsForNote', () => {
    it('should return all amendments for a note', async () => {
      const mockAmendments = [
        {
          id: 'amend-1',
          amendmentNumber: 1,
          reason: 'First amendment',
          amendingUser: { firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'amend-2',
          amendmentNumber: 2,
          reason: 'Second amendment',
          amendingUser: { firstName: 'Jane', lastName: 'Smith' },
        },
      ];

      mockNoteAmendmentFindMany.mockResolvedValue(mockAmendments);

      const result = await getAmendmentsForNote('note-123');

      expect(mockNoteAmendmentFindMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123' },
        include: expect.any(Object),
        orderBy: { amendmentNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].amendmentNumber).toBe(1);
    });

    it('should return empty array when no amendments exist', async () => {
      mockNoteAmendmentFindMany.mockResolvedValue([]);

      const result = await getAmendmentsForNote('note-123');

      expect(result).toEqual([]);
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history for a note', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          versionNumber: 1,
          versionType: 'ORIGINAL',
          creator: { firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'version-2',
          versionNumber: 2,
          versionType: 'AMENDMENT',
          creator: { firstName: 'John', lastName: 'Doe' },
        },
      ];

      mockNoteVersionFindMany.mockResolvedValue(mockVersions);

      const result = await getVersionHistory('note-123');

      expect(mockNoteVersionFindMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123' },
        include: expect.any(Object),
        orderBy: { versionNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].versionType).toBe('ORIGINAL');
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and return differences', async () => {
      const version1 = {
        id: 'version-1',
        versionNumber: 1,
        noteData: {
          subjective: 'Original symptoms',
          objective: 'Appears calm',
          assessment: 'Initial assessment',
        },
      };

      const version2 = {
        id: 'version-2',
        versionNumber: 2,
        noteData: {
          subjective: 'Updated symptoms',
          objective: 'Appears calm',
          assessment: 'Revised assessment',
          newField: 'Added field',
        },
      };

      mockNoteVersionFindUnique
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await compareVersions('version-1', 'version-2');

      expect(result.version1).toBeDefined();
      expect(result.version2).toBeDefined();
      expect(result.differences).toBeDefined();
      expect(result.changedFieldsCount).toBeGreaterThan(0);

      // Check specific differences
      const subjectiveDiff = result.differences.find((d: any) => d.field === 'subjective');
      expect(subjectiveDiff).toBeDefined();
      expect(subjectiveDiff.oldValue).toBe('Original symptoms');
      expect(subjectiveDiff.newValue).toBe('Updated symptoms');

      const newFieldDiff = result.differences.find((d: any) => d.field === 'newField');
      expect(newFieldDiff).toBeDefined();
      expect(newFieldDiff.oldValue).toBeUndefined();
      expect(newFieldDiff.newValue).toBe('Added field');
    });

    it('should return empty differences for identical versions', async () => {
      const identicalData = {
        subjective: 'Same content',
        objective: 'Same content',
      };

      mockNoteVersionFindUnique
        .mockResolvedValueOnce({ id: 'version-1', noteData: identicalData })
        .mockResolvedValueOnce({ id: 'version-2', noteData: identicalData });

      const result = await compareVersions('version-1', 'version-2');

      expect(result.differences).toHaveLength(0);
      expect(result.changedFieldsCount).toBe(0);
    });

    it('should throw error when version not found', async () => {
      mockNoteVersionFindUnique.mockResolvedValue(null);

      await expect(compareVersions('nonexistent-1', 'nonexistent-2')).rejects.toThrow(
        /One or both versions not found/i
      );
    });

    it('should handle complex nested data comparison', async () => {
      const version1 = {
        id: 'version-1',
        noteData: {
          diagnoses: [{ code: 'F32.1' }],
          nested: { value: 1 },
        },
      };

      const version2 = {
        id: 'version-2',
        noteData: {
          diagnoses: [{ code: 'F32.1' }, { code: 'F41.1' }],
          nested: { value: 2 },
        },
      };

      mockNoteVersionFindUnique
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await compareVersions('version-1', 'version-2');

      expect(result.differences).toHaveLength(2);
      expect(result.changedFieldsCount).toBe(2);
    });
  });
});
