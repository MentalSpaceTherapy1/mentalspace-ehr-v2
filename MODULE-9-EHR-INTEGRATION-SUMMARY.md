# Module 9: Enhanced Client Portal - EHR Integration Summary

## Overview
The Enhanced Client Portal is **fully integrated** with the main EHR system. It is not a standalone module - all portal data is connected to existing EHR entities (Clients, Users, Appointments) and visible to therapists and administrators based on role permissions.

## Key Integration Points

### 1. Database Schema Integration

**All Portal models have foreign key relationships to EHR entities:**

#### Client Relations (38 Portal Models)
Every portal feature is linked to the `Client` model with CASCADE deletion:
- When a client is deleted from the EHR, all their portal data is automatically removed
- Therapists access portal data through their assigned clients (`Client.primaryTherapistId`)

```prisma
model Client {
  // Existing EHR fields...
  primaryTherapistId String
  primaryTherapist   User @relation("ClientTherapist", fields: [primaryTherapistId], references: [id])

  // Portal Relations - All portal activity visible to therapist
  insuranceCards          InsuranceCard[]
  paymentMethods          PaymentMethod[]
  moodEntries             MoodEntry[]
  dailyPrompts            DailyPrompt[]
  homeworkAssignments     HomeworkAssignment[]
  therapeuticGoals        TherapeuticGoal[]
  sessionReviews          SessionReview[]
  // ... 31 more portal relations
}
```

#### User (Therapist/Admin) Relations (15 Portal Models)
Therapists and admins interact with portal data through these models:
- `sessionReviewsReceived` - View feedback from clients (if shared)
- `dailyPromptsCreated` - Assign daily prompts to clients
- `resourcesCreated` - Upload/assign resources
- `homeworkAssigned` - Assign and review homework
- `therapeuticGoalsCreated` - Create goals collaboratively with clients
- `crisisToolkitsManaged` - Customize crisis resources per client
- `audioMessagesCreated` - Record personalized audio messages
- `sessionSummariesCreated` - Share session notes with clients

```prisma
model User {
  // Existing EHR fields...
  role UserRole
  clientsAsTherapist Client[] @relation("ClientTherapist")

  // Portal Integration - Therapist/Admin can interact with portal data
  sessionReviewsReceived     SessionReview[]
  dailyPromptsCreated        DailyPrompt[]
  resourcesCreated           Resource[]
  homeworkAssigned           HomeworkAssignment[]
  therapeuticGoalsCreated    TherapeuticGoal[]
  // ... 10 more therapist interactions
}
```

#### Appointment Relations (3 Portal Models)
Portal features tied to specific therapy sessions:
- `SessionReview` - Client rates session 24-48h after appointment
- `PreSessionPrep` - Client submits topics to discuss before session
- `SessionSummary` - Therapist shares session notes with client

```prisma
model Appointment {
  // Existing EHR fields...
  clientId    String
  clinicianId String

  // Portal Relations - Session-specific portal data
  sessionReview   SessionReview?
  preSessionPrep  PreSessionPrep?
  sessionSummary  SessionSummary?
}
```

---

### 2. EHR Dashboard Views for Therapists

**Therapists see portal activity for ONLY their assigned clients:**

#### A. Client Chart Integration
When viewing a client's chart in the EHR, therapists can access:

**Portal Activity Tab:**
- Recent mood entries (last 30 days) with trend graph
- Homework completion status
- Crisis toolkit usage alerts (if accessed multiple times)
- Therapeutic goals progress
- Session reviews (if client chose to share)
- Pre-session prep notes for upcoming appointments

**Clinical Insights:**
- Mood correlation with session attendance
- Homework compliance trends
- Crisis toolkit usage patterns (alert if >3 uses/week)
- Engagement streak (motivational insights)

Example Query:
```typescript
// Therapist views client's recent mood entries
const clientMoodData = await prisma.moodEntry.findMany({
  where: {
    clientId: clientId,
    client: {
      primaryTherapistId: therapistUserId, // Security: Only assigned therapist
    },
    sharedWithClinician: true, // Client controls sharing
  },
  orderBy: { entryDate: 'desc' },
  take: 30,
});
```

#### B. Homework Management View
```typescript
// Therapist assigns homework through EHR
const homework = await prisma.homeworkAssignment.create({
  data: {
    clientId: clientId,
    assignedBy: therapistUserId,
    title: "Thought Record Exercise",
    description: "Complete thought record for 3 situations this week",
    homeworkType: "THOUGHT_RECORD",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

// Client sees assignment in portal and marks complete
// Therapist receives notification in EHR dashboard
```

#### C. Session Preparation
Before each session, therapist sees:
```typescript
const prepData = await prisma.preSessionPrep.findUnique({
  where: { appointmentId: appointmentId },
  include: {
    client: { select: { firstName: true, lastName: true } },
  },
});

// Shows:
// - Topics client wants to discuss
// - Recent feelings/mood
// - Homework completion status
// - Any urgent concerns flagged
```

