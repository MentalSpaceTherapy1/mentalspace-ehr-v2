/**
 * AdvancedMD Integration API Service
 *
 * Client-side service for communicating with AdvancedMD sync endpoints
 */

import api from '../lib/api';
import type { ApiResponse } from '../types';
import type {
  PatientSyncStatus,
  SyncResult,
  SyncLog,
  AppointmentSyncStatus,
  BulkSyncRequest,
  BulkSyncResult,
  PullUpdatesRequest,
  PullUpdatesResult,
  StatusUpdateRequest,
  SyncDashboard,
  LogFilters,
  PaginatedLogs,
  SyncStats,
  AdvancedMDConfig,
  ConnectionTestResult,
} from '../types/advancedmd.types';

// ============================================================================
// Patient Sync API
// ============================================================================

/**
 * Get patient sync status
 * @param clientId - Client ID to check sync status
 * @returns Patient sync status information
 */
export const getPatientSyncStatus = async (
  clientId: string
): Promise<PatientSyncStatus> => {
  const response = await api.get<ApiResponse<PatientSyncStatus>>(
    `/advancedmd/patients/${clientId}/sync-status`
  );
  return response.data.data;
};

/**
 * Sync patient to AdvancedMD
 * @param clientId - Client ID to sync
 * @returns Sync result with AMD patient ID
 */
export const syncPatient = async (clientId: string): Promise<SyncResult> => {
  const response = await api.post<ApiResponse<SyncResult>>(
    `/advancedmd/patients/${clientId}/sync`
  );
  return response.data.data;
};

/**
 * Get patient sync logs
 * @param clientId - Client ID to get sync logs for
 * @returns Array of sync logs for the patient
 */
export const getPatientSyncLogs = async (
  clientId: string
): Promise<SyncLog[]> => {
  const response = await api.get<ApiResponse<SyncLog[]>>(
    `/advancedmd/patients/${clientId}/sync-logs`
  );
  return response.data.data;
};

// ============================================================================
// Appointment Sync API
// ============================================================================

/**
 * Get appointment sync status
 * @param appointmentId - Appointment ID to check sync status
 * @returns Appointment sync status information
 */
export const getAppointmentSyncStatus = async (
  appointmentId: string
): Promise<AppointmentSyncStatus> => {
  const response = await api.get<ApiResponse<AppointmentSyncStatus>>(
    `/advancedmd/appointments/${appointmentId}/sync-status`
  );
  return response.data.data;
};

/**
 * Sync appointment to AdvancedMD
 * @param appointmentId - Appointment ID to sync
 * @param providerId - Provider/clinician ID (required for AdvancedMD)
 * @param facilityId - Optional facility ID (defaults to practice default)
 * @returns Sync result with AMD visit ID
 */
export const syncAppointment = async (
  appointmentId: string,
  providerId: string,
  facilityId?: string
): Promise<SyncResult> => {
  const response = await api.post<ApiResponse<SyncResult>>(
    `/advancedmd/appointments/${appointmentId}/sync`,
    { providerId, facilityId }
  );
  return response.data.data;
};

/**
 * Bulk sync appointments by date range
 * @param request - Date range for bulk sync
 * @returns Bulk sync results with success/error counts
 */
export const bulkSyncAppointments = async (
  request: BulkSyncRequest
): Promise<BulkSyncResult> => {
  const response = await api.post<ApiResponse<BulkSyncResult>>(
    '/advancedmd/appointments/bulk-sync',
    request
  );
  return response.data.data;
};

/**
 * Pull appointment updates from AdvancedMD
 * @param request - Optional 'since' timestamp (defaults to last 24 hours)
 * @returns Pull updates result with created/updated counts
 */
export const pullAppointmentUpdates = async (
  request?: PullUpdatesRequest
): Promise<PullUpdatesResult> => {
  const response = await api.post<ApiResponse<PullUpdatesResult>>(
    '/advancedmd/appointments/pull-updates',
    request || {}
  );
  return response.data.data;
};

/**
 * Update appointment status (syncs to AdvancedMD if appointment is synced)
 * @param appointmentId - Appointment ID to update
 * @param request - Status update request
 * @returns Success confirmation
 */
export const updateAppointmentStatus = async (
  appointmentId: string,
  request: StatusUpdateRequest
): Promise<void> => {
  await api.post(
    `/advancedmd/appointments/${appointmentId}/status-update`,
    request
  );
};

// ============================================================================
// Dashboard & Sync Management API
// ============================================================================

/**
 * Get sync dashboard overview
 * @returns Dashboard data with sync statistics and recent activity
 */
export const getSyncDashboard = async (): Promise<SyncDashboard> => {
  const response = await api.get<ApiResponse<SyncDashboard>>(
    '/advancedmd/sync/dashboard'
  );
  return response.data.data;
};

/**
 * Get sync logs with filtering and pagination
 * @param filters - Optional filters for logs (type, status, direction, pagination)
 * @returns Paginated sync logs
 */
export const getSyncLogs = async (
  filters?: LogFilters
): Promise<PaginatedLogs> => {
  const params = new URLSearchParams();
  if (filters?.syncType) params.append('syncType', filters.syncType);
  if (filters?.syncStatus) params.append('syncStatus', filters.syncStatus);
  if (filters?.syncDirection) params.append('syncDirection', filters.syncDirection);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await api.get<ApiResponse<PaginatedLogs>>(
    `/advancedmd/sync/logs?${params.toString()}`
  );
  return response.data.data;
};

/**
 * Get sync statistics for specified period
 * @param days - Number of days to include in statistics (default: 7)
 * @returns Sync statistics aggregated by day
 */
export const getSyncStats = async (days: number = 7): Promise<SyncStats> => {
  const response = await api.get<ApiResponse<SyncStats>>(
    `/advancedmd/sync/stats?days=${days}`
  );
  return response.data.data;
};

/**
 * Get AdvancedMD configuration (credentials masked)
 * @returns AdvancedMD configuration with masked credentials
 */
export const getConfig = async (): Promise<AdvancedMDConfig> => {
  const response = await api.get<ApiResponse<AdvancedMDConfig>>(
    '/advancedmd/sync/config'
  );
  // Ensure we return a valid config object even if response is incomplete
  return response.data?.data ?? {
    officeKey: '******',
    username: '******',
    environment: 'sandbox',
    autoSyncEnabled: false,
    syncFrequency: 'manual',
    connectionStatus: 'unknown',
    lastConnectionTest: null,
  };
};

/**
 * Test AdvancedMD connection
 * @returns Connection test result
 */
export const testConnection = async (): Promise<ConnectionTestResult> => {
  const response = await api.post<ApiResponse<ConnectionTestResult>>(
    '/advancedmd/sync/test-connection'
  );
  // Ensure we return a valid ConnectionTestResult even if response.data.data is undefined
  return response.data?.data ?? {
    success: false,
    connected: false,
    timestamp: new Date().toISOString(),
    message: 'Invalid response from server',
  };
};

// ============================================================================
// Export all functions as a service object
// ============================================================================

const advancedMDService = {
  // Patient sync
  getPatientSyncStatus,
  syncPatient,
  getPatientSyncLogs,

  // Appointment sync
  getAppointmentSyncStatus,
  syncAppointment,
  bulkSyncAppointments,
  pullAppointmentUpdates,
  updateAppointmentStatus,

  // Dashboard & management
  getSyncDashboard,
  getSyncLogs,
  getSyncStats,
  getConfig,
  testConnection,
};

export default advancedMDService;
