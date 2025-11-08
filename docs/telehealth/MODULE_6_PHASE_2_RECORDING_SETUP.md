# Module 6 Telehealth Phase 2: Recording & Storage Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [AWS S3 Setup](#aws-s3-setup)
3. [Twilio Configuration](#twilio-configuration)
4. [Database Migration](#database-migration)
5. [Environment Configuration](#environment-configuration)
6. [HIPAA Compliance](#hipaa-compliance)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the implementation of secure recording capabilities for telehealth sessions using:
- **Twilio Video Recording API** - For capturing session video/audio
- **AWS S3** - For encrypted cloud storage with HIPAA compliance
- **Prisma ORM** - For managing recording metadata and audit trails
- **Georgia Law Compliance** - 7-year retention requirement for mental health records

### Features Implemented
- ✅ Secure recording with explicit client consent
- ✅ Server-side encryption (AES-256)
- ✅ Presigned URLs for time-limited access (1 hour expiration)
- ✅ Comprehensive access logging for HIPAA audits
- ✅ Automatic retention policies (7 years + 90-day grace period)
- ✅ Recording playback interface with controls
- ✅ Webhook handling for Twilio callbacks
- ✅ Background job for retention enforcement

---

## AWS S3 Setup

### Step 1: Create S3 Bucket

1. Log in to **AWS Console** → Navigate to **S3**

2. Click **Create bucket**

3. Configure bucket settings:
   ```
   Bucket name: mentalspace-recordings-prod
   Region: us-east-1 (or your preferred region)

   ✅ Block all public access (REQUIRED for HIPAA)
   ✅ Enable bucket versioning (recommended)
   ✅ Enable default encryption
   ```

4. **Encryption Settings:**
   - Encryption type: **SSE-S3** (AES-256) or **SSE-KMS** (for enhanced security)
   - If using KMS: Select or create a KMS key

5. Click **Create bucket**

### Step 2: Configure Bucket Policy

Apply this policy to enforce HIPAA compliance:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::mentalspace-recordings-prod/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::mentalspace-recordings-prod",
        "arn:aws:s3:::mentalspace-recordings-prod/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### Step 3: Enable Access Logging

1. Go to bucket **Properties** → **Server access logging**
2. Enable logging to a separate bucket: `mentalspace-logs`
3. This tracks all access for HIPAA audit requirements

### Step 4: Configure Lifecycle Policies

Set up automatic archival to reduce costs:

1. Go to **Management** → **Create lifecycle rule**

2. **Rule Name:** `ArchiveOldRecordings`

3. **Transitions:**
   ```
   Day 30:  STANDARD → STANDARD_IA (Infrequent Access)
   Day 90:  STANDARD_IA → GLACIER
   Day 365: GLACIER → GLACIER_DEEP_ARCHIVE
   ```

4. **Expiration:** After 7 years (2,555 days)

### Step 5: Create IAM User for Backend Access

1. Go to **IAM** → **Users** → **Add user**
   - Username: `mentalspace-recordings-user`
   - Access type: **Programmatic access**

2. Attach this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::mentalspace-recordings-prod",
        "arn:aws:s3:::mentalspace-recordings-prod/*"
      ]
    }
  ]
}
```

3. **Save the credentials:**
   ```
   Access Key ID: AKIA...
   Secret Access Key: wJal...
   ```

### Step 6: Sign AWS Business Associate Agreement (BAA)

**CRITICAL for HIPAA Compliance:**

1. Log in to **AWS Artifact** in the AWS Console
2. Navigate to **Agreements**
3. Find **AWS Business Associate Addendum (BAA)**
4. Accept the BAA for your account
5. Download a copy for your records

Without a signed BAA, you cannot legally store PHI on AWS!

---

## Twilio Configuration

### Step 1: Enable Recording in Twilio Console

1. Log in to **Twilio Console** → **Video** → **Settings**

2. Enable **Recording Features:**
   - ✅ Allow recording
   - ✅ Composition API (for multi-participant recordings)

3. Note your credentials:
   ```
   Account SID: AC...
   Auth Token: ...
   API Key SID: SK...
   API Key Secret: ...
   ```

### Step 2: Configure Recording Webhooks

1. Go to **Video** → **Rooms** → **Settings**

2. Set **StatusCallback URL:**
   ```
   https://your-domain.com/api/v1/telehealth/webhook/recording-status
   ```

3. Enable callbacks for:
   - ✅ recording-complete
   - ✅ composition-available
   - ✅ recording-failed

---

## Database Migration

### Step 1: Run Prisma Migration

```bash
cd packages/database

# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Step 2: Verify Migration

```bash
# Check that new table exists
npx prisma studio

# Navigate to SessionRecording model
# Verify fields: twilioRecordingSid, storageBucket, storageKey, etc.
```

### Step 3: Seed Test Data (Optional)

```bash
# For development only
npm run seed:recordings
```

---

## Environment Configuration

