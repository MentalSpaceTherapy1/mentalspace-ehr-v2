/**
 * Appointment Sync Section Component
 *
 * Displays AdvancedMD sync status and actions for an appointment
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import advancedMDService from '../../services/advancedmd.service';
import type { AppointmentSyncStatus, SyncLog } from '../../types/advancedmd.types';

interface AppointmentSyncSectionProps {
  appointmentId: string;
  providerId?: string;
  facilityId?: string;
  className?: string;
}

/**
 * Appointment AdvancedMD Sync Section
 */
export default function AppointmentSyncSection({
  appointmentId,
  providerId,
  facilityId,
  className = '',
}: AppointmentSyncSectionProps) {
  const [syncStatus, setSyncStatus] = useState<AppointmentSyncStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  /**
   * Load sync status
   */
  useEffect(() => {
    loadSyncStatus();
  }, [appointmentId]);

  const loadSyncStatus = async () => {
    setIsLoading(true);
    try {
      const status = await advancedMDService.getAppointmentSyncStatus(appointmentId);
      setSyncStatus(status);

      // Note: Appointment sync logs would require a separate endpoint
      // For now, we'll skip loading logs for appointments
    } catch (error: any) {
      console.error('Failed to load sync status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle sync to AdvancedMD
   */
  const handleSync = async () => {
    if (!providerId) {
      toast.error('Provider ID is required to sync appointment');
      return;
    }

    if (!syncStatus?.patientSynced) {
      toast.error('Patient must be synced to AdvancedMD before syncing appointment');
      return;
    }

    setIsSyncing(true);
    try {
      await advancedMDService.syncAppointment(appointmentId, providerId, facilityId);
      toast.success('Appointment synced to AdvancedMD successfully');
      await loadSyncStatus();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync appointment: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Handle status update
   */
  const handleStatusUpdate = async (status: 'CHECKED_IN' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW') => {
    setIsUpdatingStatus(true);
    try {
      await advancedMDService.updateAppointmentStatus(appointmentId, { status });
      toast.success(`Appointment status updated to ${status}`);
      await loadSyncStatus();
    } catch (error: any) {
      console.error('Status update failed:', error);
      toast.error('Failed to update status: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'pending':
        return 'bg-gradient-to-r from-gray-400 to-slate-400 text-white';
      case 'syncing':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl shadow-xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-purple-500 ${className}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🔄</span> AdvancedMD Visit Sync
      </h3>

      {syncStatus && (
        <div className="space-y-4">
          {/* Patient Sync Warning */}
          {!syncStatus.patientSynced && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 p-4 rounded-xl">
              <div className="flex items-start">
                <span className="text-amber-600 mr-2 text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-1">Patient Not Synced</p>
                  <p className="text-xs text-amber-700">
                    The patient must be synced to AdvancedMD before this appointment can be synced.
                    {syncStatus.patientAmdId && (
                      <span className="block mt-1">Patient AMD ID: {syncStatus.patientAmdId}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Sync Status</span>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusBadgeColor(syncStatus.syncStatus)}`}>
                {syncStatus.syncStatus.toUpperCase()}
              </span>
            </div>

            {syncStatus.amdVisitId && (
              <div className="mt-2">
                <span className="text-sm font-bold text-gray-600">AMD Visit ID: </span>
                <span className="text-sm font-mono font-bold text-gray-900">{syncStatus.amdVisitId}</span>
              </div>
            )}

            {syncStatus.lastSynced && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Last synced: {formatDate(syncStatus.lastSynced)}</span>
              </div>
            )}
          </div>

          {/* Sync Error */}
          {syncStatus.syncError && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 p-4 rounded-xl">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-red-700 mb-1">Sync Error</p>
                  <p className="text-sm text-red-600">{syncStatus.syncError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing || !syncStatus.patientSynced || !providerId}
            className={`w-full px-4 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transform transition-all duration-200 flex items-center justify-center ${
              isSyncing || !syncStatus.patientSynced || !providerId
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 hover:scale-105'
            }`}
          >
            <span className="mr-2">{isSyncing ? '⏳' : '🔄'}</span>
            {isSyncing
              ? 'Syncing...'
              : syncStatus.isSynced
              ? 'Re-sync to AdvancedMD'
              : 'Sync to AdvancedMD'}
          </button>

          {!providerId && (
            <p className="text-xs text-amber-600 text-center">
              Provider ID required for sync
            </p>
          )}

          {/* Status Update Buttons */}
          {syncStatus.isSynced && (
            <div className="mt-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Update Status</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStatusUpdate('CHECKED_IN')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                >
                  ✓ Check In
                </button>
                <button
                  onClick={() => handleStatusUpdate('COMPLETED')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                >
                  ✓ Complete
                </button>
                <button
                  onClick={() => handleStatusUpdate('CANCELLED')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                >
                  ✗ Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate('NO_SHOW')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                >
                  ✗ No Show
                </button>
              </div>
            </div>
          )}

          {/* Info Message */}
          {!syncStatus.isSynced && syncStatus.patientSynced && providerId && !syncStatus.syncError && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-3 rounded-xl">
              <p className="text-xs text-blue-700">
                💡 This appointment has not been synced to AdvancedMD. Click the button above to create a visit in AdvancedMD.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
