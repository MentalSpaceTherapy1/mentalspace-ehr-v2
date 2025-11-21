/**
 * AdvancedMD Integration Types
 *
 * TypeScript interfaces for AdvancedMD sync operations
 */

// ============================================================================
// Sync Status Types
// ============================================================================

export type SyncStatus = 'pending' | 'synced' | 'error' | 'syncing';
export type SyncDirection = 'to_amd' | 'from_amd' | 'bidirectional';
export type SyncType = 'patient' | 'appointment' | 'charge' | 'insurance';

// ============================================================================
// Patient Sync Types
// ============================================================================

export interface PatientSyncStatus {
  clientId: string;
  amdPatientId: string | null;
  syncStatus: SyncStatus;
  lastSynced: string | null;
  syncError: string | null;
  isSynced: boolean;
}

export interface SyncResult {
  success: boolean;
  message: string;
  amdPatientId?: string;
  amdVisitId?: string;
  syncLogId?: string;
}

// ============================================================================
// Appointment Sync Types
// ============================================================================

export interface AppointmentSyncStatus {
  appointmentId: string;
  amdVisitId: string | null;
  syncStatus: SyncStatus;
  lastSynced: string | null;
  syncError: string | null;
  isSynced: boolean;
  patientSynced: boolean;
  patientAmdId: string | null;
}

export interface BulkSyncRequest {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

export interface BulkSyncResult {
  success: boolean;
  totalAppointments: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    appointmentId: string;
    success: boolean;
    amdVisitId?: string;
    error?: string;
  }>;
}

export interface PullUpdatesRequest {
  since?: string; // ISO date string
}

export interface PullUpdatesResult {
  success: boolean;
  updatedCount: number;
  newCount: number;
  results: Array<{
    visitId: string;
    appointmentId: string | null;
    action: 'created' | 'updated' | 'skipped';
    error?: string;
  }>;
}

export interface StatusUpdateRequest {
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  cancelReason?: string;
}

// ============================================================================
// Sync Log Types
// ============================================================================

export interface SyncLog {
  id: string;
  syncType: SyncType;
  syncDirection: SyncDirection;
  entityId: string; // clientId or appointmentId
  entityType: 'Client' | 'Appointment';
  syncStatus: SyncStatus;
  syncError: string | null;
  amdEntityId: string | null; // amdPatientId or amdVisitId
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface LogFilters {
  syncType?: SyncType;
  syncStatus?: SyncStatus;
  syncDirection?: SyncDirection;
  limit?: number;
  offset?: number;
}

export interface PaginatedLogs {
  logs: SyncLog[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface SyncDashboard {
  patients: {
    total: number;
    synced: number;
    pending: number;
    errors: number;
    lastSynced: string | null;
  };
  appointments: {
    total: number;
    synced: number;
    pending: number;
    errors: number;
    lastSynced: string | null;
  };
  recentActivity: SyncLog[];
  errorCount: number;
}

export interface SyncStats {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  patients: {
    totalSynced: number;
    successRate: number;
    errorRate: number;
    avgSyncDuration: number | null;
  };
  appointments: {
    totalSynced: number;
    successRate: number;
    errorRate: number;
    avgSyncDuration: number | null;
  };
  byDay: Array<{
    date: string;
    patients: number;
    appointments: number;
    errors: number;
  }>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AdvancedMDConfig {
  officeKey: string; // Masked (e.g., "162***")
  username: string; // Masked (e.g., "JOS***")
  environment: 'sandbox' | 'production';
  autoSyncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  lastConnectionTest: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'unknown';
}

export interface ConnectionTestResult {
  success: boolean;
  connected: boolean;
  timestamp: string;
  message?: string;
  error?: string;
}
