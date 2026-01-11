// Create mock functions first
const mockPayerCreate = jest.fn();
const mockPayerUpdate = jest.fn();
const mockPayerDelete = jest.fn();
const mockPayerFindUnique = jest.fn();
const mockPayerFindMany = jest.fn();
const mockPayerFindFirst = jest.fn();
const mockPayerCount = jest.fn();
const mockPayerGroupBy = jest.fn();
const mockPayerRuleCount = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    payer: {
      create: mockPayerCreate,
      update: mockPayerUpdate,
      delete: mockPayerDelete,
      findUnique: mockPayerFindUnique,
      findMany: mockPayerFindMany,
      findFirst: mockPayerFindFirst,
      count: mockPayerCount,
      groupBy: mockPayerGroupBy,
    },
    payerRule: {
      count: mockPayerRuleCount,
    },
  },
}));

// Import after mocking
import {
  createPayer,
  updatePayer,
  deletePayer,
  getPayerById,
  getPayers,
  getPayerStats,
} from '../payer.service';

describe('Payer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayer', () => {
    it('should create a new payer with all required fields', async () => {
      const mockPayer = {
        id: 'payer-123',
        name: 'Blue Cross Blue Shield',
        payerType: 'COMMERCIAL',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerCreate.mockResolvedValue(mockPayer);

      const result = await createPayer({
        name: 'Blue Cross Blue Shield',
        payerType: 'COMMERCIAL',
      });

      expect(mockPayerCreate).toHaveBeenCalledWith({
        data: {
          name: 'Blue Cross Blue Shield',
          payerType: 'COMMERCIAL',
          requiresPreAuth: false,
          isActive: true,
        },
      });
      expect(result).toEqual(mockPayer);
    });

    it('should create a payer with custom requiresPreAuth', async () => {
      const mockPayer = {
        id: 'payer-124',
        name: 'Medicare',
        payerType: 'MEDICARE',
        requiresPreAuth: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerCreate.mockResolvedValue(mockPayer);

      const result = await createPayer({
        name: 'Medicare',
        payerType: 'MEDICARE',
        requiresPreAuth: true,
      });

      expect(mockPayerCreate).toHaveBeenCalledWith({
        data: {
          name: 'Medicare',
          payerType: 'MEDICARE',
          requiresPreAuth: true,
          isActive: true,
        },
      });
      expect(result.requiresPreAuth).toBe(true);
    });

    it('should create an inactive payer', async () => {
      const mockPayer = {
        id: 'payer-125',
        name: 'Old Payer',
        payerType: 'COMMERCIAL',
        requiresPreAuth: false,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerCreate.mockResolvedValue(mockPayer);

      const result = await createPayer({
        name: 'Old Payer',
        payerType: 'COMMERCIAL',
        isActive: false,
      });

      expect(mockPayerCreate).toHaveBeenCalledWith({
        data: {
          name: 'Old Payer',
          payerType: 'COMMERCIAL',
          requiresPreAuth: false,
          isActive: false,
        },
      });
      expect(result.isActive).toBe(false);
    });

    it('should create a MEDICAID payer', async () => {
      const mockPayer = {
        id: 'payer-126',
        name: 'State Medicaid',
        payerType: 'MEDICAID',
        requiresPreAuth: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerCreate.mockResolvedValue(mockPayer);

      const result = await createPayer({
        name: 'State Medicaid',
        payerType: 'MEDICAID',
        requiresPreAuth: true,
      });

      expect(result.payerType).toBe('MEDICAID');
    });

    it('should create an EAP payer', async () => {
      const mockPayer = {
        id: 'payer-127',
        name: 'Employee Assistance Program',
        payerType: 'EAP',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerCreate.mockResolvedValue(mockPayer);

      const result = await createPayer({
        name: 'Employee Assistance Program',
        payerType: 'EAP',
      });

      expect(result.payerType).toBe('EAP');
    });

    it('should create a SELF_PAY payer', async () => {
      const mockPayer = {
        id: 'payer-128',
        name: 'Self Pay',
        payerType: 'SELF_PAY',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerCreate.mockResolvedValue(mockPayer);

      const result = await createPayer({
        name: 'Self Pay',
        payerType: 'SELF_PAY',
      });

      expect(result.payerType).toBe('SELF_PAY');
    });
  });

  describe('updatePayer', () => {
    it('should update payer name', async () => {
      const mockPayer = {
        id: 'payer-123',
        name: 'Updated Name',
        payerType: 'COMMERCIAL',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerUpdate.mockResolvedValue(mockPayer);

      const result = await updatePayer('payer-123', { name: 'Updated Name' });

      expect(mockPayerUpdate).toHaveBeenCalledWith({
        where: { id: 'payer-123' },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should update payer type', async () => {
      const mockPayer = {
        id: 'payer-123',
        name: 'Test Payer',
        payerType: 'MEDICAID',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerUpdate.mockResolvedValue(mockPayer);

      const result = await updatePayer('payer-123', { payerType: 'MEDICAID' });

      expect(mockPayerUpdate).toHaveBeenCalledWith({
        where: { id: 'payer-123' },
        data: { payerType: 'MEDICAID' },
      });
      expect(result.payerType).toBe('MEDICAID');
    });

    it('should update multiple fields', async () => {
      const mockPayer = {
        id: 'payer-123',
        name: 'New Name',
        payerType: 'MEDICARE',
        requiresPreAuth: true,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerUpdate.mockResolvedValue(mockPayer);

      const result = await updatePayer('payer-123', {
        name: 'New Name',
        payerType: 'MEDICARE',
        requiresPreAuth: true,
        isActive: false,
      });

      expect(mockPayerUpdate).toHaveBeenCalledWith({
        where: { id: 'payer-123' },
        data: {
          name: 'New Name',
          payerType: 'MEDICARE',
          requiresPreAuth: true,
          isActive: false,
        },
      });
    });
  });

  describe('deletePayer', () => {
    it('should soft delete payer with existing rules', async () => {
      mockPayerRuleCount.mockResolvedValue(5);
      const mockPayer = {
        id: 'payer-123',
        name: 'Test Payer',
        payerType: 'COMMERCIAL',
        requiresPreAuth: false,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerUpdate.mockResolvedValue(mockPayer);

      const result = await deletePayer('payer-123');

      expect(mockPayerRuleCount).toHaveBeenCalledWith({
        where: { payerId: 'payer-123' },
      });
      expect(mockPayerUpdate).toHaveBeenCalledWith({
        where: { id: 'payer-123' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should hard delete payer with no rules', async () => {
      mockPayerRuleCount.mockResolvedValue(0);
      const mockPayer = {
        id: 'payer-123',
        name: 'Test Payer',
        payerType: 'COMMERCIAL',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPayerDelete.mockResolvedValue(mockPayer);

      const result = await deletePayer('payer-123');

      expect(mockPayerRuleCount).toHaveBeenCalledWith({
        where: { payerId: 'payer-123' },
      });
      expect(mockPayerDelete).toHaveBeenCalledWith({
        where: { id: 'payer-123' },
      });
      expect(mockPayerUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getPayerById', () => {
    it('should return payer with rules', async () => {
      const mockPayer = {
        id: 'payer-123',
        name: 'Blue Cross',
        payerType: 'COMMERCIAL',
        requiresPreAuth: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        rules: [
          { id: 'rule-1', serviceType: 'THERAPY', isActive: true },
          { id: 'rule-2', serviceType: 'EVALUATION', isActive: true },
        ],
      };
      mockPayerFindUnique.mockResolvedValue(mockPayer);

      const result = await getPayerById('payer-123');

      expect(mockPayerFindUnique).toHaveBeenCalledWith({
        where: { id: 'payer-123' },
        include: {
          rules: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(result).toEqual(mockPayer);
      expect(result?.rules).toHaveLength(2);
    });

    it('should return null for non-existent payer', async () => {
      mockPayerFindUnique.mockResolvedValue(null);

      const result = await getPayerById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPayers', () => {
    it('should return all payers without filters', async () => {
      const mockPayers = [
        { id: 'payer-1', name: 'Blue Cross', payerType: 'COMMERCIAL', isActive: true, _count: { rules: 5 } },
        { id: 'payer-2', name: 'Medicare', payerType: 'MEDICARE', isActive: true, _count: { rules: 3 } },
      ];
      mockPayerFindMany.mockResolvedValue(mockPayers);

      const result = await getPayers();

      expect(mockPayerFindMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: { rules: true },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by payer type', async () => {
      const mockPayers = [
        { id: 'payer-1', name: 'Medicare', payerType: 'MEDICARE', isActive: true, _count: { rules: 3 } },
      ];
      mockPayerFindMany.mockResolvedValue(mockPayers);

      const result = await getPayers({ payerType: 'MEDICARE' });

      expect(mockPayerFindMany).toHaveBeenCalledWith({
        where: { payerType: 'MEDICARE' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(1);
      expect(result[0].payerType).toBe('MEDICARE');
    });

    it('should filter by active status', async () => {
      const mockPayers = [
        { id: 'payer-1', name: 'Blue Cross', payerType: 'COMMERCIAL', isActive: true, _count: { rules: 5 } },
      ];
      mockPayerFindMany.mockResolvedValue(mockPayers);

      const result = await getPayers({ isActive: true });

      expect(mockPayerFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by search term', async () => {
      const mockPayers = [
        { id: 'payer-1', name: 'Blue Cross Blue Shield', payerType: 'COMMERCIAL', isActive: true, _count: { rules: 5 } },
      ];
      mockPayerFindMany.mockResolvedValue(mockPayers);

      const result = await getPayers({ search: 'Blue' });

      expect(mockPayerFindMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Blue',
            mode: 'insensitive',
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should combine multiple filters', async () => {
      const mockPayers = [
        { id: 'payer-1', name: 'Blue Cross', payerType: 'COMMERCIAL', isActive: true, _count: { rules: 5 } },
      ];
      mockPayerFindMany.mockResolvedValue(mockPayers);

      const result = await getPayers({
        payerType: 'COMMERCIAL',
        isActive: true,
        search: 'Blue',
      });

      expect(mockPayerFindMany).toHaveBeenCalledWith({
        where: {
          payerType: 'COMMERCIAL',
          isActive: true,
          name: {
            contains: 'Blue',
            mode: 'insensitive',
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe('getPayerStats', () => {
    it('should return comprehensive statistics', async () => {
      mockPayerCount
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(8);  // active
      mockPayerGroupBy.mockResolvedValue([
        { payerType: 'COMMERCIAL', _count: { id: 5 } },
        { payerType: 'MEDICARE', _count: { id: 2 } },
        { payerType: 'MEDICAID', _count: { id: 1 } },
      ]);

      const result = await getPayerStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byType: {
          COMMERCIAL: 5,
          MEDICARE: 2,
          MEDICAID: 1,
        },
      });
    });

    it('should handle empty statistics', async () => {
      mockPayerCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPayerGroupBy.mockResolvedValue([]);

      const result = await getPayerStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        byType: {},
      });
    });

    it('should correctly calculate inactive count', async () => {
      mockPayerCount
        .mockResolvedValueOnce(15)  // total
        .mockResolvedValueOnce(10); // active
      mockPayerGroupBy.mockResolvedValue([]);

      const result = await getPayerStats();

      expect(result.total).toBe(15);
      expect(result.active).toBe(10);
      expect(result.inactive).toBe(5);
    });
  });
});