---

### 3. Admin Dashboard Views

**Admins see ALL portal activity across ALL clients:**

#### A. Portal Oversight Dashboard
- Total portal adoption rate (% of clients with accounts)
- Daily active users (DAU)
- Engagement metrics by feature
- All session reviews (including those NOT shared with therapist)
- All therapist change requests
- Crisis toolkit usage across all clients (high-risk alerts)

#### B. Therapist Change Request Management
```typescript
// Admin reviews therapist change requests
const changeRequests = await prisma.therapistChangeRequest.findMany({
  where: { status: 'PENDING' },
  include: {
    client: { select: { firstName: true, lastName: true } },
    currentClinician: { select: { firstName: true, lastName: true } },
  },
  orderBy: { createdAt: 'desc' },
});

// Admin can:
// 1. Review request (mark as UNDER_REVIEW)
// 2. Assign new therapist
// 3. Deny with reason
// 4. Mark sensitive requests (not visible to current therapist)
```

#### C. Quality Assurance
```typescript
// Admin views all session reviews (including anonymous/private)
const allReviews = await prisma.sessionReview.findMany({
  where: {
    rating: { lte: 3 }, // Low ratings
  },
  include: {
    clinician: { select: { firstName: true, lastName: true } },
    client: { select: { firstName: true, lastName: true } },
  },
});

// Identifies patterns:
// - Therapists with consistently low ratings
// - Clients reporting issues
// - Systemic problems (office environment, technology, etc.)
```

---

### 4. Role-Based Access Control

**Security Model:**

```typescript
// CLIENT ACCESS (via Portal)
// - Can ONLY see their own data
// - Can control what therapist sees (privacy toggles)
// - Can't access other clients' data

// THERAPIST ACCESS (via EHR)
// - Can see portal data for ASSIGNED clients only
// - Can't see data marked as "admin only" (e.g., private session reviews)
// - Can assign resources, homework, prompts to their clients
// - Can customize crisis toolkits for their clients

// ADMIN ACCESS (via EHR)
// - Can see ALL portal data across ALL clients
// - Can manage therapist change requests
// - Can view quality metrics and session reviews
// - Can oversee portal adoption and engagement

// SECURITY IMPLEMENTATION
async function getClientMoodData(userId: string, userRole: UserRole, clientId: string) {
  // Enforce row-level security based on role
  const where = userRole === 'ADMINISTRATOR'
    ? { clientId } // Admin sees all clients
    : {
        clientId,
        client: {
          primaryTherapistId: userId, // Therapist sees only assigned clients
        },
      };

  return await prisma.moodEntry.findMany({ where });
}
```

---

### 5. Bidirectional Data Flow

**Portal → EHR (Client to Therapist):**
1. Client logs mood in portal → Therapist sees mood graph in EHR client chart
2. Client completes homework → Notification in therapist's EHR dashboard
3. Client uses crisis toolkit 3+ times → Alert in therapist's EHR dashboard
4. Client submits pre-session prep → Appears in therapist's session prep view
5. Client rates session → Feedback visible in therapist performance metrics (if shared)

**EHR → Portal (Therapist to Client):**
1. Therapist assigns homework in EHR → Appears in client's portal dashboard
2. Therapist creates daily prompt → Client receives notification in portal
3. Therapist uploads resource → Appears in client's "Recommended by Your Therapist" section
4. Therapist records audio message → Available in client's Audio Vault
5. Therapist shares session summary → Client can view/download in portal

---

### 6. Data Visibility Rules

**Client Controls Privacy:**
```prisma
model MoodEntry {
  clientId            String
  sharedWithClinician Boolean  @default(true) // Client can toggle
}

model SessionReview {
  isSharedWithClinician Boolean @default(false) // Client chooses
  isAnonymous           Boolean @default(false) // Admin-only if true
}

model JournalEntry {
  isSharedWithClinician Boolean @default(false) // Private by default
}
```

**Therapist Change Requests - Privacy Protection:**
```prisma
model TherapistChangeRequest {
  isSensitive Boolean @default(false) // Hidden from current therapist
  // Admin sees all requests
  // Current therapist does NOT see sensitive requests
  // Protects clients reporting abuse or boundary issues
}
```

---

### 7. Example EHR Integration Scenarios

#### Scenario 1: Daily Check-In Flow
```
1. CLIENT (Portal): Logs mood = 3/10, symptoms = ['ANXIETY', 'INSOMNIA']
2. SYSTEM: Creates MoodEntry with clientId
3. THERAPIST (EHR): Views client chart, sees mood dropped
4. THERAPIST (EHR): Sends scheduled check-in via portal
5. CLIENT (Portal): Responds to check-in
6. THERAPIST (EHR): Reviews response before next session
```

