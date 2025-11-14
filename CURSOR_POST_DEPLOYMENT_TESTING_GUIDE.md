# Post-Deployment Testing Guide for Cursor

## Deployment Information
- **Deployment Date**: November 12, 2025
- **Backend URL**: http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com
- **Docker Image Tag**: 20251112-154006
- **ECS Cluster**: mentalspace-ehr-dev
- **ECS Service**: mentalspace-backend-dev
- **Modules Deployed**: 1-9 (Module 10 - Medication Management not implemented per user requirements)

## Pre-Testing Setup

### 1. Verify Deployment Health
```bash
# Check ECS service status
aws ecs describe-services --cluster mentalspace-ehr-dev --services mentalspace-backend-dev --region us-east-1

# Test health endpoint
curl http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com/api/v1/health/live
```

### 2. Test Credentials
Use the following test users for role-based testing:
- **Admin User**: (check database for admin credentials)
- **Clinician User**: (check database for clinician credentials)
- **Client User**: (check database for client credentials)

## Module-by-Module Testing Checklist

---

## Module 1: Client Intake & Onboarding

### Test Cases:
1. **Client Registration**
   - [ ] Test client self-registration flow
   - [ ] Verify email validation
   - [ ] Test phone number formatting
   - [ ] Verify duplicate email prevention

2. **Consent Forms**
   - [ ] Test consent form display
   - [ ] Test signature capture
   - [ ] Verify consent storage
   - [ ] Test consent PDF generation

3. **Emergency Contacts**
   - [ ] Add emergency contact
   - [ ] Update emergency contact
   - [ ] Delete emergency contact
   - [ ] Test multiple emergency contacts

4. **Insurance Information**
   - [ ] Add insurance details
   - [ ] Update insurance information
   - [ ] Test insurance card upload
   - [ ] Verify insurance data validation

**API Endpoints to Test:**
```bash
POST /api/clients/register
GET /api/clients/:id/consent-forms
POST /api/clients/:id/consent-forms
GET /api/clients/:id/emergency-contacts
POST /api/clients/:id/emergency-contacts
PUT /api/clients/:id/emergency-contacts/:contactId
DELETE /api/clients/:id/emergency-contacts/:contactId
GET /api/clients/:id/insurance
POST /api/clients/:id/insurance
PUT /api/clients/:id/insurance/:insuranceId
```

---

## Module 2: Clinical Documentation

### Test Cases:
1. **Progress Notes**
   - [ ] Create new progress note
   - [ ] Edit draft progress note
   - [ ] Sign and lock progress note
   - [ ] Search progress notes by date range
   - [ ] Filter by client

2. **Treatment Plans**
   - [ ] Create treatment plan
   - [ ] Add goals to treatment plan
   - [ ] Add objectives to goals
   - [ ] Update treatment plan status
   - [ ] Review treatment plan history

3. **Clinical Assessments**
   - [ ] Complete initial assessment
   - [ ] Complete follow-up assessment
   - [ ] View assessment history
   - [ ] Export assessment as PDF

4. **SOAP Notes**
   - [ ] Create SOAP note
   - [ ] Test all SOAP sections (Subjective, Objective, Assessment, Plan)
   - [ ] Verify auto-save functionality
   - [ ] Test note templates

**API Endpoints to Test:**
```bash
POST /api/clinical/progress-notes
GET /api/clinical/progress-notes
GET /api/clinical/progress-notes/:id
PUT /api/clinical/progress-notes/:id
POST /api/clinical/progress-notes/:id/sign
POST /api/clinical/treatment-plans
GET /api/clinical/treatment-plans/:clientId
PUT /api/clinical/treatment-plans/:id
POST /api/clinical/assessments
GET /api/clinical/assessments/:clientId
```

---

## Module 3: Scheduling & Appointments

### Test Cases:
1. **Appointment Creation**
   - [ ] Create individual appointment
   - [ ] Create recurring appointments
   - [ ] Test appointment type selection
   - [ ] Verify clinician availability check
   - [ ] Test double-booking prevention

