# Phase 7: Client Portal - Implementation Plan

**Timeline:** 4 weeks
**Status:** Not Started
**Priority:** High

---

## Executive Summary

The Client Portal will provide a secure, HIPAA-compliant web interface for clients to:
- Manage their appointments
- Complete intake forms and questionnaires
- Communicate securely with their care team
- View treatment progress and documents
- Make payments

---

## Core Objectives

1. **Enhance Client Engagement** - Provide 24/7 self-service access to care information
2. **Reduce Administrative Burden** - Automate form collection and appointment requests
3. **Improve Communication** - Enable secure, asynchronous messaging
4. **Increase Revenue** - Facilitate online payment processing
5. **Ensure Compliance** - Maintain HIPAA compliance for all client interactions

---

## Technical Architecture

### Authentication & Authorization
- **AWS Cognito** for client authentication
- Separate user pool from staff/clinician authentication
- MFA support (SMS, TOTP)
- Email verification required
- Password reset flow

### Frontend
- **Separate React Application** (`packages/client-portal`)
- Shared component library with main app
- Mobile-responsive design (Bootstrap/TailwindCSS)
- Progressive Web App (PWA) capabilities for mobile

### Backend
- Extend existing Express API with client portal routes
- New authentication middleware for portal users
- Rate limiting for public-facing endpoints
- Separate logging for client portal activity

### Database
- Portal-specific tables (already defined in PRD):
  - `portal_users`
  - `portal_forms`
  - `portal_messages`
  - `progress_trackers`
  - `portal_documents`
  - `portal_sessions`

---

## Feature Breakdown

### 1. Authentication & Account Management (Week 1, Part 1)
**Status:** ⬜ Not Started

**Features:**
- [ ] Client registration flow
- [ ] Email verification
- [ ] Login/logout
- [ ] Password reset
- [ ] MFA enrollment
- [ ] Profile management
- [ ] Privacy settings

**Implementation Tasks:**
- [ ] Set up AWS Cognito user pool for clients
- [ ] Create portal authentication middleware
- [ ] Implement registration API endpoints
- [ ] Build login/registration UI
- [ ] Implement email verification flow
- [ ] Add password reset functionality
- [ ] Create profile management pages

**Dependencies:**
- AWS Cognito configuration
- Email service (SES or SendGrid)

---

### 2. Dashboard & Navigation (Week 1, Part 2)
**Status:** ⬜ Not Started

**Features:**
- [ ] Personalized dashboard
- [ ] Upcoming appointments widget
- [ ] Pending forms/tasks
- [ ] Recent messages
- [ ] Quick actions menu
- [ ] Notifications center

**Implementation Tasks:**
- [ ] Design dashboard layout
- [ ] Create dashboard API endpoint
- [ ] Build reusable widget components
- [ ] Implement notification system
- [ ] Add navigation menu
- [ ] Create breadcrumb navigation

---

### 3. Appointment Management (Week 2, Part 1)
**Status:** ⬜ Not Started

**Features:**
- [ ] View upcoming appointments
- [ ] View appointment history
- [ ] Request new appointment
- [ ] Cancel appointment (with policy check)
- [ ] Join telehealth session
- [ ] Add to calendar (iCal export)
- [ ] Appointment reminders

**Implementation Tasks:**
- [ ] Create appointment viewing API
- [ ] Build appointment request workflow
- [ ] Implement cancellation policy logic
- [ ] Add telehealth session joining
- [ ] Create calendar integration
- [ ] Build appointment list UI
- [ ] Add appointment detail view

**Dependencies:**
- Existing appointment system
- Telehealth integration (Phase 3)

---

### 4. Forms & Questionnaires (Week 2, Part 2)
**Status:** ⬜ Not Started

**Features:**
- [ ] View assigned forms
- [ ] Complete forms online
- [ ] Save draft forms
- [ ] Submit completed forms
- [ ] View submission history
- [ ] Digital signature capture
- [ ] Form notifications

