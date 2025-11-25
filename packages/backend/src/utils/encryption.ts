/**
 * PHI Encryption Utility - AES-256-GCM Implementation
 *
 * HIPAA Compliant encryption for Protected Health Information (PHI)
 * Uses AES-256-GCM which provides both confidentiality and integrity
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV (Initialization Vector) for each encryption
 * - Authentication tag to detect tampering
 * - Key derived from environment variable
 */

import crypto from 'crypto';
import logger from './logger';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Sensitive field patterns to encrypt
const SENSITIVE_FIELDS = [
  'ssn',
  'socialSecurityNumber',
  'dateOfBirth',
  'dob',
  'address',
  'phoneNumber',
  'phone',
  'email',
  'medicalRecordNumber',
  'mrn',
  'insuranceId',
  'policyNumber',
  'creditCardNumber',
  'bankAccountNumber',
  'diagnosis',
  'medications',
  'treatmentNotes',
  'clinicalNotes',
  'aiApiKey',
  'smtpPass',
  'apiSecret',
  'password',
];

/**
 * Get or generate the encryption key from environment
 * In production, this MUST be set via AWS Secrets Manager or similar
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.PHI_ENCRYPTION_KEY;

  if (!keyEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PHI_ENCRYPTION_KEY must be set in production environment');
    }
    // Development fallback - DO NOT use in production
    logger.warn('Using development encryption key - NOT FOR PRODUCTION USE');
    return crypto.scryptSync('dev-only-key-do-not-use-in-production', 'salt', KEY_LENGTH);
  }

  // Key should be base64 encoded 32-byte key
  const key = Buffer.from(keyEnv, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`PHI_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (256 bits) base64 encoded`);
  }

  return key;
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all base64 encoded)
 */
export function encryptValue(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed', { error });
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt a string value encrypted with encryptValue
 */
export function decryptValue(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  // Check if it's actually encrypted (has our format)
  if (!ciphertext.includes(':')) {
    return ciphertext; // Return as-is if not encrypted
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      return ciphertext; // Not our encrypted format
    }

    const [ivBase64, authTagBase64, encryptedBase64] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Decryption failed', { error });
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Check if a field name should be encrypted
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive =>
    lowerField.includes(sensitive.toLowerCase())
  );
}

/**
 * Recursively encrypt sensitive fields in an object
 */
export function encryptSensitiveFields(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => encryptSensitiveFields(item));
  }

  if (typeof data === 'object') {
    const encrypted: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        encrypted[key] = value;
      } else if (typeof value === 'string' && isSensitiveField(key)) {
        // Encrypt sensitive string fields
        encrypted[key] = encryptValue(value);
      } else if (typeof value === 'object') {
        // Recursively process nested objects
        encrypted[key] = encryptSensitiveFields(value);
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted;
  }

  return data;
}

/**
 * Recursively decrypt sensitive fields in an object
 */
export function decryptSensitiveFields(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => decryptSensitiveFields(item));
  }

  if (typeof data === 'object') {
    const decrypted: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        decrypted[key] = value;
      } else if (typeof value === 'string' && isSensitiveField(key)) {
        // Decrypt sensitive string fields
        decrypted[key] = decryptValue(value);
      } else if (typeof value === 'object') {
        // Recursively process nested objects
        decrypted[key] = decryptSensitiveFields(value);
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  return data;
}

/**
 * Mask sensitive fields for logging/display (does not encrypt)
 */
export function maskSensitiveFields(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveFields(item));
  }

  if (typeof data === 'object') {
    const masked: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        masked[key] = value;
      } else if (typeof value === 'string' && isSensitiveField(key)) {
        // Mask sensitive string fields
        if (value.length <= 4) {
          masked[key] = '****';
        } else {
          masked[key] = value.substring(0, 2) + '****' + value.substring(value.length - 2);
        }
      } else if (typeof value === 'object') {
        masked[key] = maskSensitiveFields(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  return data;
}

/**
 * Generate a new encryption key for PHI_ENCRYPTION_KEY environment variable
 * Run this once to generate a key, then store it securely
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('base64');
}

/**
 * Hash a value for comparison (e.g., for SSN lookup without decryption)
 * Uses HMAC-SHA256 with a separate key
 */
export function hashForLookup(value: string): string {
  const key = process.env.PHI_HASH_KEY || 'dev-hash-key';
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}