2. **Appointment Management**
   - [ ] Reschedule appointment
   - [ ] Cancel appointment
   - [ ] Mark appointment as no-show
   - [ ] Complete appointment
   - [ ] Test appointment status transitions

3. **Calendar Views**
   - [ ] View daily calendar
   - [ ] View weekly calendar
   - [ ] View monthly calendar
   - [ ] Filter by clinician
   - [ ] Filter by appointment type

4. **Reminders**
   - [ ] Verify SMS reminder configuration
   - [ ] Verify email reminder configuration
   - [ ] Test reminder scheduling
   - [ ] Test reminder cancellation

**API Endpoints to Test:**
```bash
POST /api/appointments
GET /api/appointments
GET /api/appointments/:id
PUT /api/appointments/:id
DELETE /api/appointments/:id
POST /api/appointments/:id/reschedule
POST /api/appointments/:id/cancel
POST /api/appointments/:id/no-show
GET /api/appointments/clinician/:clinicianId
GET /api/appointments/client/:clientId
POST /api/appointments/recurring
```

---

## Module 4: Clinical Assessments & Outcome Measures

### Test Cases:
1. **Assessment Library**
   - [ ] View all available assessments
   - [ ] Search assessments by category
   - [ ] Filter by assessment type
   - [ ] View assessment details

2. **Assessment Administration**
   - [ ] Assign assessment to client
   - [ ] Client completes assessment
   - [ ] Automated scoring verification
   - [ ] View assessment results
   - [ ] Export assessment as PDF

3. **Outcome Tracking**
   - [ ] View outcome trends over time
   - [ ] Compare baseline vs. current scores
   - [ ] Generate outcome reports
   - [ ] Test graphical visualization

4. **Custom Assessments**
   - [ ] Create custom assessment
   - [ ] Add questions to custom assessment
   - [ ] Configure scoring rules
   - [ ] Test custom assessment administration

**API Endpoints to Test:**
```bash
GET /api/assessments
GET /api/assessments/:id
POST /api/assessments/assign
GET /api/assessments/client/:clientId
POST /api/assessments/:id/complete
GET /api/assessments/:id/score
GET /api/outcome-measures/client/:clientId
GET /api/outcome-measures/trends
```

---

## Module 5: Billing & Claims

### Test Cases:
1. **Claim Creation**
   - [ ] Create new claim
   - [ ] Attach service codes (CPT)
   - [ ] Attach diagnosis codes (ICD-10)
   - [ ] Add modifiers
   - [ ] Calculate claim amount

2. **Claim Submission**
   - [ ] Submit claim electronically
   - [ ] Batch claim submission
   - [ ] View submission status
   - [ ] Test error handling for invalid claims

3. **Payment Processing**
   - [ ] Record payment
   - [ ] Apply payment to claim
   - [ ] Process partial payment
   - [ ] Process full payment
   - [ ] Generate receipt

4. **Invoicing**
   - [ ] Generate client invoice
   - [ ] Send invoice via email
   - [ ] Record invoice payment
   - [ ] Apply credit to account

5. **Reporting**
   - [ ] Generate aging report
   - [ ] Generate revenue report
   - [ ] View outstanding claims
   - [ ] Export billing data

**API Endpoints to Test:**
```bash
POST /api/billing/claims
GET /api/billing/claims
GET /api/billing/claims/:id
PUT /api/billing/claims/:id
POST /api/billing/claims/:id/submit
POST /api/billing/payments
GET /api/billing/payments
POST /api/billing/invoices
GET /api/billing/invoices/:clientId
POST /api/billing/invoices/:id/send
GET /api/billing/reports/aging
GET /api/billing/reports/revenue
```

---

## Module 6: Telehealth

### Test Cases:
1. **Session Setup** (CRITICAL - Recent Fixes Applied)
   - [ ] Create telehealth session
   - [ ] Generate session token
   - [ ] Test Twilio credentials configuration
   - [ ] Verify waiting room functionality

2. **Video Session**
   - [ ] Start video session
   - [ ] Test camera on/off
   - [ ] Test microphone on/off
   - [ ] Test screen sharing
   - [ ] Test recording (if enabled)
   - [ ] End session properly (CRITICAL FIX APPLIED)

