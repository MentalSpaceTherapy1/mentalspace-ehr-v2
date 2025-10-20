# Notification System Setup Guide

## Overview

MentalSpace EHR now has a complete notification infrastructure integrated:

- **Email Notifications**: Resend API for transactional emails
- **SMS Notifications**: Twilio SMS for text message reminders
- **Video Conferencing**: Twilio Video for telehealth sessions
- **Automated Reminders**: Cron-based scheduler for appointment reminders

---

## 🎯 Current Integration Status

### ✅ Fully Implemented
- Twilio Video SDK (telehealth sessions)
- Resend Email Service (transactional emails)
- Twilio SMS Service (text messages)
- Automated reminder scheduler (cron job - every 15 minutes)
- Professional email templates (welcome, password reset, appointment reminders, note unlock)
- SMS templates (appointment reminders, confirmations, cancellations)

### ⚠️ Requires Configuration
1. **Resend API Key** - Need to add your API key
2. **Twilio Phone Number** - Need to configure your SMS-enabled phone number
3. **Resend Domain Verification** - Need to verify your sending domain

---

## 📋 Pre-Deployment Checklist

### Step 1: Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy your API key (starts with `re_...`)

### Step 2: Verify Your Email Domain with Resend

**IMPORTANT**: Resend requires domain verification before sending emails.

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `mentalspace.com`)
4. Add the DNS records provided by Resend to your domain registrar:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT)
5. Click **Verify** - this may take 24-48 hours
6. Once verified, you can send from `noreply@yourverifieddomain.com`

### Step 3: Get Twilio Phone Number (Already Have Account)

You already have Twilio credentials. You just need to:

