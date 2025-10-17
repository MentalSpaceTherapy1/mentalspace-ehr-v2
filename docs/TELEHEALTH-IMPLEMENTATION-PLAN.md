# Telehealth Integration - Detailed Implementation Plan

**Priority:** 🔴 CRITICAL (95% of practice sessions are telehealth)
**Timeline:** 4 weeks
**Status:** NOT STARTED
**Dependencies:** Amazon Chime SDK, Database schema (complete)

---

## 📊 Overview

The telehealth module enables video conferencing between clinicians and clients using Amazon Chime SDK. This is the **most critical feature** for the practice as 95% of sessions are conducted via telehealth.

### Business Impact
- **Revenue Blocking:** 95% of practice revenue depends on this
- **Patient Care:** Core service delivery method
- **Compliance:** Must meet HIPAA requirements for telehealth

###

 Technical Stack
- **Video SDK:** Amazon Chime SDK
- **Backend:** Node.js/Express with WebSocket support
- **Frontend:** React with Chime SDK React components
- **Storage:** S3 for recordings
- **Database:** Existing PostgreSQL schema

---

## 🎯 Requirements

### Functional Requirements

1. **Session Management**
   - Create telehealth session from appointment
   - Generate unique session URLs
   - Start/end session lifecycle
   - Track session duration and participants

2. **Waiting Room**
   - Client joins waiting room before session
   - Clinician can see who's waiting
   - Clinician admits client to session
   - Display wait time

3. **Video Controls**
   - Mute/unmute microphone
   - Enable/disable camera
   - Screen sharing
   - Layout controls (speaker view, gallery view)

4. **Recording**
   - Start/stop recording with consent
   - Recording indicator (required by law)
   - Store recordings securely in S3
   - Link recording to appointment

5. **Quality & Reliability**
   - Network quality indicators
   - Automatic reconnection
   - Bandwidth adaptation
   - Error handling

6. **Consent & Compliance**
   - Capture consent before first recording
   - State-specific consent rules
   - Emergency location verification
   - HIPAA-compliant logging

### Non-Functional Requirements

- **Performance:** Support 10+ concurrent sessions
- **Latency:** Video latency < 500ms
- **Availability:** 99.9% uptime
- **Security:** End-to-end encryption
- **Compliance:** HIPAA compliant

---

## 📋 Implementation Phases

### Phase 1: Backend Infrastructure (Week 1)

#### Task 1.1: Amazon Chime SDK Setup (2 days)

**Files to Create:**
- `packages/backend/src/services/chime.service.ts`
- `packages/backend/src/config/chime.config.ts`

**Implementation:**

```typescript
// packages/backend/src/services/chime.service.ts
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
} from '@aws-sdk/client-chime-sdk-meetings';
import { PrismaClient } from '@mentalspace/database';
import logger from '../utils/logger';

const client = new ChimeSDKMeetingsClient({ region: 'us-east-1' });
const prisma = new PrismaClient();

export class ChimeService {
  /**
   * Create a new Chime meeting for telehealth session
   */
  async createMeeting(appointmentId: string) {
    try {
      // Create meeting
      const meeting = await client.send(
        new CreateMeetingCommand({
          ClientRequestToken: appointmentId,
          MediaRegion: 'us-east-1',
          ExternalMeetingId: appointmentId,
        })
      );

      return meeting.Meeting;
    } catch (error) {
      logger.error('Failed to create Chime meeting', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Create attendee for a meeting
   */
  async createAttendee(meetingId: string, userId: string, role: 'clinician' | 'client') {
    try {
      const attendee = await client.send(
        new CreateAttendeeCommand({
          MeetingId: meetingId,
          ExternalUserId: userId,
          Capabilities: {
            Audio: 'SendReceive',
            Video: 'SendReceive',
            Content: role === 'clinician' ? 'SendReceive' : 'Receive',
          },
        })
      );

      return attendee.Attendee;
    } catch (error) {
      logger.error('Failed to create attendee', { error, meetingId, userId });
      throw error;
    }
  }

  /**
   * End a meeting
   */
  async endMeeting(meetingId: string) {
    try {
      await client.send(
        new DeleteMeetingCommand({
          MeetingId: meetingId,
        })
      );
    } catch (error) {
      logger.error('Failed to end meeting', { error, meetingId });
      throw error;
    }
  }
}

export const chimeService = new ChimeService();
```

**AWS SDK Dependencies:**
```bash
npm install @aws-sdk/client-chime-sdk-meetings @aws-sdk/client-s3
```

**IAM Permissions Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:CreateMeeting",
        "chime:DeleteMeeting",
        "chime:CreateAttendee",
        "chime:BatchCreateAttendee"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Task 1.2: Telehealth Session API (3 days)

