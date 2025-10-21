import { encryptSensitiveFields, decryptSensitiveFields, maskSensitiveFields } from '../encryption';

describe('Encryption Utilities', () => {
  describe('encryptSensitiveFields', () => {
    it('should return data', () => {
      const data = { field1: 'value1', field2: 'value2' };
      const result = encryptSensitiveFields(data);

      expect(result).toBeDefined();
      expect(result.field1).toBe('value1');
    });

    it('should handle empty object', () => {
      const result = encryptSensitiveFields({});

      expect(result).toEqual({});
    });

    it('should handle null', () => {
      const result = encryptSensitiveFields(null);

      expect(result).toBeNull();
    });

    it('should handle nested objects', () => {
      const data = { outer: { inner: 'value' } };
      const result = encryptSensitiveFields(data);

      expect(result.outer.inner).toBe('value');
    });
  });

  describe('decryptSensitiveFields', () => {
    it('should return data', () => {
      const data = { field1: 'value1', field2: 'value2' };
      const result = decryptSensitiveFields(data);

      expect(result).toBeDefined();
      expect(result.field1).toBe('value1');
    });

    it('should handle empty object', () => {
      const result = decryptSensitiveFields({});

      expect(result).toEqual({});
    });

    it('should handle null', () => {
      const result = decryptSensitiveFields(null);

      expect(result).toBeNull();
    });
  });

  describe('maskSensitiveFields', () => {
    it('should mask API key fields', () => {
      const data = { aiApiKey: 'sk-1234567890', otherField: 'visible' };
      const result = maskSensitiveFields(data);

      expect(result.aiApiKey).toBe('********');
      expect(result.otherField).toBe('visible');
    });

    it('should mask SMTP password', () => {
      const data = { smtpPass: 'MyPassword123', smtpHost: 'smtp.example.com' };
      const result = maskSensitiveFields(data);

      expect(result.smtpPass).toBe('********');
      expect(result.smtpHost).toBe('smtp.example.com');
    });

    it('should mask SMTP user', () => {
      const data = { smtpUser: 'admin@example.com' };
      const result = maskSensitiveFields(data);

      expect(result.smtpUser).toBe('********');
    });

    it('should mask multiple sensitive fields', () => {
      const data = {
        aiApiKey: 'sk-key',
        smtpPass: 'pass',
        smtpUser: 'user',
        normalField: 'keep-this',
      };

      const result = maskSensitiveFields(data);

      expect(result.aiApiKey).toBe('********');
      expect(result.smtpPass).toBe('********');
      expect(result.smtpUser).toBe('********');
      expect(result.normalField).toBe('keep-this');
    });

    it('should not mutate original object', () => {
      const original = { aiApiKey: 'sk-key', normalField: 'value' };
      const result = maskSensitiveFields(original);

      expect(original.aiApiKey).toBe('sk-key'); // Original unchanged
      expect(result.aiApiKey).toBe('********'); // Masked copy
    });

    it('should handle object without sensitive fields', () => {
      const data = { field1: 'value1', field2: 'value2' };
      const result = maskSensitiveFields(data);

      expect(result).toEqual(data);
    });

    it('should handle empty object', () => {
      const result = maskSensitiveFields({});

      expect(result).toEqual({});
    });
  });
});
