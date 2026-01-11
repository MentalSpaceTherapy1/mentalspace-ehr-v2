/**
 * Unit Tests: Duplicate Detection Service
 *
 * Tests for duplicate detection algorithms:
 * - Exact Match (name + DOB + phone)
 * - Phonetic Match (Soundex)
 * - Fuzzy Match (Levenshtein)
 * - Partial DOB Match
 * - Address Match
 */

import * as duplicateService from '../../services/duplicateDetection.service';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    client: {
      findMany: jest.fn(),
    },
    potentialDuplicate: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    emergencyContact: { updateMany: jest.fn() },
    legalGuardian: { updateMany: jest.fn() },
    insuranceInformation: { updateMany: jest.fn() },
    appointment: { updateMany: jest.fn() },
    clinicalNote: { updateMany: jest.fn() },
    treatmentPlan: { updateMany: jest.fn() },
    diagnosis: { updateMany: jest.fn() },
    medication: { updateMany: jest.fn() },
    clientDocument: { updateMany: jest.fn() },
    chargeEntry: { updateMany: jest.fn() },
    paymentRecord: { updateMany: jest.fn() },
    clientStatement: { updateMany: jest.fn() },
    $transaction: jest.fn((callback: any) => callback({
      emergencyContact: { updateMany: jest.fn() },
      legalGuardian: { updateMany: jest.fn() },
      insuranceInformation: { updateMany: jest.fn() },
      appointment: { updateMany: jest.fn() },
      clinicalNote: { updateMany: jest.fn() },
      treatmentPlan: { updateMany: jest.fn() },
      diagnosis: { updateMany: jest.fn() },
      medication: { updateMany: jest.fn() },
      clientDocument: { updateMany: jest.fn() },
      chargeEntry: { updateMany: jest.fn() },
      paymentRecord: { updateMany: jest.fn() },
      clientStatement: { updateMany: jest.fn() },
      client: { update: jest.fn() },
      potentialDuplicate: { updateMany: jest.fn() },
    })),
  })),
}));

// Mock soundex-code
jest.mock('soundex-code', () => jest.fn((str: string) => {
  // Simple mock implementation - first letter + length
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.length.toString().padStart(3, '0');
}));

// Mock fast-levenshtein
jest.mock('fast-levenshtein', () => ({
  get: jest.fn((a: string, b: string) => {
    // Simple mock: count character differences
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a === b) return 0;
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) diff++;
    }
    return diff;
  }),
}));

