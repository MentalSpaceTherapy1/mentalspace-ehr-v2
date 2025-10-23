# Authentication & User Management System Analysis

**Date**: October 22, 2025
**Analysis**: Current capabilities vs. Required features

---

## Current System Capabilities

### 1. Staff Users (EHR System)

#### ✅ What EXISTS:
- **User Creation**: Admin can create staff users via `/api/v1/users` (POST)
- **Password Management**:
  - Admin can reset user passwords via `/api/v1/users/:id/reset-password` (POST)
  - Passwords are hashed with bcrypt (12 rounds)
- **Email Service**: Configured with nodemailer
- **Email Templates**:
  - ✅ Welcome email template with temporary password
  - ✅ Password reset email template
- **User Roles**: Support for multiple roles (ADMINISTRATOR, SUPERVISOR, CLINICIAN, etc.)
- **User Activation/Deactivation**: Admin can activate/deactivate accounts

#### ❌ What's MISSING for Staff:
1. **No automatic email sending** when creating new staff users
2. **No temporary password generation** - Admin must manually provide password
3. **No force password change** on first login
4. **No email invitation workflow** - Email templates exist but aren't integrated
5. **No "must change password" flag** in database

---

### 2. Client Portal Accounts

#### ✅ What EXISTS:
- **Registration Endpoint**: `/portal-auth/register` (POST)
- **Email Verification**: Token-based verification system
  - Verification token generated on registration
  - `/portal-auth/verify-email` endpoint
  - `/portal-auth/resend-verification` endpoint
- **Password Reset**: Full workflow
  - `/portal-auth/forgot-password` (POST)
  - `/portal-auth/reset-password` (POST)
  - Email template for password reset
- **Account Status Tracking**: `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`
- **Portal Access Control**: `portalAccessGranted` flag

#### ❌ What's MISSING for Clients:
1. **No email sending integration** - Comments show "TODO: Send verification email"
2. **No automatic client invitation** from staff interface
3. **No staff-initiated client account creation** workflow

---

## Gap Analysis

### Missing Feature #1: Client Account Creation & Email Invitation

**Current State**:
- Clients must self-register via `/portal-auth/register`
- No way for staff to invite clients from EHR interface
- Verification emails are not sent (only logged in dev mode)

**What's Needed**:
1. Staff interface to invite clients to portal
2. Automatic email sent to client with:
   - Registration link or temporary credentials
   - Instructions to set up account
   - Verification link
3. Email should be sent when staff creates portal account for client

---

### Missing Feature #2: Staff Account Creation with Email Invitation

**Current State**:
- Admin creates user with permanent password
- No email sent to new staff member
- Welcome email template exists but is never called
- No forced password change requirement

**What's Needed**:
1. Generate temporary random password when creating staff user
2. Set "mustChangePassword" flag (needs DB field)
3. Send welcome email automatically with:
   - Temporary password
   - Login link
   - Instructions to change password on first login
4. Force password change on first login (middleware check)

---

### Missing Feature #3: Password Reset for Staff

**Current State**:
- Only admin can reset staff passwords via API
- No self-service "forgot password" for staff
- Password reset email template exists but not used for staff

**What's Needed**:
1. Staff "Forgot Password" endpoint (similar to portal)
2. Send password reset email to staff
3. Token-based reset link
4. Self-service password reset page

---

## Implementation Requirements

### 1. Database Schema Changes

**New fields needed in `User` table**:
```prisma
model User {
  // ... existing fields ...

  mustChangePassword    Boolean   @default(false)
  passwordResetToken    String?   @unique
  passwordResetExpiry   DateTime?
  emailVerified         Boolean   @default(false)
  emailVerificationToken String?  @unique
}
```

---

### 2. Backend Services to Create/Modify

#### A. Enhanced User Service (`user.service.ts`)

**New function: `createUserWithInvitation`**
```typescript
async createUserWithInvitation(data: CreateUserDto, createdBy: string) {
  // 1. Generate temporary random password
  const tempPassword = generateSecurePassword();

  // 2. Create user with mustChangePassword = true
  const user = await createUser({
    ...data,
    password: tempPassword,
    mustChangePassword: true,
  });

  // 3. Send welcome email with temp password
  await sendEmail({
    to: user.email,
    ...EmailTemplates.welcome(user.firstName, user.email, tempPassword)
  });

  return { user, tempPassword }; // For admin to see if email fails
}
```

