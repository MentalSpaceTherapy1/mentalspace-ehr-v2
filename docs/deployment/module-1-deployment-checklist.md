# Module 1 Deployment Checklist

**Module**: Authentication & User Management
**Version**: 2.0
**Last Updated**: November 2, 2025
**Deployment Type**: Production

---

## Pre-Deployment Checklist

### 1. Database Preparation

- [ ] **Database Backup Created**
  - Backup location: `__________________`
  - Backup size: `__________________`
  - Backup verified: `__________________`
  - Restore tested on staging: ☐ Yes ☐ No

- [ ] **Migrations Reviewed**
  - All migration files reviewed: ☐ Yes ☐ No
  - Migrations tested on dev environment: ☐ Yes ☐ No
  - Migrations tested on staging environment: ☐ Yes ☐ No
  - Rollback procedure documented: ☐ Yes ☐ No

- [ ] **Database Performance**
  - Indexes created for new tables: ☐ Yes ☐ No
  - Query performance tested: ☐ Yes ☐ No
  - Connection pool configured: ☐ Yes ☐ No

### 2. Code Testing

- [ ] **Unit Tests**
  - All unit tests passing: ☐ Yes ☐ No
  - Code coverage >85%: ☐ Yes ☐ No
  - Test report reviewed: ☐ Yes ☐ No

- [ ] **Integration Tests**
  - Authentication flow tests passing: ☐ Yes ☐ No
  - Session management tests passing: ☐ Yes ☐ No
  - MFA flow tests passing: ☐ Yes ☐ No
  - Account lockout tests passing: ☐ Yes ☐ No
  - Password policy tests passing: ☐ Yes ☐ No

- [ ] **Security Tests**
  - Brute force attack simulation completed: ☐ Yes ☐ No
  - SQL injection tests passed: ☐ Yes ☐ No
  - XSS vulnerability tests passed: ☐ Yes ☐ No
  - Session hijacking tests passed: ☐ Yes ☐ No
  - npm audit passed (no critical vulnerabilities): ☐ Yes ☐ No

- [ ] **End-to-End Tests**
  - Complete user onboarding flow: ☐ Yes ☐ No
  - Login with and without MFA: ☐ Yes ☐ No
  - Session timeout and extension: ☐ Yes ☐ No
  - Account lockout and unlock: ☐ Yes ☐ No
  - Password change and expiration: ☐ Yes ☐ No

### 3. Environment Configuration

- [ ] **Environment Variables Set**
  - DATABASE_URL configured: ☐ Yes ☐ No
  - JWT_SECRET configured (256-bit): ☐ Yes ☐ No
  - JWT_REFRESH_SECRET configured: ☐ Yes ☐ No
  - MFA_ENCRYPTION_KEY configured (32-byte hex): ☐ Yes ☐ No
  - SMTP credentials configured: ☐ Yes ☐ No
  - SESSION_TIMEOUT_MINUTES set to 20: ☐ Yes ☐ No
  - MAX_CONCURRENT_SESSIONS set to 2: ☐ Yes ☐ No
  - ACCOUNT_LOCKOUT_DURATION_MINUTES set to 30: ☐ Yes ☐ No
  - MAX_FAILED_LOGIN_ATTEMPTS set to 5: ☐ Yes ☐ No

- [ ] **AWS Secrets Manager**
  - Database credentials stored: ☐ Yes ☐ No
  - JWT secrets stored: ☐ Yes ☐ No
  - MFA encryption key stored: ☐ Yes ☐ No
  - SMTP password stored: ☐ Yes ☐ No

- [ ] **SSL/TLS Configuration**
  - HTTPS enforced on all endpoints: ☐ Yes ☐ No
  - TLS 1.3 enabled: ☐ Yes ☐ No
  - SSL certificate valid and not expiring soon: ☐ Yes ☐ No
  - HTTP to HTTPS redirect configured: ☐ Yes ☐ No

### 4. Dependencies

- [ ] **Backend Dependencies**
  - All dependencies installed: ☐ Yes ☐ No
  - bcryptjs installed: ☐ Yes ☐ No
  - jsonwebtoken installed: ☐ Yes ☐ No
  - speakeasy installed (MFA): ☐ Yes ☐ No
  - qrcode installed (MFA): ☐ Yes ☐ No
  - express-rate-limit installed: ☐ Yes ☐ No
  - No critical vulnerabilities: ☐ Yes ☐ No

