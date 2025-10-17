# Client Portal Implementation Status

## Overview
The Client Portal is a separate web application that allows clients (patients) to interact with the MentalSpace EHR system securely.

---

## ✅ COMPLETED

### Database Models (100%)
All necessary database models have been created and migrated:

1. **PortalAccount** - Client portal authentication
   - Email/password authentication
   - MFA support
   - Account status management
   - Email verification
   - Failed login tracking
   - Account locking

2. **IntakeForm** - Dynamic intake forms
   - Form structure (JSON-based fields)
   - Form types (Initial, Annual Update, Symptom Checklist, Custom)
   - Active/inactive status
   - Assignment to new clients

3. **IntakeFormSubmission** - Client form responses
   - Form responses (JSON storage)
   - Submission status (Draft, Submitted, Reviewed)
   - IP/User Agent tracking
   - Review notes

4. **PortalMessage** - Secure messaging
   - Client-clinician communication
   - Thread tracking
   - Attachments support
   - Priority levels
   - Read status tracking

5. **PrescriptionRefillRequest** - Medication refills
   - Medication details
   - Prescriber tracking
   - Pharmacy information
   - Approval workflow
   - Status tracking

### Backend Services (20%)
1. **portalAuth.service.ts** (COMPLETE)
   - Register portal account
   - Portal login with JWT tokens
   - Email verification
   - Password reset
   - Account locking after failed attempts
   - Client information in token

---

## ⏳ IN PROGRESS

### Backend APIs (20%)
Need to create controllers and routes for:

1. **Portal Authentication**
   - ✅ Service created
   - ❌ Controller needed
   - ❌ Routes needed

2. **Appointments (Client View)**
   - ❌ Service needed
   - ❌ Controller needed
   - ❌ Routes needed

3. **Secure Messaging**
   - ❌ Service needed
   - ❌ Controller needed
   - ❌ Routes needed

4. **Intake Forms**
   - ❌ Service needed
   - ❌ Controller needed
   - ❌ Routes needed

5. **Prescription Refills**
   - ❌ Service needed
   - ❌ Controller needed
   - ❌ Routes needed

6. **Document Access**
   - ❌ Service needed
   - ❌ Controller needed
   - ❌ Routes needed

7. **Billing Statements**
   - ❌ Service needed
   - ❌ Controller needed
   - ❌ Routes needed

---

## ❌ NOT STARTED

### Payment Integration (0%)
- Stripe integration
- Payment processing
- Saved payment methods
- Payment history

### Frontend (0%)
- Client Portal UI
- Login/Register pages
- Dashboard
- Appointments page
- Messages page
- Documents page
- Billing page
- Forms page
- Prescription refills page

---

## API Endpoints Design

### Authentication
```
POST   /api/v1/portal/auth/register
POST   /api/v1/portal/auth/login
POST   /api/v1/portal/auth/verify-email
POST   /api/v1/portal/auth/forgot-password
POST   /api/v1/portal/auth/reset-password
POST   /api/v1/portal/auth/logout
POST   /api/v1/portal/auth/refresh-token
```

### Appointments
```
GET    /api/v1/portal/appointments              - List upcoming appointments
GET    /api/v1/portal/appointments/:id          - Get appointment details
POST   /api/v1/portal/appointments/request      - Request new appointment
PUT    /api/v1/portal/appointments/:id/cancel   - Cancel appointment
PUT    /api/v1/portal/appointments/:id/reschedule - Request reschedule
```

### Messages
```
GET    /api/v1/portal/messages                  - List messages
GET    /api/v1/portal/messages/:id              - Get message thread
POST   /api/v1/portal/messages                  - Send new message
PUT    /api/v1/portal/messages/:id/read         - Mark as read
POST   /api/v1/portal/messages/:id/reply        - Reply to message
```

### Forms
```
GET    /api/v1/portal/forms                     - List available forms
GET    /api/v1/portal/forms/:id                 - Get form structure
POST   /api/v1/portal/forms/:id/submit          - Submit form
GET    /api/v1/portal/forms/submissions         - List submissions
GET    /api/v1/portal/forms/submissions/:id     - Get submission
```

### Documents
```
GET    /api/v1/portal/documents                 - List accessible documents
GET    /api/v1/portal/documents/:id             - Get document metadata
GET    /api/v1/portal/documents/:id/download    - Download document
```

### Billing
```
GET    /api/v1/portal/billing/statements        - List statements
GET    /api/v1/portal/billing/statements/:id    - Get statement details
GET    /api/v1/portal/billing/balance           - Get current balance
POST   /api/v1/portal/billing/payment           - Make payment
```

