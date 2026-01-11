// Create mock functions first
const mockPayerRuleCreate = jest.fn();
const mockPayerRuleUpdate = jest.fn();
const mockPayerRuleFindUnique = jest.fn();
const mockPayerRuleFindMany = jest.fn();
const mockPayerRuleFindFirst = jest.fn();
const mockPayerRuleCount = jest.fn();
const mockPayerRuleGroupBy = jest.fn();
const mockPayerFindFirst = jest.fn();
const mockClinicalNoteFindMany = jest.fn();

// Mock for validateNoteForBilling
const mockValidateNoteForBilling = jest.fn();
jest.mock('../billingReadiness.service', () => ({
  validateNoteForBilling: mockValidateNoteForBilling,
}));

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    payerRule: {
      create: mockPayerRuleCreate,
      update: mockPayerRuleUpdate,
      findUnique: mockPayerRuleFindUnique,
      findMany: mockPayerRuleFindMany,
      findFirst: mockPayerRuleFindFirst,
      count: mockPayerRuleCount,
      groupBy: mockPayerRuleGroupBy,
    },
    payer: {
      findFirst: mockPayerFindFirst,
    },
    clinicalNote: {
      findMany: mockClinicalNoteFindMany,
    },
  },
}));

// Import after mocking
import {
  createPayerRule,
  updatePayerRule,
  deletePayerRule,
  getPayerRuleById,
  getPayerRules,
  findMatchingRule,
  testRuleAgainstNotes,
  bulkImportPayerRules,
  getPayerRuleStats,
} from '../payerRule.service';

