# Module 3: Scheduling & Calendar Management - Implementation Plan
## Completing Critical Gaps for Production Readiness

**Document Version**: 1.0
**Date Created**: November 2, 2025
**Based On**: MODULE_3_VERIFICATION_REPORT.md
**Target**: 100% PRD Compliance
**Current Status**: 50% Complete → Target: 100% Complete

---

## Executive Summary

This implementation plan addresses the **critical 50% gap** in Module 3 (Scheduling & Calendar Management), focusing on features with direct revenue impact and service expansion capabilities. The module currently has a solid foundation for individual scheduling but is missing automated reminders (10% implemented), group therapy management (0%), and AI optimization features (0%).

**Gap Summary from Verification Report**:
- 🔴 **CRITICAL GAPS**: Automated reminders (2x revenue impact from no-show reduction)
- 🔴 **SERVICE GAPS**: Group appointment management (cannot serve group therapy)
- 🟡 **EFFICIENCY GAPS**: Waitlist automation, provider availability, scheduling analytics
- 🟢 **OPTIMIZATION GAPS**: AI scheduling assistant, no-show prediction, intelligent matching

**Timeline**: 16 weeks (4 months)
**Resources Required**: 2 senior developers, 1 DevOps engineer (for Twilio/AWS setup), 1 QA engineer
**Estimated Cost**: $120,000 - $160,000

**Priority Order**:
1. **Phase 1 (Weeks 1-4)**: Automated reminders + Appointment_Types + No-show prediction
2. **Phase 2 (Weeks 5-8)**: Group management + Waitlist automation + Provider availability
3. **Phase 3 (Weeks 9-12)**: Advanced calendar features + Analytics
4. **Phase 4 (Weeks 13-16)**: AI scheduling assistant

---

## Phase 1: Critical Revenue Protection (Weeks 1-4) 🔴

**Goal**: Implement automated reminder system to reduce no-shows from ~20% to <10%, enabling 2x revenue recovery

### 1.1 Automated Reminder System

**Priority**: 🔴 CRITICAL - 2x Revenue Impact
**Effort**: 3-4 weeks
**Dependencies**: Twilio account, AWS SES/SNS setup
**Gap Reference**: Report Section 2.3, lines 199-230

#### Business Impact
- **Current State**: 15-20% no-show rate, manual reminder calling
- **Target State**: <10% no-show rate per PRD line 832
- **Revenue Impact**: 10-15% increase in billable hours through no-show reduction
- **ROI**: 3-6 months payback period

#### Database Schema Changes

```prisma
// New table for tracking all reminder attempts and responses
model AppointmentReminder {
  id                String   @id @default(uuid())
  appointmentId     String
  reminderType      String   // SMS, EMAIL, VOICE, PORTAL
  scheduledFor      DateTime // When the reminder should be sent
  sentAt            DateTime?
  deliveryStatus    String   // PENDING, SENT, DELIVERED, FAILED, BOUNCED
  responseReceived  Boolean  @default(false)
  responseType      String?  // CONFIRMED, CANCELLED, RESCHEDULED, NO_RESPONSE
  responseText      String?  @db.Text
  failureReason     String?  @db.Text
  retryCount        Int      @default(0)
  lastRetryAt       DateTime?

  // Twilio/AWS metadata
  messageId         String?  // External provider message ID
  cost              Float?   // Track reminder costs

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  @@index([appointmentId])
  @@index([scheduledFor])
  @@index([deliveryStatus])
  @@index([sentAt])
}

// Update Appointment model
model Appointment {
  // Existing fields...

  // Enhanced reminder tracking
  reminders AppointmentReminder[]

  // Keep existing flags for backward compatibility
  emailReminderSent   Boolean?
  emailReminderDate   DateTime?
  smsReminderSent     Boolean?
  smsReminderDate     DateTime?

  // New confirmation tracking
  confirmedAt         DateTime?
  confirmedBy         String?  // USER, CLIENT_SMS, CLIENT_PORTAL, CLIENT_VOICE
  confirmationMethod  String?  // SMS_REPLY, PORTAL_CLICK, VOICE_RESPONSE, MANUAL
}

// Practice-level reminder configuration
model ReminderConfiguration {
  id                    String   @id @default(uuid())
  practiceSettingsId    String   @unique

  // Reminder Schedule
  enableInitialConfirmation    Boolean @default(true)  // Send immediately after booking
  enableOneWeekReminder        Boolean @default(true)
  enableTwoDayReminder         Boolean @default(true)
  enableOneDayReminder         Boolean @default(true)
  enableDayOfReminder          Boolean @default(true)
  enablePostAppointmentFollowup Boolean @default(false)

  // Time offsets (in hours before appointment)
  oneWeekOffset         Int @default(168)  // 7 days
  twoDayOffset          Int @default(48)
  oneDayOffset          Int @default(24)
  dayOfOffset           Int @default(2)    // 2 hours before

  // Channel preferences
  defaultChannels       String[] // ['SMS', 'EMAIL']
  smsEnabled            Boolean @default(false)
  emailEnabled          Boolean @default(true)
  voiceEnabled          Boolean @default(false)
  portalEnabled         Boolean @default(true)

  // SMS Configuration (Twilio)
  twilioAccountSid      String?
  twilioAuthToken       String?  // Encrypted
  twilioPhoneNumber     String?
  smsTemplateInitial    String?  @db.Text
  smsTemplateReminder   String?  @db.Text

  // Email Configuration (AWS SES)
  sesRegion             String?
  sesFromEmail          String?
  sesFromName           String?
  emailTemplateSubject  String?
  emailTemplateBody     String?  @db.Text
  includeIcsAttachment  Boolean @default(true)

  // Voice Configuration (Twilio Voice)
  voiceScriptUrl        String?
  voiceFromNumber       String?

  // Retry logic
  maxRetries            Int @default(2)
  retryDelayMinutes     Int @default(60)

  // Operating hours (don't send outside these times)
  sendStartHour         Int @default(9)   // 9 AM
  sendEndHour           Int @default(20)  // 8 PM
  sendOnWeekends        Boolean @default(false)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  practiceSettings PracticeSettings @relation(fields: [practiceSettingsId], references: [id])
}
```

