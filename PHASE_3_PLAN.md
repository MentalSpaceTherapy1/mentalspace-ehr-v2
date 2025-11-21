# Phase 3: Appointment Synchronization - Implementation Plan

## Overview

Phase 3 implements bidirectional appointment/visit synchronization between MentalSpace EHR and AdvancedMD, building on the authentication (Phase 1) and patient sync (Phase 2) foundation.

---

## Backend Implementation

### 1. Database Migration

**Add AdvancedMD fields to Appointment model**:

```prisma
model Appointment {
  // ... existing fields ...

  // AdvancedMD Integration Fields
  advancedMDVisitId   String?   @unique
  advancedMDProviderId String?
  advancedMDFacilityId String?
  lastSyncedToAMD     DateTime?
  amdSyncStatus       String?   // 'pending', 'synced', 'error'
  amdSyncError        String?
}
```

**Migration Steps**:
1. Create migration file
2. Add fields to schema
3. Run migration
4. Update seed data if needed

### 2. Appointment Sync Service

**File**: `packages/backend/src/integrations/advancedmd/appointment-sync.service.ts`

**Core Methods**:

```typescript
class AdvancedMDAppointmentSyncService {
  // Lookup/Search
  getAppointments(startDate: Date, endDate: Date, providerId?: string)
  getAppointmentById(visitId: string)

  // Create/Update (to AMD)
  createAppointment(appointmentId: string, providerId: string, facilityId?: string)
  updateAppointment(appointmentId: string)
  cancelAppointment(appointmentId: string, reason?: string)

  // Sync (from AMD)
  syncAppointmentFromAMD(visitId: string)
  getUpdatedAppointments(since: Date)

  // Batch Operations
  bulkSyncAppointments(startDate: Date, endDate: Date)

  // Status Updates
  checkInAppointment(appointmentId: string)
  checkOutAppointment(appointmentId: string)
  markNoShow(appointmentId: string)
  markCompleted(appointmentId: string)
}
```

**Data Mapping**:
- Appointment → VisitData
- VisitData → Appointment
- Status mapping (SCHEDULED ↔ Scheduled, etc.)
- Date/time format conversions

**Sync Logic**:
- Conflict detection (local vs AMD changes)
- Bidirectional sync strategy
- Status synchronization
- Link to patient (must be synced first)

### 3. API Endpoints Used

| Endpoint | Purpose | Tier | Rate Limit |
|----------|---------|------|------------|
| ADDVISIT | Create appointment | Auto | Varies |
| GETAPPTS | Get appointments | Tier 2 | 12/min |
| GETDATEVISITS | Get appointments by date range | Tier 2 | 12/min |
| GETUPDATEDVISITS | Incremental sync | Tier 1 | 1/min |
| UPDVISITWITHNEWCHARGES | Update visit + charges | Tier 2 | 12/min |

### 4. Integration Points

**Requires**:
- Patient must be synced first (advancedMDPatientId)
- Provider must be looked up (LOOKUPPROFILE)
- Facility can be looked up (LOOKUPOFFICE)

**Triggers**:
- New appointment created → Auto-sync to AMD (optional)
- Appointment status changed → Sync status to AMD
- Scheduled sync job → Pull updates from AMD

---

## Frontend Implementation

### 1. AdvancedMD Sync Dashboard

**Location**: `packages/frontend/src/pages/admin/AdvancedMDSync.tsx`

**Features**:
- Overview of sync status (patients, appointments, charges)
- Last sync timestamps
- Success/error counts
- Manual sync triggers
- Sync logs viewer

**UI Components**:
```tsx
<SyncDashboard>
  <SyncStatusCard type="patients" />
  <SyncStatusCard type="appointments" />
  <SyncStatusCard type="charges" />

  <SyncLogsTable
    filters={['patient', 'appointment', 'charge']}
    dateRange={last7Days}
  />

  <ManualSyncButtons>
    <Button>Sync All Patients</Button>
    <Button>Sync Today's Appointments</Button>
    <Button>Pull Updates from AMD</Button>
  </ManualSyncButtons>
</SyncDashboard>
```

### 2. Patient Profile - AMD Sync Section

**Location**: Add to existing patient profile page

**Features**:
- Display AMD patient ID
- Sync status indicator
- Last synced timestamp
- Manual sync button
- Sync history for this patient

