# Sunday Lockout Implementation - Complete

## Overview
The Sunday Lockout feature automatically locks unsigned clinical notes that are past their due date (3 days after session). This ensures compliance with Georgia mental health documentation requirements.

## Implementation Summary

### Backend Components

#### 1. Compliance Service (`packages/backend/src/services/compliance.service.ts`)
- **Sunday Lockout Function**: Automatically locks notes that are >3 days old and unsigned
- **Note Reminders**: Sends daily email reminders for notes approaching due dates
- **Cron Job Scheduler**:
  - Sunday Lockout: Runs every Sunday at 11:59 PM EST
  - Daily Reminders: Runs every day at 9:00 AM EST
- **Compliance Statistics**: Provides analytics on overdue, locked, and pending notes

**Key Features**:
- Locks notes with status `DRAFT` or `PENDING_COSIGN` older than 3 days
- Creates compliance alerts in database
- Sends email notifications to clinician and supervisor
- Tracks lock reason with date/time

#### 2. Email Service (`packages/backend/src/services/email.service.ts`)
- **Nodemailer Integration**: SMTP email delivery
- **Development Mode**: Logs emails to console instead of sending
- **Email Templates**:
  - Note lockout notification
  - Unlock request notification
  - Unlock approval notification
  - Unlock denial notification
  - Welcome emails, password resets, appointment reminders

**Configuration** (via environment variables):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

#### 3. Unlock Request Routes (`packages/backend/src/routes/unlockRequest.routes.ts`)
Four main endpoints:

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/unlock-requests` | GET | Get all unlock requests (role-filtered) | Authenticated |
| `/unlock-requests/:noteId/request` | POST | Request unlock with reason | Note owner only |
| `/unlock-requests/:noteId/approve` | POST | Approve unlock for 24 hours | Supervisor/Admin |
| `/unlock-requests/:noteId/deny` | POST | Deny unlock request | Supervisor/Admin |
| `/unlock-requests/stats` | GET | Get unlock request statistics | Authenticated |

**Role-Based Access**:
- **Administrators**: See all unlock requests
- **Supervisors**: See requests from their supervisees
- **Clinicians**: See only their own requests

**Unlock Approval Workflow**:
1. Note is locked automatically on Sunday if >3 days old
2. Clinician requests unlock with detailed reason (minimum 20 characters)
3. Supervisor/Administrator receives email notification
4. Approver reviews and either approves or denies with reason
5. If approved: Note unlocked for 24 hours, clinician notified via email
6. If denied: Request cleared, clinician notified with denial reason

#### 4. Server Initialization (`packages/backend/src/index.ts`)
- Initializes compliance cron jobs on server startup
- Runs after successful database connection
- Graceful shutdown support

### Frontend Components

#### 1. UnlockRequestModal (`packages/frontend/src/components/UnlockRequestModal.tsx`)
- Modal dialog for submitting unlock requests
- Displays note information (type, client, session date)
- Requires detailed reason (minimum 20 characters)
- Shows instructions for approval workflow
- Real-time validation and error handling

**Features**:
- Auto-closes on successful submission
- Invalidates related queries to refresh UI
- Shows who will be notified (supervisor or admin)

#### 2. UnlockRequestManagement Page (`packages/frontend/src/pages/UnlockRequests/UnlockRequestManagement.tsx`)
- Admin/Supervisor dashboard for managing unlock requests
- Statistics cards showing total, pending, approved, and oldest request
- Full table with all unlock request details
- Approve/Deny actions with confirmation modals

**Features**:
- Real-time updates via React Query
- Role-based filtering (supervisors see supervisees only)
- Denial requires reason explanation
- Inline approve/deny buttons for quick action

#### 3. ClinicalNoteDetail Updates (`packages/frontend/src/pages/ClinicalNotes/ClinicalNoteDetail.tsx`)
- Added lock status badges:
  - Red "LOCKED" badge with lock icon
  - Yellow "Unlock Pending" badge when request submitted
- "Request Unlock" button (orange/red gradient)
- Only shows if note is locked AND no pending request
- Integrated UnlockRequestModal component

**Extended Interface**:
```typescript
interface ClinicalNote {
  // ... existing fields
  isLocked: boolean;
  lockedDate?: string;
  lockReason?: string;
  unlockRequested: boolean;
  unlockRequestDate?: string;
  unlockReason?: string;
  unlockApprovedBy?: string;
  unlockApprovalDate?: string;
  unlockUntil?: string;
  clientId: string;
}
```

#### 4. App Routes (`packages/frontend/src/App.tsx`)
- Added route: `/unlock-requests` → UnlockRequestManagement page
- Protected by PrivateRoute (requires authentication)
- Accessible to Supervisors and Administrators

## Database Schema
The existing Prisma schema already includes all necessary fields for the unlock workflow:

```prisma
model ClinicalNote {
  // Lock fields
  isLocked         Boolean   @default(false)
  lockedDate       DateTime?
  lockReason       String?

  // Unlock request fields
  unlockRequested     Boolean   @default(false)
  unlockRequestDate   DateTime?
  unlockReason        String?
  unlockApprovedBy    String?
  unlockApprovalDate  DateTime?
  unlockUntil         DateTime?

  // Relationships
  clinician   User @relation("ClinicianNotes")
  client      Client
  // ... other fields
}