#### Scenario 2: Homework Assignment Flow
```
1. THERAPIST (EHR): Creates homework assignment for client
2. SYSTEM: Creates HomeworkAssignment with assignedBy = therapistUserId
3. CLIENT (Portal): Sees homework on dashboard with due date
4. CLIENT (Portal): Marks homework as complete, uploads worksheet
5. SYSTEM: Creates notification for therapist
6. THERAPIST (EHR): Reviews completed homework in client chart
7. THERAPIST (EHR): Adds feedback to homework record
8. CLIENT (Portal): Sees therapist feedback
```

#### Scenario 3: Crisis Toolkit Alert Flow
```
1. CLIENT (Portal): Accesses crisis toolkit (3rd time this week)
2. SYSTEM: Creates CrisisToolkitUsage record
3. SYSTEM: Detects high usage pattern
4. SYSTEM: Creates ComplianceAlert for therapist
5. THERAPIST (EHR): Sees alert in dashboard
6. THERAPIST (EHR): Reviews crisis toolkit usage logs
7. THERAPIST: Reaches out to client proactively
```

#### Scenario 4: Session Review Flow
```
1. SYSTEM: 24 hours after appointment, sends review prompt to client
2. CLIENT (Portal): Rates session 5 stars, adds feedback
3. CLIENT (Portal): Chooses "Share with therapist"
4. SYSTEM: Creates SessionReview with isSharedWithClinician = true
5. THERAPIST (EHR): Sees positive feedback in dashboard
6. ADMIN (EHR): Includes review in quality metrics
```

#### Scenario 5: Therapist Change Request Flow
```
1. CLIENT (Portal): Submits change request, marks as "sensitive"
2. SYSTEM: Creates TherapistChangeRequest with isSensitive = true
3. CURRENT THERAPIST (EHR): Does NOT see request (privacy protection)
4. ADMIN (EHR): Reviews request in admin dashboard
5. ADMIN (EHR): Assigns new therapist
6. SYSTEM: Updates client.primaryTherapistId
7. NEW THERAPIST (EHR): Client appears in their caseload
8. NEW THERAPIST (EHR): Can now see client's portal data
9. FORMER THERAPIST (EHR): Loses access to client's portal data
```

---

### 8. API Endpoint Structure

**Portal Endpoints (Client-facing):**
```
POST   /api/v1/portal/auth/login           - Client login
GET    /api/v1/portal/dashboard             - Dashboard data
GET    /api/v1/portal/appointments/upcoming - View appointments
POST   /api/v1/portal/mood-entries          - Log mood
POST   /api/v1/portal/homework/:id/complete - Submit homework
GET    /api/v1/portal/resources             - View assigned resources
```

**EHR Endpoints (Therapist-facing):**
```
GET    /api/v1/clients/:id/portal-activity  - Client portal overview
GET    /api/v1/clients/:id/mood-trends      - Mood data for client
GET    /api/v1/clients/:id/homework          - Assigned homework
POST   /api/v1/clients/:id/homework          - Assign homework
POST   /api/v1/clients/:id/resources/:resourceId - Assign resource
GET    /api/v1/therapist/portal-notifications - New activity alerts
```

**Admin Endpoints (Admin-facing):**
```
GET    /api/v1/admin/portal/adoption         - Adoption metrics
GET    /api/v1/admin/portal/session-reviews  - All reviews
GET    /api/v1/admin/portal/change-requests  - Therapist change requests
POST   /api/v1/admin/portal/change-requests/:id/approve - Approve change
```

---

### 9. Summary of EHR Integration Benefits

1. **Single Source of Truth**: All client data (clinical + portal) in one database
2. **Role-Based Security**: Therapists see assigned clients, admins see everything
3. **Real-Time Insights**: Portal activity immediately visible in EHR
4. **Bidirectional Communication**: Therapists assign work, clients complete it
5. **Clinical Workflow Integration**: Portal data informs treatment decisions
6. **Privacy Controls**: Clients control what therapists see
7. **Admin Oversight**: Quality assurance across all therapist-client relationships
8. **Cascade Deletion**: Client deletion removes all portal data automatically
9. **Audit Trail**: All interactions logged for HIPAA compliance
10. **Relationship-Based Access**: Data access follows therapist-client assignments

---

## Migration Status

✅ **Database Schema**: All 38 Portal models added with foreign key constraints
✅ **Migration Applied**: `20251016044310_add_enhanced_client_portal_module_9`
✅ **Prisma Client Generated**: Type-safe access to all models

## Next Steps

1. Build backend services with role-based access control
2. Create EHR dashboard views for therapists (client portal activity tab)
3. Create admin dashboard for portal oversight
4. Build portal frontend pages
5. Implement real-time notifications (therapist alerts)
6. Add automated workflows (e.g., post-session review prompts)
7. Implement analytics and reporting

---

**The Client Portal is now a fully integrated part of the EHR ecosystem, not a standalone system.**
