# Module 9: Practice Management & Administration - Implementation Plan

**Status**: ❌ 5% Complete → Target: 100% Complete
**Scope**: Implement all subsystems EXCEPT Facility Management
**Approach**: 8 Parallel Specialized Agents
**Priority**: CRITICAL (Regulatory Blockers Identified)

---

## Executive Summary

Module 9 is the **most underdeveloped module** with only 5% implementation. This plan addresses the 95% gap across 9 subsystems using 8 specialized agents working in parallel.

**Critical Regulatory Blockers (P0 - Must Implement First):**
1. ❌ Credentialing & Licensing - Cannot track license expirations (legal risk)
2. ❌ Training & Development - Cannot prove compliance training (audit risk)
3. ❌ Compliance Management - No incident reporting or policy distribution (regulatory risk)
4. ❌ HR Functions - No systematic performance or time tracking

**Excluded Per User Request:**
- ❌ Facility Management (all components)
- ❌ Equipment Management
- ❌ Room Scheduling

---

## Current Implementation Status

### What Exists (5%)
- ✅ PracticeSettings model (140+ fields)
- ✅ User management (basic CRUD)
- ✅ Practice settings UI (12 tabs)
- ✅ Sunday lockout compliance
- ✅ Email service (SMTP)

### What's Missing (95%)
- ❌ 9 database tables (Credentials, Training_Records, Policies, Incidents, Performance_Reviews, Vendors, Time_Attendance, Messages, Budgets)
- ❌ 8 backend services
- ❌ 13 frontend component suites
- ❌ All test scripts

---

## Implementation Architecture

### 8 Specialized Agents (Parallel Execution)

#### **Agent 1: Credentialing System** [CRITICAL - P0]
**Priority**: HIGHEST - Regulatory blocker
**Estimated Effort**: 2-3 sprints
**Complexity**: HIGH

**Database Schema:**
```prisma
model Credential {
  id                  String   @id @default(uuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  credentialType      CredentialType
  credentialNumber    String
  issuingAuthority    String
  issuingState        String?
  issueDate           DateTime
  expirationDate      DateTime
  renewalDate         DateTime?

  // Requirements
  ceuRequirements     Int?      // Required CEU credits
  renewalRequirements Json?     // Checklist of renewal requirements
  verificationStatus  VerificationStatus @default(PENDING)
  verificationDate    DateTime?
  verificationMethod  String?

  // OIG/SAM Screening
  lastScreeningDate   DateTime?
  screeningStatus     ScreeningStatus @default(CLEAR)
  screeningNotes      String?

  // Documentation
  documents           String[]  // Array of document URLs
  restrictions        String?
  scope               String?   // Scope of practice

  // Alerts
  alertsSent          Json?     // Track 90/60/30 day alerts

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId])
  @@index([expirationDate])
  @@index([credentialType])
}

enum CredentialType {
  STATE_LICENSE
  DEA_LICENSE
  NPI
  BOARD_CERTIFICATION
  MALPRACTICE_INSURANCE
  LIABILITY_INSURANCE
  BACKGROUND_CHECK
  REFERENCE_CHECK
  OTHER
}

enum VerificationStatus {
  PENDING
  VERIFIED
  EXPIRED
  SUSPENDED
  REVOKED
}

enum ScreeningStatus {
  CLEAR
  FLAGGED
  PENDING
  ERROR
}
```

**Backend Services:**
- `credentialing.service.ts` (500+ lines)
  - License CRUD operations
  - Expiration monitoring (90/60/30 day alerts)
  - Renewal workflow management
  - OIG/SAM API integration
  - Multi-state license tracking
  - Document management
  - Verification tracking

- `credentialing.controller.ts` (300+ lines)
  - GET /credentials - List all credentials
  - GET /credentials/:id - Get credential details
  - POST /credentials - Create new credential
  - PUT /credentials/:id - Update credential
  - DELETE /credentials/:id - Delete credential
  - POST /credentials/:id/verify - Mark as verified
  - POST /credentials/:id/screen - Run OIG/SAM screening
  - GET /credentials/expiring - Get expiring credentials
  - POST /credentials/:id/renew - Initiate renewal
  - GET /credentials/reports - Generate reports

**Frontend Components:**
- `CredentialingDashboard.tsx` - Main dashboard with alerts
- `CredentialList.tsx` - List all credentials with filters
- `CredentialForm.tsx` - Add/edit credential
- `CredentialDetail.tsx` - View credential details
- `LicenseExpirationAlerts.tsx` - Alert widget
- `RenewalChecklist.tsx` - Renewal workflow
- `VerificationPanel.tsx` - Primary source verification
- `ScreeningResults.tsx` - OIG/SAM results display
- `CredentialDocuments.tsx` - Document upload/management