**UI**:
```tsx
<Card title="AdvancedMD Integration">
  <SyncStatus
    status={patient.amdSyncStatus}
    lastSynced={patient.lastSyncedToAMD}
    amdPatientId={patient.advancedMDPatientId}
  />

  {!patient.advancedMDPatientId && (
    <Button onClick={handleSyncPatient}>
      Sync to AdvancedMD
    </Button>
  )}

  {patient.amdSyncError && (
    <Alert severity="error">{patient.amdSyncError}</Alert>
  )}
</Card>
```

### 3. Appointment Detail - AMD Sync Section

**Location**: Add to appointment detail/edit page

**Features**:
- Display AMD visit ID
- Sync status indicator
- Last synced timestamp
- Manual sync button
- Link to AMD (if visit ID exists)

**UI**:
```tsx
<Card title="AdvancedMD Visit">
  {appointment.advancedMDVisitId ? (
    <>
      <Text>Visit ID: {appointment.advancedMDVisitId}</Text>
      <SyncStatusBadge status={appointment.amdSyncStatus} />
      <Button onClick={handleResync}>Re-sync</Button>
      <Link href={getAMDVisitURL(appointment.advancedMDVisitId)}>
        View in AdvancedMD ↗
      </Link>
    </>
  ) : (
    <Button onClick={handleCreateVisit}>
      Create Visit in AdvancedMD
    </Button>
  )}
</Card>
```

### 4. Scheduler Integration

**Location**: Add to calendar/scheduler view

**Features**:
- Visual indicator for synced appointments
- Sync status in appointment cards
- Bulk sync for date range
- Warning for unsynced appointments

**UI Enhancement**:
```tsx
<AppointmentCard appointment={appointment}>
  {appointment.advancedMDVisitId && (
    <Badge color="success">Synced to AMD</Badge>
  )}

  {appointment.amdSyncStatus === 'error' && (
    <Tooltip title={appointment.amdSyncError}>
      <Badge color="error">Sync Error</Badge>
    </Tooltip>
  )}
</AppointmentCard>
```

### 5. Sync Settings Page

**Location**: `packages/frontend/src/pages/admin/AdvancedMDSettings.tsx`

**Features**:
- Enable/disable auto-sync
- Configure sync schedules
- Set sync preferences (what to sync, when)
- View credentials (masked)
- Test connection

**UI**:
```tsx
<SettingsPage>
  <Section title="Sync Settings">
    <Toggle
      label="Auto-sync new appointments"
      value={config.autoSyncAppointments}
      onChange={handleToggle}
    />

    <Select
      label="Sync frequency"
      options={['Real-time', 'Hourly', 'Daily', 'Manual']}
      value={config.syncFrequency}
    />
  </Section>

  <Section title="Connection">
    <TextField
      label="Office Key"
      value="162882"
      disabled
    />
    <Button onClick={handleTestConnection}>
      Test Connection
    </Button>
  </Section>
</SettingsPage>
```

---

## API Endpoints (Frontend → Backend)

### Patient Sync APIs

```typescript
// GET /api/advancedmd/patients/:clientId/sync-status
// POST /api/advancedmd/patients/:clientId/sync
// GET /api/advancedmd/patients/:clientId/sync-logs

// Patient sync endpoints
router.get('/patients/:clientId/sync-status', getPatientSyncStatus);
router.post('/patients/:clientId/sync', syncPatientToAMD);
router.get('/patients/:clientId/sync-logs', getPatientSyncLogs);
```

### Appointment Sync APIs

```typescript
// GET /api/advancedmd/appointments/:appointmentId/sync-status
// POST /api/advancedmd/appointments/:appointmentId/sync
// GET /api/advancedmd/appointments/bulk-sync
// POST /api/advancedmd/appointments/pull-updates

router.get('/appointments/:appointmentId/sync-status', getAppointmentSyncStatus);
router.post('/appointments/:appointmentId/sync', syncAppointmentToAMD);
router.post('/appointments/bulk-sync', bulkSyncAppointments);
router.post('/appointments/pull-updates', pullAppointmentUpdates);
```

### Dashboard APIs

```typescript
// GET /api/advancedmd/sync/dashboard
// GET /api/advancedmd/sync/logs
// GET /api/advancedmd/sync/stats

router.get('/sync/dashboard', getSyncDashboard);
router.get('/sync/logs', getSyncLogs);
router.get('/sync/stats', getSyncStatistics);
```

---

## Testing Strategy

### Backend Tests

1. **Unit Tests**:
   - Data mapping (Appointment ↔ VisitData)
   - Date format conversions
   - Status mapping

2. **Integration Tests**:
   - Create appointment in AMD
   - Get appointments by date range
   - Update appointment
   - Sync appointment from AMD
   - Status updates

