# Module 1: Authentication & User Management - Technical Implementation

**Module**: Authentication & User Management
**Version**: 2.0
**Last Updated**: November 2, 2025
**Audience**: Developers, DevOps Engineers, Technical Architects

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Session Management](#session-management)
3. [Account Lockout](#account-lockout)
4. [Password Policies](#password-policies)
5. [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
6. [Security Considerations](#security-considerations)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Testing Strategy](#testing-strategy)
10. [Performance Optimization](#performance-optimization)
11. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Login   │  │   MFA    │  │ Session  │  │ Password │  │
│  │   UI     │  │  Setup   │  │ Timeout  │  │ Strength │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────┴─────────────────────────────────┐
│                         Backend                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Authentication Controller                    │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                          │
│  ┌───────────────┼──────────────────────────────────────┐  │
│  │  Auth Service │ Session Service │ MFA Service         │  │
│  │  Password     │ Audit Logger    │ Email Service       │  │
│  └───────────────┴──────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────┴─────────────────────────────────┐
│                    PostgreSQL Database                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Users   │  │ Sessions │  │ AuditLog │  │  Tokens  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- React 18
- TypeScript
- TailwindCSS
- React Router v6
- Axios for API calls
- Context API for state management

**Backend**:
- Node.js 20
- Express.js 4.18
- TypeScript
- Prisma ORM 5.7
- bcrypt.js (password hashing)
- jsonwebtoken (JWT tokens)
- speakeasy (TOTP/MFA)
- qrcode (QR code generation)

**Database**:
- PostgreSQL 15
- Hosted on AWS RDS

**Infrastructure**:
- AWS ECS (containerized deployment)
- AWS Application Load Balancer
- AWS CloudWatch (logging)
- AWS Secrets Manager (credentials)

---

## Session Management

### Design Decision: Server-Side Sessions

**Why Not Stateless JWT?**
- Need concurrent session limits (max 2 per user)
- Need inactivity timeout (20 minutes)
- Need ability to terminate sessions
- HIPAA requires automatic logoff
- Audit trail requires session tracking

**Implementation**: Hybrid approach
- **JWT tokens** for authentication (signed, short-lived)
- **Server-side sessions** for state management (timeout, tracking)
- **Database persistence** for session data

### Session Lifecycle

```mermaid
sequenceDiagram
    User->>+API: POST /api/v1/auth/login
    API->>+Database: Validate credentials
    Database-->>-API: User data
    API->>+Database: Check concurrent sessions
    Database-->>-API: Count = 1 (under limit)
    API->>+Database: Create session record
    Database-->>-API: Session ID
    API->>+JWT: Generate token
    JWT-->>-API: Signed token
    API-->>-User: Token + session info

    User->>+API: GET /api/v1/protected-resource
    API->>+JWT: Verify token
    JWT-->>-API: Token valid
    API->>+Database: Check session status
    Database-->>-API: Active, last activity 5 min ago
    API->>+Database: Update last activity
    Database-->>-API: Updated
    API-->>-User: Protected resource data

    Note over API,Database: 20 minutes of inactivity

    User->>+API: GET /api/v1/another-resource
    API->>+Database: Check session status
    Database-->>-API: Expired (last activity > 20 min)
    API-->>-User: 401 Session Expired
```

### Session Service Implementation

**File**: `packages/backend/src/services/session.service.ts`

```typescript
import prisma from './database';
import crypto from 'crypto';
import { auditLogger } from '../utils/logger';

export class SessionService {
  /**
   * Create new session for user
   *
   * @param userId - User ID
   * @param ipAddress - IP address of client
   * @param userAgent - User agent string
   * @returns Session object with token
   */
  async createSession(userId: string, ipAddress: string, userAgent: string) {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Session expires in 20 minutes
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId,
        token,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
        lastActivity: new Date(),
        isActive: true
      }
    });

    auditLogger.info('Session created', {
      userId,
      sessionId: session.id,
      ipAddress,
      action: 'SESSION_CREATED'
    });

    return session;
  }

  /**
   * Validate session and check timeout
   *
   * @param token - Session token
   * @returns User if session valid, throws error if invalid/expired
   */
  async validateSession(token: string) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || !session.isActive) {
      throw new Error('Invalid session');
    }

    if (session.expiresAt < new Date()) {
      await this.terminateSession(session.id);
      throw new Error('Session expired');
    }

    // Check inactivity timeout (20 minutes)
    const inactiveMinutes = (Date.now() - session.lastActivity.getTime()) / 60000;
    if (inactiveMinutes > 20) {
      await this.terminateSession(session.id);
      auditLogger.warn('Session timeout due to inactivity', {
        userId: session.userId,
        sessionId: session.id,
        inactiveMinutes,
        action: 'SESSION_EXPIRED'
      });
      throw new Error('Session timeout due to inactivity');
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    return session.user;
  }

  /**
   * Check if user has reached concurrent session limit
   *
   * @param userId - User ID
   * @returns true if user can create new session, false if limit reached
   */
  async checkConcurrentSessions(userId: string): Promise<boolean> {
    const activeSessions = await prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });

    return activeSessions < 2; // Max 2 concurrent sessions
  }

  /**
   * Terminate a session
   *
   * @param sessionId - Session ID to terminate
   */
  async terminateSession(sessionId: string) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    });

    auditLogger.info('Session terminated', {
      sessionId,
      action: 'SESSION_TERMINATED'
    });
  }

  /**
   * Terminate all sessions for a user
   *
   * @param userId - User ID
   */
  async terminateAllUserSessions(userId: string) {
    const result = await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    auditLogger.info('All user sessions terminated', {
      userId,
      count: result.count,
      action: 'ALL_SESSIONS_TERMINATED'
    });

    return result.count;
  }

  /**
   * Cleanup expired sessions (run as cron job)
   */
  async cleanupExpiredSessions() {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isActive: true,
            lastActivity: { lt: new Date(Date.now() - 20 * 60 * 1000) }
          }
        ]
      }
    });

    console.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }
}

export default new SessionService();
```

### Session Cleanup Cron Job

**File**: `packages/backend/src/cron/sessionCleanup.ts`

```typescript
import cron from 'node-cron';
import sessionService from '../services/session.service';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running session cleanup job...');
  try {
    const count = await sessionService.cleanupExpiredSessions();
    console.log(`Session cleanup completed: ${count} sessions removed`);
  } catch (error) {
    console.error('Session cleanup failed:', error);
  }
});
```

---

## Account Lockout

### Lockout Mechanism

**Policy**:
- Lock after **5 failed login attempts**
- Lockout duration: **30 minutes**
- Counter resets on successful login
- Administrator can unlock manually

### Implementation

**Database Fields**:
```prisma
model User {
  failedLoginAttempts Int       @default(0)
  accountLockedUntil  DateTime?
}
```

**Login Service Update**:

```typescript
async login(email: string, password: string, ipAddress: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if account is locked
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.accountLockedUntil.getTime() - Date.now()) / 60000
    );

    auditLogger.warn('Login attempt on locked account', {
      email,
      ipAddress,
      lockUntil: user.accountLockedUntil,
      action: 'LOGIN_ATTEMPT_LOCKED'
    });

    throw new UnauthorizedError(
      `Account locked. Try again in ${minutesLeft} minutes.`
    );
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;

    if (newAttempts >= 5) {
      // Lock account for 30 minutes
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          accountLockedUntil: lockUntil
        }
      });

      auditLogger.warn('Account locked due to failed attempts', {
        userId: user.id,
        email,
        ipAddress,
        attempts: newAttempts,
        lockUntil,
        action: 'ACCOUNT_LOCKED'
      });

      throw new UnauthorizedError(
        'Account locked due to multiple failed login attempts.'
      );
    }

    // Update failed attempts (not locked yet)
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: newAttempts }
    });

    auditLogger.warn('Failed login attempt', {
      email,
      ipAddress,
      attempts: newAttempts,
      action: 'LOGIN_FAILED'
    });

    throw new UnauthorizedError('Invalid email or password');
  }

  // Successful login - reset failed attempts
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginDate: new Date()
    }
  });

  // Continue with session creation...
}
```

### Admin Unlock

```typescript
async unlockAccount(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.accountLockedUntil) {
    throw new BadRequestError('Account is not locked');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null
    }
  });

  auditLogger.info('Account unlocked by administrator', {
    userId,
    unlockedBy: adminId,
    action: 'ACCOUNT_UNLOCKED'
  });

  return { message: 'Account unlocked successfully' };
}
```

---

## Password Policies

### Policy Requirements

1. **Complexity**:
   - Minimum 12 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character

2. **History**:
   - Cannot reuse last 10 passwords

3. **Expiration**:
   - Staff passwords expire every 90 days
   - Client passwords never expire

### Database Schema

```prisma
model User {
  password           String    // Current hashed password
  passwordChangedAt  DateTime  @default(now())
  passwordHistory    String[]  // Array of last 10 hashed passwords
  mustChangePassword Boolean   @default(false)
}
```

### Password Strength Validation

**File**: `packages/backend/src/services/passwordPolicy.service.ts`

```typescript
export class PasswordPolicyService {
  /**
   * Validate password meets complexity requirements
   */
  validatePasswordStrength(password: string): {
    valid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 12) {
      feedback.push('Password must be at least 12 characters long');
    } else {
      score += 25;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 25;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 25;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 12.5;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else {
      score += 12.5;
    }

    return {
      valid: feedback.length === 0,
      score,
      feedback
    };
  }

  /**
   * Check if password matches any of last 10 passwords
   */
  async checkPasswordHistory(
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHistory: true }
    });

    if (!user || !user.passwordHistory) {
      return true; // No history, allow
    }

    // Check each historical password
    for (const historicalHash of user.passwordHistory) {
      const matches = await bcrypt.compare(newPassword, historicalHash);
      if (matches) {
        return false; // Password reused
      }
    }

    return true; // Password is new
  }

  /**
   * Add current password to history before changing
   */
  async addToPasswordHistory(userId: string, currentPasswordHash: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHistory: true }
    });

    let history = user?.passwordHistory || [];

    // Add current password to history
    history.unshift(currentPasswordHash);

    // Keep only last 10
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHistory: history }
    });
  }

  /**
   * Check if password has expired (90 days for staff)
   */
  checkPasswordExpiration(passwordChangedAt: Date, isStaff: boolean): {
    expired: boolean;
    daysUntilExpiration: number;
  } {
    if (!isStaff) {
      return { expired: false, daysUntilExpiration: -1 };
    }

    const daysSinceChange = Math.floor(
      (Date.now() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysUntilExpiration = 90 - daysSinceChange;

    return {
      expired: daysSinceChange > 90,
      daysUntilExpiration
    };
  }
}

export default new PasswordPolicyService();
```

### Password Change Flow

```typescript
async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Validate new password strength
  const validation = passwordPolicyService.validatePasswordStrength(newPassword);
  if (!validation.valid) {
    throw new BadRequestError(validation.feedback.join(', '));
  }

  // Check password history (last 10)
  const isNewPassword = await passwordPolicyService.checkPasswordHistory(
    userId,
    newPassword
  );

  if (!isNewPassword) {
    auditLogger.warn('Password history violation', {
      userId,
      action: 'PASSWORD_HISTORY_VIOLATION'
    });
    throw new BadRequestError(
      'Cannot reuse a password from your last 10 passwords'
    );
  }

  // Add current password to history
  await passwordPolicyService.addToPasswordHistory(userId, user.password);

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: false // Clear force change flag
    }
  });

  auditLogger.info('Password changed', {
    userId,
    action: 'PASSWORD_CHANGED'
  });

  return { message: 'Password changed successfully' };
}
```

---

## Multi-Factor Authentication (MFA)

### MFA Design: TOTP (Time-Based One-Time Password)

**Algorithm**: TOTP (RFC 6238)
**Secret Length**: 32 characters (Base32)
**Time Step**: 30 seconds
**Code Length**: 6 digits
**Window**: ±1 time step (allows for clock drift)

### Database Schema

```prisma
model User {
  mfaEnabled     Boolean   @default(false)
  mfaSecret      String?   // Encrypted TOTP secret
  mfaBackupCodes String[]  // Hashed backup codes
  mfaMethod      String?   // 'TOTP'
  mfaEnabledAt   DateTime?
}
```

### MFA Service Implementation

**Dependencies**:
```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3"
}
```

**File**: `packages/backend/src/services/mfa.service.ts`

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from './database';
import { auditLogger } from '../utils/logger';

export class MFAService {
  /**
   * Generate MFA secret and QR code for user
   */
  async generateMFASecret(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `MentalSpace (${user.email})`,
      issuer: 'MentalSpace EHR',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes (5 codes, 8 digits each)
    const backupCodes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const code = crypto.randomInt(10000000, 99999999).toString();
      backupCodes.push(code);
    }

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Enable MFA for user after verifying TOTP code
   */
  async enableMFA(
    userId: string,
    secret: string,
    verificationCode: string
  ) {
    // Verify code
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: verificationCode,
      window: 1 // Allow ±30 seconds for clock drift
    });

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Hash backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const code = crypto.randomInt(10000000, 99999999).toString();
      const hashed = await bcrypt.hash(code, 10);
      backupCodes.push(hashed);
    }

    // Encrypt secret before storing
    const encryptedSecret = this.encryptSecret(secret);

    // Enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaBackupCodes: backupCodes,
        mfaMethod: 'TOTP',
        mfaEnabledAt: new Date()
      }
    });

    auditLogger.info('MFA enabled', {
      userId,
      method: 'TOTP',
      action: 'MFA_ENABLED'
    });

    return { message: 'MFA enabled successfully' };
  }

  /**
   * Verify TOTP code during login
   */
  async verifyTOTP(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaBackupCodes: true }
    });

    if (!user || !user.mfaSecret) {
      throw new Error('MFA not enabled');
    }

    // Decrypt secret
    const secret = this.decryptSecret(user.mfaSecret);

    // Verify TOTP code
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (isValid) {
      auditLogger.info('MFA verification successful', {
        userId,
        method: 'TOTP',
        action: 'MFA_VERIFICATION_SUCCESS'
      });
      return true;
    }

    // Try backup codes
    if (user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
      for (let i = 0; i < user.mfaBackupCodes.length; i++) {
        const matches = await bcrypt.compare(code, user.mfaBackupCodes[i]);

        if (matches) {
          // Remove used backup code
          const remainingCodes = user.mfaBackupCodes.filter((_, idx) => idx !== i);
          await prisma.user.update({
            where: { id: userId },
            data: { mfaBackupCodes: remainingCodes }
          });

          auditLogger.info('MFA verification with backup code', {
            userId,
            method: 'BACKUP_CODE',
            action: 'MFA_BACKUP_CODE_USED'
          });

          return true;
        }
      }
    }

    auditLogger.warn('MFA verification failed', {
      userId,
      action: 'MFA_VERIFICATION_FAILED'
    });

    return false;
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string, verificationCode: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.mfaEnabled) {
      throw new Error('MFA is not enabled');
    }

    // Verify code before disabling
    const isValid = await this.verifyTOTP(userId, verificationCode);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaMethod: null,
        mfaEnabledAt: null
      }
    });

    auditLogger.info('MFA disabled', {
      userId,
      action: 'MFA_DISABLED'
    });

    return { message: 'MFA disabled successfully' };
  }

  /**
   * Encrypt MFA secret before storing
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt MFA secret when needed
   */
  private decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY!, 'hex');

    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export default new MFAService();