#### Backend Implementation

**Files to Create**:

1. **`packages/backend/src/services/reminder.service.ts`** - Core reminder orchestration
```typescript
import { PrismaClient } from '@prisma/client';
import { TwilioService } from './twilio.service';
import { EmailService } from './email.service';
import { IcsGeneratorService } from './icsGenerator.service';

interface ReminderSchedule {
  appointmentId: string;
  clientPhone?: string;
  clientEmail?: string;
  appointmentDate: Date;
  clinicianName: string;
  clientName: string;
}

export class ReminderService {
  constructor(
    private prisma: PrismaClient,
    private twilioService: TwilioService,
    private emailService: EmailService,
    private icsService: IcsGeneratorService
  ) {}

  /**
   * Schedule all reminders for a new appointment
   */
  async scheduleRemindersForAppointment(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        clinician: true,
      },
    });

    if (!appointment) throw new Error('Appointment not found');

    const config = await this.getReminderConfig();
    const reminderSchedule = this.calculateReminderSchedule(
      appointment.appointmentDate,
      config
    );

    // Create reminder records for each scheduled time
    for (const schedule of reminderSchedule) {
      await this.createReminder({
        appointmentId,
        reminderType: schedule.type,
        scheduledFor: schedule.sendAt,
      });
    }
  }

  /**
   * Process pending reminders (called by cron job)
   */
  async processPendingReminders(): Promise<void> {
    const now = new Date();

    const pendingReminders = await this.prisma.appointmentReminder.findMany({
      where: {
        deliveryStatus: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
    });

    for (const reminder of pendingReminders) {
      await this.sendReminder(reminder);
    }
  }

  /**
   * Send a single reminder
   */
  private async sendReminder(reminder: any): Promise<void> {
    const { appointment } = reminder;
    const config = await this.getReminderConfig();

    try {
      switch (reminder.reminderType) {
        case 'SMS':
          if (config.smsEnabled && appointment.client.cellPhone) {
            await this.sendSmsReminder(reminder, appointment, config);
          }
          break;

        case 'EMAIL':
          if (config.emailEnabled && appointment.client.email) {
            await this.sendEmailReminder(reminder, appointment, config);
          }
          break;

        case 'VOICE':
          if (config.voiceEnabled && appointment.client.cellPhone) {
            await this.sendVoiceReminder(reminder, appointment, config);
          }
          break;

        case 'PORTAL':
          await this.sendPortalNotification(reminder, appointment);
          break;
      }

      await this.prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          deliveryStatus: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await this.handleReminderFailure(reminder, error);
    }
  }

  /**
   * Send SMS reminder via Twilio
   */
  private async sendSmsReminder(
    reminder: any,
    appointment: any,
    config: any
  ): Promise<void> {
    const message = this.formatSmsMessage(appointment, config);

    const result = await this.twilioService.sendSms({
      to: appointment.client.cellPhone,
      from: config.twilioPhoneNumber,
      body: message,
    });

    await this.prisma.appointmentReminder.update({
      where: { id: reminder.id },
      data: {
        messageId: result.sid,
        deliveryStatus: result.status === 'sent' ? 'DELIVERED' : 'SENT',
        cost: parseFloat(result.price || '0'),
      },
    });
  }

  /**
   * Send email reminder with .ics attachment
   */
  private async sendEmailReminder(
    reminder: any,
    appointment: any,
    config: any
  ): Promise<void> {
    const icsContent = config.includeIcsAttachment
      ? await this.icsService.generateIcsFile(appointment)
      : null;

    const emailHtml = this.formatEmailMessage(appointment, config);

    await this.emailService.sendEmail({
      to: appointment.client.email,
      from: `${config.sesFromName} <${config.sesFromEmail}>`,
      subject: this.formatEmailSubject(appointment, config),
      html: emailHtml,
      attachments: icsContent
        ? [
            {
              filename: 'appointment.ics',
              content: icsContent,
              contentType: 'text/calendar',
            },
          ]
        : [],
    });
  }

  /**
   * Format SMS message with template variables
   */
  private formatSmsMessage(appointment: any, config: any): string {
    const template = config.smsTemplateReminder ||
      'Hi {{clientName}}, reminder: You have an appointment with {{clinicianName}} on {{date}} at {{time}}. Reply Y to confirm or C to cancel.';

    return template
      .replace('{{clientName}}', appointment.client.firstName)
      .replace('{{clinicianName}}', appointment.clinician.fullName)
      .replace('{{date}}', this.formatDate(appointment.appointmentDate))
      .replace('{{time}}', this.formatTime(appointment.startTime));
  }

  /**
   * Handle SMS response (Y/N confirmation)
   */
  async handleSmsResponse(
    from: string,
    body: string,
    messageId: string
  ): Promise<void> {
    // Find the most recent reminder sent to this phone number
    const reminder = await this.prisma.appointmentReminder.findFirst({
      where: {
        appointment: {
          client: {
            cellPhone: from,
          },
        },
        reminderType: 'SMS',
        sentAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
        },
      },
      include: {
        appointment: true,
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    if (!reminder) return;

    const response = body.trim().toUpperCase();

    if (response === 'Y' || response === 'YES' || response === 'CONFIRM') {
      await this.confirmAppointment(reminder.appointment, 'CLIENT_SMS');
    } else if (response === 'C' || response === 'CANCEL') {
      await this.cancelAppointmentFromSms(reminder.appointment);
    }

    // Update reminder with response
    await this.prisma.appointmentReminder.update({
      where: { id: reminder.id },
      data: {
        responseReceived: true,
        responseType: response.startsWith('Y') ? 'CONFIRMED' : 'CANCELLED',
        responseText: body,
      },
    });
  }

  /**
   * Calculate when reminders should be sent
   */
  private calculateReminderSchedule(
    appointmentDate: Date,
    config: any
  ): Array<{ type: string; sendAt: Date }> {
    const schedule: Array<{ type: string; sendAt: Date }> = [];
    const apptTime = appointmentDate.getTime();

    if (config.enableOneWeekReminder) {
      schedule.push({
        type: 'SMS',
        sendAt: new Date(apptTime - config.oneWeekOffset * 60 * 60 * 1000),
      });
    }

    if (config.enableTwoDayReminder) {
      schedule.push({
        type: 'EMAIL',
        sendAt: new Date(apptTime - config.twoDayOffset * 60 * 60 * 1000),
      });
    }

    if (config.enableOneDayReminder) {
      schedule.push({
        type: 'SMS',
        sendAt: new Date(apptTime - config.oneDayOffset * 60 * 60 * 1000),
      });
    }

    if (config.enableDayOfReminder) {
      schedule.push({
        type: 'SMS',
        sendAt: new Date(apptTime - config.dayOfOffset * 60 * 60 * 1000),
      });
    }

    return schedule;
  }

  // Additional helper methods...
}
```

