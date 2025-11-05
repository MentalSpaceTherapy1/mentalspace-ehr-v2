# MentalSpaceEHR V2 - Module 1: Authentication & User Management
## Comprehensive Product Requirements Document

---

## CRITICAL IMPLEMENTATION DIRECTIVE

**This PRD defines MINIMUM requirements. The implemented system:**
- ✅ **CAN and SHOULD** include additional features, enhancements, and optimizations beyond what's specified
- ❌ **MUST NOT** omit any feature, workflow, or requirement documented in this PRD
- 🎯 **MUST** treat every requirement as mandatory unless explicitly marked as "optional" or "future enhancement"

---

## Module Overview

The Authentication & User Management module serves as the foundational security and access control layer for MentalSpaceEHR V2. This module manages all aspects of user identity, authentication, authorization, and role-based access control (RBAC) while ensuring HIPAA compliance and maintaining strict security standards for protected health information (PHI).

---

## 1. Business Requirements

### 1.1 Primary Objectives
- Provide secure, multi-factor authentication for all system users
- Implement granular role-based access control aligned with mental health practice hierarchies
- Support supervision relationships for pre-licensed and associate-level therapists
- Enable incident-to billing workflows through proper authorization chains
- Maintain comprehensive audit trails for all authentication and authorization events
- Ensure HIPAA compliance for all access to PHI

### 1.2 User Types & Roles

#### Administrative Roles
- **Practice Owner**: Full system access, practice configuration, billing oversight
- **Practice Administrator**: User management, practice settings, reporting access
- **Billing Manager**: Access to all billing, claims, and financial modules
- **Office Manager**: Scheduling, client management, limited financial access
- **Front Desk Staff**: Appointment scheduling, basic client information access

#### Clinical Roles
- **Licensed Therapist (Supervisor)**: Full clinical access, supervision capabilities, co-signing authority
- **Licensed Therapist (Independent)**: Full clinical access for assigned clients
- **Pre-Licensed Therapist**: Clinical access requiring supervisor co-signature
- **Associate-Level Therapist**: Clinical access with supervision requirements
- **Psychology Intern**: Limited clinical access under direct supervision
- **Clinical Trainee**: Restricted access with comprehensive supervision

#### Support Roles
- **IT Administrator**: System configuration, technical settings, user provisioning
- **Compliance Officer**: Audit log access, compliance reporting, security monitoring
- **External Auditor**: Read-only access to specified compliance data

### 1.3 Supervision Hierarchy
The system must support complex supervision relationships critical for mental health practices:
- One supervisor can oversee multiple supervisees
- Supervisees can only have one primary supervisor at a time
- Supervision relationships affect note signing, billing, and access permissions
- Historical supervision relationships must be preserved for audit purposes

---

## 2. Functional Requirements

### 2.1 User Registration & Onboarding

#### Self-Service Registration (Client Portal Only)
- Email-based registration with verification
- CAPTCHA protection against automated signups
- Terms of service and privacy policy acceptance
- Automatic assignment to "Client" role
- Practice approval workflow for portal access

#### Staff User Creation (Admin-Initiated)
- Administrator creates user account with initial credentials
- Temporary password generation with forced reset on first login
- Role assignment during creation
- Supervisor assignment for supervised roles
- Professional license number capture and verification
- NPI number storage for billing purposes

#### Onboarding Workflow
1. Email invitation sent to new staff member
2. User clicks secure link (expires in 48 hours)
3. Sets permanent password meeting security requirements
4. Configures MFA (mandatory for all staff)
5. Reviews and accepts security policies
6. Completes profile information
7. Supervisor reviews and approves (if applicable)

### 2.2 Authentication Methods

#### Primary Authentication
- **Username/Password**
  - Minimum 12 characters
  - Complexity requirements: uppercase, lowercase, number, special character
  - Password history (cannot reuse last 10 passwords)
  - Password expiration every 90 days for staff
  - Account lockout after 5 failed attempts (30-minute cooldown)

