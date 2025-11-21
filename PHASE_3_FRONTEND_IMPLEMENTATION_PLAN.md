# Phase 3: Frontend Implementation Plan
## AdvancedMD Appointment Synchronization UI

**Date**: 2025-11-21
**Status**: Ready to Begin - Backend Complete ✅

---

## Overview

This document outlines the implementation plan for Phase 3B (Backend API Routes) and Phase 3C (Frontend Components) of the AdvancedMD integration.

**Backend Status**: ✅ Complete
**Pending**: AdvancedMD user permissions configuration (see [PHASE_3_PENDING_BACKEND_ITEMS.md](PHASE_3_PENDING_BACKEND_ITEMS.md))

---

## Phase 3B: Backend API Routes (1-2 hours)

### Routes to Implement

#### 1. Patient Sync Routes
**Base Path**: `/api/advancedmd/patients`

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/:clientId/sync-status` | Get patient sync status | Admin, Billing |
| POST | `/:clientId/sync` | Sync patient to AdvancedMD | Admin, Billing |
| GET | `/:clientId/sync-logs` | Get patient sync history | Admin, Billing |

#### 2. Appointment Sync Routes
**Base Path**: `/api/advancedmd/appointments`

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/:appointmentId/sync-status` | Get appointment sync status | All authenticated |
| POST | `/:appointmentId/sync` | Sync appointment to AdvancedMD | Admin, Billing, Provider |
| POST | `/bulk-sync` | Bulk sync appointments by date range | Admin, Billing |
| POST | `/pull-updates` | Pull appointment updates from AdvancedMD | Admin, Billing |
| POST | `/:appointmentId/status-update` | Update appointment status in AdvancedMD | Admin, Billing, Provider |

#### 3. Sync Dashboard Routes
**Base Path**: `/api/advancedmd/sync`

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/dashboard` | Get sync dashboard overview | Admin, Billing |
| GET | `/logs` | Get sync operation logs | Admin, Billing |
| GET | `/stats` | Get sync statistics | Admin |
| GET | `/config` | Get AdvancedMD configuration | Admin |
| POST | `/test-connection` | Test AdvancedMD connection | Admin |

---

## Phase 3C: Frontend Components (3-4 hours)

### 1. AdvancedMD Sync Dashboard

**File**: `packages/frontend/src/pages/admin/AdvancedMDSyncDashboard.tsx`

**Features**:
- Sync overview cards (Patients, Appointments, Charges)
- Recent sync logs table
- Manual sync triggers
- Sync statistics charts
- Connection status indicator

**Components to Create**:
- `SyncOverviewCard` - Display sync metrics for each entity type
- `SyncLogsTable` - Paginated table of sync operations
- `SyncStatsChart` - Visual representation of sync trends
- `ManualSyncPanel` - Buttons to trigger manual syncs
- `ConnectionStatusBadge` - Shows AdvancedMD connection status

**API Calls**:
- `GET /api/advancedmd/sync/dashboard` - Dashboard data
- `GET /api/advancedmd/sync/logs` - Sync logs
- `GET /api/advancedmd/sync/stats` - Statistics
- `POST /api/advancedmd/sync/test-connection` - Test connection

### 2. Patient Profile - Sync Section

**File**: Modify `packages/frontend/src/pages/clients/ClientProfile.tsx`

**Features**:
- AdvancedMD patient ID display
- Sync status badge (Synced, Pending, Error, Not Synced)
- Last synced timestamp
- Manual sync button
- Sync error message (if any)
- Link to patient in AdvancedMD (if synced)

**Components to Add**:
```tsx
<Card title="AdvancedMD Integration">
  <AdvancedMDSyncStatus
    entityType="patient"
    entityId={client.id}
    amdId={client.advancedMDPatientId}
    syncStatus={client.amdSyncStatus}
    lastSynced={client.lastSyncedToAMD}
    syncError={client.amdSyncError}
    onSync={handleSyncPatient}
  />
</Card>
```

**API Calls**:
- `GET /api/advancedmd/patients/:clientId/sync-status`
- `POST /api/advancedmd/patients/:clientId/sync`
- `GET /api/advancedmd/patients/:clientId/sync-logs`

### 3. Appointment Detail - Sync Section

**File**: Modify `packages/frontend/src/pages/appointments/AppointmentDetail.tsx`

**Features**:
- AdvancedMD visit ID display
- Sync status badge
- Last synced timestamp
- Manual sync/resync button
- Status update sync (Check In, Check Out, No Show, Completed)
- Link to visit in AdvancedMD (if synced)
- Sync error message (if any)

**Components to Add**:
```tsx
<Card title="AdvancedMD Visit">
  <AdvancedMDSyncStatus
    entityType="appointment"
    entityId={appointment.id}
    amdId={appointment.advancedMDVisitId}
    syncStatus={appointment.amdSyncStatus}
    lastSynced={appointment.lastSyncedToAMD}
    syncError={appointment.amdSyncError}
    onSync={handleSyncAppointment}
  />

  {appointment.advancedMDVisitId && (
    <AppointmentStatusSync
      appointmentId={appointment.id}
      currentStatus={appointment.status}
      onStatusUpdate={handleStatusUpdate}
    />
  )}
