# MentalSpace EHR V2 - Strategic Implementation Plan

**Version:** 1.0
**Date:** October 16, 2025
**Planning Horizon:** 14 weeks (3.5 months)
**Status:** Active Development

---

## 🎯 Executive Summary

This strategic plan outlines the phased implementation of remaining MentalSpace EHR features over 14 weeks. The plan prioritizes high-impact features that unlock revenue and improve user experience, while building toward full feature parity with the Product Requirements Document.

### Key Success Metrics
- **Week 4:** Client portal fully operational (100% backend complete)
- **Week 8:** Billing automation live (AdvancedMD integration complete)
- **Week 11:** Telehealth video calls operational
- **Week 14:** Full analytics and reporting suite deployed

### Resource Allocation
- **Development:** 280-320 hours total
- **Testing:** 40-60 hours
- **Documentation:** 20-30 hours
- **Total:** 340-410 hours (~14 weeks at 25-30 hours/week)

---

## 📋 Table of Contents

1. [Phase 1: Client Portal Foundation](#phase-1-client-portal-foundation-weeks-1-2)
2. [Phase 2: Client Portal Enhancement](#phase-2-client-portal-enhancement-weeks-3-4)
3. [Phase 3: Billing Automation](#phase-3-billing-automation-weeks-5-8)
4. [Phase 4: Telehealth Video](#phase-4-telehealth-video-weeks-9-11)
5. [Phase 5: Analytics & Reporting](#phase-5-analytics--reporting-weeks-12-14)
6. [Ongoing: Security & Infrastructure](#ongoing-security--infrastructure)
7. [Risk Mitigation](#risk-mitigation-strategies)
8. [Success Criteria](#success-criteria)

---

## Phase 1: Client Portal Foundation (Weeks 1-2)

**Objective:** Unblock client portal by completing critical backend APIs and database setup
**Priority:** CRITICAL - Blocking user adoption
**Effort:** 35-45 hours

### Week 1: Database & Core APIs

#### Day 1-2: Database Foundation
**Tasks:**
- ✅ Create intake forms seed script (DONE)
- ⏳ Populate 25 intake forms in database
- ⏳ Verify forms appear in EHR dropdown
- ⏳ Create sample form field definitions (JSON structure)
- ⏳ Test form assignment workflow

**Deliverables:**
- [ ] Intake forms visible in Portal tab dropdown
- [ ] At least 5 forms assigned to test client
- [ ] Form library API returning data

**Acceptance Criteria:**
- EHR users can select forms from dropdown
- Forms show name, description, type
- Assignment creates database record

---

#### Day 3-4: Messages Backend
**Tasks:**
- ⏳ Implement `GET /api/v1/portal/messages` - Get message threads
- ⏳ Implement `POST /api/v1/portal/messages` - Send new message
- ⏳ Implement `GET /api/v1/portal/messages/thread/:threadId` - Get conversation
- ⏳ Implement `POST /api/v1/portal/messages/:messageId/reply` - Reply to message
- ⏳ Implement `PUT /api/v1/portal/messages/:messageId/read` - Mark as read
- ⏳ Implement `GET /api/v1/portal/messages/unread-count` - Badge count
- ⏳ Add message validation (max length, required fields)
- ⏳ Add email notification service integration (SendGrid/AWS SES)

**Database Model:**
```prisma
model PortalMessage {
  id              String    @id @default(uuid())
  threadId        String    // Group messages into conversations
  clientId        String
  senderId        String    // Could be client or clinician
  senderType      String    // 'CLIENT' or 'CLINICIAN'
  recipientId     String
  recipientType   String    // 'CLIENT' or 'CLINICIAN'
  subject         String?   // For new threads
  messageBody     String
  isRead          Boolean   @default(false)
  readAt          DateTime?
  sentAt          DateTime  @default(now())
  attachments     Json?     // Array of file URLs
  createdAt       DateTime  @default(now())
}
```

**Deliverables:**
- [ ] 6 message endpoints functional
- [ ] Messages display in portal UI
- [ ] Unread badge updates in real-time
- [ ] Email notifications sent on new messages

**Acceptance Criteria:**
- Clients can send messages to their clinician
- Clinicians receive email notification
- Message threads maintain conversation history
- Read/unread status tracked accurately

**Estimated Time:** 12-16 hours

---

#### Day 5: Mood Tracking Backend
**Tasks:**
- ⏳ Implement `POST /api/v1/portal/mood-entries` - Create mood entry
- ⏳ Implement `GET /api/v1/portal/mood-entries` - Get entries with date filtering
- ⏳ Add mood trend calculation (7-day, 30-day averages)
- ⏳ Add activity correlation analysis
- ⏳ Integrate with dashboard widgets

**Database Enhancement:**
```prisma
model MoodEntry {
  id              String    @id @default(uuid())
  clientId        String
  entryDate       DateTime  @default(now())
  moodScore       Int       // 1-10 scale
  energyLevel     Int?      // 1-10 scale
  sleepQuality    Int?      // 1-10 scale
  stressLevel     Int?      // 1-10 scale
  activities      String[]  // Tags: exercise, meditation, therapy, etc.
  notes           String?
  createdAt       DateTime  @default(now())

  client          Client    @relation(fields: [clientId], references: [id])

  @@index([clientId, entryDate])
}
```

**Deliverables:**
- [ ] Mood entry creation working
- [ ] Dashboard shows mood chart
- [ ] Trend analysis functional
- [ ] Activity correlation displayed

**Acceptance Criteria:**
- Clients can log daily mood
- Charts display 7-day and 30-day trends
- Activities tagged and correlated

**Estimated Time:** 6-8 hours

---

### Week 2: Assessments & Authentication

#### Day 1-3: Clinical Assessments Backend
**Tasks:**
- ⏳ Enhance `POST /api/v1/clients/:clientId/assessments/assign`
- ⏳ Implement scoring algorithms for 8 assessment types:
  - PHQ-9 (Depression): 0-27 scale with severity interpretation
  - GAD-7 (Anxiety): 0-21 scale with severity interpretation
  - PCL-5 (PTSD): 0-80 scale with cutoff at 33
  - BAI (Beck Anxiety): 0-63 scale
  - BDI-II (Beck Depression): 0-63 scale
  - PSS (Perceived Stress): 0-40 scale
  - AUDIT (Alcohol): 0-40 scale with risk levels
  - DAST-10 (Drug): 0-10 scale with severity
- ⏳ Implement `POST /api/v1/portal/assessments/:assignmentId/submit` - Submit responses
- ⏳ Implement `GET /api/v1/portal/assessments/:assignmentId/results` - View results
- ⏳ Add automatic score calculation on submission
- ⏳ Add clinical interpretation generation
- ⏳ Create PDF export functionality (basic)

**Scoring Logic Example (PHQ-9):**
```typescript
function scorePHQ9(responses: number[]): AssessmentResult {
  const totalScore = responses.reduce((sum, val) => sum + val, 0);

  let severity: string;
  let interpretation: string;
  let recommendations: string[];

  if (totalScore <= 4) {
    severity = 'Minimal';
    interpretation = 'Minimal or no depression';
    recommendations = ['Continue routine wellness activities'];
  } else if (totalScore <= 9) {
    severity = 'Mild';
    interpretation = 'Mild depression symptoms';
    recommendations = ['Consider counseling', 'Monitor symptoms'];
  } else if (totalScore <= 14) {
    severity = 'Moderate';
    interpretation = 'Moderate depression';
    recommendations = ['Therapy recommended', 'Consider medication evaluation'];
  } else if (totalScore <= 19) {
    severity = 'Moderately Severe';
    interpretation = 'Moderately severe depression';
    recommendations = ['Active treatment needed', 'Medication evaluation', 'Frequent therapy sessions'];
  } else {
    severity = 'Severe';
    interpretation = 'Severe depression';
    recommendations = ['Immediate treatment required', 'Medication evaluation', 'Intensive therapy', 'Safety assessment'];
  }

  return { totalScore, severity, interpretation, recommendations };
}
```

**Deliverables:**
- [ ] 8 assessment types fully scored
- [ ] Results display with interpretation
- [ ] Color-coded severity indicators
- [ ] PDF export of results

**Acceptance Criteria:**
- Clients can complete assigned assessments
- Scores calculate automatically
- Clinical interpretation accurate
- Clinicians can view results in EHR

**Estimated Time:** 16-20 hours

---

#### Day 4-5: Registration & Password Reset
**Tasks:**
- ⏳ Implement `POST /api/v1/portal-auth/register` - Account creation
- ⏳ Implement `POST /api/v1/portal-auth/verify-email` - Email verification
- ⏳ Implement `POST /api/v1/portal-auth/forgot-password` - Request reset
- ⏳ Implement `POST /api/v1/portal-auth/reset-password` - Reset with token
- ⏳ Add email verification token generation
- ⏳ Add password reset token generation (expires in 1 hour)
- ⏳ Integrate with email service (SendGrid/AWS SES)
- ⏳ Add rate limiting (max 5 attempts per hour)

**Database Migration:**
```prisma
model PortalAccount {
  // ... existing fields
  emailVerified       Boolean   @default(false)
  emailVerifyToken    String?   @unique
  emailVerifyExpires  DateTime?
  resetPasswordToken  String?   @unique
  resetPasswordExpires DateTime?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
}
```

**Email Templates:**
- Welcome email with verification link
- Password reset email with token
- Account locked notification

**Deliverables:**
- [ ] New clients can self-register
- [ ] Email verification workflow complete
- [ ] Password reset functional
- [ ] Account lockout after 5 failed attempts

**Acceptance Criteria:**
- Registration creates PortalAccount
- Verification email sent immediately
- Reset tokens expire after 1 hour
- Rate limiting prevents abuse

**Estimated Time:** 8-10 hours

---

### Phase 1 Deliverables Summary

**By End of Week 2:**
- ✅ 25 intake forms in database
- ✅ Messages fully operational (6 endpoints)
- ✅ Mood tracking complete
- ✅ Clinical assessments with scoring (8 types)
- ✅ Registration & password reset working
- ✅ Email notifications configured

**Metrics:**
- Client portal backend: 85% → 100% complete
- Portal user adoption: 0% → 60% (limited by features)
- Support tickets: Reduced by 40% (self-service)

---

## Phase 2: Client Portal Enhancement (Weeks 3-4)

**Objective:** Add engagement features and polish portal experience
**Priority:** HIGH - Increases user engagement and retention
**Effort:** 40-50 hours

### Week 3: Engagement Features

#### Homework Assignments (Day 1-2)
**Tasks:**
- ⏳ Create `HomeworkAssignment` database model
- ⏳ Implement clinician assignment interface
- ⏳ Implement client homework view
- ⏳ Add completion tracking
- ⏳ Add file upload for homework submissions
- ⏳ Add notification on new assignment

**Database Model:**
```prisma
model HomeworkAssignment {
  id              String    @id @default(uuid())
  clientId        String
  clinicianId     String
  title           String
  description     String
  instructions    String?
  assignedDate    DateTime  @default(now())
  dueDate         DateTime?
  completedDate   DateTime?
  status          String    // PENDING, COMPLETED, OVERDUE
  submissionText  String?
  attachmentUrls  Json?     // Array of S3 URLs
  clinicianNotes  String?

  client          Client    @relation(fields: [clientId], references: [id])
  clinician       User      @relation(fields: [clinicianId], references: [id])

  @@index([clientId, status])
}
```

**Deliverables:**
- [ ] Clinicians can assign homework
- [ ] Clients see assignments in portal
- [ ] File upload for submissions
- [ ] Completion tracking

**Estimated Time:** 10-12 hours

---

#### Goal Tracking (Day 3-4)
**Tasks:**
- ⏳ Create `TherapyGoal` database model
- ⏳ Implement goal creation (collaborative: client + clinician)
- ⏳ Add progress tracking (0-100%)
- ⏳ Add milestone tracking
- ⏳ Create goal dashboard widget
- ⏳ Add goal completion celebration

**Database Model:**
```prisma
model TherapyGoal {
  id              String    @id @default(uuid())
  clientId        String
  clinicianId     String
  goalTitle       String
  goalDescription String
  targetDate      DateTime?
  status          String    // ACTIVE, COMPLETED, ARCHIVED
  progress        Int       @default(0) // 0-100
  milestones      Json      // Array of milestone objects
  createdAt       DateTime  @default(now())
  completedAt     DateTime?

  client          Client    @relation(fields: [clientId], references: [id])
  clinician       User      @relation(fields: [clinicianId], references: [id])

  @@index([clientId, status])
}
```

**Deliverables:**
- [ ] Goal creation interface
- [ ] Progress tracking
- [ ] Visual progress indicators
- [ ] Milestone tracking

**Estimated Time:** 10-12 hours

---

#### Journaling (Day 5)
**Tasks:**
- ⏳ Create `JournalEntry` database model
- ⏳ Implement private journal entry creation
- ⏳ Add optional sharing with clinician
- ⏳ Add mood tagging
- ⏳ Add journal prompts
- ⏳ Search and filter journal entries

**Database Model:**
```prisma
model JournalEntry {
  id              String    @id @default(uuid())
  clientId        String
  entryDate       DateTime  @default(now())
  entryText       String
  moodScore       Int?      // 1-10
  isPrivate       Boolean   @default(true)
  sharedWith      String[]  // Array of clinician IDs
  tags            String[]  // emotion, gratitude, challenge, etc.
  promptUsed      String?

  client          Client    @relation(fields: [clientId], references: [id])

  @@index([clientId, entryDate])
}
```

**Deliverables:**
- [ ] Journal entry creation
- [ ] Private/shared toggle
- [ ] Mood tagging
- [ ] Search functionality

**Estimated Time:** 6-8 hours

---

### Week 4: Wellness & Resources

#### Wellness Library (Day 1-2)
**Tasks:**
- ⏳ Create content management system for articles
- ⏳ Curate mental health resources (20-30 articles)
- ⏳ Add video/audio exercises library
- ⏳ Implement search and filtering
- ⏳ Add favorites/bookmarks
- ⏳ Track resource usage analytics

**Database Model:**
```prisma
model WellnessResource {
  id              String    @id @default(uuid())
  title           String
  description     String
  resourceType    String    // ARTICLE, VIDEO, AUDIO, EXERCISE
  content         String?   // Markdown content
  url             String?   // External URL
  thumbnailUrl    String?
  duration        Int?      // Minutes for videos/audio
  tags            String[]  // anxiety, depression, mindfulness, etc.
  difficulty      String?   // BEGINNER, INTERMEDIATE, ADVANCED
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())

  @@index([resourceType, isActive])
}

model ResourceBookmark {
  id              String    @id @default(uuid())
  clientId        String
  resourceId      String
  bookmarkedAt    DateTime  @default(now())

  client          Client    @relation(fields: [clientId], references: [id])
  resource        WellnessResource @relation(fields: [resourceId], references: [id])

  @@unique([clientId, resourceId])
}
```

**Deliverables:**
- [ ] 30+ curated resources
- [ ] Search and filtering
- [ ] Bookmarking system
- [ ] Usage analytics

**Estimated Time:** 12-14 hours

---

#### Crisis Resources & Safety Plan (Day 3-4)
**Tasks:**
- ⏳ Create crisis hotline directory (24/7 resources)
- ⏳ Implement safety plan builder
- ⏳ Add emergency contact quick access
- ⏳ Add crisis assessment questionnaire
- ⏳ Implement automatic clinician notification on high-risk responses

**Database Model:**
```prisma
model SafetyPlan {
  id                    String    @id @default(uuid())
  clientId              String    @unique
  warningSignsJson      Json      // Array of warning signs
  copingStrategiesJson  Json      // Internal coping strategies
  distractionsJson      Json      // Social settings/distractions
  supportContactsJson   Json      // People to reach out to
  professionalContactsJson Json   // Clinician, crisis line
  environmentSafetyJson Json      // Remove lethal means
  lastUpdated           DateTime  @updatedAt

  client                Client    @relation(fields: [clientId], references: [id])
}

model CrisisResource {
  id              String    @id @default(uuid())
  name            String
  description     String
  phoneNumber     String
  textNumber      String?
  websiteUrl      String?
  availability    String    // 24/7, Business Hours, etc.
  resourceType    String    // HOTLINE, CHAT, TEXT, EMERGENCY
  isActive        Boolean   @default(true)
}
```

**Deliverables:**
- [ ] Safety plan builder
- [ ] Crisis resources directory
- [ ] Quick access emergency button
- [ ] High-risk alerts to clinicians

**Estimated Time:** 10-12 hours

---

#### Medication Tracking (Day 5)
**Tasks:**
- ⏳ Create medication tracking interface
- ⏳ Add medication reminders
- ⏳ Track adherence (taken/missed)
- ⏳ Add side effects logging
- ⏳ Generate adherence reports for clinician

**Database Model:**
```prisma
model MedicationTracking {
  id              String    @id @default(uuid())
  clientId        String
  medicationName  String
  dosage          String
  frequency       String    // DAILY, TWICE_DAILY, AS_NEEDED, etc.
  prescribedBy    String?
  startDate       DateTime
  endDate         DateTime?
  isActive        Boolean   @default(true)
  reminderTimes   Json      // Array of time strings

  client          Client    @relation(fields: [clientId], references: [id])
  logs            MedicationLog[]

  @@index([clientId, isActive])
}

model MedicationLog {
  id              String    @id @default(uuid())
  medicationId    String
  scheduledTime   DateTime
  takenTime       DateTime?
  wasTaken        Boolean
  missedReason    String?
  sideEffects     String[]
  notes           String?

  medication      MedicationTracking @relation(fields: [medicationId], references: [id])

  @@index([medicationId, scheduledTime])
}
```

**Deliverables:**
- [ ] Medication tracking
- [ ] Adherence logging
- [ ] Reminder notifications
- [ ] Clinician reports

**Estimated Time:** 8-10 hours

---

### Phase 2 Deliverables Summary

**By End of Week 4:**
- ✅ Homework assignments operational
- ✅ Goal tracking with progress
- ✅ Journaling with mood tagging
- ✅ Wellness library (30+ resources)
- ✅ Crisis resources & safety plan builder
- ✅ Medication tracking

**Metrics:**
- Client engagement: +80% (daily active users)
- Portal feature usage: +150%
- Client satisfaction: +40%
- Clinical outcomes: Measurable improvement in goal achievement

---

## Phase 3: Billing Automation (Weeks 5-8)

**Objective:** Complete AdvancedMD integration for billing automation
**Priority:** CRITICAL - Revenue impact
**Effort:** 80-100 hours

### Week 5-6: AdvancedMD Core Integration

#### Week 5: Authentication & Patient Sync
**Tasks:**
- ⏳ Set up AdvancedMD API credentials in AWS Secrets Manager
- ⏳ Implement OAuth2 token management
- ⏳ Create token auto-refresh system (23-hour cycle)
- ⏳ Implement rate limiting queue system
- ⏳ Create `GETUPDATEDPATIENTS` sync job
- ⏳ Implement bi-directional patient sync
- ⏳ Add conflict resolution (last-write-wins strategy)
- ⏳ Create sync monitoring dashboard

**Technical Architecture:**
```typescript
// Token Management
class AdvancedMDTokenManager {
  private token: string;
  private expiresAt: Date;

  async refreshToken(): Promise<void> {
    // Refresh every 23 hours (tokens expire at 24h)
  }

  async getValidToken(): Promise<string> {
    if (this.isExpiringSoon()) {
      await this.refreshToken();
    }
    return this.token;
  }
}

// Rate Limiting
class RateLimitQueue {
  private queue: QueueItem[] = [];
  private tier1Limit = { peak: 1, offPeak: 60 }; // per minute
  private tier2Limit = { peak: 12, offPeak: 120 };

  async enqueue(request: APIRequest, tier: number): Promise<void> {
    // Exponential backoff on rate limit
  }

  private isPeakHours(): boolean {
    // 6 AM - 6 PM Mountain Time, Monday-Friday
  }
}
```

**Deliverables:**
- [ ] Token management operational
- [ ] Patient sync running hourly
- [ ] Sync success rate >95%
- [ ] Rate limiting preventing API throttling

**Estimated Time:** 20-25 hours

---

#### Week 6: Appointment & Eligibility
**Tasks:**
- ⏳ Implement `GETUPDATEDVISITS` sync job
- ⏳ Bi-directional appointment sync (every 15 min)
- ⏳ Implement `VERIFYELIGIBILITY` with 24h caching
- ⏳ Add real-time eligibility checks on appointment booking
- ⏳ Create eligibility status dashboard
- ⏳ Add insurance card scanning (OCR with AWS Textract)

**Eligibility Caching Strategy:**
```typescript
interface EligibilityCacheEntry {
  clientId: string;
  payerId: string;
  serviceDate: Date;
  responseData: any;
  isEligible: boolean;
  cachedAt: Date;
  expiresAt: Date; // 24 hours from cachedAt
}

async function checkEligibility(clientId: string, serviceDate: Date): Promise<EligibilityResponse> {
  // Check cache first
  const cached = await findCachedEligibility(clientId, serviceDate);
  if (cached && cached.expiresAt > new Date()) {
    return cached.responseData;
  }

  // Call AdvancedMD API
  const response = await advancedMD.verifyEligibility(clientId, serviceDate);

  // Cache for 24 hours
  await cacheEligibility(response);

  return response;
}
```

**Deliverables:**
- [ ] Appointment sync operational
- [ ] Real-time eligibility checks
- [ ] 24-hour caching reducing API calls by 80%
- [ ] Insurance card OCR functional

**Estimated Time:** 20-25 hours

---

### Week 7: Claims & Charges

#### Charge Submission (Day 1-3)
**Tasks:**
- ⏳ Implement `SAVECHARGES` API integration
- ⏳ Add charge validation before submission
- ⏳ Create charge batching (submit every 2 hours)
- ⏳ Add claim scrubbing (validate codes, modifiers, diagnoses)
- ⏳ Implement error handling and retry logic

**Charge Validation Rules:**
```typescript
interface ChargeValidation {
  cptCode: string;        // Must be valid CPT
  modifier?: string;      // Valid modifier for CPT
  diagnosis: string[];    // At least 1 ICD-10, max 12
  units: number;          // Must be positive integer
  serviceDate: Date;      // Cannot be future date
  clientId: string;       // Must have active insurance
  clinicianId: string;    // Must have valid NPI
}

async function validateCharge(charge: ChargeValidation): Promise<ValidationResult> {
  // Check CPT code validity
  // Check modifier compatibility
  // Verify diagnosis codes
  // Validate client insurance
  // Confirm clinician credentials

  return { isValid: boolean, errors: string[] };
}
```

**Deliverables:**
- [ ] Charges submit to AdvancedMD automatically
- [ ] Validation prevents rejections
- [ ] Error handling with retry
- [ ] Submission success rate >98%

**Estimated Time:** 12-15 hours

---

#### Claim Submission via Waystar (Day 4-5)
**Tasks:**
- ⏳ Set up Waystar clearinghouse integration
- ⏳ Implement claim submission workflow
- ⏳ Add claim status tracking
- ⏳ Create denial management queue
- ⏳ Implement automatic claim resubmission on fixable errors

**Claim Lifecycle:**
1. Charge created in EHR
2. Charge validated and submitted to AdvancedMD
3. Claim generated in AdvancedMD
4. Claim submitted to Waystar clearinghouse
5. Waystar sends to insurance payer
6. Status updates: SUBMITTED → ACCEPTED → PAID / DENIED
7. ERA (835) received with payment details

**Deliverables:**
- [ ] Claims submit to Waystar
- [ ] Status tracking operational
- [ ] Denial queue for manual review
- [ ] Auto-resubmission on errors

**Estimated Time:** 12-15 hours

---

### Week 8: ERA Processing & Payment Automation

#### 835 EDI Parser (Day 1-3)
**Tasks:**
- ⏳ Build 835 EDI file parser
- ⏳ Extract payment details (amount, adjustments, denials)
- ⏳ Parse CARC/RARC codes (adjustment reason codes)
- ⏳ Implement 5-level auto-matching strategy
- ⏳ Create manual review queue for unmatched claims

**5-Level Matching Strategy:**
```typescript
interface ERAMatchingStrategy {
  level1_ClaimControlNumber(): boolean;    // Exact match on claim #
  level2_ClientServiceDateAmount(): boolean; // Client + date + amount
  level3_ClientCPTAmount(): boolean;       // Client + CPT + amount
  level4_FuzzyMatch(): number;             // Confidence score 0-100
  level5_ManualReview(): void;             // Queue for human review
}

async function matchERAToCharges(eraLine: ERALineItem): Promise<MatchResult> {
  // Try each level sequentially
  if (await strategy.level1_ClaimControlNumber()) {
    return { matched: true, confidence: 100, method: 'EXACT' };
  }

  if (await strategy.level2_ClientServiceDateAmount()) {
    return { matched: true, confidence: 95, method: 'CLIENT_DATE_AMOUNT' };
  }

  // ... continue through levels

  // If no match, queue for manual review
  await queueForManualReview(eraLine);
  return { matched: false, confidence: 0, method: 'MANUAL_QUEUE' };
}
```

**Deliverables:**
- [ ] 835 EDI parser operational
- [ ] Auto-matching rate >85%
- [ ] Manual review queue functional
- [ ] CARC/RARC code tracking

**Estimated Time:** 16-20 hours

---

#### Automatic Payment Posting (Day 4-5)
**Tasks:**
- ⏳ Auto-post payments from matched ERA lines
- ⏳ Auto-post adjustments (contractual, write-offs)
- ⏳ Update charge status automatically
- ⏳ Generate payment reconciliation reports
- ⏳ Add duplicate payment detection
- ⏳ Create payment posting dashboard

**Auto-Posting Logic:**
```typescript
async function autoPostPayment(eraLine: ERALineItem, matchedCharge: Charge): Promise<void> {
  const payment = {
    chargeId: matchedCharge.id,
    paymentAmount: eraLine.paidAmount,
    adjustmentAmount: eraLine.adjustmentAmount,
    adjustmentCode: eraLine.carcCode,
    paymentMethod: 'INSURANCE',
    eraFileId: eraLine.eraFileId,
    checkNumber: eraLine.checkNumber,
    paymentDate: eraLine.paymentDate,
    autoPosted: true,
  };

  // Create payment record
  await createPayment(payment);

  // Update charge status
  await updateChargeStatus(matchedCharge.id, 'PAID');

  // Log audit trail
  await logPaymentPosting(payment, 'AUTO_POSTED');
}
```

**Deliverables:**
- [ ] Automatic payment posting
- [ ] Adjustment posting
- [ ] Duplicate detection
- [ ] Reconciliation reports

**Estimated Time:** 12-15 hours

---

### Phase 3 Deliverables Summary

**By End of Week 8:**
- ✅ AdvancedMD integration complete
- ✅ Patient/appointment sync operational
- ✅ Real-time eligibility checks
- ✅ Automated charge submission
- ✅ Claim submission via Waystar
- ✅ ERA parsing with >85% auto-match
- ✅ Automatic payment posting

**Metrics:**
- Billing automation: 0% → 90%
- Claim submission time: 5 days → 1 day
- Payment posting time: 2 days → Real-time
- Claim denial rate: 15% → 5%
- Revenue cycle time: 45 days → 20 days
- **ROI:** $50K+ annual savings in billing staff time

---

## Phase 4: Telehealth Video (Weeks 9-11)

**Objective:** Launch video telehealth with AWS Chime SDK
**Priority:** MEDIUM - Competitive feature
**Effort:** 60-75 hours

### Week 9: AWS Chime Setup

#### Infrastructure Setup (Day 1-2)
**Tasks:**
- ⏳ Create AWS Chime application in AWS Console
- ⏳ Configure Chime SDK permissions (IAM roles)
- ⏳ Set up Chime meeting recordings storage (S3 bucket)
- ⏳ Configure encryption (AWS KMS)
- ⏳ Set up CloudWatch logging for Chime events

**AWS Architecture:**
```
Client Browser
    ↓
React App (Chime SDK JS)
    ↓
Backend API (Express)
    ↓
AWS Chime SDK
    ↓
S3 (Recordings - HIPAA compliant)
```

**Deliverables:**
- [ ] Chime application created
- [ ] IAM roles configured
- [ ] Recording storage configured
- [ ] Encryption enabled

**Estimated Time:** 8-10 hours

---

#### Meeting Management API (Day 3-5)
**Tasks:**
- ⏳ Implement `POST /api/v1/telehealth/meetings/create` - Create meeting
- ⏳ Implement `POST /api/v1/telehealth/meetings/:id/join` - Join meeting
- ⏳ Implement `DELETE /api/v1/telehealth/meetings/:id/end` - End meeting
- ⏳ Add attendee management
- ⏳ Add waiting room functionality
- ⏳ Implement meeting recording controls

**Database Enhancement:**
```prisma
model TelehealthSession {
  // ... existing fields
  chimeMeetingId      String?   @unique
  chimeAttendeeIds    Json?     // Array of attendee IDs
  recordingEnabled    Boolean   @default(false)
  recordingUrl        String?   // S3 URL after session
  recordingStartTime  DateTime?
  recordingEndTime    DateTime?
  participantCount    Int       @default(0)
  connectionQuality   Json?     // Quality metrics
}
```

**Deliverables:**
- [ ] Meeting creation API
- [ ] Join meeting functionality
- [ ] Attendee management
- [ ] Waiting room

**Estimated Time:** 12-15 hours

---

### Week 10: Video Interface

#### Frontend Video Components (Day 1-3)
**Tasks:**
- ⏳ Install Chime SDK JS libraries
- ⏳ Create video call UI component
- ⏳ Implement video controls (mute, camera, share screen)
- ⏳ Add participant tiles (1:1 and group)
- ⏳ Create virtual waiting room UI
- ⏳ Add connection quality indicators

**React Components:**
```typescript
// VideoCallRoom.tsx
interface VideoCallRoomProps {
  sessionId: string;
  isProvider: boolean;
}

const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ sessionId, isProvider }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Chime SDK hooks
  const meetingManager = useMeetingManager();

  useEffect(() => {
    // Join meeting
    joinMeeting(sessionId);

    return () => {
      // Leave meeting on unmount
      leaveMeeting();
    };
  }, [sessionId]);

  return (
    <div className="video-call-container">
      <ParticipantGrid participants={participants} />
      <VideoControls
        onMute={toggleMute}
        onCamera={toggleCamera}
        onScreenShare={toggleScreenShare}
        onEndCall={endCall}
      />
      <ConnectionQuality quality={connectionQuality} />
    </div>
  );
};
```

**Deliverables:**
- [ ] Video call UI
- [ ] Controls functional
- [ ] Multi-participant support
- [ ] Quality indicators

**Estimated Time:** 16-20 hours

---

#### Screen Sharing & Chat (Day 4-5)
**Tasks:**
- ⏳ Implement screen sharing (Chime content share)
- ⏳ Add in-session chat functionality
- ⏳ Create session recording UI
- ⏳ Add emoji reactions
- ⏳ Implement hand raise feature

**Deliverables:**
- [ ] Screen sharing functional
- [ ] In-session chat
- [ ] Recording controls
- [ ] Engagement features

**Estimated Time:** 12-15 hours

---

### Week 11: Recording & Analytics

#### Session Recording (Day 1-3)
**Tasks:**
- ⏳ Implement automatic recording start
- ⏳ Add recording status indicators
- ⏳ Create post-session recording processing
- ⏳ Add recording access controls (HIPAA compliance)
- ⏳ Implement recording deletion after 90 days
- ⏳ Create recording playback interface

**Recording Workflow:**
1. Provider starts telehealth session
2. Recording begins automatically (with client consent)
3. Recording saved to encrypted S3 bucket
4. Processing job creates metadata
5. Recording linked to session in database
6. Provider can review recording in EHR
7. Auto-delete after 90 days (compliance)

**Deliverables:**
- [ ] Auto-recording functional
- [ ] Secure storage (encrypted S3)
- [ ] Playback interface
- [ ] Auto-deletion at 90 days

**Estimated Time:** 12-15 hours

---

#### Connection Quality & Analytics (Day 4-5)
**Tasks:**
- ⏳ Implement connection quality monitoring
- ⏳ Track session metrics (duration, participants, quality)
- ⏳ Create analytics dashboard
- ⏳ Add network diagnostics
- ⏳ Implement automatic quality degradation handling

**Metrics Tracked:**
```typescript
interface SessionMetrics {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  participantCount: number;
  avgBitrate: number;
  avgPacketLoss: number;
  disconnections: number;
  reconnections: number;
  videoQuality: 'HD' | 'SD' | 'LD';
  audioQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}
```

**Deliverables:**
- [ ] Quality monitoring
- [ ] Session analytics
- [ ] Diagnostics tools
- [ ] Quality adaptation

**Estimated Time:** 10-12 hours

---

### Phase 4 Deliverables Summary

**By End of Week 11:**
- ✅ AWS Chime integration complete
- ✅ Video calls operational
- ✅ Screen sharing functional
- ✅ Session recording with HIPAA compliance
- ✅ Connection quality monitoring
- ✅ Analytics dashboard

**Metrics:**
- Telehealth sessions: +300%
- Client satisfaction with video: 95%+
- Technical support tickets: <2%
- Session completion rate: >98%

---

## Phase 5: Analytics & Reporting (Weeks 12-14)

**Objective:** Complete reporting suite for business intelligence
**Priority:** MEDIUM - Business value
**Effort:** 70-85 hours

### Week 12: Revenue & Financial Reports

#### Revenue Reports (Day 1-3)
**Tasks:**
- ⏳ Build revenue by clinician report
- ⏳ Build revenue by CPT code report
- ⏳ Build revenue by payer report
- ⏳ Add date range filtering
- ⏳ Create revenue trend charts (Chart.js)
- ⏳ Add export to Excel (XLSX)

**Report Structure:**
```typescript
interface RevenueReport {
  dateRange: { start: Date; end: Date };
  totalRevenue: number;
  totalCharges: number;
  totalPayments: number;
  outstandingAR: number;

  byClinician: {
    clinicianId: string;
    clinicianName: string;
    totalRevenue: number;
    sessionCount: number;
    avgRevenuePerSession: number;
  }[];

  byCPTCode: {
    cptCode: string;
    description: string;
    units: number;
    totalRevenue: number;
  }[];

  byPayer: {
    payerId: string;
    payerName: string;
    totalRevenue: number;
    claimCount: number;
    avgPaymentTime: number; // days
  }[];
}
```

**Deliverables:**
- [ ] 3 revenue report types
- [ ] Interactive charts
- [ ] Excel export
- [ ] Date range filtering

**Estimated Time:** 16-20 hours

---

#### Accounts Receivable Reports (Day 4-5)
**Tasks:**
- ⏳ Create aging report (0-30, 31-60, 61-90, 90+ days)
- ⏳ Build outstanding balance by client report
- ⏳ Create collection priority queue
- ⏳ Add automated aging email alerts
- ⏳ Create write-off recommendation engine

**Aging Report:**
```typescript
interface AgingReport {
  asOfDate: Date;
  totalOutstanding: number;

  byAgingBucket: {
    bucket: '0-30' | '31-60' | '61-90' | '90+';
    amount: number;
    percentage: number;
    clientCount: number;
  }[];

  topAccounts: {
    clientId: string;
    clientName: string;
    balance: number;
    oldestChargeDate: Date;
    daysPastDue: number;
  }[];
}
```

**Deliverables:**
- [ ] Aging report
- [ ] Collection queue
- [ ] Email alerts
- [ ] Write-off recommendations

**Estimated Time:** 12-15 hours

---

### Week 13: Productivity & Clinical Reports

#### Productivity Dashboards (Day 1-3)
**Tasks:**
- ⏳ Build clinician productivity dashboard
- ⏳ Calculate real-time KVR (Key Value Ratio)
- ⏳ Track sessions per day
- ⏳ Monitor documentation completion time
- ⏳ Create team comparison widgets
- ⏳ Add productivity goals and targets

**KVR Calculation:**
```typescript
interface ProductivityMetrics {
  clinicianId: string;
  dateRange: { start: Date; end: Date };

  // Sessions
  totalSessions: number;
  billableSessions: number;
  nonBillableSessions: number;
  avgSessionsPerDay: number;

  // KVR (Georgia-specific)
  totalBillableHours: number;
  totalWorkHours: number;
  kvr: number; // billableHours / workHours
  kvrTarget: number; // 0.60 for most clinicians
  kvrStatus: 'ABOVE_TARGET' | 'ON_TARGET' | 'BELOW_TARGET';

  // Documentation
  avgNoteCompletionTime: number; // minutes
  noteCompletionRate: number; // percentage within 48h

  // Quality
  cosignPendingCount: number;
  missedAppointmentRate: number;
}
```

**Deliverables:**
- [ ] Productivity dashboard
- [ ] Real-time KVR calculation
- [ ] Team comparisons
- [ ] Goal tracking

**Estimated Time:** 16-20 hours

---

#### Compliance Reports (Day 4-5)
**Tasks:**
- ⏳ Create unsigned notes report
- ⏳ Build missing treatment plans report
- ⏳ Track supervision hour compliance
- ⏳ Monitor consent form expirations
- ⏳ Add automated compliance alerts

**Compliance Monitoring:**
```typescript
interface ComplianceReport {
  asOfDate: Date;

  unsignedNotes: {
    noteId: string;
    clientName: string;
    clinicianName: string;
    sessionDate: Date;
    daysPastDue: number;
    requiresCosign: boolean;
  }[];

  missingTreatmentPlans: {
    clientId: string;
    clientName: string;
    admissionDate: Date;
    daysSinceAdmission: number;
  }[];

  supervisionHours: {
    superviseeId: string;
    superviseeName: string;
    requiredHours: number;
    completedHours: number;
    remainingHours: number;
    onTrack: boolean;
  }[];

  expiringConsents: {
    clientId: string;
    clientName: string;
    consentType: string;
    expirationDate: Date;
    daysUntilExpiration: number;
  }[];
}
```

**Deliverables:**
- [ ] 4 compliance report types
- [ ] Automated alerts
- [ ] Action items queue
- [ ] Compliance score

**Estimated Time:** 12-15 hours

---

### Week 14: Custom Reports & Export

#### Custom Report Builder (Day 1-3)
**Tasks:**
- ⏳ Create drag-and-drop report builder UI
- ⏳ Implement column selection
- ⏳ Add filter configuration
- ⏳ Create sorting and grouping
- ⏳ Save custom report templates
- ⏳ Share reports with team

**Report Builder Interface:**
```typescript
interface CustomReport {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  isPublic: boolean;

  dataSource: 'CLIENTS' | 'APPOINTMENTS' | 'BILLING' | 'NOTES';

  columns: {
    field: string;
    label: string;
    dataType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';
    aggregate?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  }[];

  filters: {
    field: string;
    operator: 'EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN';
    value: any;
  }[];

  groupBy?: string[];
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
}
```

**Deliverables:**
- [ ] Report builder UI
- [ ] Custom report execution
- [ ] Template saving
- [ ] Report sharing

**Estimated Time:** 18-22 hours

---

#### Scheduled Reports & Delivery (Day 4-5)
**Tasks:**
- ⏳ Implement scheduled report generation
- ⏳ Add email delivery (daily, weekly, monthly)
- ⏳ Create PDF export functionality
- ⏳ Add Excel export
- ⏳ Implement report subscription management

**Scheduled Report Configuration:**
```typescript
interface ScheduledReport {
  id: string;
  reportId: string;
  schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  scheduleTime: string; // "09:00 AM"
  dayOfWeek?: number; // For weekly
  dayOfMonth?: number; // For monthly
  recipients: string[]; // Email addresses
  format: 'PDF' | 'EXCEL' | 'CSV';
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
}
```

**Deliverables:**
- [ ] Report scheduling
- [ ] Email delivery
- [ ] PDF/Excel export
- [ ] Subscription management

**Estimated Time:** 14-16 hours

---

### Phase 5 Deliverables Summary

**By End of Week 14:**
- ✅ Revenue reports (3 types)
- ✅ AR aging reports
- ✅ Productivity dashboards
- ✅ Compliance monitoring
- ✅ Custom report builder
- ✅ Scheduled report delivery

**Metrics:**
- Report usage: 100% of admin users
- Time saved on reporting: 10+ hours/week
- Data-driven decisions: +80%
- Financial visibility: Real-time vs. monthly lag

---

## Ongoing: Security & Infrastructure

**Duration:** Throughout all phases
**Effort:** 30-40 hours

### Security Enhancements

**Week 1-2:**
- ⏳ Implement rate limiting (express-rate-limit)
- ⏳ Add input sanitization middleware
- ⏳ Configure Helmet.js for security headers
- ⏳ Set up CORS for production domains

**Week 3-4:**
- ⏳ Add API request/response logging
- ⏳ Implement intrusion detection alerts
- ⏳ Set up Sentry for error tracking
- ⏳ Configure AWS WAF (Web Application Firewall)

**Week 5-6:**
- ⏳ Penetration testing
- ⏳ Security audit
- ⏳ HIPAA compliance review
- ⏳ Fix identified vulnerabilities

### Infrastructure Improvements

**Week 7-8:**
- ⏳ Set up CloudFront CDN for frontend
- ⏳ Configure ElastiCache Redis for caching
- ⏳ Implement auto-scaling for ECS tasks
- ⏳ Create database read replicas

**Week 9-10:**
- ⏳ Automated database backup verification
- ⏳ Disaster recovery testing
- ⏳ Load testing (Apache JMeter)
- ⏳ Performance optimization

**Week 11-12:**
- ⏳ SSL/TLS certificate setup (ACM)
- ⏳ Custom domain configuration
- ⏳ CloudWatch dashboards
- ⏳ Alerting rules (PagerDuty/Slack)

**Week 13-14:**
- ⏳ APM setup (New Relic/Datadog)
- ⏳ Log aggregation (CloudWatch Insights)
- ⏳ Health check endpoints
- ⏳ Documentation updates

---

## Risk Mitigation Strategies

### Technical Risks

**Risk 1: AdvancedMD API Instability**
- **Mitigation:** Build retry logic with exponential backoff
- **Contingency:** Manual fallback workflows
- **Monitoring:** Alert on API error rates >5%

**Risk 2: AWS Chime SDK Compatibility Issues**
- **Mitigation:** Browser compatibility testing
- **Contingency:** Fallback to phone-based telehealth
- **Monitoring:** Track browser-specific errors

**Risk 3: Database Performance Degradation**
- **Mitigation:** Index optimization, query profiling
- **Contingency:** Read replicas, caching layer
- **Monitoring:** Query performance dashboards

### Business Risks

**Risk 1: User Adoption Resistance**
- **Mitigation:** User training sessions, documentation
- **Contingency:** Phased rollout, champion users
- **Monitoring:** Feature usage analytics

**Risk 2: HIPAA Compliance Gaps**
- **Mitigation:** Regular compliance audits
- **Contingency:** Immediate remediation plan
- **Monitoring:** Audit log reviews

**Risk 3: Resource Constraints**
- **Mitigation:** Prioritization framework
- **Contingency:** Extend timeline, reduce scope
- **Monitoring:** Weekly velocity tracking

---

## Success Criteria

### Phase 1 Success Metrics
- [ ] Client portal backend 100% complete
- [ ] Messages functional with <1s latency
- [ ] Mood tracking engagement >40% daily active users
- [ ] Assessment completion rate >80%
- [ ] Registration conversion rate >70%

### Phase 2 Success Metrics
- [ ] Homework completion rate >60%
- [ ] Goal tracking engagement >50%
- [ ] Journal entries >2 per week per user
- [ ] Wellness library views >5 per user per month
- [ ] Safety plan completion >90% for high-risk clients

### Phase 3 Success Metrics
- [ ] AdvancedMD sync success rate >95%
- [ ] Eligibility check latency <5 seconds
- [ ] ERA auto-match rate >85%
- [ ] Claim denial rate <5%
- [ ] Payment posting lag <24 hours

### Phase 4 Success Metrics
- [ ] Video call success rate >98%
- [ ] Call quality rating >4.5/5
- [ ] Screen sharing functional >95% of time
- [ ] Recording playback errors <1%
- [ ] Connection drops <2%

### Phase 5 Success Metrics
- [ ] Report generation time <10 seconds
- [ ] Custom reports created >20
- [ ] Scheduled report delivery >99% uptime
- [ ] User satisfaction with analytics >90%
- [ ] Time saved on reporting >10 hours/week

---

## Resource Requirements

### Development Team
- **Full-Stack Developer:** 25-30 hours/week for 14 weeks
- **DevOps Engineer:** 5-10 hours/week (infrastructure)
- **QA Tester:** 10-15 hours/week (Weeks 8-14)
- **Technical Writer:** 5 hours/week (documentation)

### Infrastructure Costs
- **AWS Services:** $80-120/month
  - ECS Fargate: $40-60
  - RDS PostgreSQL: $25-35
  - ElastiCache: $10-15
  - S3 + CloudFront: $5-10
- **Third-Party Services:** $150-200/month
  - AdvancedMD API: Included in practice subscription
  - SendGrid (email): $15-30
  - Twilio (SMS): $20-50
  - AWS Chime: $0-50 (usage-based)
  - Sentry (error tracking): $26
  - New Relic (APM): $49-99

**Total Monthly Operating Cost:** $230-320

---

## Deployment Strategy

### Phased Rollout

**Phase 1 (Week 2):** Internal Testing
- Deploy to staging environment
- Internal QA team testing
- Fix critical bugs
- Performance testing

**Phase 2 (Week 4):** Beta Launch
- Select 5-10 beta users (clients + clinicians)
- Monitor usage and gather feedback
- Fix bugs and UX issues
- Iterate based on feedback

**Phase 3 (Week 8):** Limited Production
- Roll out to 25% of users
- Monitor system performance
- Gradual scaling to 50%, then 75%
- Full rollout by end of Phase 3

**Phase 4 (Week 11):** Full Production
- All users migrated
- Legacy features deprecated
- Full monitoring operational
- Support team trained

**Phase 5 (Week 14):** Optimization
- Performance tuning
- Cost optimization
- Feature refinement
- User satisfaction surveys

---

## Communication Plan

### Weekly Updates
**Every Friday:**
- Development progress update
- Blockers and risks
- Next week's priorities
- Demo of completed features

### Stakeholder Reviews
**Every 2 Weeks:**
- Executive summary of progress
- Budget and timeline status
- Key metrics and KPIs
- Strategic decisions needed

### User Communication
**Monthly:**
- Product update newsletter
- New feature announcements
- Training session schedule
- Feedback survey

---

## Maintenance & Support

### Post-Launch Support (Week 15+)

**Week 15-16: Stabilization**
- Bug fixes and hot patches
- Performance optimization
- User support (extended hours)
- Documentation updates

**Ongoing Maintenance:**
- Weekly releases (bug fixes, minor features)
- Monthly feature releases
- Quarterly security audits
- Annual HIPAA compliance review

**Support Structure:**
- Tier 1: Email support (<24h response)
- Tier 2: Phone support (business hours)
- Tier 3: Emergency support (24/7 for critical issues)

---

## Appendix: Technology Stack

### Backend
- Node.js 20.x
- Express.js 4.x
- TypeScript 5.x
- Prisma ORM 5.x
- PostgreSQL 15
- Redis (ElastiCache)

### Frontend
- React 18.x
- TypeScript 5.x
- Vite 5.x
- TailwindCSS 3.x
- React Query (TanStack)
- React Router v6
- AWS Chime SDK JS

### Infrastructure
- AWS ECS (Fargate)
- AWS RDS (PostgreSQL)
- AWS S3
- AWS CloudFront
- AWS Secrets Manager
- AWS CloudWatch
- AWS Chime SDK

### Third-Party
- AdvancedMD API
- Waystar (clearinghouse)
- SendGrid (email)
- Twilio (SMS)
- Sentry (error tracking)
- New Relic (APM)

---

**Document Version:** 1.0
**Last Updated:** October 16, 2025
**Next Review:** October 23, 2025 (Week 1 completion)
**Owner:** MentalSpace Development Team

---

## Quick Reference: Timeline at a Glance

| Week | Phase | Focus Area | Key Deliverables |
|------|-------|------------|------------------|
| 1 | Phase 1 | Portal Foundation | Forms DB, Messages API, Mood Tracking |
| 2 | Phase 1 | Portal Foundation | Assessments, Registration, Password Reset |
| 3 | Phase 2 | Portal Enhancement | Homework, Goals, Journaling |
| 4 | Phase 2 | Portal Enhancement | Wellness Library, Crisis Resources, Medication |
| 5 | Phase 3 | Billing Automation | AdvancedMD Auth, Patient Sync |
| 6 | Phase 3 | Billing Automation | Appointment Sync, Eligibility |
| 7 | Phase 3 | Billing Automation | Charge Submission, Claims |
| 8 | Phase 3 | Billing Automation | ERA Parsing, Auto-Posting |
| 9 | Phase 4 | Telehealth | AWS Chime Setup, Meeting API |
| 10 | Phase 4 | Telehealth | Video Interface, Screen Share |
| 11 | Phase 4 | Telehealth | Recording, Quality Monitoring |
| 12 | Phase 5 | Analytics | Revenue Reports, AR Aging |
| 13 | Phase 5 | Analytics | Productivity, Compliance |
| 14 | Phase 5 | Analytics | Custom Reports, Scheduling |

**Total Duration:** 14 weeks (3.5 months)
**Total Effort:** 340-410 hours
**Cost:** $7,000-$13,000 in infrastructure + developer time