**Cron Jobs:**
- Daily expiration check (90/60/30 days)
- Monthly OIG/SAM screening
- Quarterly verification reminders

**Test Script:** `test-credentialing.js`
- Create credentials for all users
- Test expiration alerts
- Test renewal workflow
- Test OIG/SAM screening (mock API)
- Test verification tracking

---

#### **Agent 2: Training & Development System** [CRITICAL - P0]
**Priority**: HIGHEST - Regulatory blocker
**Estimated Effort**: 2 sprints
**Complexity**: MEDIUM-HIGH

**Database Schema:**
```prisma
model TrainingRecord {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  // Training Information
  trainingType      TrainingType
  courseName        String
  provider          String
  category          TrainingCategory

  // Dates
  assignedDate      DateTime?
  dueDate           DateTime?
  completionDate    DateTime?
  expirationDate    DateTime?

  // Credits & Scoring
  creditsEarned     Decimal?
  creditsRequired   Decimal?
  score             Int?
  passingScore      Int?

  // Status
  status            TrainingStatus @default(NOT_STARTED)
  required          Boolean   @default(false)
  complianceMet     Boolean   @default(false)

  // Documentation
  certificateUrl    String?
  notes             String?
  attestedBy        String?
  attestedDate      DateTime?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([required])
  @@index([expirationDate])
}

enum TrainingType {
  HIPAA
  SAFETY
  CLINICAL_COMPETENCY
  TECHNOLOGY
  COMPLIANCE
  SOFT_SKILLS
  CEU
  CERTIFICATION
  OTHER
}

enum TrainingCategory {
  MANDATORY
  RECOMMENDED
  OPTIONAL
  CEU_REQUIRED
}

enum TrainingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  EXPIRED
  FAILED
}

model Course {
  id              String   @id @default(uuid())
  courseName      String
  provider        String
  description     String?
  duration        Int?      // Minutes
  credits         Decimal?
  trainingType    TrainingType
  category        TrainingCategory

  // Content
  contentUrl      String?
  materials       String[]  // Array of material URLs

  // Settings
  isActive        Boolean   @default(true)
  passingScore    Int?
  expirationMonths Int?     // Expires X months after completion

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Backend Services:**
- `training.service.ts` (400+ lines)
  - Training record CRUD
  - Course catalog management
  - Training assignment workflow
  - Completion tracking
  - CEU credit calculations
  - Compliance reporting
  - Expiration monitoring

- `training.controller.ts` (250+ lines)
  - GET /training - List training records
  - GET /training/:id - Get training record
  - POST /training - Create training record
  - PUT /training/:id - Update training record
  - POST /training/:id/complete - Mark as completed
  - GET /training/compliance - Compliance dashboard
  - GET /training/expiring - Get expiring training
  - GET /courses - List courses
  - POST /courses - Create course
  - PUT /courses/:id - Update course

**Frontend Components:**
- `TrainingDashboard.tsx` - Main training dashboard
- `TrainingList.tsx` - List assigned training
- `CourseCalendar.tsx` - Training calendar view
- `CourseCatalog.tsx` - Browse available courses
- `TrainingForm.tsx` - Assign/complete training
- `TrainingDetail.tsx` - Training record details
- `ComplianceTracker.tsx` - Compliance status by user
- `CEUTracker.tsx` - CEU credit tracking
- `CertificateViewer.tsx` - View/download certificates
- `TrainingReports.tsx` - Training compliance reports

**Cron Jobs:**
- Daily training due date reminders
- Weekly compliance checks
- Monthly expiration alerts

**Test Script:** `test-training.js`
- Create course catalog
- Assign mandatory training to all users
- Test completion workflow
- Test CEU tracking
- Test compliance reporting

---

#### **Agent 3: Compliance Management System** [CRITICAL - P0]
**Priority**: HIGHEST - Regulatory blocker
**Estimated Effort**: 2-3 sprints
**Complexity**: HIGH

**Database Schema:**
```prisma
model Policy {
  id                String   @id @default(uuid())
  policyName        String
  policyNumber      String   @unique
  category          PolicyCategory

  // Version Control
  version           String
  effectiveDate     DateTime
  reviewDate        DateTime
  nextReviewDate    DateTime?

  // Ownership
  ownerId           String
  owner             User     @relation("PolicyOwner", fields: [ownerId], references: [id])
  approvedById      String?
  approvedBy        User?    @relation("PolicyApprover", fields: [approvedById], references: [id])
  approvalDate      DateTime?

  // Content
  content           String   @db.Text
  summary           String?
  attachments       String[] // Document URLs

  // Distribution
  distributionList  String[] // User IDs
  requireAck        Boolean  @default(false)
  acknowledgments   PolicyAcknowledgment[]

  // Status
  status            PolicyStatus @default(DRAFT)
  isActive          Boolean  @default(true)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([category])
  @@index([status])
  @@index([effectiveDate])
}

