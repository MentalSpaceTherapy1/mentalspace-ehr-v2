import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * In production, this should be a secure, randomly generated key
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    // In development, use a default key (NOT FOR PRODUCTION!)
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!');
    return crypto.scryptSync('default-development-key', 'salt', KEY_LENGTH);
  }

  // Derive key from environment variable
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypt a string value
 * Returns encrypted value in format: iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(text: string): string {
  if (!text) return '';

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:authTag:encryptedData (all base64 encoded)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encryptedData] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask a string for display (show only last 4 characters)
 */
export function maskString(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return '••••••••';
  }

  const maskedPart = '•'.repeat(Math.max(8, value.length - visibleChars));
  const visiblePart = value.slice(-visibleChars);

  return maskedPart + visiblePart;
}

/**
 * Encrypt sensitive fields in practice settings object
 */
export function encryptSensitiveFields(settings: any): any {
  const sensitiveFields = ['aiApiKey', 'smtpPass'];
  const encrypted = { ...settings };

  for (const field of sensitiveFields) {
    if (encrypted[field] && !encrypted[field].includes(':')) {
      // Only encrypt if not already encrypted (doesn't contain ':' separator)
      encrypted[field] = encrypt(encrypted[field]);
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in practice settings object
 */
export function decryptSensitiveFields(settings: any): any {
  const sensitiveFields = ['aiApiKey', 'smtpPass'];
  const decrypted = { ...settings };

  for (const field of sensitiveFields) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        // If decryption fails, field might not be encrypted
        console.warn(`Failed to decrypt ${field}, using as-is`);
      }
    }
  }

  return decrypted;
}

/**
 * Mask sensitive fields in practice settings object for API responses
 */
export function maskSensitiveFields(settings: any): any {
  const sensitiveFields = ['aiApiKey', 'smtpPass'];
  const masked = { ...settings };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      // Show 'set' indicator without revealing value
      masked[field] = masked[field] ? '••••••••' : null;
    }
  }

  return masked;
}

/**
 * Generate a secure random encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}
