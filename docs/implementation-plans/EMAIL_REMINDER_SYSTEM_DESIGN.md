# Email Reminder System - Design Document

**Module**: Module 4 - Clinical Documentation & Notes
**Feature**: Email Reminder System
**Priority**: HIGH (72-hour compliance requirement)
**Status**: Design Phase
**Date**: 2025-11-07

---

## Overview

The Email Reminder System will automatically send email reminders to clinicians when clinical notes are approaching their due date (72-hour rule). This system is critical for maintaining compliance with documentation requirements and preventing notes from being locked on Sunday midnight.

---

## Requirements

### Functional Requirements

1. **Automated Reminders**
   - Send reminders at configurable intervals (24h, 48h, 72h before due)
   - Send reminders for overdue notes
   - Daily digest option for multiple overdue notes

2. **Escalation**
   - Escalate to supervisors if notes remain unfinished
   - CC administrators on critical overdue notes
   - Track escalation history

3. **Configuration**
   - Practice-wide settings
   - Per-clinician preferences
   - Per-note-type rules

4. **Tracking**
   - Log all sent reminders
   - Track open rate (if possible)
   - Prevent duplicate reminders

### Compliance Requirements

- **72-Hour Rule**: Notes must be completed within 72 hours of session
- **Sunday Lockout**: Notes lock on Sunday midnight if not signed
- **Supervisor Notification**: Supervisors must be notified of supervised notes

---

## Database Schema

### 1. ReminderConfiguration Model

Stores reminder settings at practice and user level.

```prisma
model ReminderConfiguration {
  id String @id @default(uuid())

  // Configuration level
  configurationType ConfigurationType // PRACTICE, USER, NOTE_TYPE
  userId String? // For user-specific config
  user User? @relation(fields: [userId], references: [id])
  noteType String? // For note-type specific config

  // Reminder timing
  enabled Boolean @default(true)
  reminderIntervals Int[] // Hours before due [24, 48, 72]
  sendOverdueReminders Boolean @default(true)
  overdueReminderFrequency Int @default(24) // Hours between overdue reminders
  maxOverdueReminders Int @default(3) // Max reminders for one note

  // Digest options
  enableDailyDigest Boolean @default(false)
  digestTime String @default("09:00") // Time to send digest

  // Escalation settings
  enableEscalation Boolean @default(true)
  escalationAfterHours Int @default(48) // Hours overdue before escalation
  escalateTo String[] // User IDs to escalate to

  // Email preferences
  emailFrom String? // Custom from address
  emailSubjectPrefix String? // E.g., "[MentalSpace]"

  // Created/Updated
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String
  creator User @relation("CreatedConfigs", fields: [createdBy], references: [id])

  @@unique([configurationType, userId, noteType])
  @@index([configurationType])
  @@index([userId])
  @@index([noteType])
}

enum ConfigurationType {
  PRACTICE // Default for whole practice
  USER // User-specific overrides
  NOTE_TYPE // Note-type specific rules
}
```

### 2. ReminderLog Model

Tracks all sent reminders for audit and duplicate prevention.

```prisma
model ReminderLog {
  id String @id @default(uuid())

  // What was reminded
  clinicalNoteId String
  clinicalNote ClinicalNote @relation(fields: [clinicalNoteId], references: [id], onDelete: Cascade)

  // Who was notified
  recipientId String
  recipient User @relation(fields: [recipientId], references: [id])
  recipientEmail String

  // Reminder details
  reminderType ReminderType
  hoursBeforeDue Int? // Negative if overdue
  escalationLevel Int @default(0) // 0 = normal, 1+ = escalation

  // Email details
  emailSubject String
  emailBody String @db.Text
  sentAt DateTime @default(now())
  sentSuccessfully Boolean @default(true)
  errorMessage String?

  // Tracking
  emailOpened Boolean @default(false)
  emailOpenedAt DateTime?
  noteCompletedAfterReminder Boolean @default(false)

  // Created
  createdAt DateTime @default(now())

  @@index([clinicalNoteId])
  @@index([recipientId])
  @@index([sentAt])
  @@index([reminderType])
}

enum ReminderType {
  DUE_SOON // 24h, 48h, 72h before due
  OVERDUE // After due date
  DAILY_DIGEST // Combined daily summary
  ESCALATION // Escalated to supervisor/admin
  SUNDAY_WARNING // Special warning before Sunday lockout
}
```

### 3. Update ClinicalNote Model

Add fields to track reminder status.

```prisma
model ClinicalNote {
  // ... existing fields ...

  // Reminder tracking
  lastReminderSent DateTime?
  reminderCount Int @default(0)
  escalated Boolean @default(false)
  escalatedAt DateTime?
  escalatedTo String[] @default([])

  // Relations
  reminderLogs ReminderLog[]
}
```

---

## Email Service Architecture

### Email Service Structure