2. **`packages/backend/src/services/twilio.service.ts`** - Twilio SMS/Voice integration
```typescript
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';

interface SmsOptions {
  to: string;
  from: string;
  body: string;
}

interface VoiceOptions {
  to: string;
  from: string;
  url: string; // TwiML script URL
}

export class TwilioService {
  private client: any;

  constructor(private prisma: PrismaClient) {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const config = await this.prisma.reminderConfiguration.findFirst();

    if (config?.twilioAccountSid && config?.twilioAuthToken) {
      this.client = twilio(
        config.twilioAccountSid,
        config.twilioAuthToken
      );
    }
  }

  async sendSms(options: SmsOptions): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    return await this.client.messages.create({
      body: options.body,
      to: options.to,
      from: options.from,
    });
  }

  async makeVoiceCall(options: VoiceOptions): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    return await this.client.calls.create({
      url: options.url,
      to: options.to,
      from: options.from,
    });
  }

  /**
   * Webhook handler for incoming SMS (confirmations)
   */
  async handleIncomingSms(req: any): Promise<string> {
    const { From, Body, MessageSid } = req.body;

    // Process the response through ReminderService
    // Return TwiML response

    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Thank you! Your response has been recorded.</Message>
      </Response>`;
  }

  /**
   * Webhook handler for delivery status updates
   */
  async handleStatusCallback(req: any): Promise<void> {
    const { MessageSid, MessageStatus } = req.body;

    await this.prisma.appointmentReminder.updateMany({
      where: { messageId: MessageSid },
      data: {
        deliveryStatus: this.mapTwilioStatus(MessageStatus),
      },
    });
  }

  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'PENDING',
      'sending': 'SENT',
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'undelivered': 'FAILED',
      'failed': 'FAILED',
    };
    return statusMap[twilioStatus] || 'PENDING';
  }
}
```

3. **`packages/backend/src/services/email.service.ts`** - AWS SES email integration
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PrismaClient } from '@prisma/client';

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export class EmailService {
  private sesClient: SESClient;

  constructor(private prisma: PrismaClient) {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const config = await this.prisma.reminderConfiguration.findFirst();

    this.sesClient = new SESClient({
      region: config?.sesRegion || 'us-east-1',
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const params = {
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: options.html,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: options.subject,
        },
      },
      Source: options.from,
    };

    const command = new SendEmailCommand(params);
    await this.sesClient.send(command);
  }
}
```

4. **`packages/backend/src/services/icsGenerator.service.ts`** - Generate .ics calendar files
```typescript
import ical from 'ical-generator';

export class IcsGeneratorService {
  async generateIcsFile(appointment: any): Promise<string> {
    const calendar = ical({ name: 'MentalSpace Appointment' });

    calendar.createEvent({
      start: new Date(appointment.appointmentDate),
      end: new Date(
        appointment.appointmentDate.getTime() + appointment.duration * 60 * 1000
      ),
      summary: `Appointment with ${appointment.clinician.fullName}`,
      description: `${appointment.appointmentType} session`,
      location: appointment.serviceLocation === 'IN_PERSON'
        ? appointment.officeLocation?.address
        : 'Telehealth',
      organizer: {
        name: appointment.clinician.fullName,
        email: appointment.clinician.email,
      },
      attendees: [
        {
          name: `${appointment.client.firstName} ${appointment.client.lastName}`,
          email: appointment.client.email,
        },
      ],
    });

    return calendar.toString();
  }
}
```

5. **`packages/backend/src/jobs/processReminders.job.ts`** - Cron job for reminder processing
```typescript
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { ReminderService } from '../services/reminder.service';
import { TwilioService } from '../services/twilio.service';
import { EmailService } from '../services/email.service';
import { IcsGeneratorService } from '../services/icsGenerator.service';

const prisma = new PrismaClient();

const twilioService = new TwilioService(prisma);
const emailService = new EmailService(prisma);
const icsService = new IcsGeneratorService();
const reminderService = new ReminderService(
  prisma,
  twilioService,
  emailService,
  icsService
);

/**
 * Process pending reminders every 5 minutes
 */
export const processRemindersJob = cron.schedule('*/5 * * * *', async () => {
  console.log('🔔 Processing pending appointment reminders...');

  try {
    await reminderService.processPendingReminders();
    console.log('✅ Reminder processing complete');
  } catch (error) {
    console.error('❌ Error processing reminders:', error);
  }
});

/**
 * Retry failed reminders every hour
 */
export const retryFailedRemindersJob = cron.schedule('0 * * * *', async () => {
  console.log('🔄 Retrying failed reminders...');

  try {
    await reminderService.retryFailedReminders();
    console.log('✅ Retry processing complete');
  } catch (error) {
    console.error('❌ Error retrying reminders:', error);
  }
});
```

