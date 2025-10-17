# Phase 7: Client Portal - Technical Specifications

**Version:** 1.0
**Last Updated:** 2025-10-14

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication System](#authentication-system)
3. [Database Schema](#database-schema)
4. [API Specifications](#api-specifications)
5. [Frontend Architecture](#frontend-architecture)
6. [Security Implementation](#security-implementation)
7. [Integration Points](#integration-points)
8. [Performance Requirements](#performance-requirements)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Devices                       │
│              (Web Browser, Mobile Browser)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│                  AWS CloudFront (CDN)                    │
│              Static Assets + API Caching                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐       ┌──────────────────┐
│  React SPA    │       │   Express API    │
│ (Client Portal│       │   Backend        │
│   Frontend)   │       │                  │
└───────┬───────┘       └────────┬─────────┘
        │                        │
        │                        │
        └────────┬───────────────┘
                 │
    ┌────────────┼────────────┬─────────────┬───────────┐
    │            │            │             │           │
    ▼            ▼            ▼             ▼           ▼
┌────────┐  ┌────────┐  ┌─────────┐  ┌─────────┐  ┌──────┐
│AWS     │  │AWS RDS │  │AWS S3   │  │Stripe   │  │AWS   │
│Cognito │  │(Postgre│  │(Docs)   │  │Payments │  │SES   │
│        │  │SQL)    │  │         │  │         │  │(Email│
└────────┘  └────────┘  └─────────┘  └─────────┘  └──────┘
```

### Technology Stack

**Frontend:**
- React 18+
- TypeScript
- React Router v6
- TanStack Query (React Query)
- Axios
- TailwindCSS
- React Hook Form + Zod
- Chart.js for visualizations

**Backend:**
- Node.js + Express
- TypeScript
- Prisma ORM
- JWT for session management
- Zod for validation
- Winston for logging

**Infrastructure:**
- AWS Cognito (Authentication)
- AWS RDS PostgreSQL (Database)
- AWS S3 (Document Storage)
- AWS CloudFront (CDN)
- AWS SES (Email)
- Stripe (Payments)

---

## Authentication System

### AWS Cognito Configuration

#### User Pool Settings
```json
{
  "poolName": "mentalspace-client-portal-users",
  "autoVerifiedAttributes": ["email"],
  "mfaConfiguration": "OPTIONAL",
  "passwordPolicy": {
    "minimumLength": 12,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSymbols": true,
    "temporaryPasswordValidityDays": 3
  },
  "emailVerificationMessage": "Your verification code is {####}",
  "emailVerificationSubject": "Verify your MentalSpace Portal account",
  "inviteMessageTemplate": {
    "emailMessage": "Welcome to MentalSpace Client Portal...",
    "emailSubject": "Welcome to MentalSpace"
  },
  "lambdaTriggers": {
    "preAuthentication": "arn:aws:lambda:...:function:PreAuth",
    "postAuthentication": "arn:aws:lambda:...:function:PostAuth",
    "preSignUp": "arn:aws:lambda:...:function:PreSignUp"
  }
}
```

#### User Attributes
```json
{
  "standardAttributes": {
    "email": { "required": true, "mutable": false },
    "given_name": { "required": true, "mutable": true },
    "family_name": { "required": true, "mutable": true },
    "phone_number": { "required": false, "mutable": true }
  },
  "customAttributes": {
    "client_id": { "type": "String", "mutable": false },
    "portal_user_id": { "type": "String", "mutable": false }
  }
}
```

### Authentication Flow

#### 1. Registration Flow
```typescript
// Registration sequence
1. Client submits registration form
2. Backend validates client exists in system
3. Backend creates Cognito user
4. Cognito sends verification email
5. Client verifies email with code
6. Backend creates portal_users record
7. Client can now login

// API Calls:
POST /api/v1/portal/auth/register
  → Creates Cognito user
  → Creates portal_users record
  → Sends verification email

POST /api/v1/portal/auth/verify-email
  → Confirms Cognito user
  → Updates portal_users.email_verified
```

#### 2. Login Flow
```typescript
// Login sequence
1. Client submits email/password
2. Backend authenticates with Cognito
3. Cognito returns JWT tokens
4. Backend creates portal_sessions record
5. Backend returns tokens + user data

// API Call:
POST /api/v1/portal/auth/login
Request:
{
  "email": "client@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "client@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "expiresIn": 3600
    }
  }
}
```

#### 3. Token Refresh Flow
```typescript
// Token refresh
1. Frontend detects expired access token
2. Frontend calls refresh endpoint
3. Backend validates refresh token with Cognito
4. Cognito issues new access token
5. Backend returns new tokens

// API Call:
POST /api/v1/portal/auth/refresh-token
Request:
{
  "refreshToken": "eyJhbG..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 3600
  }
}
```

### Session Management

```typescript
// Session configuration
const SESSION_CONFIG = {
  accessTokenExpiry: 60 * 60, // 1 hour
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
  idleTimeout: 15 * 60, // 15 minutes
  absoluteTimeout: 8 * 60 * 60, // 8 hours
};

// Frontend session monitoring
class SessionManager {
  private lastActivity: Date;
  private idleTimer: NodeJS.Timeout;

  startMonitoring() {
    // Reset idle timer on user activity
    document.addEventListener('mousemove', this.resetIdleTimer);
    document.addEventListener('keypress', this.resetIdleTimer);

    // Check session expiry every minute
    setInterval(this.checkSession, 60000);
  }

  resetIdleTimer() {
    this.lastActivity = new Date();
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(this.handleIdle, SESSION_CONFIG.idleTimeout * 1000);
  }

  handleIdle() {
    // Logout user due to inactivity
    logout();
  }
}
```

---

## Database Schema

### Portal-Specific Tables

```sql
-- ============================================
-- Portal Users
-- ============================================
CREATE TABLE portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,

    -- MFA
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method VARCHAR(20), -- 'SMS', 'TOTP', 'EMAIL'
    mfa_phone VARCHAR(20),

    -- Account Status
    account_status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, LOCKED, PENDING_VERIFICATION
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,

    -- Security
    failed_login_attempts INT DEFAULT 0,
    last_failed_login TIMESTAMP,
    account_locked_until TIMESTAMP,
    last_login TIMESTAMP,
    last_login_ip INET,
    password_changed_at TIMESTAMP,
    force_password_change BOOLEAN DEFAULT FALSE,

    -- Preferences
    preferences JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT chk_account_status CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_VERIFICATION'))
);

CREATE INDEX idx_portal_users_client ON portal_users(client_id);
CREATE INDEX idx_portal_users_email ON portal_users(email);
CREATE INDEX idx_portal_users_cognito ON portal_users(cognito_user_id);
CREATE INDEX idx_portal_users_status ON portal_users(account_status);

-- ============================================
-- Portal Sessions
-- ============================================
CREATE TABLE portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_user_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),

    -- Device Info
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- DESKTOP, MOBILE, TABLET
    device_os VARCHAR(50),
    browser VARCHAR(50),

    -- Session Management
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoke_reason VARCHAR(255)
);

CREATE INDEX idx_portal_sessions_user ON portal_sessions(portal_user_id);
CREATE INDEX idx_portal_sessions_token ON portal_sessions(session_token);
CREATE INDEX idx_portal_sessions_expires ON portal_sessions(expires_at);

-- ============================================
-- Portal Audit Log (HIPAA Compliance)
-- ============================================
CREATE TABLE portal_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_user_id UUID REFERENCES portal_users(id),
    client_id UUID REFERENCES clients(id),

    -- Action Details
    action VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, VIEW_DOCUMENT, DOWNLOAD_DOCUMENT, etc.
    resource_type VARCHAR(50), -- APPOINTMENT, DOCUMENT, MESSAGE, FORM, etc.
    resource_id UUID,

    -- Request Details
    details JSONB,
    ip_address INET,
    user_agent TEXT,

    -- Result
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_portal_user ON portal_audit_log(portal_user_id, timestamp DESC);
CREATE INDEX idx_audit_client ON portal_audit_log(client_id, timestamp DESC);
CREATE INDEX idx_audit_action ON portal_audit_log(action, timestamp DESC);
CREATE INDEX idx_audit_resource ON portal_audit_log(resource_type, resource_id);

-- ============================================
-- Portal Documents
-- ============================================
CREATE TABLE portal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

    -- Document Info
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- INTAKE_FORM, TREATMENT_PLAN, INSURANCE_CARD, etc.
    description TEXT,

    -- Storage
    s3_bucket VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Sharing
    shared_by UUID REFERENCES users(id),
    shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    -- Access Tracking
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portal_docs_client ON portal_documents(client_id);
CREATE INDEX idx_portal_docs_type ON portal_documents(document_type);
CREATE INDEX idx_portal_docs_expires ON portal_documents(expires_at);

-- ============================================
-- Portal Notifications
-- ============================================
CREATE TABLE portal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_user_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,

    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- APPOINTMENT_REMINDER, NEW_MESSAGE, FORM_ASSIGNED, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),

    -- Priority
    priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT

    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP,

    -- Delivery
    send_email BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    send_sms BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_portal_notifs_user ON portal_notifications(portal_user_id, read, created_at DESC);
CREATE INDEX idx_portal_notifs_type ON portal_notifications(notification_type);

-- ============================================
-- Update Existing Tables
-- ============================================

-- Add portal-related fields to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requested_via VARCHAR(20); -- PORTAL, PHONE, IN_PERSON
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS portal_cancellation_reason TEXT;

-- Add portal-related fields to portal_forms (already exists from PRD)
ALTER TABLE portal_forms ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE portal_forms ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
ALTER TABLE portal_forms ADD COLUMN IF NOT EXISTS completed_via VARCHAR(20); -- PORTAL, IN_PERSON

-- Add portal-related fields to portal_messages (already exists from PRD)
ALTER TABLE portal_messages ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE portal_messages ADD COLUMN IF NOT EXISTS requires_response BOOLEAN DEFAULT FALSE;
ALTER TABLE portal_messages ADD COLUMN IF NOT EXISTS response_due_date DATE;
```

---

## API Specifications

### Authentication Endpoints

#### POST /api/v1/portal/auth/register

Register a new client portal user.

**Request:**
```typescript
interface RegisterRequest {
  email: string;           // Must match existing client email
  password: string;        // Min 12 chars, uppercase, lowercase, number, symbol
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth: string;     // For identity verification
}
```

**Response:**
```typescript
interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    portalUserId: string;
    email: string;
    verificationRequired: boolean;
  };
}
```

**Validation:**
- Email must exist in clients table
- Date of birth must match client record
- Password must meet complexity requirements
- Rate limit: 3 attempts per hour per email

**Errors:**
- 400: Validation failed
- 409: Email already registered
- 429: Too many attempts
- 500: Internal server error

---

#### POST /api/v1/portal/auth/login

Authenticate client portal user.

**Request:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;        // If MFA enabled
}
```