#### Multi-Factor Authentication (MFA)
**Required for all staff accounts**, optional but encouraged for clients

**Supported Methods:**
- **TOTP (Time-based One-Time Password)**
  - Google Authenticator
  - Microsoft Authenticator
  - Authy
- **SMS-based OTP** (backup method only)
- **Email-based OTP** (backup method only)
- **Biometric** (for mobile app - future phase)
  - Face ID (iOS)
  - Touch ID (iOS)
  - Fingerprint (Android)

#### Single Sign-On (SSO)
**For enterprise practices:**
- SAML 2.0 support
- OAuth 2.0 / OpenID Connect
- Integration with practice's existing identity provider
- Automatic role mapping from IdP attributes
- Just-in-Time (JIT) provisioning

#### Session Management
- Session timeout after 20 minutes of inactivity
- Warning prompt at 18 minutes
- Automatic logout and session termination
- Secure session token storage
- Device trust management (remember this device for 30 days)
- Concurrent session limits (max 2 active sessions per user)

### 2.3 Authorization & Access Control

#### Role-Based Access Control (RBAC)

**Permission Categories:**
- **Clinical**: Access to client records, notes, treatment plans
- **Billing**: Access to financial data, claims, payments
- **Administrative**: User management, practice settings
- **Reporting**: Access to analytics and reports
- **Compliance**: Audit logs, security settings

**Permission Inheritance:**
- Roles inherit permissions hierarchically
- Custom role creation with specific permission sets
- Permission overrides for specific users
- Temporary permission elevation (with audit)

#### Attribute-Based Access Control (ABAC)

**Client Assignment Rules:**
- Therapists only see assigned clients
- Supervisors see all supervisees' clients
- Billing staff see all clients for billing purposes
- Front desk sees limited client info for scheduling

**Time-Based Access:**
- Restrict access outside business hours
- Emergency override with documentation
- Scheduled access for part-time staff

**Location-Based Access:**
- IP address restrictions for sensitive operations
- Geofencing for mobile access
- VPN requirements for remote access

### 2.4 Supervisor-Supervisee Management

#### Supervision Relationship Setup
1. Administrator assigns supervisor to supervisee
2. Effective date and end date specification
3. Supervision agreement documentation upload
4. Notification to both parties
5. Acceptance workflow from supervisor

#### Supervision Permissions
**Supervisor automatically receives:**
- Read access to all supervisee's clinical notes
- Co-signing capability for supervisee's documentation
- Access to supervisee's schedule and clients
- Ability to reopen signed notes for correction
- Review queue for pending signatures

**Supervisee restrictions:**
- Cannot sign notes independently (requires co-signature)
- Cannot discharge clients without supervisor approval
- Cannot modify treatment plans without review
- Limited prescriptive authority (if applicable)

#### Co-Signing Workflow
1. Supervisee completes clinical note
2. Note marked as "Pending Supervisor Review"
3. Supervisor receives notification
4. Supervisor reviews and can:
   - Approve and co-sign
   - Request revisions with comments
   - Reject with documentation
5. Both signatures recorded with timestamps
6. Note locked after co-signing

### 2.5 Password & Account Recovery

#### Self-Service Password Reset
1. User clicks "Forgot Password"
2. Enters username or email
3. Security questions verification (optional layer)
4. Email sent with reset link (15-minute expiration)
5. User sets new password
6. Notification of password change
7. Forced logout of all sessions

#### Account Recovery
**For locked accounts:**
- Automatic unlock after timeout period
- Administrator manual unlock
- Security verification required

**For compromised accounts:**
- Immediate account suspension
- Administrator investigation
- Forced password reset
- MFA re-enrollment
- Security training requirement

### 2.6 User Profile Management

#### Self-Service Updates
Users can modify:
- Contact information (email, phone)
- Notification preferences
- Time zone settings
- Display preferences
- Professional information (with verification)