3. **E2E Tests**:
   - Full sync workflow
   - Conflict resolution
   - Error handling

### Frontend Tests

1. **Component Tests**:
   - Sync dashboard rendering
   - Sync status indicators
   - Manual sync buttons

2. **Integration Tests**:
   - Sync workflow from UI
   - Error handling and display
   - Status updates

---

## Sync Workflows

### Workflow 1: Create Appointment & Sync

```
User creates appointment in MentalSpace
  ↓
Check if patient is synced
  ↓ (if not synced)
Prompt to sync patient first
  ↓ (if synced)
Create appointment locally
  ↓
Auto-sync to AdvancedMD (if enabled)
  ↓
Update appointment with visitId
  ↓
Show success message
```

### Workflow 2: Status Update Sync

```
User updates appointment status (e.g., Checked In)
  ↓
Update local database
  ↓
Check if synced to AMD
  ↓ (if synced)
Send status update to AMD
  ↓
Update sync timestamp
  ↓
Show confirmation
```

### Workflow 3: Pull Updates from AMD

```
User clicks "Pull Updates"
  ↓
Get last sync timestamp
  ↓
Call GETUPDATEDVISITS with timestamp
  ↓
For each updated visit:
  - Find matching appointment (by visitId)
  - Check for conflicts
  - Update local data
  - Log sync operation
  ↓
Show summary (X appointments updated)
```

---

## Security Considerations

### Data Privacy

- ✅ Don't sync appointment notes (contains PHI)
- ✅ Only sync necessary demographic info
- ✅ Mask sensitive data in UI logs
- ✅ Audit trail for all sync operations

### Access Control

- ✅ Only admins can access sync dashboard
- ✅ Only billing staff can manually sync
- ✅ Providers can view sync status (read-only)

### Error Handling

- ✅ Never expose AdvancedMD credentials in errors
- ✅ Sanitize error messages before displaying
- ✅ Log full errors server-side only
- ✅ Retry logic with exponential backoff

---

## Performance Optimization

### Batch Operations

- Sync appointments in batches (max 50 at a time)
- Use bulk APIs when available
- Queue sync operations for high volume

### Caching

- Cache provider/facility lookups (1 hour)
- Cache sync status (5 minutes)
- Invalidate cache on updates

### Rate Limiting

- Respect AdvancedMD rate limits
- Implement queue for sync operations
- Show estimated wait time to users

---

## Monitoring & Alerts

### Metrics to Track

- Sync success rate (%)
- Average sync duration
- Error rate by type
- Queue depth
- Rate limit hits

### Alerts

- Alert on sync failure rate > 10%
- Alert on rate limit exceeded
- Alert on queue depth > 100
- Weekly sync summary report

---

## Rollout Plan

### Phase 3A: Backend Implementation

1. ✅ Add database migration
2. ✅ Create appointment sync service
3. ✅ Create test scripts
4. ✅ Test with real data

### Phase 3B: Backend API Routes

1. Create Express routes
2. Add authentication/authorization
3. Add validation middleware
4. Add error handling

### Phase 3C: Frontend Components

1. Create sync dashboard
2. Add patient profile sync section
3. Add appointment detail sync section
4. Create settings page

### Phase 3D: Testing & QA

1. Manual testing
2. User acceptance testing
3. Load testing
4. Security review

### Phase 3E: Production Deployment

1. Enable for pilot users
2. Monitor metrics
3. Fix issues
4. Roll out to all users

---

## Success Criteria

- ✅ Appointments sync to AdvancedMD successfully
- ✅ Status updates bidirectional
- ✅ No data loss or corruption
- ✅ Sync errors handled gracefully
- ✅ UI clear and intuitive
- ✅ Performance acceptable (< 2s per sync)
- ✅ All tests passing
- ✅ Documentation complete

---

## Timeline Estimate

- **Phase 3A** (Backend): 2-3 hours
- **Phase 3B** (API Routes): 1-2 hours
- **Phase 3C** (Frontend): 3-4 hours
- **Phase 3D** (Testing): 2-3 hours
- **Total**: 8-12 hours

---

## Next Steps After Phase 3

### Phase 4: Billing & Charges

- Sync CPT/ICD codes
- Submit charges to AMD
- Link charges to visits
- Track charge status

### Phase 5: Insurance & Eligibility

- Sync insurance information
- Real-time eligibility checks
- Authorization management
- Benefits verification

### Phase 6: Claims & Payments

- Claim submission
- Claim status tracking
- ERA processing
- Payment reconciliation