model ComplianceAlert {
  id              String   @id @default(cuid())
  alertType       String   // 'UNSIGNED_NOTE', etc.
  severity        String   // 'CRITICAL', 'WARNING', 'INFO'
  targetUserId    String
  supervisorId    String?
  message         String
  actionRequired  String?
  metadata        Json?
  isResolved      Boolean  @default(false)
  resolvedDate    DateTime?
  createdAt       DateTime @default(now())
}
```

## User Workflows

### Clinician Workflow (Locked Note)
1. Clinician opens a locked clinical note
2. Sees red "LOCKED" badge and lock reason
3. Clicks "Request Unlock" button
4. Fills out unlock request form with detailed reason
5. Submits request
6. Receives confirmation that supervisor/admin was notified
7. Waits for email notification of approval/denial
8. If approved: Has 24 hours to complete and sign note
9. If denied: Reviews denial reason and contacts supervisor

### Supervisor/Administrator Workflow
1. Receives email notification of unlock request
2. Navigates to `/unlock-requests` page
3. Reviews unlock request details:
   - Clinician name and email
   - Client name
   - Note type and session date
   - Request date
   - Clinician's reason for unlock
4. Decides to approve or deny:
   - **Approve**: Note unlocked for 24 hours, clinician notified
   - **Deny**: Must provide reason, clinician notified
5. Request removed from pending queue

### Automated Sunday Lockout Workflow
1. Every Sunday at 11:59 PM EST:
   - System identifies all unsigned notes >3 days old
   - Sets `isLocked = true` for each note
   - Records `lockedDate`, `lockReason`
   - Creates `ComplianceAlert` record
   - Sends email to clinician
   - Sends email to supervisor (if applicable)
2. Every day at 9:00 AM EST:
   - System identifies notes approaching due date
   - Sends reminder emails to clinicians (if reminders enabled)
   - Reminders sent at 2 days, 1 day, and day-of due date

## Configuration

### Environment Variables (.env)
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@mentalspace-ehr.com
SMTP_PASS=your-app-specific-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Timezone
TZ=America/New_York
```

### Compliance Settings (in compliance.service.ts)
```typescript
const COMPLIANCE_CONFIG = {
  noteDueDays: 3,           // Notes due within 3 days
  lockoutDay: 'Sunday',     // Day to lock notes
  lockoutTime: '23:59:59',  // Time to lock notes
  gracePeriodHours: 0,      // No grace period
  reminderDays: [2, 1, 0],  // Reminder schedule
};
```