#### Administrative Updates
Administrators can modify:
- Role assignments
- Permission overrides
- Supervisor relationships
- Account status (active/suspended/terminated)
- Access restrictions

#### License & Credential Management
- Professional license numbers with expiration tracking
- Automated expiration warnings (90, 60, 30 days)
- Document upload for verification
- Integration with state licensing boards (future)
- NPI number validation
- DEA number storage (for prescribers)

---

## 3. Security Requirements

### 3.1 Encryption
- **At Rest**: AES-256 encryption for all stored data
- **In Transit**: TLS 1.3 for all communications
- **Password Storage**: bcrypt with appropriate salt rounds
- **Token Storage**: Encrypted JWT tokens
- **Session Data**: Encrypted session storage

### 3.2 Audit Logging
**Every authentication event logged:**
- Login attempts (successful and failed)
- Password changes
- MFA enrollment/changes
- Permission changes
- Supervisor relationship changes
- Account locks/unlocks
- Session timeouts

**Log retention:**
- 7 years for HIPAA compliance
- Immutable audit trail
- Secure log storage with encryption
- Regular log analysis for anomalies

### 3.3 Security Monitoring
- Real-time alerting for suspicious activities
- Failed login attempt patterns
- Unusual access patterns
- Privilege escalation attempts
- Concurrent session violations
- After-hours access monitoring

### 3.4 Compliance Requirements

#### HIPAA Compliance
- Unique user identification
- Automatic logoff
- Encryption and decryption
- Audit controls
- Person or entity authentication
- Transmission security

#### State Regulations
- Professional license verification
- Supervision documentation
- Incident-to billing compliance
- State-specific privacy requirements

---

## 4. Integration Requirements

### 4.1 AWS Services Integration

#### AWS Cognito
- User pools for authentication
- Identity pools for authorization
- MFA configuration
- Password policies
- User migration from existing systems

#### AWS IAM
- Service-level permissions
- Cross-service authentication
- API access control
- Resource-based policies

#### AWS Secrets Manager
- API key storage
- Database credentials
- Third-party service credentials
- Automatic rotation policies

### 4.2 AdvancedMD Integration
- User synchronization for billing access
- Provider credential mapping
- NPI number validation
- Billing permission synchronization

### 4.3 External Identity Providers
- Active Directory integration
- Google Workspace SSO
- Microsoft Azure AD
- Okta integration
- OneLogin support

---

## 5. User Experience Requirements

### 5.1 Login Experience
- Clean, professional login page with practice branding
- Remember username option
- Clear error messages without revealing sensitive info
- Password strength indicator
- MFA setup wizard
- Session extension prompts

### 5.2 First-Time User Experience
- Welcome email with clear instructions
- Guided setup process
- Interactive tutorial for role-specific features
- Profile completion prompts
- Security training module

### 5.3 Mobile Responsiveness
- Fully responsive login pages
- Touch-friendly MFA input
- Biometric authentication support
- Mobile-optimized session management
- App-specific authentication tokens

---

## 6. Performance Requirements

### 6.1 Response Times
- Login process: < 2 seconds
- MFA verification: < 1 second
- Password reset: < 3 seconds
- Session validation: < 100ms
- Permission checks: < 50ms

### 6.2 Scalability
- Support 10,000+ concurrent users
- Horizontal scaling capability
- Geographic distribution support
- Load balancing across regions
- Caching for permission checks

### 6.3 Availability
- 99.9% uptime SLA
- Graceful degradation during failures
- Backup authentication methods
- Offline capability for critical functions
- Disaster recovery procedures

---

## 7. Data Model

### 7.1 Core Tables

#### Users Table
```
- user_id (UUID, PK)
- username (unique)
- email (unique)
- phone_number
- first_name
- last_name
- title
- date_of_birth
- created_at
- updated_at
- last_login
- status (active/suspended/terminated)
- mfa_enabled
- password_hash
- password_changed_at
- failed_login_attempts
- account_locked_until
```

