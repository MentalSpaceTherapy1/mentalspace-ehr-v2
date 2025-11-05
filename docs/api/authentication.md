# Authentication API Documentation

**Module**: Module 1 - Authentication & User Management
**Version**: 2.0
**Last Updated**: November 2, 2025
**Base URL**: `/api/v1`

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Session Management Endpoints](#session-management-endpoints)
3. [MFA Endpoints](#mfa-endpoints)
4. [Account Management Endpoints](#account-management-endpoints)
5. [Error Codes](#error-codes)
6. [Authentication Flow](#authentication-flow)

---

## Authentication Endpoints

### POST /auth/register

Register a new user account (admin-initiated for staff).

**Authentication**: None (public) or Admin token
**Rate Limit**: 5 requests per hour per IP

**Request Body**:
```json
{
  "email": "john.doe@mentalspace.com",
  "password": "SecurePass123!@#",
  "firstName": "John",
  "lastName": "Doe",
  "title": "PhD",
  "role": "CLINICIAN",
  "licenseNumber": "PSY12345",
  "licenseState": "CA",
  "licenseExpiration": "2026-12-31",
  "npiNumber": "1234567890"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john.doe@mentalspace.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CLINICIAN"],
      "title": "PhD",
      "isActive": true,
      "createdAt": "2025-11-02T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "jwt-refresh-token-here"
    }
  }
}
```

**Error Responses**:
- `409 Conflict`: User with this email already exists
- `400 Bad Request`: Invalid input data
- `429 Too Many Requests`: Rate limit exceeded

---

### POST /auth/login

Authenticate user with email and password.

**Authentication**: None (public)
**Rate Limit**: 5 requests per minute per IP

**Request Body**:
```json
{
  "email": "john.doe@mentalspace.com",
  "password": "SecurePass123!@#"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john.doe@mentalspace.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CLINICIAN"],
      "title": "PhD",
      "isActive": true
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "jwt-refresh-token-here"
    }
  }
}
```

**MFA Enabled Response** (200 OK):
```json
{
  "success": true,
  "message": "MFA verification required",
  "data": {
    "requiresMfa": true,
    "userId": "uuid-here",
    "tempToken": "temporary-mfa-token",
    "mfaMethod": "TOTP"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid email or password
- `401 Unauthorized`: Account is disabled
- `401 Unauthorized`: Account locked (includes time remaining)
- `429 Too Many Requests`: Rate limit exceeded

**Account Lockout Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "Account locked. Try again in 27 minutes.",
  "error": {
    "code": "ACCOUNT_LOCKED",
    "lockUntil": "2025-11-02T11:00:00.000Z"
  }
}
```

---

### POST /auth/logout

Terminate current session and logout user.

**Authentication**: Required (Bearer token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Authentication**: None (uses refresh token)
**Rate Limit**: 10 requests per hour per user

**Request Body**:
```json
{
  "refreshToken": "jwt-refresh-token-here"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john.doe@mentalspace.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CLINICIAN"],
      "title": "PhD",
      "isActive": true
    },
    "tokens": {
      "accessToken": "new-jwt-token-here",
      "refreshToken": "new-jwt-refresh-token-here"
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token
- `401 Unauthorized`: User not found or account disabled

---

### GET /auth/me

Get current user profile information.

**Authentication**: Required (Bearer token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "john.doe@mentalspace.com",
    "firstName": "John",
    "lastName": "Doe",
    "title": "PhD",
    "roles": ["CLINICIAN"],
    "phoneNumber": "+1-555-0123",
    "licenseNumber": "PSY12345",
    "licenseState": "CA",
    "licenseExpiration": "2026-12-31T00:00:00.000Z",
    "npiNumber": "1234567890",
    "isActive": true,
    "isUnderSupervision": false,
    "supervisor": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "lastLoginDate": "2025-11-02T10:00:00.000Z"
  }
}
```

---

### POST /auth/change-password

Change user's password.

**Authentication**: Required (Bearer token)
**Rate Limit**: 3 requests per hour per user

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Request Body**:
```json
{
  "currentPassword": "OldSecurePass123!@#",
  "newPassword": "NewSecurePass456!@#"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Current password is incorrect
- `400 Bad Request`: New password does not meet requirements
- `400 Bad Request`: Cannot reuse last 10 passwords

---

### POST /auth/forgot-password

Request password reset email.

**Authentication**: None (public)
**Rate Limit**: 3 requests per hour per IP

**Request Body**:
```json
{
  "email": "john.doe@mentalspace.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

**Note**: For security, always returns success even if email doesn't exist.

---

### POST /auth/reset-password

Reset password using token from email.

**Authentication**: None (uses reset token)
**Rate Limit**: 5 requests per hour per IP

**Request Body**:
```json
{
  "token": "password-reset-token-from-email",
  "newPassword": "NewSecurePass456!@#"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired reset token
- `400 Bad Request`: Password does not meet requirements

---

## Session Management Endpoints

### POST /sessions/extend

Extend current session to prevent timeout.

**Authentication**: Required (Bearer token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Session extended",
  "data": {
    "expiresAt": "2025-11-02T11:20:00.000Z"
  }
}
```

---

### DELETE /sessions/:id

Terminate a specific session (logout from one device).

**Authentication**: Required (Bearer token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Path Parameters**:
- `id`: Session ID to terminate

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

**Error Responses**:
- `404 Not Found`: Session not found
- `403 Forbidden`: Cannot terminate another user's session

---

### DELETE /sessions/all

Terminate all sessions for current user (logout from all devices).

**Authentication**: Required (Bearer token)
**Rate Limit**: 5 requests per hour

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "All sessions terminated successfully",
  "data": {
    "terminatedCount": 3
  }
}
```

---

### GET /sessions

Get list of active sessions for current user.

**Authentication**: Required (Bearer token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-uuid-1",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "deviceTrusted": false,
        "createdAt": "2025-11-02T10:00:00.000Z",
        "lastActivity": "2025-11-02T10:15:00.000Z",
        "isActive": true,
        "isCurrent": true
      },
      {
        "id": "session-uuid-2",
        "ipAddress": "10.0.0.50",
        "userAgent": "Mobile Safari...",
        "deviceTrusted": false,
        "createdAt": "2025-11-01T15:00:00.000Z",
        "lastActivity": "2025-11-02T09:00:00.000Z",
        "isActive": true,
        "isCurrent": false
      }
    ]
  }
}
```

---

## MFA Endpoints

### POST /mfa/setup

Generate MFA secret and QR code for user to enroll.

**Authentication**: Required (Bearer token)
**Rate Limit**: 5 requests per hour

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "backupCodes": [
      "12345678",
      "23456789",
      "34567890",
      "45678901",
      "56789012"
    ]
  }
}
```

**Note**: User must call `/mfa/enable` with a verification code to activate MFA.

---

### POST /mfa/enable

Enable MFA for user after verifying TOTP code.

**Authentication**: Required (Bearer token)
**Rate Limit**: 5 requests per hour

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Request Body**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "verificationCode": "123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "MFA enabled successfully",
  "data": {
    "mfaEnabled": true,
    "mfaMethod": "TOTP",
    "backupCodes": [
      "12345678",
      "23456789",
      "34567890",
      "45678901",
      "56789012"
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid verification code
- `400 Bad Request`: MFA already enabled

---

### POST /mfa/disable

Disable MFA for user.

**Authentication**: Required (Bearer token)
**Rate Limit**: 3 requests per hour

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Request Body**:
```json
{
  "verificationCode": "123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid verification code
- `400 Bad Request`: MFA not enabled

---

### POST /mfa/verify

Verify MFA code during login (second step of authentication).

**Authentication**: Required (temporary MFA token from login)
**Rate Limit**: 10 requests per hour

**Request Headers**:
```
Authorization: Bearer <temp-mfa-token>
```

**Request Body**:
```json
{
  "code": "123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "MFA verification successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john.doe@mentalspace.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CLINICIAN"]
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "jwt-refresh-token-here"
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired MFA code
- `401 Unauthorized`: Invalid temporary token

---

### POST /mfa/backup-codes/regenerate

Regenerate backup codes for MFA.

**Authentication**: Required (Bearer token)
**Rate Limit**: 3 requests per day

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Request Body**:
```json
{
  "verificationCode": "123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Backup codes regenerated successfully",
  "data": {
    "backupCodes": [
      "87654321",
      "76543210",
      "65432109",
      "54321098",
      "43210987"
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid verification code
- `400 Bad Request`: MFA not enabled

---

## Account Management Endpoints

### POST /users/:id/unlock

Unlock a locked user account (admin only).

**Authentication**: Required (Admin token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <admin-access-token>
```

**Path Parameters**:
- `id`: User ID to unlock

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Account unlocked successfully",
  "data": {
    "userId": "uuid-here",
    "unlockedBy": "admin-uuid-here",
    "unlockedAt": "2025-11-02T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `400 Bad Request`: Account is not locked

---

### POST /users/:id/force-password-change

Force user to change password on next login (admin only).

**Authentication**: Required (Admin token)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <admin-access-token>
```

**Path Parameters**:
- `id`: User ID

**Request Body**:
```json
{
  "reason": "Security policy update"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User will be required to change password on next login",
  "data": {
    "userId": "uuid-here",
    "mustChangePassword": true
  }
}
```

---

### GET /users/:id/password-status

Check password expiration status for user.

**Authentication**: Required (Bearer token - own user or Admin)
**Rate Limit**: None

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Path Parameters**:
- `id`: User ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "uuid-here",
    "passwordChangedAt": "2025-08-02T10:00:00.000Z",
    "daysSinceChange": 92,
    "passwordExpired": true,
    "expiresIn": -2,
    "mustChangePassword": false
  }
}
```

---

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request data |
| 400 | WEAK_PASSWORD | Password does not meet complexity requirements |
| 400 | PASSWORD_REUSED | Cannot reuse last 10 passwords |
| 400 | INVALID_MFA_CODE | MFA verification code is invalid |
| 401 | UNAUTHORIZED | Invalid credentials |
| 401 | ACCOUNT_LOCKED | Account is locked due to failed login attempts |
| 401 | ACCOUNT_DISABLED | Account has been disabled |
| 401 | SESSION_EXPIRED | Session has expired due to inactivity |
| 401 | INVALID_TOKEN | Access token is invalid or expired |
| 401 | MFA_REQUIRED | MFA verification is required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_ERROR | Server error |

---

## Authentication Flow

### Standard Login Flow

```
1. Client: POST /api/v1/auth/login
   Body: { email, password }

2. Server validates credentials
   - Check if account is locked
   - Verify password
   - Check password expiration

3. If MFA disabled:
   Server: Returns user + tokens
   Client: Stores tokens, redirects to dashboard

4. If MFA enabled:
   Server: Returns { requiresMfa: true, tempToken }
   Client: Redirects to MFA verification screen

5. Client: POST /api/v1/mfa/verify
   Headers: Authorization: Bearer <tempToken>
   Body: { code: "123456" }

6. Server: Returns user + tokens
   Client: Stores tokens, redirects to dashboard
```

### Session Management Flow

```
1. Client monitors inactivity timer (20 minutes)

2. At 18 minutes:
   Client: Shows warning modal
   User options:
   - Click "Extend Session" → POST /api/v1/sessions/extend
   - Click "Logout" → POST /api/v1/auth/logout
   - Do nothing → Auto-logout at 20 minutes

3. On any user activity (API call):
   Server: Updates session.lastActivity

4. If session expires:
   Server: Returns 401 SESSION_EXPIRED
   Client: Redirects to login page
```

### Account Lockout Flow

```
1. User fails login (incorrect password)
   Server: Increments failedLoginAttempts

2. After 5th failed attempt:
   Server: Sets accountLockedUntil = now + 30 minutes
   Server: Returns 401 with lockout message

3. User attempts login while locked:
   Server: Returns 401 "Account locked. Try again in X minutes."

4. Admin unlocks account:
   Admin: POST /api/v1/users/:id/unlock
   Server: Resets failedLoginAttempts, clears accountLockedUntil

5. After 30 minutes:
   Lockout automatically expires
   User can attempt login again
```

---

## Security Best Practices

### For Clients

1. **Token Storage**: Store access tokens in memory or secure storage, not localStorage (XSS risk)
2. **HTTPS Only**: All API calls must use HTTPS
3. **Token Refresh**: Implement automatic token refresh before expiration
4. **Session Monitoring**: Track user activity and implement inactivity timeout on client
5. **MFA Codes**: Never log or store MFA codes
6. **Backup Codes**: Prompt user to save backup codes securely

### For Servers

1. **Rate Limiting**: All endpoints are rate limited (configured per endpoint)
2. **Audit Logging**: All authentication events are logged with IP address
3. **Password Hashing**: bcrypt with 12 rounds
4. **Token Signing**: JWT tokens signed with RS256
5. **Session Validation**: Validate session on every request
6. **MFA Secrets**: Encrypted at rest in database

---

## Migration from Previous Versions

If upgrading from a version without session management:

1. All existing JWT tokens remain valid until expiration
2. New sessions will be created on next login
3. Users will be prompted to enable MFA (optional)
4. Password expiration checks apply to all staff users

---

## Support

For API issues or questions:
- **Documentation**: https://docs.mentalspace.com/api
- **Support Email**: support@mentalspace.com
- **Status Page**: https://status.mentalspace.com

---

**Last Updated**: November 2, 2025
**API Version**: 2.0
**Minimum Client Version**: 2.0.0