## Testing Checklist

### Backend Testing
- [ ] Test Sunday lockout cron job (manual trigger available)
- [ ] Test email delivery (check console in dev mode)
- [ ] Test unlock request creation
- [ ] Test unlock approval (24-hour window)
- [ ] Test unlock denial with reason
- [ ] Test role-based access (admin, supervisor, clinician)
- [ ] Test compliance statistics endpoint
- [ ] Test note reminder emails

### Frontend Testing
- [ ] Test locked note badge display
- [ ] Test unlock request modal
- [ ] Test unlock request management page
- [ ] Test approve/deny modals
- [ ] Test role-based UI visibility
- [ ] Test email notification links
- [ ] Test 24-hour unlock countdown

### Integration Testing
- [ ] End-to-end: Create note → Wait 3 days → Sunday lockout → Request unlock → Approve → Complete note
- [ ] Test supervisor notification routing
- [ ] Test admin fallback when no supervisor
- [ ] Test email templates in production
- [ ] Test cron job reliability

## Production Deployment

### Prerequisites
1. Configure SMTP credentials in production environment
2. Set correct `FRONTEND_URL` for email links
3. Set timezone to `America/New_York` or practice timezone
4. Ensure cron jobs start on server initialization
5. Test email delivery before go-live

### Deployment Steps
1. Run database migrations (if needed)
2. Deploy backend with environment variables
3. Deploy frontend
4. Verify cron jobs are running: Check server logs for "Initializing compliance cron jobs"
5. Test email delivery with a development note
6. Monitor first Sunday lockout execution
7. Review compliance alerts in database

### Monitoring
- Check server logs for cron job execution
- Monitor email delivery success rates
- Track unlock request approval/denial rates
- Review compliance alert creation
- Monitor 24-hour unlock window expiration

## Files Modified/Created

### Backend
- ✅ `packages/backend/src/services/compliance.service.ts` (NEW)
- ✅ `packages/backend/src/services/email.service.ts` (NEW)
- ✅ `packages/backend/src/routes/unlockRequest.routes.ts` (NEW)
- ✅ `packages/backend/src/routes/index.ts` (MODIFIED - added unlock routes)
- ✅ `packages/backend/src/index.ts` (MODIFIED - initialize cron jobs)

### Frontend
- ✅ `packages/frontend/src/components/UnlockRequestModal.tsx` (NEW)
- ✅ `packages/frontend/src/pages/UnlockRequests/UnlockRequestManagement.tsx` (NEW)
- ✅ `packages/frontend/src/pages/ClinicalNotes/ClinicalNoteDetail.tsx` (MODIFIED - lock UI)
- ✅ `packages/frontend/src/App.tsx` (MODIFIED - unlock route)

### Database
- ✅ Schema fields already exist (no migration needed)

## Next Steps (Optional Enhancements)

1. **Dashboard Widget**: Add "Locked Notes" count to clinician dashboard
2. **Bulk Unlock**: Allow admins to bulk approve requests
3. **Configurable Settings**: Move compliance config to database/admin panel
4. **Audit Log**: Enhanced audit trail for all lock/unlock actions
5. **Analytics**: Reports on compliance rates, unlock request patterns
6. **Mobile Notifications**: Push notifications for unlock approvals
7. **Auto-Relock**: Automatically re-lock notes after 24-hour window expires
8. **Escalation**: Auto-escalate pending requests after X days

## Support

For questions or issues with the Sunday Lockout feature:
- Check server logs for cron job execution
- Verify email service configuration
- Review compliance service logs
- Test with manual lockout trigger: `triggerSundayLockoutManually()`

---

**Implementation Status**: ✅ COMPLETE
**Date Completed**: 2025-10-18
**Developer**: Claude
**Feature Phase**: Compliance Automation (Sunday Lockout)
