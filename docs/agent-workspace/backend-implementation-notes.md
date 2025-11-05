# Backend Security Implementation Notes
Phase 2: Backend Security Implementation for Module 1

## Implementation Date
November 2, 2025

## Agent
Agent-Backend-Security

---

## Overview
This document describes the backend security implementation for Phase 2 of Module 1, including session management, account lockout, password policies, and optional MFA services.

---

## Architecture Decisions

### 1. Session Management
- **Token-based sessions**: Sessions use cryptographically secure random tokens (32 bytes, base64url encoded)
- **Database-backed**: Session state stored in PostgreSQL for reliability and persistence
- **Inactivity timeout**: 20 minutes of inactivity automatically expires sessions
- **Concurrent session limit**: Maximum 2 active sessions per user
- **Automatic cleanup**: Oldest session terminated when limit reached

### 2. Password Security
- **Strength requirements**:
  - Minimum 12 characters
  - Must include uppercase, lowercase, number, and special character
  - Cannot contain user information (name, email)
  - Cannot be a common password
- **History tracking**: Last 10 passwords stored (hashed) to prevent reuse
- **Expiration policy**: Passwords expire after 90 days
- **Hashing**: bcrypt with cost factor of 12

### 3. Account Lockout
- **Threshold**: Account locked after 5 failed login attempts
- **Lockout duration**: 30 minutes
- **Admin unlock**: Administrators can manually unlock accounts
- **Auto-unlock**: Accounts automatically unlock after lockout period expires

### 4. Multi-Factor Authentication (OPTIONAL)
- **Algorithm**: TOTP (Time-based One-Time Password) using speakeasy
- **Backup codes**: 10 one-time use backup codes generated on MFA setup
- **Optional setup**: Users can skip MFA during account setup
- **Verification window**: Allows 1 time step before/after for clock drift

---

## API Endpoint Specifications

### Session Management Endpoints

#### POST /api/v1/sessions/extend
Extend the current session expiration time.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Session extended successfully"
}
```

#### DELETE /api/v1/sessions/:id
Terminate a specific session (logout from specific device).

**Authentication**: Required

**Parameters**:
- `id` (path): Session ID

**Response**:
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

#### DELETE /api/v1/sessions/all
Terminate all sessions for the current user (logout from all devices).

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "X session(s) terminated successfully",
  "count": 2
}
```

#### GET /api/v1/sessions
List all active sessions for the current user.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "session-id",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "deviceTrusted": false,
      "createdAt": "2025-11-02T10:00:00Z",
      "lastActivity": "2025-11-02T10:15:00Z",
      "expiresAt": "2025-11-02T10:35:00Z",
      "isCurrent": true
    }
  ],
  "count": 1
}
```

---

### MFA Endpoints

#### POST /api/v1/mfa/setup
Generate MFA secret and QR code for user setup.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "MFA setup initiated",
  "data": {
    "qrCodeUrl": "data:image/png;base64,...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["XXXX-XXXX", "YYYY-YYYY", ...],
    "secret": "secret-base32"
  }
}
```

#### POST /api/v1/mfa/enable
Enable MFA after verifying TOTP code.

**Authentication**: Required

**Request Body**:
```json
{
  "secret": "secret-base32",
  "verificationCode": "123456",
  "backupCodes": ["XXXX-XXXX", "YYYY-YYYY", ...]
}
```

**Response**:
```json
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

#### POST /api/v1/mfa/disable
Disable MFA with verification.

**Authentication**: Required

**Request Body**:
```json
{
  "verificationCode": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

#### POST /api/v1/mfa/verify
Verify a TOTP code or backup code.

**Authentication**: Required

**Request Body**:
```json
{
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "MFA code verified successfully",
  "usedBackupCode": false
}
```

#### POST /api/v1/mfa/backup-codes/regenerate
Regenerate backup codes.

**Authentication**: Required

**Request Body**:
```json
{
  "verificationCode": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Backup codes regenerated successfully",
  "data": {
    "backupCodes": ["XXXX-XXXX", "YYYY-YYYY", ...]
  }
}
```

#### GET /api/v1/mfa/status
Get MFA status for current user.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "backupCodesCount": 8
  }
}
```

---

### User Management Endpoints (Admin)

#### POST /api/v1/users/:id/unlock
Unlock a locked user account.

**Authentication**: Required (Admin only)

**Parameters**:
- `id` (path): User ID

**Response**:
```json
{
  "success": true,
  "message": "Account unlocked successfully"
}
```

#### POST /api/v1/users/:id/force-password-change
Force user to change password on next login.

**Authentication**: Required (Admin only)

**Parameters**:
- `id` (path): User ID

**Response**:
```json
{
  "success": true,
  "message": "User will be required to change password on next login"
}
```

---

### Enhanced Auth Endpoints

#### POST /api/v1/auth/login
Login with enhanced security checks.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (No MFA)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "requiresMfa": false,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CLINICIAN"],
      "mfaEnabled": false
    },
    "session": {
      "token": "session-token",
      "sessionId": "session-id"
    }
  }
}
```