```

---

## Security Considerations

### Token Security

**Access Tokens**:
- Short-lived (15 minutes)
- Signed with RS256 (asymmetric encryption)
- Contains: userId, email, roles
- Cannot be revoked (stateless)

**Refresh Tokens**:
- Long-lived (7 days)
- Stored in database (can be revoked)
- Used to generate new access tokens
- Rotated on each use

### Password Hashing

**Algorithm**: bcrypt
**Rounds**: 12 (provides good balance of security and performance)
**Salt**: Automatically generated per password (random, unique)

**Why bcrypt?**
- Designed for password hashing (slow by design)
- Resistant to brute force attacks
- Automatic salting
- Widely trusted and audited

### Audit Logging

**What We Log**:
- All authentication events (success and failures)
- Password changes
- MFA events
- Session creation and termination
- Administrative actions
- Account lockouts and unlocks

**What We Don't Log**:
- Passwords (plain or hashed)
- MFA codes
- Session tokens
- Personal information beyond userId/email

**Log Retention**:
- 7 years (HIPAA requirement)
- Stored in immutable storage (S3 + Glacier)
- Encrypted at rest

### Rate Limiting

**Implemented With**: express-rate-limit

**Limits**:
- Login: 5 requests per minute per IP
- Password Reset: 3 requests per hour per IP
- Account Creation: 5 requests per hour per IP
- MFA Setup: 5 requests per hour per user

---

## Database Schema

### Complete Schema for Authentication

```prisma
model User {
  id            String     @id @default(uuid())
  email         String     @unique
  password      String     // bcrypt hashed

  // Authentication & Security
  isActive              Boolean   @default(true)
  lastLoginDate         DateTime?
  mustChangePassword    Boolean   @default(false)
  emailVerified         Boolean   @default(true)

  // Account Lockout
  failedLoginAttempts   Int       @default(0)
  accountLockedUntil    DateTime?

  // Password Policy
  passwordChangedAt     DateTime  @default(now())
  passwordHistory       String[]  // Last 10 hashed passwords

  // MFA
  mfaEnabled      Boolean   @default(false)
  mfaSecret       String?   // Encrypted TOTP secret
  mfaBackupCodes  String[]  // Hashed backup codes
  mfaMethod       String?   // 'TOTP'
  mfaEnabledAt    DateTime?

  // Password Reset
  passwordResetToken     String?   @unique
  passwordResetExpiry    DateTime?

  // User Invitation
  invitationToken        String?   @unique
  invitationSentAt       DateTime?

  // Profile
  firstName     String
  lastName      String
  roles         UserRole[] // Multiple roles

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  sessions Session[]

  @@map("users")
}

