import crypto from 'crypto';

/**
 * Generate a cryptographically secure temporary password
 *
 * Requirements:
 * - 12-16 characters long
 * - Mix of uppercase, lowercase, numbers, and symbols
 * - Cryptographically random
 * - Easy to type (no ambiguous characters like 0/O, 1/l/I)
 */
export function generateTemporaryPassword(length: number = 14): string {
  // Character sets (excluding ambiguous characters)
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // No i, l, o
  const numbers = '23456789'; // No 0, 1
  const symbols = '!@#$%^&*-+='; // Common, easy to type symbols

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one character from each set
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
}

/**
 * Shuffle a string using Fisher-Yates algorithm
 */
function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Generate a secure reset token (UUID v4)
 */
export function generateResetToken(): string {
  return crypto.randomUUID();
}

/**
 * Generate a verification token (UUID v4)
 */
export function generateVerificationToken(): string {
  return crypto.randomUUID();
}

/**
 * Calculate expiry time for password reset tokens
 * Default: 1 hour from now
 */
export function getPasswordResetExpiry(hoursFromNow: number = 1): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hoursFromNow);
  return expiry;
}

/**
 * Calculate expiry time for email verification tokens
 * Default: 7 days from now for invitations
 */
export function getVerificationExpiry(daysFromNow: number = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + daysFromNow);
  return expiry;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}