**Response (MFA Required)**:
```json
{
  "success": true,
  "message": "MFA verification required",
  "requiresMfa": true,
  "tempToken": "temporary-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST /api/v1/auth/mfa/verify
Complete MFA verification during login.

**Request Body**:
```json
{
  "userId": "user-id",
  "mfaCode": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "MFA verification successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CLINICIAN"]
    },
    "session": {
      "token": "session-token",
      "sessionId": "session-id"
    }
  }
}
```

---

## Security Considerations

### 1. Session Security
- Tokens are cryptographically random (crypto.randomBytes)
- Tokens are stored hashed in database
- Sessions automatically expire after inactivity
- Session validation checks account status on every request
- Concurrent session limits prevent session hijacking

### 2. Password Security
- Passwords are hashed with bcrypt (cost factor 12)
- Password history prevents reuse of recent passwords
- Password strength validation prevents weak passwords
- Password expiration forces regular updates
- Failed login attempts are tracked and rate-limited

### 3. Account Protection
- Account lockout prevents brute force attacks
- Lockout duration provides cooling-off period
- Admin unlock provides recovery mechanism
- All security events are logged for audit trail

### 4. MFA Security
- TOTP algorithm provides time-based verification
- Backup codes provide recovery mechanism
- Backup codes are hashed before storage
- Used backup codes are immediately removed
- MFA is optional to not block user onboarding

### 5. Audit Logging
All security events are logged with:
- User ID
- IP address
- Timestamp
- Action performed
- Success/failure status
- Additional context

Logged events include:
- LOGIN_SUCCESS, LOGIN_FAILED
- ACCOUNT_LOCKED, ACCOUNT_UNLOCKED
- PASSWORD_EXPIRED, PASSWORD_CHANGED, PASSWORD_HISTORY_VIOLATION
- MFA_ENABLED, MFA_DISABLED, MFA_VERIFICATION_FAILED
- SESSION_CREATED, SESSION_EXPIRED, SESSION_TERMINATED
- CONCURRENT_SESSION_BLOCKED

---

## Code Examples

### Using Session Service
```typescript
import sessionService from './services/session.service';

// Create a session
const session = await sessionService.createSession(
  userId,
  ipAddress,
  userAgent
);

// Validate a session
const validSession = await sessionService.validateSession(token);
if (validSession) {
  console.log('Session valid for user:', validSession.userId);
}

// Terminate a session
await sessionService.terminateSession(sessionId);

// Cleanup expired sessions (cron job)
await sessionService.cleanupExpiredSessions();
```

### Using Password Policy Service
```typescript
import passwordPolicyService from './services/passwordPolicy.service';

// Validate password strength
const validation = passwordPolicyService.validatePasswordStrength(
  password,
  { email: user.email, firstName: user.firstName }
);

if (!validation.isValid) {
  throw new ValidationError(validation.errors.join('. '));
}

// Check password history
const inHistory = await passwordPolicyService.checkPasswordHistory(
  userId,
  newPassword
);

if (inHistory) {
  throw new ValidationError('Password already used');
}

// Add to password history
await passwordPolicyService.addToPasswordHistory(
  userId,
  hashedPassword
);
```

### Using MFA Service
```typescript
import mfaService from './services/mfa.service';

// Setup MFA
const mfaData = await mfaService.generateMFASecret(userId);
// Display QR code to user: mfaData.qrCodeUrl

// Enable MFA (after user scans QR and verifies)
await mfaService.enableMFA(
  userId,
  mfaData.secret,
  verificationCode,
  mfaData.backupCodes
);

// Verify TOTP during login
const isValid = await mfaService.verifyTOTPForLogin(
  userId,
  mfaCode
);
```

---

## Database Schema Usage

### Session Table
```typescript
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

  user User @relation(fields: [userId], references: [id])
}
```

### User Security Fields
```typescript
// Account Lockout
failedLoginAttempts Int       @default(0)
accountLockedUntil  DateTime?

// Password Policies
passwordChangedAt   DateTime  @default(now())
passwordHistory     String[]  @default([])

// MFA (Optional)
mfaEnabled          Boolean   @default(false)
mfaSecret           String?
mfaBackupCodes      String[]  @default([])

// Password Management
mustChangePassword  Boolean   @default(false)
```

---

## Dependencies Added
```json
{
  "dependencies": {
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.5"
  }
}
```

---

## Testing Recommendations

### Unit Tests
1. Session Service
   - Token generation
   - Session validation
   - Expiration handling
   - Concurrent session limits

2. Password Policy Service
   - Password strength validation
   - Password history checking
   - Password expiration checking

3. MFA Service
   - Secret generation
   - TOTP verification
   - Backup code generation and verification

4. Auth Service
   - Login with account lockout
   - Login with MFA
   - Password change with policy validation

### Integration Tests
1. Complete login flow with sessions
2. MFA setup and verification flow
3. Account lockout and unlock flow
4. Password expiration and change flow
5. Concurrent session handling

### Security Tests
1. Brute force protection (account lockout)
2. Session hijacking prevention
3. Password strength enforcement
4. MFA bypass attempts
5. Backup code reuse prevention

---

## Maintenance Tasks

### Scheduled Jobs
1. **Session Cleanup** (run hourly)
   ```typescript
   await sessionService.cleanupExpiredSessions();
   ```

2. **Password Expiration Notifications** (run daily)
   - Check users with passwords expiring within 7 days
   - Send reminder emails

### Monitoring
1. Monitor failed login attempts
2. Track account lockouts
3. Monitor session creation rate
4. Track MFA adoption rate
5. Monitor backup code usage

---

## Future Enhancements
1. Device fingerprinting for trusted devices
2. Geolocation-based security checks
3. Adaptive authentication (risk-based MFA)
4. SMS-based MFA as alternative to TOTP
5. Biometric authentication support
6. Security key (WebAuthn) support