model Session {
  id            String   @id @default(uuid())
  userId        String
  token         String   @unique
  refreshToken  String?  @unique
  ipAddress     String
  userAgent     String
  deviceTrusted Boolean  @default(false)
  createdAt     DateTime @default(now())
  expiresAt     DateTime
  lastActivity  DateTime @default(now())
  isActive      Boolean  @default(true)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive])
  @@index([token])
  @@map("sessions")
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String   // 'LOGIN_SUCCESS', 'PASSWORD_CHANGED', etc.
  entityType String?  // 'User', 'Session', etc.
  entityId   String?  // ID of affected entity
  changes    Json?    // JSON of what changed
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())

  @@index([userId, timestamp])
  @@index([action, timestamp])
  @@map("audit_logs")
}
```

### Database Indexes

**Critical Indexes** (for performance):

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_active ON users(email, is_active);

-- Session lookups
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Audit log queries
CREATE INDEX idx_audit_user_time ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_action_time ON audit_logs(action, timestamp);
```

---

## API Endpoints

See `/docs/api/authentication.md` for complete API documentation.

**Summary of Endpoints**:

**Authentication**:
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`
- POST `/api/v1/auth/refresh`
- GET `/api/v1/auth/me`
- POST `/api/v1/auth/change-password`
- POST `/api/v1/auth/forgot-password`
- POST `/api/v1/auth/reset-password`

**Session Management**:
- POST `/api/v1/sessions/extend`
- DELETE `/api/v1/sessions/:id`
- DELETE `/api/v1/sessions/all`
- GET `/api/v1/sessions`

**MFA**:
- POST `/api/v1/mfa/setup`
- POST `/api/v1/mfa/enable`
- POST `/api/v1/mfa/disable`
- POST `/api/v1/mfa/verify`
- POST `/api/v1/mfa/backup-codes/regenerate`

**Account Management** (Admin):
- POST `/api/v1/users/:id/unlock`
- POST `/api/v1/users/:id/force-password-change`
- GET `/api/v1/users/:id/password-status`

---

## Testing Strategy

### Unit Tests

**Test Coverage Target**: >85%

**Key Test Suites**:
- `auth.service.test.ts` - Authentication logic
- `session.service.test.ts` - Session management
- `passwordPolicy.service.test.ts` - Password validation
- `mfa.service.test.ts` - MFA operations

**Example Test**:
```typescript
describe('Account Lockout', () => {
  it('should lock account after 5 failed attempts', async () => {
    const email = 'test@example.com';
    const password = 'wrong-password';

    // Attempt login 5 times with wrong password
    for (let i = 0; i < 5; i++) {
      try {
        await authService.login(email, password, '127.0.0.1');
      } catch (error) {
        // Expected to fail
      }
    }

    // 6th attempt should indicate locked
    await expect(
      authService.login(email, password, '127.0.0.1')
    ).rejects.toThrow('Account locked');

    // Verify database state
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user.failedLoginAttempts).toBe(5);
    expect(user.accountLockedUntil).not.toBeNull();
  });

  it('should unlock after 30 minutes', async () => {
    // ... test implementation
  });
});
```

### Integration Tests

**Test Scenarios**:
- Complete login flow (email → password → MFA → session)
- Password change with history validation
- Account lockout and unlock
- Session timeout
- MFA setup and verification

### Security Tests

**Automated Security Testing**:
```bash
# Dependency scanning
npm audit

