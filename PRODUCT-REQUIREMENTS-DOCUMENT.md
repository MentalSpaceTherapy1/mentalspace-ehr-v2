# MentalSpace EHR V2 - Product Requirements Document (PRD)

**Version:** 2.0
**Last Updated:** October 13, 2025
**Status:** Active Development
**Project Owner:** MentalSpace Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Target Users](#target-users)
4. [Core Modules](#core-modules)
5. [Technical Architecture](#technical-architecture)
6. [Security & Compliance](#security--compliance)
7. [Integration Requirements](#integration-requirements)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

MentalSpace EHR V2 is a comprehensive, cloud-native Electronic Health Record system specifically designed for mental health practices. The system provides end-to-end practice management including client management, scheduling, clinical documentation, billing, claims management, telehealth, supervision workflows, and productivity analytics.

### Key Objectives

1. **Streamline Clinical Workflows** - Reduce documentation time by 50% through AI-assisted note generation
2. **Ensure HIPAA Compliance** - 100% compliant with HIPAA regulations for data security and privacy
3. **Optimize Revenue Cycle** - Reduce claim denial rates by 80% through AdvancedMD integration
4. **Improve Accountability** - Real-time productivity tracking and performance metrics
5. **Scale Practice Operations** - Support practices from solo practitioners to 100+ clinician groups

---

## Product Overview

### Vision Statement

To become the leading EHR platform for mental health practices by combining clinical excellence, operational efficiency, and data-driven insights.

### Product Differentiators

- **Mental Health Specialized** - Purpose-built for mental health workflows (not adapted from general practice EHR)
- **AI-Powered Documentation** - GPT-4 and Claude 3.5 integration for clinical note generation
- **Real-Time Productivity Tracking** - Clinician accountability with Georgia-specific compliance rules
- **Seamless Billing Integration** - Native AdvancedMD integration with 835 ERA parsing
- **Modern User Experience** - React-based gradient UI with intuitive workflows

---

## Target Users

### Primary Users

1. **Clinicians (Therapists, Psychiatrists, Psychologists)**
   - Role: Provide clinical services and document treatment
   - Needs: Fast documentation, scheduling, session notes, treatment plans
   - Pain Points: Time-consuming charting, manual billing codes

2. **Practice Administrators**
   - Role: Manage practice operations and finances
   - Needs: Billing oversight, revenue reports, staff management
   - Pain Points: Claims denials, aging accounts receivable, manual payment posting

3. **Clinical Supervisors**
   - Role: Oversee clinician performance and quality
   - Needs: Team dashboards, productivity metrics, quality assurance
   - Pain Points: Lack of visibility into team performance, manual tracking

4. **Front Desk Staff**
   - Role: Schedule appointments and check-in clients
   - Needs: Calendar management, client registration, insurance verification
   - Pain Points: Double-booking, insurance eligibility delays

### Secondary Users

5. **Clients (Patients)**
   - Role: Receive mental health services
   - Needs: Appointment scheduling, forms, billing access
   - Pain Points: No online portal, manual forms, unclear billing

6. **Billing Specialists**
   - Role: Submit claims and post payments
   - Needs: Claim status tracking, ERA processing, denial management
   - Pain Points: Manual ERA entry, claim rejections, unposted payments

---

## Core Modules

### Module 1: Authentication & User Management

**Status:** ✅ Complete

#### Features

- Multi-factor authentication (MFA) with AWS Cognito
- Role-based access control (RBAC)
  - Admin
  - Clinician
  - Supervisor
  - Billing Staff
  - Front Desk
  - Client (Patient)
- Session management with automatic timeout (15 minutes)
- Password policies (complexity, rotation)
- Audit logging of all authentication events

#### User Stories

- As a clinician, I want to log in securely with MFA so that patient data remains protected
- As an admin, I want to manage user roles so that staff only access data relevant to their job
- As a user, I want my session to timeout automatically so that unauthorized users cannot access my account

---

### Module 2: Client Management

**Status:** ✅ Complete

#### Features

- Client demographics (name, DOB, contact, emergency contact)
- Insurance information (primary, secondary)
- Referring provider tracking
- Client status management (Active, Inactive, Discharged)
- Document upload and management
- Client search with autocomplete
- Client chart history timeline
- HIPAA-compliant data encryption at rest and in transit

#### User Stories

- As a front desk staff, I want to register new clients quickly so that intake is efficient
- As a clinician, I want to view a client's complete chart history so that I understand their treatment journey
- As an admin, I want to search for clients by name, DOB, or ID so that I can find records quickly

#### Database Schema

```prisma
model Client {
  id                String            @id @default(uuid())
  firstName         String
  lastName          String
  dateOfBirth       DateTime
  gender            String?
  email             String?
  phone             String?
  address           String?
  city              String?
  state             String?
  zipCode           String?
  emergencyContact  String?
  emergencyPhone    String?
  insurancePrimary  String?
  insuranceSecondary String?
  referringProvider String?
  status            ClientStatus      @default(ACTIVE)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  appointments      Appointment[]
  notes             ClinicalNote[]
  charges           ChargeEntry[]
}

enum ClientStatus {
  ACTIVE
  INACTIVE
  DISCHARGED
}
```

---

### Module 3: Appointment Scheduling

**Status:** ✅ Complete

#### Features

- Calendar view (day, week, month)
- Appointment creation with client search
- Appointment types (Initial Evaluation, Follow-Up, Medication Management, Therapy Session)
- Recurring appointments (weekly, biweekly, monthly)
- Appointment status tracking (Scheduled, Confirmed, Checked-In, Completed, No-Show, Cancelled)
- Clinician availability management
- Double-booking prevention
- SMS and email appointment reminders (Twilio, SendGrid)
- Waitlist management
- Appointment notes and special instructions

#### User Stories

- As a front desk staff, I want to schedule appointments without double-booking so that the calendar is accurate
- As a clinician, I want to set my availability so that appointments are only scheduled during my working hours
- As a client, I want to receive appointment reminders via SMS so that I don't miss sessions

#### Database Schema

```prisma
model Appointment {
  id              String            @id @default(uuid())
  clientId        String
  clinicianId     String
  appointmentDate DateTime
  startTime       String
  endTime         String
  appointmentType AppointmentType
  status          AppointmentStatus @default(SCHEDULED)
  notes           String?
  isRecurring     Boolean           @default(false)
  recurrenceRule  String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  client          Client            @relation(fields: [clientId], references: [id])
  clinician       User              @relation(fields: [clinicianId], references: [id])
}

enum AppointmentType {
  INITIAL_EVALUATION
  FOLLOW_UP
  MEDICATION_MANAGEMENT
  THERAPY_SESSION
  GROUP_THERAPY
  FAMILY_THERAPY
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  CHECKED_IN
  COMPLETED
  NO_SHOW
  CANCELLED
  RESCHEDULED
}
```

---

### Module 4: Clinical Documentation

**Status:** ✅ Complete

#### Features

- **Note Types:**
  1. SOAP Notes (Subjective, Objective, Assessment, Plan)
  2. Progress Notes
  3. Intake Assessment
  4. Psychiatric Evaluation
  5. Treatment Plan
  6. Safety Plan
  7. Discharge Summary
  8. Crisis Intervention Note

- **AI-Powered Features:**
  - Automatic note generation from session transcription
  - Clinical language enhancement
  - ICD-10 code suggestions
  - Treatment plan recommendations

- **Note Management:**
  - Draft, In Review, Signed, Amended status
  - Digital signatures
  - Addendum support
  - Version history
  - Note templates
  - Bulk signing

#### User Stories

- As a clinician, I want to generate SOAP notes using AI so that I save 20+ minutes per session
- As a supervisor, I want to review unsigned notes so that I can ensure quality before billing
- As a clinician, I want to create treatment plans with AI suggestions so that plans are comprehensive

#### Database Schema

```prisma
model ClinicalNote {
  id             String          @id @default(uuid())
  clientId       String
  clinicianId    String
  appointmentId  String?
  noteType       ClinicalNoteType
  subjective     String?
  objective      String?
  assessment     String?
  plan           String?
  content        String?
  icd10Codes     String[]
  status         NoteStatus      @default(DRAFT)
  signedAt       DateTime?
  signedBy       String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  client         Client          @relation(fields: [clientId], references: [id])
  clinician      User            @relation(fields: [clinicianId], references: [id])
}

enum ClinicalNoteType {
  SOAP_NOTE
  PROGRESS_NOTE
  INTAKE_ASSESSMENT
  PSYCHIATRIC_EVALUATION
  TREATMENT_PLAN
  SAFETY_PLAN
  DISCHARGE_SUMMARY
  CRISIS_INTERVENTION
}

enum NoteStatus {
  DRAFT
  IN_REVIEW
  SIGNED
  AMENDED
}
```

---

### Module 5: Billing & Claims Management

**Status:** ✅ Complete (Backend + Frontend)

#### Features

- **Charge Management:**
  - Create charges with CPT codes, modifiers, diagnosis codes
  - Charge status tracking (Unbilled, Billed, Paid, Void, Adjustment)
  - Service date and units tracking
  - Bulk charge creation
  - Charge editing and void

- **Payment Posting:**
  - Manual payment entry
  - Payment application to charges (two-step workflow)
  - Payment methods (Cash, Check, Credit Card, Insurance)
  - Adjustment codes
  - Write-offs

- **Accounts Receivable:**
  - Aging report (Current, 30, 60, 90, 120+ days)
  - Outstanding balance tracking
  - Client statements
  - Collection management

- **Revenue Reporting:**
  - Total revenue by date range
  - Revenue by clinician
  - Revenue by CPT code
  - Payment method breakdown
  - Outstanding AR summary

#### User Stories

- As a billing specialist, I want to post payments and apply them to charges so that accounts are accurate
- As an admin, I want to view aging reports so that I can prioritize collections
- As a billing specialist, I want to track charge status so that I know which charges are unbilled

#### Database Schema

```prisma
model ChargeEntry {
  id              String        @id @default(uuid())
  clientId        String
  clinicianId     String
  appointmentId   String?
  serviceDate     DateTime
  cptCode         String
  modifier        String?
  units           Int           @default(1)
  chargeAmount    Decimal       @db.Decimal(10, 2)
  paymentAmount   Decimal?      @db.Decimal(10, 2)
  adjustmentAmount Decimal?     @db.Decimal(10, 2)
  chargeStatus    ChargeStatus  @default(UNBILLED)
  diagnosis       String[]
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  createdBy       String
  client          Client        @relation(fields: [clientId], references: [id])
  clinician       User          @relation(fields: [clinicianId], references: [id])
}

enum ChargeStatus {
  UNBILLED
  BILLED
  PAID
  PARTIALLY_PAID
  VOID
  ADJUSTMENT
}

model Payment {
  id                  String         @id @default(uuid())
  clientId            String
  paymentAmount       Decimal        @db.Decimal(10, 2)
  paymentMethod       PaymentMethod
  paymentDate         DateTime
  checkNumber         String?
  transactionId       String?
  notes               String?
  appliedPaymentsJson Json?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  createdBy           String
  client              Client         @relation(fields: [clientId], references: [id])
}

enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
  DEBIT_CARD
  INSURANCE
  OTHER
}
```

---

### Module 6: AdvancedMD Integration

**Status:** 🔄 In Progress (Framework Complete, Implementation Pending)

#### Integration Points

1. **Patient Sync**
   - Bi-directional patient demographic sync
   - Schedule: Hourly using GETUPDATEDPATIENTS
   - Rate Limit: Tier 1 (1/min peak, 60/min off-peak)

2. **Appointment Sync**
   - Sync appointments and visits
   - Schedule: Every 15 minutes using GETUPDATEDVISITS
   - Rate Limit: Tier 1

3. **Eligibility Verification**
   - Real-time insurance eligibility checks
   - Response time: <30 seconds
   - Success rate: 99.9% (AdvancedMD SLA)
   - Rate Limit: Tier 2 (12/min peak, 120/min off-peak)
   - Caching: 24-hour cache to reduce API calls

4. **Charge Submission**
   - Submit charges using SAVECHARGES
   - Validation before submission
   - Rate Limit: Tier 2

5. **Claim Submission**
   - Submit claims to clearinghouse (Waystar)
   - Claim status tracking
   - Acceptance rate: 99.5% guaranteed (AdvancedMD)
   - Rate Limit: Tier 2

6. **Payment Posting**
   - Post payments via API
   - Manual charge application in UI
   - Rate Limit: Tier 2

#### ERA & Attachments Bridge System

**Challenge:** AdvancedMD does not expose ERA (Electronic Remittance Advice) or claim attachments via API.

**Solution:** Bridge system with file upload and parsing.

##### ERA Processing

- **File Upload:** Users upload 835 EDI files from AdvancedMD UI
- **Parser:** Custom 835 EDI parser extracts payment data
- **Auto-Matching:** 5-level matching strategy to link ERA claims to charges
  1. Claim control number exact match
  2. Client + Service date + Amount match
  3. Client + CPT code + Amount match
  4. Fuzzy match with confidence scoring
  5. Manual review queue for unmatched
- **Auto-Posting:** Automatically post payments and adjustments with CARC code tracking
- **Target:** >85% auto-match rate, <5 minute processing time

##### Claim Attachments

- **Dual Upload:** Upload attachments to both AdvancedMD (manual) and our S3 (automatic)
- **Metadata Tracking:** Store attachment metadata with claim reference
- **Retrieval:** Access attachments from our system for future reference

#### Rate Limiting Strategy

- **Peak Hours:** 6 AM - 6 PM Mountain Time, Monday-Friday
- **Tiered Limits:**
  - Tier 1 (High Impact): 1/min peak, 60/min off-peak
  - Tier 2 (Medium Impact): 12/min peak, 120/min off-peak
  - Tier 3 (Low Impact): 24/min peak, 120/min off-peak
- **Queue Management:** Automatic queueing with exponential backoff
- **Token Refresh:** Auto-refresh every 23 hours (tokens expire at 24 hours)

#### Database Schema

```prisma
model AdvancedMDPatient {
  id                String   @id @default(uuid())
  advancedMDId      String   @unique
  clientId          String   @unique
  lastSyncedAt      DateTime
  syncStatus        String
  syncErrors        Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  client            Client   @relation(fields: [clientId], references: [id])
}

model EligibilityCheck {
  id              String   @id @default(uuid())
  clientId        String
  payerId         String
  serviceDate     DateTime
  responseData    Json
  isEligible      Boolean
  cachedAt        DateTime
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  client          Client   @relation(fields: [clientId], references: [id])
}

model ERAFile {
  id                    String   @id @default(uuid())
  fileName              String
  fileS3Key             String
  uploadedBy            String
  uploadedAt            DateTime @default(now())
  paymentAmount         Decimal  @db.Decimal(10, 2)
  checkNumber           String?
  paymentDate           DateTime
  paymentMethod         String
  interchangeControlNum String
  parsedData            Json
  matchingStatus        String   @default('PENDING')
  autoMatchedCount      Int      @default(0)
  manualReviewCount     Int      @default(0)
  processedAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  claims                ERAClaim[]
}

model ERAClaim {
  id                    String   @id @default(uuid())
  eraFileId             String
  claimControlNumber    String
  claimStatus           String
  chargeAmount          Decimal  @db.Decimal(10, 2)
  paymentAmount         Decimal  @db.Decimal(10, 2)
  patientResponsibility Decimal  @db.Decimal(10, 2)
  matchedChargeId       String?
  matchConfidence       Float?
  matchMethod           String?
  serviceLines          Json
  adjustments           Json
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  eraFile               ERAFile  @relation(fields: [eraFileId], references: [id])
}

model ClaimAttachment {
  id            String   @id @default(uuid())
  chargeId      String
  fileName      String
  fileS3Key     String
  fileType      String
  fileSize      Int
  uploadedBy    String
  uploadedAt    DateTime @default(now())
  description   String?
  advancedMDRef String?
  createdAt     DateTime @default(now())
  charge        ChargeEntry @relation(fields: [chargeId], references: [id])
}
```

---

### Module 7: Productivity & Accountability

**Status:** 🆕 New Module - Implementation Pending

#### Overview

A comprehensive productivity tracking and accountability system designed to help practices optimize clinician performance, ensure compliance with Georgia-specific mental health regulations, and drive data-quality improvements.

#### Core Principles

1. **Data-Driven Accountability** - Real-time metrics visible to clinicians, supervisors, and administrators
2. **Georgia Compliance First** - Built-in rules for Georgia mental health practice regulations
3. **Proactive Alerts** - Nudges and alerts to prevent compliance issues before they occur
4. **Fair Performance Measurement** - Transparent metrics with context and benchmarks

#### Metric Dictionary

##### Category 1: Clinical Productivity

- **Kept Visit Rate (KVR)**
  - Definition: (Completed Appointments / Total Scheduled Appointments) × 100
  - Benchmark: ≥85%
  - Purpose: Measure clinician utilization and client retention
  - Alert Threshold: <80% triggers weekly review

- **No-Show Rate**
  - Definition: (No-Show Appointments / Total Scheduled Appointments) × 100
  - Benchmark: ≤10%
  - Purpose: Identify client engagement issues
  - Alert Threshold: >15% triggers client outreach review

- **Cancellation Rate**
  - Definition: (Cancelled Appointments / Total Scheduled Appointments) × 100
  - Benchmark: ≤15%
  - Purpose: Assess schedule stability
  - Alert Threshold: >20% triggers schedule review

- **Rebook Rate**
  - Definition: (Clients Who Rebooked Within 30 Days / Total Completed Appointments) × 100
  - Benchmark: ≥75%
  - Purpose: Measure treatment continuity
  - Alert Threshold: <65% triggers retention strategy review

- **Sessions Per Day**
  - Definition: Average completed sessions per working day
  - Benchmark: 5-7 sessions (varies by role)
  - Purpose: Workload management
  - Alert Threshold: <4 or >8 triggers workload review

##### Category 2: Documentation Compliance

- **Same-Day Documentation Rate**
  - Definition: (Notes Signed Same Day / Total Sessions) × 100
  - Benchmark: ≥90%
  - Purpose: Ensure timely documentation
  - Alert Threshold: <80% triggers productivity coaching
  - **Georgia Rule:** Notes must be signed within 7 days (automatic escalation)

- **Average Documentation Time**
  - Definition: Average time from session end to note signature
  - Benchmark: <24 hours
  - Purpose: Identify documentation bottlenecks
  - Alert Threshold: >48 hours triggers AI documentation training

- **Treatment Plan Currency**
  - Definition: (Clients With Current Treatment Plan / Total Active Clients) × 100
  - Benchmark: 100%
  - Purpose: Compliance with treatment planning requirements
  - Alert Threshold: <95% triggers immediate review
  - **Georgia Rule:** Treatment plans required for all active clients, reviewed every 90 days

- **Unsigned Note Backlog**
  - Definition: Count of unsigned notes >7 days old
  - Benchmark: 0
  - Purpose: Compliance and revenue cycle management
  - Alert Threshold: >5 notes triggers supervisor notification
  - **Georgia Rule:** Automatic supervisor alert at 7 days, billing hold at 14 days

##### Category 3: Clinical Quality

- **Client Retention Rate (90 Days)**
  - Definition: (Clients Active After 90 Days / New Clients 90 Days Ago) × 100
  - Benchmark: ≥70%
  - Purpose: Measure therapeutic alliance and effectiveness
  - Alert Threshold: <60% triggers clinical review

- **Crisis Intervention Rate**
  - Definition: (Crisis Notes / Total Sessions) × 100
  - Benchmark: <5%
  - Purpose: Monitor client acuity and safety
  - Alert Threshold: >10% triggers supervisor consultation

- **Safety Plan Compliance**
  - Definition: (High-Risk Clients With Current Safety Plan / High-Risk Clients) × 100
  - Benchmark: 100%
  - Purpose: Risk management
  - Alert Threshold: <100% triggers immediate review
  - **Georgia Rule:** Safety plans required for all clients with suicidal ideation

##### Category 4: Billing & Revenue

- **Charge Entry Lag**
  - Definition: Average days from service date to charge entry
  - Benchmark: <1 day
  - Purpose: Optimize revenue cycle
  - Alert Threshold: >3 days triggers billing workflow review

- **Billing Compliance Rate**
  - Definition: (Sessions With Charges / Total Completed Sessions) × 100
  - Benchmark: 100%
  - Purpose: Prevent revenue leakage
  - Alert Threshold: <95% triggers billing audit

- **Claim Acceptance Rate**
  - Definition: (Accepted Claims / Submitted Claims) × 100
  - Benchmark: ≥95%
  - Purpose: Reduce claim denials
  - Alert Threshold: <90% triggers coding review

- **Average Reimbursement Per Session**
  - Definition: Total reimbursement / Total sessions
  - Benchmark: Varies by payer mix
  - Purpose: Revenue optimization
  - Alert Threshold: 10% deviation from benchmark triggers payer mix review

##### Category 5: Schedule Optimization

- **Schedule Fill Rate**
  - Definition: (Booked Appointment Slots / Available Appointment Slots) × 100
  - Benchmark: ≥85%
  - Purpose: Maximize clinician utilization
  - Alert Threshold: <75% triggers marketing/referral review

- **Prime Time Utilization**
  - Definition: (Booked Prime Slots / Available Prime Slots) × 100
  - Prime Slots: 9 AM - 5 PM, Monday-Thursday
  - Benchmark: ≥90%
  - Purpose: Optimize revenue during high-demand hours
  - Alert Threshold: <80% triggers scheduling strategy review

- **Average Appointment Lead Time**
  - Definition: Average days from appointment scheduled to appointment date
  - Benchmark: 7-14 days
  - Purpose: Balance demand and access
  - Alert Threshold: <5 or >21 days triggers capacity review

##### Category 6: Supervision Compliance

- **Supervision Hours Logged**
  - Definition: Total supervision hours per month
  - Benchmark: Varies by license type and state requirements
  - Purpose: Ensure compliance with licensure supervision
  - Alert Threshold: <Required hours triggers license risk alert
  - **Georgia Rule:** LPCs require 2 hours/month, LMSWs require 4 hours/month

- **Supervision Note Timeliness**
  - Definition: (Supervision Notes Signed Within 7 Days / Total Supervision Sessions) × 100
  - Benchmark: 100%
  - Purpose: Documentation compliance
  - Alert Threshold: <100% triggers supervisor notification

##### Category 7: Client Satisfaction

- **Client Portal Adoption Rate**
  - Definition: (Clients With Portal Access / Total Active Clients) × 100
  - Benchmark: ≥60%
  - Purpose: Improve client engagement and reduce administrative burden
  - Alert Threshold: <50% triggers portal marketing campaign

- **Online Appointment Booking Rate**
  - Definition: (Appointments Booked Online / Total Appointments) × 100
  - Benchmark: ≥40%
  - Purpose: Reduce front desk workload
  - Alert Threshold: <30% triggers portal training

##### Category 8: Practice Efficiency

- **Front Desk Check-In Time**
  - Definition: Average time from client arrival to clinician ready
  - Benchmark: <5 minutes
  - Purpose: Optimize client experience and schedule adherence
  - Alert Threshold: >10 minutes triggers workflow review

- **Insurance Verification Rate**
  - Definition: (Appointments With Verified Insurance / Total Appointments) × 100
  - Benchmark: 100%
  - Purpose: Reduce claim denials
  - Alert Threshold: <95% triggers front desk training

##### Category 9: Team Collaboration

- **Interdisciplinary Collaboration Rate**
  - Definition: (Cases With Multi-Disciplinary Input / Total Cases) × 100
  - Benchmark: ≥20% (varies by practice model)
  - Purpose: Encourage integrated care
  - Alert Threshold: <10% triggers collaboration incentive review

##### Category 10: Georgia-Specific Compliance

- **Informed Consent Currency**
  - Definition: (Clients With Current Informed Consent / Total Active Clients) × 100
  - Benchmark: 100%
  - Purpose: Compliance with Georgia informed consent laws
  - Alert Threshold: <100% triggers immediate review
  - **Georgia Rule:** Informed consent required annually and when treatment changes

- **Minor Consent Compliance**
  - Definition: (Minor Clients With Proper Consent / Total Minor Clients) × 100
  - Benchmark: 100%
  - Purpose: Ensure parental/guardian consent
  - Alert Threshold: <100% triggers immediate review
  - **Georgia Rule:** Clients under 18 require parental consent (exceptions for emancipated minors)

- **Telehealth Consent Compliance**
  - Definition: (Telehealth Clients With Telehealth Consent / Total Telehealth Clients) × 100
  - Benchmark: 100%
  - Purpose: Georgia telehealth consent requirements
  - Alert Threshold: <100% triggers immediate review
  - **Georgia Rule:** Separate telehealth consent required

##### Category 11: Data Quality

- **Complete Demographics Rate**
  - Definition: (Clients With All Required Fields / Total Clients) × 100
  - Required Fields: Name, DOB, Address, Phone, Emergency Contact, Insurance
  - Benchmark: 100%
  - Purpose: Ensure accurate records and billing
  - Alert Threshold: <95% triggers data cleanup campaign

- **Insurance Information Accuracy**
  - Definition: (Clients With Verified Insurance / Total Insured Clients) × 100
  - Benchmark: 100%
  - Purpose: Reduce claim denials
  - Alert Threshold: <95% triggers verification workflow review

##### Category 12: Risk Management

- **HIPAA Training Current**
  - Definition: (Staff With Current HIPAA Training / Total Staff) × 100
  - Benchmark: 100%
  - Purpose: Compliance with HIPAA training requirements
  - Alert Threshold: <100% triggers immediate training
  - **Georgia Rule:** Annual HIPAA training required

- **Breach Incident Response Time**
  - Definition: Average time from breach detection to response
  - Benchmark: <1 hour
  - Purpose: Minimize breach impact
  - Alert Threshold: >2 hours triggers incident response review

##### Category 13: Financial Health

- **Days in Accounts Receivable**
  - Definition: (Total AR / Average Daily Revenue)
  - Benchmark: <30 days
  - Purpose: Cash flow management
  - Alert Threshold: >45 days triggers collections review

- **Collection Rate**
  - Definition: (Total Collections / Total Charges) × 100
  - Benchmark: ≥95%
  - Purpose: Revenue cycle effectiveness
  - Alert Threshold: <90% triggers revenue cycle audit

---

#### Dashboard Views

##### 1. Clinician Dashboard: "My Practice"

**Purpose:** Give clinicians real-time visibility into their performance

**Metrics Displayed:**

- **This Week Summary**
  - Sessions Completed: 18 of 25 scheduled (72% KVR)
  - No-Shows: 3 (12%)
  - Cancellations: 4 (16%)
  - Unsigned Notes: 2 (oldest: 3 days)

- **Documentation Status**
  - Same-Day Documentation Rate: 85% (⚠️ below 90% target)
  - Average Documentation Time: 18 hours
  - Notes Pending Signature: 2

- **Client Engagement**
  - Rebook Rate: 78%
  - 90-Day Retention: 72%
  - Active Clients: 45

- **Revenue Metrics**
  - Sessions Billed: 16 of 18 (89%)
  - Average Reimbursement: $112/session
  - Outstanding Charges: $1,240

- **Alerts & Nudges**
  - ⚠️ 2 notes pending signature (oldest: 3 days)
  - ✅ Treatment plans all current
  - ⚠️ 3 clients haven't rebooked in 30+ days (suggestions: Sarah J., Michael K., Linda P.)

**Actions:**
- "Sign Pending Notes" button
- "View Clients Needing Rebook" button
- "Schedule Supervision" button

---

##### 2. Supervisor Dashboard: "My Team"

**Purpose:** Give supervisors visibility into team performance and coaching opportunities

**Team Overview:**

| Clinician | KVR | No-Show Rate | Unsigned Notes | Same-Day Doc % | Action |
|-----------|-----|--------------|----------------|----------------|--------|
| Dr. Sarah Jones | 88% | 8% | 0 | 95% | 🟢 On Track |
| Michael Chen, LCSW | 72% | 12% | 2 | 85% | 🟡 Review |
| Linda Park, LPC | 65% | 18% | 5 | 70% | 🔴 Urgent |

**Team Metrics This Month:**
- Average KVR: 75% (target: 85%)
- Average No-Show Rate: 13% (target: <10%)
- Total Unsigned Notes: 7 (target: 0)
- Average Same-Day Doc Rate: 83% (target: 90%)

**Coaching Opportunities:**
- 🔴 Linda Park: 5 unsigned notes (oldest: 9 days) → **Georgia compliance risk**
- 🟡 Michael Chen: 18% no-show rate → Suggest client engagement review
- 🟢 Sarah Jones: Exceeding all benchmarks → Recognition opportunity

**Supervision Hours Compliance:**
- Michael Chen (LMSW): 4/4 hours logged ✅
- Linda Park (LPC-Associate): 1.5/2 hours logged ⚠️ (needs 0.5 more by Oct 31)

**Alerts:**
- 🔴 Linda Park has 2 notes >7 days unsigned (Georgia compliance violation)
- 🟡 Team average KVR trending down (was 82% last month, now 75%)

---

##### 3. Administrator Dashboard: "Practice Overview"

**Purpose:** Give administrators full practice visibility for strategic decision-making

**Practice Scorecard:**

- **Overall KVR:** 78% (⚠️ trending down from 82%)
- **Revenue This Month:** $48,250 (vs. $52,000 target)
- **Outstanding AR:** $18,430 (32 days avg)
- **Claim Acceptance Rate:** 96% (✅ above 95% target)

**Clinician Performance Matrix:**

| Clinician | KVR | Sessions/Day | Revenue | Compliance | Status |
|-----------|-----|--------------|---------|------------|--------|
| Dr. Jones | 88% | 6.2 | $14,200 | 100% | 🟢 Excellent |
| M. Chen | 72% | 5.1 | $11,800 | 90% | 🟡 Needs Coaching |
| L. Park | 65% | 4.5 | $9,200 | 70% | 🔴 Performance Plan |

**Georgia Compliance Dashboard:**
- 🔴 2 clinicians with notes >7 days unsigned (Linda Park: 2 notes, Michael Chen: 1 note)
- ✅ All treatment plans current
- ✅ All informed consents current
- ✅ All HIPAA training current
- ⚠️ 3 clients missing emergency contact information

**Revenue Cycle Health:**
- Average Charge Entry Lag: 1.2 days (✅ target: <3 days)
- Billing Compliance Rate: 94% (⚠️ target: 100%)
- Days in AR: 32 days (⚠️ target: <30 days)
- Collection Rate: 93% (⚠️ target: 95%)

**Capacity Planning:**
- Total Schedule Fill Rate: 82%
- Prime Time Utilization: 87%
- Clinician Capacity: 3 clinicians can handle 125 sessions/week, currently at 102 (82%)
- Recommendation: Increase marketing to fill 23 open slots/week

**Alerts & Action Items:**
- 🔴 Linda Park performance plan recommended (multiple metrics below benchmark)
- 🟡 Revenue trending 7% below target (review payer mix and scheduling)
- 🔴 2 clinicians have Georgia compliance violations (notes >7 days unsigned)
- 🟢 Dr. Jones exceeding all targets (recognition opportunity)

---

#### Alerts & Nudges System

##### Alert Types

1. **Real-Time Nudges (In-App)**
   - "You have 2 unsigned notes from this week. Sign now?"
   - "Sarah hasn't rebooked in 30 days. Send a check-in message?"
   - "Your KVR is 75% this week. Schedule 3 more appointments to hit your 85% goal."

2. **Daily Digest Email**
   - Summary of yesterday's metrics
   - Pending tasks (unsigned notes, missing treatment plans)
   - Upcoming appointments for today

3. **Weekly Performance Report**
   - Week-over-week performance trends
   - Comparison to benchmarks
   - Action items for next week

4. **Critical Alerts (Immediate)**
   - Notes approaching 7-day Georgia deadline
   - Missing safety plans for high-risk clients
   - Unsigned supervision notes
   - HIPAA training expiration

5. **Supervisor Escalations**
   - Automatically escalate to supervisor when:
     - Clinician has >5 unsigned notes
     - Clinician has notes >7 days old (Georgia violation)
     - Clinician KVR <70% for 2 consecutive weeks
     - Clinician no-show rate >20%

6. **Administrator Escalations**
   - Automatically escalate to admin when:
     - Practice KVR trending down >5% month-over-month
     - Revenue <90% of target for 2 consecutive months
     - Days in AR >45 days
     - Compliance violations affecting >2 clinicians

---

#### Accountability Rhythms

##### Daily Rhythms

- **Morning Huddle Dashboard** (5 minutes)
  - Each clinician views their "My Practice" dashboard
  - Review: Today's schedule, unsigned notes, pending tasks

- **End-of-Day Check** (5 minutes)
  - Sign today's notes
  - Schedule follow-ups for no-shows
  - Review tomorrow's schedule

##### Weekly Rhythms

- **Monday Morning Email** (Automated)
  - Last week's performance summary
  - This week's goals
  - Action items

- **Friday Afternoon Review** (15 minutes)
  - Clinician reviews their weekly metrics
  - Plans for next week (e.g., which clients to prioritize for rebooks)

##### Monthly Rhythms

- **Supervisor 1-on-1s** (30 minutes per clinician)
  - Review monthly metrics dashboard together
  - Celebrate wins (metrics exceeding benchmarks)
  - Coaching on improvement areas
  - Set goals for next month

- **Administrator Practice Review** (60 minutes)
  - Review practice-wide metrics
  - Identify trends (staffing needs, revenue opportunities, compliance risks)
  - Strategic planning

##### Quarterly Rhythms

- **Performance Reviews** (60 minutes per clinician)
  - 90-day trend analysis
  - Goal setting for next quarter
  - Professional development plans

---

#### Georgia-Specific Compliance Rules

##### Built-In Compliance Automation

1. **7-Day Note Signature Rule**
   - Automatic reminder at day 5
   - Supervisor alert at day 7
   - Billing hold at day 14 (charge cannot be submitted until note signed)

2. **Treatment Plan Review (90 Days)**
   - Automatic reminder at day 80
   - Alert at day 90
   - Treatment plan marked "Out of Compliance" at day 91

3. **Informed Consent Annual Renewal**
   - Reminder 30 days before expiration
   - Alert on expiration date
   - Appointment booking blocked until renewed

4. **Supervision Hour Tracking**
   - LPCs: 2 hours/month required
   - LMSWs: 4 hours/month required
   - Automatic tracking and reminders
   - Monthly report to supervisor and admin

5. **Minor Consent Validation**
   - Prevent appointment booking for clients <18 without guardian consent
   - Annual consent renewal reminder

6. **Telehealth Consent**
   - Require telehealth consent before first telehealth appointment
   - Cannot schedule telehealth without consent on file

7. **HIPAA Training**
   - Annual requirement
   - Reminder 30 days before expiration
   - System access suspended on expiration until training completed

---

#### Data Capture & Calculation

##### Automated Data Capture

All metrics are calculated automatically from existing system data:

- **Appointment Data** → KVR, No-Show Rate, Cancellation Rate, Schedule Fill Rate
- **Clinical Note Data** → Same-Day Documentation Rate, Unsigned Note Backlog, Documentation Time
- **Billing Data** → Charge Entry Lag, Billing Compliance Rate, Revenue metrics
- **Client Data** → Rebook Rate, Retention Rate, Portal Adoption

##### Calculation Frequency

- **Real-Time Metrics:** KVR, Unsigned Notes, Today's Schedule
- **Daily Calculations:** Documentation rates, Charge entry lag
- **Weekly Aggregations:** Weekly performance summaries
- **Monthly Aggregations:** Trends, Retention rates, Revenue reports

##### Data Quality Governance

**Principle:** Metrics are only as good as the data quality.

**Quality Rules:**

1. **Appointment Status Accuracy**
   - Front desk must mark appointments as "Completed," "No-Show," or "Cancelled" within 24 hours
   - Alert if appointment status still "Scheduled" 24 hours after appointment time

2. **Note Linking**
   - All clinical notes must link to an appointment
   - Alert if note created without appointment link

3. **Charge Linking**
   - All charges must link to an appointment
   - Alert if charge created without appointment or note

4. **Complete Demographics**
   - Required fields must be complete before appointment can be marked "Completed"
   - Front desk prompted to complete missing fields at check-in

5. **Insurance Verification**
   - Insurance must be verified before appointment (or marked "Self-Pay")
   - Alert if appointment scheduled without insurance verification

---

#### User Stories

**Clinician:**
- As a clinician, I want to see my weekly KVR so that I know if I'm meeting productivity targets
- As a clinician, I want alerts when I have unsigned notes so that I stay compliant with Georgia's 7-day rule
- As a clinician, I want to see which clients haven't rebooked so that I can proactively reach out

**Supervisor:**
- As a supervisor, I want to see my team's performance metrics so that I can coach effectively
- As a supervisor, I want automatic alerts when clinicians have compliance violations so that I can intervene early
- As a supervisor, I want to track supervision hours so that I ensure my supervisees meet licensure requirements

**Administrator:**
- As an administrator, I want a practice-wide scorecard so that I understand overall performance
- As an administrator, I want to identify underperforming clinicians so that I can implement performance improvement plans
- As an administrator, I want to track revenue trends so that I can make strategic decisions about staffing and marketing

---

#### Database Schema

```prisma
model ProductivityMetric {
  id            String   @id @default(uuid())
  clinicianId   String
  metricType    String   // 'KVR', 'NO_SHOW_RATE', 'DOCUMENTATION_RATE', etc.
  metricValue   Decimal  @db.Decimal(10, 2)
  periodStart   DateTime
  periodEnd     DateTime
  calculatedAt  DateTime @default(now())
  metadata      Json?    // Additional context (e.g., numerator, denominator)
  createdAt     DateTime @default(now())
  clinician     User     @relation(fields: [clinicianId], references: [id])

  @@index([clinicianId, metricType, periodStart])
}

model ComplianceAlert {
  id            String   @id @default(uuid())
  alertType     String   // 'UNSIGNED_NOTE', 'TREATMENT_PLAN_OVERDUE', 'SUPERVISION_HOURS', etc.
  severity      String   // 'INFO', 'WARNING', 'CRITICAL'
  targetUserId  String   // Clinician or staff member
  supervisorId  String?  // Escalated to supervisor
  adminId       String?  // Escalated to admin
  message       String
  actionRequired String
  status        String   @default('OPEN') // 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
  acknowledgedAt DateTime?
  resolvedAt    DateTime?
  metadata      Json?    // Additional context
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  targetUser    User     @relation(name: "AlertTarget", fields: [targetUserId], references: [id])
  supervisor    User?    @relation(name: "AlertSupervisor", fields: [supervisorId], references: [id])
  admin         User?    @relation(name: "AlertAdmin", fields: [adminId], references: [id])

  @@index([targetUserId, status])
  @@index([supervisorId, status])
}

model SupervisionSession {
  id              String   @id @default(uuid())
  superviseeId    String
  supervisorId    String
  sessionDate     DateTime
  durationHours   Decimal  @db.Decimal(4, 2)
  sessionType     String   // 'INDIVIDUAL', 'GROUP'
  topicsCovered   String[]
  notesSigned     Boolean  @default(false)
  signedAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  supervisee      User     @relation(name: "Supervisee", fields: [superviseeId], references: [id])
  supervisor      User     @relation(name: "Supervisor", fields: [supervisorId], references: [id])

  @@index([superviseeId, sessionDate])
}

model GeorgiaComplianceRule {
  id            String   @id @default(uuid())
  ruleType      String   // 'NOTE_SIGNATURE_DEADLINE', 'TREATMENT_PLAN_REVIEW', etc.
  ruleConfig    Json     // Configuration (e.g., { "deadlineDays": 7 })
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model PerformanceGoal {
  id          String   @id @default(uuid())
  userId      String
  metricType  String   // 'KVR', 'NO_SHOW_RATE', etc.
  targetValue Decimal  @db.Decimal(10, 2)
  startDate   DateTime
  endDate     DateTime
  status      String   @default('ACTIVE') // 'ACTIVE', 'ACHIEVED', 'MISSED'
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
}
```

---

### Module 8: Telehealth Integration

**Status:** ❌ Not Started

#### Features (Planned)

- HIPAA-compliant video sessions (AWS Chime SDK or Doxy.me)
- Virtual waiting room
- Session recording (with consent)
- Screen sharing for worksheets
- In-session chat
- Telehealth consent management
- State-specific telehealth compliance

---

### Module 9: Enhanced Client Portal - Mental Health Companion

**Status:** 🔄 In Progress (Core Features 40% Complete)

**Vision:** Transform the client portal from a transactional platform into a daily mental health companion that increases engagement between therapy sessions and improves client retention.

**Business Goals:**
1. Increase client engagement by 300% (from weekly to daily usage)
2. Improve client retention by 25% (reduce dropout rate)
3. Reduce clinician administrative burden by 40% (automated workflows)
4. Enhance therapeutic outcomes through between-session support

---

#### Category 1: Core Transactional Features

**Status:** 🔄 40% Complete

##### 1.1 Billing & Insurance Management

**Features:**

- **Insurance Card Upload**
  - Front and back photo capture via mobile camera
  - OCR extraction of insurance information (optional)
  - Primary and secondary insurance support
  - Insurance card history and version tracking
  - Integration with EHR billing module for automatic updates

- **Payment Method Management**
  - Add/edit credit card, debit card, HSA/FSA cards
  - Stripe integration for PCI compliance
  - Default payment method selection
  - Payment method history
  - Auto-pay enablement for copays
  - Link to EHR billing system for real-time balance updates

- **Billing Statements**
  - View current balance and outstanding charges
  - Itemized statements by service date
  - Payment history with receipts
  - Download PDF statements
  - Payment plan setup for balances >$500
  - Insurance claim status tracking

- **Payment Processing**
  - One-time payments
  - Recurring payment setup
  - Split payment options (insurance + copay)
  - Payment confirmation and receipts via email
  - Refund tracking

**User Stories:**
- As a client, I want to upload photos of my insurance cards so that my therapist has current information
- As a client, I want to add my payment method so that I can pay my copay immediately after sessions
- As a client, I want to view my billing statements so that I understand what I owe
- As a client, I want to make payments online so that I don't have to mail checks

**Database Schema:**

```prisma
model PortalAccount {
  id                  String    @id @default(uuid())
  clientId            String    @unique
  email               String    @unique
  passwordHash        String
  isEmailVerified     Boolean   @default(false)
  emailVerifiedAt     DateTime?
  failedLoginAttempts Int       @default(0)
  accountLockedUntil  DateTime?
  mfaEnabled          Boolean   @default(false)
  mfaSecret           String?
  lastLoginAt         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  client              Client    @relation(fields: [clientId], references: [id])
}

model InsuranceCard {
  id               String   @id @default(uuid())
  clientId         String
  insuranceType    String   // 'PRIMARY', 'SECONDARY'
  frontImageS3Key  String
  backImageS3Key   String
  insuranceName    String?
  policyNumber     String?
  groupNumber      String?
  uploadedAt       DateTime @default(now())
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  client           Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, isActive])
}

model PaymentMethod {
  id                String   @id @default(uuid())
  clientId          String
  stripePaymentMethodId String @unique
  cardBrand         String   // 'visa', 'mastercard', etc.
  cardLast4         String
  cardExpMonth      Int
  cardExpYear       Int
  isDefault         Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  client            Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, isDefault])
}
```

---

##### 1.2 Forms & Document Management

**Features:**

- **Form Assignment (Therapist/Admin Side)**
  - Assign intake forms, consent forms, assessments to clients
  - Set due dates and reminders
  - Mark forms as required vs. optional
  - Track completion status in EHR client module
  - Automatic assignment rules (e.g., all new clients get intake form)

- **Form Completion (Client Side)**
  - Mobile-friendly form interface
  - Save draft and resume later
  - Progress indicator for multi-page forms
  - Digital signature capture (consent forms)
  - Attachment upload (e.g., ID verification)
  - Offline mode with sync when online

- **Document Signing**
  - Electronic signature with timestamp
  - IP address and device logging for audit trail
  - PDF generation with signature and metadata
  - HIPAA-compliant signing process
  - Multi-party signatures (e.g., parent + guardian for minor)

- **Document Library**
  - View treatment plans assigned by therapist
  - View session summaries (if therapist shares)
  - View consent forms and signed documents
  - Download PDFs of all documents
  - Search and filter by document type and date

**User Stories:**
- As a client, I want to complete intake forms online so that I don't have to fill out paperwork in the waiting room
- As a client, I want to sign consent forms electronically so that I can start therapy immediately
- As a therapist, I want to assign forms to clients so that they complete them before our first session
- As an admin, I want to track which clients have completed required forms so that we maintain compliance

**Database Schema:**

```prisma
model FormAssignment {
  id             String    @id @default(uuid())
  formId         String
  clientId       String
  assignedBy     String    // User ID of therapist/admin
  assignedAt     DateTime  @default(now())
  dueDate        DateTime?
  isRequired     Boolean   @default(false)
  status         String    @default("PENDING") // 'PENDING', 'IN_PROGRESS', 'COMPLETED'
  completedAt    DateTime?
  submissionId   String?   @unique
  form           IntakeForm @relation(fields: [formId], references: [id])
  client         Client     @relation(fields: [clientId], references: [id])
  submission     IntakeFormSubmission? @relation(fields: [submissionId], references: [id])

  @@index([clientId, status])
}

model DocumentSignature {
  id               String   @id @default(uuid())
  documentId       String
  signedBy         String   // Client ID or User ID
  signatureImageS3 String   // S3 key for signature image
  signedAt         DateTime @default(now())
  ipAddress        String
  userAgent        String
  deviceInfo       Json?
  signatureType    String   // 'ELECTRONIC', 'DIGITAL'
  isValid          Boolean  @default(true)
  createdAt        DateTime @default(now())

  @@index([documentId, signedBy])
}

model SharedDocument {
  id             String   @id @default(uuid())
  clientId       String
  documentType   String   // 'TREATMENT_PLAN', 'SESSION_SUMMARY', 'CONSENT_FORM', etc.
  documentName   String
  documentS3Key  String
  sharedBy       String   // User ID
  sharedAt       DateTime @default(now())
  expiresAt      DateTime?
  viewCount      Int      @default(0)
  lastViewedAt   DateTime?
  isActive       Boolean  @default(true)
  client         Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, isActive])
}
```

---

##### 1.3 Session Reviews & Feedback

**Features:**

- **Post-Session Rating**
  - Automatic prompt after each session (24-48 hours later)
  - 5-star rating system
  - Optional written feedback
  - Privacy toggle: "Share with therapist" or "Admin only"
  - Anonymous option for admin-only reviews

- **Feedback Categories**
  - Session effectiveness
  - Therapeutic alliance
  - Office environment (for in-person)
  - Technology experience (for telehealth)
  - Scheduling convenience

- **Therapist View (If Shared)**
  - View ratings and feedback from clients who opted to share
  - Aggregate ratings over time
  - Respond to client feedback (optional)

- **Admin Dashboard**
  - View all reviews (including private ones)
  - Identify patterns and concerns
  - Quality assurance monitoring
  - Clinician performance insights

**User Stories:**
- As a client, I want to rate my session so that I can provide feedback on my experience
- As a client, I want to choose whether my therapist sees my review so that I can be honest
- As a therapist, I want to see client feedback so that I can improve my practice
- As an admin, I want to monitor all feedback so that I can identify quality issues

**Database Schema:**

```prisma
model SessionReview {
  id              String    @id @default(uuid())
  appointmentId   String    @unique
  clientId        String
  clinicianId     String
  rating          Int       // 1-5 stars
  feedback        String?
  categories      Json?     // { "effectiveness": 5, "alliance": 4, "environment": 5 }
  isSharedWithClinician Boolean @default(false)
  isAnonymous     Boolean   @default(false)
  clinicianViewed Boolean   @default(false)
  clinicianViewedAt DateTime?
  clinicianResponse String?
  clinicianRespondedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  client          Client      @relation(fields: [clientId], references: [id])
  clinician       User        @relation(fields: [clinicianId], references: [id])

  @@index([clinicianId, isSharedWithClinician])
  @@index([clientId, createdAt])
}
```

---

##### 1.4 Therapist Change Requests

**Features:**

- **Request Workflow**
  - Client submits request with required reason
  - Reason categories: Schedule conflict, Therapeutic fit, Specialty needs, Personal preference
  - Free-text explanation field
  - Request status tracking (Pending, Under Review, Approved, Completed, Denied)

- **Admin Review Process**
  - Admin dashboard to view all change requests
  - View client history and previous therapist
  - Communication tools to reach out to client
  - Assign new therapist
  - Track transfer completion

- **Privacy & Sensitivity**
  - Requests are private (not visible to current therapist by default)
  - Admin can choose to share with therapist or keep confidential
  - Client can mark request as "sensitive" (abuse, boundary issues)

- **Transfer Management**
  - Automatic notification to new therapist
  - Chart transfer workflow
  - Final session with previous therapist (optional)
  - New intake session with new therapist

**User Stories:**
- As a client, I want to request a therapist change so that I can find better therapeutic fit
- As an admin, I want to review therapist change requests so that I can facilitate smooth transitions
- As an admin, I want to identify patterns in change requests so that I can address systemic issues

**Database Schema:**

```prisma
model TherapistChangeRequest {
  id                 String    @id @default(uuid())
  clientId           String
  currentClinicianId String
  requestReason      String    // 'SCHEDULE_CONFLICT', 'THERAPEUTIC_FIT', 'SPECIALTY_NEEDS', 'PERSONAL_PREFERENCE', 'OTHER'
  reasonDetails      String
  isSensitive        Boolean   @default(false)
  status             String    @default("PENDING") // 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED', 'DENIED'
  reviewedBy         String?   // Admin user ID
  reviewedAt         DateTime?
  reviewNotes        String?
  newClinicianId     String?
  assignedAt         DateTime?
  transferCompletedAt DateTime?
  denialReason       String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  client             Client    @relation(fields: [clientId], references: [id])
  currentClinician   User      @relation(name: "CurrentClinician", fields: [currentClinicianId], references: [id])
  newClinician       User?     @relation(name: "NewClinician", fields: [newClinicianId], references: [id])

  @@index([clientId, status])
  @@index([status, reviewedAt])
}
```

---

#### Category 2: Daily Engagement Features

**Status:** ❌ Not Started

##### 2.1 Mood & Symptom Tracking

**Features:**

- **Daily Check-In Interface**
  - Simple, quick mood logging (<60 seconds)
  - Mood scale (1-10 or emoji-based)
  - Symptom checkboxes (anxiety, depression, sleep, energy, etc.)
  - Customizable metrics (therapist can add client-specific symptoms)
  - Free-text notes for context
  - Time of day tracking (morning, afternoon, evening)

- **Visual Data Dashboard**
  - Line graphs showing mood trends over time
  - Heat maps for symptom frequency
  - Pattern recognition (e.g., "You tend to feel better on Thursdays")
  - Correlation insights (e.g., "Low sleep correlates with high anxiety")
  - Exportable reports (PDF, CSV)

- **Data Sharing**
  - One-click export to share with therapist
  - Automatic sync to therapist dashboard
  - Privacy controls (choose what to share)
  - Session prep integration (therapist sees data before session)

**Database Schema:**

```prisma
model MoodEntry {
  id           String   @id @default(uuid())
  clientId     String
  entryDate    DateTime
  timeOfDay    String   // 'MORNING', 'AFTERNOON', 'EVENING'
  moodScore    Int      // 1-10
  symptoms     String[] // ['ANXIETY', 'DEPRESSION', 'INSOMNIA', 'FATIGUE', etc.]
  customMetrics Json?   // { "irritability": 7, "motivation": 3 }
  notes        String?
  sharedWithClinician Boolean @default(true)
  createdAt    DateTime @default(now())
  client       Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, entryDate])
}

model SymptomDefinition {
  id            String   @id @default(uuid())
  symptomName   String
  symptomType   String   // 'STANDARD', 'CUSTOM'
  createdBy     String?  // User ID if custom
  description   String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
}

model ClientSymptomTracker {
  id             String   @id @default(uuid())
  clientId       String
  symptomId      String
  isEnabled      Boolean  @default(true)
  assignedBy     String   // User ID of therapist
  assignedAt     DateTime @default(now())
  client         Client   @relation(fields: [clientId], references: [id])

  @@unique([clientId, symptomId])
}
```

---

##### 2.2 Customizable Daily Prompts

**Features:**

- **Therapist Admin Panel**
  - Create custom prompts for individual clients
  - Prompt types: Gratitude, Cognitive reframe, Behavioral activation, Mindfulness, DBT skills
  - Schedule prompts (daily, specific days, specific times)
  - Set duration (1 week, ongoing, until goal met)
  - Preview how prompts appear to client

- **Client Experience**
  - Prompts appear in daily check-in flow
  - Push notifications for reminders
  - Text field for responses
  - Optional image/photo attachment
  - Save favorites for quick access

- **Tracking & Analytics**
  - Completion rates per client
  - Engagement trends
  - Therapist view of responses
  - Integration with session notes

**Database Schema:**

```prisma
model DailyPrompt {
  id            String   @id @default(uuid())
  clientId      String
  createdBy     String   // User ID of therapist
  promptType    String   // 'GRATITUDE', 'COGNITIVE_REFRAME', 'BEHAVIORAL_ACTIVATION', etc.
  promptText    String
  schedule      Json     // { "frequency": "DAILY", "time": "09:00", "daysOfWeek": [1,2,3,4,5] }
  startDate     DateTime
  endDate       DateTime?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  client        Client   @relation(fields: [clientId], references: [id])
  responses     PromptResponse[]

  @@index([clientId, isActive, startDate])
}

model PromptResponse {
  id           String   @id @default(uuid())
  promptId     String
  clientId     String
  responseText String
  imageS3Key   String?
  respondedAt  DateTime @default(now())
  prompt       DailyPrompt @relation(fields: [promptId], references: [id])
  client       Client      @relation(fields: [clientId], references: [id])

  @@index([clientId, respondedAt])
}
```

---

##### 2.3 Streak Tracking & Gamification

**Features:**

- **Streak Counter**
  - Visual display of consecutive days completed
  - Milestone badges (7, 14, 30, 60, 90, 180, 365 days)
  - Streak history (current streak, longest streak)
  - Non-punitive design (encouragement to restart after break)

- **Milestone Celebrations**
  - Animated badges and confetti on milestones
  - Shareable achievements (optional social media sharing)
  - Therapist notification of milestones
  - Personalized encouragement messages

- **Motivation Features**
  - Progress bars toward next milestone
  - "Don't break the streak" gentle reminders
  - Recovery mode after missed days (focus on restarting)
  - Weekly/monthly summaries

**Database Schema:**

```prisma
model EngagementStreak {
  id              String   @id @default(uuid())
  clientId        String   @unique
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastCheckInDate DateTime?
  totalCheckIns   Int      @default(0)
  milestonesAchieved Json  @default("[]") // [7, 14, 30, 60, 90]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  client          Client   @relation(fields: [clientId], references: [id])
}

model Milestone {
  id               String   @id @default(uuid())
  clientId         String
  milestoneType    String   // 'STREAK', 'TOTAL_CHECKINS', 'HOMEWORK_COMPLETION', etc.
  milestoneValue   Int
  achievedAt       DateTime @default(now())
  badgeName        String
  isViewed         Boolean  @default(false)
  viewedAt         DateTime?
  client           Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, achievedAt])
}
```

---

##### 2.4 Pre-Session Preparation Tool

**Features:**

- **Automated Reminder**
  - Sent 24-48 hours before appointment
  - Push notification + email
  - Customizable timing per client preference

- **Reflection Prompts**
  - "What do you want to discuss in your next session?"
  - "How have you been feeling since your last session?"
  - "Have you completed your homework?"
  - "Any urgent concerns or crises?"

- **Therapist View**
  - Pre-session notes visible in therapist dashboard
  - Integrated into session prep workflow
  - Flag urgent concerns for immediate attention
  - Historical view of previous prep notes

**Database Schema:**

```prisma
model PreSessionPrep {
  id              String   @id @default(uuid())
  appointmentId   String   @unique
  clientId        String
  topicsToDiscuss String?
  recentFeelings  String?
  homeworkStatus  String?  // 'COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'
  urgentConcerns  String?
  isUrgent        Boolean  @default(false)
  submittedAt     DateTime @default(now())
  viewedByClinician Boolean @default(false)
  viewedAt        DateTime?
  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  client          Client      @relation(fields: [clientId], references: [id])

  @@index([clientId, submittedAt])
}
```

---

#### Category 3: Between-Session Support

**Status:** ❌ Not Started

##### 3.1 Personalized Resource Library

**Features:**

- **Therapist Resource Assignment**
  - Tag and assign articles, videos, worksheets, PDFs to individual clients
  - Organize by category (coping skills, psychoeducation, exercises)
  - Set priority (recommended, optional, required)
  - Add personal notes to resources

- **Client View**
  - "Recommended by Your Therapist" section on dashboard
  - Filter by category, type, and date assigned
  - Mark resources as "Read" or "Helpful"
  - Save favorites
  - Search functionality

- **Tracking & Analytics**
  - Track which resources clients have viewed
  - Time spent on each resource
  - Client ratings of helpfulness
  - Therapist dashboard showing engagement

**Database Schema:**

```prisma
model Resource {
  id             String   @id @default(uuid())
  resourceType   String   // 'ARTICLE', 'VIDEO', 'PDF', 'WORKSHEET', 'AUDIO'
  title          String
  description    String?
  contentUrl     String?
  contentS3Key   String?
  category       String   // 'COPING_SKILLS', 'PSYCHOEDUCATION', 'EXERCISES', etc.
  tags           String[]
  createdBy      String   // User ID
  isPublic       Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  assignments    ResourceAssignment[]
}

model ResourceAssignment {
  id             String   @id @default(uuid())
  resourceId     String
  clientId       String
  assignedBy     String   // User ID
  priority       String   @default("OPTIONAL") // 'REQUIRED', 'RECOMMENDED', 'OPTIONAL'
  therapistNotes String?
  assignedAt     DateTime @default(now())
  viewedAt       DateTime?
  completedAt    DateTime?
  clientRating   Int?     // 1-5
  clientFeedback String?
  resource       Resource @relation(fields: [resourceId], references: [id])
  client         Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, assignedAt])
}
```

---

##### 3.2 Crisis Toolkit

**Features:**

- **Quick Access Menu**
  - Always visible emergency button (red, prominent)
  - One-click access from any page
  - No login required (accessible even when logged out)

- **Toolkit Contents**
  - Grounding exercises (5-4-3-2-1, square breathing)
  - Breathing exercises (animated guides)
  - Coping strategies (personalized by therapist)
  - Safety plan (personalized crisis plan)
  - Crisis contact numbers (988, local crisis lines)
  - Emergency contacts (therapist, emergency services)

- **Therapist Customization**
  - Customize which tools appear for each client
  - Add personalized crisis instructions
  - Upload custom audio/video guides
  - Update safety plan collaboratively

- **Usage Tracking**
  - Log when crisis toolkit is accessed (timestamp only, not content)
  - Alert therapist if used multiple times in short period
  - Include usage in session prep

**Database Schema:**

```prisma
model CrisisToolkit {
  id                  String   @id @default(uuid())
  clientId            String   @unique
  enabledTools        String[] // ['GROUNDING', 'BREATHING', 'COPING_STRATEGIES', etc.]
  safetyPlanS3Key     String?
  customInstructions  String?
  emergencyContacts   Json     // [{ "name": "Dr. Smith", "phone": "555-1234", "relationship": "Therapist" }]
  lastUpdatedBy       String   // User ID
  lastUpdatedAt       DateTime @default(now())
  createdAt           DateTime @default(now())
  client              Client   @relation(fields: [clientId], references: [id])
  usageLogs           CrisisToolkitUsage[]
}

model CrisisToolkitUsage {
  id         String   @id @default(uuid())
  clientId   String
  toolkitId  String
  accessedAt DateTime @default(now())
  toolUsed   String?  // 'GROUNDING', 'BREATHING', 'SAFETY_PLAN', etc.
  durationSeconds Int?
  client     Client   @relation(fields: [clientId], references: [id])
  toolkit    CrisisToolkit @relation(fields: [toolkitId], references: [id])

  @@index([clientId, accessedAt])
}
```

---

##### 3.3 Audio Vault

**Features:**

- **Therapist Audio Recording**
  - Record short audio messages (30 seconds - 5 minutes)
  - Categories: Grounding, Affirmations, Coping skills, Personalized messages
  - Upload pre-recorded audio files
  - Text-to-speech option (therapist writes, AI generates audio in therapist's voice)

- **Client Access**
  - Browse audio library
  - Play, pause, replay
  - Download for offline access
  - Organize by category
  - Mark favorites

- **Usage Tracking**
  - Track play count and duration
  - Client feedback on helpfulness
  - Integration with mood tracking (did listening help?)

**Database Schema:**

```prisma
model AudioMessage {
  id            String   @id @default(uuid())
  clientId      String
  createdBy     String   // User ID of therapist
  title         String
  description   String?
  category      String   // 'GROUNDING', 'AFFIRMATION', 'COPING_SKILL', 'PERSONALIZED'
  audioS3Key    String
  durationSeconds Int
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  client        Client   @relation(fields: [clientId], references: [id])
  playLogs      AudioPlayLog[]
}

model AudioPlayLog {
  id            String   @id @default(uuid())
  audioId       String
  clientId      String
  playedAt      DateTime @default(now())
  durationPlayed Int    // Seconds
  completedFully Boolean @default(false)
  helpfulRating Int?    // 1-5
  audio         AudioMessage @relation(fields: [audioId], references: [id])
  client        Client       @relation(fields: [clientId], references: [id])

  @@index([clientId, playedAt])
}
```

---

##### 3.4 Homework Tracker

**Features:**

- **Therapist Assignment**
  - Assign homework with due dates
  - Homework types: Behavioral experiment, Thought record, Reading, Skill practice
  - Detailed instructions and examples
  - Attach worksheets or templates

- **Client Dashboard**
  - View active assignments
  - Due date reminders
  - Mark as complete with optional notes
  - Upload completion evidence (photos, worksheets)

- **Completion Workflow**
  - Client marks complete
  - Therapist receives notification
  - Therapist reviews and provides feedback
  - Integration with session notes

**Database Schema:**

```prisma
model HomeworkAssignment {
  id             String   @id @default(uuid())
  clientId       String
  assignedBy     String   // User ID
  title          String
  description    String
  homeworkType   String   // 'BEHAVIORAL_EXPERIMENT', 'THOUGHT_RECORD', 'READING', 'SKILL_PRACTICE'
  instructions   String?
  attachmentS3Keys String[] // Worksheet templates
  dueDate        DateTime
  status         String   @default("ASSIGNED") // 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'
  assignedAt     DateTime @default(now())
  startedAt      DateTime?
  completedAt    DateTime?
  reviewedAt     DateTime?
  completionNotes String?
  completionAttachments String[] // Client uploads
  therapistFeedback String?
  client         Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, status, dueDate])
}
```

---

#### Category 4: Progress & Motivation

**Status:** ❌ Not Started

##### 4.1 Goals Dashboard

**Features:**

- **Goal Creation**
  - Clients and therapists can both add goals
  - SMART goal framework (Specific, Measurable, Achievable, Relevant, Time-bound)
  - Goal categories: Symptom reduction, Skill building, Life goals, Behavioral goals
  - Sub-goals and milestones

- **Progress Tracking**
  - Visual progress bars
  - Check-in frequency (weekly, biweekly, monthly)
  - Client self-assessment
  - Therapist assessment
  - Collaborative goal review

- **Visual Display**
  - Dashboard widget showing all active goals
  - Color-coded by progress (red, yellow, green)
  - Celebration animations when goals achieved

**Database Schema:**

```prisma
model TherapeuticGoal {
  id             String   @id @default(uuid())
  clientId       String
  createdBy      String   // User ID (can be client or therapist)
  goalTitle      String
  goalDescription String?
  goalCategory   String   // 'SYMPTOM_REDUCTION', 'SKILL_BUILDING', 'LIFE_GOAL', 'BEHAVIORAL_GOAL'
  targetDate     DateTime?
  status         String   @default("ACTIVE") // 'ACTIVE', 'ACHIEVED', 'MODIFIED', 'DISCONTINUED'
  progressPercent Int     @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  achievedAt     DateTime?
  client         Client   @relation(fields: [clientId], references: [id])
  subGoals       SubGoal[]
  progressUpdates GoalProgressUpdate[]

  @@index([clientId, status])
}

model SubGoal {
  id           String   @id @default(uuid())
  parentGoalId String
  title        String
  isCompleted  Boolean  @default(false)
  completedAt  DateTime?
  createdAt    DateTime @default(now())
  parentGoal   TherapeuticGoal @relation(fields: [parentGoalId], references: [id])
}

model GoalProgressUpdate {
  id             String   @id @default(uuid())
  goalId         String
  updatedBy      String   // User ID (client or therapist)
  progressPercent Int
  updateNotes    String?
  updatedAt      DateTime @default(now())
  goal           TherapeuticGoal @relation(fields: [goalId], references: [id])

  @@index([goalId, updatedAt])
}
```

---

##### 4.2 Wins Journal

**Features:**

- **Client Entry**
  - Simple interface for logging wins
  - Prompt: "What went well today?"
  - Optional categories (personal, professional, therapeutic, relationships)
  - Photo attachment option
  - Tags for themes

- **Therapist View**
  - View client wins in dashboard
  - Comment on wins with encouragement
  - Reference wins during sessions

- **Reflection Integration**
  - Wins appear in pre-session prep
  - Weekly summary of wins
  - Visualize win frequency over time

**Database Schema:**

```prisma
model WinEntry {
  id            String   @id @default(uuid())
  clientId      String
  winText       String
  category      String?  // 'PERSONAL', 'PROFESSIONAL', 'THERAPEUTIC', 'RELATIONSHIPS'
  tags          String[]
  imageS3Key    String?
  createdAt     DateTime @default(now())
  client        Client   @relation(fields: [clientId], references: [id])
  comments      WinComment[]

  @@index([clientId, createdAt])
}

model WinComment {
  id           String   @id @default(uuid())
  winId        String
  commentedBy  String   // User ID
  commentText  String
  commentedAt  DateTime @default(now())
  win          WinEntry @relation(fields: [winId], references: [id])

  @@index([winId, commentedAt])
}
```

---

##### 4.3 Before/After Reflections

**Features:**

- **Coping Skill Logging**
  - Log when using a coping skill
  - Rate feelings before skill (1-10)
  - Rate feelings after skill (1-10)
  - Free-text reflection
  - Skill categories (breathing, grounding, distraction, etc.)

- **Evidence Base Creation**
  - Track which skills work best
  - Visualize effectiveness over time
  - Searchable history
  - "What worked in the past" recommendations

**Database Schema:**

```prisma
model CopingSkillLog {
  id              String   @id @default(uuid())
  clientId        String
  skillName       String
  skillCategory   String   // 'BREATHING', 'GROUNDING', 'DISTRACTION', etc.
  feelingBefore   Int      // 1-10
  feelingAfter    Int      // 1-10
  effectiveness   Int      // Calculated: difference
  reflection      String?
  usedAt          DateTime @default(now())
  client          Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, usedAt])
  @@index([clientId, skillName])
}
```

---

#### Category 5: Smart Notifications

**Status:** ❌ Not Started

##### 5.1 Therapist-Scheduled Check-ins

**Features:**

- **Therapist Scheduling Tool**
  - Schedule specific check-in questions
  - Set date/time for delivery
  - Examples: "How did the anxiety technique work this week?"
  - One-time or recurring
  - Client response visible in therapist dashboard

**Database Schema:**

```prisma
model ScheduledCheckIn {
  id             String   @id @default(uuid())
  clientId       String
  createdBy      String   // User ID
  questionText   String
  scheduledFor   DateTime
  isRecurring    Boolean  @default(false)
  recurrenceRule Json?
  status         String   @default("SCHEDULED") // 'SCHEDULED', 'SENT', 'RESPONDED', 'SKIPPED'
  sentAt         DateTime?
  responseText   String?
  respondedAt    DateTime?
  createdAt      DateTime @default(now())
  client         Client   @relation(fields: [clientId], references: [id])

  @@index([clientId, scheduledFor])
}
```

---

##### 5.2 Personalized Reminder Nudges

**Features:**

- **Smart Reminders**
  - System learns from client's tracked patterns
  - Sends reminders based on historical stress times
  - Example: "You usually feel anxious on Monday mornings. Try a breathing exercise?"
  - Fully customizable per client

**Database Schema:**

```prisma
model ReminderNudge {
  id           String   @id @default(uuid())
  clientId     String
  nudgeType    String   // 'MEDICATION', 'BREATHING', 'CHECK_IN', etc.
  nudgeText    String
  triggerRule  Json     // { "pattern": "HIGH_ANXIETY", "days": ["MONDAY"], "time": "09:00" }
  isActive     Boolean  @default(true)
  createdBy    String?  // User ID or 'SYSTEM'
  createdAt    DateTime @default(now())
  client       Client   @relation(fields: [clientId], references: [id])
  deliveries   NudgeDelivery[]
}

model NudgeDelivery {
  id          String   @id @default(uuid())
  nudgeId     String
  sentAt      DateTime @default(now())
  wasActioned Boolean  @default(false)
  actionedAt  DateTime?
  nudge       ReminderNudge @relation(fields: [nudgeId], references: [id])

  @@index([nudgeId, sentAt])
}
```

---

##### 5.3 Micro-Content Delivery

**Features:**

- **Daily Mental Health Tips**
  - Bite-sized tips delivered via notification
  - Personalized based on client's diagnoses and treatment focus
  - Therapist-curated content library
  - Client can rate tips as helpful/not helpful

**Database Schema:**

```prisma
model MicroContent {
  id             String   @id @default(uuid())
  contentText    String
  contentType    String   // 'TIP', 'QUOTE', 'REMINDER', 'INSIGHT'
  categories     String[] // ['ANXIETY', 'DEPRESSION', 'DBT', 'CBT']
  createdBy      String?  // User ID or 'SYSTEM'
  isApproved     Boolean  @default(false)
  approvedBy     String?
  createdAt      DateTime @default(now())
  deliveries     MicroContentDelivery[]
}

model MicroContentDelivery {
  id           String   @id @default(uuid())
  contentId    String
  clientId     String
  deliveredAt  DateTime @default(now())
  wasViewed    Boolean  @default(false)
  viewedAt     DateTime?
  helpfulRating Int?    // 1-5
  content      MicroContent @relation(fields: [contentId], references: [id])
  client       Client       @relation(fields: [clientId], references: [id])

  @@index([clientId, deliveredAt])
}
```

---

#### Category 6: Journaling with AI-Assisted Reflection

**Status:** ❌ Not Started

##### 6.1 Smart Journaling Feature

**Features:**

- **Free-Form Journaling**
  - Text editor with auto-save
  - Private by default
  - Optional sharing with therapist
  - Rich text formatting
  - Voice-to-text option

- **AI Reflection Prompts**
  - Gentle, non-therapeutic prompts based on journal content
  - Examples: "You mentioned feeling overwhelmed - what was happening right before that feeling started?"
  - Clear disclaimer: This is not therapy or clinical advice
  - Client can disable AI prompts

- **Therapist Access**
  - Client grants permission for therapist to read entries
  - Therapist can comment on entries
  - Integration with session prep

**Database Schema:**

```prisma
model JournalEntry {
  id               String   @id @default(uuid())
  clientId         String
  entryText        String
  entryDate        DateTime @default(now())
  isSharedWithClinician Boolean @default(false)
  aiPromptsEnabled Boolean  @default(true)
  voiceToText      Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  client           Client   @relation(fields: [clientId], references: [id])
  aiPrompts        AIJournalPrompt[]
  clinicianComments JournalComment[]

  @@index([clientId, entryDate])
}

model AIJournalPrompt {
  id           String   @id @default(uuid())
  entryId      String
  promptText   String
  generatedAt  DateTime @default(now())
  wasAnswered  Boolean  @default(false)
  answerText   String?
  answeredAt   DateTime?
  entry        JournalEntry @relation(fields: [entryId], references: [id])
}

model JournalComment {
  id           String   @id @default(uuid())
  entryId      String
  commentedBy  String   // User ID
  commentText  String
  commentedAt  DateTime @default(now())
  entry        JournalEntry @relation(fields: [entryId], references: [id])
}
```

---

#### Category 7: Two-Way Asynchronous Communication

**Status:** 🔄 40% Complete (Secure Messaging Implemented)

##### 7.1 Secure Messaging ✅ COMPLETE

**Features:**
- HIPAA-compliant messaging
- Message status indicators
- Threaded conversations
- Priority levels
- Unread message counts

**Database Schema:** (Already implemented - see PortalMessage model)

---

##### 7.2 Voice Memo Feature

**Features:**

- **Client Recording**
  - Record voice messages (up to 5 minutes)
  - Attach to message threads
  - Playback before sending
  - Delete and re-record

- **Therapist Listening**
  - Play voice memos in dashboard
  - Respond with text or voice
  - Same security standards as text

**Database Schema:**

```prisma
model VoiceMemo {
  id            String   @id @default(uuid())
  messageId     String   // Links to PortalMessage
  sentBy        String   // User ID or Client ID
  audioS3Key    String
  durationSeconds Int
  transcription String?  // Optional AI transcription
  createdAt     DateTime @default(now())

  @@index([messageId])
}
```

---

##### 7.3 Session Notes Access

**Features:**

- **Therapist Sharing**
  - Option to share post-session summary with client
  - Highlights: Key discussion points, homework assigned, goals discussed
  - PDF generation
  - Version history

- **Client View**
  - Access shared session notes
  - Download PDF
  - Reference between sessions

**Database Schema:**

```prisma
model SessionSummary {
  id              String   @id @default(uuid())
  appointmentId   String   @unique
  clinicianId     String
  clientId        String
  summaryText     String
  keyPoints       String[]
  homeworkAssigned String?
  goalsDiscussed  String[]
  isSharedWithClient Boolean @default(false)
  sharedAt        DateTime?
  pdfS3Key        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  clinician       User        @relation(fields: [clinicianId], references: [id])
  client          Client      @relation(fields: [clientId], references: [id])

  @@index([clientId, sharedAt])
}
```

---

#### Technical Requirements

**Security & Compliance:**
- All features must be HIPAA compliant
- End-to-end encryption for sensitive data
- Audit logging for all PHI access
- Role-based access controls
- Secure API endpoints with JWT authentication

**Performance:**
- Mobile-responsive design (optimize for phone usage)
- Progressive Web App (PWA) capabilities
- Offline mode for critical features (mood tracking, crisis toolkit)
- Push notification support (iOS, Android)
- Load time <2 seconds

**Data & Privacy:**
- Client data export functionality (GDPR compliance)
- Data retention policies
- Client can delete account and all data
- Granular privacy controls (choose what to share with therapist)

**Integration:**
- Deep integration with EHR (bidirectional data sync)
- Stripe payment processing integration
- Twilio for SMS notifications
- SendGrid for email notifications
- AWS S3 for file storage
- AWS CloudFront for content delivery

**Monitoring & Analytics:**
- Usage analytics (engagement metrics)
- Feature adoption tracking
- Error monitoring and crash reporting
- Performance monitoring

---

#### User Stories

**Client:**
- As a client, I want to track my mood daily so that I can see patterns over time
- As a client, I want access to crisis resources so that I feel supported between sessions
- As a client, I want to journal and get reflection prompts so that I can process my thoughts
- As a client, I want to complete homework assignments so that I stay engaged in treatment
- As a client, I want to log wins so that I can see my progress

**Therapist:**
- As a therapist, I want to assign custom prompts so that I can personalize treatment
- As a therapist, I want to view client mood data so that I can track progress
- As a therapist, I want to share resources so that clients have tools between sessions
- As a therapist, I want to see homework completion so that I can follow up in sessions
- As a therapist, I want to customize crisis toolkits so that clients have personalized support

**Admin:**
- As an admin, I want to view engagement metrics so that I can measure portal adoption
- As an admin, I want to see all session reviews so that I can monitor quality
- As an admin, I want to manage therapist change requests so that I can facilitate smooth transitions

---

#### Success Metrics

**Engagement Metrics:**
- Daily active users (DAU): Target 60% of clients logging in daily
- Average session duration: Target 5+ minutes per day
- Feature adoption: Target 70% of clients using at least 3 features daily
- Streak maintenance: Target 50% of clients maintaining 7+ day streaks

**Clinical Outcomes:**
- Client retention: 25% increase in retention rate
- Homework completion: 80% completion rate
- Mood improvement: 20% improvement in average mood scores over 90 days
- Crisis toolkit usage: Measurable reduction in crisis escalations

**Business Metrics:**
- Portal adoption: 80% of clients with active portal accounts within 6 months
- No-show reduction: 15% reduction in no-show rate
- Administrative efficiency: 40% reduction in therapist time spent on administrative tasks
- Revenue impact: 10% increase in revenue per client (due to better retention)

---

#### Implementation Roadmap

**Phase 1: Core Transactional Features (Weeks 1-4)**
- Billing & insurance management ✅ 40% Complete
- Forms & document management
- Session reviews
- Therapist change requests

**Phase 2: Daily Engagement (Weeks 5-8)**
- Mood & symptom tracking
- Daily prompts
- Streak tracking
- Pre-session prep

**Phase 3: Between-Session Support (Weeks 9-12)**
- Resource library
- Crisis toolkit
- Audio vault
- Homework tracker

**Phase 4: Progress & Motivation (Weeks 13-16)**
- Goals dashboard
- Wins journal
- Before/after reflections

**Phase 5: Smart Features (Weeks 17-20)**
- AI journaling
- Personalized notifications
- Therapist check-ins
- Micro-content delivery

**Phase 6: Communication Enhancement (Weeks 21-24)**
- Voice memos
- Session notes access
- Advanced messaging features

---

### Module 10: Reporting & Analytics

**Status:** ❌ Not Started

#### Features (Planned)

- Revenue reports (by clinician, by CPT code, by payer)
- Productivity reports (sessions per day, KVR, documentation time)
- Compliance reports (unsigned notes, missing treatment plans)
- Client demographic reports
- Payer mix analysis
- Claim denial analysis
- Custom report builder
- Scheduled report email delivery

---

## Technical Architecture

### Infrastructure (AWS)

- **Compute:** AWS Lambda (serverless functions), ECS (backend API containers)
- **Database:** Amazon RDS PostgreSQL (primary database)
- **Caching:** Amazon ElastiCache Redis
- **Storage:** Amazon S3 (documents, attachments, ERAs)
- **Authentication:** AWS Cognito (user management, MFA)
- **API Gateway:** AWS API Gateway (REST API)
- **CDN:** Amazon CloudFront (frontend delivery)
- **Monitoring:** Amazon CloudWatch (logs, metrics, alarms)
- **Secrets:** AWS Secrets Manager
- **Encryption:** AWS KMS (encryption keys)

### Backend Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **API:** RESTful JSON API
- **Authentication:** JWT with refresh tokens
- **Validation:** Zod schemas
- **Logging:** Winston (multi-logger: app, audit, performance, security)
- **Error Handling:** Centralized error middleware with unique error IDs

### Frontend Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **UI Framework:** TailwindCSS
- **Component Library:** Headless UI (modals, dropdowns)
- **State Management:** React Query (@tanstack/react-query) + Context API
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **Date Handling:** date-fns
- **HTTP Client:** Axios

### Database

- **Primary Database:** PostgreSQL 15 (Amazon RDS)
- **ORM:** Prisma
- **Migrations:** Prisma Migrate
- **Backup:** Automated daily backups (AWS RDS)
- **Encryption:** Encryption at rest (AWS KMS)

---

## Security & Compliance

### HIPAA Compliance

1. **Encryption**
   - At Rest: AWS KMS encryption for RDS, S3, and EBS volumes
   - In Transit: TLS 1.3 for all API traffic
   - Database: PostgreSQL native encryption

2. **Access Controls**
   - Role-Based Access Control (RBAC)
   - Multi-Factor Authentication (MFA) for all users
   - Session timeout after 15 minutes of inactivity
   - Failed login attempt lockout (5 attempts)

3. **Audit Logging**
   - All PHI access logged with user ID, timestamp, action
   - Audit logs stored in separate S3 bucket with 7-year retention
   - CloudTrail enabled for all AWS API calls
   - Application-level audit logs via Winston

4. **Data Backup & Recovery**
   - Automated daily database backups (35-day retention)
   - Point-in-time recovery enabled
   - Disaster recovery plan with RTO <4 hours, RPO <1 hour

5. **Business Associate Agreements (BAAs)**
   - AWS BAA in place
   - AdvancedMD BAA in place
   - Twilio BAA in place
   - SendGrid BAA in place
   - OpenAI BAA required

6. **Breach Notification**
   - Automated breach detection via CloudWatch alarms
   - Breach notification workflow (notify users within 60 days)
   - Incident response plan documented

### Authentication & Authorization

- **AWS Cognito** for user authentication
- **JWT Tokens** for API authentication (access + refresh tokens)
- **Access Token Expiry:** 15 minutes
- **Refresh Token Expiry:** 7 days
- **Password Policy:** Min 12 characters, uppercase, lowercase, number, special character
- **MFA:** Required for all users (TOTP via authenticator app)

---

## Integration Requirements

### External Integrations

1. **AdvancedMD** (Practice Management & Billing)
   - Authentication: Token-based (24-hour expiry)
   - Endpoints: Patient sync, Appointments, Eligibility, Charges, Claims, Payments
   - Rate Limiting: 3 tiers (High, Medium, Low) with peak/off-peak limits
   - SLA: 99.9% eligibility success rate, 99.5% claim acceptance rate

2. **OpenAI** (AI Clinical Notes)
   - Model: GPT-4
   - Use Cases: SOAP note generation, treatment plan suggestions, clinical language enhancement
   - Compliance: BAA required for PHI processing

3. **Anthropic Claude** (Billing Analytics)
   - Model: Claude 3.5 Sonnet
   - Use Cases: Billing analytics, claim denial analysis, revenue optimization recommendations

4. **Twilio** (SMS Notifications)
   - Use Cases: Appointment reminders, no-show follow-ups
   - Compliance: BAA in place

5. **SendGrid** (Email Notifications)
   - Use Cases: Appointment reminders, password resets, weekly performance reports
   - Compliance: BAA in place

6. **Stripe** (Payment Processing)
   - Use Cases: Client portal payments, credit card processing
   - Compliance: PCI DSS Level 1

7. **Waystar** (Claims Clearinghouse)
   - Use Cases: Claim submission via AdvancedMD
   - SLA: 99.5% acceptance rate

---

## Success Metrics

### Phase 1: Foundation (Weeks 1-4) ✅ COMPLETE
- ✅ Infrastructure deployed (VPC, RDS, S3, Cognito)
- ✅ Authentication system operational
- ✅ Basic API endpoints functional

### Phase 2: Core Features (Weeks 5-12) ✅ COMPLETE
- ✅ Client management module operational
- ✅ Appointment scheduling functional with recurring appointments
- ✅ Clinical documentation with 8 note types and AI integration
- ✅ Billing module backend and frontend complete

### Phase 3: Advanced Features (Weeks 13-20) 🔄 IN PROGRESS
- 🔄 AdvancedMD integration framework (75% complete)
- 🔄 ERA and claim attachments bridge system (architecture complete)
- ❌ Telehealth integration (not started)
- ❌ Client portal (not started)

### Phase 4: Productivity & Accountability (NEW) ⏳ PLANNED
- ⏳ Metric dictionary implementation (13 categories, 35+ metrics)
- ⏳ Clinician "My Practice" dashboard
- ⏳ Supervisor "My Team" dashboard
- ⏳ Administrator "Practice Overview" dashboard
- ⏳ Alerts and nudges system
- ⏳ Georgia compliance automation

### Phase 5: Launch Preparation (Weeks 21-24)
- ❌ Testing & QA (unit, integration, e2e, load)
- ❌ Documentation (user guides, API docs, training materials)
- ❌ Production deployment
- ❌ User training and onboarding

---

## Key Performance Indicators (KPIs)

### Clinical Efficiency
- **Target:** 50% reduction in documentation time (from 30 min to 15 min per note)
- **Measurement:** Average time from session end to note signature

### Revenue Cycle Optimization
- **Target:** 80% reduction in claim denials (from 10% to 2%)
- **Measurement:** (Denied Claims / Total Claims) × 100

### Clinician Productivity
- **Target:** 85% Kept Visit Rate (KVR) across all clinicians
- **Measurement:** (Completed Appointments / Scheduled Appointments) × 100

### Compliance
- **Target:** 100% notes signed within 7 days (Georgia requirement)
- **Measurement:** (Notes Signed ≤7 Days / Total Notes) × 100

### User Adoption
- **Target:** 90% daily active usage among clinicians within 30 days of launch
- **Measurement:** (Clinicians Using System Daily / Total Clinicians) × 100

### System Performance
- **Target:** API response time p99 <500ms
- **Measurement:** CloudWatch metrics for API Gateway

### System Uptime
- **Target:** 99.9% uptime (excluding planned maintenance)
- **Measurement:** CloudWatch uptime monitoring

---

## Risks & Mitigation

### Risk 1: AdvancedMD Integration Delays
- **Likelihood:** Medium
- **Impact:** High (delays billing functionality)
- **Mitigation:** Develop bridge systems for ERA and attachments, implement rate limiting proactively

### Risk 2: AI Model Hallucinations
- **Likelihood:** Medium
- **Impact:** High (inaccurate clinical notes, liability)
- **Mitigation:** Always require clinician review before note signature, implement confidence scoring

### Risk 3: HIPAA Compliance Violations
- **Likelihood:** Low
- **Impact:** Critical (fines, legal liability)
- **Mitigation:** Annual security audits, penetration testing, comprehensive audit logging

### Risk 4: User Adoption Resistance
- **Likelihood:** Medium
- **Impact:** High (low usage, ROI failure)
- **Mitigation:** Extensive user training, intuitive UI/UX, change management support

### Risk 5: Scope Creep
- **Likelihood:** High
- **Impact:** Medium (timeline delays, budget overruns)
- **Mitigation:** Strict change control process, prioritize MVP features, defer "nice-to-have" features to Phase 2

---

## Roadmap & Timeline

See [PRODUCTION-ROADMAP.md](./PRODUCTION-ROADMAP.md) for detailed weekly breakdown.

**Overall Timeline:** 24 weeks (6 months)

- **Phase 1:** Weeks 1-4 (Foundation) ✅ COMPLETE
- **Phase 2:** Weeks 5-12 (Core Features) ✅ COMPLETE
- **Phase 3:** Weeks 13-20 (Advanced Features) 🔄 75% COMPLETE
- **Phase 4:** Weeks 17-20 (Productivity & Accountability) ⏳ PLANNED
- **Phase 5:** Weeks 21-24 (Launch Preparation) ❌ NOT STARTED

**Current Status:** Week 17 of 24 (71% complete)

---

## Appendix

### Glossary

- **KVR (Kept Visit Rate):** Percentage of scheduled appointments that are completed
- **ERA (Electronic Remittance Advice):** 835 EDI file containing payment information from payers
- **CARC (Claim Adjustment Reason Code):** Standardized code explaining claim adjustments
- **CPT Code:** Current Procedural Terminology code for billing
- **ICD-10:** International Classification of Diseases, 10th revision (diagnosis codes)
- **HIPAA:** Health Insurance Portability and Accountability Act
- **PHI (Protected Health Information):** Any health information that can identify an individual
- **BAA (Business Associate Agreement):** Contract required when third party handles PHI

---

**Document Control:**

- **Version History:**
  - v1.0 (September 1, 2025): Initial PRD
  - v2.0 (October 13, 2025): Added Productivity & Accountability Module

- **Approvals:**
  - Product Owner: [Name]
  - Technical Lead: [Name]
  - Compliance Officer: [Name]

- **Review Schedule:** Monthly

---

**End of Document**