describe('Payer Rule Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-11T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockRule = (overrides = {}) => ({
    id: 'rule-123',
    payerId: 'payer-456',
    clinicianCredential: 'LCSW',
    placeOfService: 'OFFICE',
    serviceType: 'THERAPY',
    supervisionRequired: false,
    cosignRequired: false,
    incidentToBillingAllowed: false,
    renderingClinicianOverride: false,
    cosignTimeframeDays: null,
    noteCompletionDays: null,
    diagnosisRequired: true,
    treatmentPlanRequired: true,
    medicalNecessityRequired: true,
    priorAuthRequired: false,
    isProhibited: false,
    prohibitionReason: null,
    effectiveDate: new Date('2026-01-01'),
    terminationDate: null,
    isActive: true,
    createdBy: 'admin-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('createPayerRule', () => {
    it('should create a new payer rule with required fields', async () => {
      const mockRule = createMockRule();
      mockPayerRuleCreate.mockResolvedValue(mockRule);

      const result = await createPayerRule({
        payerId: 'payer-456',
        clinicianCredential: 'LCSW',
        placeOfService: 'OFFICE',
        serviceType: 'THERAPY',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(mockPayerRuleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          payerId: 'payer-456',
          clinicianCredential: 'LCSW',
          placeOfService: 'OFFICE',
          serviceType: 'THERAPY',
          supervisionRequired: false,
          cosignRequired: false,
          diagnosisRequired: true,
          treatmentPlanRequired: true,
          medicalNecessityRequired: true,
        }),
      });
      expect(result).toEqual(mockRule);
    });

    it('should create a rule with supervision required', async () => {
      const mockRule = createMockRule({ supervisionRequired: true, cosignRequired: true });
      mockPayerRuleCreate.mockResolvedValue(mockRule);

      const result = await createPayerRule({
        payerId: 'payer-456',
        clinicianCredential: 'ASSOCIATE',
        placeOfService: 'OFFICE',
        serviceType: 'THERAPY',
        supervisionRequired: true,
        cosignRequired: true,
        cosignTimeframeDays: 7,
        effectiveDate: new Date('2026-01-01'),
      });

      expect(mockPayerRuleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisionRequired: true,
          cosignRequired: true,
          cosignTimeframeDays: 7,
        }),
      });
    });

    it('should create a prohibited rule', async () => {
      const mockRule = createMockRule({
        isProhibited: true,
        prohibitionReason: 'Service not covered under this plan',
      });
      mockPayerRuleCreate.mockResolvedValue(mockRule);

      const result = await createPayerRule({
        payerId: 'payer-456',
        clinicianCredential: 'INTERN',
        placeOfService: 'TELEHEALTH',
        serviceType: 'EVALUATION',
        isProhibited: true,
        prohibitionReason: 'Service not covered under this plan',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(result.isProhibited).toBe(true);
      expect(result.prohibitionReason).toBe('Service not covered under this plan');
    });

    it('should create a rule with termination date', async () => {
      const mockRule = createMockRule({
        terminationDate: new Date('2026-12-31'),
      });
      mockPayerRuleCreate.mockResolvedValue(mockRule);

      const result = await createPayerRule({
        payerId: 'payer-456',
        clinicianCredential: 'LCSW',
        placeOfService: 'OFFICE',
        serviceType: 'THERAPY',
        effectiveDate: new Date('2026-01-01'),
        terminationDate: new Date('2026-12-31'),
      });

      expect(result.terminationDate).toEqual(new Date('2026-12-31'));
    });

    it('should create a rule with prior auth required', async () => {
      const mockRule = createMockRule({ priorAuthRequired: true });
      mockPayerRuleCreate.mockResolvedValue(mockRule);

      const result = await createPayerRule({
        payerId: 'payer-456',
        clinicianCredential: 'LCSW',
        placeOfService: 'OFFICE',
        serviceType: 'INTENSIVE_OUTPATIENT',
        priorAuthRequired: true,
        effectiveDate: new Date('2026-01-01'),
      });

      expect(result.priorAuthRequired).toBe(true);
    });
  });

  describe('updatePayerRule', () => {
    it('should update a single field', async () => {
      const mockRule = createMockRule({ supervisionRequired: true });
      mockPayerRuleUpdate.mockResolvedValue(mockRule);

      const result = await updatePayerRule('rule-123', {
        supervisionRequired: true,
      });

      expect(mockPayerRuleUpdate).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { supervisionRequired: true },
      });
    });

    it('should update multiple fields', async () => {
      const mockRule = createMockRule({
        supervisionRequired: true,
        cosignRequired: true,
        cosignTimeframeDays: 14,
      });
      mockPayerRuleUpdate.mockResolvedValue(mockRule);

      const result = await updatePayerRule('rule-123', {
        supervisionRequired: true,
        cosignRequired: true,
        cosignTimeframeDays: 14,
      });

      expect(mockPayerRuleUpdate).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: {
          supervisionRequired: true,
          cosignRequired: true,
          cosignTimeframeDays: 14,
        },
      });
    });
  });

  describe('deletePayerRule', () => {
    it('should soft delete by setting isActive to false', async () => {
      const mockRule = createMockRule({ isActive: false });
      mockPayerRuleUpdate.mockResolvedValue(mockRule);

      const result = await deletePayerRule('rule-123');

      expect(mockPayerRuleUpdate).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });

  describe('getPayerRuleById', () => {
    it('should return rule with payer included', async () => {
      const mockRule = {
        ...createMockRule(),
        payer: { id: 'payer-456', name: 'Blue Cross', payerType: 'COMMERCIAL' },
      };
      mockPayerRuleFindUnique.mockResolvedValue(mockRule);

      const result = await getPayerRuleById('rule-123');

      expect(mockPayerRuleFindUnique).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        include: { payer: true },
      });
      expect(result?.payer.name).toBe('Blue Cross');
    });

    it('should return null for non-existent rule', async () => {
      mockPayerRuleFindUnique.mockResolvedValue(null);

      const result = await getPayerRuleById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPayerRules', () => {
    it('should return all rules without filters', async () => {
      const mockRules = [
        { ...createMockRule(), payer: { id: 'payer-1', name: 'Blue Cross' } },
        { ...createMockRule({ id: 'rule-456' }), payer: { id: 'payer-2', name: 'Aetna' } },
      ];
      mockPayerRuleFindMany.mockResolvedValue(mockRules);

      const result = await getPayerRules();

      expect(mockPayerRuleFindMany).toHaveBeenCalledWith({
        where: {},
        include: { payer: true },
        orderBy: [
          { payer: { name: 'asc' } },
          { clinicianCredential: 'asc' },
          { serviceType: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by payerId', async () => {
      mockPayerRuleFindMany.mockResolvedValue([]);

      await getPayerRules({ payerId: 'payer-456' });

      expect(mockPayerRuleFindMany).toHaveBeenCalledWith({
        where: { payerId: 'payer-456' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by clinician credential', async () => {
      mockPayerRuleFindMany.mockResolvedValue([]);

      await getPayerRules({ clinicianCredential: 'LCSW' });

      expect(mockPayerRuleFindMany).toHaveBeenCalledWith({
        where: { clinicianCredential: 'LCSW' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by service type', async () => {
      mockPayerRuleFindMany.mockResolvedValue([]);

      await getPayerRules({ serviceType: 'THERAPY' });

      expect(mockPayerRuleFindMany).toHaveBeenCalledWith({
        where: { serviceType: 'THERAPY' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by prohibited status', async () => {
      mockPayerRuleFindMany.mockResolvedValue([]);

      await getPayerRules({ isProhibited: true });

      expect(mockPayerRuleFindMany).toHaveBeenCalledWith({
        where: { isProhibited: true },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should combine multiple filters', async () => {
      mockPayerRuleFindMany.mockResolvedValue([]);

      await getPayerRules({
        payerId: 'payer-456',
        clinicianCredential: 'LCSW',
        serviceType: 'THERAPY',
        placeOfService: 'OFFICE',
        isActive: true,
      });

      expect(mockPayerRuleFindMany).toHaveBeenCalledWith({
        where: {
          payerId: 'payer-456',
          clinicianCredential: 'LCSW',
          serviceType: 'THERAPY',
          placeOfService: 'OFFICE',
          isActive: true,
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe('findMatchingRule', () => {
    it('should find matching active rule', async () => {
      const mockRule = {
        ...createMockRule(),
        payer: { id: 'payer-456', name: 'Blue Cross' },
      };
      mockPayerRuleFindFirst.mockResolvedValue(mockRule);

      const result = await findMatchingRule(
        'payer-456',
        'LCSW',
        'THERAPY',
        'OFFICE'
      );

      expect(mockPayerRuleFindFirst).toHaveBeenCalledWith({
        where: {
          payerId: 'payer-456',
          clinicianCredential: 'LCSW',
          serviceType: 'THERAPY',
          placeOfService: 'OFFICE',
          isActive: true,
          effectiveDate: { lte: expect.any(Date) },
          OR: [
            { terminationDate: null },
            { terminationDate: { gte: expect.any(Date) } },
          ],
        },
        include: { payer: true },
        orderBy: { effectiveDate: 'desc' },
      });
      expect(result).toEqual(mockRule);
    });

    it('should return null when no matching rule found', async () => {
      mockPayerRuleFindFirst.mockResolvedValue(null);

      const result = await findMatchingRule(
        'payer-456',
        'UNKNOWN',
        'THERAPY',
        'OFFICE'
      );

      expect(result).toBeNull();
    });
  });

  describe('testRuleAgainstNotes', () => {
    it('should test rule against notes and return results', async () => {
      const mockRule = {
        ...createMockRule(),
        payer: { id: 'payer-456', name: 'Blue Cross' },
      };
      mockPayerRuleFindUnique.mockResolvedValue(mockRule);
      mockClinicalNoteFindMany.mockResolvedValue([
        {
          id: 'note-1',
          clientId: 'client-1',
          sessionDate: new Date('2026-01-05'),
          clinician: { credential: 'LCSW' },
          appointment: { client: { id: 'client-1' } },
        },
        {
          id: 'note-2',
          clientId: 'client-2',
          sessionDate: new Date('2026-01-06'),
          clinician: { credential: 'LCSW' },
          appointment: { client: { id: 'client-2' } },
        },
      ]);
      mockValidateNoteForBilling
        .mockResolvedValueOnce({ canBill: true, holds: [] })
        .mockResolvedValueOnce({
          canBill: false,
          holds: [{ reason: 'MISSING_DIAGNOSIS' }],
        });

      const result = await testRuleAgainstNotes('rule-123');

      expect(result.ruleId).toBe('rule-123');
      expect(result.noteTested).toBe(2);
      expect(result.wouldPass).toBe(1);
      expect(result.wouldBlock).toBe(1);
      expect(result.blockedNotes).toHaveLength(1);
      expect(result.blockedNotes[0].noteId).toBe('note-2');
      expect(result.blockedNotes[0].holds).toContain('MISSING_DIAGNOSIS');
    });

    it('should throw error for non-existent rule', async () => {
      mockPayerRuleFindUnique.mockResolvedValue(null);

      await expect(testRuleAgainstNotes('nonexistent')).rejects.toThrow(
        /Payer rule nonexistent not found/
      );
    });

    it('should filter by date range', async () => {
      const mockRule = createMockRule();
      mockPayerRuleFindUnique.mockResolvedValue(mockRule);
      mockClinicalNoteFindMany.mockResolvedValue([]);

      await testRuleAgainstNotes(
        'rule-123',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(mockClinicalNoteFindMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          sessionDate: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        }),
        include: expect.any(Object),
        take: 100,
      });
    });
  });

  describe('bulkImportPayerRules', () => {
    const validCsvRow = {
      payerName: 'Blue Cross',
      clinicianCredential: 'lcsw',
      placeOfService: 'office',
      serviceType: 'therapy',
      supervisionRequired: 'false',
      cosignRequired: 'false',
      cosignTimeframeDays: '',
      noteCompletionDays: '',
      incidentToBillingAllowed: 'false',
      renderingClinicianOverride: 'false',
      diagnosisRequired: 'true',
      treatmentPlanRequired: 'true',
      medicalNecessityRequired: 'true',
      priorAuthRequired: 'false',
      isProhibited: 'false',
      prohibitionReason: '',
      effectiveDate: '2026-01-01',
      terminationDate: '',
    };

    it('should successfully import valid CSV data', async () => {
      mockPayerFindFirst.mockResolvedValue({ id: 'payer-123', name: 'Blue Cross' });
      mockPayerRuleCreate.mockResolvedValue(createMockRule());

      const result = await bulkImportPayerRules([validCsvRow], 'admin-123');

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.createdRules).toHaveLength(1);
    });

    it('should handle payer not found error', async () => {
      mockPayerFindFirst.mockResolvedValue(null);

      const result = await bulkImportPayerRules([validCsvRow], 'admin-123');

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain("Payer 'Blue Cross' not found");
      expect(result.errors[0].row).toBe(2);
    });

    it('should import multiple rows with mixed results', async () => {
      mockPayerFindFirst
        .mockResolvedValueOnce({ id: 'payer-123', name: 'Blue Cross' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payer-456', name: 'Aetna' });
      mockPayerRuleCreate
        .mockResolvedValueOnce(createMockRule())
        .mockResolvedValueOnce(createMockRule({ id: 'rule-789' }));

      const result = await bulkImportPayerRules([
        validCsvRow,
        { ...validCsvRow, payerName: 'Unknown Payer' },
        { ...validCsvRow, payerName: 'Aetna' },
      ], 'admin-123');

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.createdRules).toHaveLength(2);
    });

    it('should parse boolean values correctly', async () => {
      mockPayerFindFirst.mockResolvedValue({ id: 'payer-123', name: 'Blue Cross' });
      mockPayerRuleCreate.mockResolvedValue(createMockRule());

      // Test various boolean representations
      const rowWithBooleans = {
        ...validCsvRow,
        supervisionRequired: 'yes',
        cosignRequired: '1',
        diagnosisRequired: 'Y',
        priorAuthRequired: 'TRUE',
      };

      await bulkImportPayerRules([rowWithBooleans], 'admin-123');

      expect(mockPayerRuleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisionRequired: true,
          cosignRequired: true,
          diagnosisRequired: true,
          priorAuthRequired: true,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPayerFindFirst.mockResolvedValue({ id: 'payer-123', name: 'Blue Cross' });
      mockPayerRuleCreate.mockRejectedValue(new Error('Database connection failed'));

      const result = await bulkImportPayerRules([validCsvRow], 'admin-123');

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('Database connection failed');
    });

    it('should parse numeric fields', async () => {
      mockPayerFindFirst.mockResolvedValue({ id: 'payer-123', name: 'Blue Cross' });
      mockPayerRuleCreate.mockResolvedValue(createMockRule());

      const rowWithNumbers = {
        ...validCsvRow,
        cosignTimeframeDays: '7',
        noteCompletionDays: '14',
      };

      await bulkImportPayerRules([rowWithNumbers], 'admin-123');

      expect(mockPayerRuleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cosignTimeframeDays: 7,
          noteCompletionDays: 14,
        }),
      });
    });

    it('should uppercase credential and service type', async () => {
      mockPayerFindFirst.mockResolvedValue({ id: 'payer-123', name: 'Blue Cross' });
      mockPayerRuleCreate.mockResolvedValue(createMockRule());

      const rowWithLowercase = {
        ...validCsvRow,
        clinicianCredential: 'lcsw',
        placeOfService: 'telehealth',
        serviceType: 'evaluation',
      };

      await bulkImportPayerRules([rowWithLowercase], 'admin-123');

      expect(mockPayerRuleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinicianCredential: 'LCSW',
          placeOfService: 'TELEHEALTH',
          serviceType: 'EVALUATION',
        }),
      });
    });
  });

  describe('getPayerRuleStats', () => {
    it('should return comprehensive statistics', async () => {
      mockPayerRuleCount
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(45)  // active
        .mockResolvedValueOnce(3);  // prohibited
      mockPayerRuleGroupBy
        .mockResolvedValueOnce([
          { clinicianCredential: 'LCSW', _count: { id: 20 } },
          { clinicianCredential: 'PHD', _count: { id: 15 } },
          { clinicianCredential: 'LMFT', _count: { id: 10 } },
        ])
        .mockResolvedValueOnce([
          { serviceType: 'THERAPY', _count: { id: 30 } },
          { serviceType: 'EVALUATION', _count: { id: 15 } },
        ]);

      const result = await getPayerRuleStats();

      expect(result).toEqual({
        total: 50,
        active: 45,
        inactive: 5,
        prohibited: 3,
        byCredential: {
          LCSW: 20,
          PHD: 15,
          LMFT: 10,
        },
        byService: {
          THERAPY: 30,
          EVALUATION: 15,
        },
      });
    });

    it('should handle empty statistics', async () => {
      mockPayerRuleCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPayerRuleGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getPayerRuleStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        prohibited: 0,
        byCredential: {},
        byService: {},
      });
    });
  });
});
