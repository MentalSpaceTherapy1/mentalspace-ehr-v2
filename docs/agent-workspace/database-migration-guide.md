# Database Migration Guide: Session Management and Security Features

**Migration Name:** `20251102145454_add_session_management_and_security`

**Created:** November 2, 2025

**Agent:** Agent-Database-Schema

**Phase:** Phase 1 - Module 1: Authentication & User Management

## Overview

This migration adds comprehensive session management and security features to support:
- Session tracking and management
- Account lockout mechanisms
- Password policy enforcement
- Multi-factor authentication (MFA) capabilities

## Changes Made

### 1. New Session Model

Created a new `sessions` table to track user sessions:

**Table:** `sessions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique session identifier (UUID) |
| userId | TEXT | NOT NULL, FK | Reference to users table |
| token | TEXT | UNIQUE, NOT NULL | Session access token |
| refreshToken | TEXT | UNIQUE, NULLABLE | Refresh token for session renewal |
| ipAddress | TEXT | NOT NULL | IP address of the session |
| userAgent | TEXT | NOT NULL | Browser/client user agent string |
| deviceTrusted | BOOLEAN | DEFAULT false | Whether the device is trusted |
| createdAt | TIMESTAMP(3) | DEFAULT now() | Session creation time |
| expiresAt | TIMESTAMP(3) | NOT NULL | Session expiration time |
| lastActivity | TIMESTAMP(3) | DEFAULT now() | Last activity timestamp |
| isActive | BOOLEAN | DEFAULT true | Whether session is currently active |

**Indexes Created:**
- `sessions_token_key` - UNIQUE index on token
- `sessions_refreshToken_key` - UNIQUE index on refreshToken
- `sessions_userId_isActive_idx` - Composite index on (userId, isActive) for efficient querying
- `sessions_token_idx` - Index on token for fast lookups

**Foreign Key:**
- `sessions_userId_fkey` - CASCADE delete when user is deleted

### 2. User Model Security Enhancements

Added the following fields to the `users` table:

**Account Lockout Fields:**
- `failedLoginAttempts` (INTEGER, DEFAULT 0) - Counter for failed login attempts
- `accountLockedUntil` (TIMESTAMP, NULLABLE) - Timestamp until which account is locked

**Password Policy Fields:**
- `passwordChangedAt` (TIMESTAMP, DEFAULT now()) - Last password change timestamp
- `passwordHistory` (TEXT[], DEFAULT []) - Array of previous password hashes

**MFA (Multi-Factor Authentication) Fields:**
- `mfaSecret` (TEXT, NULLABLE) - Secret key for MFA (e.g., TOTP)
- `mfaBackupCodes` (TEXT[], DEFAULT []) - Array of backup codes
- `mfaMethod` (TEXT, NULLABLE) - MFA method type (e.g., 'totp', 'sms')
- `mfaEnabledAt` (TIMESTAMP, NULLABLE) - When MFA was enabled

## How to Apply Migration

### Development Environment

1. **Option A: Using Prisma Migrate (Recommended)**
   ```bash
   cd packages/database
   npx prisma migrate deploy
   ```

2. **Option B: Manual SQL Execution**
   ```bash
   psql -h localhost -U postgres -d mentalspace_ehr -f prisma/migrations/20251102145454_add_session_management_and_security/migration.sql
   ```

### Production Environment

**IMPORTANT:** Always backup your database before applying migrations!

1. **Create Backup**
   ```bash
   pg_dump -h <hostname> -U <username> -d mentalspace_ehr > backup_before_session_migration.sql
   ```

2. **Apply Migration**
   ```bash
   cd packages/database
   npx prisma migrate deploy
   ```

3. **Verify Migration**
   ```bash
   npx prisma db pull
   npx prisma validate
   ```

## Rollback Instructions

If you need to rollback this migration, execute the following SQL:

```sql
-- Drop the sessions table
DROP TABLE IF EXISTS "sessions" CASCADE;

-- Remove security fields from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "failedLoginAttempts";
ALTER TABLE "users" DROP COLUMN IF EXISTS "accountLockedUntil";
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordChangedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHistory";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfaSecret";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfaBackupCodes";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfaMethod";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfaEnabledAt";
```

**Note:** This rollback will:
- Delete all session data (users will need to re-login)
- Remove all security tracking (failed login counts, MFA settings, etc.)
- Remove password history (password reuse prevention will be disabled)

## Database Indexes

The migration adds the following indexes for performance optimization:

1. **sessions_token_key** (UNIQUE)
   - Fast token lookup during authentication
   - Ensures token uniqueness

2. **sessions_refreshToken_key** (UNIQUE)
   - Fast refresh token lookup
   - Ensures refresh token uniqueness

3. **sessions_userId_isActive_idx** (COMPOSITE)
   - Efficient querying of active sessions for a user
   - Used in "view all sessions" functionality
   - Used in "logout all devices" functionality

4. **sessions_token_idx**
   - Additional index for token-based queries
   - Improves session validation performance

## Expected Performance Impact

- **Session Creation:** < 10ms (single INSERT with indexes)
- **Session Validation:** < 5ms (indexed token lookup)
- **User Active Sessions Query:** < 10ms (composite index on userId + isActive)
- **Session Cleanup (expired):** Batch deletions should be efficient with indexes

## Testing Checklist

After applying the migration, verify:

- [ ] Schema validates: `npx prisma validate`
- [ ] User table has all new security fields
- [ ] Sessions table created with correct structure
- [ ] All indexes created successfully
- [ ] Foreign key constraint exists (sessions -> users)
- [ ] Cascade delete works (test with a temporary user)
- [ ] Default values work correctly (failedLoginAttempts = 0, etc.)
- [ ] Existing users have passwordChangedAt set to current timestamp

## Next Steps

After applying this migration, the following implementation work is required:

1. **Backend Implementation:**
   - Session service to manage sessions
   - Login/logout endpoints to create/destroy sessions
   - Session validation middleware
   - Account lockout logic
   - Password history validation
   - MFA enrollment and verification

2. **Frontend Implementation:**
   - Session management UI
   - MFA setup flow
   - Active sessions view
   - Device trust management

3. **Security Configuration:**
   - Set session timeout values
   - Configure account lockout thresholds
   - Define password history requirements
   - Implement session cleanup jobs

## Related Files

- Schema: `packages/database/prisma/schema.prisma`
- Migration: `packages/database/prisma/migrations/20251102145454_add_session_management_and_security/migration.sql`

## Support

For issues or questions about this migration, contact the Agent-Database-Schema agent or review the Phase 1 implementation plan.
