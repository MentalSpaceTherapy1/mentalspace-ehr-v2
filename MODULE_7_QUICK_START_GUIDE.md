# Module 7: Guardian Access Control - Quick Start Guide

## What Was Built

A complete system allowing parents/guardians to access minor client records with:
- Identity verification workflow
- Granular permission controls (FULL/LIMITED/VIEW_ONLY)
- Automatic expiration when minors turn 18
- Secure document upload and verification
- Complete audit logging
- HIPAA compliance

---

## File Locations

### Backend Files (7 files)
```
packages/backend/src/
├── services/
│   ├── guardian-relationship.service.ts    ← Core business logic
│   ├── audit-log.service.ts               ← Audit logging
│   └── document-upload.service.ts         ← Document handling
├── middleware/
│   └── guardian-access.middleware.ts       ← Permission checks
├── controllers/
│   └── guardian.controller.new.ts         ← API endpoints
├── routes/
│   └── guardian.routes.new.ts             ← Route definitions
└── jobs/
    └── guardian-age-check.job.ts          ← Daily age check
```

### Frontend Files (4 files)
```
packages/frontend/src/pages/
├── Guardian/
│   ├── GuardianPortal.tsx      ← Guardian dashboard
│   ├── RequestAccess.tsx       ← Access request form
│   └── GuardianConsent.tsx     ← Minor consent management
└── Admin/
    └── GuardianVerification.tsx ← Admin verification panel
```

---

## Quick Setup (5 Minutes)

### 1. Environment Variables
Add to `.env`:
```bash
# AWS S3 (optional, uses local storage if not set)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
GUARDIAN_DOCS_BUCKET=mentalspace-guardian-documents

# Local storage (fallback)
DOCUMENT_STORAGE_PATH=/path/to/local/storage
```

### 2. Initialize Database
The AuditLog table will be created automatically on first use, or run:
```typescript
import auditLogService from './services/audit-log.service';
await auditLogService.ensureAuditTable();
```

### 3. Initialize Document Storage
```typescript
import documentUploadService from './services/document-upload.service';
await documentUploadService.initialize();
```

### 4. Start Age Check Job
Add to your `app.ts` or `index.ts`:
```typescript
import guardianAgeCheckJob from './jobs/guardian-age-check.job';

// Start cron job (runs daily at 2 AM)
guardianAgeCheckJob.start();

// Or run immediately for testing
// await guardianAgeCheckJob.runNow();
```

### 5. Register Routes
Add to your route configuration:
```typescript
import guardianRoutes from './routes/guardian.routes.new';
app.use('/api/guardian', guardianRoutes);
```

### 6. Add Frontend Routes
Add to your React Router:
```typescript
<Route path="/guardian/portal" element={<GuardianPortal />} />
<Route path="/guardian/request-access" element={<RequestAccess />} />
<Route path="/admin/guardian-verification" element={<GuardianVerification />} />
<Route path="/client/guardian-consent" element={<GuardianConsent />} />
```

---

## How It Works

### For Guardians

1. **Request Access**
   - Navigate to `/guardian/request-access`
   - Fill in minor's information
   - Choose relationship type (PARENT, LEGAL_GUARDIAN, HEALTHCARE_PROXY)
   - Choose access level (FULL, LIMITED, VIEW_ONLY)
   - Upload verification documents (birth certificate, court orders, etc.)
   - Submit request

2. **Wait for Verification**
   - Admin reviews documents
   - Admin verifies or rejects request
   - Guardian receives notification

3. **Access Portal**
   - Navigate to `/guardian/portal`
   - Select minor from dropdown
   - View profile, schedule appointments, send messages (based on permissions)

### For Admins

1. **Review Requests**
   - Navigate to `/admin/guardian-verification`
   - View pending verification requests
   - Click to view uploaded documents

2. **Verify or Reject**
   - Click verify button to approve
   - Or click reject button with reason
   - Relationship becomes active upon verification

3. **Manage Active Relationships**
   - View all verified relationships
   - Revoke access if needed
   - View audit logs

### For Minors (16+)

1. **View Guardians**
   - Navigate to `/client/guardian-consent`
   - See all current guardians
   - View their permissions

2. **Request Revocation**
   - Click "Request Revocation" button
   - Provide reason
   - Admin reviews request

---

## Permission Levels Explained