**Implementation Tasks:**
- [ ] Design form builder/renderer
- [ ] Create form assignment API
- [ ] Build form completion UI
- [ ] Implement draft saving
- [ ] Add signature capture component
- [ ] Create form submission workflow
- [ ] Add form notification system

**Database:**
- Use existing `portal_forms` table
- Add `portal_form_submissions` table

---

### 5. Secure Messaging (Week 3, Part 1)
**Status:** ⬜ Not Started

**Features:**
- [ ] Send messages to care team
- [ ] Receive messages from clinicians
- [ ] Message threads/conversations
- [ ] Attachment support (documents/images)
- [ ] Read receipts
- [ ] Message notifications
- [ ] Emergency message handling

**Implementation Tasks:**
- [ ] Create messaging API endpoints
- [ ] Build message thread UI
- [ ] Implement real-time notifications (WebSocket/Polling)
- [ ] Add file attachment handling
- [ ] Create message composition UI
- [ ] Implement read receipt tracking
- [ ] Add emergency message routing

**Database:**
- Use existing `portal_messages` table

**Security Considerations:**
- Encrypt attachments at rest
- Scan attachments for malware
- Size limits on attachments
- HIPAA audit logging

---

### 6. Documents & Records (Week 3, Part 2)
**Status:** ⬜ Not Started

**Features:**
- [ ] View shared documents
- [ ] Download documents
- [ ] Document categories
- [ ] Search documents
- [ ] Document version history
- [ ] Access audit logging

**Implementation Tasks:**
- [ ] Create document sharing API
- [ ] Build document viewer UI
- [ ] Implement document download
- [ ] Add search functionality
- [ ] Create document list view
- [ ] Implement access controls
- [ ] Add audit logging

**Database:**
- Extend existing `documents` table with `shared_with_client` flag

**Storage:**
- Use existing S3 bucket with client-portal prefix
- Generate time-limited presigned URLs

---

### 7. Progress Tracking (Week 4, Part 1)
**Status:** ⬜ Not Started

**Features:**
- [ ] View treatment goals
- [ ] Track symptoms/mood
- [ ] View progress charts
- [ ] Complete self-assessments
- [ ] View historical data
- [ ] Export progress reports

**Implementation Tasks:**
- [ ] Create progress tracking API
- [ ] Build progress dashboard UI
- [ ] Implement symptom/mood tracker
- [ ] Add charting/visualization
- [ ] Create self-assessment workflows
- [ ] Build data export functionality

**Database:**
- Use existing `progress_trackers` table
- Link to treatment goals

---

### 8. Payment Processing (Week 4, Part 2)
**Status:** ⬜ Not Started

**Features:**
- [ ] View balance/statements
- [ ] Make payments (Stripe)
- [ ] Saved payment methods
- [ ] Payment history
- [ ] Payment plans
- [ ] Receipt generation
- [ ] Auto-pay enrollment

**Implementation Tasks:**
- [ ] Integrate Stripe Payment API
- [ ] Create payment processing endpoints
- [ ] Build payment UI
- [ ] Implement saved payment methods
- [ ] Add payment history view
- [ ] Create receipt generation
- [ ] Implement payment plan logic

**Dependencies:**
- Stripe account setup
- PCI compliance review

---

## Security & Compliance

### HIPAA Requirements
- [ ] End-to-end encryption for sensitive data
- [ ] Audit logging for all PHI access
- [ ] Session timeout (15 minutes idle)
- [ ] Strong password requirements
- [ ] MFA enforcement option
- [ ] Business Associate Agreement with vendors
- [ ] Breach notification procedures

### Security Measures
- [ ] Rate limiting on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Input validation
- [ ] Output encoding
- [ ] Secure session management
- [ ] Regular security audits

---

## Database Schema

### New Tables Required

