# Quick Start: Integrating Reminder System

## Step 1: Database Schema (5 minutes)

Add to `packages/database/prisma/schema.prisma`:

```prisma
model ReminderConfiguration {
  id                    String   @id @default(uuid())
  practiceSettingsId    String   @unique

  smsEnabled            Boolean  @default(false)
  twilioAccountSid      String?
  twilioAuthToken       String?
  twilioPhoneNumber     String?
  smsTemplateReminder   String?
  smsTemplateConfirmation String?

  emailEnabled          Boolean  @default(false)
  sesRegion             String?  @default("us-east-1")
  sesFromEmail          String?
  sesFromName           String?
  emailTemplateSubject  String?
  emailTemplateBody     String?  @db.Text
  includeIcsAttachment  Boolean  @default(true)

  voiceEnabled          Boolean  @default(false)
  voiceScriptUrl        String?
  voiceFromNumber       String?

  enableOneWeekReminder Boolean  @default(false)
  oneWeekOffset         Int      @default(168)
  enableTwoDayReminder  Boolean  @default(true)
  twoDayOffset          Int      @default(48)
  enableOneDayReminder  Boolean  @default(true)
  oneDayOffset          Int      @default(24)
  enableDayOfReminder   Boolean  @default(true)
  dayOfOffset           Int      @default(2)

  maxRetries            Int      @default(2)
  retryDelayMinutes     Int      @default(60)
  sendStartHour         Int      @default(9)
  sendEndHour           Int      @default(20)
  sendOnWeekends        Boolean  @default(false)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  practiceSettings      PracticeSettings @relation(fields: [practiceSettingsId], references: [id])
}

model AppointmentReminder {
  id               String   @id @default(uuid())
  appointmentId    String
  reminderType     String
  scheduledFor     DateTime
  sentAt           DateTime?
  deliveryStatus   String
  messageId        String?
  cost             Float?   @default(0.0)
  retryCount       Int      @default(0)
  errorMessage     String?
  responseReceived Boolean  @default(false)
  responseType     String?
  responseText     String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  appointment      Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  @@index([appointmentId])
  @@index([scheduledFor])
  @@index([deliveryStatus])
}
```

Add to Appointment model:
```prisma
model Appointment {
  // ... existing fields ...

  confirmationStatus String?
  confirmationDate   DateTime?
  confirmationMethod String?

  reminders AppointmentReminder[]
}
```

Run migration:
```bash
cd packages/database
npx prisma migrate dev --name add_reminder_system
npx prisma generate
```

## Step 2: Activate New Files (2 minutes)

```bash
cd packages/backend/src

# Backup old files
mv services/reminder.service.ts services/reminder.service.old.ts
mv controllers/reminder.controller.ts controllers/reminder.controller.old.ts
mv routes/reminder.routes.ts routes/reminder.routes.old.ts

# Activate new files
mv services/reminder.service.new.ts services/reminder.service.ts
mv controllers/reminder.controller.new.ts controllers/reminder.controller.ts
mv routes/reminder.routes.new.ts routes/reminder.routes.ts
```

## Step 3: Update Main Server (2 minutes)

Edit `packages/backend/src/index.ts`:

```typescript
import { startReminderJobs } from './jobs/processReminders.job';

// After database connection and before server starts
async function startServer() {
  // ... existing startup code ...

  // Start reminder cron jobs
  startReminderJobs();
  logger.info('✅ Reminder jobs started');

  // Start express server
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}

startServer();
```

## Step 4: Test Configuration (5 minutes)

### Create Initial Configuration

```bash
# Start your backend
npm run dev
```

Use API client (Postman/Insomnia) or curl:

```bash
curl -X PUT http://localhost:3001/api/v1/reminders/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "practiceSettingsId": "YOUR_PRACTICE_SETTINGS_ID",
    "smsEnabled": true,
    "twilioAccountSid": "AC...",
    "twilioAuthToken": "...",
    "twilioPhoneNumber": "+15551234567",
    "emailEnabled": true,
    "sesRegion": "us-east-1",
    "sesFromEmail": "reminders@yourpractice.com",
    "sesFromName": "Your Practice Name",
    "includeIcsAttachment": true,
    "enableOneDayReminder": true,
    "oneDayOffset": 24,
    "maxRetries": 2,
    "sendStartHour": 9,
    "sendEndHour": 20,
    "sendOnWeekends": false
  }'
```

