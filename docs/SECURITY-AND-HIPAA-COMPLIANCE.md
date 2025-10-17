# Security and HIPAA Compliance Guide

**MentalSpace EHR V2**
**Version:** 2.0
**Last Updated:** October 13, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [HIPAA Requirements](#hipaa-requirements)
3. [Technical Safeguards](#technical-safeguards)
4. [Administrative Safeguards](#administrative-safeguards)
5. [Physical Safeguards](#physical-safeguards)
6. [Security Controls](#security-controls)
7. [Incident Response](#incident-response)
8. [Audit and Compliance](#audit-and-compliance)

---

## Overview

MentalSpace EHR is designed to meet all requirements of the Health Insurance Portability and Accountability Act (HIPAA) Security Rule for the protection of electronic Protected Health Information (ePHI).

### Scope
This document covers security and compliance for:
- All application components (frontend, backend, database)
- AWS infrastructure
- Third-party integrations
- Data transmission and storage
- User access and authentication

---

## HIPAA Requirements

### Protected Health Information (PHI)

PHI includes any information that can identify a patient and relates to:
- Past, present, or future physical or mental health
- Provision of healthcare
- Payment for healthcare

**PHI in MentalSpace EHR:**
- Client demographics (name, DOB, SSN, address, phone)
- Clinical notes and assessments
- Diagnosis codes (ICD-10)
- Treatment plans
- Appointment history
- Billing and insurance information
- Medication records
- Emergency contacts

### HIPAA Security Rule Components

1. **Technical Safeguards** - Technology controls
2. **Administrative Safeguards** - Policies and procedures
3. **Physical Safeguards** - Physical security (AWS data centers)

---

## Technical Safeguards

### 1. Access Control (§164.312(a)(1))

#### Unique User Identification (Required)
**Implementation:**
- Each user has a unique UUID
- Users identified by email address
- No shared accounts permitted

**Code Reference:** `packages/database/prisma/schema.prisma:27-100`

#### Emergency Access Procedure (Required)
**Procedure:**
1. Super Admin can temporarily grant elevated access
2. All emergency access logged in AuditLog
3. Access must be revoked within 24 hours
4. Review required within 48 hours

**To Grant Emergency Access:**
```typescript
// Contact your administrator to execute:
await prisma.user.update({
  where: { id: userId },
  data: { role: 'ADMINISTRATOR' }
});
// Audit log will automatically record this change
```

#### Automatic Logoff (Addressable) - **IMPLEMENTED**
**Requirement:** Terminate session after predetermined time of inactivity

**Implementation:**
- **Session timeout:** 15 minutes of inactivity
- **Maximum session:** 8 hours regardless of activity
- **Warning:** User notified at 13 minutes
- **Action:** Session terminated, user must re-authenticate

**Code Reference:** `packages/backend/src/middleware/sessionTimeout.ts`

**Configuration:**
```typescript
// Session timeout settings
SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
MAX_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours
```

#### Encryption and Decryption (Addressable)
**Implementation:**
- **At Rest:** AWS KMS encryption for all data stores
  - RDS PostgreSQL: AES-256 encryption
  - DynamoDB: Customer-managed KMS keys
  - S3: Server-side encryption (SSE-KMS)

- **In Transit:** TLS 1.3 for all communications
  - HTTPS for all API calls
  - Database connections with SSL/TLS
  - Secure WebSocket connections for real-time features

**Code Reference:** `infrastructure/lib/security-stack.ts:22-27`

### 2. Audit Controls (§164.312(b))

**Requirement:** Hardware, software, and/or procedural mechanisms that record and examine activity in information systems containing ePHI.

#### Audit Logging - **IMPLEMENTED**

**What is Logged:**
- **Who:** User ID and email
- **What:** Entity type and ID, action performed
- **When:** Timestamp (ISO 8601 format)
- **Where:** IP address, user agent
- **Result:** Success or failure, status code
- **Duration:** Request duration in milliseconds

**Actions Logged:**
- `VIEW` - Reading PHI
- `CREATE` - Creating new records
- `UPDATE` - Modifying existing records
- `DELETE` - Deleting records
- `EXPORT` - Exporting data
- `LOGIN` - User authentication
- `LOGOUT` - User session termination
- `FAILED_LOGIN` - Failed authentication attempts

**Code Reference:** `packages/backend/src/middleware/auditLogger.ts`

**Database Schema:**
```prisma
model AuditLog {
  id         String           @id @default(uuid())
  userId     String?
  entityType AuditEntityType
  entityId   String?
  action     AuditAction
  ipAddress  String
  userAgent  String?
  timestamp  DateTime         @default(now())
  success    Boolean
  statusCode Int
  duration   Int
  details    Json?
}
```

**Retention:** Audit logs retained for 6 years (HIPAA requirement)

**Protection:** Audit logs cannot be deleted by users, only archived

### 3. Integrity (§164.312(c)(1))

**Requirement:** Mechanisms to ensure ePHI is not improperly altered or destroyed.

**Implementation:**
- Database transactions ensure data consistency
- Soft deletes for all PHI (records marked inactive, not deleted)
- Version history for clinical notes
- Checksums for document uploads
- Immutable audit logs

**Code Example:**
```typescript
// Soft delete implementation
await prisma.client.update({
  where: { id: clientId },
  data: {
    deletedAt: new Date(),
    deletedBy: userId
  }
});
```

### 4. Person or Entity Authentication (§164.312(d))

**Requirement:** Verify that a person or entity seeking access to ePHI is who they claim to be.

**Implementation:**
- **JWT-based authentication** with RS256 signing
- **Password requirements:**
  - Minimum 12 characters
  - Must include uppercase, lowercase, number, special character
  - Cannot contain username or email
  - Password history: last 5 passwords cannot be reused

- **Multi-Factor Authentication (MFA):**
  - Required for all administrative users
  - Optional but recommended for clinicians
  - TOTP (Time-based One-Time Password) via Authenticator app
  - SMS backup option

- **Account Lockout:**
  - 5 failed login attempts within 15 minutes
  - Account locked for 30 minutes
  - Administrator notification on lockout

**Code Reference:** `packages/backend/src/controllers/auth.controller.ts`

### 5. Transmission Security (§164.312(e)(1))

**Requirement:** Technical security measures to guard against unauthorized access to ePHI being transmitted over an electronic communications network.

**Implementation:**
- **TLS 1.3** for all HTTPS connections
- **SSL/TLS** for database connections
- **Certificate Pinning** for mobile apps (future)
- **VPN** for administrative access to infrastructure

**Infrastructure Reference:** `infrastructure/lib/network-stack.ts`

---

## Administrative Safeguards

### 1. Security Management Process (§164.308(a)(1))

#### Risk Assessment
**Frequency:** Annually and after major changes

**Process:**
1. Identify all systems containing ePHI
2. Identify threats and vulnerabilities
3. Assess current security measures
4. Determine likelihood and impact of threats
5. Prioritize risks
6. Implement mitigation strategies

**Last Conducted:** [TO BE COMPLETED]
**Next Scheduled:** [TO BE SCHEDULED]

#### Risk Management
**Process:**
1. Critical and High risks: Immediate mitigation required
2. Medium risks: Mitigation within 30 days
3. Low risks: Accept or mitigate within 90 days

#### Sanction Policy
Violations of security policies result in:
- **Level 1:** Written warning, mandatory retraining
- **Level 2:** Suspension of access, formal review
- **Level 3:** Termination of access, potential legal action

### 2. Workforce Security (§164.308(a)(3))

#### Authorization and Supervision
- All users must complete security training before access granted
- Access rights assigned based on role and job function
- Supervisors review subordinate access quarterly

#### Workforce Clearance
- Background checks for all staff with ePHI access
- Security clearance documented and maintained

#### Termination Procedures
**When employee leaves:**
1. Revoke all system access within 1 hour
2. Disable MFA tokens
3. Retrieve all physical access devices
4. Document in audit log
5. Review access logs for 30 days prior

### 3. Information Access Management (§164.308(a)(4))

#### Role-Based Access Control (RBAC)

**Roles:**
1. **Administrator**
   - Full system access
   - User management
   - System configuration
   - Audit log access

2. **Supervisor**
   - View all clients assigned to supervised clinicians
   - Co-sign notes
   - Run reports for supervised clinicians
   - Cannot modify system settings

3. **Clinician**
   - View/edit own clients
   - Create appointments and notes
   - View own billing information
   - Cannot access other clinicians' data (unless supervision)

4. **Billing Staff**
   - View client demographics (limited)
   - Create charges and claims
   - Process payments
   - Run billing reports
   - Cannot access clinical notes

5. **Front Desk**
   - Schedule appointments
   - Client check-in/check-out
   - View client demographics (limited)
   - Cannot access clinical notes or billing

6. **Associate** (Unlicensed Clinician)
   - Same as Clinician
   - All notes require supervisor co-signature
   - Flagged in audit logs

**Code Reference:** `packages/database/prisma/schema.prisma:17-24`

### 4. Security Awareness and Training (§164.308(a)(5))

**Required Training:**
- **Initial:** Before system access granted
- **Annual:** Refresher training every 12 months
- **Ad-hoc:** After security incidents or policy changes

**Training Topics:**
- HIPAA Security and Privacy Rules
- Password security
- Phishing and social engineering
- Physical security
- Incident reporting
- Mobile device security
- Acceptable use policy

**Training Materials:** [TO BE CREATED]
**Training Records:** Maintained for 6 years

### 5. Security Incident Procedures (§164.308(a)(6))

See [Incident Response](#incident-response) section below.

### 6. Contingency Plan (§164.308(a)(7))

#### Data Backup Plan
- **RDS Automated Backups:** Daily, retained 30 days
- **RDS Snapshots:** Weekly, retained 90 days
- **Point-in-Time Recovery:** Enabled, up to 30 days
- **Offsite Backup:** Replicated to separate AWS region

#### Disaster Recovery Plan
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **DR Testing:** Quarterly

#### Emergency Mode Operation Plan
- Read-only access maintained during outages
- Emergency contact list maintained
- Alternative communication methods documented

### 7. Business Associate Agreements (§164.308(b)(1))

**Required BAAs:**
- [x] Amazon Web Services (AWS)
- [ ] Anthropic (Claude AI)
- [ ] OpenAI (GPT models)
- [ ] Twilio (SMS)
- [ ] SendGrid (Email)
- [ ] Stripe (Payments) - Note: PCI DSS, not HIPAA
- [ ] AdvancedMD (Practice Management)

**BAA Template:** `docs/templates/BAA-template.md` [TO BE CREATED]

---

## Physical Safeguards

### Facility Access Controls (§164.310(a)(1))

**AWS Data Centers:**
- ISO 27001 certified
- SOC 1, SOC 2, SOC 3 compliant
- Physical security managed by AWS
- 24/7 monitoring and surveillance

**Office Access:**
- Workstations locked when unattended
- Automatic screen lock after 5 minutes
- Visitors must be accompanied
- Clean desk policy enforced

### Workstation Security (§164.310(c))

**Requirements:**
- Full disk encryption (BitLocker/FileVault)
- Antivirus software installed and updated
- Automatic OS updates enabled
- VPN required for remote access
- No PHI stored locally

### Device and Media Controls (§164.310(d)(1))

**Disposal:**
- Hard drives wiped with DoD 5220.22-M standard
- SSDs sanitized with ATA Secure Erase
- Certificate of destruction obtained

**Re-use:**
- Full disk encryption before re-use
- Previous data not recoverable

---

## Security Controls

### Application Security

#### Input Validation
- All user input validated and sanitized
- Prisma ORM prevents SQL injection
- React prevents XSS by default
- Content Security Policy (CSP) headers

#### Authentication Security
- **Password Hashing:** bcrypt with salt (cost factor: 12)
- **JWT Signing:** RS256 algorithm
- **Token Expiry:** Access token 1 hour, refresh token 7 days
- **Rate Limiting:** 100 requests per 15 minutes per IP

#### Authorization Security
- Permission checked on every request
- Resource-level access control
- Cannot access data belonging to other clinicians
- Supervisor access limited to supervisees

### Infrastructure Security

#### Network Security
- VPC with private subnets
- Security groups with least privilege
- NACLs for subnet-level filtering
- VPC Flow Logs enabled
- AWS WAF for web application firewall
- DDoS protection via AWS Shield

#### Database Security
- RDS in private subnet
- No public access
- Encryption at rest with KMS
- SSL/TLS connections required
- Connection pooling to prevent exhaustion

#### API Security
- HTTPS only (HTTP redirected)
- CORS configured for specific origins
- Rate limiting per IP and per user
- Request size limits (10MB max)
- Helmet.js security headers

### Third-Party Security

#### Dependency Management
- Automated dependency scanning (npm audit, Snyk)
- Dependencies updated monthly
- Security advisories monitored
- No dependencies with known critical vulnerabilities

#### Vendor Assessment
All vendors assessed for:
- HIPAA compliance
- SOC 2 Type II certification
- Data handling practices
- Incident response procedures
- BAA willingness

---

## Incident Response

### Incident Classification

**Level 1 (Critical):**
- Data breach or unauthorized PHI access
- System compromise
- Ransomware attack
- Complete service outage

**Level 2 (High):**
- Partial service outage
- Failed authentication spike
- Malware detection
- Vulnerability exploitation attempt

**Level 3 (Medium):**
- Performance degradation
- Suspicious activity detected
- Policy violation

**Level 4 (Low):**
- Minor configuration issue
- Non-critical software bug

### Response Procedures

#### 1. Detection
- Automated alerts via CloudWatch
- Security monitoring tools
- User reports
- Audit log analysis

#### 2. Containment
- Isolate affected systems
- Revoke compromised credentials
- Block malicious IPs
- Preserve evidence

#### 3. Investigation
- Review audit logs
- Analyze system logs
- Identify root cause
- Document findings

#### 4. Eradication
- Remove malware/backdoors
- Patch vulnerabilities
- Reset compromised credentials
- Update security controls

#### 5. Recovery
- Restore from backups if needed
- Verify system integrity
- Monitor for recurrence
- Resume normal operations

#### 6. Lessons Learned
- Incident report within 48 hours
- Post-mortem meeting
- Update procedures
- Implement preventive measures

### Breach Notification

**Timeline:**
- **Discovery:** Document date/time breach discovered
- **60 Days:** Notify affected individuals (HIPAA requirement)
- **Immediately:** Notify if >500 individuals affected
- **Annually:** Report breaches <500 individuals to HHS

**Notification Content:**
- Description of breach
- Types of information involved
- Steps individuals should take
- What organization is doing
- Contact information

**Code Reference:** `docs/templates/breach-notification-template.md` [TO BE CREATED]

---

## Audit and Compliance

### Audit Schedule

**Daily:**
- Automated security scans
- Log analysis for anomalies

**Weekly:**
- Failed login attempt review
- Privileged access review

**Monthly:**
- Access control review
- Audit log review
- Security patch status

**Quarterly:**
- Disaster recovery testing
- Security training completion
- Business associate compliance

**Annually:**
- Full security risk assessment
- HIPAA compliance audit
- Penetration testing
- Policy review and updates

### Compliance Monitoring

**Metrics Tracked:**
- Audit log coverage (target: 100% of PHI access)
- MFA adoption (target: 100% for admins, 80% for clinicians)
- Training completion (target: 100%)
- Password policy compliance (target: 100%)
- Patch deployment time (target: <30 days for critical)
- Backup success rate (target: 100%)

**Reporting:**
- Monthly compliance dashboard
- Quarterly compliance report to leadership
- Annual HIPAA compliance certification

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-12 | Initial document | System |
| 2.0 | 2025-10-13 | Added session timeout, audit logging | Claude Code |

---

## Appendices

### A. Glossary
- **ePHI:** Electronic Protected Health Information
- **HIPAA:** Health Insurance Portability and Accountability Act
- **PHI:** Protected Health Information
- **BAA:** Business Associate Agreement
- **MFA:** Multi-Factor Authentication
- **TLS:** Transport Layer Security
- **KMS:** Key Management Service

### B. References
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [AWS HIPAA Compliance](https://aws.amazon.com/compliance/hipaa-compliance/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Document Classification:** Internal - Confidential
**Next Review Date:** [12 months from last update]