1. Log in to [Twilio Console](https://console.twilio.com)
2. Go to **Phone Numbers** → **Buy a Number**
3. Choose a number with **SMS capability**
4. Purchase the number
5. Copy the phone number in E.164 format (e.g., `+12345678900`)

### Step 4: Update Environment Variables

Update your [`.env`](.env) file with the actual values:

```env
# Twilio SMS (for appointment reminders)
TWILIO_PHONE_NUMBER=+12345678900  # Replace with your actual Twilio SMS number

# Email Service (Resend)
RESEND_API_KEY=re_YOUR_ACTUAL_API_KEY_HERE
RESEND_FROM_EMAIL=MentalSpace EHR <noreply@yourverifieddomain.com>  # Use your verified domain
```

### Step 5: Verify Configuration

After updating the .env file, restart the backend and check the logs:

```bash
cd packages/backend
npm run dev
```

Look for these log messages:
```
✅ Database connected successfully
✅ Reminder cron job started (runs every 15 minutes)
```

---

## 🚀 Deployment to AWS

### Environment Variables for AWS ECS

Add these to your ECS Task Definition environment variables:

```json
{
  "RESEND_API_KEY": "re_YOUR_ACTUAL_API_KEY",
  "RESEND_FROM_EMAIL": "MentalSpace EHR <noreply@yourverifieddomain.com>",
  "TWILIO_PHONE_NUMBER": "+12345678900"
}
```

**OR** store them in AWS Secrets Manager for better security:

```bash
# Create secret for Resend API Key
aws secretsmanager create-secret \
  --name mentalspace/resend-api-key \
  --secret-string "re_YOUR_ACTUAL_API_KEY"

# Create secret for Twilio Phone Number
aws secretsmanager create-secret \
  --name mentalspace/twilio-phone-number \
  --secret-string "+12345678900"
```

Then update ECS task definition to reference secrets:

```json
{
  "secrets": [
    {
      "name": "RESEND_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:mentalspace/resend-api-key"
    },
    {
      "name": "TWILIO_PHONE_NUMBER",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:mentalspace/twilio-phone-number"
    }
  ]
}
```

---

## 📧 Email Features

### Available Email Templates

1. **Welcome Email** - Sent when new users are created
   - Location: [`packages/backend/src/services/resend.service.ts:85-165`](packages/backend/src/services/resend.service.ts#L85-L165)
   - Includes: Temporary password, login link

2. **Password Reset** - Sent when users request password reset
   - Location: [`packages/backend/src/services/resend.service.ts:170-227`](packages/backend/src/services/resend.service.ts#L170-L227)
   - Includes: Reset link (expires in 1 hour)

3. **Appointment Reminder** - Sent before appointments
   - Location: [`packages/backend/src/services/resend.service.ts:232-295`](packages/backend/src/services/resend.service.ts#L232-L295)
   - Includes: Provider name, date/time, location, telehealth join link

4. **Note Unlock Request** - Sent to supervisors
   - Location: [`packages/backend/src/services/resend.service.ts:300-353`](packages/backend/src/services/resend.service.ts#L300-L353)
   - Includes: Clinician name, note details, approval link

5. **Note Unlock Approved/Denied** - Sent to clinicians
   - Location: [`packages/backend/src/services/resend.service.ts:358-464`](packages/backend/src/services/resend.service.ts#L358-L464)
   - Includes: Approval status, 24-hour unlock window notice

### Development Mode

Emails are logged to console in development mode instead of being sent:
```
📧 [EMAIL] (Development Mode - Not Actually Sent via Resend)
To: user@example.com
Subject: Welcome to MentalSpace EHR
---
Hi John...
---
```

---

## 💬 SMS Features

### Available SMS Templates

1. **Appointment Reminder** - Simple text reminder
   - Location: [`packages/backend/src/services/sms.service.ts:70-82`](packages/backend/src/services/sms.service.ts#L70-L82)
   - Example: `Hi Jane, reminder: Your appointment with Dr. Smith is Tue, Jan 15 at 2:00 PM. Location: Office. Reply STOP to opt out.`

2. **Appointment Confirmation** - Request confirmation
   - Location: [`packages/backend/src/services/sms.service.ts:87-101`](packages/backend/src/services/sms.service.ts#L87-L101)
   - Example: `Hi Jane, please confirm your appointment with Dr. Smith on Tue, Jan 15 at 2:00 PM. Reply C to confirm or R to reschedule.`

3. **Appointment Cancelled** - Cancellation notice
   - Location: [`packages/backend/src/services/sms.service.ts:106-119`](packages/backend/src/services/sms.service.ts#L106-L119)

4. **Appointment Rescheduled** - Reschedule notice
   - Location: [`packages/backend/src/services/sms.service.ts:124-143`](packages/backend/src/services/sms.service.ts#L124-L143)

### Phone Number Validation

SMS service automatically formats phone numbers to E.164 format:
- `(555) 123-4567` → `+15551234567`
- `555-123-4567` → `+15551234567`
- `5551234567` → `+15551234567`

### Development Mode

SMS messages are logged to console in development mode instead of being sent:
```
📱 [SMS] (Development Mode - Not Actually Sent)
To: +15551234567
Body: Hi Jane, reminder: Your appointment...
---
```

---

## ⏰ Automated Reminder System

### How It Works

1. **Cron Job** runs every 15 minutes
   - Location: [`packages/backend/src/services/notifications/scheduler.ts:20-43`](packages/backend/src/services/notifications/scheduler.ts#L20-L43)
   - Checks for appointments in the next 72 hours

2. **Reminder Settings** per clinician
   - Default email timings: 24 hours, 2 hours before appointment
   - Default SMS timings: 24 hours, 2 hours before appointment
   - Customizable per clinician via database

3. **Reminder Processing**
   - Location: [`packages/backend/src/services/notifications/reminder.service.ts:362-406`](packages/backend/src/services/notifications/reminder.service.ts#L362-L406)
   - Checks if reminder already sent
   - Sends email or SMS based on settings
   - Logs all reminder activity to audit log

### Reminder Settings API

Clinicians can customize their reminder settings:

```typescript
// Default settings (if none exist)
{
  enabled: true,
  emailRemindersEnabled: true,
  emailReminderTimings: [24, 2],  // 24 hours and 2 hours before
  smsRemindersEnabled: false,     // SMS disabled by default
  smsReminderTimings: [24, 2],
  requireConfirmation: false,
  includeRescheduleLink: true,
  includeCancelLink: true,
  includeTelehealthLink: true
}
```

### Manual Reminder Trigger

You can manually send a reminder for a specific appointment:

```typescript
import { sendImmediateReminder } from './services/notifications/reminder.service';

// Send email reminder
await sendImmediateReminder('appointment-id', 'email');

// Send SMS reminder
await sendImmediateReminder('appointment-id', 'sms');
```

---

## 🧪 Testing

### Test Email Functionality

```bash
# In the backend directory
cd packages/backend

# Start server in development mode
npm run dev

# Server will log emails to console instead of sending
```

Create a test user or appointment and trigger an email notification. Check console for:
```
📧 [EMAIL] (Development Mode - Not Actually Sent via Resend)
```

### Test SMS Functionality

Same as email - SMS messages will be logged to console in development mode:
```
📱 [SMS] (Development Mode - Not Actually Sent)
```

### Test Production Email/SMS

To test actual sending in development:

1. Temporarily set `NODE_ENV=production` in `.env`
2. Add valid `RESEND_API_KEY` and `TWILIO_PHONE_NUMBER`
3. Restart server
4. Trigger a notification
5. Check your email/phone for actual messages
6. **IMPORTANT**: Set `NODE_ENV=development` back when done

---

## 📊 Monitoring & Logs

### Audit Logs

All email and SMS sent are logged to the audit log:

```typescript
// Email sent
{
  action: 'EMAIL_REMINDER_SENT',
  appointmentId: 'uuid',
  clientId: 'uuid',
  email: 'client@example.com',
  timestamp: '2025-01-15T10:00:00Z'
}

// SMS sent
{
  action: 'SMS_REMINDER_SENT',
  appointmentId: 'uuid',
  clientId: 'uuid',
  phone: '+15551234567',
  timestamp: '2025-01-15T10:00:00Z'
}
```

### Reminder Processing Logs

Every 15 minutes, the cron job logs:

```
🔔 Starting scheduled reminder processing...
✅ Reminder processing completed {
  total: 5,
  emailSent: 3,
  smsSent: 2,
  failed: 0
}
```

### Error Handling

Failed notifications generate error logs with unique error IDs:

```
❌ Error sending email via Resend: {
  errorId: 'ERR-1705324800000-abc123',
  errorType: 'NetworkError',
  appointmentId: 'uuid'
}
```

---

## 🔒 Security Considerations

### API Keys
- Store `RESEND_API_KEY` and `TWILIO_PHONE_NUMBER` in AWS Secrets Manager (not in code)
- Rotate API keys every 90 days
- Use environment-specific keys (dev, staging, production)

### PHI Protection
- Email/SMS templates do not include sensitive medical information
- Only basic appointment details are sent (date, time, location)
- All notifications logged to audit log for HIPAA compliance

### Rate Limiting
- Resend: 10,000 emails/month on free tier, unlimited on paid
- Twilio SMS: Pay per message (~$0.0075 per SMS)
- Reminder cron job processes only necessary reminders (15-minute windows)

---

## 💰 Cost Estimates

### Resend Pricing
- **Free Tier**: 3,000 emails/month, 1 verified domain
- **Pro Tier**: $20/month for 50,000 emails/month
- **Estimate**: For 100 clients with 4 emails/month each = 400 emails/month = **FREE**

### Twilio SMS Pricing
- **Cost**: ~$0.0075 per SMS in US
- **Estimate**: For 100 clients with 2 reminders/month each = 200 SMS/month = **$1.50/month**

### Twilio Video Pricing
- **Already configured** - you have credentials
- **Cost**: Pay-as-you-go based on participant minutes

---

## 🆘 Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**:
   ```bash
   echo $RESEND_API_KEY
   # Should start with re_
   ```

2. **Verify Domain**:
   - Log in to [Resend Dashboard](https://resend.com/domains)
   - Ensure domain status is "Verified"

3. **Check Logs**:
   ```bash
   # Look for errors in backend logs
   tail -f packages/backend/logs/combined.log
   ```

4. **Test in Development Mode**:
   - Set `NODE_ENV=development`
   - Check console for email content

### SMS Not Sending

1. **Check Twilio Phone Number**:
   ```bash
   echo $TWILIO_PHONE_NUMBER
   # Should be in E.164 format: +12345678900
   ```

2. **Verify SMS Capability**:
   - Log in to [Twilio Console](https://console.twilio.com)
   - Go to **Phone Numbers** → **Active Numbers**
   - Ensure your number has SMS capability enabled

3. **Check Phone Number Format**:
   - Client phone numbers must be in valid format
   - Service auto-formats US numbers

### Reminders Not Processing

1. **Check Cron Job Status**:
   ```bash
   # Look for this log on server startup
   ✅ Reminder cron job started (runs every 15 minutes)
   ```

2. **Verify Appointments Exist**:
   - Check that appointments are `SCHEDULED` status
   - Verify appointments are within next 72 hours

3. **Check Reminder Settings**:
   - Ensure clinician has reminders enabled
   - Verify email/SMS reminder timings are configured

---

## 📝 Files Created/Modified

### New Files
- [`packages/backend/src/services/resend.service.ts`](packages/backend/src/services/resend.service.ts) - Resend email integration
- [`packages/backend/src/services/sms.service.ts`](packages/backend/src/services/sms.service.ts) - Twilio SMS integration
- [`packages/backend/src/services/notifications/reminder.service.ts`](packages/backend/src/services/notifications/reminder.service.ts) - Reminder processing logic
- [`packages/backend/src/services/notifications/scheduler.ts`](packages/backend/src/services/notifications/scheduler.ts) - Cron job scheduler

### Modified Files
- [`packages/backend/src/config/index.ts`](packages/backend/src/config/index.ts) - Added Resend and Twilio SMS config
- [`packages/backend/src/index.ts`](packages/backend/src/index.ts) - Integrated notification scheduler
- [`.env`](.env) - Added Resend and Twilio SMS environment variables

### Existing Integrations
- [`packages/backend/src/services/twilio.service.ts`](packages/backend/src/services/twilio.service.ts) - Twilio Video (already working)
- [`packages/backend/src/services/email.service.ts`](packages/backend/src/services/email.service.ts) - Legacy Nodemailer (deprecated, keep for reference)

---

## ✅ Final Steps Before Launch

1. ☐ Sign up for Resend account
2. ☐ Get Resend API key
3. ☐ Verify your sending domain with Resend (DNS records)
4. ☐ Purchase Twilio SMS-enabled phone number
5. ☐ Update `.env` with actual values
6. ☐ Test email sending in development
7. ☐ Test SMS sending in development
8. ☐ Update AWS ECS task definition with environment variables
9. ☐ Deploy to production
10. ☐ Monitor logs for first 24 hours

---

## 📞 Support

**Resend Support**: [https://resend.com/support](https://resend.com/support)
**Twilio Support**: [https://support.twilio.com](https://support.twilio.com)

---

**You're ready to deploy!** 🚀

Once you add the Resend API key and Twilio phone number to your `.env` file, the notification system will be fully operational.