### Test SMS

```bash
curl -X POST http://localhost:3001/api/v1/reminders/test/sms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+15551234567",
    "fromNumber": "+15557654321"
  }'
```

### Test Email

```bash
curl -X POST http://localhost:3001/api/v1/reminders/test/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fromEmail": "reminders@yourpractice.com"
  }'
```

## Step 5: Hook into Appointment Creation (3 minutes)

Edit your appointment service/controller:

```typescript
import { ReminderService } from './services/reminder.service';
// ... other imports ...

// After creating appointment
async function createAppointment(data: AppointmentData) {
  // Create appointment
  const appointment = await prisma.appointment.create({ data });

  // Schedule reminders automatically
  try {
    await reminderService.scheduleRemindersForAppointment(appointment.id);
    logger.info('Reminders scheduled', { appointmentId: appointment.id });
  } catch (error) {
    logger.error('Failed to schedule reminders', { error, appointmentId: appointment.id });
    // Don't fail appointment creation if reminders fail
  }

  return appointment;
}
```

## Step 6: Configure Twilio Webhooks (2 minutes)

1. Go to Twilio Console → Phone Numbers
2. Click your phone number
3. Under "Messaging", set:
   - **Webhook URL:** `https://yourdomain.com/api/v1/reminders/webhooks/twilio/sms`
   - **Method:** POST
4. Under "Status Callback URL":
   - **URL:** `https://yourdomain.com/api/v1/reminders/webhooks/twilio/status`
   - **Method:** POST

## Step 7: Configure AWS SES (5 minutes)

1. Verify sender email:
```bash
aws ses verify-email-identity --email-address reminders@yourpractice.com --region us-east-1
```

2. Check verification status:
```bash
aws ses get-identity-verification-attributes \
  --identities reminders@yourpractice.com \
  --region us-east-1
```

3. (Optional) Move out of sandbox for production:
   - Go to AWS SES Console → Account dashboard
   - Request production access

## Step 8: Monitor (Ongoing)

### Check Job Status
```bash
curl http://localhost:3001/api/v1/reminders/jobs/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Statistics
```bash
curl "http://localhost:3001/api/v1/reminders/statistics?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Manual Processing (for testing)
```bash
curl -X POST http://localhost:3001/api/v1/reminders/process \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Reminders not sending?
1. Check job status: `GET /api/v1/reminders/jobs/status`
2. Check logs: `packages/backend/logs/`
3. Verify configuration: `GET /api/v1/reminders/config`
4. Manually trigger: `POST /api/v1/reminders/process`

### SMS not working?
1. Test SMS: `POST /api/v1/reminders/test/sms`
2. Check Twilio credentials in database
3. Verify phone number format (E.164)
4. Check Twilio console for errors

### Email not working?
1. Test email: `POST /api/v1/reminders/test/email`
2. Verify sender email in SES
3. Check if out of SES sandbox
4. Check AWS credentials/permissions

### Webhooks not working?
1. Verify webhook URLs in Twilio
2. Check that URLs are publicly accessible (use ngrok for local testing)
3. Check webhook logs in application

## Development Mode

For local testing without Twilio/SES:
- Emails will be logged to console instead of sent
- SMS sending will fail gracefully with logs
- Use manual triggers to test scheduling logic

## Production Checklist

- [ ] Database migration complete
- [ ] Twilio credentials configured
- [ ] AWS SES sender verified
- [ ] Moved out of SES sandbox
- [ ] Webhooks configured in Twilio
- [ ] Webhook URLs publicly accessible
- [ ] Cron jobs running
- [ ] Test SMS sent successfully
- [ ] Test email sent successfully
- [ ] Created test appointment with reminders
- [ ] Monitored logs for errors
- [ ] Set up alerting for failed reminders

---

**Total Setup Time: ~25 minutes**

Need help? Check `REMINDER_SYSTEM_IMPLEMENTATION_SUMMARY.md` for full documentation.
