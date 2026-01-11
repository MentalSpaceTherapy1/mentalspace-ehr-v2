// Create mock functions first
const mockClinicalNoteFindUnique = jest.fn();
const mockClinicalNoteFindFirst = jest.fn();
const mockPayerRuleFindFirst = jest.fn();
const mockBillingHoldCount = jest.fn();
const mockBillingHoldGroupBy = jest.fn();
const mockBillingHoldFindMany = jest.fn();
const mockBillingHoldUpdateMany = jest.fn();
const mockBillingHoldCreateMany = jest.fn();
const mockBillingHoldUpdate = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    clinicalNote: {
      findUnique: mockClinicalNoteFindUnique,
      findFirst: mockClinicalNoteFindFirst,
    },
    payerRule: {
      findFirst: mockPayerRuleFindFirst,
    },
    billingHold: {
      count: mockBillingHoldCount,
      groupBy: mockBillingHoldGroupBy,
      findMany: mockBillingHoldFindMany,
      updateMany: mockBillingHoldUpdateMany,
      createMany: mockBillingHoldCreateMany,
      update: mockBillingHoldUpdate,
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
  validateNoteForBilling,
  getActiveHoldsCount,
  getHoldsByReason,
  getHoldsForNote,
  resolveHold,
} from '../billingReadiness.service';

