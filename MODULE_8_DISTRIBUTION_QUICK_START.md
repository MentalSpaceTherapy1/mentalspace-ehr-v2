# Module 8 Automated Distribution - Quick Start Guide

## Agent 6 Implementation - Ready to Test

---

## Prerequisites Checklist

✅ Database schema has distribution models (ReportSchedule, Subscription, DeliveryLog, DistributionList)
✅ node-cron and nodemailer dependencies installed
✅ Backend services created
✅ Controllers and routes implemented
✅ Frontend components and pages created
✅ Scheduler integrated in index.ts

---

## Setup Steps

### 1. Configure SMTP Credentials

Add to your `.env` file:

```env
# Email Distribution Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

#### For Gmail:
1. Enable 2-Factor Authentication
2. Go to: https://myaccount.google.com/security
3. Click "2-Step Verification"
4. Scroll to "App passwords"
5. Generate password for "Mail"
6. Use the 16-character password

#### Alternative Providers:
- **SendGrid**: Use SMTP relay credentials
- **AWS SES**: Configure SMTP credentials
- **Mailgun**: Use SMTP settings
- **Resend**: Already installed, can be integrated

---

### 2. Start the Backend

```bash
cd packages/backend
npm run dev
```

Look for these log messages:
```
[Report Scheduler] Starting automated report scheduler...
[Report Scheduler] Scheduler started successfully
[Delivery Tracker] Retry processor started
```

---

### 3. Test Email Configuration (Optional)

Add a test endpoint in your development environment:

```typescript
// In a test controller or admin route
import { sendTestEmail, validateEmailConfiguration } from './services/email-distribution.service';