```typescript
// packages/backend/src/services/email/emailReminder.service.ts

import nodemailer from 'nodemailer';
import { ClinicalNote, User } from '@prisma/client';

interface ReminderEmailOptions {
  recipientEmail: string;
  recipientName: string;
  note: ClinicalNote & {
    client: { firstName: string; lastName: string };
    clinician: User;
  };
  reminderType: 'DUE_SOON' | 'OVERDUE' | 'ESCALATION';
  hoursRemaining?: number;
  hoursOverdue?: number;
}

class EmailReminderService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendDueSoonReminder(options: ReminderEmailOptions): Promise<boolean>
  async sendOverdueReminder(options: ReminderEmailOptions): Promise<boolean>
  async sendEscalationReminder(options: ReminderEmailOptions): Promise<boolean>
  async sendDailyDigest(recipient: User, overdueNotes: ClinicalNote[]): Promise<boolean>
  async sendSundayWarning(recipient: User, unsignedNotes: ClinicalNote[]): Promise<boolean>

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean>
  private buildReminderEmail(options: ReminderEmailOptions): { subject: string; html: string }
  private buildDigestEmail(recipient: User, notes: ClinicalNote[]): { subject: string; html: string }
}
```

### Email Templates

**Due Soon Reminder**:
```
Subject: [MentalSpace] Clinical Note Due in ${hours} Hours

Hi ${clinicianName},

This is a reminder that a clinical note is due soon:

Client: ${clientName}
Session Date: ${sessionDate}
Note Type: ${noteType}
Due Date: ${dueDate}
Time Remaining: ${hoursRemaining} hours

Please complete this note before the deadline to avoid Sunday lockout.

[Complete Note] button/link

Thank you,
MentalSpace EHR
```

**Overdue Reminder**:
```
Subject: [MentalSpace] OVERDUE: Clinical Note Past Due Date

Hi ${clinicianName},

URGENT: A clinical note is now overdue:

Client: ${clientName}
Session Date: ${sessionDate}
Note Type: ${noteType}
Due Date: ${dueDate}
Time Overdue: ${hoursOverdue} hours

This note is at risk of being locked during the next Sunday midnight lockout.

[Complete Note Immediately] button/link

Thank you,
MentalSpace EHR
```

**Sunday Warning**:
```
Subject: [MentalSpace] CRITICAL: Notes Will Lock on Sunday Midnight

Hi ${clinicianName},

This is your final warning: ${count} notes will be automatically locked on Sunday at midnight:

[List of notes with due dates]

Please complete these notes immediately to avoid lockout.

[View All Notes] button/link

Thank you,
MentalSpace EHR
```

---

## Scheduler Architecture

### Cron Job Structure

```typescript
// packages/backend/src/jobs/emailReminder.job.ts

import cron from 'node-cron';
import prisma from '../services/database';
import { EmailReminderService } from '../services/email/emailReminder.service';

export function startReminderScheduler() {
  const emailService = new EmailReminderService();

  // Run every hour to check for due notes
  cron.schedule('0 * * * *', async () => {
    await checkAndSendReminders();
  });

  // Run daily digest at 9 AM
  cron.schedule('0 9 * * *', async () => {
    await sendDailyDigests();
  });

  // Run Sunday warning on Friday evening
  cron.schedule('0 17 * * 5', async () => {
    await sendSundayWarnings();
  });
}

async function checkAndSendReminders() {
  // 1. Get practice reminder configuration
  // 2. Find notes that need reminders
  // 3. Check if reminder already sent recently
  // 4. Send reminders
  // 5. Log sent reminders
  // 6. Check for escalation needs
}

async function sendDailyDigests() {
  // 1. Find users with digest enabled
  // 2. Find their overdue notes
  // 3. Send digest email
  // 4. Log digest
}

async function sendSundayWarnings() {
  // 1. Find all unsigned notes from previous week
  // 2. Group by clinician
  // 3. Send warning email
  // 4. Log warnings
}
```

### Reminder Logic Flow

```typescript
async function findNotesNeedingReminders(): Promise<NoteWithReminder[]> {
  const now = new Date();

  // Get practice configuration
  const config = await getActiveReminderConfig();

  // Find notes that are:
  // 1. Not yet signed
  // 2. Due date approaching or past
  // 3. Haven't received reminder recently

  const notes = await prisma.clinicalNote.findMany({
    where: {
      status: { notIn: ['SIGNED', 'COSIGNED', 'LOCKED'] },
      dueDate: { lte: addHours(now, Math.max(...config.reminderIntervals)) },
      OR: [
        { lastReminderSent: null },
        { lastReminderSent: { lte: subHours(now, config.overdueReminderFrequency) } },
      ],
      reminderCount: { lt: config.maxOverdueReminders },
    },
    include: {
      client: true,
      clinician: { include: { supervisor: true } },
    },
  });

  // Filter notes by interval logic
  return notes.filter(note => shouldSendReminder(note, config));
}

function shouldSendReminder(note: ClinicalNote, config: ReminderConfiguration): boolean {
  const hoursUntilDue = differenceInHours(note.dueDate, new Date());

  // Check if any interval threshold is met
  for (const interval of config.reminderIntervals) {
    if (hoursUntilDue <= interval && hoursUntilDue > (interval - 1)) {
      return true;
    }
  }

  // Check if overdue and enough time passed since last reminder
  if (hoursUntilDue < 0 && config.sendOverdueReminders) {
    const hoursSinceLastReminder = note.lastReminderSent
      ? differenceInHours(new Date(), note.lastReminderSent)
      : Infinity;

    return hoursSinceLastReminder >= config.overdueReminderFrequency;
  }

  return false;
}
```