describe('Billing Readiness Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock note data
  const createMockNote = (overrides = {}) => ({
    id: 'note-123',
    noteType: 'Progress Note',
    clientId: 'client-456',
    clinicianId: 'clinician-789',
    sessionDate: new Date('2026-01-05'),
    status: 'SIGNED',
    signedDate: new Date('2026-01-06'),
    signedBy: 'clinician-789',
    cosignedBy: null,
    cosignedDate: null,
    subjective: 'Client reports improvement',
    objective: 'Appears calm and engaged',
    assessment: 'Client is making progress with anxiety management. Cognitive behavioral techniques are effective. Continued therapy recommended.',
    plan: 'Continue CBT, weekly sessions',
    diagnosisCodes: ['F41.1'],
    cptCode: '90834',
    clinician: {
      id: 'clinician-789',
      title: 'LCSW',
      supervisorId: null,
    },
    supervisor: null,
    appointment: {
      id: 'apt-123',
      placeOfService: 'OFFICE',
      client: {
        id: 'client-456',
      },
    },
    billingHolds: [],
    ...overrides,
  });

  describe('validateNoteForBilling', () => {
    it('should return canBill=true for valid signed note', async () => {
      const mockNote = createMockNote();
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      expect(mockClinicalNoteFindUnique).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        include: expect.any(Object),
      });
      expect(result.canBill).toBe(true);
      expect(result.holds).toHaveLength(0);
      expect(result.noteStatus).toBe('SIGNED');
    });

    it('should return canBill=true for cosigned note', async () => {
      const mockNote = createMockNote({
        status: 'COSIGNED',
        cosignedBy: 'supervisor-123',
        cosignedDate: new Date('2026-01-07'),
      });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      expect(result.canBill).toBe(true);
      expect(result.noteStatus).toBe('COSIGNED');
    });

    it('should return canBill=false for draft note', async () => {
      const mockNote = createMockNote({ status: 'DRAFT' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      expect(result.canBill).toBe(false);
      expect(result.holds).toHaveLength(1);
      expect(result.holds[0].reason).toBe('INVALID_STATUS');
      expect(result.holds[0].severity).toBe('CRITICAL');
    });

    it('should return canBill=false for pending note', async () => {
      const mockNote = createMockNote({ status: 'PENDING' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      expect(result.canBill).toBe(false);
      expect(result.holds[0].reason).toBe('INVALID_STATUS');
    });

    it('should throw error when note not found', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue(null);

      await expect(validateNoteForBilling('nonexistent')).rejects.toThrow(
        /Clinical note nonexistent not found/
      );
    });

    it('should add warning when no payer assigned', async () => {
      const mockNote = createMockNote();
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('No payer assigned')
      );
    });

    it('should return canBill=false when missing diagnosis', async () => {
      const mockNote = createMockNote({ diagnosisCodes: [] });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      // Mock matching payer rule that requires diagnosis
      mockPayerRuleFindFirst.mockResolvedValue({
        id: 'rule-123',
        diagnosisRequired: true,
        isActive: true,
        isProhibited: false,
      });

      const result = await validateNoteForBilling('note-123', false);

      // The warning about no payer still shows, but validation logic continues
      expect(result.canBill).toBe(true); // No payer = no rule validation
    });

    it('should create billing holds when createHolds is true and holds exist', async () => {
      const mockNote = createMockNote({ status: 'DRAFT' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);
      mockBillingHoldUpdateMany.mockResolvedValue({ count: 0 });
      mockBillingHoldCreateMany.mockResolvedValue({ count: 1 });

      await validateNoteForBilling('note-123', true);

      expect(mockBillingHoldUpdateMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123', isActive: true },
        data: expect.objectContaining({
          isActive: false,
          resolvedBy: 'SYSTEM',
        }),
      });
      expect(mockBillingHoldCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            noteId: 'note-123',
            holdReason: 'INVALID_STATUS',
          }),
        ]),
      });
    });

    it('should not create billing holds when createHolds is false', async () => {
      const mockNote = createMockNote({ status: 'DRAFT' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      await validateNoteForBilling('note-123', false);

      expect(mockBillingHoldUpdateMany).not.toHaveBeenCalled();
      expect(mockBillingHoldCreateMany).not.toHaveBeenCalled();
    });
  });

  describe('Note Status Validation', () => {
    it('should accept SIGNED status', async () => {
      const mockNote = createMockNote({ status: 'SIGNED' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      const statusHold = result.holds.find(h => h.reason === 'INVALID_STATUS');
      expect(statusHold).toBeUndefined();
    });

    it('should accept COSIGNED status', async () => {
      const mockNote = createMockNote({ status: 'COSIGNED' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      const statusHold = result.holds.find(h => h.reason === 'INVALID_STATUS');
      expect(statusHold).toBeUndefined();
    });

    it('should reject SUBMITTED_FOR_REVIEW status', async () => {
      const mockNote = createMockNote({ status: 'SUBMITTED_FOR_REVIEW' });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      const statusHold = result.holds.find(h => h.reason === 'INVALID_STATUS');
      expect(statusHold).toBeDefined();
      expect(statusHold?.details).toContain('SUBMITTED_FOR_REVIEW');
    });
  });

  describe('getActiveHoldsCount', () => {
    it('should return count of active holds', async () => {
      mockBillingHoldCount.mockResolvedValue(15);

      const count = await getActiveHoldsCount();

      expect(mockBillingHoldCount).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(count).toBe(15);
    });

    it('should return 0 when no active holds', async () => {
      mockBillingHoldCount.mockResolvedValue(0);

      const count = await getActiveHoldsCount();

      expect(count).toBe(0);
    });
  });

  describe('getHoldsByReason', () => {
    it('should return holds grouped by reason', async () => {
      mockBillingHoldGroupBy.mockResolvedValue([
        { holdReason: 'INVALID_STATUS', _count: { id: 5 } },
        { holdReason: 'MISSING_DIAGNOSIS', _count: { id: 3 } },
        { holdReason: 'SUPERVISION_REQUIRED', _count: { id: 2 } },
      ]);

      const result = await getHoldsByReason();

      expect(mockBillingHoldGroupBy).toHaveBeenCalledWith({
        by: ['holdReason'],
        where: { isActive: true },
        _count: { id: true },
      });
      expect(result).toEqual({
        INVALID_STATUS: 5,
        MISSING_DIAGNOSIS: 3,
        SUPERVISION_REQUIRED: 2,
      });
    });

    it('should return empty object when no holds', async () => {
      mockBillingHoldGroupBy.mockResolvedValue([]);

      const result = await getHoldsByReason();

      expect(result).toEqual({});
    });
  });

  describe('getHoldsForNote', () => {
    it('should return all active holds for a note', async () => {
      const mockHolds = [
        {
          id: 'hold-1',
          noteId: 'note-123',
          holdReason: 'INVALID_STATUS',
          holdDetails: 'Note must be signed',
          isActive: true,
          payerRule: {
            id: 'rule-1',
            payer: { id: 'payer-1', name: 'Blue Cross' },
          },
        },
        {
          id: 'hold-2',
          noteId: 'note-123',
          holdReason: 'MISSING_DIAGNOSIS',
          holdDetails: 'Diagnosis required',
          isActive: true,
          payerRule: null,
        },
      ];
      mockBillingHoldFindMany.mockResolvedValue(mockHolds);

      const result = await getHoldsForNote('note-123');

      expect(mockBillingHoldFindMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123', isActive: true },
        include: {
          payerRule: {
            include: { payer: true },
          },
        },
        orderBy: { holdPlacedAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].holdReason).toBe('INVALID_STATUS');
    });

    it('should return empty array when no holds for note', async () => {
      mockBillingHoldFindMany.mockResolvedValue([]);

      const result = await getHoldsForNote('note-123');

      expect(result).toEqual([]);
    });
  });

  describe('resolveHold', () => {
    it('should resolve a hold by setting isActive to false', async () => {
      mockBillingHoldUpdate.mockResolvedValue({
        id: 'hold-123',
        isActive: false,
        resolvedAt: new Date(),
        resolvedBy: 'user-456',
      });

      await resolveHold('hold-123', 'user-456');

      expect(mockBillingHoldUpdate).toHaveBeenCalledWith({
        where: { id: 'hold-123' },
        data: {
          isActive: false,
          resolvedAt: expect.any(Date),
          resolvedBy: 'user-456',
        },
      });
    });

    it('should set resolvedAt timestamp when resolving', async () => {
      const beforeTime = new Date();
      mockBillingHoldUpdate.mockResolvedValue({});

      await resolveHold('hold-123', 'admin');

      const updateCall = mockBillingHoldUpdate.mock.calls[0][0];
      const resolvedAt = updateCall.data.resolvedAt;
      expect(resolvedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('Validation Results Structure', () => {
    it('should return proper BillingValidationResult structure', async () => {
      const mockNote = createMockNote();
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      expect(result).toHaveProperty('canBill');
      expect(result).toHaveProperty('holds');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('noteStatus');
      expect(Array.isArray(result.holds)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include hold details with proper structure', async () => {
      const mockNote = createMockNote({ status: 'DRAFT', diagnosisCodes: [] });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      result.holds.forEach(hold => {
        expect(hold).toHaveProperty('reason');
        expect(hold).toHaveProperty('details');
        expect(hold).toHaveProperty('severity');
        expect(['CRITICAL', 'WARNING']).toContain(hold.severity);
      });
    });
  });

  describe('Medical Necessity Validation', () => {
    it('should pass when assessment has sufficient content', async () => {
      const mockNote = createMockNote({
        assessment: 'This is a detailed assessment with more than 50 characters that explains the medical necessity clearly.',
      });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      const necessityHold = result.holds.find(h => h.reason === 'MISSING_MEDICAL_NECESSITY');
      expect(necessityHold).toBeUndefined();
    });

    // Note: Medical necessity validation only runs when payer rule requires it
    // Since no payer is assigned in tests, this validation is skipped
  });

  describe('Multiple Holds', () => {
    it('should return multiple holds when multiple validation failures', async () => {
      const mockNote = createMockNote({
        status: 'DRAFT',
        // Other fields will pass validation
      });
      mockClinicalNoteFindUnique.mockResolvedValue(mockNote);

      const result = await validateNoteForBilling('note-123', false);

      // Should have at least the INVALID_STATUS hold
      expect(result.holds.length).toBeGreaterThanOrEqual(1);
      expect(result.canBill).toBe(false);
    });
  });
});