6. **`packages/backend/src/controllers/reminder.controller.ts`** - API endpoints
```typescript
import { Request, Response } from 'express';
import { ReminderService } from '../services/reminder.service';
import { TwilioService } from '../services/twilio.service';

export class ReminderController {
  constructor(
    private reminderService: ReminderService,
    private twilioService: TwilioService
  ) {}

  /**
   * GET /api/v1/reminders/config
   * Get reminder configuration
   */
  getConfig = async (req: Request, res: Response) => {
    try {
      const config = await this.reminderService.getReminderConfig();
      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/reminders/config
   * Update reminder configuration
   */
  updateConfig = async (req: Request, res: Response) => {
    try {
      const config = await this.reminderService.updateReminderConfig(req.body);
      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/reminders/test-sms
   * Test SMS configuration
   */
  testSms = async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      await this.twilioService.sendSms({
        to: phoneNumber,
        from: req.body.from,
        body: 'This is a test message from MentalSpace EHR.',
      });
      res.json({ success: true, message: 'Test SMS sent successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/reminders/webhooks/twilio/sms
   * Twilio webhook for incoming SMS
   */
  twilioSmsWebhook = async (req: Request, res: Response) => {
    try {
      const twiml = await this.twilioService.handleIncomingSms(req);
      res.type('text/xml');
      res.send(twiml);
    } catch (error: any) {
      res.status(500).send('Error processing SMS');
    }
  };

  /**
   * POST /api/v1/reminders/webhooks/twilio/status
   * Twilio webhook for delivery status
   */
  twilioStatusWebhook = async (req: Request, res: Response) => {
    try {
      await this.twilioService.handleStatusCallback(req);
      res.sendStatus(200);
    } catch (error: any) {
      res.status(500).send('Error processing status');
    }
  };

  /**
   * GET /api/v1/appointments/:id/reminders
   * Get all reminders for an appointment
   */
  getAppointmentReminders = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reminders = await this.reminderService.getRemindersForAppointment(id);
      res.json({ success: true, data: reminders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/appointments/:id/reminders/resend
   * Manually resend a reminder
   */
  resendReminder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { type } = req.body; // SMS, EMAIL, VOICE
      await this.reminderService.manuallyResendReminder(id, type);
      res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
```

7. **`packages/backend/src/routes/reminder.routes.ts`**
```typescript
import { Router } from 'express';
import { ReminderController } from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new ReminderController();

// Configuration endpoints (admin only)
router.get('/config', authenticate, controller.getConfig);
router.put('/config', authenticate, controller.updateConfig);
router.post('/test-sms', authenticate, controller.testSms);

// Webhook endpoints (no auth - Twilio)
router.post('/webhooks/twilio/sms', controller.twilioSmsWebhook);
router.post('/webhooks/twilio/status', controller.twilioStatusWebhook);

export default router;
```

#### Frontend Implementation

**Files to Create**:

1. **`packages/frontend/src/pages/Settings/ReminderSettings.tsx`** - Configuration UI
```typescript
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  Notifications,
  Sms,
  Email,
  Phone,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../lib/api';

export default function ReminderSettings() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/reminders/config');
      setConfig(response.data.data);
    } catch (error: any) {
      setErrorMessage('Failed to load reminder configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/reminders/config', config);
      setSuccessMessage('Reminder settings saved successfully');
    } catch (error: any) {
      setErrorMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    try {
      setTestingConnection(true);
      await api.post('/reminders/test-sms', {
        phoneNumber: config.twilioPhoneNumber,
        from: config.twilioPhoneNumber,
      });
      setSuccessMessage('Test SMS sent successfully!');
    } catch (error: any) {
      setErrorMessage('Failed to send test SMS');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Notifications sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Appointment Reminder Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure automated reminders to reduce no-shows
          </Typography>
        </Box>
      </Stack>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Reminder Schedule */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reminder Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose when to send reminders before appointments
          </Typography>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={config?.enableInitialConfirmation}
                  onChange={(e) =>
                    setConfig({ ...config, enableInitialConfirmation: e.target.checked })
                  }
                />
              }
              label="Initial confirmation (immediately after booking)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config?.enableOneWeekReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableOneWeekReminder: e.target.checked })
                  }
                />
              }
              label="One week before reminder"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config?.enableTwoDayReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableTwoDayReminder: e.target.checked })
                  }
                />
              }
              label="48-hour reminder"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config?.enableOneDayReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableOneDayReminder: e.target.checked })
                  }
                />
              }
              label="24-hour reminder"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config?.enableDayOfReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableDayOfReminder: e.target.checked })
                  }
                />
              }
              label="Day-of reminder (2 hours before)"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* SMS Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Sms color="primary" />
            <Typography variant="h6">SMS Configuration (Twilio)</Typography>
            {config?.smsEnabled && (
              <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
            )}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={config?.smsEnabled}
                onChange={(e) => setConfig({ ...config, smsEnabled: e.target.checked })}
              />
            }
            label="Enable SMS reminders"
          />

          {config?.smsEnabled && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Twilio Account SID"
                value={config?.twilioAccountSid || ''}
                onChange={(e) =>
                  setConfig({ ...config, twilioAccountSid: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="Twilio Auth Token"
                type="password"
                value={config?.twilioAuthToken || ''}
                onChange={(e) =>
                  setConfig({ ...config, twilioAuthToken: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="Twilio Phone Number"
                value={config?.twilioPhoneNumber || ''}
                onChange={(e) =>
                  setConfig({ ...config, twilioPhoneNumber: e.target.value })
                }
                helperText="Format: +1234567890"
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="SMS Template"
                value={config?.smsTemplateReminder || ''}
                onChange={(e) =>
                  setConfig({ ...config, smsTemplateReminder: e.target.value })
                }
                helperText="Use {{clientName}}, {{clinicianName}}, {{date}}, {{time}}"
              />
              <Button
                variant="outlined"
                onClick={handleTestSms}
                disabled={testingConnection}
              >
                {testingConnection ? 'Sending...' : 'Send Test SMS'}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Email color="primary" />
            <Typography variant="h6">Email Configuration (AWS SES)</Typography>
            {config?.emailEnabled && (
              <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
            )}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={config?.emailEnabled}
                onChange={(e) => setConfig({ ...config, emailEnabled: e.target.checked })}
              />
            }
            label="Enable email reminders"
          />

          {config?.emailEnabled && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="From Email"
                value={config?.sesFromEmail || ''}
                onChange={(e) => setConfig({ ...config, sesFromEmail: e.target.value })}
              />
              <TextField
                fullWidth
                label="From Name"
                value={config?.sesFromName || ''}
                onChange={(e) => setConfig({ ...config, sesFromName: e.target.value })}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config?.includeIcsAttachment}
                    onChange={(e) =>
                      setConfig({ ...config, includeIcsAttachment: e.target.checked })
                    }
                  />
                }
                label="Include calendar .ics attachment"
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        onClick={handleSave}
        disabled={saving}
        fullWidth
      >
        {saving ? 'Saving...' : 'Save Reminder Settings'}
      </Button>
    </Box>
  );
}
```