- [ ] **Frontend Dependencies**
  - All dependencies installed: ☐ Yes ☐ No
  - React 18+ installed: ☐ Yes ☐ No
  - Axios installed: ☐ Yes ☐ No
  - React Router v6 installed: ☐ Yes ☐ No
  - No critical vulnerabilities: ☐ Yes ☐ No

### 5. Security Headers

- [ ] **HTTP Security Headers Configured**
  - Content-Security-Policy: ☐ Yes ☐ No
  - X-Content-Type-Options: nosniff: ☐ Yes ☐ No
  - X-Frame-Options: DENY: ☐ Yes ☐ No
  - Strict-Transport-Security: ☐ Yes ☐ No
  - X-XSS-Protection: 1; mode=block: ☐ Yes ☐ No
  - Referrer-Policy: no-referrer: ☐ Yes ☐ No

### 6. Rate Limiting

- [ ] **Rate Limits Configured**
  - Login endpoint: 5 req/min per IP: ☐ Yes ☐ No
  - Password reset: 3 req/hour per IP: ☐ Yes ☐ No
  - Account creation: 5 req/hour per IP: ☐ Yes ☐ No
  - MFA setup: 5 req/hour per user: ☐ Yes ☐ No
  - Rate limit storage configured (Redis/Memory): ☐ Yes ☐ No

### 7. Monitoring & Logging

- [ ] **CloudWatch Configuration**
  - Log group created: ☐ Yes ☐ No
  - Log retention set (7 years for audit logs): ☐ Yes ☐ No
  - Error logs configured: ☐ Yes ☐ No
  - Performance metrics configured: ☐ Yes ☐ No

- [ ] **CloudWatch Alarms**
  - High error rate alarm: ☐ Yes ☐ No
  - Failed login spike alarm: ☐ Yes ☐ No
  - Database connection alarm: ☐ Yes ☐ No
  - API latency alarm: ☐ Yes ☐ No

- [ ] **Audit Logging**
  - Audit log table exists: ☐ Yes ☐ No
  - All security events logged: ☐ Yes ☐ No
  - Retention policy configured (7 years): ☐ Yes ☐ No
  - Log immutability enforced: ☐ Yes ☐ No

### 8. Session Cleanup

- [ ] **Cron Job Configuration**
  - Session cleanup job scheduled (hourly): ☐ Yes ☐ No
  - Cron job tested: ☐ Yes ☐ No
  - CloudWatch monitoring for cron: ☐ Yes ☐ No

### 9. Documentation

- [ ] **User Documentation**
  - MFA setup guide available: ☐ Yes ☐ No
  - Account security guide available: ☐ Yes ☐ No
  - User FAQ updated: ☐ Yes ☐ No

- [ ] **Admin Documentation**
  - Account management guide available: ☐ Yes ☐ No
  - Incident response procedures documented: ☐ Yes ☐ No
  - Audit log guide available: ☐ Yes ☐ No

- [ ] **Technical Documentation**
  - API documentation updated: ☐ Yes ☐ No
  - Architecture documentation current: ☐ Yes ☐ No
  - Deployment runbook available: ☐ Yes ☐ No
  - Rollback procedure documented: ☐ Yes ☐ No

### 10. User Communication

- [ ] **Communication Prepared**
  - User notification email drafted: ☐ Yes ☐ No
  - Training materials prepared: ☐ Yes ☐ No
  - Support team briefed: ☐ Yes ☐ No
  - FAQ updated: ☐ Yes ☐ No
  - Release notes written: ☐ Yes ☐ No

---

## Deployment Steps

### Step 1: Database Migration

**Estimated Time**: 5-10 minutes

```bash
# 1. Connect to production database (read-only)
psql -h <prod-db-host> -U <user> -d mentalspace

# 2. Verify current schema
\dt

# 3. Dry-run migration (staging only)
npx prisma migrate deploy --preview-feature

# 4. Run migration on production
npx prisma migrate deploy

# 5. Verify migration
\dt sessions
\d users
```

**Verification Checklist**:
- [ ] Sessions table created
- [ ] User table updated with new fields (failedLoginAttempts, accountLockedUntil, passwordHistory, mfaSecret, etc.)
- [ ] Indexes created
- [ ] No errors in migration log

**Rollback Plan** (if migration fails):
```bash
# Revert migration
npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup
psql -h <host> -U <user> -d mentalspace < backup.sql
```

### Step 2: Backend Deployment

**Estimated Time**: 10-15 minutes