---

## API Endpoints

### Reminder Configuration Endpoints

```typescript
// GET /api/v1/reminders/config
// Get current reminder configuration (practice or user-specific)

// PUT /api/v1/reminders/config
// Update reminder configuration
interface UpdateConfigRequest {
  enabled: boolean;
  reminderIntervals: number[];
  sendOverdueReminders: boolean;
  overdueReminderFrequency: number;
  maxOverdueReminders: number;
  enableDailyDigest: boolean;
  digestTime: string;
  enableEscalation: boolean;
  escalationAfterHours: number;
  escalateTo: string[];
}

// GET /api/v1/reminders/logs
// Get reminder logs for current user or practice

// POST /api/v1/reminders/send-test
// Send a test reminder email to verify configuration
```

---

## Frontend UI Components

### Reminder Settings Page

Location: `packages/frontend/src/pages/Settings/ReminderSettings.tsx`

**Sections**:
1. **Enable/Disable Reminders**
   - Toggle switch
   - Description of reminder system

2. **Reminder Timing**
   - Checkboxes for 24h, 48h, 72h intervals
   - Custom interval input

3. **Overdue Settings**
   - Enable overdue reminders toggle
   - Frequency selector (hourly, every 6h, daily)
   - Max reminders before escalation

4. **Daily Digest**
   - Enable toggle
   - Time picker for digest delivery

5. **Escalation Settings**
   - Enable escalation toggle
   - Hours overdue before escalation
   - User selector for escalation recipients

6. **Test Email**
   - Button to send test email
   - Status indicator

---

## Environment Variables

Add to `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password

# Email Settings
EMAIL_FROM_ADDRESS=noreply@mentalspace-ehr.com
EMAIL_FROM_NAME=MentalSpace EHR
EMAIL_REPLY_TO=support@mentalspace-ehr.com

# Reminder Settings
REMINDERS_ENABLED=true
REMINDERS_DEFAULT_INTERVALS=24,48,72
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create database migrations for new models
- [ ] Implement EmailReminderService with nodemailer
- [ ] Create email templates
- [ ] Add environment variables

### Phase 2: Core Logic (Week 1-2)
- [ ] Implement reminder configuration service
- [ ] Implement reminder detection logic
- [ ] Create reminder scheduler
- [ ] Implement reminder logging

### Phase 3: API & Frontend (Week 2)
- [ ] Create reminder configuration API endpoints
- [ ] Build ReminderSettings UI component
- [ ] Implement test email functionality
- [ ] Add reminder logs viewer

### Phase 4: Testing & Deployment (Week 2-3)
- [ ] Unit tests for reminder logic
- [ ] Integration tests for email sending
- [ ] End-to-end tests for scheduler
- [ ] Deploy to staging
- [ ] Monitor and adjust

---

## Testing Strategy

### Unit Tests
- Configuration validation
- Reminder timing logic
- Email template generation
- Escalation logic

### Integration Tests
- Email sending (using test SMTP server)
- Database queries for due notes
- Reminder logging
- Configuration API

### End-to-End Tests
- Complete reminder flow
- Daily digest generation
- Sunday warning system
- Escalation workflow

---

## Success Metrics

1. **Reminder Effectiveness**
   - % of notes completed after first reminder
   - Average time from reminder to completion
   - Reduction in overdue notes

2. **System Performance**
   - Email delivery success rate
   - Reminder processing time
   - No duplicate reminders sent

3. **User Satisfaction**
   - Clinician feedback on reminder timing
   - Reduction in Sunday locked notes
   - Improved compliance metrics

---

## Security Considerations

1. **Email Security**
   - Use app-specific passwords for SMTP
   - TLS/SSL encryption for email transport
   - Rate limiting to prevent spam

2. **Data Privacy**
   - Don't include PHI in email subjects
   - Use secure links that require authentication
   - Log access to reminder data

3. **Configuration Access**
   - Only administrators can set practice-wide config
   - Users can only modify their own preferences
   - Audit log all configuration changes

---

## Future Enhancements

1. **SMS Reminders** - Send text message reminders for critical notes
2. **Push Notifications** - Browser/mobile push notifications
3. **Slack Integration** - Send reminders via Slack
4. **Smart Timing** - Machine learning to optimize reminder timing
5. **Reminder Analytics** - Dashboard showing reminder effectiveness

---

**Document Created**: 2025-11-07
**Author**: Claude Code
**Status**: Ready for Implementation
**Next Step**: Begin Phase 1 implementation