2. **`packages/frontend/src/components/Appointments/ReminderStatusBadge.tsx`** - Show reminder status on appointments
```typescript
import { Chip, Tooltip, Stack } from '@mui/material';
import {
  CheckCircle,
  Pending,
  Error,
  Sms,
  Email,
} from '@mui/icons-material';

interface ReminderStatusBadgeProps {
  reminders: Array<{
    reminderType: string;
    deliveryStatus: string;
    responseReceived: boolean;
    responseType?: string;
  }>;
}

export default function ReminderStatusBadge({ reminders }: ReminderStatusBadgeProps) {
  const smsReminders = reminders.filter((r) => r.reminderType === 'SMS');
  const emailReminders = reminders.filter((r) => r.reminderType === 'EMAIL');

  const getIcon = (status: string, responseReceived: boolean) => {
    if (responseReceived) return <CheckCircle />;
    if (status === 'DELIVERED') return <CheckCircle />;
    if (status === 'FAILED') return <Error />;
    return <Pending />;
  };

  const getColor = (status: string, responseReceived: boolean) => {
    if (responseReceived) return 'success';
    if (status === 'DELIVERED') return 'info';
    if (status === 'FAILED') return 'error';
    return 'default';
  };

  return (
    <Stack direction="row" spacing={1}>
      {smsReminders.length > 0 && (
        <Tooltip title={`${smsReminders.length} SMS reminder(s)`}>
          <Chip
            icon={<Sms />}
            label={smsReminders.length}
            size="small"
            color={getColor(
              smsReminders[0].deliveryStatus,
              smsReminders[0].responseReceived
            )}
          />
        </Tooltip>
      )}
      {emailReminders.length > 0 && (
        <Tooltip title={`${emailReminders.length} Email reminder(s)`}>
          <Chip
            icon={<Email />}
            label={emailReminders.length}
            size="small"
            color={getColor(
              emailReminders[0].deliveryStatus,
              emailReminders[0].responseReceived
            )}
          />
        </Tooltip>
      )}
    </Stack>
  );
}
```

#### NPM Dependencies

```json
{
  "dependencies": {
    "twilio": "^5.0.0",
    "@aws-sdk/client-ses": "^3.450.0",
    "ical-generator": "^7.0.0",
    "node-cron": "^3.0.3"
  }
}
```

#### Testing Requirements

**Unit Tests**:
- ReminderService.calculateReminderSchedule()
- Message template formatting
- Retry logic for failed reminders
- SMS response parsing (Y/N/C)

**Integration Tests**:
- End-to-end reminder flow (create appointment → schedule reminders → send)
- Twilio SMS delivery
- AWS SES email delivery
- Webhook handling (status callbacks, incoming SMS)

**Manual Tests**:
1. Configure Twilio credentials
2. Create test appointment
3. Verify reminders are scheduled
4. Wait for reminder send time
5. Confirm SMS/email received
6. Test Y/N responses
7. Verify reminder tracking in database

#### Success Criteria

- ✅ Reminders automatically scheduled for all new appointments
- ✅ SMS reminders delivered within 1 minute of scheduled time
- ✅ Email reminders include .ics calendar attachment
- ✅ Client responses (Y/N) update appointment confirmation status
- ✅ Failed reminders automatically retry up to 2 times
- ✅ Reminder delivery status tracked in database
- ✅ Admin can configure reminder schedule and templates
- ✅ No-show rate reduces from 20% to <10% within 3 months

---

### 1.2 Appointment_Types Table

**Priority**: 🔴 CRITICAL - Enables smart defaults and business rules
**Effort**: 1 week
**Dependencies**: None
**Gap Reference**: Report Section 1.2, lines 99-102

#### Database Schema

```prisma
model AppointmentType {
  id                  String   @id @default(uuid())
  typeName            String   @unique // "Initial Consultation", "Follow-up", "Group Therapy"
  category            String   // INDIVIDUAL, GROUP, FAMILY, COUPLES
  description         String?  @db.Text

  // Scheduling defaults
  defaultDuration     Int      // Minutes
  bufferBefore        Int      @default(0) // Minutes
  bufferAfter         Int      @default(15) // Minutes

  // Business rules
  isBillable          Boolean  @default(true)
  requiresAuth        Boolean  @default(false) // Prior authorization required
  requiresSupervisor  Boolean  @default(false) // Supervision required
  maxPerDay           Int?     // Max appointments of this type per day

  // Billing
  cptCode             String?  // Default CPT code
  defaultRate         Float?   // Default charge amount

  // Visual
  colorCode           String?  // Hex color for calendar display
  iconName            String?  // Material-UI icon name

  // Availability
  isActive            Boolean  @default(true)
  allowOnline Booking Boolean  @default(false)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  appointments        Appointment[]
}

// Update Appointment model
model Appointment {
  // Add new field
  appointmentTypeId   String?
  appointmentTypeObj  AppointmentType? @relation(fields: [appointmentTypeId], references: [id])

  // Keep old field for backward compatibility
  appointmentType     String?
}
```

#### Backend Implementation

1. **`packages/backend/src/services/appointmentType.service.ts`**
2. **`packages/backend/src/controllers/appointmentType.controller.ts`**
3. **`packages/backend/src/routes/appointmentType.routes.ts`**

**API Endpoints**:
- GET /api/v1/appointment-types
- POST /api/v1/appointment-types
- PUT /api/v1/appointment-types/:id
- DELETE /api/v1/appointment-types/:id

#### Frontend Implementation

1. **`packages/frontend/src/pages/Settings/AppointmentTypes.tsx`** - Manage types
2. **Update AppointmentForm.tsx** - Use types for smart defaults

#### Success Criteria

- ✅ Admin can create/edit/delete appointment types
- ✅ Appointment form auto-fills duration based on selected type
- ✅ Calendar displays type-specific colors
- ✅ Buffer times automatically block adjacent slots
- ✅ Max-per-day limits enforced in scheduling