**New function: `requestPasswordReset` (for staff)**
```typescript
async requestPasswordReset(email: string) {
  // 1. Find user by email
  // 2. Generate reset token
  // 3. Save token with expiry (1 hour)
  // 4. Send password reset email
  // 5. Return success
}
```

---

#### B. Enhanced Portal Auth Service (`portalAuth.service.ts`)

**Modify: `registerPortalAccount`**
```typescript
// Replace TODO comment with actual email sending:
await sendEmail({
  to: data.email,
  subject: 'Verify Your MentalSpace Portal Account',
  html: EmailTemplates.clientVerification(
    client.firstName,
    verificationToken,
    `${process.env.FRONTEND_URL}/portal/verify?token=${verificationToken}`
  )
});
```

**New function: `inviteClientToPortal`**
```typescript
async inviteClientToPortal(clientId: string, invitedBy: string) {
  // 1. Check if client exists
  // 2. Check if portal account already exists
  // 3. Get client email from Client record
  // 4. Generate verification token
  // 5. Create portal account with PENDING_VERIFICATION status
  // 6. Send invitation email
  // 7. Return invitation details
}
```

---

#### C. New Email Templates

**Add to `email.service.ts`:**

```typescript
clientInvitation: (firstName: string, invitationLink: string) => ({
  subject: 'You\'re Invited to MentalSpace Client Portal',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Welcome to MentalSpace Client Portal!</h2>
      <p>Hi ${firstName},</p>
      <p>You've been invited to access our secure client portal where you can:</p>
      <ul>
        <li>View and manage appointments</li>
        <li>Complete intake forms</li>
        <li>Communicate securely with your provider</li>
        <li>Access important documents</li>
      </ul>
      <div style="margin: 24px 0;">
        <a href="${invitationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Set Up Your Account
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in 7 days.</p>
    </div>
  `,
}),

clientVerification: (firstName: string, verificationToken: string, verificationLink: string) => ({
  subject: 'Verify Your MentalSpace Portal Account',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Verify Your Email</h2>
      <p>Hi ${firstName},</p>
      <p>Please verify your email address to activate your MentalSpace Portal account:</p>
      <div style="margin: 24px 0;">
        <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:</p>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verificationLink}</p>
    </div>
  `,
}),
```

---

### 3. Frontend Components Needed

#### A. Staff User Management

**New: Invite Staff Member Dialog**
- Form to enter staff details
- Role selection
- Email input
- "Send Invitation" button
- Shows "Invitation sent successfully" message

**Modified: User List**
- Show "Pending First Login" badge for `mustChangePassword = true`
- "Resend Invitation" button

#### B. Client Portal Management

**New: Invite Client to Portal Button**
- In client demographics tab
- "Invite to Portal" button
- Shows invitation status
- "Resend Invitation" option

**New: Portal Invitations List**
- Show all pending portal invitations
- Status: Pending, Verified, Active
- Resend invitation option

#### C. Authentication Flow

**Modified: Staff Login**
- After successful login, check `mustChangePassword`
- If true, redirect to "Change Password" page
- Force password change before accessing system

**New: Staff Forgot Password Page**
- Email input
- "Send Reset Link" button
- Success message
- Reset password form (when clicking email link)

---

### 4. API Endpoints to Add

#### Staff User Management

```
POST   /api/v1/users/invite
       - Create user and send invitation email
       - Body: { email, firstName, lastName, roles, ... }
       - Response: { user, invitationSent: true }

POST   /api/v1/users/:id/resend-invitation
       - Resend welcome email with new temp password
       - Response: { message: "Invitation resent" }

POST   /api/v1/auth/forgot-password
       - Request password reset for staff
       - Body: { email }
       - Response: { message: "Reset email sent" }

POST   /api/v1/auth/reset-password
       - Reset password using token
       - Body: { token, newPassword }
       - Response: { message: "Password reset successful" }

POST   /api/v1/auth/change-password
       - Change password after first login
       - Body: { oldPassword, newPassword }
       - Response: { message: "Password changed" }
```

#### Client Portal Management

```
POST   /api/v1/clients/:id/invite-to-portal
       - Create portal account and send invitation
       - Response: { portalAccount, invitationSent: true }

POST   /api/v1/clients/:id/resend-portal-invitation
       - Resend verification email
       - Response: { message: "Invitation resent" }

GET    /api/v1/clients/:id/portal-status
       - Get portal account status
       - Response: { hasPortalAccount, status, emailVerified, ... }
```

---

### 5. Email Configuration Requirements

**Environment Variables Needed**:
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@mentalspaceehr.com
SMTP_PASS=<app-specific-password>

# Frontend URLs for email links
FRONTEND_URL=https://mentalspaceehr.com
PORTAL_URL=https://mentalspaceehr.com/portal
```

**AWS SES Option** (Recommended for Production):
```typescript
// Use AWS SES instead of SMTP
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: 'us-east-1' });