**Files to Modify:**
- `packages/backend/src/controllers/telehealth.controller.ts`
- `packages/backend/src/services/telehealth.service.ts`
- `packages/backend/src/routes/telehealth.routes.ts`

**Endpoints to Implement:**

1. **POST /api/v1/telehealth/sessions** - Create session
2. **GET /api/v1/telehealth/sessions/:id** - Get session details
3. **POST /api/v1/telehealth/sessions/:id/join** - Join session (get credentials)
4. **POST /api/v1/telehealth/sessions/:id/admit** - Admit from waiting room
5. **POST /api/v1/telehealth/sessions/:id/end** - End session
6. **POST /api/v1/telehealth/sessions/:id/recording/start** - Start recording
7. **POST /api/v1/telehealth/sessions/:id/recording/stop** - Stop recording

**Implementation Example:**

```typescript
// packages/backend/src/services/telehealth.service.ts
import { PrismaClient, TelehealthSessionStatus } from '@mentalspace/database';
import { chimeService } from './chime.service';
import { logPhiAccess } from '../middleware/auditLogger';

const prisma = new PrismaClient();

export class TelehealthService {
  async createSession(appointmentId: string, createdBy: string) {
    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true, clinician: true },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Create Chime meeting
    const meeting = await chimeService.createMeeting(appointmentId);

    // Create session in database
    const session = await prisma.telehealthSession.create({
      data: {
        appointmentId,
        chimeMeetingId: meeting.MeetingId,
        chimeMeetingData: meeting as any,
        status: 'WAITING',
        startedAt: new Date(),
        createdBy,
      },
    });

    return session;
  }

  async joinSession(sessionId: string, userId: string, role: 'clinician' | 'client') {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'ENDED') {
      throw new Error('Session has ended');
    }

    // Create attendee
    const attendee = await chimeService.createAttendee(
      session.chimeMeetingId!,
      userId,
      role
    );

    // Update session status if clinician joins
    if (role === 'clinician' && session.status === 'WAITING') {
      await prisma.telehealthSession.update({
        where: { id: sessionId },
        data: { status: 'ACTIVE' },
      });
    }

    return {
      meeting: session.chimeMeetingData,
      attendee,
    };
  }

  async endSession(sessionId: string, endedBy: string) {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // End Chime meeting
    await chimeService.endMeeting(session.chimeMeetingId!);

    // Update session
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        endedBy,
      },
    });

    return session;
  }
}

export const telehealthService = new TelehealthService();
```

#### Task 1.3: Recording Infrastructure (2 days)

**S3 Bucket for Recordings:**

```typescript
// infrastructure/lib/storage-stack.ts (add to existing)
const recordingsBucket = new s3.Bucket(this, 'RecordingsBucket', {
  bucketName: `mentalspace-recordings-${environment}`,
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: kmsKey,
  versioned: true,
  lifecycleRules: [
    {
      expiration: cdk.Duration.days(2555), // 7 years (HIPAA requirement)
      transitions: [
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        },
      ],
    },
  ],
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

**Recording Service:**

```typescript
// packages/backend/src/services/recording.service.ts
import { ChimeSDKMediaPipelinesClient, CreateMediaCapturePipelineCommand } from '@aws-sdk/client-chime-sdk-media-pipelines';

export class RecordingService {
  async startRecording(meetingId: string, sessionId: string) {
    // Start Chime media capture pipeline
    // Store recording metadata in database
  }

  async stopRecording(pipelineId: string) {
    // Stop media capture pipeline
    // Update recording metadata
  }
}
```

---

### Phase 2: Frontend Video UI (Week 2)

#### Task 2.1: Install Chime SDK React Components (1 day)

```bash
cd packages/frontend
npm install amazon-chime-sdk-js amazon-chime-sdk-component-library-react
```

#### Task 2.2: Video Session Component (3 days)

**Files to Create:**
- `packages/frontend/src/components/Telehealth/VideoSession.tsx`
- `packages/frontend/src/components/Telehealth/WaitingRoom.tsx`
- `packages/frontend/src/components/Telehealth/VideoControls.tsx`
- `packages/frontend/src/hooks/useChimeSession.ts`

**Implementation:**

```typescript
// packages/frontend/src/components/Telehealth/VideoSession.tsx
import React, { useEffect, useState } from 'react';
import {
  MeetingProvider,
  useMeetingManager,
  VideoTileGrid,
  LocalVideo,
  ControlBar,
  AudioInputControl,
  VideoInputControl,
  ContentShareControl,
  AudioOutputControl,
  ControlBarButton,
} from 'amazon-chime-sdk-component-library-react';

interface VideoSessionProps {
  sessionId: string;
  onEnd: () => void;
}