```sql
-- Portal Users (Client Authentication)
CREATE TABLE portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method VARCHAR(20),
    account_status VARCHAR(20) DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portal Sessions (Track client portal logins)
CREATE TABLE portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_user_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portal Audit Log (HIPAA compliance)
CREATE TABLE portal_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_user_id UUID REFERENCES portal_users(id),
    client_id UUID REFERENCES clients(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portal Documents (Shared documents)
CREATE TABLE portal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    shared_by UUID REFERENCES users(id),
    shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portal Notifications
CREATE TABLE portal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_user_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication
```
POST   /api/v1/portal/auth/register          - Register new client
POST   /api/v1/portal/auth/verify-email      - Verify email address
POST   /api/v1/portal/auth/login             - Client login
POST   /api/v1/portal/auth/logout            - Client logout
POST   /api/v1/portal/auth/refresh-token     - Refresh access token
POST   /api/v1/portal/auth/forgot-password   - Initiate password reset
POST   /api/v1/portal/auth/reset-password    - Complete password reset
POST   /api/v1/portal/auth/change-password   - Change password (authenticated)
```

### Profile
```
GET    /api/v1/portal/profile                - Get client profile
PATCH  /api/v1/portal/profile                - Update profile
GET    /api/v1/portal/profile/settings       - Get privacy settings
PATCH  /api/v1/portal/profile/settings       - Update settings
```

### Appointments
```
GET    /api/v1/portal/appointments           - List appointments
GET    /api/v1/portal/appointments/:id       - Get appointment details
POST   /api/v1/portal/appointments/request   - Request new appointment
PATCH  /api/v1/portal/appointments/:id/cancel - Cancel appointment
GET    /api/v1/portal/appointments/:id/join  - Join telehealth session
```

### Forms
```
GET    /api/v1/portal/forms                  - List assigned forms
GET    /api/v1/portal/forms/:id              - Get form details
POST   /api/v1/portal/forms/:id/submit       - Submit completed form
PATCH  /api/v1/portal/forms/:id/save-draft   - Save draft
GET    /api/v1/portal/forms/:id/history      - View submission history
```

### Messages
```
GET    /api/v1/portal/messages               - List message threads
GET    /api/v1/portal/messages/:threadId     - Get thread messages
POST   /api/v1/portal/messages               - Send new message
POST   /api/v1/portal/messages/:id/read      - Mark as read
POST   /api/v1/portal/messages/attachments   - Upload attachment
```

### Documents
```
GET    /api/v1/portal/documents              - List shared documents
GET    /api/v1/portal/documents/:id          - Get document metadata
GET    /api/v1/portal/documents/:id/download - Download document
```

### Progress
```
GET    /api/v1/portal/progress/goals         - View treatment goals
GET    /api/v1/portal/progress/trackers      - List progress trackers
POST   /api/v1/portal/progress/entries       - Submit tracker entry
GET    /api/v1/portal/progress/charts        - Get progress charts
```

### Payments
```
GET    /api/v1/portal/payments/balance       - Get account balance
GET    /api/v1/portal/payments/history       - Payment history
POST   /api/v1/portal/payments/methods       - Add payment method
DELETE /api/v1/portal/payments/methods/:id   - Remove payment method
POST   /api/v1/portal/payments/process       - Make payment
GET    /api/v1/portal/payments/receipt/:id   - Download receipt
```

---

## UI/UX Design Guidelines

### Design Principles
1. **Simple & Intuitive** - Clients should find features without training
2. **Mobile-First** - Optimize for smartphone usage (95% of clients use mobile)
3. **Accessible** - WCAG 2.1 AA compliance
4. **Consistent** - Match existing brand/style from main app
5. **Secure** - Make security visible (badges, indicators)

### Color Scheme
- Primary: Calming blues/teals (matches existing app)
- Secondary: Warm neutrals
- Accent: Green (success), Yellow (warning), Red (urgent)
- Background: Light, clean whites/grays

### Key Pages
1. **Landing Page** - Marketing + login
2. **Dashboard** - Quick overview and actions
3. **Appointments** - Calendar view + list
4. **Messages** - Thread-based messaging
5. **Forms** - Clean form interface
6. **Documents** - Card-based document library
7. **Progress** - Visual charts and trackers
8. **Payments** - Secure payment interface
9. **Profile** - Account settings

---

## Testing Strategy

### Unit Tests
- [ ] API endpoint tests
- [ ] Authentication/authorization logic
- [ ] Form validation
- [ ] Payment processing
- [ ] Notification delivery

### Integration Tests
- [ ] End-to-end user workflows
- [ ] Cognito integration
- [ ] Stripe integration
- [ ] Email delivery
- [ ] Document access

### Security Tests
- [ ] Penetration testing
- [ ] Authentication bypass attempts
- [ ] SQL injection tests
- [ ] XSS vulnerability scans
- [ ] CSRF protection validation

### User Acceptance Testing
- [ ] Client registration flow
- [ ] Appointment scheduling
- [ ] Form completion
- [ ] Message sending
- [ ] Payment processing
- [ ] Mobile responsiveness

---

## Deployment Checklist

### Pre-Launch
- [ ] AWS Cognito user pool configured
- [ ] Stripe account set up and tested
- [ ] Email templates created
- [ ] SSL certificates configured
- [ ] Domain/subdomain configured (e.g., portal.mentalspace.com)
- [ ] HIPAA compliance review
- [ ] Security audit completed
- [ ] Load testing completed

### Launch Day
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Monitoring/alerting enabled
- [ ] Client communication sent
- [ ] Support team trained
- [ ] Rollback plan ready

### Post-Launch
- [ ] Monitor error logs
- [ ] Track user adoption
- [ ] Collect user feedback
- [ ] Address critical bugs
- [ ] Plan iteration improvements

---

## Success Metrics

### Adoption Metrics
- Client portal registration rate
- Active users (daily/weekly/monthly)
- Feature usage rates
- Mobile vs desktop usage

### Efficiency Metrics
- Reduction in phone calls for appointments
- Form completion rates
- Average response time to messages
- Payment processing success rate

### Satisfaction Metrics
- Client satisfaction surveys
- Net Promoter Score (NPS)
- Support ticket volume
- Feature requests

---

## Risks & Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Cognito integration complexity | High | Medium | Early POC, dedicated testing |
| Stripe PCI compliance | High | Low | Use Stripe Elements, no card storage |
| Mobile performance issues | Medium | Medium | Performance testing, optimization |
| Email deliverability | Medium | Medium | Use reputable ESP, monitor bounces |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low client adoption | High | Medium | Marketing campaign, staff training |
| Support burden increase | Medium | High | Comprehensive help docs, FAQs |
| HIPAA violation | Critical | Low | Security audit, compliance review |

---

## Dependencies

### External Services
- **AWS Cognito** - User authentication
- **AWS SES** - Email delivery
- **Stripe** - Payment processing
- **AWS S3** - Document storage
- **AWS CloudFront** - CDN for portal assets

### Internal Systems
- Existing appointment system
- Client demographics database
- Telehealth integration (Phase 3)
- Billing system integration (Phase 8)

---

## Future Enhancements (Post-Phase 7)

### Phase 7.5 Ideas
- Mobile app (React Native)
- Push notifications
- Biometric authentication
- Telehealth within portal
- Group therapy access
- Resource library
- Appointment waitlist
- Family member access (with consent)
- Multi-language support
- Accessibility improvements

---

## Team Assignments

### Backend Development
- Authentication & authorization
- API endpoints
- Database migrations
- Security implementation

### Frontend Development
- UI/UX design
- Component development
- State management
- Mobile optimization

### DevOps
- Cognito setup
- Stripe integration
- Deployment automation
- Monitoring setup

### QA/Testing
- Test plan creation
- Manual testing
- Automated test scripts
- Security testing

---

## Contact & Resources

**Project Lead:** [Assign]
**Technical Lead:** [Assign]
**Security Lead:** [Assign]

**Documentation:**
- Phase 7 Technical Specs: `./TECHNICAL-SPECS.md`
- API Documentation: `./API-DOCUMENTATION.md`
- Security Guidelines: `./SECURITY-GUIDELINES.md`
- UI/UX Designs: `./designs/`

**External Resources:**
- AWS Cognito Documentation
- Stripe API Documentation
- HIPAA Compliance Guidelines
- WCAG 2.1 Guidelines

---

**Last Updated:** 2025-10-14
**Version:** 1.0
**Status:** Planning