async function sendEmailViaSES(options: EmailOptions) {
  const command = new SendEmailCommand({
    Source: 'MentalSpace EHR <noreply@mentalspaceehr.com>',
    Destination: {
      ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
    },
    Message: {
      Subject: { Data: options.subject },
      Body: {
        Html: { Data: options.html },
        Text: { Data: options.text || stripHtml(options.html) },
      },
    },
  });

  await sesClient.send(command);
}
```

---

## Summary of Gaps

| Feature | Status | Priority |
|---------|--------|----------|
| Client email invitation from staff | ❌ Missing | HIGH |
| Client verification email sending | ❌ Missing | HIGH |
| Staff invitation with temp password | ❌ Missing | HIGH |
| Force password change on first login | ❌ Missing | HIGH |
| Staff forgot password (self-service) | ❌ Missing | MEDIUM |
| Email template integration | ⚠️ Partial | HIGH |
| SMTP/SES configuration | ⚠️ Partial | HIGH |

---

## Recommended Implementation Order

### Phase 1: Email Infrastructure (1-2 hours)
1. Configure SMTP or AWS SES for production
2. Test email sending in production environment
3. Verify email deliverability

### Phase 2: Staff User Invitations (2-3 hours)
1. Add database fields (`mustChangePassword`, `passwordResetToken`, etc.)
2. Create `inviteUser` service function
3. Add `/users/invite` API endpoint
4. Implement force password change middleware
5. Create frontend "Invite Staff" dialog
6. Create "Change Password on First Login" page

### Phase 3: Client Portal Invitations (2-3 hours)
1. Implement `inviteClientToPortal` service
2. Add `/clients/:id/invite-to-portal` endpoint
3. Integrate email sending in registration flow
4. Create "Invite to Portal" button in client demographics
5. Create portal invitations management interface

### Phase 4: Password Reset (1-2 hours)
1. Implement staff forgot password endpoints
2. Create forgot password page for staff
3. Test password reset flow end-to-end

**Total Estimated Time**: 6-10 hours

---

## Security Considerations

1. **Temporary Passwords**:
   - Must be cryptographically random
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols

2. **Password Reset Tokens**:
   - UUID v4 for unpredictability
   - 1-hour expiration
   - Single-use only
   - Invalidate on password change

3. **Email Verification Tokens**:
   - UUID v4
   - 7-day expiration for invitations
   - 24-hour expiration for verification

4. **Rate Limiting**:
   - ✅ Already implemented for login
   - ✅ Already implemented for password reset
   - Add for invitation resending (max 3 per hour)

5. **Email Security**:
   - Use TLS for SMTP
   - Verify sender domain (SPF, DKIM, DMARC)
   - Monitor for bounces and abuse

---

## Testing Requirements

### Unit Tests Needed:
- [ ] Generate temporary password (strength validation)
- [ ] Create user with invitation
- [ ] Send invitation email
- [ ] Password reset token generation
- [ ] Token expiration validation
- [ ] Email verification flow

### Integration Tests Needed:
- [ ] Complete staff invitation workflow
- [ ] Complete client invitation workflow
- [ ] Password reset workflow
- [ ] Email deliverability
- [ ] First login password change enforcement

### Manual Testing Checklist:
- [ ] Invite staff member → receives email → sets password → logs in
- [ ] Invite client → receives email → verifies email → creates password
- [ ] Staff forgot password → receives email → resets password
- [ ] Resend invitation → receives new email
- [ ] Expired tokens are rejected
- [ ] Rate limiting works

---

## Production Deployment Checklist

- [ ] Configure AWS SES and verify domain
- [ ] Set up email monitoring (bounces, complaints)
- [ ] Add SMTP/SES credentials to environment variables
- [ ] Run database migration for new fields
- [ ] Deploy backend with new endpoints
- [ ] Deploy frontend with new components
- [ ] Test email sending in production
- [ ] Monitor CloudWatch logs for errors
- [ ] Set up alerts for email failures

---

**Created**: October 22, 2025
**Last Updated**: October 22, 2025