model PolicyAcknowledgment {
  id          String   @id @default(uuid())
  policyId    String
  policy      Policy   @relation(fields: [policyId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  acknowledgedDate DateTime @default(now())
  signature        String?
  ipAddress        String?

  @@unique([policyId, userId])
  @@index([policyId])
  @@index([userId])
}

enum PolicyCategory {
  CLINICAL
  ADMINISTRATIVE
  HR
  SAFETY
  IT
  FINANCIAL
  COMPLIANCE
}

enum PolicyStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}

model Incident {
  id                String   @id @default(uuid())
  incidentNumber    String   @unique

  // Basic Information
  incidentDate      DateTime
  incidentTime      String?
  incidentType      IncidentType
  severity          Severity

  // Location
  location          String?
  specificLocation  String?

  // People
  reportedById      String
  reportedBy        User     @relation("IncidentReporter", fields: [reportedById], references: [id])
  involvedParties   String[] // User IDs or names
  witnesses         String[] // Names or IDs

  // Description
  description       String   @db.Text
  immediateAction   String?  @db.Text

  // Investigation
  investigationStatus InvestigationStatus @default(PENDING)
  assignedToId      String?
  assignedTo        User?    @relation("IncidentInvestigator", fields: [assignedToId], references: [id])
  investigationNotes String? @db.Text
  rootCause         String?  @db.Text

  // Resolution
  correctiveActions Json?    // Array of actions
  preventiveActions Json?    // Array of actions
  followUpDate      DateTime?
  resolutionDate    DateTime?

  // Documentation
  attachments       String[] // Document URLs
  notifications     Json?    // Who was notified

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([incidentType])
  @@index([severity])
  @@index([investigationStatus])
  @@index([incidentDate])
}

enum IncidentType {
  CLINICAL
  SAFETY
  SECURITY
  COMPLIANCE
  EMPLOYEE
  EQUIPMENT
  PATIENT_COMPLAINT
  MEDICATION_ERROR
  DOCUMENTATION_ERROR
  OTHER
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum InvestigationStatus {
  PENDING
  IN_PROGRESS
  UNDER_REVIEW
  RESOLVED
  CLOSED
}
```

**Backend Services:**
- `policy.service.ts` (400+ lines)
  - Policy CRUD operations
  - Version control
  - Distribution workflow
  - Acknowledgment tracking
  - Policy library management

- `incident.service.ts` (500+ lines)
  - Incident reporting
  - Investigation workflow
  - Corrective action tracking
  - Notification system
  - Trend analysis

- `policy.controller.ts` (250+ lines)
- `incident.controller.ts` (300+ lines)

**Frontend Components:**
- `PolicyLibrary.tsx` - Browse/search policies
- `PolicyForm.tsx` - Create/edit policy
- `PolicyDetail.tsx` - View policy with version history
- `PolicyDistribution.tsx` - Distribute to users
- `PolicyAcknowledgment.tsx` - Acknowledge policy
- `IncidentReportingForm.tsx` - Report incident
- `IncidentList.tsx` - View incidents
- `IncidentDetail.tsx` - Investigation workspace
- `IncidentInvestigation.tsx` - Investigation tools
- `ComplianceDashboard.tsx` - Overall compliance status
- `TrendAnalysis.tsx` - Incident trends

**Cron Jobs:**
- Monthly policy review reminders
- Daily incident follow-up checks
- Weekly compliance reporting

**Test Script:** `test-compliance.js`
- Create policies
- Test distribution workflow
- Test acknowledgment tracking
- Create test incidents
- Test investigation workflow
- Test corrective action tracking

---

#### **Agent 4: HR Functions** [HIGH PRIORITY - P1]
**Priority**: HIGH
**Estimated Effort**: 2 sprints
**Complexity**: MEDIUM

**Database Schema:**
```prisma
model PerformanceReview {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation("ReviewedUser", fields: [userId], references: [id])
  reviewerId      String
  reviewer        User     @relation("Reviewer", fields: [reviewerId], references: [id])

  // Review Period
  reviewPeriod    String   // e.g., "Q1 2025", "Annual 2025"
  reviewDate      DateTime
  nextReviewDate  DateTime?

  // Ratings
  overallRating   Int      // 1-5 scale
  goals           Json     // Array of goals with ratings
  competencies    Json     // Array of competencies with ratings

  // Feedback
  strengths       String   @db.Text
  improvements    String   @db.Text
  actionPlans     Json     // Array of action items

  // Employee Input
  selfEvaluation  String?  @db.Text
  employeeComments String? @db.Text
  employeeSignature String?
  employeeSignDate DateTime?

  // Manager Input
  managerComments String?  @db.Text
  managerSignature String?
  managerSignDate DateTime?

  // Status
  status          ReviewStatus @default(DRAFT)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([reviewerId])
  @@index([reviewDate])
}

enum ReviewStatus {
  DRAFT
  PENDING_SELF_EVAL
  PENDING_MANAGER_REVIEW
  PENDING_EMPLOYEE_SIGNATURE
  COMPLETED
}

model TimeAttendance {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  date            DateTime

  // Scheduled Time
  scheduledStart  String?  // HH:MM format
  scheduledEnd    String?

  // Actual Time
  actualStart     DateTime?
  actualEnd       DateTime?
  breakMinutes    Int?

  // Calculations
  totalHours      Decimal?
  overtimeHours   Decimal?

  // Absence
  isAbsent        Boolean  @default(false)
  absenceType     AbsenceType?
  absenceReason   String?

  // Approval
  approvedById    String?
  approvedBy      User?    @relation("AttendanceApprover", fields: [approvedById], references: [id])
  approvalDate    DateTime?

  // Notes
  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}

enum AbsenceType {
  SICK
  PTO
  VACATION
  PERSONAL
  FMLA
  UNPAID
  BEREAVEMENT
  JURY_DUTY
  OTHER
}

model PTORequest {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation("PTORequestor", fields: [userId], references: [id])

  // Request Details
  requestType     AbsenceType
  startDate       DateTime
  endDate         DateTime
  totalDays       Decimal

  // Reason
  reason          String?  @db.Text

  // Approval
  status          PTOStatus @default(PENDING)
  approvedById    String?
  approvedBy      User?    @relation("PTOApprover", fields: [approvedById], references: [id])
  approvalDate    DateTime?
  approvalNotes   String?

  // Coverage
  coverageNotes   String?  @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([status])
  @@index([startDate])
}

enum PTOStatus {
  PENDING
  APPROVED
  DENIED
  CANCELLED
}

model PTOBalance {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  // Balances (in days)
  ptoBalance      Decimal  @default(0)
  sickBalance     Decimal  @default(0)
  vacationBalance Decimal  @default(0)

  // Annual Allocation
  ptoAnnual       Decimal  @default(0)
  sickAnnual      Decimal  @default(0)
  vacationAnnual  Decimal  @default(0)

  // Accrual
  accrualRate     Decimal? // Days per pay period
  lastAccrualDate DateTime?

  updatedAt       DateTime @updatedAt
}
```

**Backend Services:**
- `hr.service.ts` (500+ lines)
  - Performance review management
  - PTO request/approval workflow
  - Time attendance tracking
  - Balance calculations

- `performance.service.ts` (300+ lines)
- `attendance.service.ts` (300+ lines)

**Frontend Components:**
- `PerformanceReviewDashboard.tsx`
- `PerformanceReviewForm.tsx`
- `PerformanceReviewDetail.tsx`
- `PTORequestForm.tsx`
- `PTOCalendar.tsx`
- `PTOBalance.tsx`
- `TimeClockInterface.tsx`
- `AttendanceReport.tsx`
- `EmployeeSelfService.tsx`

**Test Script:** `test-hr.js`
- Create performance reviews
- Test review workflow
- Create PTO requests
- Test approval workflow
- Test time tracking
- Test balance calculations

---

#### **Agent 5: Staff Management Enhancement** [MEDIUM PRIORITY - P1]
**Priority**: MEDIUM
**Estimated Effort**: 1-2 sprints
**Complexity**: MEDIUM

**Database Schema Updates:**
```prisma
// Extend existing User model
model User {
  // ... existing fields ...

  // Employment Information (ADD THESE)
  employeeId           String?   @unique
  hireDate             DateTime?
  terminationDate      DateTime?
  employmentType       EmploymentType?
  department           String?
  position             String?
  workLocation         String?
  workSchedule         String?

  // Organizational Structure (ADD THESE)
  managerId            String?
  manager              User?     @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates         User[]    @relation("ManagerSubordinates")

  // ... existing relations ...
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACTOR
  INTERN
  PER_DIEM
}

model OnboardingChecklist {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  // Checklist Items
  items           Json     // Array of checklist items with status

  // Milestones
  startDate       DateTime
  firstDayComplete Boolean @default(false)
  firstWeekComplete Boolean @default(false)
  thirtyDayComplete Boolean @default(false)
  sixtyDayComplete Boolean @default(false)
  ninetyDayComplete Boolean @default(false)

  // Completion
  completionDate  DateTime?
  mentorId        String?
  mentor          User?    @relation("OnboardingMentor", fields: [mentorId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Backend Services:**
- Enhanced `user.controller.ts` - Add employment endpoints
- `onboarding.service.ts` (300+ lines)
- `organizational-chart.service.ts` (200+ lines)

**Frontend Components:**
- `OrganizationalChart.tsx` - Visual org chart
- `EnhancedEmployeeProfile.tsx` - Full profile with all fields
- `EmploymentHistory.tsx` - Track employment changes
- `OnboardingDashboard.tsx` - Onboarding checklist
- `OnboardingChecklist.tsx` - Interactive checklist
- `OffboardingWorkflow.tsx` - Offboarding process
- `EmergencyContactManager.tsx` - Manage emergency contacts

**Test Script:** `test-staff-management.js`
- Update all users with employment data
- Create organizational hierarchy
- Test org chart generation
- Create onboarding checklists
- Test onboarding workflow

---

#### **Agent 6: Communication & Document Management** [MEDIUM PRIORITY - P2]
**Priority**: MEDIUM
**Estimated Effort**: 2 sprints
**Complexity**: MEDIUM-HIGH

**Database Schema:**
```prisma
model Message {
  id              String   @id @default(uuid())
  senderId        String
  sender          User     @relation("MessageSender", fields: [senderId], references: [id])

  // Recipients
  recipientType   RecipientType
  recipientIds    String[] // User IDs or channel IDs

  // Content
  subject         String?
  body            String   @db.Text
  attachments     String[] // File URLs

  // Type
  messageType     MessageType @default(DIRECT)
  priority        MessagePriority @default(NORMAL)

  // Status
  isRead          Boolean  @default(false)
  readBy          String[] // User IDs who read
  readAt          Json?    // Map of userId -> timestamp

  // Thread
  threadId        String?
  replyToId       String?
  replyTo         Message? @relation("MessageReplies", fields: [replyToId], references: [id])
  replies         Message[] @relation("MessageReplies")

  // Archival
  isArchived      Boolean  @default(false)
  expiresAt       DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([senderId])
  @@index([threadId])
  @@index([createdAt])
}

enum RecipientType {
  INDIVIDUAL
  DEPARTMENT
  TEAM
  ALL_STAFF
  ROLE_BASED
}

enum MessageType {
  DIRECT
  BROADCAST
  ANNOUNCEMENT
  ALERT
  SHIFT_HANDOFF
}

enum MessagePriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model Channel {
  id              String   @id @default(uuid())
  name            String
  description     String?
  channelType     ChannelType

  // Members
  memberIds       String[] // User IDs
  adminIds        String[] // Admin user IDs

  // Settings
  isPrivate       Boolean  @default(false)
  isArchived      Boolean  @default(false)

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([channelType])
}

enum ChannelType {
  DEPARTMENT
  TEAM
  PROJECT
  GENERAL
  ANNOUNCEMENTS
}

model Document {
  id              String   @id @default(uuid())
  name            String
  description     String?

  // File Information
  fileUrl         String
  fileType        String
  fileSize        Int

  // Organization
  category        DocumentCategory
  tags            String[]
  folderId        String?
  folder          DocumentFolder? @relation(fields: [folderId], references: [id])

  // Versioning
  version         String   @default("1.0")
  parentId        String?
  parent          Document? @relation("DocumentVersions", fields: [parentId], references: [id])
  versions        Document[] @relation("DocumentVersions")

  // Ownership
  uploadedById    String
  uploadedBy      User     @relation("DocumentUploader", fields: [uploadedById], references: [id])

  // Access Control
  isPublic        Boolean  @default(false)
  accessList      String[] // User IDs with access

  // Status
  isArchived      Boolean  @default(false)
  expiresAt       DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([category])
  @@index([folderId])
  @@index([uploadedById])
}

enum DocumentCategory {
  POLICY
  TRAINING
  FORM
  TEMPLATE
  MEETING_MINUTES
  REPORT
  CONTRACT
  COMPLIANCE
  OTHER
}

model DocumentFolder {
  id              String   @id @default(uuid())
  name            String
  description     String?
  parentId        String?
  parent          DocumentFolder? @relation("SubFolders", fields: [parentId], references: [id])
  subfolders      DocumentFolder[] @relation("SubFolders")
  documents       Document[]

  // Access Control
  isPublic        Boolean  @default(false)
  accessList      String[] // User IDs with access

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([parentId])
}
```

**Backend Services:**
- `messaging.service.ts` (400+ lines)
- `document.service.ts` (350+ lines)
- `channel.service.ts` (250+ lines)

**Frontend Components:**
- `MessagingHub.tsx` - Main messaging interface
- `MessageList.tsx`
- `MessageComposer.tsx`
- `ChannelManager.tsx`
- `ChannelList.tsx`
- `DocumentLibrary.tsx`
- `DocumentUpload.tsx`
- `DocumentViewer.tsx`
- `FolderBrowser.tsx`

**Test Script:** `test-communication.js`
- Create channels
- Send test messages
- Test broadcast messages
- Upload test documents
- Test folder structure
- Test access controls

---

#### **Agent 7: Vendor & Financial Administration** [MEDIUM PRIORITY - P2]
**Priority**: MEDIUM
**Estimated Effort**: 1-2 sprints
**Complexity**: MEDIUM

**Database Schema:**
```prisma
model Vendor {
  id                String   @id @default(uuid())
  companyName       String
  contactPerson     String

  // Contact Information
  phone             String
  email             String
  address           Json
  website           String?

  // Services
  servicesProvided  String[]
  category          VendorCategory

  // Contract
  contractStart     DateTime?
  contractEnd       DateTime?
  contractValue     Decimal?
  paymentTerms      String?

  // Insurance
  insuranceExpiration DateTime?
  insuranceCertUrl  String?

  // Performance
  performanceScore  Int?     // 1-100
  notes             String?  @db.Text

  // Status
  isActive          Boolean  @default(true)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([category])
  @@index([isActive])
}

enum VendorCategory {
  CLINICAL_SUPPLIES
  OFFICE_SUPPLIES
  IT_SERVICES
  FACILITIES
  LEGAL
  ACCOUNTING
  HR_SERVICES
  TRAINING
  INSURANCE
  OTHER
}

model Budget {
  id              String   @id @default(uuid())
  name            String
  fiscalYear      Int

  // Budget Details
  department      String?
  category        BudgetCategory

  // Amounts
  allocatedAmount Decimal
  spentAmount     Decimal  @default(0)
  committedAmount Decimal  @default(0)
  remainingAmount Decimal  @default(0)

  // Period
  startDate       DateTime
  endDate         DateTime

  // Ownership
  ownerId         String
  owner           User     @relation(fields: [ownerId], references: [id])

  // Notes
  notes           String?  @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([fiscalYear])
  @@index([category])
  @@index([department])
}

enum BudgetCategory {
  SALARIES
  BENEFITS
  CLINICAL_SUPPLIES
  OFFICE_SUPPLIES
  EQUIPMENT
  FACILITIES
  IT
  TRAINING
  MARKETING
  PROFESSIONAL_SERVICES
  INSURANCE
  OTHER
}

model Expense {
  id              String   @id @default(uuid())
  description     String
  category        BudgetCategory

  // Amount
  amount          Decimal
  taxAmount       Decimal?
  totalAmount     Decimal

  // Date
  expenseDate     DateTime

  // Vendor
  vendorId        String?
  vendor          Vendor?  @relation(fields: [vendorId], references: [id])
  vendorName      String?

  // Budget
  budgetId        String?
  budget          Budget?  @relation(fields: [budgetId], references: [id])
  department      String?

  // Submission
  submittedById   String
  submittedBy     User     @relation("ExpenseSubmitter", fields: [submittedById], references: [id])

  // Approval
  status          ExpenseStatus @default(PENDING)
  approvedById    String?
  approvedBy      User?    @relation("ExpenseApprover", fields: [approvedById], references: [id])
  approvalDate    DateTime?
  approvalNotes   String?

  // Payment
  paymentMethod   String?
  receiptUrl      String?
  reimbursed      Boolean  @default(false)
  reimbursementDate DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([category])
  @@index([status])
  @@index([expenseDate])
}

enum ExpenseStatus {
  PENDING
  APPROVED
  DENIED
  PAID
}

model PurchaseOrder {
  id              String   @id @default(uuid())
  poNumber        String   @unique

  // Vendor
  vendorId        String
  vendor          Vendor   @relation(fields: [vendorId], references: [id])

  // Items
  items           Json     // Array of line items
  subtotal        Decimal
  tax             Decimal?
  shipping        Decimal?
  total           Decimal

  // Dates
  orderDate       DateTime @default(now())
  expectedDate    DateTime?
  receivedDate    DateTime?

  // Budget
  budgetId        String?
  budget          Budget?  @relation(fields: [budgetId], references: [id])
  department      String?

  // Approval
  status          POStatus @default(PENDING)
  approvedById    String?
  approvedBy      User?    @relation("POApprover", fields: [approvedById], references: [id])
  approvalDate    DateTime?

  // Requester
  requestedById   String
  requestedBy     User     @relation("PORequestor", fields: [requestedById], references: [id])

  // Notes
  notes           String?  @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status])
  @@index([orderDate])
}

enum POStatus {
  PENDING
  APPROVED
  ORDERED
  RECEIVED
  CANCELLED
}
```

**Backend Services:**
- `vendor.service.ts` (300+ lines)
- `budget.service.ts` (350+ lines)
- `expense.service.ts` (300+ lines)

**Frontend Components:**
- `VendorList.tsx`
- `VendorForm.tsx`
- `VendorDetail.tsx`
- `BudgetDashboard.tsx`
- `BudgetForm.tsx`
- `BudgetTracker.tsx`
- `ExpenseForm.tsx`
- `ExpenseList.tsx`
- `ExpenseApproval.tsx`
- `PurchaseOrderForm.tsx`
- `PurchaseOrderList.tsx`

**Test Script:** `test-vendor-financial.js`
- Create vendors
- Create budgets
- Create expenses
- Test approval workflow
- Create purchase orders
- Test budget tracking

---

#### **Agent 8: Reports & Integration** [MEDIUM PRIORITY - P2]
**Priority**: MEDIUM
**Estimated Effort**: 1 sprint
**Complexity**: MEDIUM

**Backend Services:**
- Enhanced `reports.service.ts` with Module 9 reports:
  - Credential expiration report
  - Training compliance report
  - Policy acknowledgment report
  - Incident trend analysis
  - Performance review summary
  - Time & attendance report
  - Budget variance report
  - Vendor performance report

**Frontend Components:**
- `PracticeManagementReports.tsx` - Report dashboard
- `CredentialExpirationReport.tsx`
- `TrainingComplianceReport.tsx`
- `PolicyComplianceReport.tsx`
- `IncidentTrendReport.tsx`
- `HRMetricsDashboard.tsx`
- `BudgetVarianceReport.tsx`

**Test Script:** `test-reports.js`
- Generate all Module 9 reports
- Test filtering and date ranges
- Test export functionality
- Verify data accuracy

---

## Implementation Sequence

### Phase 1: Database & Backend (Weeks 1-2)
**All 8 Agents Work in Parallel**

1. Create database schema files
2. Run Prisma migrations
3. Implement backend services
4. Implement controllers
5. Add routes
6. Write comprehensive test scripts

**Deliverables:**
- 9 new database tables
- 8 service files
- 8 controller files
- 8 route files
- 8 test scripts

### Phase 2: Frontend Components (Weeks 3-4)
**All 8 Agents Work in Parallel**

1. Create component files
2. Implement UI layouts
3. Connect to backend APIs
4. Add form validation
5. Implement state management
6. Add error handling

**Deliverables:**
- 60+ React components
- Type definitions
- API integration
- Form validation

### Phase 3: Integration & Testing (Week 5)
**Coordinated Testing**

1. Run all test scripts
2. Integration testing
3. End-to-end testing
4. Performance testing
5. Security testing
6. Bug fixes

### Phase 4: Documentation & Cleanup (Week 6)
1. Update verification report
2. Create user guides
3. Create admin guides
4. Code cleanup
5. Final review

---

## Test Scripts Structure

### Common Test Pattern
```javascript
// test-[module].js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing [Module Name]...\n');

  try {
    // 1. Setup: Get test users
    const admin = await prisma.user.findFirst({
      where: { roles: { has: 'ADMIN' } }
    });

    // 2. Create test data
    console.log('📝 Creating test data...');

    // 3. Test CRUD operations
    console.log('✅ Testing CRUD operations...');

    // 4. Test workflows
    console.log('🔄 Testing workflows...');

    // 5. Test edge cases
    console.log('⚠️ Testing edge cases...');

    // 6. Verify data integrity
    console.log('🔍 Verifying data integrity...');

    // 7. Summary
    console.log('\n✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   - [Records] created: X`);
    console.log(`   - Tests passed: Y/Y`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

---

## Routing Structure

### Backend Routes
```
/api/credentials/*
/api/training/*
/api/policies/*
/api/incidents/*
/api/performance/*
/api/attendance/*
/api/pto/*
/api/onboarding/*
/api/messages/*
/api/channels/*
/api/documents/*
/api/vendors/*
/api/budgets/*
/api/expenses/*
/api/purchase-orders/*
/api/practice-reports/*
```

### Frontend Routes
```
/staff/directory
/staff/org-chart
/staff/onboarding
/credentials/dashboard
/credentials/licenses
/training/dashboard
/training/courses
/training/compliance
/policies/library
/policies/acknowledgments
/incidents/report
/incidents/list
/incidents/dashboard
/performance/reviews
/performance/dashboard
/hr/pto
/hr/time-clock
/hr/attendance
/messages
/channels
/documents
/vendors
/budgets
/expenses
```

---

## Critical Success Factors

### For Each Agent:

1. **Complete Database Schema**
   - All fields from PRD
   - Proper indexes
   - Correct relationships
   - Enums defined

2. **Comprehensive Backend Services**
   - Full CRUD operations
   - Business logic
   - Validation
   - Error handling
   - Security checks

3. **Robust Frontend Components**
   - User-friendly UI
   - Form validation
   - Error messages
   - Loading states
   - Responsive design

4. **Thorough Test Scripts**
   - Test all CRUD operations
   - Test workflows
   - Test edge cases
   - Create realistic test data
   - Verify data integrity

5. **Complete Documentation**
   - API documentation
   - Component documentation
   - User guides
   - Admin guides

---

## Agent Coordination

### Communication Protocol:
- Each agent works independently
- Agents must NOT modify each other's files
- Shared types go in `/packages/backend/src/types/practice-management.types.ts`
- All agents use consistent naming conventions
- All agents follow existing code patterns

### Naming Conventions:
- Services: `[module].service.ts`
- Controllers: `[module].controller.ts`
- Routes: `[module].routes.ts`
- Components: `[Module][Component].tsx`
- Test scripts: `test-[module].js`

### Code Standards:
- TypeScript strict mode
- Proper error handling
- Comprehensive logging
- Security best practices
- Performance optimization

---

## Success Metrics

### Completion Criteria:
- ✅ All database tables created and migrated
- ✅ All backend services implemented
- ✅ All controllers implemented
- ✅ All routes added
- ✅ All frontend components created
- ✅ All test scripts passing
- ✅ No TypeScript errors
- ✅ No ESLint warnings
- ✅ All APIs documented
- ✅ Verification report updated to 100%

### Quality Metrics:
- Code coverage > 80%
- Response time < 2 seconds
- Zero security vulnerabilities
- Zero accessibility issues
- Mobile responsive

---

## Risk Mitigation

### Technical Risks:
1. **Database migration conflicts**
   - Solution: Coordinate schema changes, sequential migrations

2. **API endpoint conflicts**
   - Solution: Clear route namespacing

3. **Type definition conflicts**
   - Solution: Centralized type files

4. **Performance issues**
   - Solution: Proper indexing, pagination, caching

### Schedule Risks:
1. **Scope creep**
   - Solution: Stick to PRD requirements only

2. **Agent delays**
   - Solution: Parallel execution, no dependencies

3. **Integration issues**
   - Solution: Early integration testing

---

## Final Deliverables

### Code Deliverables:
1. 9 new database tables (Prisma schema)
2. 8 backend service files
3. 8 controller files
4. 8 route files
5. 60+ React components
6. 8 comprehensive test scripts
7. Type definitions
8. API documentation

### Documentation Deliverables:
1. Updated MODULE_9_VERIFICATION_REPORT.md (5% → 100%)
2. User guides for each subsystem
3. Admin configuration guides
4. API documentation
5. Test result reports

### Testing Deliverables:
1. All unit tests passing
2. All integration tests passing
3. All test scripts successful
4. Performance test results
5. Security audit report

---

## Timeline Estimate

**Total Duration**: 6 weeks

- **Week 1-2**: Database schemas + Backend services
- **Week 3-4**: Frontend components
- **Week 5**: Integration & testing
- **Week 6**: Documentation & cleanup

**Effort Distribution**:
- Agent 1 (Credentialing): 20% of total effort
- Agent 2 (Training): 15% of total effort
- Agent 3 (Compliance): 20% of total effort
- Agent 4 (HR): 15% of total effort
- Agent 5 (Staff): 10% of total effort
- Agent 6 (Communication): 10% of total effort
- Agent 7 (Vendor/Financial): 5% of total effort
- Agent 8 (Reports): 5% of total effort

**Total Estimated Lines of Code**: ~15,000-20,000 lines

---

**Document Version**: 1.0
**Created**: 2025-11-11
**Status**: Ready for Implementation
**Next Step**: Launch 8 specialized agents in parallel