### Backend (.env)

Add these variables to `packages/backend/.env`:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJal...
S3_RECORDING_BUCKET=mentalspace-recordings-prod

# Twilio Configuration (existing)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...

# Backend URL (for webhooks)
BACKEND_URL=https://api.mentalspace.com
FRONTEND_URL=https://app.mentalspace.com
```

### Frontend (.env)

```bash
VITE_API_URL=https://api.mentalspace.com
```

---

## HIPAA Compliance

### Compliance Checklist

#### ✅ Technical Safeguards

- [x] **Encryption at rest:** AES-256 server-side encryption on S3
- [x] **Encryption in transit:** All API calls use HTTPS/TLS 1.2+
- [x] **Access control:** Presigned URLs expire in 1 hour
- [x] **Audit logging:** All recording access logged with timestamp, user, IP
- [x] **Authentication:** JWT-based auth required for all endpoints
- [x] **Authorization:** Role-based access control (RBAC)
- [x] **Secure deletion:** Permanent deletion after retention period

#### ✅ Administrative Safeguards

- [x] **Consent management:** Explicit opt-in required before recording
- [x] **Access logging:** Comprehensive audit trail for all operations
- [x] **Retention policy:** 7 years (Georgia law) + 90-day grace period
- [x] **Deletion warnings:** 30-day advance notice before deletion
- [x] **BAA signed:** AWS Business Associate Agreement in place
- [x] **Staff training:** Documented procedures for handling recordings

#### ✅ Physical Safeguards

- [x] **AWS data centers:** SOC 2 Type II compliant
- [x] **Geographic restrictions:** Data stored in US regions only
- [x] **Redundancy:** Multi-AZ storage with versioning
- [x] **Disaster recovery:** Automated backups to Glacier

### Georgia State Requirements

**O.C.G.A. § 43-39-16** - Medical record retention for mental health providers:

> Mental health records must be retained for a minimum of 7 years from the date of last treatment.

Our implementation:
- Default retention: **7 years**
- Grace period: **90 additional days** before permanent deletion
- Warnings: **30 days** before scheduled deletion
- Audit trail: Permanent record of deletion (who, when, why)

### Access Logging Format

Every recording access is logged in this format:

```json
{
  "timestamp": "2025-01-07T14:30:00Z",
  "userId": "user_abc123",
  "action": "VIEW_RECORDING",
  "recordingId": "rec_xyz789",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "duration": 3600,
    "size": 52428800
  }
}
```

**Actions tracked:**
- `START_RECORDING` - Recording initiated
- `STOP_RECORDING` - Recording ended
- `VIEW_RECORDING` - Playback URL generated
- `DOWNLOAD_RECORDING` - Download initiated
- `DELETE_RECORDING` - Permanent deletion
- `AUTO_ARCHIVE` - Automatic archival by retention job
- `UPLOAD_COMPLETED` - Upload to S3 finished

---

## Testing Guide

### Manual Testing Checklist

#### 1. Test Recording Start

```bash
# Prerequisites:
# - Active telehealth session
# - Client in session

# Steps:
1. Click "Start Recording" button in video controls
2. Verify consent dialog appears
3. Check all consent boxes
4. Click "I Consent to Recording"
5. Verify recording indicator appears (red dot, pulsing)
6. Check database: status should be "RECORDING"
```

#### 2. Test Recording Stop

```bash
1. Click "Stop Recording" button
2. Verify status changes to "PROCESSING"
3. Wait for Twilio webhook callback (~1-2 minutes)
4. Check logs for "recording-complete" webhook
5. Verify status changes to "AVAILABLE"
6. Confirm file uploaded to S3
```

#### 3. Test Playback

```bash
1. Navigate to session recordings page
2. Find the completed recording
3. Click "Play" button
4. Verify presigned URL generated (check network tab)
5. Confirm video loads and plays
6. Check access log was created
```

#### 4. Test Download

```bash
1. Click "Download" button
2. Verify file downloads with correct filename
3. Check download count incremented
4. Verify access log entry created
```

#### 5. Test Deletion

```bash
1. Click "Delete" button
2. Enter deletion reason
3. Confirm deletion
4. Verify status changes to "DELETED"
5. Confirm file removed from S3
6. Check audit log for deletion entry
```

### Automated Testing

```bash
# Backend tests
cd packages/backend
npm run test:integration -- recording.test.ts

# Frontend tests
cd packages/frontend
npm run test -- RecordingConsentDialog.test.tsx
```

### Load Testing

```bash
# Test concurrent recordings
npm run test:load -- --recordings=10 --duration=60
```

---

## Troubleshooting

### Issue: Recording fails to start

**Symptoms:** Error "Failed to start recording"

**Causes:**
1. Twilio credentials incorrect
2. Room not active
3. Consent not given

**Solution:**
```bash
# Check Twilio configuration
curl https://api.mentalspace.com/api/v1/telehealth/recording/status

