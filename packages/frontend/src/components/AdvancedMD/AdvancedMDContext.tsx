/**
 * AdvancedMD Context
 *
 * React Context for managing AdvancedMD sync state across components
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import advancedMDService from '../../services/advancedmd.service';
import type {
  SyncDashboard,
  SyncStats,
  AdvancedMDConfig,
  PatientSyncStatus,
  AppointmentSyncStatus,
} from '../../types/advancedmd.types';

interface AdvancedMDContextValue {
  // Dashboard state
  dashboard: SyncDashboard | null;
  stats: SyncStats | null;
  config: AdvancedMDConfig | null;

  // Loading states
  isLoadingDashboard: boolean;
  isLoadingStats: boolean;
  isLoadingConfig: boolean;

  // Error states
  dashboardError: string | null;
  statsError: string | null;
  configError: string | null;

  // Actions
  refreshDashboard: () => Promise<void>;
  refreshStats: (days?: number) => Promise<void>;
  refreshConfig: () => Promise<void>;
  syncPatient: (clientId: string) => Promise<void>;
  syncAppointment: (appointmentId: string, providerId: string, facilityId?: string) => Promise<void>;
  testConnection: () => Promise<boolean>;

  // Cache for individual entity statuses
  patientStatuses: Map<string, PatientSyncStatus>;
  appointmentStatuses: Map<string, AppointmentSyncStatus>;
  setPatientStatus: (clientId: string, status: PatientSyncStatus) => void;
  setAppointmentStatus: (appointmentId: string, status: AppointmentSyncStatus) => void;
}

const AdvancedMDContext = createContext<AdvancedMDContextValue | undefined>(undefined);

interface AdvancedMDProviderProps {
  children: ReactNode;
}

/**
 * Provider component for AdvancedMD context
 */
export function AdvancedMDProvider({ children }: AdvancedMDProviderProps) {
  // Dashboard state
  const [dashboard, setDashboard] = useState<SyncDashboard | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [config, setConfig] = useState<AdvancedMDConfig | null>(null);

  // Loading states
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Error states
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Entity status cache
  const [patientStatuses, setPatientStatuses] = useState<Map<string, PatientSyncStatus>>(new Map());
  const [appointmentStatuses, setAppointmentStatuses] = useState<Map<string, AppointmentSyncStatus>>(new Map());

  /**
   * Refresh dashboard data
   */
  const refreshDashboard = useCallback(async () => {
    setIsLoadingDashboard(true);
    setDashboardError(null);
    try {
      const data = await advancedMDService.getSyncDashboard();
      setDashboard(data);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      setDashboardError(error.message || 'Failed to load dashboard');
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(async (days: number = 7) => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      const data = await advancedMDService.getSyncStats(days);
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      setStatsError(error.message || 'Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  /**
   * Refresh configuration
   */
  const refreshConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setConfigError(null);
    try {
      const data = await advancedMDService.getConfig();
      setConfig(data);
    } catch (error: any) {
      console.error('Failed to load config:', error);
      setConfigError(error.message || 'Failed to load configuration');
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  /**
   * Sync patient to AdvancedMD
   */
  const syncPatient = useCallback(async (clientId: string) => {
    try {
      const result = await advancedMDService.syncPatient(clientId);

      // Update patient status cache
      const status = await advancedMDService.getPatientSyncStatus(clientId);
      setPatientStatuses(prev => new Map(prev).set(clientId, status));

      // Refresh dashboard
      await refreshDashboard();
    } catch (error: any) {
      console.error('Failed to sync patient:', error);
      throw error;
    }
  }, [refreshDashboard]);

  /**
   * Sync appointment to AdvancedMD
   */
  const syncAppointment = useCallback(async (
    appointmentId: string,
    providerId: string,
    facilityId?: string
  ) => {
    try {
      const result = await advancedMDService.syncAppointment(appointmentId, providerId, facilityId);

      // Update appointment status cache
      const status = await advancedMDService.getAppointmentSyncStatus(appointmentId);
      setAppointmentStatuses(prev => new Map(prev).set(appointmentId, status));

      // Refresh dashboard
      await refreshDashboard();
    } catch (error: any) {
      console.error('Failed to sync appointment:', error);
      throw error;
    }
  }, [refreshDashboard]);

  /**
   * Test AdvancedMD connection
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const result = await advancedMDService.testConnection();
      return result.connected;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, []);

  /**
   * Set patient status in cache
   */
  const setPatientStatus = useCallback((clientId: string, status: PatientSyncStatus) => {
    setPatientStatuses(prev => new Map(prev).set(clientId, status));
  }, []);

  /**
   * Set appointment status in cache
   */
  const setAppointmentStatus = useCallback((appointmentId: string, status: AppointmentSyncStatus) => {
    setAppointmentStatuses(prev => new Map(prev).set(appointmentId, status));
  }, []);

  const value: AdvancedMDContextValue = {
    dashboard,
    stats,
    config,
    isLoadingDashboard,
    isLoadingStats,
    isLoadingConfig,
    dashboardError,
    statsError,
    configError,
    refreshDashboard,
    refreshStats,
    refreshConfig,
    syncPatient,
    syncAppointment,
    testConnection,
    patientStatuses,
    appointmentStatuses,
    setPatientStatus,
    setAppointmentStatus,
  };

  return (
    <AdvancedMDContext.Provider value={value}>
      {children}
    </AdvancedMDContext.Provider>
  );
}

/**
 * Hook to use AdvancedMD context
 */
export function useAdvancedMD() {
  const context = useContext(AdvancedMDContext);
  if (context === undefined) {
    throw new Error('useAdvancedMD must be used within an AdvancedMDProvider');
  }
  return context;
}

export default AdvancedMDContext;