3. **Session Controls**
   - [ ] Test chat functionality
   - [ ] Test participant list
   - [ ] Test session timer
   - [ ] Test emergency button (CRITICAL FIX APPLIED)
   - [ ] Test session notes

4. **Recording & Playback**
   - [ ] Start/stop recording
   - [ ] View recording list
   - [ ] Playback recorded session
   - [ ] Delete recording

**API Endpoints to Test:**
```bash
POST /api/telehealth/sessions
GET /api/telehealth/sessions/:id
POST /api/telehealth/sessions/:id/token
POST /api/telehealth/sessions/:id/start
POST /api/telehealth/sessions/:id/end
POST /api/telehealth/sessions/:id/recording/start
POST /api/telehealth/sessions/:id/recording/stop
GET /api/telehealth/recordings/:sessionId
```

**Known Fixes Applied:**
- Fixed infinite loop in useEffect (packages/frontend/src/pages/Telehealth/VideoSession.tsx)
- Fixed emergency button callback reference error
- Fixed session end functionality
- Added mock token support for development
- Improved error handling for Twilio integration

---

## Module 7: Waitlist & Self-Scheduling

### Test Cases:
1. **Waitlist Management** (CRITICAL - Recent Fixes Applied)
   - [ ] Add client to waitlist
   - [ ] Update waitlist entry priority
   - [ ] Remove client from waitlist
   - [ ] View waitlist by priority
   - [ ] Filter waitlist by criteria

2. **Smart Matching Engine**
   - [ ] Test clinician preference matching
   - [ ] Test availability matching
   - [ ] Test specialty matching
   - [ ] Test insurance compatibility
   - [ ] View matching scores

3. **Self-Scheduling Portal**
   - [ ] Client views available slots
   - [ ] Client books appointment
   - [ ] Client receives confirmation
   - [ ] Test slot locking mechanism
   - [ ] Test double-booking prevention

4. **Waitlist Notifications**
   - [ ] Test SMS notifications
   - [ ] Test email notifications
   - [ ] Test notification preferences
   - [ ] Test notification history

**API Endpoints to Test:**
```bash
POST /api/waitlist
GET /api/waitlist
GET /api/waitlist/:id
PUT /api/waitlist/:id
DELETE /api/waitlist/:id
POST /api/waitlist/:id/match
GET /api/self-scheduling/available-slots
POST /api/self-scheduling/book
GET /api/self-scheduling/appointment/:id
POST /api/self-scheduling/cancel/:id
```

**Known Fixes Applied:**
- Fixed waitlist matching algorithm
- Fixed self-scheduling slot availability calculation
- Improved notification delivery tracking
- Fixed reschedule functionality

---

## Module 8: Reporting & Analytics

### Test Cases:
1. **Standard Reports** (CRITICAL - Recent Fixes Applied)
   - [ ] Client demographics report
   - [ ] Appointment statistics
   - [ ] Revenue report
   - [ ] Clinician productivity report
   - [ ] No-show rate report

2. **Custom Report Builder**
   - [ ] Create new custom report
   - [ ] Add data sources
   - [ ] Configure filters
   - [ ] Add calculated fields
   - [ ] Test report preview
   - [ ] Save custom report

3. **Data Visualization**
   - [ ] View dashboard widgets
   - [ ] Test chart types (bar, line, pie)
   - [ ] Test date range filters
   - [ ] Export charts as images
   - [ ] Test drill-down functionality

4. **Report Scheduling**
   - [ ] Schedule recurring report
   - [ ] Configure email recipients
   - [ ] Test report delivery
   - [ ] View scheduled reports list

5. **Export Functionality**
   - [ ] Export to PDF
   - [ ] Export to Excel
   - [ ] Export to CSV
   - [ ] Test large dataset export

**API Endpoints to Test:**
```bash
GET /api/reports
GET /api/reports/:id
POST /api/reports/generate
POST /api/reports/custom
GET /api/reports/custom/:id
PUT /api/reports/custom/:id
DELETE /api/reports/custom/:id
POST /api/reports/schedule
GET /api/reports/schedules
DELETE /api/reports/schedules/:id
POST /api/reports/:id/export/pdf
POST /api/reports/:id/export/excel
POST /api/reports/:id/export/csv
GET /api/dashboard/widgets
GET /api/dashboard/stats
```