---

### 1.3 No-Show Risk Prediction

**Priority**: 🟡 HIGH - AI-powered no-show reduction
**Effort**: 2 weeks
**Dependencies**: Historical appointment data
**Gap Reference**: Report Section 2.4, lines 242-271

#### Database Schema

```prisma
model Appointment {
  // Add new fields
  noShowRiskScore     Float?   // 0.0 to 1.0
  noShowRiskLevel     String?  // LOW, MEDIUM, HIGH
  noShowRiskFactors   String[] // ["history", "weather", "late_booking"]
  riskCalculatedAt    DateTime?
}

model NoShowPredictionLog {
  id              String   @id @default(uuid())
  appointmentId   String
  predictedRisk   Float
  actualNoShow    Boolean?
  features        Json     // Store features used for prediction
  modelVersion    String
  createdAt       DateTime @default(now())

  appointment Appointment @relation(fields: [appointmentId], references: [id])
}
```

#### Backend Implementation

1. **`packages/backend/src/services/noShowPrediction.service.ts`**

```typescript
export class NoShowPredictionService {
  /**
   * Calculate no-show risk for an appointment
   */
  async calculateRisk(appointmentId: string): Promise<number> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            appointments: {
              where: {
                status: {
                  in: ['NO_SHOW', 'CANCELLED', 'COMPLETED'],
                },
              },
            },
          },
        },
      },
    });

    if (!appointment) return 0;

    const features = this.extractFeatures(appointment);
    const riskScore = this.predictRisk(features);

    // Update appointment with risk score
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        noShowRiskScore: riskScore,
        noShowRiskLevel: this.getRiskLevel(riskScore),
        noShowRiskFactors: features.riskFactors,
        riskCalculatedAt: new Date(),
      },
    });

    return riskScore;
  }

  private extractFeatures(appointment: any): any {
    const clientHistory = appointment.client.appointments;
    const totalAppointments = clientHistory.length;
    const noShows = clientHistory.filter((a: any) => a.status === 'NO_SHOW').length;
    const cancellations = clientHistory.filter((a: any) => a.status === 'CANCELLED').length;

    const noShowRate = totalAppointments > 0 ? noShows / totalAppointments : 0;
    const cancellationRate = totalAppointments > 0 ? cancellations / totalAppointments : 0;

    const features = {
      noShowRate,
      cancellationRate,
      isNewClient: totalAppointments === 0,
      daysSinceLastAppointment: this.getDaysSinceLastAppointment(clientHistory),
      appointmentHour: new Date(appointment.appointmentDate).getHours(),
      dayOfWeek: new Date(appointment.appointmentDate).getDay(),
      leadTimeDays: this.getLeadTimeDays(appointment),
      hasConfirmed: !!appointment.confirmedAt,
      riskFactors: [] as string[],
    };

    // Identify risk factors
    if (features.noShowRate > 0.2) features.riskFactors.push('high_noshow_history');
    if (features.isNewClient) features.riskFactors.push('new_client');
    if (features.leadTimeDays > 30) features.riskFactors.push('far_future_booking');
    if (!features.hasConfirmed) features.riskFactors.push('not_confirmed');

    return features;
  }

  private predictRisk(features: any): number {
    // Simple rule-based model (can be replaced with ML model)
    let risk = 0.1; // Base risk

    if (features.isNewClient) risk += 0.15;
    if (features.noShowRate > 0.2) risk += 0.3;
    if (features.noShowRate > 0.4) risk += 0.2;
    if (features.cancellationRate > 0.3) risk += 0.1;
    if (features.leadTimeDays > 30) risk += 0.1;
    if (!features.hasConfirmed) risk += 0.15;

    // Time-based risk
    if (features.appointmentHour < 9 || features.appointmentHour > 17) risk += 0.05;
    if (features.dayOfWeek === 1) risk += 0.05; // Monday

    return Math.min(risk, 0.95); // Cap at 95%
  }

  private getRiskLevel(score: number): string {
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.3) return 'MEDIUM';
    return 'LOW';
  }
}
```

#### Frontend Implementation

1. **Update AppointmentsCalendar.tsx** - Show risk indicators
2. **Create RiskBadge.tsx component** - Visual risk display

#### Success Criteria

- ✅ Risk calculated for all appointments
- ✅ High-risk appointments get extra reminder
- ✅ Risk score accuracy >75% after 3 months
- ✅ Staff can view risk factors and mitigation suggestions

---

## Phase 2: Service Expansion (Weeks 5-8) 🟡

**Goal**: Enable group therapy and improve waitlist/availability management

### 2.1 Group Appointment Management

**Priority**: 🔴 CRITICAL - Cannot serve group therapy without this
**Effort**: 3 weeks
**Dependencies**: AppointmentType model
**Gap Reference**: Report Section 2.7, lines 308-325

#### Database Schema