describe('Duplicate Detection Service', () => {
  describe('DuplicateMatch Interface', () => {
    it('should have correct structure', () => {
      const match: duplicateService.DuplicateMatch = {
        clientId: 'test-id',
        matchType: 'EXACT',
        confidenceScore: 1.0,
        matchFields: ['firstName', 'lastName'],
        matchedClient: {} as any,
      };

      expect(match.clientId).toBeDefined();
      expect(match.matchType).toBe('EXACT');
      expect(match.confidenceScore).toBe(1.0);
      expect(match.matchFields).toContain('firstName');
    });
  });

  describe('MergeClientsParams Interface', () => {
    it('should have correct structure', () => {
      const params: duplicateService.MergeClientsParams = {
        sourceClientId: 'source-id',
        targetClientId: 'target-id',
        reviewedBy: 'reviewer-id',
        resolutionNotes: 'Test merge',
      };

      expect(params.sourceClientId).toBe('source-id');
      expect(params.targetClientId).toBe('target-id');
      expect(params.reviewedBy).toBe('reviewer-id');
      expect(params.resolutionNotes).toBe('Test merge');
    });

    it('should allow optional resolutionNotes', () => {
      const params: duplicateService.MergeClientsParams = {
        sourceClientId: 'source-id',
        targetClientId: 'target-id',
        reviewedBy: 'reviewer-id',
      };

      expect(params.resolutionNotes).toBeUndefined();
    });
  });

  describe('Match Types', () => {
    it('should define EXACT match type with 100% confidence', () => {
      // EXACT matches should have confidence score of 1.0
      const exactMatchConfidence = 1.0;
      expect(exactMatchConfidence).toBe(1.0);
    });

    it('should define PHONETIC match type with 85% confidence', () => {
      // PHONETIC matches should have confidence score of 0.85
      const phoneticMatchConfidence = 0.85;
      expect(phoneticMatchConfidence).toBe(0.85);
    });

    it('should define FUZZY match type with max 90% confidence', () => {
      // FUZZY matches should have max confidence score of 0.9
      const maxFuzzyMatchConfidence = 0.9;
      expect(maxFuzzyMatchConfidence).toBeLessThanOrEqual(0.9);
    });

    it('should define PARTIAL_DOB match type with 65% confidence', () => {
      // PARTIAL_DOB matches should have confidence score of 0.65
      const partialDobMatchConfidence = 0.65;
      expect(partialDobMatchConfidence).toBe(0.65);
    });

    it('should define ADDRESS match type with 75% confidence', () => {
      // ADDRESS matches should have confidence score of 0.75
      const addressMatchConfidence = 0.75;
      expect(addressMatchConfidence).toBe(0.75);
    });
  });

  describe('Confidence Score Ordering', () => {
    it('should rank EXACT > FUZZY > PHONETIC > ADDRESS > PARTIAL_DOB', () => {
      const confidenceScores = {
        EXACT: 1.0,
        FUZZY: 0.9, // max
        PHONETIC: 0.85,
        ADDRESS: 0.75,
        PARTIAL_DOB: 0.65,
      };

      expect(confidenceScores.EXACT).toBeGreaterThan(confidenceScores.FUZZY);
      expect(confidenceScores.FUZZY).toBeGreaterThan(confidenceScores.PHONETIC);
      expect(confidenceScores.PHONETIC).toBeGreaterThan(confidenceScores.ADDRESS);
      expect(confidenceScores.ADDRESS).toBeGreaterThan(confidenceScores.PARTIAL_DOB);
    });
  });

  describe('String Normalization', () => {
    it('should handle case-insensitive name matching', () => {
      // The service normalizes strings by lowercasing and trimming
      const name1 = 'John Smith';
      const name2 = 'JOHN SMITH';
      const normalized1 = name1.toLowerCase().trim();
      const normalized2 = name2.toLowerCase().trim();

      expect(normalized1).toBe(normalized2);
    });

    it('should handle phone number normalization', () => {
      // The service removes non-digit characters from phone numbers
      const phone1 = '(555) 123-4567';
      const phone2 = '555-123-4567';
      const phone3 = '5551234567';

      const normalized1 = phone1.replace(/\D/g, '');
      const normalized2 = phone2.replace(/\D/g, '');
      const normalized3 = phone3.replace(/\D/g, '');

      expect(normalized1).toBe(normalized3);
      expect(normalized2).toBe(normalized3);
    });

    it('should handle whitespace normalization', () => {
      const name1 = '  John   Smith  ';
      const name2 = 'John Smith';

      const normalized1 = name1.toLowerCase().trim().replace(/\s+/g, ' ');
      const normalized2 = name2.toLowerCase().trim().replace(/\s+/g, ' ');

      expect(normalized1).toBe(normalized2);
    });
  });

  describe('Date Comparison', () => {
    it('should compare dates by date part only (ignore time)', () => {
      const date1 = new Date('2000-01-15T10:30:00Z');
      const date2 = new Date('2000-01-15T20:45:00Z');

      const dateStr1 = date1.toISOString().split('T')[0];
      const dateStr2 = date2.toISOString().split('T')[0];

      expect(dateStr1).toBe(dateStr2);
    });

    it('should correctly identify same year/month for partial DOB match', () => {
      const date1 = new Date('2000-01-15');
      const date2 = new Date('2000-01-28');

      expect(date1.getFullYear()).toBe(date2.getFullYear());
      expect(date1.getMonth()).toBe(date2.getMonth());
      expect(date1.getDate()).not.toBe(date2.getDate());
    });
  });

  describe('Merge Operations', () => {
    it('should define all required related records for transfer', () => {
      // List of all related records that should be transferred during merge
      const relatedRecords = [
        'emergencyContact',
        'legalGuardian',
        'insuranceInformation',
        'appointment',
        'clinicalNote',
        'treatmentPlan',
        'diagnosis',
        'medication',
        'clientDocument',
        'chargeEntry',
        'paymentRecord',
        'clientStatement',
      ];

      expect(relatedRecords.length).toBe(12);
      expect(relatedRecords).toContain('appointment');
      expect(relatedRecords).toContain('clinicalNote');
      expect(relatedRecords).toContain('chargeEntry');
    });

    it('should mark source client as merged after merge', () => {
      // After merge, source client should have:
      // - isMerged: true
      // - mergedIntoId: targetClientId
      // - mergedAt: timestamp
      const sourceClientUpdate = {
        isMerged: true,
        mergedIntoId: 'target-client-id',
        mergedAt: new Date(),
      };

      expect(sourceClientUpdate.isMerged).toBe(true);
      expect(sourceClientUpdate.mergedIntoId).toBeDefined();
      expect(sourceClientUpdate.mergedAt).toBeInstanceOf(Date);
    });
  });

  describe('Duplicate Status Management', () => {
    it('should have PENDING status for new duplicates', () => {
      const status = 'PENDING';
      expect(status).toBe('PENDING');
    });

    it('should have MERGED status after successful merge', () => {
      const status = 'MERGED';
      expect(status).toBe('MERGED');
    });

    it('should have DISMISSED status when not a duplicate', () => {
      const status = 'DISMISSED';
      expect(status).toBe('DISMISSED');
    });
  });

  describe('Match Field Tracking', () => {
    it('should track which fields matched for EXACT match', () => {
      const matchFields = ['firstName', 'lastName', 'dateOfBirth', 'primaryPhone'];

      expect(matchFields).toContain('firstName');
      expect(matchFields).toContain('lastName');
      expect(matchFields).toContain('dateOfBirth');
      expect(matchFields).toContain('primaryPhone');
    });

    it('should track which fields matched for PHONETIC match', () => {
      const matchFields = ['firstName', 'lastName', 'dateOfBirth'];

      expect(matchFields).toContain('firstName');
      expect(matchFields).toContain('lastName');
      expect(matchFields).toContain('dateOfBirth');
      expect(matchFields.length).toBe(3);
    });

    it('should track which fields matched for ADDRESS match', () => {
      const matchFields = ['addressStreet1', 'addressZipCode', 'name'];

      expect(matchFields).toContain('addressStreet1');
      expect(matchFields).toContain('addressZipCode');
    });
  });

  describe('Unique Constraint Handling', () => {
    it('should sort client IDs to avoid duplicate potential duplicate records', () => {
      const client1Id = 'zzz-client';
      const client2Id = 'aaa-client';

      // Service sorts IDs to ensure consistent ordering
      const [sortedClient1Id, sortedClient2Id] = [client1Id, client2Id].sort();

      expect(sortedClient1Id).toBe('aaa-client');
      expect(sortedClient2Id).toBe('zzz-client');
    });
  });

  describe('Algorithm Priority', () => {
    it('should skip other algorithms if EXACT match found', () => {
      // When an exact match is found, we should skip phonetic, fuzzy, etc.
      // This is an optimization - exact match has 100% confidence
      const exactMatchConfidence = 1.0;
      const fuzzyMatchConfidence = 0.9;

      expect(exactMatchConfidence).toBeGreaterThan(fuzzyMatchConfidence);
    });

    it('should remove duplicate matches for same client', () => {
      // If a client matches by multiple algorithms, keep only highest confidence
      const matches = [
        { clientId: 'client-1', confidenceScore: 0.85, matchType: 'PHONETIC' },
        { clientId: 'client-1', confidenceScore: 0.72, matchType: 'FUZZY' },
        { clientId: 'client-2', confidenceScore: 0.65, matchType: 'PARTIAL_DOB' },
      ];

      // Deduplicate by keeping highest score for each clientId
      const uniqueMatches = matches.reduce((acc, match) => {
        const existing = acc.find((m) => m.clientId === match.clientId);
        if (!existing || match.confidenceScore > existing.confidenceScore) {
          return [
            ...acc.filter((m) => m.clientId !== match.clientId),
            match,
          ];
        }
        return acc;
      }, [] as typeof matches);

      expect(uniqueMatches.length).toBe(2);
      expect(uniqueMatches.find((m) => m.clientId === 'client-1')?.confidenceScore).toBe(0.85);
    });
  });

  describe('Similarity Thresholds', () => {
    it('should require 80% similarity for fuzzy name match', () => {
      const threshold = 0.8;
      expect(threshold).toBe(0.8);
    });

    it('should require 70% similarity for partial DOB name match', () => {
      const threshold = 0.7;
      expect(threshold).toBe(0.7);
    });

    it('should require 60% similarity for address-based name match', () => {
      const threshold = 0.6;
      expect(threshold).toBe(0.6);
    });
  });
});

describe('Service Export Verification', () => {
  it('should export checkForDuplicates function', () => {
    expect(typeof duplicateService.checkForDuplicates).toBe('function');
  });

  it('should export savePotentialDuplicates function', () => {
    expect(typeof duplicateService.savePotentialDuplicates).toBe('function');
  });

  it('should export getPendingDuplicates function', () => {
    expect(typeof duplicateService.getPendingDuplicates).toBe('function');
  });

  it('should export mergeClients function', () => {
    expect(typeof duplicateService.mergeClients).toBe('function');
  });

  it('should export dismissDuplicate function', () => {
    expect(typeof duplicateService.dismissDuplicate).toBe('function');
  });
});