# OWASP dependency check
npm install -g snyk
snyk test

# Static analysis
npm run lint
```

**Manual Security Testing**:
- Brute force simulation
- SQL injection attempts
- XSS attempts
- Session hijacking tests
- Token validation edge cases

---

## Performance Optimization

### Database Query Optimization

**Connection Pooling**:
```typescript
// Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error'],
});
```

**Query Performance**:
- Use indexes on frequently queried fields
- Limit SELECT fields to only what's needed
- Use database-level constraints when possible

### Caching Strategy

**Redis Caching** (optional enhancement):
- Cache user permissions (5-minute TTL)
- Cache session validation results (1-minute TTL)
- Cache audit log queries (read-only)

**In-Memory Caching**:
- Rate limit counters
- Recent failed login attempts

### Monitoring

**Metrics to Track**:
- Login response time (target: <2 seconds)
- MFA verification time (target: <1 second)
- Session validation time (target: <100ms)
- Database query time
- API error rate

**Tools**:
- AWS CloudWatch for logs and metrics
- Application Performance Monitoring (APM)
- Database query profiling

---

## Deployment Guide

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/mentalspace"

# JWT
JWT_SECRET="your-256-bit-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# MFA
MFA_ENCRYPTION_KEY="32-byte-hex-key-for-mfa-secret-encryption"

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@mentalspace.com"
SMTP_PASS="stored-in-aws-secrets-manager"

# Security
SESSION_TIMEOUT_MINUTES="20"
MAX_CONCURRENT_SESSIONS="2"
ACCOUNT_LOCKOUT_DURATION_MINUTES="30"
MAX_FAILED_LOGIN_ATTEMPTS="5"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="60000"  # 1 minute
RATE_LIMIT_MAX_REQUESTS="5"
```