```prisma
model GroupSession {
  id                  String   @id @default(uuid())
  groupName           String
  description         String?  @db.Text
  facilitatorId       String   // Primary therapist
  coFacilitatorId     String?  // Optional co-facilitator

  // Group details
  maxCapacity         Int
  currentEnrollment   Int      @default(0)
  groupType           String   // THERAPY, SUPPORT, EDUCATION, SKILLS
  isOpenEnrollment    Boolean  @default(false) // Can new members join anytime?
  requiresScreening   Boolean  @default(true)

  // Scheduling
  appointmentTypeId   String
  recurringPattern    String?  // WEEKLY, BIWEEKLY
  dayOfWeek           Int?     // 0-6 (Sunday-Saturday)
  startTime           String?  // HH:mm
  duration            Int?     // Minutes

  // Billing
  billingType         String   // PER_MEMBER, FLAT_RATE
  ratePerMember       Float?

  // Status
  status              String   // ACTIVE, FULL, CLOSED, ARCHIVED
  startDate           DateTime
  endDate             DateTime?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  facilitator    User             @relation("GroupFacilitator", fields: [facilitatorId], references: [id])
  coFacilitator  User?            @relation("GroupCoFacilitator", fields: [coFacilitatorId], references: [id])
  appointmentType AppointmentType @relation(fields: [appointmentTypeId], references: [id])
  members        GroupMember[]
  sessions       Appointment[]    @relation("GroupSessions")
}

model GroupMember {
  id              String   @id @default(uuid())
  groupId         String
  clientId        String

  // Enrollment
  enrollmentDate  DateTime @default(now())
  exitDate        DateTime?
  status          String   // ACTIVE, ON_HOLD, EXITED
  exitReason      String?

  // Attendance tracking
  attendanceCount Int      @default(0)
  absenceCount    Int      @default(0)
  lastAttendance  DateTime?

  // Screening
  screenedBy      String?
  screeningDate   DateTime?
  screeningNotes  String?  @db.Text
  approved        Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  group      GroupSession @relation(fields: [groupId], references: [id], onDelete: Cascade)
  client     Client       @relation(fields: [clientId], references: [id])
  screener   User?        @relation(fields: [screenedBy], references: [id])
  attendance GroupAttendance[]

  @@unique([groupId, clientId])
}

model GroupAttendance {
  id            String   @id @default(uuid())
  groupMemberId String
  appointmentId String

  attended      Boolean  @default(false)
  checkedInAt   DateTime?
  notes         String?  @db.Text

  createdAt     DateTime @default(now())

  member      GroupMember  @relation(fields: [groupMemberId], references: [id], onDelete: Cascade)
  appointment Appointment  @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  @@unique([groupMemberId, appointmentId])
}

// Update Appointment model
model Appointment {
  // Add group session support
  groupSessionId  String?
  groupSession    GroupSession? @relation("GroupSessions", fields: [groupSessionId], references: [id])
  isGroupSession  Boolean       @default(false)
  attendance      GroupAttendance[]
}
```

#### Backend Implementation

**Files to Create**:
1. `packages/backend/src/services/groupSession.service.ts`
2. `packages/backend/src/services/groupMember.service.ts`
3. `packages/backend/src/controllers/groupSession.controller.ts`
4. `packages/backend/src/routes/groupSession.routes.ts`

**Key Features**:
- Create/manage group sessions
- Enroll/screen members
- Generate recurring group appointments
- Track individual attendance
- Generate billing for each attendee

#### Frontend Implementation

**Files to Create**:
1. `packages/frontend/src/pages/Groups/GroupSessionsPage.tsx`
2. `packages/frontend/src/pages/Groups/GroupDetailsPage.tsx`
3. `packages/frontend/src/components/Groups/GroupMembersList.tsx`
4. `packages/frontend/src/components/Groups/AddMemberDialog.tsx`
5. `packages/frontend/src/components/Groups/GroupAttendanceSheet.tsx`

#### Success Criteria

- ✅ Create group sessions with max capacity
- ✅ Enroll members with screening process
- ✅ Generate recurring group appointments
- ✅ Track individual attendance per session
- ✅ Generate billing records per attendee
- ✅ View group roster and attendance history

---

### 2.2 Waitlist Automation

**Priority**: 🟡 HIGH - Reduce manual scheduling burden
**Effort**: 2 weeks
**Dependencies**: None (WaitlistEntry model exists)
**Gap Reference**: Report Section 2.2, lines 189-197

#### Database Schema Enhancement

```prisma
model WaitlistEntry {
  // Add new fields to existing model
  priorityScore       Float    @default(0.5) // 0.0 to 1.0
  preferredTimes      String[] // ["MORNING", "AFTERNOON", "EVENING"]
  preferredDays       String[] // ["MONDAY", "WEDNESDAY", "FRIDAY"]
  preferredProviderId String?
  insuranceId         String?
  maxWaitDays         Int?     // Give up after X days

  // Matching
  lastOfferDate       DateTime?
  offerCount          Int      @default(0)
  declinedOffers      Int      @default(0)
  autoMatchEnabled    Boolean  @default(true)

  // Notification
  notificationsSent   Int      @default(0)
  lastNotification    DateTime?
}
```

#### Backend Implementation

1. **`packages/backend/src/services/waitlistMatching.service.ts`** - Smart matching algorithm
2. **`packages/backend/src/jobs/processWaitlist.job.ts`** - Auto-matching cron job

**Key Features**:
- Priority scoring based on wait time, clinical urgency, referral source
- Smart matching: provider specialty, insurance, time preferences
- Automated notifications when matching slot opens
- Track offer acceptance rate

#### Frontend Implementation

1. **Update WaitlistPage.tsx** - Add priority management
2. **Create WaitlistOfferDialog.tsx** - Send slot offers to waitlist members

#### Success Criteria

- ✅ Waitlist automatically notified when matching slot opens
- ✅ Priority score calculated for all entries
- ✅ 70%+ match accuracy (right provider, time, insurance)
- ✅ Reduce manual waitlist management time by 60%

---

### 2.3 Provider Availability & Time-Off

**Priority**: 🟡 HIGH - Critical for scheduling rules
**Effort**: 2 weeks
**Dependencies**: None
**Gap Reference**: Report Section 2.5, lines 268-275

#### Database Schema

```prisma
model ProviderAvailability {
  id                    String   @id @default(uuid())
  providerId            String

  // Schedule
  dayOfWeek             Int      // 0-6 (Sunday-Saturday)
  startTime             String   // HH:mm
  endTime               String   // HH:mm

  // Location
  locationId            String?
  isTelehealthAvailable Boolean  @default(false)

  // Limits
  maxAppointments       Int?     // Max appointments during this block

  // Overrides
  effectiveDate         DateTime? // Start date for this availability
  expiryDate            DateTime? // End date

  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  provider User            @relation(fields: [providerId], references: [id])
  location OfficeLocation? @relation(fields: [locationId], references: [id])

  @@index([providerId, dayOfWeek])
}

model TimeOffRequest {
  id                String   @id @default(uuid())
  providerId        String

  // Request details
  startDate         DateTime
  endDate           DateTime
  reason            String   // VACATION, SICK, CONFERENCE, PERSONAL
  notes             String?  @db.Text

  // Approval
  status            String   // PENDING, APPROVED, DENIED
  requestedBy       String
  approvedBy        String?
  approvedDate      DateTime?
  denialReason      String?  @db.Text

  // Coverage
  coverageProviderId String?
  autoReschedule    Boolean  @default(false) // Automatically reschedule appointments

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  provider         User  @relation("TimeOffProvider", fields: [providerId], references: [id])
  requester        User  @relation("TimeOffRequester", fields: [requestedBy], references: [id])
  approver         User? @relation("TimeOffApprover", fields: [approvedBy], references: [id])
  coverageProvider User? @relation("TimeOffCoverage", fields: [coverageProviderId], references: [id])

  @@index([providerId, startDate, endDate])
}
```