</Card>
```

**API Calls**:
- `GET /api/advancedmd/appointments/:appointmentId/sync-status`
- `POST /api/advancedmd/appointments/:appointmentId/sync`
- `POST /api/advancedmd/appointments/:appointmentId/status-update`

### 4. Scheduler - Sync Indicators

**File**: Modify `packages/frontend/src/pages/appointments/SchedulerCalendar.tsx`

**Features**:
- Visual badge/icon on synced appointments
- Sync status tooltip on hover
- Bulk sync button for date range
- Warning indicator for sync errors
- Pull updates from AdvancedMD button

**Components to Add**:
```tsx
// In AppointmentCard component:
<AppointmentCard appointment={appointment}>
  {appointment.advancedMDVisitId && (
    <Badge variant="success" size="sm">
      <Icon name="sync" /> AMD
    </Badge>
  )}

  {appointment.amdSyncStatus === 'error' && (
    <Tooltip content={appointment.amdSyncError}>
      <Badge variant="error" size="sm">
        <Icon name="error" /> Sync Error
      </Badge>
    </Tooltip>
  )}
</AppointmentCard>

// In Scheduler toolbar:
<Button
  onClick={handleBulkSync}
  disabled={!hasUnsyncedAppointments}
>
  Sync All Appointments
</Button>

<Button
  onClick={handlePullUpdates}
  icon="refresh"
>
  Pull Updates from AdvancedMD
</Button>
```

**API Calls**:
- `POST /api/advancedmd/appointments/bulk-sync` - Bulk sync
- `POST /api/advancedmd/appointments/pull-updates` - Pull updates

### 5. AdvancedMD Settings Page

**File**: `packages/frontend/src/pages/admin/AdvancedMDSettings.tsx`

**Features**:
- View AdvancedMD configuration (masked credentials)
- Enable/disable auto-sync options
- Configure sync schedules
- Test connection button
- Connection status display
- Sync preferences (what to sync, when)

**Components to Create**:
```tsx
<SettingsPage title="AdvancedMD Integration Settings">
  <Section title="Connection">
    <ConnectionStatus config={config} />
    <Button onClick={handleTestConnection}>
      Test Connection
    </Button>
  </Section>

  <Section title="Auto-Sync Settings">
    <Toggle
      label="Auto-sync new patients"
      value={config.autoSyncPatients}
      onChange={handleToggle('autoSyncPatients')}
    />
    <Toggle
      label="Auto-sync new appointments"
      value={config.autoSyncVisits}
      onChange={handleToggle('autoSyncVisits')}
    />
    <Toggle
      label="Auto-sync charges"
      value={config.autoSyncClaims}
      onChange={handleToggle('autoSyncClaims')}
    />
  </Section>

  <Section title="Sync Frequency">
    <Select
      label="Patient sync interval (minutes)"
      value={config.pollingIntervalPatients}
      options={[15, 30, 60, 120]}
    />
    <Select
      label="Appointment sync interval (minutes)"
      value={config.pollingIntervalVisits}
      options={[5, 15, 30, 60]}
    />
  </Section>
</SettingsPage>
```

**API Calls**:
- `GET /api/advancedmd/sync/config`
- `POST /api/advancedmd/sync/test-connection`
- `PUT /api/advancedmd/sync/config` (update settings)

---

## Shared Components

### AdvancedMDSyncStatus

Reusable component for displaying sync status across different entities.

**File**: `packages/frontend/src/components/advancedmd/AdvancedMDSyncStatus.tsx`

```tsx
interface AdvancedMDSyncStatusProps {
  entityType: 'patient' | 'appointment' | 'charge';
  entityId: string;
  amdId?: string | null;
  syncStatus?: string | null;
  lastSynced?: Date | null;
  syncError?: string | null;
  onSync: () => void;
  loading?: boolean;
}

export const AdvancedMDSyncStatus: React.FC<AdvancedMDSyncStatusProps> = ({
  entityType,
  entityId,
  amdId,
  syncStatus,
  lastSynced,
  syncError,
  onSync,
  loading = false,
}) => {
  // Component implementation
};
```

### SyncStatusBadge

**File**: `packages/frontend/src/components/advancedmd/SyncStatusBadge.tsx`

```tsx
type SyncStatus = 'synced' | 'pending' | 'error' | 'not_synced';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const config = {
    synced: { color: 'success', icon: 'check-circle', label: 'Synced' },
    pending: { color: 'warning', icon: 'clock', label: 'Pending' },
    error: { color: 'error', icon: 'alert-circle', label: 'Error' },
    not_synced: { color: 'gray', icon: 'circle', label: 'Not Synced' },
  };

  // Component implementation
};
```

---

## State Management

### Context: AdvancedMDSyncContext

**File**: `packages/frontend/src/contexts/AdvancedMDSyncContext.tsx`

```tsx
interface AdvancedMDSyncContextValue {
  // Configuration
  config: AdvancedMDConfig | null;
  isConfigured: boolean;