router.get('/test-email', async (req, res) => {
  try {
    const config = await validateEmailConfiguration();
    if (!config.valid) {
      return res.status(500).json({ error: config.error });
    }

    const result = await sendTestEmail('your-email@example.com');
    res.json({ success: result, message: 'Check your email!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Usage Examples

### 1. Create a Report Schedule via API

```bash
curl -X POST http://localhost:5000/api/v1/report-schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reportId": "report-uuid-here",
    "reportType": "Client Progress Report",
    "frequency": "DAILY",
    "timezone": "America/New_York",
    "format": "PDF",
    "recipients": {
      "to": ["recipient1@example.com", "recipient2@example.com"],
      "cc": ["supervisor@example.com"],
      "bcc": []
    }
  }'
```

### 2. Create Schedule with Conditional Distribution

```bash
curl -X POST http://localhost:5000/api/v1/report-schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reportId": "report-uuid-here",
    "reportType": "High-Risk Client Alert",
    "frequency": "DAILY",
    "format": "PDF",
    "recipients": {
      "to": ["supervisor@example.com"]
    },
    "distributionCondition": {
      "type": "THRESHOLD",
      "metric": "riskScore",
      "threshold": 75
    }
  }'
```

### 3. Execute Schedule Immediately

```bash
curl -X POST http://localhost:5000/api/v1/report-schedules/SCHEDULE_ID/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Create Distribution List

```bash
curl -X POST http://localhost:5000/api/v1/distribution-lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Clinical Supervisors",
    "description": "All clinical supervisors for weekly reports",
    "emails": [
      "supervisor1@example.com",
      "supervisor2@example.com",
      "supervisor3@example.com"
    ]
  }'
```

---

## Frontend Access

### For End Users (Clinicians/Admins):

1. **View Subscriptions**: Navigate to `/reports/subscriptions`
   - See all your scheduled reports
   - Pause/resume schedules
   - Run schedules manually
   - View delivery history

2. **Schedule a Report**: From any report page
   - Click "Schedule" button
   - Configure frequency, format, recipients
   - Set conditional distribution (optional)
   - Save schedule

### For Admins:

1. **Manage Distribution Lists**: Navigate to `/admin/distribution-lists`
   - Create reusable email lists
   - Add/remove recipients
   - Edit list details
   - View list statistics

---

## Monitoring & Troubleshooting

### Check Scheduler Status

Look for these log messages every minute:
```
[Report Scheduler] Found X due schedules
```

If no schedules are due, you won't see execution logs.

### Monitor Delivery Logs

Query the database:
```sql
SELECT * FROM delivery_logs ORDER BY created_at DESC LIMIT 10;
```

### Check Failed Deliveries

```bash
curl http://localhost:5000/api/v1/report-schedules/SCHEDULE_ID/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Common Issues

**Issue**: Emails not sending
- **Solution**: Check SMTP credentials in .env
- **Solution**: Check logs for connection errors
- **Solution**: Verify email addresses are valid

**Issue**: Scheduler not running
- **Solution**: Check server startup logs
- **Solution**: Verify cron job started
- **Solution**: Check for uncaught exceptions

**Issue**: Retries not working
- **Solution**: Verify retry processor started
- **Solution**: Check attemptCount in delivery logs
- **Solution**: Wait 5 minutes between retries

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Scheduler logs appear every minute
- [ ] Test email sends successfully
- [ ] Can create schedule via API
- [ ] Can view schedules in UI
- [ ] Can execute schedule manually
- [ ] Email is received with attachment
- [ ] Delivery log is created
- [ ] Failed delivery retries automatically
- [ ] Can pause/resume schedule
- [ ] Can delete schedule
- [ ] Can create distribution list
- [ ] Can view delivery history

---

## Schedule Frequencies Explained

| Frequency | Description | Example Next Run |
|-----------|-------------|------------------|
| DAILY     | Every day at the same time | Tomorrow, same time |
| WEEKLY    | Every 7 days | Next week, same day/time |
| MONTHLY   | Every month on same date | Next month, same date/time |
| CUSTOM    | Use cron expression | Based on cron pattern |

---

## Conditional Distribution Types

| Type | Description | Use Case |
|------|-------------|----------|
| ALWAYS | Always send report | Regular scheduled reports |
| THRESHOLD | Only if metric > threshold | High-risk alerts only |
| CHANGE_DETECTION | Only if data changed | Only when updates exist |
| EXCEPTION | Only if anomalies detected | Crisis detection reports |

---

## Email Template Features

The automated emails include:

- Professional MentalSpace branding
- Report type and schedule name
- Generation date and time
- Format indicator (PDF/Excel/CSV)
- Requestor information
- PDF/Excel/CSV attachment
- HIPAA confidentiality notice
- Responsive design for mobile

---

## Retry Logic Details

| Attempt | Delay After Failure | Action |
|---------|---------------------|--------|
| 1       | Immediate           | First send attempt |
| 2       | 1 minute            | First retry |
| 3       | 5 minutes           | Second retry |
| 4       | 15 minutes          | Final retry |
| Failed  | No more retries     | Mark PERMANENTLY_FAILED |

---

## Database Queries for Monitoring

### View All Active Schedules
```sql
SELECT * FROM report_schedules WHERE status = 'ACTIVE';
```

### View Recent Deliveries
```sql
SELECT * FROM delivery_logs ORDER BY created_at DESC LIMIT 20;
```

### View Failed Deliveries
```sql
SELECT * FROM delivery_logs
WHERE status = 'FAILED'
AND attempt_count < 3
ORDER BY created_at DESC;
```

### View Delivery Success Rate
```sql
SELECT
  status,
  COUNT(*) as count
FROM delivery_logs
GROUP BY status;
```

---

## API Endpoint Summary

### Schedules
- `POST /api/v1/report-schedules` - Create
- `GET /api/v1/report-schedules` - List all
- `GET /api/v1/report-schedules/:id` - Get one
- `PUT /api/v1/report-schedules/:id` - Update
- `DELETE /api/v1/report-schedules/:id` - Delete
- `POST /api/v1/report-schedules/:id/pause` - Pause
- `POST /api/v1/report-schedules/:id/resume` - Resume
- `POST /api/v1/report-schedules/:id/execute` - Run now
- `GET /api/v1/report-schedules/:id/history` - History
- `GET /api/v1/report-schedules/:id/stats` - Statistics

### Subscriptions
- `POST /api/v1/subscriptions` - Subscribe
- `GET /api/v1/subscriptions` - List all
- `GET /api/v1/subscriptions/:id` - Get one
- `PUT /api/v1/subscriptions/:id` - Update
- `DELETE /api/v1/subscriptions/:id` - Unsubscribe
- `POST /api/v1/subscriptions/:id/pause` - Pause
- `POST /api/v1/subscriptions/:id/resume` - Resume

### Distribution Lists
- `POST /api/v1/distribution-lists` - Create
- `GET /api/v1/distribution-lists` - List all
- `GET /api/v1/distribution-lists/:id` - Get one
- `PUT /api/v1/distribution-lists/:id` - Update
- `DELETE /api/v1/distribution-lists/:id` - Delete
- `POST /api/v1/distribution-lists/:id/emails` - Add email
- `DELETE /api/v1/distribution-lists/:id/emails/:email` - Remove email

---

## Next Steps After Testing

Once basic functionality is verified:

1. **Integrate Report Generation**
   - Connect with Agent 7's report builder
   - Replace placeholder report content
   - Generate actual PDF/Excel/CSV attachments

2. **Integrate Export Engine**
   - Connect with Agent 5's export service
   - Generate proper report formats
   - Add chart images for inline embedding

3. **Implement Conditional Logic**
   - Query actual metrics for threshold checks
   - Implement data comparison for change detection
   - Add anomaly detection for exception-based sending

4. **Add Advanced Features**
   - Multiple delivery methods (Slack, SMS, Portal)
   - Email template customization
   - Scheduling analytics dashboard
   - Recipient preference management
   - Bounce list management

---

## Support

For issues or questions:
1. Check server logs first
2. Verify database connectivity
3. Check SMTP configuration
4. Review delivery logs
5. Test with manual execution
6. Monitor retry processor

---

**Status**: ✅ Ready for Testing
**Last Updated**: 2025-11-10
**Agent**: Agent 6 - Automated Distribution Engineer
