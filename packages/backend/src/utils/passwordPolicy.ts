import bcrypt from 'bcryptjs';

/**
 * Password Policy Validator
 *
 * HIPAA Compliance: Strong passwords are required to protect ePHI
 * Password requirements based on NIST guidelines and healthcare best practices
 */

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
  passwordHistoryCount: number; // How many previous passwords to check
}

// Default password policy (can be overridden per environment)
export const DEFAULT_PASSWORD_POLICY: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
  passwordHistoryCount: 5,
};

// Most common passwords to block
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'shadow',
  'superman', 'qazwsx', 'michael', 'football', 'welcome', 'jesus',
  'ninja', 'mustang', 'password1', 'admin', 'mentalspace', 'ehr',
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100, password strength score
}

/**
 * Validate password against policy
 */
export function validatePassword(
  password: string,
  userInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  },
  policy: PasswordRequirements = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  } else {
    score += 20;
    // Bonus for extra length
    score += Math.min((password.length - policy.minLength) * 2, 20);
  }

  // Check uppercase
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  // Check lowercase
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  // Check numbers
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 15;
  }

  // Check special characters
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  }

  // Check for common passwords
  if (policy.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
      errors.push('Password is too common. Please choose a more unique password');
      score -= 30;
    }
  }

  // Check for user information
  if (policy.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    const userStrings = [
      userInfo.email?.split('@')[0].toLowerCase(),
      userInfo.firstName?.toLowerCase(),
      userInfo.lastName?.toLowerCase(),
      userInfo.username?.toLowerCase(),
    ].filter(Boolean) as string[];

    for (const userString of userStrings) {
      if (userString.length > 3 && lowerPassword.includes(userString)) {
        errors.push('Password must not contain your name, email, or username');
        score -= 20;
        break;
      }
    }
  }

  // Check for sequential characters
  if (hasSequentialCharacters(password)) {
    errors.push('Password should not contain sequential characters (abc, 123, etc.)');
    score -= 10;
  }

  // Check for repeated characters
  if (hasRepeatedCharacters(password)) {
    errors.push('Password should not contain repeated characters (aaa, 111, etc.)');
    score -= 10;
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: errors.length === 0,
    errors,
    score,
  };
}

/**
 * Check if password contains sequential characters
 */
function hasSequentialCharacters(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];

  const lowerPassword = password.toLowerCase();

  for (const sequence of sequences) {
    for (let i = 0; i < sequence.length - 2; i++) {
      const substr = sequence.substring(i, i + 3);
      const reverseSubstr = substr.split('').reverse().join('');

      if (lowerPassword.includes(substr) || lowerPassword.includes(reverseSubstr)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if password contains repeated characters
 */
function hasRepeatedCharacters(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

/**
 * Hash password using bcrypt
 * Cost factor of 12 provides good security/performance balance
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if password matches any in history
 * @param password - New password to check
 * @param passwordHistory - Array of previous password hashes
 * @returns true if password was used before
 */
export async function isPasswordInHistory(
  password: string,
  passwordHistory: string[]
): Promise<boolean> {
  for (const oldHash of passwordHistory) {
    if (await comparePassword(password, oldHash)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a strong random password
 * Useful for temporary passwords or password resets
 */
export function generateRandomPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';

  const allChars = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Get password strength description
 */
export function getPasswordStrengthDescription(score: number): {
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  description: string;
} {
  if (score < 40) {
    return {
      level: 'weak',
      description: 'This password is weak and easily guessable',
    };
  } else if (score < 60) {
    return {
      level: 'fair',
      description: 'This password is fair but could be stronger',
    };
  } else if (score < 75) {
    return {
      level: 'good',
      description: 'This password is good',
    };
  } else if (score < 90) {
    return {
      level: 'strong',
      description: 'This password is strong',
    };
  } else {
    return {
      level: 'excellent',
      description: 'This password is excellent',
    };
  }
}

/**
 * Validate password change request
 * Checks old password, new password policy, and history
 */
export async function validatePasswordChange(
  oldPassword: string,
  newPassword: string,
  currentHash: string,
  passwordHistory: string[],
  userInfo?: { email?: string; firstName?: string; lastName?: string }
): Promise<PasswordValidationResult> {
  const errors: string[] = [];

  // Verify old password
  const isOldPasswordCorrect = await comparePassword(oldPassword, currentHash);
  if (!isOldPasswordCorrect) {
    errors.push('Current password is incorrect');
    return { isValid: false, errors, score: 0 };
  }

  // Check if new password is same as old password
  const isSameAsOld = await comparePassword(newPassword, currentHash);
  if (isSameAsOld) {
    errors.push('New password must be different from current password');
    return { isValid: false, errors, score: 0 };
  }

  // Validate new password against policy
  const validation = validatePassword(newPassword, userInfo);
  if (!validation.isValid) {
    return validation;
  }

  // Check password history
  const inHistory = await isPasswordInHistory(newPassword, passwordHistory);
  if (inHistory) {
    errors.push(
      `New password cannot be one of your last ${DEFAULT_PASSWORD_POLICY.passwordHistoryCount} passwords`
    );
    return {
      isValid: false,
      errors,
      score: validation.score,
    };
  }

  return validation;
}