### Pre-Deployment Checklist

**Database**:
- [ ] All migrations tested on staging
- [ ] Indexes created
- [ ] Backup before migration
- [ ] Rollback plan documented

**Environment**:
- [ ] All environment variables configured
- [ ] Secrets stored in AWS Secrets Manager
- [ ] HTTPS enforced
- [ ] Security headers configured

**Dependencies**:
- [ ] npm audit passed (no critical vulnerabilities)
- [ ] All dependencies up-to-date
- [ ] MFA libraries installed (speakeasy, qrcode)

**Testing**:
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Security tests completed
- [ ] Load testing completed

**Documentation**:
- [ ] API documentation updated
- [ ] User guides prepared
- [ ] Admin guide available
- [ ] Deployment runbook ready

**Monitoring**:
- [ ] CloudWatch alarms configured
- [ ] Error tracking enabled
- [ ] Audit log storage configured
- [ ] Performance monitoring enabled

### Deployment Steps

1. **Database Migration**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Backend Deployment**:
   ```bash
   docker build -t mentalspace-backend .
   docker tag mentalspace-backend:latest <ECR-URL>
   docker push <ECR-URL>
   aws ecs update-service --service backend --force-new-deployment
   ```

3. **Frontend Deployment**:
   ```bash
   npm run build
   aws s3 sync dist/ s3://mentalspace-frontend
   aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
   ```

4. **Verification**:
   - Test login flow
   - Test MFA setup
   - Test session timeout
   - Test account lockout
   - Check audit logs
   - Monitor error rates

### Rollback Procedure

If deployment fails:

1. **Revert Code**:
   ```bash
   aws ecs update-service --service backend --task-definition <previous-version>
   ```

2. **Revert Database**:
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

3. **Restore from Backup** (if needed):
   ```bash
   psql -h <host> -U <user> -d mentalspace < backup.sql
   ```

---

**Last Updated**: November 2, 2025
**Version**: 2.0
**Maintained By**: MentalSpace Engineering Team