```bash
# 1. Build Docker image
docker build -t mentalspace-backend:v2.0 .

# 2. Tag for ECR
docker tag mentalspace-backend:v2.0 <account-id>.dkr.ecr.<region>.amazonaws.com/mentalspace-backend:v2.0

# 3. Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/mentalspace-backend:v2.0

# 4. Update ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 5. Update ECS service
aws ecs update-service \
  --cluster mentalspace-cluster \
  --service backend-service \
  --task-definition mentalspace-backend:v2.0 \
  --force-new-deployment

# 6. Monitor deployment
aws ecs describe-services \
  --cluster mentalspace-cluster \
  --services backend-service
```

**Verification Checklist**:
- [ ] New tasks started successfully
- [ ] Health checks passing
- [ ] No errors in CloudWatch logs
- [ ] Old tasks terminated gracefully

### Step 3: Frontend Deployment

**Estimated Time**: 5-10 minutes

```bash
# 1. Build frontend
cd packages/frontend
npm run build

# 2. Sync to S3
aws s3 sync dist/ s3://mentalspace-frontend --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"

# 4. Wait for invalidation
aws cloudfront wait invalidation-completed \
  --distribution-id <distribution-id> \
  --id <invalidation-id>
```

**Verification Checklist**:
- [ ] Frontend accessible via HTTPS
- [ ] All static assets loading
- [ ] No console errors
- [ ] Login page displays correctly

### Step 4: Post-Deployment Verification

**Estimated Time**: 15-20 minutes

#### 4.1 Functional Testing

**Login Flow**:
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Login with wrong password 5 times locks account
- [ ] Locked account shows correct error message with time

**Session Management**:
- [ ] Session created on successful login
- [ ] Session timeout warning appears at 18 minutes
- [ ] Session extends when user clicks "Extend"
- [ ] Session expires after 20 minutes inactivity
- [ ] Concurrent session limit enforced (max 2)

**MFA Flow** (if user has MFA enabled):
- [ ] MFA setup wizard accessible
- [ ] QR code displays correctly
- [ ] TOTP verification works
- [ ] Backup codes downloadable
- [ ] MFA skip button works
- [ ] MFA disable function works

**Password Management**:
- [ ] Password change succeeds with valid new password
- [ ] Password change fails with reused password (history check)
- [ ] Password change fails with weak password
- [ ] Password expiration warning appears (for test user with old password)
- [ ] Force password change works (admin function)

**Account Lockout**:
- [ ] Account unlocks automatically after 30 minutes
- [ ] Admin can unlock account manually
- [ ] Unlock is logged in audit log

#### 4.2 Security Verification

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present in response
- [ ] Rate limiting working (test with 10 rapid login attempts)
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Session tokens not visible in URL
- [ ] JWT tokens properly signed

#### 4.3 Performance Verification

- [ ] Login response time < 2 seconds
- [ ] MFA verification < 1 second
- [ ] Session validation < 100ms
- [ ] API endpoints < 500ms average
- [ ] Database queries optimized (no N+1)

#### 4.4 Monitoring Verification

- [ ] CloudWatch logs receiving entries
- [ ] Audit logs being written
- [ ] Error rate within normal range (<1%)
- [ ] CloudWatch alarms functioning
- [ ] Metrics dashboard showing data

### Step 5: User Communication

**Estimated Time**: Immediate after deployment

```
Subject: New Security Features - Two-Factor Authentication & Session Management

Dear MentalSpace Team,

We've deployed important security enhancements to protect patient data:

NEW FEATURES:
- Two-Factor Authentication (MFA) - Optional but recommended
- Session timeout after 20 minutes of inactivity
- Account lockout after 5 failed login attempts
- Password expiration every 90 days for staff

WHAT YOU NEED TO DO:
1. Review the MFA Setup Guide (link below) - optional but strongly encouraged
2. Be aware of the 20-minute session timeout (you'll get a warning)
3. Contact IT if your account gets locked

DOCUMENTATION:
- MFA Setup Guide: https://docs.mentalspace.com/mfa-setup
- Account Security Guide: https://docs.mentalspace.com/account-security
- FAQ: https://docs.mentalspace.com/faq

SUPPORT:
If you have questions or issues, contact:
- Email: support@mentalspace.com
- Phone: 1-800-MENTAL-SPACE
- Hours: Monday-Friday, 8 AM - 8 PM EST

Thank you for helping us keep patient data secure!

Best regards,
MentalSpace IT Team
```

- [ ] Email sent to all users
- [ ] Support team briefed
- [ ] FAQ published
- [ ] Training session scheduled (if needed)