| Level | Can View Records | Can Schedule | Can Communicate |
|-------|-----------------|--------------|-----------------|
| **FULL** | ✅ Yes | ✅ Yes | ✅ Yes |
| **LIMITED** | ✅ Yes | ❌ No | ❌ No |
| **VIEW_ONLY** | ✅ Basic info only | ❌ No | ❌ No |

---

## API Endpoints Quick Reference

### Guardian Endpoints
```
POST   /api/guardian/relationship                      ← Request access
GET    /api/guardian/my-minors                         ← Get my minors
GET    /api/guardian/minors/:minorId/profile          ← View profile
GET    /api/guardian/minors/:minorId/appointments     ← View appointments
POST   /api/guardian/minors/:minorId/appointments     ← Schedule appointment
GET    /api/guardian/minors/:minorId/messages         ← View messages
POST   /api/guardian/minors/:minorId/messages         ← Send message
POST   /api/guardian/relationship/:id/documents       ← Upload document
```

### Admin Endpoints
```
GET    /api/admin/guardian/pending                    ← Pending requests
GET    /api/admin/guardian/relationships              ← All relationships
PUT    /api/admin/guardian/:id/verify                 ← Verify request
PUT    /api/admin/guardian/:id/reject                 ← Reject request
PUT    /api/admin/guardian/:id/revoke                 ← Revoke access
GET    /api/admin/guardian/audit-log                  ← View audit logs
```

---

## Common Tasks

### Testing the System

**Create a test guardian request:**
```bash
curl -X POST http://localhost:3000/api/guardian/relationship \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "minorId": "client-uuid",
    "relationshipType": "PARENT",
    "accessLevel": "FULL",
    "notes": "Test request"
  }'
```

**Verify the request (admin):**
```bash
curl -X PUT http://localhost:3000/api/admin/guardian/RELATIONSHIP_ID/verify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Verified test request"}'
```

**Check if guardian has access:**
```typescript
import guardianRelationshipService from './services/guardian-relationship.service';

const hasAccess = await guardianRelationshipService.checkAccess(
  guardianId,
  minorId,
  'view' // or 'schedule' or 'communicate'
);
```

### Running the Age Check Job Manually

```typescript
import guardianAgeCheckJob from './jobs/guardian-age-check.job';

// Run immediately
await guardianAgeCheckJob.runNow();

// Check logs for results
```

### Viewing Audit Logs

```typescript
import auditLogService from './services/audit-log.service';

// Get all guardian access for a minor
const logs = await auditLogService.getGuardianAccessHistory(minorId);

// Export audit logs to CSV
const csv = await auditLogService.exportAuditLogs({
  resource: 'GuardianAccess',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
});
```

---

## Troubleshooting

### Issue: "AuditLog table does not exist"
**Solution:** Run `auditLogService.ensureAuditTable()`

### Issue: "Document upload failed"
**Solution:** Check AWS credentials or ensure local storage directory exists

### Issue: "Permission denied"
**Solution:** Verify relationship is VERIFIED status and not expired

### Issue: "Age check job not running"
**Solution:** Ensure `guardianAgeCheckJob.start()` is called in app.ts

### Issue: "Frontend routes not working"
**Solution:** Check React Router configuration and route paths

---

## Security Checklist

- [ ] AWS S3 bucket has encryption enabled
- [ ] Presigned URLs have short expiration (1 hour)
- [ ] All guardian access is logged
- [ ] Admin role middleware is implemented
- [ ] File upload validation is enabled
- [ ] HTTPS is enforced in production

---

## Testing Checklist

- [ ] Guardian can request access
- [ ] Admin can verify request
- [ ] Verified guardian can access minor records
- [ ] Permissions are enforced correctly
- [ ] Expired relationships are denied access
- [ ] Documents upload successfully
- [ ] Age check job runs without errors
- [ ] Audit logs are created for all access

---

## Next Steps

1. **Legal Review**
   - Have attorney review consent forms
   - Update privacy policies
   - Ensure state compliance

2. **Testing**
   - Create test scenarios
   - User acceptance testing
   - Performance testing

3. **Documentation**
   - Create user guides for guardians
   - Create admin training materials
   - Update help center

4. **Deployment**
   - Deploy to staging
   - Full testing cycle
   - Deploy to production

---

## Support

For questions or issues:
1. Check the comprehensive report: `MODULE_7_GUARDIAN_ACCESS_IMPLEMENTATION_REPORT.md`
2. Review code comments in service files
3. Check audit logs for troubleshooting

---

**Quick Start Complete! 🎉**

The system is ready for testing and legal review.