**Known Fixes Applied:**
- Fixed login rate limiting issue
- Fixed dashboard widget data loading
- Fixed export format handling
- Improved report generation performance

---

## Module 9: Staff Management & HR

### Test Cases:
1. **Staff Directory** (CRITICAL - Recent Fixes Applied)
   - [ ] View all staff members
   - [ ] Search staff by name
   - [ ] Filter by department
   - [ ] Filter by role
   - [ ] Filter by employment status
   - [ ] View staff details

2. **Credentialing**
   - [ ] Add credential to staff
   - [ ] Update credential status
   - [ ] Track expiration dates
   - [ ] View expiring credentials report
   - [ ] Upload credential documents

3. **Training Tracking**
   - [ ] Assign training to staff
   - [ ] Mark training as completed
   - [ ] View training history
   - [ ] Track compliance requirements
   - [ ] Generate training reports

4. **Performance Reviews**
   - [ ] Create performance review
   - [ ] Complete review form
   - [ ] Submit review for signature
   - [ ] Sign review
   - [ ] View review history
   - [ ] Generate performance trends

5. **Compliance & Incidents**
   - [ ] Report incident
   - [ ] Assign incident for investigation
   - [ ] Update incident status
   - [ ] View incident statistics
   - [ ] Generate compliance reports

**API Endpoints to Test:**
```bash
# Staff Management
GET /api/staff
POST /api/staff
GET /api/staff/:id
PUT /api/staff/:id
GET /api/staff/statistics
POST /api/staff/:id/terminate
POST /api/staff/:id/reactivate

# Credentialing
GET /api/staff/:id/credentials
POST /api/staff/:id/credentials
PUT /api/staff/:id/credentials/:credentialId
GET /api/credentialing/expiring

# Training
GET /api/staff/:id/training
POST /api/staff/:id/training
PUT /api/staff/:id/training/:trainingId
GET /api/training/compliance

# Performance Reviews
POST /api/performance/reviews
GET /api/performance/reviews
GET /api/performance/stats
GET /api/performance/reviews/:id
PUT /api/performance/reviews/:id
POST /api/performance/reviews/:id/sign

# Incidents & Compliance
POST /api/incidents
GET /api/incidents
GET /api/incidents/stats
GET /api/incidents/:id
PUT /api/incidents/:id
GET /api/compliance/reports
```

**Known Fixes Applied:**
- Fixed staff data wrapped response extraction (useStaff.ts)
- Fixed jobTitle field name mismatch (was 'title', now 'jobTitle')
- Fixed performance review stats endpoint (/stats route added)
- Fixed incident stats endpoint (/stats route added)
- Fixed double API path in incident routes
- Fixed optional chaining for undefined values in ReviewList component

---

## Critical Bug Fixes to Verify

### Module 6: Telehealth
1. **Infinite Loop Fix**: Verify VideoSession component doesn't cause browser freeze
2. **Emergency Button**: Confirm emergency button works without reference errors
3. **End Session**: Test that ending a session properly cleans up resources
4. **Mock Token**: Verify development mode works with mock tokens

### Module 7: Waitlist
1. **Reschedule Fix**: Test appointment rescheduling from waitlist
2. **Matching Algorithm**: Verify smart matching produces accurate results
3. **Notifications**: Confirm SMS and email notifications are sent

### Module 8: Reports
1. **Login Rate Limit**: Verify login works without excessive rate limiting
2. **Dashboard Widgets**: Confirm all widgets load data correctly
3. **Export Formats**: Test all export formats (PDF, Excel, CSV)

### Module 9: Staff Management
1. **Response Extraction**: Verify staff list loads correctly (wrapped response fix)
2. **Field Names**: Confirm jobTitle field displays properly (not 'title')
3. **Stats Endpoints**: Test /stats endpoints return data
4. **Array Handling**: Verify staff filters work with empty arrays

---

## Performance Testing