#### Backend Implementation

1. **`packages/backend/src/services/providerAvailability.service.ts`**
2. **`packages/backend/src/services/timeOff.service.ts`**
3. **`packages/backend/src/controllers/availability.controller.ts`**

**Key Features**:
- Define provider schedules by day of week
- Request/approve time off
- Block scheduling during time off
- Find coverage providers
- Auto-reschedule affected appointments

#### Frontend Implementation

1. **`packages/frontend/src/pages/Settings/ProviderAvailability.tsx`**
2. **`packages/frontend/src/pages/TimeOff/TimeOffRequestsPage.tsx`**
3. **`packages/frontend/src/components/Availability/AvailabilityCalendar.tsx`**

#### Success Criteria

- ✅ Providers can set weekly availability schedule
- ✅ Time off requests require approval
- ✅ Scheduling respects provider availability
- ✅ Affected appointments identified and rescheduled
- ✅ Coverage providers suggested automatically

---

## Phase 3: Advanced Features (Weeks 9-12) 🟢

### 3.1 Advanced Calendar Features

**Effort**: 2 weeks

**Features**:
- Provider comparison view (side-by-side schedules)
- Room view (resource scheduling)
- Drag-and-drop rescheduling
- Multi-select for bulk operations

### 3.2 Scheduling Analytics

**Effort**: 2 weeks

**Reports**:
- Provider utilization rates
- No-show rates by provider/type/time
- Revenue per hour analysis
- Cancellation pattern analysis
- Capacity planning projections

---

## Phase 4: AI Scheduling Assistant (Weeks 13-16) 🟢

### 4.1 Intelligent Matching

**Effort**: 4 weeks

**Features**:
- Natural language scheduling ("Find me a slot with Dr. Smith next Tuesday afternoon")
- Provider-client compatibility scoring
- Load balancing across providers
- Pattern recognition (identify scheduling inefficiencies)
- Intelligent suggestions for optimal scheduling

---

## Implementation Timeline

| Week | Phase | Features | Deliverables |
|------|-------|----------|--------------|
| 1-2 | Phase 1 | Reminder System (SMS setup) | Twilio integration, database schema |
| 3-4 | Phase 1 | Reminder System (Email + Frontend) | Email reminders, admin UI |
| 4 | Phase 1 | Appointment Types | Type management system |
| 5-7 | Phase 2 | Group Management | Group sessions, member enrollment |
| 7-8 | Phase 2 | Waitlist + Availability | Smart matching, provider schedules |
| 9-10 | Phase 3 | Advanced Calendar | Multi-view, drag-drop |
| 11-12 | Phase 3 | Analytics | Reports dashboard |
| 13-16 | Phase 4 | AI Assistant | ML model, natural language processing |

---

## Resource Requirements

**Team**:
- 2 Senior Full-Stack Developers (16 weeks each)
- 1 DevOps Engineer (2 weeks - Twilio/AWS setup)
- 1 QA Engineer (16 weeks part-time)
- 1 UX Designer (4 weeks - reminder templates, group UI)

**Infrastructure**:
- Twilio account ($0.0079/SMS, estimate $100-200/month)
- AWS SES (email sending, $0.10/1000 emails)
- AWS SNS (optional, for push notifications)

**Total Estimated Cost**: $120,000 - $160,000

---

## Success Metrics

**Phase 1 (CRITICAL)**:
- No-show rate reduces from 20% to <10%
- 95% of reminders delivered successfully
- <2% failed reminder rate
- 50%+ client confirmation rate via SMS

**Phase 2 (HIGH)**:
- Group therapy enabled for 10+ groups
- 80%+ waitlist conversion rate
- 60% reduction in manual scheduling time
- Provider availability conflicts reduced by 90%

**Phase 3 (MEDIUM)**:
- Provider utilization increases to >75%
- Scheduling efficiency improves by 20%
- Real-time scheduling analytics available

**Phase 4 (OPTIMIZATION)**:
- 70%+ accuracy in AI scheduling suggestions
- Natural language scheduling working for 80% of requests
- Load balancing reduces over/under-booking by 40%

---

## Risk Mitigation

**Technical Risks**:
- SMS delivery failures → Implement retry logic + email fallback
- Email spam filters → Use verified SES domain + proper SPF/DKIM
- Twilio cost overruns → Set budget alerts + rate limiting

**Business Risks**:
- Low reminder response rate → A/B test message templates
- Provider resistance to new system → Gradual rollout with training
- Client privacy concerns → Clear opt-in/opt-out process

---

## Testing Strategy

**Automated Tests**:
- Unit tests for all services (80% coverage minimum)
- Integration tests for reminder workflows
- E2E tests for critical paths

**Manual Tests**:
- Reminder delivery across all channels
- Group session workflows
- Waitlist matching accuracy
- Provider availability rules

**User Acceptance Tests**:
- Admin configures reminder settings
- Client receives and responds to reminders
- Therapist creates group session
- Waitlist member receives offer

---

## Deployment Plan

**Phase 1 Deployment**:
1. Deploy database migrations
2. Configure Twilio account (production)
3. Configure AWS SES (production)
4. Deploy reminder service + cron jobs
5. Enable for pilot group (5 providers)
6. Monitor for 1 week
7. Full rollout

**Phase 2-4 Deployments**:
- Feature flags for gradual rollout
- Pilot testing with selected providers
- Incremental production deployment

---

**Document Status**: Ready for Implementation
**Next Step**: Begin Phase 1 - Automated Reminder System
**Expected Completion**: Week 16 (April 2026)

---

END OF IMPLEMENTATION PLAN
