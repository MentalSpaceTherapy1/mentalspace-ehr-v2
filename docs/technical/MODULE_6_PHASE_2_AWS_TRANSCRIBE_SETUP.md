# Module 6 Phase 2: AWS Transcribe Medical Configuration Guide

## Overview

This guide covers the setup and configuration of Amazon Transcribe Medical for real-time AI transcription of telehealth sessions in MentalSpace EHR.

## Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured
- Node.js 18+ installed
- PostgreSQL database configured
- Active AWS region (default: us-east-1)

## Step 1: AWS IAM Configuration

### Create IAM Policy for Transcribe Medical

1. Log in to AWS Console
2. Navigate to IAM > Policies
3. Click "Create Policy"
4. Select JSON tab and paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartMedicalTranscriptionJob",
        "transcribe:GetMedicalTranscriptionJob",
        "transcribe:DeleteMedicalTranscriptionJob",
        "transcribe:ListMedicalTranscriptionJobs",
        "transcribe:StartMedicalStreamTranscription"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-transcribe-bucket/*"
      ]
    }
  ]
}
```

5. Name the policy: `MentalSpace-TranscribeMedical-Policy`
6. Click "Create Policy"

### Create IAM User or Role

#### Option A: IAM User (Development)

1. Navigate to IAM > Users
2. Click "Add Users"
3. Username: `mentalspace-transcribe-dev`
4. Access type: Select "Programmatic access"
5. Attach the policy created above
6. Complete user creation
7. **Save the Access Key ID and Secret Access Key** (you won't see them again)

#### Option B: IAM Role (Production - EC2/ECS)

1. Navigate to IAM > Roles
2. Click "Create Role"
3. Select "AWS service" > "EC2" or "ECS Task"
4. Attach the `MentalSpace-TranscribeMedical-Policy`
5. Name: `MentalSpace-TranscribeMedical-Role`
6. Create role and attach to your EC2 instance or ECS task

## Step 2: Environment Configuration

### Backend Environment Variables

Add the following to your `.env` file in `packages/backend/`:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# AWS Transcribe Settings
AWS_TRANSCRIBE_MEDICAL_SPECIALTY=PRIMARYCARE
AWS_TRANSCRIBE_MEDICAL_TYPE=CONVERSATION
AWS_TRANSCRIBE_SAMPLE_RATE=16000

# Optional: Custom Medical Vocabulary
AWS_TRANSCRIBE_CUSTOM_VOCABULARY_NAME=mental-health-terminology
```

**Important Security Notes:**
- Never commit `.env` files to version control
- Use AWS Secrets Manager or Parameter Store for production
- Rotate credentials regularly
- Use IAM roles instead of access keys when possible

### Production: AWS Secrets Manager

For production deployments, store credentials in AWS Secrets Manager:

1. Create a secret in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name mentalspace/transcribe/credentials \
  --description "MentalSpace Transcribe Medical credentials" \
  --secret-string '{
    "AWS_ACCESS_KEY_ID":"your_key",
    "AWS_SECRET_ACCESS_KEY":"your_secret"
  }'
```

2. Update your application to fetch from Secrets Manager (already implemented in config)

## Step 3: Database Migration

Run the Prisma migration to add transcription fields:

```bash
cd packages/database
npx prisma migrate deploy
```

Or manually apply the migration:

```bash
cd packages/database
psql -d mentalspace_ehr -f prisma/migrations/20250107_add_ai_transcription/migration.sql
```

Verify migration:

```bash
npx prisma db pull
```

## Step 4: Custom Medical Vocabulary (Optional but Recommended)

Create a custom vocabulary for mental health terminology to improve accuracy:

### 1. Create Vocabulary File

Create `mental-health-vocabulary.txt`:

```
cognitive behavioral therapy
dialectical behavior therapy
EMDR
psychodynamic
transference
countertransference
dissociation
depersonalization
derealization
suicidal ideation
self-harm
anxiolytic
antidepressant
SSRI
SNRI
benzodiazepine
therapeutic alliance
```

### 2. Upload to AWS Transcribe

```bash
aws transcribe create-medical-vocabulary \
  --vocabulary-name mental-health-terminology \
  --language-code en-US \
  --vocabulary-file-uri s3://your-bucket/vocabularies/mental-health-vocabulary.txt
```

### 3. Check Status

```bash
aws transcribe get-medical-vocabulary \
  --vocabulary-name mental-health-terminology
```

Wait until status is "READY" (usually 5-10 minutes)

## Step 5: Test Configuration

### Test AWS Credentials

```bash
cd packages/backend
npm run test:aws-transcribe
```

Or manually test:

```bash
node -e "
const { TranscribeClient, ListMedicalTranscriptionJobsCommand } = require('@aws-sdk/client-transcribe');
const client = new TranscribeClient({ region: 'us-east-1' });
client.send(new ListMedicalTranscriptionJobsCommand({}))
  .then(() => console.log('✅ AWS Transcribe configured correctly'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

### Test Transcription Service

```bash
# Start the backend
cd packages/backend
npm run dev

# In another terminal, test the API
curl -X POST http://localhost:3001/api/v1/telehealth/sessions/:sessionId/transcription/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Step 6: Frontend Integration

The TranscriptionPanel component should be added to your telehealth session UI:

```typescript
import { TranscriptionPanel } from '@/components/Telehealth/TranscriptionPanel';

// In your TelehealthSession component:
<TranscriptionPanel
  sessionId={sessionId}
  onTranscriptionToggle={(enabled) => console.log('Transcription:', enabled)}
/>
```

## Monitoring and Costs

### CloudWatch Metrics

Monitor transcription usage:

1. Go to CloudWatch > Metrics > Transcribe
2. Key metrics to monitor:
   - `TranscriptionsRequests`
   - `TranscriptionsErrors`
   - `AudioDurationSeconds`

### Cost Management

Amazon Transcribe Medical pricing (as of 2025):
- **Batch transcription**: $0.024 per minute
- **Streaming transcription**: $0.0285 per minute

**Cost estimation for a practice:**
- 50 sessions/day × 45 minutes/session = 2,250 minutes/day
- Daily cost: 2,250 × $0.0285 = $64.13
- Monthly cost: $64.13 × 22 working days = ~$1,411/month

**Cost optimization tips:**
1. Only enable transcription when explicitly requested
2. Implement client consent requirements
3. Set up billing alerts in AWS
4. Use custom vocabulary to reduce retranscription needs
5. Consider batch transcription for non-real-time use cases

### Set Up Billing Alerts

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name transcribe-monthly-cost-alert \
  --alarm-description "Alert when Transcribe costs exceed $2000/month" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold
```

## Troubleshooting

### Error: "The security token included in the request is invalid"

**Solution:** Check AWS credentials in `.env` file, ensure they're not expired

```bash
aws sts get-caller-identity
```

### Error: "Access Denied" when starting transcription

**Solution:** Verify IAM permissions include `transcribe:StartMedicalStreamTranscription`

### Error: "Region not supported"

**Solution:** Amazon Transcribe Medical is not available in all regions. Supported regions:
- us-east-1 (N. Virginia)
- us-east-2 (Ohio)
- us-west-2 (Oregon)
- ap-southeast-2 (Sydney)
- ca-central-1 (Canada)
- eu-west-1 (Ireland)

### Low Transcription Accuracy

**Solutions:**
1. Ensure audio quality is good (16kHz+ sample rate)
2. Implement custom medical vocabulary
3. Check microphone settings in browser
4. Verify network bandwidth for streaming

### WebSocket Connection Issues

**Solutions:**
1. Check CORS settings in backend
2. Verify Socket.IO version compatibility
3. Check firewall/proxy settings
4. Ensure SSL/TLS for wss:// connections

## HIPAA Compliance

### Security Checklist

- [ ] AWS account has MFA enabled
- [ ] IAM users have least privilege access
- [ ] Credentials stored in AWS Secrets Manager (production)
- [ ] CloudTrail enabled for audit logging
- [ ] VPC endpoints configured for Transcribe (optional but recommended)
- [ ] Data encrypted at rest in database
- [ ] Data encrypted in transit (HTTPS/WSS)
- [ ] Transcripts have automatic expiration/deletion policy
- [ ] Access logs enabled and monitored

### BAA (Business Associate Agreement)

Amazon Transcribe Medical is HIPAA-eligible when used with a BAA:

1. Sign in to AWS Console
2. Go to AWS Artifact
3. Download and sign the AWS BAA
4. Upload signed BAA to AWS Artifact
5. Keep a copy for your records

**Important:** Without a signed BAA, you cannot use AWS Transcribe Medical for PHI!

## Support and Resources

- **AWS Transcribe Medical Documentation:** https://docs.aws.amazon.com/transcribe/latest/dg/transcribe-medical.html
- **MentalSpace Support:** support@mentalspace-ehr.com
- **AWS Support:** Premium support recommended for production

## Next Steps

1. Complete AWS configuration (this document)
2. Test transcription in development environment
3. Configure custom medical vocabulary
4. Set up monitoring and alerts
5. Train staff on transcription features
6. Review HIPAA compliance checklist
7. Deploy to production with IAM roles