export const VideoSession: React.FC<VideoSessionProps> = ({ sessionId, onEnd }) => {
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Join session and get credentials
    joinSession();
  }, [sessionId]);

  const joinSession = async () => {
    const response = await fetch(`/api/v1/telehealth/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    setMeetingData(data);
  };

  const handleEndSession = async () => {
    await fetch(`/api/v1/telehealth/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    onEnd();
  };

  if (!meetingData) {
    return <div>Loading...</div>;
  }

  return (
    <MeetingProvider>
      <div className="video-session">
        <VideoTileGrid />
        <LocalVideo />
        <ControlBar>
          <AudioInputControl />
          <VideoInputControl />
          <ContentShareControl />
          <AudioOutputControl />
          <ControlBarButton
            icon="End"
            onClick={handleEndSession}
            label="End Session"
          />
        </ControlBar>
      </div>
    </MeetingProvider>
  );
};
```

#### Task 2.3: Waiting Room (2 days)

```typescript
// packages/frontend/src/components/Telehealth/WaitingRoom.tsx
export const WaitingRoom: React.FC = () => {
  return (
    <div className="waiting-room">
      <h2>Waiting for clinician to start session</h2>
      <p>Your session will begin shortly...</p>
      <DeviceTest />
    </div>
  );
};
```

---

### Phase 3: Integration & Testing (Week 3)

#### Task 3.1: Appointment Integration (2 days)
- Add "Join Session" button to appointments
- Create session automatically when appointment starts
- Link session to appointment in database

#### Task 3.2: Consent Workflows (2 days)
- Capture recording consent
- Store consent with timestamp
- Display consent status

#### Task 3.3: Testing (3 days)
- Unit tests for Chime service
- Integration tests for session APIs
- E2E tests for video workflows
- Load testing (10 concurrent sessions)

---

### Phase 4: Polish & Documentation (Week 4)

#### Task 4.1: UI Polish (2 days)
- Error states
- Loading states
- Network quality indicators
- Session timer

#### Task 4.2: Documentation (2 days)
- User guide for clinicians
- User guide for clients
- Troubleshooting guide
- API documentation

#### Task 4.3: Training (1 day)
- Staff training materials
- Demo videos
- FAQ document

---

## 🔐 Security & Compliance

### HIPAA Requirements

1. **Encryption:**
   - ✅ Video/audio encrypted in transit (Chime SDK)
   - ✅ Recordings encrypted at rest (S3 with KMS)

2. **Access Control:**
   - ✅ Only authorized users can join sessions
   - ✅ Role-based permissions (clinician vs client)

3. **Audit Logging:**
   - ✅ Log all session starts/ends
   - ✅ Log all joins/leaves
   - ✅ Log recording starts/stops

4. **Consent:**
   - ✅ Capture consent before recording
   - ✅ Display recording indicator
   - ✅ Store consent with timestamp

### State-Specific Requirements

**Georgia (One-Party Consent State):**
- Clinician can record with their own consent
- Client notification recommended but not required
- Best practice: Always notify and get consent

---

## 📊 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Session Success Rate | >95% | Sessions completed / Sessions started |
| Video Quality | <500ms latency | Chime SDK metrics |
| Concurrent Sessions | 10+ | Load testing |
| Recording Success | 100% | Recordings saved / Recording attempts |
| User Satisfaction | >4.5/5 | Post-session surveys |

---

## 🚀 Deployment Plan

### Development
1. Test with 2-3 internal users
2. Verify all features working
3. Check recordings in S3

### Staging
1. Full UAT with staff
2. Load test with 10 concurrent sessions
3. Verify monitoring and alarms

### Production
1. Soft launch with 5 pilot clinicians
2. Monitor closely for 1 week
3. Roll out to all clinicians
4. Provide 24/7 support for first month

---

## ⚠️ Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chime SDK learning curve | Medium | High | Start with basic implementation, iterate |
| Network connectivity issues | Medium | High | Implement reconnection logic, quality indicators |
| Browser compatibility | Low | Medium | Test on Chrome, Firefox, Safari, Edge |
| Recording failures | Low | High | Implement retry logic, alert on failures |
| Concurrent session limits | Low | Medium | Load test, plan for scaling |

---

## 📚 Resources

- [Amazon Chime SDK Documentation](https://aws.amazon.com/chime/chime-sdk/)
- [Chime SDK React Components](https://github.com/aws/amazon-chime-sdk-component-library-react)
- [HIPAA Telehealth Requirements](https://www.hhs.gov/hipaa/for-professionals/special-topics/telehealth/index.html)
- [Georgia Telehealth Laws](https://www.georgiacompositeboard.gov/telehealth)

---

**Next Steps:** Begin with Task 1.1 - Amazon Chime SDK Setup
**Owner:** Development Team
**Start Date:** October 14, 2025
**Target Completion:** November 8, 2025 (4 weeks)
