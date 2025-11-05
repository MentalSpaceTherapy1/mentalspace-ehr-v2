# Automated Reminder System - Backend Implementation Summary

**Date:** November 2, 2025
**Status:** ✅ COMPLETE

## Overview

Complete backend implementation for the Automated Reminder System (Module 3) has been created. All services, controllers, routes, and cron jobs are ready for integration and testing.

---

## Files Created

### 1. **Core Services**

#### `packages/backend/src/services/reminder.service.new.ts` (25.9 KB)
**Complete ReminderService class** - Main orchestration service for all reminder operations.

**Key Methods:**
- `scheduleRemindersForAppointment(appointmentId)` - Schedule all reminders when appointment is created/updated
- `processPendingReminders()` - Process reminders due to be sent (called by cron)
- `retryFailedReminders()` - Retry previously failed reminders
- `sendReminder(reminder, config)` - Send individual reminder via SMS/Email/Voice/Portal
- `sendSmsReminder()` - Send SMS via Twilio
- `sendEmailReminder()` - Send email via AWS SES with .ics attachment
- `sendVoiceReminder()` - Make voice call via Twilio
- `sendPortalNotification()` - Create in-app notification
- `handleSmsResponse(from, body, messageId)` - Process Y/N confirmations from clients
- `calculateReminderSchedule()` - Determine when reminders should be sent
- `formatSmsMessage()` - Format SMS with template variables
- `formatEmailMessage()` - Format HTML email with template variables
- `getAppointmentReminders(appointmentId)` - Get all reminders for appointment
- `resendReminder(reminderId)` - Manually resend a reminder