  // Connection status
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'checking';
  testConnection: () => Promise<boolean>;

  // Sync operations
  syncPatient: (clientId: string) => Promise<void>;
  syncAppointment: (appointmentId: string) => Promise<void>;
  bulkSyncAppointments: (startDate: Date, endDate: Date) => Promise<void>;
  pullAppointmentUpdates: () => Promise<void>;

  // Stats and logs
  dashboardStats: SyncDashboardStats | null;
  syncLogs: SyncLog[];
  loadDashboard: () => Promise<void>;
  loadLogs: (filters?: LogFilters) => Promise<void>;

  // Loading states
  loading: boolean;
  error: string | null;
}
```

---

## API Client Functions

### File: `packages/frontend/src/services/advancedmd.service.ts`

```typescript
export const advancedMDService = {
  // Patient sync
  getPatientSyncStatus: (clientId: string) => Promise<PatientSyncStatus>,
  syncPatient: (clientId: string) => Promise<SyncResult>,
  getPatientSyncLogs: (clientId: string) => Promise<SyncLog[]>,

  // Appointment sync
  getAppointmentSyncStatus: (appointmentId: string) => Promise<AppointmentSyncStatus>,
  syncAppointment: (appointmentId: string) => Promise<SyncResult>,
  bulkSyncAppointments: (startDate: Date, endDate: Date) => Promise<BulkSyncResult>,
  pullAppointmentUpdates: () => Promise<PullUpdatesResult>,
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>,

  // Dashboard
  getDashboard: () => Promise<SyncDashboard>,
  getSyncLogs: (filters?: LogFilters) => Promise<SyncLog[]>,
  getSyncStats: () => Promise<SyncStats>,

  // Config & Connection
  getConfig: () => Promise<AdvancedMDConfig>,
  testConnection: () => Promise<ConnectionTestResult>,
};
```

---

## Implementation Sequence

### Step 1: Backend API Routes (45-60 mins)
1. Create `packages/backend/src/routes/advancedmd.routes.ts`
2. Implement patient sync routes
3. Implement appointment sync routes
4. Implement dashboard routes
5. Add to `packages/backend/src/routes/index.ts`

### Step 2: Shared Components (30-45 mins)
1. Create `AdvancedMDSyncStatus` component
2. Create `SyncStatusBadge` component
3. Create `AdvancedMDSyncContext`
4. Create `advancedmd.service.ts` API client

### Step 3: AdvancedMD Sync Dashboard (45-60 mins)
1. Create dashboard page structure
2. Implement sync overview cards
3. Implement sync logs table
4. Implement manual sync panel
5. Integrate with API

### Step 4: Patient Profile Integration (20-30 mins)
1. Add AdvancedMD sync section to patient profile
2. Wire up sync status display
3. Implement manual sync button
4. Add error handling

### Step 5: Appointment Detail Integration (20-30 mins)
1. Add AdvancedMD visit section
2. Wire up sync status display
3. Implement status update sync
4. Add error handling

### Step 6: Scheduler Integration (30-45 mins)
1. Add sync badges to appointment cards
2. Add bulk sync button to toolbar
3. Add pull updates button
4. Implement sync workflows

### Step 7: Settings Page (30-45 mins)
1. Create settings page structure
2. Implement configuration display
3. Add auto-sync toggles
4. Add test connection feature

### Step 8: Testing & QA (45-60 mins)
1. Test all sync workflows
2. Test error handling
3. Test loading states
4. Test responsive design
5. Fix bugs

---

## Success Criteria

- ✅ All API routes implemented and tested
- ✅ Sync dashboard displays accurate data
- ✅ Patient sync works from profile page
- ✅ Appointment sync works from detail page
- ✅ Bulk sync works from scheduler
- ✅ Status updates sync to AdvancedMD
- ✅ Error messages clear and actionable
- ✅ Loading states prevent double-clicks
- ✅ All components responsive
- ✅ Settings page functional

---

## Notes for Implementation

### AdvancedMD Permission Blockers
Until AdvancedMD user permissions are configured, the following won't work:
- ❌ Appointment lookup/sync (permission denied)
- ⚠️ Data mapping tests (no test data)

**Workaround for Development**:
- UI can be built and tested with mock data
- API routes can return mock responses
- Once permissions are granted, switch to real API calls

### Security Considerations
- Never expose AdvancedMD credentials in frontend
- Mask sensitive data in logs
- Implement proper RBAC for sync operations
- Sanitize error messages before displaying

### Performance
- Implement pagination for sync logs
- Add loading skeletons for better UX
- Debounce manual sync buttons
- Show progress indicators for long operations

---

## Post-Implementation

Once Phase 3C is complete:
1. User acceptance testing
2. Performance testing
3. Security audit
4. Documentation update
5. Deploy to staging
6. Configure AdvancedMD permissions
7. Production testing
8. Roll out to users

Then proceed to **Phase 4: Billing & Charges Synchronization**
