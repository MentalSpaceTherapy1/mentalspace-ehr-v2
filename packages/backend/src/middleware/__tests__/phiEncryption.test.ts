/**
 * PHI Encryption Middleware Tests
 *
 * Tests for HIPAA-compliant PHI field encryption/decryption
 */

import {
  encryptPHIFields,
  decryptPHIFields,
  PHI_FIELDS_BY_MODEL,
  generateSearchHash,
  buildEncryptedFieldSearch,
} from '../phiEncryption';
import { encryptValue, decryptValue, hashForLookup } from '../../utils/encryption';

describe('PHI Encryption Middleware', () => {
  // Set up test encryption key (must be exactly 32 bytes for AES-256)
  beforeAll(() => {
    // 'test-encryption-key-32-bytes-abc' is exactly 32 bytes, base64 encoded
    process.env.PHI_ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy1hYmM=';
    process.env.PHI_HASH_KEY = 'test-hash-key';
  });

  describe('encryptPHIFields', () => {
    it('should encrypt sensitive fields in Client model', () => {
      const clientData = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        medicalRecordNumber: 'MRN-001',
        primaryPhone: '555-123-4567',
        email: 'john@example.com',
        addressStreet1: '123 Main St',
        isActive: true,
      };

      const encrypted = encryptPHIFields('Client', clientData);

      // Non-PHI fields should remain unchanged
      expect(encrypted.id).toBe('123');
      expect(encrypted.firstName).toBe('John'); // Name not in PHI_FIELDS for Client
      expect(encrypted.isActive).toBe(true);

      // PHI fields should be encrypted
      expect(encrypted.medicalRecordNumber).not.toBe('MRN-001');
      expect(encrypted.primaryPhone).not.toBe('555-123-4567');
      expect(encrypted.email).not.toBe('john@example.com');
      expect(encrypted.addressStreet1).not.toBe('123 Main St');

      // Encrypted values should have correct format (iv:authTag:data)
      expect(encrypted.medicalRecordNumber.split(':').length).toBe(3);
      expect(encrypted.primaryPhone.split(':').length).toBe(3);
    });

    it('should encrypt SSN in InsuranceInformation model', () => {
      const insuranceData = {
        id: '456',
        memberId: 'MEM-123',
        subscriberSSN: '123-45-6789',
        subscriberFirstName: 'Jane',
      };

      const encrypted = encryptPHIFields('InsuranceInformation', insuranceData);

      expect(encrypted.id).toBe('456');
      expect(encrypted.memberId).not.toBe('MEM-123');
      expect(encrypted.subscriberSSN).not.toBe('123-45-6789');
      expect(encrypted.subscriberFirstName).not.toBe('Jane');

      // SSN should be encrypted
      expect(encrypted.subscriberSSN.split(':').length).toBe(3);
    });

    it('should handle null and undefined values', () => {
      const data = {
        id: '789',
        medicalRecordNumber: null,
        primaryPhone: undefined,
        email: 'test@test.com',
      };

      const encrypted = encryptPHIFields('Client', data);

      expect(encrypted.id).toBe('789');
      expect(encrypted.medicalRecordNumber).toBeNull();
      expect(encrypted.primaryPhone).toBeUndefined();
      expect(encrypted.email).not.toBe('test@test.com');
    });

    it('should not encrypt already encrypted values', () => {
      const alreadyEncrypted = encryptValue('test-value');
      const data = {
        medicalRecordNumber: alreadyEncrypted,
      };

      const encrypted = encryptPHIFields('Client', data);

      // Should remain the same (not double-encrypted)
      expect(encrypted.medicalRecordNumber).toBe(alreadyEncrypted);
    });

    it('should return data unchanged for models without PHI fields', () => {
      const data = {
        id: '123',
        name: 'Test',
        value: 'Some value',
      };

      const encrypted = encryptPHIFields('NonExistentModel', data);

      expect(encrypted).toEqual(data);
    });
  });

  describe('decryptPHIFields', () => {
    it('should decrypt encrypted fields in Client model', () => {
      const originalData = {
        id: '123',
        medicalRecordNumber: 'MRN-001',
        primaryPhone: '555-123-4567',
        email: 'john@example.com',
      };

      // First encrypt
      const encrypted = encryptPHIFields('Client', originalData);

      // Then decrypt
      const decrypted = decryptPHIFields('Client', encrypted);

      expect(decrypted.id).toBe('123');
      expect(decrypted.medicalRecordNumber).toBe('MRN-001');
      expect(decrypted.primaryPhone).toBe('555-123-4567');
      expect(decrypted.email).toBe('john@example.com');
    });

    it('should handle unencrypted values gracefully', () => {
      const data = {
        id: '123',
        medicalRecordNumber: 'MRN-001', // Not encrypted
        primaryPhone: '555-123-4567',
      };

      const decrypted = decryptPHIFields('Client', data);

      // Should return as-is since not encrypted
      expect(decrypted.medicalRecordNumber).toBe('MRN-001');
      expect(decrypted.primaryPhone).toBe('555-123-4567');
    });

    it('should decrypt SSN correctly', () => {
      const originalSSN = '123-45-6789';
      const data = {
        subscriberSSN: encryptValue(originalSSN),
      };

      const decrypted = decryptPHIFields('InsuranceInformation', data);

      expect(decrypted.subscriberSSN).toBe(originalSSN);
    });
  });

  describe('ClinicalNote encryption', () => {
    it('should encrypt clinical content fields', () => {
      const noteData = {
        id: 'note-123',
        subjective: 'Patient reports feeling anxious',
        objective: 'Patient appears restless',
        assessment: 'Generalized anxiety disorder',
        plan: 'Continue current medication',
        status: 'COMPLETED',
      };

      const encrypted = encryptPHIFields('ClinicalNote', noteData);

      expect(encrypted.id).toBe('note-123');
      expect(encrypted.status).toBe('COMPLETED');

      // Clinical content should be encrypted
      expect(encrypted.subjective).not.toBe(noteData.subjective);
      expect(encrypted.objective).not.toBe(noteData.objective);
      expect(encrypted.assessment).not.toBe(noteData.assessment);
      expect(encrypted.plan).not.toBe(noteData.plan);

      // Verify decryption
      const decrypted = decryptPHIFields('ClinicalNote', encrypted);
      expect(decrypted.subjective).toBe(noteData.subjective);
      expect(decrypted.objective).toBe(noteData.objective);
      expect(decrypted.assessment).toBe(noteData.assessment);
      expect(decrypted.plan).toBe(noteData.plan);
    });
  });

  describe('Search hash generation', () => {
    it('should generate consistent hashes for the same value', () => {
      const value = '123-45-6789';
      const hash1 = generateSearchHash(value);
      const hash2 = generateSearchHash(value);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different values', () => {
      const hash1 = generateSearchHash('123-45-6789');
      const hash2 = generateSearchHash('987-65-4321');

      expect(hash1).not.toBe(hash2);
    });

    it('should build encrypted field search clause', () => {
      const searchClause = buildEncryptedFieldSearch('subscriberSSN', '123-45-6789');

      expect(searchClause).toHaveProperty('subscriberSSNHash');
      expect(typeof searchClause.subscriberSSNHash).toBe('string');
      expect(searchClause.subscriberSSNHash.length).toBe(64); // SHA-256 hex
    });
  });

  describe('PHI_FIELDS_BY_MODEL configuration', () => {
    it('should have Client model PHI fields defined', () => {
      expect(PHI_FIELDS_BY_MODEL.Client).toBeDefined();
      expect(PHI_FIELDS_BY_MODEL.Client).toContain('medicalRecordNumber');
      expect(PHI_FIELDS_BY_MODEL.Client).toContain('primaryPhone');
      expect(PHI_FIELDS_BY_MODEL.Client).toContain('email');
    });

    it('should have InsuranceInformation model PHI fields defined', () => {
      expect(PHI_FIELDS_BY_MODEL.InsuranceInformation).toBeDefined();
      expect(PHI_FIELDS_BY_MODEL.InsuranceInformation).toContain('subscriberSSN');
      expect(PHI_FIELDS_BY_MODEL.InsuranceInformation).toContain('memberId');
    });

    it('should have ClinicalNote model PHI fields defined', () => {
      expect(PHI_FIELDS_BY_MODEL.ClinicalNote).toBeDefined();
      expect(PHI_FIELDS_BY_MODEL.ClinicalNote).toContain('subjective');
      expect(PHI_FIELDS_BY_MODEL.ClinicalNote).toContain('objective');
      expect(PHI_FIELDS_BY_MODEL.ClinicalNote).toContain('assessment');
      expect(PHI_FIELDS_BY_MODEL.ClinicalNote).toContain('plan');
    });

    it('should have User model PHI fields defined', () => {
      expect(PHI_FIELDS_BY_MODEL.User).toBeDefined();
      expect(PHI_FIELDS_BY_MODEL.User).toContain('phoneNumber');
      expect(PHI_FIELDS_BY_MODEL.User).toContain('npiNumber');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      const data = {
        medicalRecordNumber: '',
        primaryPhone: '',
      };

      const encrypted = encryptPHIFields('Client', data);
      expect(encrypted.medicalRecordNumber).toBe('');
      expect(encrypted.primaryPhone).toBe('');
    });

    it('should handle very long values', () => {
      const longValue = 'A'.repeat(10000);
      const data = {
        subjective: longValue,
      };

      const encrypted = encryptPHIFields('ClinicalNote', data);
      expect(encrypted.subjective).not.toBe(longValue);

      const decrypted = decryptPHIFields('ClinicalNote', encrypted);
      expect(decrypted.subjective).toBe(longValue);
    });

    it('should handle special characters', () => {
      const specialChars = "Test with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?`~\\n\\t";
      const data = {
        subjective: specialChars,
      };

      const encrypted = encryptPHIFields('ClinicalNote', data);
      const decrypted = decryptPHIFields('ClinicalNote', encrypted);

      expect(decrypted.subjective).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicodeText = 'Patient name: 日本語テスト 中文测试 한국어테스트 émojis: 😀🏥💊';
      const data = {
        subjective: unicodeText,
      };

      const encrypted = encryptPHIFields('ClinicalNote', data);
      const decrypted = decryptPHIFields('ClinicalNote', encrypted);

      expect(decrypted.subjective).toBe(unicodeText);
    });
  });
});