**Response:**
```typescript
interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      clientId: string;
      mfaEnabled: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}
```

**Security:**
- Rate limit: 5 attempts per 15 minutes per IP
- Account lockout after 5 failed attempts
- Audit log created for all login attempts
- Session created in portal_sessions table

---

### Appointment Endpoints

#### GET /api/v1/portal/appointments

List client's appointments.

**Query Parameters:**
```typescript
interface AppointmentQuery {
  status?: 'upcoming' | 'past' | 'cancelled';
  startDate?: string;      // ISO 8601
  endDate?: string;
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface AppointmentsResponse {
  success: boolean;
  data: {
    appointments: Array<{
      id: string;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      duration: number;
      appointmentType: string;
      serviceLocation: string;
      clinician: {
        id: string;
        firstName: string;
        lastName: string;
        title: string;
      };
      status: string;
      notes?: string;
      telehealthLink?: string;
      canCancel: boolean;
      cancellationDeadline?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

---

#### POST /api/v1/portal/appointments/request

Request a new appointment.

**Request:**
```typescript
interface AppointmentRequest {
  clinicianId?: string;           // Optional: specific clinician
  appointmentType: string;        // e.g., "Initial Consultation", "Follow-up"
  preferredDate1: string;         // ISO 8601
  preferredTime1: string;         // HH:mm
  preferredDate2?: string;        // Alternative date/time
  preferredTime2?: string;
  preferredDate3?: string;
  preferredTime3?: string;
  serviceLocation: 'TELEHEALTH' | 'IN_OFFICE';
  notes?: string;
  reasonForVisit: string;
}
```

**Response:**
```typescript
interface AppointmentRequestResponse {
  success: boolean;
  message: string;
  data: {
    requestId: string;
    status: 'PENDING';
    submittedAt: string;
  };
}
```

**Business Logic:**
- Create appointment with status "REQUESTED"
- Notify practice staff
- Send confirmation email to client
- Audit log entry

---

### Form Endpoints

#### GET /api/v1/portal/forms

List forms assigned to client.

**Query Parameters:**
```typescript
interface FormQuery {
  status?: 'pending' | 'in_progress' | 'completed';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface FormsResponse {
  success: boolean;
  data: {
    forms: Array<{
      id: string;
      formType: string;
      formTitle: string;
      description?: string;
      assignedDate: string;
      dueDate?: string;
      status: string;
      completedDate?: string;
      isOverdue: boolean;
      estimatedMinutes?: number;
    }>;
    pagination: PaginationMeta;
  };
}
```

---

#### POST /api/v1/portal/forms/:id/submit

Submit completed form.

**Request:**
```typescript
interface FormSubmission {
  responses: Record<string, any>;  // Form field responses
  signature?: string;              // Base64 encoded signature image
  signatureDate?: string;
  attestation: boolean;            // "I certify this information is accurate"
}
```

**Response:**
```typescript
interface FormSubmissionResponse {
  success: boolean;
  message: string;
  data: {
    submissionId: string;
    submittedAt: string;
    status: 'COMPLETED';
  };
}
```

**Business Logic:**
- Validate all required fields
- Store signature if provided
- Update form status
- Notify assigned clinician
- Generate PDF copy
- Audit log entry

---

### Message Endpoints

#### GET /api/v1/portal/messages

List message threads.

**Response:**
```typescript
interface MessagesResponse {
  success: boolean;
  data: {
    threads: Array<{
      threadId: string;
      subject: string;
      participants: Array<{
        id: string;
        name: string;
        type: 'CLIENT' | 'CLINICIAN';
        title?: string;
      }>;
      lastMessage: {
        id: string;
        fromName: string;
        preview: string;
        sentDate: string;
        read: boolean;
      };
      unreadCount: number;
      priority: string;
    }>;
  };
}
```

---

#### POST /api/v1/portal/messages

Send new message.

**Request:**
```typescript
interface SendMessageRequest {
  toUserId: string;              // Clinician ID
  subject: string;
  messageBody: string;
  attachments?: Array<{
    fileName: string;
    fileData: string;          // Base64 or multipart
    mimeType: string;
  }>;
  priority?: 'NORMAL' | 'HIGH';
}
```

**Response:**
```typescript
interface SendMessageResponse {
  success: boolean;
  data: {
    messageId: string;
    threadId: string;
    sentDate: string;
  };
}
```

**Security:**
- Validate recipient is part of client's care team
- Scan attachments for malware
- Limit attachment size (10MB per file)
- Rate limit: 10 messages per hour
- Audit log entry

---

## Frontend Architecture

### Project Structure

```
packages/client-portal/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── api/                    # API client functions
│   │   ├── auth.ts
│   │   ├── appointments.ts
│   │   ├── forms.ts
│   │   ├── messages.ts
│   │   ├── documents.ts
│   │   ├── progress.ts
│   │   └── payments.ts
│   ├── components/             # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── widgets/
│   │       ├── AppointmentWidget.tsx
│   │       ├── FormWidget.tsx
│   │       └── MessageWidget.tsx
│   ├── pages/                  # Page components
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── VerifyEmail.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   ├── appointments/
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── AppointmentDetail.tsx
│   │   │   └── RequestAppointment.tsx
│   │   ├── forms/
│   │   │   ├── FormList.tsx
│   │   │   └── FormCompletion.tsx
│   │   ├── messages/
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageThread.tsx
│   │   ├── documents/
│   │   │   └── DocumentList.tsx
│   │   ├── progress/
│   │   │   └── ProgressDashboard.tsx
│   │   ├── payments/
│   │   │   ├── PaymentHistory.tsx
│   │   │   └── MakePayment.tsx
│   │   └── profile/
│   │       └── Profile.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSession.ts
│   │   └── useNotifications.ts
│   ├── context/               # React context providers
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── utils/                 # Utility functions
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── types/                 # TypeScript types
│   │   ├── auth.ts
│   │   ├── appointment.ts
│   │   ├── form.ts
│   │   └── ...
│   ├── App.tsx
│   ├── index.tsx
│   └── routes.tsx
├── package.json
└── tsconfig.json
```

### Routing Structure

```typescript
// routes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/appointments">
          <Route index element={<AppointmentList />} />
          <Route path=":id" element={<AppointmentDetail />} />
          <Route path="request" element={<RequestAppointment />} />
        </Route>