### Load Testing
- [ ] Test concurrent API requests (50+ simultaneous)
- [ ] Test database query performance
- [ ] Monitor memory usage under load
- [ ] Test file upload performance

### Response Time Benchmarks
- [ ] API response time < 500ms for GET requests
- [ ] API response time < 1s for POST/PUT requests
- [ ] Page load time < 3s
- [ ] Database query time < 200ms

---

## Security Testing

### Authentication & Authorization
- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials
- [ ] Test session timeout
- [ ] Test role-based access control (RBAC)
- [ ] Test unauthorized endpoint access

### Data Protection
- [ ] Verify HTTPS enforcement
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Test CSRF token validation
- [ ] Verify sensitive data encryption

### API Security
- [ ] Test rate limiting
- [ ] Test authentication token expiration
- [ ] Test API key validation
- [ ] Test input validation
- [ ] Test file upload restrictions

---

## Integration Testing

### Third-Party Services
- [ ] Twilio integration (telehealth)
- [ ] Email service (notifications)
- [ ] SMS service (reminders)
- [ ] Payment gateway (if configured)

### Database
- [ ] Test database connection pooling
- [ ] Verify Prisma schema migrations
- [ ] Test transaction rollback
- [ ] Verify foreign key constraints

---

## Monitoring & Logging

### CloudWatch Logs
```bash
# View application logs
aws logs tail /ecs/mentalspace-backend --follow --region us-east-1

# Filter for errors
aws logs filter-log-events --log-group-name /ecs/mentalspace-backend --filter-pattern "ERROR" --region us-east-1
```

### Metrics to Monitor
- [ ] CPU utilization
- [ ] Memory utilization
- [ ] Request count
- [ ] Error rate
- [ ] Response time p50, p95, p99

---

## Rollback Procedure

If critical issues are found:
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster mentalspace-ehr-dev \
  --service mentalspace-backend-dev \
  --task-definition mentalspace-backend-prod:3 \
  --region us-east-1
```

---

## Testing Sign-Off

### Module Completion Checklist
- [ ] Module 1: Client Intake - All tests passed
- [ ] Module 2: Clinical Documentation - All tests passed
- [ ] Module 3: Scheduling - All tests passed
- [ ] Module 4: Assessments - All tests passed
- [ ] Module 5: Billing - All tests passed
- [ ] Module 6: Telehealth - All tests passed
- [ ] Module 7: Waitlist - All tests passed
- [ ] Module 8: Reports - All tests passed
- [ ] Module 9: Staff Management - All tests passed

### Critical Issues Found
_(Document any blocking issues here)_

### Performance Benchmarks Met
- [ ] All API endpoints < 1s response time
- [ ] No memory leaks detected
- [ ] Database queries optimized

### Security Validation
- [ ] Authentication working correctly
- [ ] Authorization enforced properly
- [ ] No security vulnerabilities found

---

## Support & Troubleshooting

### Common Issues

**Issue**: API returns 401 Unauthorized
- **Solution**: Check authentication token in localStorage
- **Solution**: Verify token hasn't expired

**Issue**: 502 Bad Gateway
- **Solution**: Check ECS service health
- **Solution**: Review application logs for errors

**Issue**: Slow response times
- **Solution**: Check database connection pool
- **Solution**: Review CloudWatch metrics for bottlenecks

### Useful Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster mentalspace-ehr-dev --services mentalspace-backend-dev --region us-east-1

# View running tasks
aws ecs list-tasks --cluster mentalspace-ehr-dev --service-name mentalspace-backend-dev --region us-east-1

# Get task details
aws ecs describe-tasks --cluster mentalspace-ehr-dev --tasks <TASK_ARN> --region us-east-1

# View logs
aws logs tail /ecs/mentalspace-backend --follow --region us-east-1
```

---

## Conclusion

This testing guide covers comprehensive end-to-end testing of all 9 deployed modules. Cursor should execute all test cases systematically and document any issues found.

**Priority**: Test critical bug fixes first (Modules 6, 7, 8, 9) before comprehensive testing.

**Estimated Testing Time**: 6-8 hours for complete testing of all modules.