# Verify room is active
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://video.twilio.com/v1/Rooms/{RoomSid}

# Check logs
docker logs mentalspace-backend | grep "recording"
```

### Issue: Upload to S3 fails

**Symptoms:** Recording stuck in "UPLOADING" status

**Causes:**
1. AWS credentials invalid
2. Bucket doesn't exist
3. Insufficient permissions

**Solution:**
```bash
# Test S3 access
aws s3 ls s3://mentalspace-recordings-prod --profile mentalspace

# Check IAM permissions
aws iam get-user-policy --user-name mentalspace-recordings-user --policy-name RecordingAccess

# Manually retry upload
curl -X POST https://api.mentalspace.com/api/v1/admin/recordings/{sid}/retry-upload \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: Presigned URL expired

**Symptoms:** Video playback fails with 403 error

**Cause:** URL expired (1 hour limit)

**Solution:**
```bash
# Generate new URL
curl https://api.mentalspace.com/api/v1/telehealth/sessions/{sessionId}/recording/playback-url \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: Webhook not received

**Symptoms:** Recording stuck in "PROCESSING"

**Causes:**
1. Webhook URL incorrect
2. Firewall blocking Twilio
3. Backend not responding

**Solution:**
```bash
# Verify webhook URL in Twilio Console
# Check firewall rules allow Twilio IPs:
# https://www.twilio.com/docs/video/ip-addresses

# Test webhook endpoint
curl -X POST https://api.mentalspace.com/api/v1/telehealth/webhook/recording-status \
  -d "RecordingSid=RT123&Status=completed"

# Check webhook logs
docker logs mentalspace-backend | grep "webhook"
```

---

## Monitoring & Alerts

### CloudWatch Metrics

Monitor these metrics in AWS CloudWatch:

1. **S3 Bucket Metrics:**
   - Bucket size
   - Number of objects
   - Request count
   - 4xx/5xx errors

2. **Application Metrics:**
   - Recording success rate
   - Average upload time
   - Failed recordings count
   - Webhook failure rate

### Alert Thresholds

Set up alerts for:

- Recording failure rate > 5%
- Average upload time > 5 minutes
- S3 errors > 10 per hour
- Webhook failures > 3 per day

---

## Cost Estimation

### AWS S3 Costs

**Assumptions:**
- 100 recordings per month
- Average recording: 60 minutes, 500 MB
- Retention: 7 years

**Monthly Costs:**
```
Storage (first year):
- STANDARD: 100 recordings × 500 MB × $0.023/GB = $11.50/month

Storage (after lifecycle transitions):
- STANDARD_IA (30 days): $0.0125/GB = $6.25/month
- GLACIER (after 90 days): $0.004/GB = $2.00/month
- DEEP_ARCHIVE (after 1 year): $0.00099/GB = $0.50/month

Data transfer (egress): ~10 GB/month × $0.09/GB = $0.90/month

Total Year 1: ~$150/month
Total Year 7: ~$20/month (mostly DEEP_ARCHIVE)
```

### Twilio Costs

```
Recording:
- Group Room Recording: $0.004/participant/minute
- Composition: $0.012/composed minute

Example: 60-minute session with 2 participants
- Recording: 2 × 60 × $0.004 = $0.48
- Composition: 60 × $0.012 = $0.72
Total: $1.20 per session

100 sessions/month: $120/month
```

---

## Production Checklist

Before going live:

### Security
- [ ] AWS BAA signed
- [ ] S3 bucket policy applied
- [ ] Public access blocked
- [ ] Encryption enabled (AES-256)
- [ ] IAM permissions restricted
- [ ] Webhook endpoint secured
- [ ] HTTPS enforced everywhere

### Configuration
- [ ] Environment variables set
- [ ] Twilio webhooks configured
- [ ] S3 lifecycle policies created
- [ ] Access logging enabled
- [ ] Retention job scheduled (daily at 2 AM)
- [ ] Backup strategy documented

### Testing
- [ ] End-to-end recording flow tested
- [ ] Consent dialog tested
- [ ] Playback tested
- [ ] Download tested
- [ ] Deletion tested
- [ ] Webhook handling tested
- [ ] Retention job tested

### Compliance
- [ ] HIPAA compliance verified
- [ ] Georgia retention requirements met
- [ ] Consent forms reviewed by legal
- [ ] Privacy policy updated
- [ ] Staff training completed
- [ ] Incident response plan documented

### Monitoring
- [ ] CloudWatch alarms configured
- [ ] Error tracking setup (Sentry)
- [ ] Log aggregation configured
- [ ] Performance monitoring enabled
- [ ] Backup verification automated

---

## Support

For issues or questions:
- **Technical:** dev@mentalspace.com
- **Compliance:** hipaa@mentalspace.com
- **Emergency:** on-call engineer via PagerDuty

---

**Last Updated:** January 7, 2025
**Version:** 1.0.0
**Module:** 6 - Telehealth Phase 2