**Features:**
- Operating hours enforcement (don't send outside business hours)
- Weekend restriction support
- Retry logic with configurable max attempts
- Template variable substitution ({{clientName}}, {{date}}, etc.)
- Confirmation/cancellation via SMS response
- Cost tracking for SMS/Voice
- Comprehensive error handling and logging

---

#### `packages/backend/src/services/twilio.reminder.service.ts` (8.2 KB)
**TwilioReminderService class** - Handles SMS and Voice reminders via Twilio.

**Key Methods:**
- `sendSms(options)` - Send SMS message
- `makeVoiceCall(options)` - Initiate voice call
- `handleIncomingSms(from, body, messageSid)` - Process incoming SMS responses (returns TwiML)
- `handleStatusCallback(messageSid, messageStatus)` - Update delivery status from Twilio webhooks
- `mapTwilioStatus(twilioStatus)` - Convert Twilio status to internal status
- `validatePhoneNumber()` - Validate E.164 format
- `formatPhoneNumberE164()` - Format US phone numbers
- `testSms(to, from)` - Test SMS configuration
- `reinitialize()` - Reload configuration from database

**Features:**
- Lazy initialization from database config
- Automatic credential loading from ReminderConfiguration
- TwiML response generation for webhooks
- Phone number formatting and validation
- Delivery status tracking
- Error handling with detailed logging

---

#### `packages/backend/src/services/email.reminder.service.ts` (8.8 KB)
**EmailReminderService class** - Handles email reminders via AWS SES with attachment support.

**Key Methods:**
- `sendEmail(options)` - Send email with optional attachments
- `sendSimpleEmail(options)` - Send HTML email without attachments
- `sendEmailWithAttachments(options)` - Send MIME email with .ics files
- `testEmail(to, from)` - Test email configuration
- `verifyEmailIdentity(email)` - Check if email/domain is verified in SES
- `getSendingStats()` - Get SES usage statistics
- `reinitialize()` - Reload configuration from database

**Features:**
- AWS SES integration with SDK v3
- MIME multipart message building for attachments
- Base64 encoding for calendar files
- HTML to plain text conversion
- Lazy initialization from database config
- Development mode logging (doesn't send in dev)

---

#### `packages/backend/src/services/icsGenerator.service.ts` (10.2 KB)
**IcsGeneratorService class** - Generates .ics calendar files for appointments.

**Key Methods:**
- `generateIcsFile(appointment)` - Create .ics file for single appointment
- `generateMultipleAppointmentsIcs(appointments)` - Batch export multiple appointments
- `generateCancellationIcs(appointment)` - Generate cancellation notice
- `validateIcs(icsContent)` - Validate ICS format
- `formatLocation()` - Format location string (office address or "Telehealth")
- `buildDescription()` - Build event description with appointment details

**Features:**
- Compatible with Google Calendar, Outlook, Apple Calendar
- Includes organizer and attendee information
- Adds 1-hour reminder alarm
- Supports telehealth and in-person appointments
- Handles cancellation events (METHOD:CANCEL)
- Proper timezone handling

---

### 2. **Background Jobs**

#### `packages/backend/src/jobs/processReminders.job.ts` (6.0 KB)
**Cron job scheduler** for automated reminder processing.

**Jobs:**
1. **processRemindersJob** - Runs every 5 minutes (*/5 * * * *)
   - Processes all pending reminders due to be sent
   - Checks operating hours before processing
   - Prevents overlapping executions
   - Logs detailed metrics (success rate, counts)

2. **retryFailedRemindersJob** - Runs hourly (0 * * * *)
   - Retries reminders that failed with < max retries
   - Respects retry delay settings
   - Logs retry attempts

**Functions:**
- `startReminderJobs()` - Start both cron jobs
- `stopReminderJobs()` - Stop all jobs (for graceful shutdown)
- `getReminderJobStatus()` - Get current job status
- `triggerReminderProcessing()` - Manual trigger for testing
- `triggerFailedReminderRetry()` - Manual trigger for testing

**Features:**
- Prevents concurrent execution (mutex locks)
- Graceful shutdown handlers (SIGTERM, SIGINT)
- Configurable timezone (currently America/New_York)
- Comprehensive logging for monitoring

---

### 3. **Controllers**

#### `packages/backend/src/controllers/reminder.controller.new.ts` (13.7 KB)
**ReminderController** - HTTP endpoints for reminder management.

**Endpoints:**
- `getConfig()` - GET configuration (masks sensitive credentials)
- `updateConfig()` - PUT/POST configuration with validation
- `testSms()` - POST test SMS
- `testEmail()` - POST test email
- `twilioSmsWebhook()` - POST webhook for incoming SMS
- `twilioStatusWebhook()` - POST webhook for delivery status
- `getAppointmentReminders()` - GET reminders for appointment
- `resendReminder()` - POST resend specific reminder
- `scheduleReminders()` - POST schedule reminders for appointment
- `processReminders()` - POST manual trigger processing (admin)
- `retryFailedReminders()` - POST manual retry failed (admin)
- `getJobStatus()` - GET cron job status
- `getStatistics()` - GET reminder statistics with date filters

**Features:**
- Zod validation schemas for all inputs
- Audit logging for all configuration changes
- Error handling with appropriate HTTP status codes
- Role-based access control integration
- Credential masking in responses

---

### 4. **Routes**

#### `packages/backend/src/routes/reminder.routes.new.ts` (3.4 KB)
**Express router** with all reminder endpoints.

**Public Routes (No Auth):**
- `POST /webhooks/twilio/sms` - Incoming SMS webhook
- `POST /webhooks/twilio/status` - Status update webhook

**Protected Routes (Auth Required):**
- `GET /config` - Get configuration (Admin only)
- `PUT /config` - Update configuration (Admin only)
- `POST /test/sms` - Test SMS (Admin only)
- `POST /test/email` - Test email (Admin only)
- `GET /appointment/:appointmentId` - Get reminders
- `POST /appointment/:appointmentId/schedule` - Schedule reminders
- `POST /:reminderId/resend` - Resend reminder
- `POST /process` - Manual processing (Admin only)
- `POST /retry-failed` - Manual retry (Admin only)
- `GET /jobs/status` - Job status (Admin only)
- `GET /statistics` - Statistics (Admin only)

**Features:**
- Clear route documentation
- Role-based middleware (requireRole)
- Public webhooks for Twilio callbacks

---

## Dependencies Installed

✅ **ical-generator** (v7.2.0) - ICS calendar file generation

**Already Available:**
- ✅ twilio (5.10.3)
- ✅ @aws-sdk/client-ses (3.914.0)
- ✅ node-cron (4.2.1)

---

## Database Requirements

The implementation expects these Prisma models (need to be added to schema):

### `ReminderConfiguration`
```prisma
model ReminderConfiguration {
  id                    String   @id @default(uuid())
  practiceSettingsId    String   @unique

  // SMS Configuration
  smsEnabled            Boolean  @default(false)
  twilioAccountSid      String?
  twilioAuthToken       String?
  twilioPhoneNumber     String?
  smsTemplateReminder   String?
  smsTemplateConfirmation String?

  // Email Configuration
  emailEnabled          Boolean  @default(false)
  sesRegion             String?  @default("us-east-1")
  sesFromEmail          String?
  sesFromName           String?
  emailTemplateSubject  String?
  emailTemplateBody     String?  @db.Text
  includeIcsAttachment  Boolean  @default(true)

  // Voice Configuration
  voiceEnabled          Boolean  @default(false)
  voiceScriptUrl        String?
  voiceFromNumber       String?

  // Reminder Schedule
  enableOneWeekReminder Boolean  @default(false)
  oneWeekOffset         Int      @default(168) // hours
  enableTwoDayReminder  Boolean  @default(true)
  twoDayOffset          Int      @default(48)
  enableOneDayReminder  Boolean  @default(true)
  oneDayOffset          Int      @default(24)
  enableDayOfReminder   Boolean  @default(true)
  dayOfOffset           Int      @default(2)

  // Retry logic
  maxRetries            Int      @default(2)
  retryDelayMinutes     Int      @default(60)

  // Operating hours
  sendStartHour         Int      @default(9)
  sendEndHour           Int      @default(20)
  sendOnWeekends        Boolean  @default(false)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  practiceSettings      PracticeSettings @relation(fields: [practiceSettingsId], references: [id])
}
```

### `AppointmentReminder`
```prisma
model AppointmentReminder {
  id               String   @id @default(uuid())
  appointmentId    String
  reminderType     String   // SMS, EMAIL, VOICE, PORTAL
  scheduledFor     DateTime
  sentAt           DateTime?
  deliveryStatus   String   // PENDING, SENT, DELIVERED, FAILED, SKIPPED
  messageId        String?  // Twilio SID or SES MessageId
  cost             Float?   @default(0.0)
  retryCount       Int      @default(0)
  errorMessage     String?

  responseReceived Boolean  @default(false)
  responseType     String?  // CONFIRMED, CANCELLED
  responseText     String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  appointment      Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  @@index([appointmentId])
  @@index([scheduledFor])
  @@index([deliveryStatus])
}
```

### Additional Fields Needed on `Appointment`
```prisma
model Appointment {
  // ... existing fields ...

  confirmationStatus String?  // PENDING, CONFIRMED, CANCELLED
  confirmationDate   DateTime?
  confirmationMethod String?  // CLIENT_SMS, CLIENT_EMAIL, STAFF, etc.

  reminders AppointmentReminder[]
}
```

---

## Integration Steps

### 1. **Update Prisma Schema**
Add the models above to `packages/database/prisma/schema.prisma`

### 2. **Run Migration**
```bash
cd packages/database
npx prisma migrate dev --name add_reminder_system
npx prisma generate
```

### 3. **Replace Old Files**
```bash
# Backup existing files first
mv packages/backend/src/services/reminder.service.ts packages/backend/src/services/reminder.service.old.ts
mv packages/backend/src/controllers/reminder.controller.ts packages/backend/src/controllers/reminder.controller.old.ts
mv packages/backend/src/routes/reminder.routes.ts packages/backend/src/routes/reminder.routes.old.ts

# Rename new files
mv packages/backend/src/services/reminder.service.new.ts packages/backend/src/services/reminder.service.ts
mv packages/backend/src/controllers/reminder.controller.new.ts packages/backend/src/controllers/reminder.controller.ts
mv packages/backend/src/routes/reminder.routes.new.ts packages/backend/src/routes/reminder.routes.ts
```

### 4. **Start Reminder Jobs**
Add to `packages/backend/src/index.ts`:
```typescript
import { startReminderJobs } from './jobs/processReminders.job';

// After server starts
startReminderJobs();
logger.info('Reminder jobs started');
```

### 5. **Update Route Registration**
Update `packages/backend/src/routes/index.ts` to use new routes:
```typescript
import reminderRoutes from './reminder.routes';
app.use('/api/v1/reminders', reminderRoutes);
```

### 6. **Configure Twilio Webhooks**
In Twilio console, set webhooks:
- **Incoming SMS:** `https://your-domain.com/api/v1/reminders/webhooks/twilio/sms`
- **Status Callback:** `https://your-domain.com/api/v1/reminders/webhooks/twilio/status`

### 7. **Configure AWS SES**
1. Verify sender email/domain in SES
2. Ensure IAM credentials have SES permissions
3. Move out of SES sandbox (if needed for production)

### 8. **Environment Variables**
Add to `.env`:
```env
# Frontend URL for links
FRONTEND_URL=https://your-app.com

# AWS SES (optional, can be configured in database)
AWS_SES_REGION=us-east-1

# Twilio (optional, can be configured in database)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

---

## Testing Checklist

### Configuration
- [ ] Create reminder configuration via API
- [ ] Update configuration settings
- [ ] Test SMS configuration (send test SMS)
- [ ] Test email configuration (send test email)

### Scheduling
- [ ] Create appointment and verify reminders are scheduled
- [ ] Update appointment and verify reminders are rescheduled
- [ ] Cancel appointment and verify reminders are deleted

### Sending
- [ ] Manually trigger reminder processing
- [ ] Verify SMS is sent and received
- [ ] Verify email is sent with .ics attachment
- [ ] Verify .ics file opens in calendar apps

### SMS Responses
- [ ] Reply "Y" to reminder and verify confirmation
- [ ] Reply "C" to reminder and verify cancellation flag
- [ ] Verify Twilio webhook receives responses

### Cron Jobs
- [ ] Verify jobs start automatically
- [ ] Wait for scheduled time and verify reminders are sent
- [ ] Verify failed reminders are retried hourly
- [ ] Check job status endpoint

### Error Handling
- [ ] Test with invalid Twilio credentials
- [ ] Test with invalid SES credentials
- [ ] Test with invalid phone number
- [ ] Test with invalid email
- [ ] Verify retry logic works

### Monitoring
- [ ] Check reminder statistics endpoint
- [ ] Verify audit logs are created
- [ ] Check application logs for errors

---

## API Documentation

### Configuration Endpoints

#### Get Configuration
```http
GET /api/v1/reminders/config
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "smsEnabled": true,
    "emailEnabled": true,
    "twilioAccountSid": "ACxxxxx...",  // Masked
    "twilioAuthToken": "***HIDDEN***",  // Masked
    // ... other config
  }
}
```

#### Update Configuration
```http
PUT /api/v1/reminders/config
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN
Content-Type: application/json