#### Roles Table
```
- role_id (UUID, PK)
- role_name
- description
- is_clinical
- requires_supervision
- can_supervise
- created_at
- updated_at
```

#### User_Roles Table
```
- user_role_id (UUID, PK)
- user_id (FK)
- role_id (FK)
- assigned_at
- assigned_by
- effective_date
- end_date
```

#### Permissions Table
```
- permission_id (UUID, PK)
- resource
- action
- description
- category
```

#### Role_Permissions Table
```
- role_id (FK)
- permission_id (FK)
- granted_at
- granted_by
```

#### Supervision_Relationships Table
```
- relationship_id (UUID, PK)
- supervisor_id (FK)
- supervisee_id (FK)
- start_date
- end_date
- status (active/terminated)
- agreement_document_url
- created_at
- created_by
```

#### Professional_Credentials Table
```
- credential_id (UUID, PK)
- user_id (FK)
- license_type
- license_number
- licensing_state
- issue_date
- expiration_date
- npi_number
- dea_number
- verification_status
- verification_date
```

#### Audit_Logs Table
```
- log_id (UUID, PK)
- user_id (FK)
- event_type
- event_description
- ip_address
- user_agent
- session_id
- timestamp
- success
- failure_reason
```

#### Sessions Table
```
- session_id (UUID, PK)
- user_id (FK)
- token
- created_at
- expires_at
- ip_address
- user_agent
- is_active
- device_trusted
```

---

## 8. Implementation Milestones

### Phase 1: Foundation (Week 1-2)
- Basic user table structure
- Password authentication
- Simple role assignment
- Session management
- Basic audit logging

### Phase 2: Advanced Security (Week 3)
- MFA implementation
- Password policies
- Account lockout mechanisms
- Security monitoring
- Advanced audit logging

### Phase 3: Supervision Features (Week 4)
- Supervision relationship management
- Co-signing workflows
- Permission inheritance
- Supervisor dashboards

### Phase 4: Integration & SSO (Week 5)
- AWS Cognito integration
- SSO implementation
- External IdP support
- AdvancedMD user sync

---

## 9. Success Metrics

### Security Metrics
- Zero unauthorized access incidents
- < 1% failed login rate (excluding attacks)
- 100% MFA adoption for staff
- < 5 minute mean time to detect anomalies

### User Experience Metrics
- < 30 seconds average time to login
- > 90% successful password reset rate
- < 2% account lockout rate
- > 95% user satisfaction with authentication

### Compliance Metrics
- 100% HIPAA compliance audit pass rate
- Complete audit trail coverage
- Zero compliance violations
- Successful supervision documentation rate

---

## 10. Risk Mitigation

### Security Risks
- **Brute force attacks**: Rate limiting, account lockout
- **Session hijacking**: Secure tokens, session validation
- **Privilege escalation**: Regular permission audits
- **Insider threats**: Comprehensive audit logging

### Operational Risks
- **System downtime**: Backup authentication methods
- **Password reset abuse**: Security questions, rate limiting
- **License expiration**: Automated warnings, grace periods
- **Supervisor unavailability**: Backup supervisor designation

---

## VERIFICATION CHECKLIST

### 1.1 User Registration & Onboarding
**Required Functionality:**
- [ ] Self-service registration for client portal with email verification
- [ ] Staff account creation (admin-initiated only)
- [ ] Temporary password generation with forced reset
- [ ] Email invitation system with 48-hour expiration
- [ ] MFA setup during onboarding (mandatory for staff)
- [ ] Terms of service acceptance tracking
- [ ] Role assignment during creation
- [ ] Supervisor assignment for supervised roles
- [ ] Professional license number capture
- [ ] NPI number storage for billing

**Data Requirements:**
- [ ] Users table with all specified fields
- [ ] Password history storage (last 10)
- [ ] Activation token management
- [ ] Terms acceptance logging

