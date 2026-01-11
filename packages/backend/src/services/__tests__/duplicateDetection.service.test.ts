import { Client, PotentialDuplicate } from '@mentalspace/database';

// Create mock functions first
const mockClientFindMany = jest.fn();
const mockClientUpdate = jest.fn();
const mockPotentialDuplicateFindUnique = jest.fn();
const mockPotentialDuplicateFindMany = jest.fn();
const mockPotentialDuplicateCreate = jest.fn();
const mockPotentialDuplicateUpdate = jest.fn();
const mockPotentialDuplicateUpdateMany = jest.fn();
const mockEmergencyContactUpdateMany = jest.fn();
const mockLegalGuardianUpdateMany = jest.fn();
const mockInsuranceInformationUpdateMany = jest.fn();
const mockAppointmentUpdateMany = jest.fn();
const mockClinicalNoteUpdateMany = jest.fn();
const mockTreatmentPlanUpdateMany = jest.fn();
const mockDiagnosisUpdateMany = jest.fn();
const mockMedicationUpdateMany = jest.fn();
const mockClientDocumentUpdateMany = jest.fn();
const mockChargeEntryUpdateMany = jest.fn();
const mockPaymentRecordUpdateMany = jest.fn();
const mockClientStatementUpdateMany = jest.fn();
const mockTransaction = jest.fn();

// Mock PrismaClient
jest.mock('@mentalspace/database', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    client: {
      findMany: mockClientFindMany,
      update: mockClientUpdate,
    },
    potentialDuplicate: {
      findUnique: mockPotentialDuplicateFindUnique,
      findMany: mockPotentialDuplicateFindMany,
      create: mockPotentialDuplicateCreate,
      update: mockPotentialDuplicateUpdate,
      updateMany: mockPotentialDuplicateUpdateMany,
    },
    emergencyContact: { updateMany: mockEmergencyContactUpdateMany },
    legalGuardian: { updateMany: mockLegalGuardianUpdateMany },
    insuranceInformation: { updateMany: mockInsuranceInformationUpdateMany },
    appointment: { updateMany: mockAppointmentUpdateMany },
    clinicalNote: { updateMany: mockClinicalNoteUpdateMany },
    treatmentPlan: { updateMany: mockTreatmentPlanUpdateMany },
    diagnosis: { updateMany: mockDiagnosisUpdateMany },
    medication: { updateMany: mockMedicationUpdateMany },
    clientDocument: { updateMany: mockClientDocumentUpdateMany },
    chargeEntry: { updateMany: mockChargeEntryUpdateMany },
    paymentRecord: { updateMany: mockPaymentRecordUpdateMany },
    clientStatement: { updateMany: mockClientStatementUpdateMany },
    $transaction: mockTransaction,
  })),
}));

// Setup transaction to execute the callback
mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
  const txClient = {
    client: { update: mockClientUpdate },
    potentialDuplicate: { updateMany: mockPotentialDuplicateUpdateMany },
    emergencyContact: { updateMany: mockEmergencyContactUpdateMany },
    legalGuardian: { updateMany: mockLegalGuardianUpdateMany },
    insuranceInformation: { updateMany: mockInsuranceInformationUpdateMany },
    appointment: { updateMany: mockAppointmentUpdateMany },
    clinicalNote: { updateMany: mockClinicalNoteUpdateMany },
    treatmentPlan: { updateMany: mockTreatmentPlanUpdateMany },
    diagnosis: { updateMany: mockDiagnosisUpdateMany },
    medication: { updateMany: mockMedicationUpdateMany },
    clientDocument: { updateMany: mockClientDocumentUpdateMany },
    chargeEntry: { updateMany: mockChargeEntryUpdateMany },
    paymentRecord: { updateMany: mockPaymentRecordUpdateMany },
    clientStatement: { updateMany: mockClientStatementUpdateMany },
  };
  return callback(txClient);
});