Body:
{
  "practiceSettingsId": "uuid",
  "smsEnabled": true,
  "twilioAccountSid": "ACxxxxx",
  "twilioAuthToken": "xxxxx",
  "twilioPhoneNumber": "+15551234567",
  "emailEnabled": true,
  "sesRegion": "us-east-1",
  "sesFromEmail": "reminders@clinic.com",
  "sesFromName": "Clinic Name",
  "includeIcsAttachment": true,
  "enableOneDayReminder": true,
  "oneDayOffset": 24,
  "maxRetries": 2,
  "sendStartHour": 9,
  "sendEndHour": 20,
  "sendOnWeekends": false
}

Response:
{
  "success": true,
  "message": "Reminder configuration updated successfully",
  "data": { /* config */ }
}
```

#### Test SMS
```http
POST /api/v1/reminders/test/sms
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN
Content-Type: application/json

Body:
{
  "phoneNumber": "+15551234567",
  "fromNumber": "+15557654321"
}

Response:
{
  "success": true,
  "message": "Test SMS sent successfully"
}
```

#### Test Email
```http
POST /api/v1/reminders/test/email
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN
Content-Type: application/json

Body:
{
  "email": "test@example.com",
  "fromEmail": "reminders@clinic.com"
}

Response:
{
  "success": true,
  "message": "Test email sent successfully"
}
```

### Reminder Management

#### Get Appointment Reminders
```http
GET /api/v1/reminders/appointment/:appointmentId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reminderType": "SMS",
      "scheduledFor": "2025-11-05T10:00:00Z",
      "sentAt": "2025-11-05T10:01:23Z",
      "deliveryStatus": "DELIVERED",
      "cost": 0.0075
    },
    // ... more reminders
  ]
}
```

#### Schedule Reminders
```http
POST /api/v1/reminders/appointment/:appointmentId/schedule
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Reminders scheduled successfully"
}
```

#### Resend Reminder
```http
POST /api/v1/reminders/:reminderId/resend
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Reminder resent successfully"
}
```

### Admin Operations

#### Process Reminders Manually
```http
POST /api/v1/reminders/process
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN

Response:
{
  "success": true,
  "message": "Reminder processing completed",
  "data": {
    "total": 15,
    "sent": 14,
    "failed": 1,
    "skipped": 0
  }
}
```

#### Get Job Status
```http
GET /api/v1/reminders/jobs/status
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN

Response:
{
  "success": true,
  "data": {
    "processReminders": {
      "running": true,
      "processing": false
    },
    "retryFailed": {
      "running": true,
      "processing": false
    }
  }
}
```

#### Get Statistics
```http
GET /api/v1/reminders/statistics?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer <token>
Role: ADMIN, PRACTICE_ADMIN

Response:
{
  "success": true,
  "data": [
    {
      "deliveryStatus": "DELIVERED",
      "reminderType": "SMS",
      "_count": { "id": 150 },
      "_sum": { "cost": 1.125 }
    },
    {
      "deliveryStatus": "DELIVERED",
      "reminderType": "EMAIL",
      "_count": { "id": 200 },
      "_sum": { "cost": 0 }
    },
    // ... more stats
  ]
}
```

---

## Template Variables

### SMS Templates
Available variables:
- `{{clientName}}` - Client's first name
- `{{clinicianName}}` - Clinician's full name
- `{{date}}` - Formatted appointment date
- `{{time}}` - Appointment time
- `{{appointmentType}}` - Type of appointment
- `{{location}}` - Service location

Example:
```
Hi {{clientName}}, reminder: You have an appointment with {{clinicianName}} on {{date}} at {{time}}. Reply Y to confirm or C to cancel.
```

### Email Templates
Same variables as SMS, plus HTML formatting.

---

## Cost Tracking

- **SMS costs** are automatically tracked from Twilio API responses
- **Voice call costs** are tracked from Twilio
- **Email** is essentially free via SES (only AWS costs)
- Statistics endpoint provides cost summaries

---

## Error Scenarios Handled

1. **Twilio/SES not configured** - Graceful degradation, logs warning
2. **Invalid phone number** - Validation and formatting
3. **Invalid email** - Caught by SES
4. **Delivery failures** - Automatic retry with exponential backoff
5. **Operating hours** - Reminders held until business hours
6. **Weekend restriction** - Reminders delayed to Monday
7. **Concurrent execution** - Mutex locks prevent overlapping jobs
8. **Database errors** - Comprehensive error handling and logging

---

## Monitoring and Logs

All operations log to:
- **Application log** (via Winston)
- **Audit log** (via auditLogger) for compliance

Key log events:
- Configuration changes
- Reminder sent/failed
- SMS responses received
- Job execution start/end
- Error conditions

---

## Security Considerations

1. **Credentials** are masked in API responses
2. **Webhooks** should validate Twilio signature (TODO)
3. **Admin operations** require elevated roles
4. **PHI protection** in logs (don't log full messages)
5. **Rate limiting** should be applied to test endpoints
6. **Environment variables** for sensitive data

---

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Add Prisma schema models
3. ⏳ Run database migration
4. ⏳ Update main server to start jobs
5. ⏳ Configure Twilio webhooks
6. ⏳ Configure AWS SES
7. ⏳ Build admin UI for configuration
8. ⏳ Build appointment UI to show reminders
9. ⏳ Integration testing
10. ⏳ Load testing with cron jobs

---

## Support

For questions or issues:
1. Check logs: `packages/backend/logs/`
2. Review Prisma schema for model relationships
3. Test with manual triggers before relying on cron
4. Verify Twilio/SES credentials in database

---

**Implementation Status:** ✅ **COMPLETE**

All 7 files created successfully:
1. ✅ reminder.service.new.ts (25.9 KB)
2. ✅ twilio.reminder.service.ts (8.2 KB)
3. ✅ email.reminder.service.ts (8.8 KB)
4. ✅ icsGenerator.service.ts (10.2 KB)
5. ✅ processReminders.job.ts (6.0 KB)
6. ✅ reminder.controller.new.ts (13.7 KB)
7. ✅ reminder.routes.new.ts (3.4 KB)

**Total Lines of Code:** ~2,500 LOC
**Dependencies Installed:** ical-generator (7.2.0)

Ready for integration and testing!