**UI Components:**
- [ ] Registration wizard for clients
- [ ] Staff onboarding workflow
- [ ] MFA setup interface
- [ ] Password strength indicator
- [ ] Terms acceptance modal

### 1.2 Authentication Methods
**Required Functionality:**
- [ ] Username/password authentication
- [ ] Password complexity requirements enforcement
- [ ] Password expiration (90 days for staff)
- [ ] Account lockout after 5 failed attempts
- [ ] 30-minute lockout cooldown period
- [ ] MFA support (TOTP, SMS, Email)
- [ ] Biometric authentication (future phase)
- [ ] SSO/SAML 2.0 support
- [ ] OAuth 2.0/OpenID Connect
- [ ] Device trust management (30 days)

**Data Requirements:**
- [ ] Password hash storage (bcrypt)
- [ ] MFA secret storage
- [ ] Failed attempt tracking
- [ ] Device fingerprinting
- [ ] SSO configuration storage

**UI Components:**
- [ ] Login page with MFA
- [ ] SSO login options
- [ ] Device trust management
- [ ] Password expired workflow
- [ ] Account locked message

### 1.3 Session Management
**Required Functionality:**
- [ ] 20-minute inactivity timeout
- [ ] Warning prompt at 18 minutes
- [ ] Automatic logout and session termination
- [ ] Secure session token storage
- [ ] Concurrent session limit (max 2)
- [ ] Session extension capability
- [ ] Force logout all sessions
- [ ] Session activity tracking
- [ ] Remember me functionality
- [ ] Cross-browser session management

**Data Requirements:**
- [ ] Sessions table
- [ ] Session token storage
- [ ] Activity timestamp tracking
- [ ] Browser/device identification

**UI Components:**
- [ ] Session timeout warning modal
- [ ] Active sessions display
- [ ] Logout all devices option
- [ ] Session activity viewer
- [ ] Extension prompt

### 1.4 Role-Based Access Control (RBAC)
**Required Functionality:**
- [ ] Hierarchical role structure
- [ ] Permission inheritance
- [ ] Custom role creation
- [ ] Permission overrides for specific users
- [ ] Temporary permission elevation
- [ ] Role assignment management
- [ ] Multiple role support
- [ ] Department-based isolation
- [ ] Resource-level permissions
- [ ] API access control

**Data Requirements:**
- [ ] Roles table
- [ ] Permissions table
- [ ] User_Roles junction table
- [ ] Role_Permissions junction table
- [ ] Permission override tracking

**UI Components:**
- [ ] Role management interface
- [ ] Permission matrix editor
- [ ] User role assignment
- [ ] Permission viewer
- [ ] Access denied pages

### 1.5 Supervisor-Supervisee Management
**Required Functionality:**
- [ ] Supervision relationship creation
- [ ] Effective date and end date tracking
- [ ] Supervision agreement documentation
- [ ] Automatic permission inheritance
- [ ] Co-signing capability
- [ ] Note review queue for supervisors
- [ ] Supervisee client access for supervisors
- [ ] Multiple supervisee support
- [ ] Supervision history preservation
- [ ] Incident-to billing validation

**Data Requirements:**
- [ ] Supervision_Relationships table
- [ ] Agreement document storage
- [ ] Historical relationship tracking
- [ ] Permission inheritance rules

**UI Components:**
- [ ] Supervision setup wizard
- [ ] Relationship management dashboard
- [ ] Co-signing queue interface
- [ ] Supervision agreement upload
- [ ] Timeline visualization

### 1.6 Password & Account Recovery
**Required Functionality:**
- [ ] Self-service password reset via email
- [ ] Security questions (optional layer)
- [ ] Reset link with 15-minute expiration
- [ ] Password change notification
- [ ] Forced logout after password change
- [ ] Account recovery for locked accounts
- [ ] Administrator manual unlock
- [ ] Compromised account suspension
- [ ] Security training requirement after compromise
- [ ] Recovery audit logging