### Prescriptions
```
GET    /api/v1/portal/prescriptions             - List active prescriptions
POST   /api/v1/portal/prescriptions/refill      - Request refill
GET    /api/v1/portal/prescriptions/refills     - List refill requests
GET    /api/v1/portal/prescriptions/refills/:id - Get refill status
```

---

## Frontend Pages Design

### 1. Login Page
- Email/password form
- "Forgot Password" link
- "Register" link

### 2. Register Page
- Client lookup (DOB + last 4 SSN or MRN)
- Email/password creation
- Terms acceptance

### 3. Dashboard
- Upcoming appointments
- Unread messages count
- Pending forms count
- Outstanding balance
- Quick actions

### 4. Appointments Page
- Calendar view
- Upcoming appointments list
- Past appointments list
- Request new appointment
- Cancel/reschedule

### 5. Messages Page
- Message threads list
- Message detail view
- Compose new message
- Attachments support

### 6. Forms Page
- Available forms list
- Completed forms list
- Form fill interface

### 7. Documents Page
- Document categories
- Document list
- View/download

### 8. Billing Page
- Current balance
- Statement history
- Payment history
- Make payment (Stripe)

### 9. Prescriptions Page
- Active medications list
- Request refill form
- Refill request history

### 10. Profile Settings
- Personal information (read-only)
- Change password
- Notification preferences
- MFA setup

---

## Security Requirements

### Authentication
- ✅ JWT-based authentication
- ✅ Separate token audience for portal (`mentalspace-portal`)
- ✅ Account locking after 5 failed attempts (30 min)
- ⏳ MFA support (model ready, implementation needed)
- ⏳ Email verification required
- ⏳ Password complexity requirements

### Authorization
- All endpoints must verify client identity
- Clients can only access their own data
- No access to other clients' information
- Audit logging for all PHI access

### Data Protection
- All PHI transmitted over HTTPS
- Documents served via presigned S3 URLs (expiring)
- Messages encrypted at rest
- Form responses encrypted

### Compliance
- HIPAA-compliant messaging
- Audit trail for all access
- Session timeout (15 minutes inactive)
- Secure password reset flow

---

## Integration Points

### With Main EHR System
- **Appointments**: Read-only access to client's appointments
- **Documents**: Access to documents marked "sharedWithClient"
- **Billing**: Access to client's statements
- **Messages**: Two-way messaging with clinician
- **Forms**: Submit responses that clinicians can review

### With External Services
- **Stripe**: Payment processing
- **Twilio**: SMS notifications
- **SendGrid**: Email notifications
- **AWS S3**: Document storage

---

## Deployment Architecture

### Backend
- Same ECS cluster as main API
- Separate service or same service with `/portal` prefix
- Uses same database

### Frontend
- Separate S3 bucket: `mentalspace-portal-[env]`
- Separate CloudFront distribution
- Custom subdomain: `portal.mentalspaceehr.com`

---

## Testing Requirements

### Unit Tests
- Authentication logic
- Data validation
- Authorization checks

### Integration Tests
- Login flow
- Message sending
- Form submission
- Document access

### E2E Tests
- Complete user journey
- Appointment scheduling
- Payment processing

---

## Next Steps

### Priority 1: Core API Completion
1. Create portal authentication controller and routes
2. Create appointment viewing service/controller/routes
3. Create messaging service/controller/routes
4. Create document access service/controller/routes

### Priority 2: Frontend Development
1. Set up React app structure
2. Implement authentication pages
3. Implement dashboard
4. Implement core features (appointments, messages, documents)

### Priority 3: Payment Integration
1. Set up Stripe account
2. Implement payment backend
3. Implement payment frontend
4. Test payment flow

### Priority 4: Additional Features
1. Intake forms system
2. Prescription refills
3. MFA implementation
4. Advanced features

---

## Estimated Completion Time

- **Core API (Priority 1)**: 8-12 hours
- **Frontend (Priority 2)**: 16-24 hours
- **Payment Integration (Priority 3)**: 4-6 hours
- **Additional Features (Priority 4)**: 8-12 hours

**Total**: 36-54 hours of development

---

## Current Status Summary

**Overall Completion**: ~20%
- Database: 100% ✅
- Backend Services: 20% ⏳
- Backend APIs: 10% ⏳
- Frontend: 0% ❌
- Payment Integration: 0% ❌

**Recommendation**: Focus on completing Priority 1 (Core APIs) to enable frontend development.