---

## Post-Deployment Monitoring

### First 24 Hours

**Check every 2 hours**:
- [ ] Error rate (target: <1%)
- [ ] Failed login rate
- [ ] Account lockout rate
- [ ] Session creation rate
- [ ] API latency
- [ ] Database performance

**Issues to Watch For**:
- Spike in failed logins (could indicate brute force attack)
- High account lockout rate (could indicate user confusion)
- Session timeout complaints (monitor support tickets)
- MFA setup issues (monitor support tickets)

### First Week

**Daily Checks**:
- [ ] Review CloudWatch alarms
- [ ] Check audit logs for anomalies
- [ ] Monitor support ticket volume
- [ ] Review user feedback
- [ ] Check database performance

**Metrics to Track**:
- MFA adoption rate
- Average login time
- Session timeout rate
- Account lockout rate
- Support ticket volume related to auth

### First Month

**Weekly Checks**:
- [ ] Generate security report
- [ ] Review audit logs
- [ ] Analyze user behavior
- [ ] Check for security incidents
- [ ] Review performance metrics

**Reports to Generate**:
- MFA adoption by role (Administrator, Clinician, etc.)
- Account lockout frequency
- Session timeout patterns
- Failed login patterns
- Support ticket summary

---

## Rollback Procedure

### When to Rollback

Rollback if:
- [ ] Critical bugs discovered affecting user login
- [ ] Security vulnerability identified
- [ ] Database corruption detected
- [ ] Performance degradation >50%
- [ ] High error rate (>5%)

### Rollback Steps

**Step 1: Stop New Deployments**
```bash
# Pause ECS service updates
aws ecs update-service \
  --cluster mentalspace-cluster \
  --service backend-service \
  --desired-count 0
```

**Step 2: Revert Backend**
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster mentalspace-cluster \
  --service backend-service \
  --task-definition mentalspace-backend:v1.9 \
  --force-new-deployment
```

**Step 3: Revert Frontend**
```bash
# Restore previous frontend version from S3 backup
aws s3 sync s3://mentalspace-frontend-backup/v1.9/ s3://mentalspace-frontend/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

**Step 4: Rollback Database** (only if necessary)
```bash
# Revert migration
npx prisma migrate resolve --rolled-back <migration-name>

# OR restore from backup (if data corruption)
psql -h <host> -U <user> -d mentalspace < backup-pre-deployment.sql
```

**Step 5: Verify Rollback**
- [ ] Frontend accessible
- [ ] Backend health checks passing
- [ ] Login working
- [ ] Database queries working
- [ ] Error rate normal

**Step 6: Communicate**
- [ ] Notify users of rollback
- [ ] Update status page
- [ ] Brief support team
- [ ] Schedule post-mortem

---

## Success Criteria

Deployment is considered successful when:

- [ ] All tests passing (unit, integration, security, E2E)
- [ ] Zero critical errors in first 24 hours
- [ ] Error rate <1%
- [ ] API latency <500ms average
- [ ] User login success rate >99%
- [ ] No security incidents
- [ ] Support ticket volume within normal range
- [ ] User feedback positive
- [ ] Performance metrics within targets
- [ ] Monitoring and alerts functioning

---

## Stakeholder Sign-Off

**Pre-Deployment Approval**:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | ______________ | ______________ | ______ |
| DevOps Lead | ______________ | ______________ | ______ |
| Security Officer | ______________ | ______________ | ______ |
| Product Manager | ______________ | ______________ | ______ |

**Post-Deployment Verification**:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | ______________ | ______________ | ______ |
| DevOps Lead | ______________ | ______________ | ______ |
| QA Lead | ______________ | ______________ | ______ |

---

## Contact Information

**Deployment Lead**:
- Name: ______________
- Email: ______________
- Phone: ______________

**On-Call Engineer**:
- Name: ______________
- Email: ______________
- Phone: ______________

**Support Team**:
- Email: support@mentalspace.com
- Phone: 1-800-MENTAL-SPACE

**Security Incidents**:
- Email: security@mentalspace.com
- Phone: 1-800-MENTAL-SPACE (option 9)
- Available: 24/7

---

**Deployment Date**: ______________
**Deployment Time**: ______________ (EST)
**Deployment Duration**: ______________ (estimated: 30-45 minutes)
**Rollback Time**: ______________ (if needed)

---

**Last Updated**: November 2, 2025
**Version**: 2.0
**Next Review**: Before next deployment