**Data Requirements:**
- [ ] Reset token storage
- [ ] Security questions storage
- [ ] Recovery attempt logging
- [ ] Compromise incident tracking

**UI Components:**
- [ ] Forgot password flow
- [ ] Security question forms
- [ ] Reset password page
- [ ] Recovery status messages
- [ ] Admin unlock interface

### 1.7 License & Credential Management
**Required Functionality:**
- [ ] Professional license tracking
- [ ] Expiration warning system (90, 60, 30 days)
- [ ] Document upload for verification
- [ ] NPI number validation
- [ ] DEA number storage (prescribers)
- [ ] State licensing board integration (future)
- [ ] Multi-state license support
- [ ] Credential verification workflow
- [ ] Renewal requirement tracking
- [ ] Compliance reporting

**Data Requirements:**
- [ ] Professional_Credentials table
- [ ] License document storage
- [ ] Verification history
- [ ] Expiration tracking
- [ ] Renewal records

**UI Components:**
- [ ] Credential management dashboard
- [ ] License upload interface
- [ ] Expiration calendar
- [ ] Verification status display
- [ ] Renewal checklist

### 1.8 Audit & Compliance
**Required Functionality:**
- [ ] Login attempt logging (success/fail)
- [ ] Password change tracking
- [ ] MFA enrollment/change logging
- [ ] Permission change tracking
- [ ] Supervision relationship changes
- [ ] Account lock/unlock events
- [ ] Session timeout tracking
- [ ] 7-year retention for HIPAA
- [ ] Immutable audit trail
- [ ] Anomaly detection

**Data Requirements:**
- [ ] Audit_Logs table
- [ ] Log retention policies
- [ ] Encrypted log storage
- [ ] Tamper prevention

**UI Components:**
- [ ] Audit log viewer
- [ ] Search and filter tools
- [ ] Export functionality
- [ ] Anomaly alerts
- [ ] Compliance reports

### 1.9 User Profile Management
**Required Functionality:**
- [ ] Contact information updates
- [ ] Notification preferences
- [ ] Time zone settings
- [ ] Display preferences
- [ ] Professional information updates
- [ ] Photo upload
- [ ] Signature capture
- [ ] Emergency contact management
- [ ] Communication preferences
- [ ] Language preferences

**Data Requirements:**
- [ ] User preferences storage
- [ ] Profile change history
- [ ] Photo/signature storage
- [ ] Contact validation logs

**UI Components:**
- [ ] Profile editing forms
- [ ] Preference panels
- [ ] Photo upload interface
- [ ] Signature capture tool
- [ ] Contact management

### 1.10 Security Monitoring
**Required Functionality:**
- [ ] Real-time suspicious activity alerts
- [ ] Failed login pattern detection
- [ ] Unusual access pattern identification
- [ ] Privilege escalation monitoring
- [ ] After-hours access tracking
- [ ] Concurrent session violations
- [ ] Geographic anomaly detection
- [ ] Automated threat response
- [ ] Security dashboard
- [ ] Incident reporting

**Data Requirements:**
- [ ] Security event tracking
- [ ] Pattern detection rules
- [ ] Alert configurations
- [ ] Incident records
- [ ] Response logs

**UI Components:**
- [ ] Security dashboard
- [ ] Alert configuration
- [ ] Incident viewer
- [ ] Threat indicators
- [ ] Response actions panel

---

## Notes for Development Team

This module is the foundation of system security. Every feature must be implemented with security-first mindset. Pay special attention to:

1. **Supervision workflows** - Critical for billing compliance
2. **Audit logging** - Required for HIPAA compliance
3. **MFA enforcement** - Non-negotiable for PHI access
4. **Session management** - Prevents unauthorized access
5. **Permission checks** - Must be performant but thorough

Remember: A breach in this module compromises the entire system. Test thoroughly, especially edge cases in supervision relationships and permission inheritance.

---

**Document Version**: 2.0
**Last Updated**: Current Date
**Status**: Ready for Review
**Next Module**: Client Management

