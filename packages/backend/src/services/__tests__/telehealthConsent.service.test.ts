// Create mock functions first
const mockConsentFindFirst = jest.fn();
const mockConsentFindMany = jest.fn();
const mockConsentCreate = jest.fn();
const mockConsentUpdate = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    telehealthConsent: {
      findFirst: mockConsentFindFirst,
      findMany: mockConsentFindMany,
      create: mockConsentCreate,
      update: mockConsentUpdate,
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import {
  getOrCreateTelehealthConsent,
  signTelehealthConsent,
  hasValidTelehealthConsent,
  withdrawTelehealthConsent,
  getClientTelehealthConsents,
} from '../telehealthConsent.service';

describe('Telehealth Consent Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateTelehealthConsent', () => {
    it('should return existing active consent if found', async () => {
      const existingConsent = {
        id: 'consent-123',
        clientId: 'client-123',
        consentType: 'Georgia_Telehealth',
        isActive: true,
        consentWithdrawn: false,
        expirationDate: new Date(Date.now() + 86400000), // Tomorrow
      };
      mockConsentFindFirst.mockResolvedValue(existingConsent);

      const result = await getOrCreateTelehealthConsent({
        clientId: 'client-123',
        consentType: 'Georgia_Telehealth',
        createdBy: 'user-123',
      });

      expect(result).toEqual(existingConsent);
      expect(mockConsentCreate).not.toHaveBeenCalled();
    });

    it('should create new consent if none exists', async () => {
      mockConsentFindFirst.mockResolvedValue(null);
      const newConsent = {
        id: 'new-consent-123',
        clientId: 'client-123',
        consentType: 'Georgia_Telehealth',
        isActive: true,
      };
      mockConsentCreate.mockResolvedValue(newConsent);

      const result = await getOrCreateTelehealthConsent({
        clientId: 'client-123',
        consentType: 'Georgia_Telehealth',
        createdBy: 'user-123',
      });

      expect(mockConsentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client-123',
          consentType: 'Georgia_Telehealth',
          createdBy: 'user-123',
          lastModifiedBy: 'user-123',
        }),
      });
      expect(result).toEqual(newConsent);
    });

    it('should create new consent with expiration date 1 year from now', async () => {
      mockConsentFindFirst.mockResolvedValue(null);
      mockConsentCreate.mockResolvedValue({ id: 'consent-123' });

      await getOrCreateTelehealthConsent({
        clientId: 'client-123',
        consentType: 'Georgia_Telehealth',
        createdBy: 'user-123',
      });

      const createCall = mockConsentCreate.mock.calls[0][0];
      const expirationDate = new Date(createCall.data.expirationDate);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      // Expiration should be within 1 day of exactly 1 year from now
      const diffInDays = Math.abs(expirationDate.getTime() - oneYearFromNow.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeLessThan(1);
    });

    it('should create HIPAA_Telehealth consent type', async () => {
      mockConsentFindFirst.mockResolvedValue(null);
      mockConsentCreate.mockResolvedValue({ id: 'consent-123', consentType: 'HIPAA_Telehealth' });

      const result = await getOrCreateTelehealthConsent({
        clientId: 'client-123',
        consentType: 'HIPAA_Telehealth',
        createdBy: 'user-123',
      });

      expect(mockConsentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentType: 'HIPAA_Telehealth',
          consentText: expect.stringContaining('HIPAA TELEHEALTH PRIVACY CONSENT'),
        }),
      });
    });

    it('should create Recording consent type', async () => {
      mockConsentFindFirst.mockResolvedValue(null);
      mockConsentCreate.mockResolvedValue({ id: 'consent-123', consentType: 'Recording' });

      await getOrCreateTelehealthConsent({
        clientId: 'client-123',
        consentType: 'Recording',
        createdBy: 'user-123',
      });

      expect(mockConsentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentType: 'Recording',
          consentText: expect.stringContaining('SESSION RECORDING CONSENT'),
        }),
      });
    });
  });

  describe('signTelehealthConsent', () => {
    it('should sign consent with all Georgia requirements acknowledged', async () => {
      const signedConsent = {
        id: 'consent-123',
        consentGiven: true,
        patientRightsAcknowledged: true,
        emergencyProtocolsUnderstood: true,
        privacyRisksAcknowledged: true,
        technologyRequirementsUnderstood: true,
        consentDate: new Date(),
      };
      mockConsentUpdate.mockResolvedValue(signedConsent);

      const result = await signTelehealthConsent(
        'consent-123',
        {
          consentGiven: true,
          patientRightsAcknowledged: true,
          emergencyProtocolsUnderstood: true,
          privacyRisksAcknowledged: true,
          technologyRequirementsUnderstood: true,
          clientSignature: 'John Doe',
          clientIPAddress: '192.168.1.1',
        },
        'user-123'
      );

      expect(result.consentGiven).toBe(true);
      expect(mockConsentUpdate).toHaveBeenCalledWith({
        where: { id: 'consent-123' },
        data: expect.objectContaining({
          consentGiven: true,
          patientRightsAcknowledged: true,
          consentDate: expect.any(Date),
          lastModifiedBy: 'user-123',
        }),
      });
    });

    it('should throw error if Georgia requirements not acknowledged', async () => {
      await expect(
        signTelehealthConsent(
          'consent-123',
          {
            consentGiven: true,
            patientRightsAcknowledged: true,
            // Missing other required acknowledgments
          },
          'user-123'
        )
      ).rejects.toThrow('All Georgia telehealth consent requirements must be acknowledged');
    });

    it('should allow signing without all requirements when consent is false', async () => {
      mockConsentUpdate.mockResolvedValue({
        id: 'consent-123',
        consentGiven: false,
      });

      const result = await signTelehealthConsent(
        'consent-123',
        {
          consentGiven: false,
        },
        'user-123'
      );

      expect(result.consentGiven).toBe(false);
    });

    it('should set consentDate to null when consent is false', async () => {
      mockConsentUpdate.mockResolvedValue({ id: 'consent-123' });

      await signTelehealthConsent(
        'consent-123',
        { consentGiven: false },
        'user-123'
      );

      expect(mockConsentUpdate).toHaveBeenCalledWith({
        where: { id: 'consent-123' },
        data: expect.objectContaining({
          consentDate: null,
        }),
      });
    });
  });

  describe('hasValidTelehealthConsent', () => {
    it('should return true if valid consent exists', async () => {
      mockConsentFindFirst.mockResolvedValue({
        id: 'consent-123',
        consentGiven: true,
        isActive: true,
        consentWithdrawn: false,
        expirationDate: new Date(Date.now() + 86400000),
      });

      const result = await hasValidTelehealthConsent('client-123');

      expect(result).toBe(true);
    });

    it('should return false if no consent exists', async () => {
      mockConsentFindFirst.mockResolvedValue(null);

      const result = await hasValidTelehealthConsent('client-123');

      expect(result).toBe(false);
    });

    it('should check consent for specific consent type', async () => {
      mockConsentFindFirst.mockResolvedValue(null);

      await hasValidTelehealthConsent('client-123', 'Recording');

      expect(mockConsentFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clientId: 'client-123',
          consentType: 'Recording',
        }),
      });
    });

    it('should default to Georgia_Telehealth consent type', async () => {
      mockConsentFindFirst.mockResolvedValue(null);

      await hasValidTelehealthConsent('client-123');

      expect(mockConsentFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          consentType: 'Georgia_Telehealth',
        }),
      });
    });

    it('should return false on error and not throw', async () => {
      mockConsentFindFirst.mockRejectedValue(new Error('Database error'));

      const result = await hasValidTelehealthConsent('client-123');

      expect(result).toBe(false);
    });
  });

  describe('withdrawTelehealthConsent', () => {
    it('should withdraw consent with reason', async () => {
      const withdrawnConsent = {
        id: 'consent-123',
        consentWithdrawn: true,
        withdrawalDate: new Date(),
        withdrawalReason: 'Client request',
        isActive: false,
      };
      mockConsentUpdate.mockResolvedValue(withdrawnConsent);

      const result = await withdrawTelehealthConsent(
        'consent-123',
        'Client request',
        'user-123'
      );

      expect(mockConsentUpdate).toHaveBeenCalledWith({
        where: { id: 'consent-123' },
        data: {
          consentWithdrawn: true,
          withdrawalDate: expect.any(Date),
          withdrawalReason: 'Client request',
          isActive: false,
          lastModifiedBy: 'user-123',
        },
      });
      expect(result.consentWithdrawn).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should handle withdrawal without specific reason', async () => {
      mockConsentUpdate.mockResolvedValue({
        id: 'consent-123',
        consentWithdrawn: true,
        withdrawalReason: '',
      });

      const result = await withdrawTelehealthConsent(
        'consent-123',
        '',
        'user-123'
      );

      expect(result.consentWithdrawn).toBe(true);
    });
  });

  describe('getClientTelehealthConsents', () => {
    it('should return all consents for a client', async () => {
      const consents = [
        { id: 'consent-1', consentType: 'Georgia_Telehealth', isActive: true },
        { id: 'consent-2', consentType: 'Recording', isActive: false },
        { id: 'consent-3', consentType: 'HIPAA_Telehealth', isActive: true },
      ];
      mockConsentFindMany.mockResolvedValue(consents);

      const result = await getClientTelehealthConsents('client-123');

      expect(mockConsentFindMany).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(3);
    });

    it('should return empty array if no consents', async () => {
      mockConsentFindMany.mockResolvedValue([]);

      const result = await getClientTelehealthConsents('client-123');

      expect(result).toEqual([]);
    });

    it('should order consents by createdAt descending', async () => {
      mockConsentFindMany.mockResolvedValue([]);

      await getClientTelehealthConsents('client-123');

      expect(mockConsentFindMany).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