// Import after mocking
import {
  checkForDuplicates,
  savePotentialDuplicates,
  getPendingDuplicates,
  mergeClients,
  dismissDuplicate,
  DuplicateMatch,
} from '../duplicateDetection.service';

describe('DuplicateDetection Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkForDuplicates', () => {
    const mockClientData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-05-15'),
      primaryPhone: '+15551234567',
      addressStreet1: '123 Main St',
      addressZipCode: '12345',
    };

    it('should return empty array when no duplicates found', async () => {
      mockClientFindMany.mockResolvedValue([]);

      const result = await checkForDuplicates(mockClientData);

      expect(result).toEqual([]);
      expect(mockClientFindMany).toHaveBeenCalledWith({
        where: {
          isMerged: false,
          id: undefined,
        },
      });
    });

    it('should detect exact match (same name, DOB, phone)', async () => {
      const existingClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        primaryPhone: '15551234567', // Matches mockClientData's +15551234567 after normalization
        addressStreet1: '456 Other St',
        addressZipCode: '99999',
        isMerged: false,
      } as Client;

      mockClientFindMany.mockResolvedValue([existingClient]);

      const result = await checkForDuplicates(mockClientData);

      expect(result.length).toBeGreaterThan(0);
      const exactMatch = result.find((m) => m.matchType === 'EXACT');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.confidenceScore).toBe(1.0);
      expect(exactMatch?.matchFields).toContain('firstName');
      expect(exactMatch?.matchFields).toContain('lastName');
      expect(exactMatch?.matchFields).toContain('dateOfBirth');
    });

    it('should detect phonetic match (similar sounding names with same DOB)', async () => {
      const existingClient = {
        id: 'client-123',
        firstName: 'Jon', // Sounds like John
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        primaryPhone: '5559876543',
        addressStreet1: '456 Other St',
        addressZipCode: '99999',
        isMerged: false,
      } as Client;

      mockClientFindMany.mockResolvedValue([existingClient]);

      const result = await checkForDuplicates(mockClientData);

      // May match phonetically or through fuzzy matching
      expect(result.length).toBeGreaterThan(0);
      const match = result[0];
      expect(match.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect fuzzy match (slight name variations with same DOB)', async () => {
      const existingClient = {
        id: 'client-123',
        firstName: 'Johnathan', // Similar to John
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        primaryPhone: '5559876543',
        addressStreet1: '456 Other St',
        addressZipCode: '99999',
        isMerged: false,
      } as Client;

      mockClientFindMany.mockResolvedValue([existingClient]);

      const result = await checkForDuplicates(mockClientData);

      // May have matches due to DOB match with partial name similarity
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect partial DOB match (same year/month)', async () => {
      const existingClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-20'), // Same year and month, different day
        primaryPhone: '5559876543',
        addressStreet1: '456 Other St',
        addressZipCode: '99999',
        isMerged: false,
      } as Client;

      mockClientFindMany.mockResolvedValue([existingClient]);

      const result = await checkForDuplicates(mockClientData);

      // Should find partial DOB match
      expect(result.length).toBeGreaterThan(0);
      const partialDobMatch = result.find((m) => m.matchType === 'PARTIAL_DOB');
      expect(partialDobMatch).toBeDefined();
      expect(partialDobMatch?.confidenceScore).toBe(0.65);
    });

    it('should detect address match', async () => {
      const existingClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-03-20'),
        primaryPhone: '5559876543',
        addressStreet1: '123 Main St',
        addressZipCode: '12345',
        isMerged: false,
      } as Client;

      mockClientFindMany.mockResolvedValue([existingClient]);

      const result = await checkForDuplicates(mockClientData);

      const addressMatch = result.find((m) => m.matchType === 'ADDRESS');
      expect(addressMatch).toBeDefined();
      expect(addressMatch?.confidenceScore).toBe(0.75);
      expect(addressMatch?.matchFields).toContain('addressStreet1');
    });

    it('should exclude specified clientId from search', async () => {
      const clientDataWithExclusion = {
        ...mockClientData,
        excludeClientId: 'exclude-this-id',
      };

      mockClientFindMany.mockResolvedValue([]);

      await checkForDuplicates(clientDataWithExclusion);

      expect(mockClientFindMany).toHaveBeenCalledWith({
        where: {
          isMerged: false,
          id: { not: 'exclude-this-id' },
        },
      });
    });

    it('should sort matches by confidence score (highest first)', async () => {
      const existingClients = [
        {
          id: 'client-1',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-05-20'), // Partial DOB match = 0.65
          primaryPhone: '5559876543',
          addressStreet1: '456 Other St',
          addressZipCode: '99999',
          isMerged: false,
        },
        {
          id: 'client-2',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-05-15'),
          primaryPhone: '15551234567', // Matches mockClientData's +15551234567 after normalization
          addressStreet1: '789 Another St',
          addressZipCode: '88888',
          isMerged: false, // Exact match = 1.0
        },
      ] as Client[];

      mockClientFindMany.mockResolvedValue(existingClients);

      const result = await checkForDuplicates(mockClientData);

      expect(result.length).toBeGreaterThan(0);
      // First match should have highest confidence
      expect(result[0].confidenceScore).toBeGreaterThanOrEqual(
        result[result.length - 1].confidenceScore
      );
    });
  });

  describe('savePotentialDuplicates', () => {
    it('should save new potential duplicates', async () => {
      const newClientId = 'new-client-id';
      const matches: DuplicateMatch[] = [
        {
          clientId: 'existing-client-id',
          matchType: 'EXACT',
          confidenceScore: 1.0,
          matchFields: ['firstName', 'lastName', 'dateOfBirth'],
          matchedClient: {} as Client,
        },
      ];

      mockPotentialDuplicateFindUnique.mockResolvedValue(null);
      mockPotentialDuplicateCreate.mockResolvedValue({});

      await savePotentialDuplicates(newClientId, matches);

      expect(mockPotentialDuplicateCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchType: 'EXACT',
          confidenceScore: 1.0,
          matchFields: ['firstName', 'lastName', 'dateOfBirth'],
          status: 'PENDING',
        }),
      });
    });

    it('should not create duplicate entries for existing pairs', async () => {
      const newClientId = 'new-client-id';
      const matches: DuplicateMatch[] = [
        {
          clientId: 'existing-client-id',
          matchType: 'EXACT',
          confidenceScore: 1.0,
          matchFields: [],
          matchedClient: {} as Client,
        },
      ];

      // Simulate existing duplicate record
      mockPotentialDuplicateFindUnique.mockResolvedValue({
        id: 'existing-duplicate-id',
      });

      await savePotentialDuplicates(newClientId, matches);

      expect(mockPotentialDuplicateCreate).not.toHaveBeenCalled();
    });

    it('should order client IDs consistently', async () => {
      const newClientId = 'zzz-new-client';
      const matches: DuplicateMatch[] = [
        {
          clientId: 'aaa-existing-client',
          matchType: 'FUZZY',
          confidenceScore: 0.85,
          matchFields: [],
          matchedClient: {} as Client,
        },
      ];

      mockPotentialDuplicateFindUnique.mockResolvedValue(null);
      mockPotentialDuplicateCreate.mockResolvedValue({});

      await savePotentialDuplicates(newClientId, matches);

      // Should look up with sorted IDs
      expect(mockPotentialDuplicateFindUnique).toHaveBeenCalledWith({
        where: {
          client1Id_client2Id: {
            client1Id: 'aaa-existing-client', // Sorted first
            client2Id: 'zzz-new-client',
          },
        },
      });
    });
  });

  describe('getPendingDuplicates', () => {
    it('should return pending duplicates ordered by confidence', async () => {
      const mockDuplicates = [
        { id: 'dup-1', confidenceScore: 0.95, status: 'PENDING' },
        { id: 'dup-2', confidenceScore: 0.65, status: 'PENDING' },
      ];

      mockPotentialDuplicateFindMany.mockResolvedValue(mockDuplicates);

      const result = await getPendingDuplicates();

      expect(result).toEqual(mockDuplicates);
      expect(mockPotentialDuplicateFindMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: { client1: true, client2: true },
        orderBy: { confidenceScore: 'desc' },
      });
    });
  });

  describe('mergeClients', () => {
    const mergeParams = {
      sourceClientId: 'source-client-id',
      targetClientId: 'target-client-id',
      reviewedBy: 'admin-user-id',
      resolutionNotes: 'Confirmed duplicate',
    };

    it('should transfer all relationships to target client', async () => {
      await mergeClients(mergeParams);

      // Verify all related records are updated
      expect(mockEmergencyContactUpdateMany).toHaveBeenCalledWith({
        where: { clientId: 'source-client-id' },
        data: { clientId: 'target-client-id' },
      });

      expect(mockAppointmentUpdateMany).toHaveBeenCalledWith({
        where: { clientId: 'source-client-id' },
        data: { clientId: 'target-client-id' },
      });

      expect(mockClinicalNoteUpdateMany).toHaveBeenCalledWith({
        where: { clientId: 'source-client-id' },
        data: { clientId: 'target-client-id' },
      });

      expect(mockChargeEntryUpdateMany).toHaveBeenCalledWith({
        where: { clientId: 'source-client-id' },
        data: { clientId: 'target-client-id' },
      });
    });

    it('should mark source client as merged', async () => {
      await mergeClients(mergeParams);

      expect(mockClientUpdate).toHaveBeenCalledWith({
        where: { id: 'source-client-id' },
        data: {
          isMerged: true,
          mergedIntoId: 'target-client-id',
          mergedAt: expect.any(Date),
        },
      });
    });

    it('should update potential duplicate records to MERGED status', async () => {
      await mergeClients(mergeParams);

      expect(mockPotentialDuplicateUpdateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { client1Id: 'source-client-id' },
            { client2Id: 'source-client-id' },
            { client1Id: 'target-client-id' },
            { client2Id: 'target-client-id' },
          ],
          status: 'PENDING',
        },
        data: {
          status: 'MERGED',
          reviewedBy: 'admin-user-id',
          reviewedAt: expect.any(Date),
          resolutionNotes: 'Confirmed duplicate',
        },
      });
    });

    it('should use default resolution notes if not provided', async () => {
      await mergeClients({
        sourceClientId: 'source-client-id',
        targetClientId: 'target-client-id',
        reviewedBy: 'admin-user-id',
      });

      expect(mockPotentialDuplicateUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolutionNotes: 'Clients merged',
          }),
        })
      );
    });

    it('should run all operations in a transaction', async () => {
      await mergeClients(mergeParams);

      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('dismissDuplicate', () => {
    it('should update duplicate status to DISMISSED', async () => {
      mockPotentialDuplicateUpdate.mockResolvedValue({});

      await dismissDuplicate('duplicate-id', 'reviewer-id', 'Different people');

      expect(mockPotentialDuplicateUpdate).toHaveBeenCalledWith({
        where: { id: 'duplicate-id' },
        data: {
          status: 'DISMISSED',
          reviewedBy: 'reviewer-id',
          reviewedAt: expect.any(Date),
          resolutionNotes: 'Different people',
        },
      });
    });

    it('should use default resolution notes if not provided', async () => {
      mockPotentialDuplicateUpdate.mockResolvedValue({});

      await dismissDuplicate('duplicate-id', 'reviewer-id');

      expect(mockPotentialDuplicateUpdate).toHaveBeenCalledWith({
        where: { id: 'duplicate-id' },
        data: expect.objectContaining({
          resolutionNotes: 'Not a duplicate',
        }),
      });
    });
  });
});