        <Route path="/forms">
          <Route index element={<FormList />} />
          <Route path=":id" element={<FormCompletion />} />
        </Route>

        <Route path="/messages">
          <Route index element={<MessageList />} />
          <Route path=":threadId" element={<MessageThread />} />
        </Route>

        <Route path="/documents" element={<DocumentList />} />
        <Route path="/progress" element={<ProgressDashboard />} />
        <Route path="/payments" element={<PaymentHistory />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

### State Management

```typescript
// Using React Query for server state
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Example: Fetch appointments
export function useAppointments(status?: string) {
  return useQuery({
    queryKey: ['appointments', status],
    queryFn: () => api.appointments.list({ status }),
  });
}

// Example: Submit form
export function useSubmitForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormSubmission) => api.forms.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}
```

---

## Security Implementation

### Input Validation

```typescript
// Using Zod for validation
import { z } from 'zod';

// Registration schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  dateOfBirth: z.string().datetime(),
});

// Message schema
export const messageSchema = z.object({
  toUserId: z.string().uuid(),
  subject: z.string().min(1).max(255),
  messageBody: z.string().min(1).max(10000),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileData: z.string(),
        mimeType: z.string(),
      })
    )
    .max(5)
    .optional(),
});
```

### Rate Limiting

```typescript
// Backend rate limiting with express-rate-limit
import rateLimit from 'express-rate-limit';

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Message rate limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 messages
  message: 'Message limit exceeded. Please try again later.',
});

// Apply to routes
router.post('/api/v1/portal/auth/login', loginLimiter, loginHandler);
router.post('/api/v1/portal/messages', messageLimiter, sendMessageHandler);
```

### Audit Logging

```typescript
// Audit middleware
export async function auditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  portalUserId: string,
  clientId: string,
  details?: Record<string, any>,
  req?: Request
) {
  await prisma.portalAuditLog.create({
    data: {
      portalUserId,
      clientId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
    },
  });
}

// Usage in controller
export async function downloadDocument(req: Request, res: Response) {
  const { id } = req.params;
  const { portalUserId, clientId } = req.user;

  // ... fetch document ...

  // Audit log
  await auditLog(
    'DOWNLOAD_DOCUMENT',
    'DOCUMENT',
    id,
    portalUserId,
    clientId,
    { documentName: document.name },
    req
  );

  // ... send file ...
}
```

---

## Integration Points

### Stripe Payment Integration

```typescript
// Backend: Process payment
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function processPayment(
  amount: number,
  clientId: string,
  paymentMethodId: string
) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      customer: clientId, // Stripe customer ID
      confirm: true,
      metadata: {
        clientId,
        source: 'client_portal',
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Payment failed:', error);
    throw error;
  }
}

// Frontend: Payment form with Stripe Elements
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

export function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);

    // Create payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      console.error(error);
      return;
    }

    // Send to backend
    await api.payments.process({
      amount: totalAmount,
      paymentMethodId: paymentMethod.id,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Pay ${totalAmount}</button>
    </form>
  );
}
```

### AWS SES Email Integration

```typescript
// Email service
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION });

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
) {
  const command = new SendEmailCommand({
    Source: 'noreply@mentalspace.com',
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Html: {
          Data: htmlBody,
        },
        Text: {
          Data: textBody,
        },
      },
    },
  });

  try {
    const response = await sesClient.send(command);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error('Email failed:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  appointmentConfirmation: (appointment) => ({
    subject: 'Appointment Confirmation',
    html: `
      <h1>Appointment Confirmed</h1>
      <p>Your appointment has been scheduled for ${appointment.date} at ${appointment.time}.</p>
      <p>Clinician: ${appointment.clinician}</p>
      <p>Location: ${appointment.location}</p>
    `,
    text: `Appointment confirmed for ${appointment.date} at ${appointment.time}`,
  }),

  formReminder: (form) => ({
    subject: 'Form Reminder',
    html: `
      <h1>You have a pending form</h1>
      <p>Please complete "${form.title}" by ${form.dueDate}.</p>
      <a href="${form.link}">Complete Form</a>
    `,
    text: `Please complete ${form.title} by ${form.dueDate}`,
  }),
};
```

---

## Performance Requirements

### Response Time Targets
- Page load: < 2 seconds
- API response: < 500ms (p95)
- Database queries: < 100ms (p95)

### Scalability
- Support 1,000 concurrent users
- Handle 100 requests/second
- Database connection pooling (min: 10, max: 50)

### Caching Strategy
```typescript
// API response caching with Redis
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheMiddleware(req, res, next) {
  const key = `cache:${req.originalUrl}`;

  const cached = await redis.get(key);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Override res.json to cache response
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    redis.setex(key, 300, JSON.stringify(data)); // 5 min TTL
    return originalJson(data);
  };

  next();
}
```

---

**End of Technical Specifications**

For questions or clarifications, refer to the main [PHASE-7-OVERVIEW.md](./PHASE-7-OVERVIEW.md) document.
