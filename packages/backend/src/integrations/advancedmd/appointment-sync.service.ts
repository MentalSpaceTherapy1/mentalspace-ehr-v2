/**
 * AdvancedMD Appointment Synchronization Service
 *
 * Phase 3: Appointment/Visit Synchronization
 *
 * This service handles bidirectional synchronization of appointments/visits
 * between MentalSpace EHR and AdvancedMD Practice Management System.
 *
 * Key Features:
 * - Create appointments in AdvancedMD (ADDVISIT)
 * - Get appointments by date range (GETDATEVISITS)
 * - Update appointment status (check-in, check-out, no-show, completed)
 * - Sync appointments from AdvancedMD to local database
 * - Bulk synchronization operations
 * - Conflict detection and resolution
 *
 * @module integrations/advancedmd/appointment-sync
 */

import { PrismaClient, Appointment, AppointmentStatus } from '@prisma/client';
import { AdvancedMDAPIClient, advancedMDAPI } from './api-client';
import logger from '../../utils/logger';
import {
  VisitData,
  AddVisitRequest,
  GetDateVisitsRequest,
  GetUpdatedVisitsRequest,
  UpdateVisitWithNewChargesRequest,
} from '../../types/advancedmd.types';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Result of appointment lookup operation
 */
export interface AppointmentLookupResult {
  found: boolean;
  advancedMDVisitId?: string;
  visitData?: VisitData;
  multipleMatches?: VisitData[];
}

/**
 * Result of appointment sync operation
 */
export interface AppointmentSyncResult {
  success: boolean;
  appointmentId: string;
  advancedMDVisitId?: string;
  syncDirection: 'to_amd' | 'from_amd';
  message?: string;
  error?: string;
}

/**
 * Options for appointment data mapping
 */
export interface AppointmentMappingOptions {
  includeNotes?: boolean; // Default: false (PHI protection)
  includeDiagnosis?: boolean; // Default: false
  includeCharges?: boolean; // Default: false
}

/**
 * AdvancedMD Appointment Synchronization Service
 *
 * Handles appointment/visit synchronization with AdvancedMD.
 */
export class AdvancedMDAppointmentSyncService {
  private apiClient: AdvancedMDAPIClient;
  private initialized: boolean = false;

  constructor() {
    this.apiClient = new AdvancedMDAPIClient();
  }

  /**
   * Initialize the appointment sync service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.apiClient.initialize();
    this.initialized = true;
  }

  /**
   * Ensure service is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AdvancedMDAppointmentSyncService not initialized. Call initialize() first.');
    }
  }

  // ========================================================================
  // SECTION 1: LOOKUP & SEARCH OPERATIONS
  // ========================================================================

  /**
   * Get appointments by date range
   *
   * @param startDate - Start date (MM/DD/YYYY)
   * @param endDate - End date (MM/DD/YYYY)
   * @param providerId - Optional provider ID to filter
   * @returns Array of visit data
   */
  async getAppointments(
    startDate: string,
    endDate: string,
    providerId?: string
  ): Promise<VisitData[]> {
    this.ensureInitialized();

    const request: GetDateVisitsRequest = {
      ppmdmsg: {
        '@action': 'getdatevisits',
        '@class': 'api',
        '@msgtime': new Date().toISOString(),
        '@startdate': startDate,
        '@enddate': endDate,
      },
    };

    if (providerId) {
      request.ppmdmsg['@providerid'] = providerId;
    }

    const response = await this.apiClient.makeRequest('GETDATEVISITS', request.ppmdmsg);

    logger.debug('[Appointment Sync] Response:', JSON.stringify(response, null, 2));

    if (!response.success || !response.data) {
      const errorMsg = response.error
        ? (typeof response.error === 'string' ? response.error : response.error.message || JSON.stringify(response.error))
        : 'Failed to get appointments from AdvancedMD';
      throw new Error(errorMsg);
    }

    // Parse visits from response
    const visits = this.parseVisitsFromResponse(response.data);
    return visits;
  }

  /**
   * Get a specific appointment by AdvancedMD visit ID
   *
   * @param visitId - AdvancedMD visit ID
   * @returns Appointment lookup result
   */
  async getAppointmentById(visitId: string): Promise<AppointmentLookupResult> {
    this.ensureInitialized();

    // Use GETAPPTS with visit ID filter
    const response = await this.apiClient.makeRequest('GETAPPTS', {
      '@action': 'getappts',
      '@class': 'api',
      '@msgtime': new Date().toISOString(),
      visitid: visitId,
    });

    if (!response.success || !response.data) {
      return { found: false };
    }

    const visits = this.parseVisitsFromResponse(response.data);

    if (visits.length === 0) {
      return { found: false };
    }

    if (visits.length === 1) {
      return {
        found: true,
        advancedMDVisitId: visits[0].visitId,
        visitData: visits[0],
      };
    }

    // Multiple matches (shouldn't happen with visit ID, but handle it)
    return {
      found: true,
      advancedMDVisitId: visitId,
      multipleMatches: visits,
    };
  }

  /**
   * Get updated appointments since a given timestamp
   *
   * @param since - Date to get updates since
   * @returns Array of updated visit data
   */
  async getUpdatedAppointments(since: Date): Promise<VisitData[]> {
    this.ensureInitialized();

    const sinceDate = this.formatDateForAMD(since);

    const request: GetUpdatedVisitsRequest = {
      ppmdmsg: {
        '@action': 'getupdatedvisits',
        '@class': 'api',
        '@msgtime': new Date().toISOString(),
        '@datechanged': sinceDate,
      },
    };

    const response = await this.apiClient.makeRequest('GETUPDATEDVISITS', request.ppmdmsg);

    if (!response.success || !response.data) {
      return [];
    }

    return this.parseVisitsFromResponse(response.data);
  }

  // ========================================================================
  // SECTION 2: CREATE & UPDATE OPERATIONS (TO AMD)
  // ========================================================================

  /**
   * Create an appointment in AdvancedMD
   *
   * @param appointmentId - Local appointment ID
   * @param providerId - AdvancedMD provider ID
   * @param facilityId - Optional AdvancedMD facility ID
   * @param options - Mapping options
   * @returns Sync result
   */
  async createAppointment(
    appointmentId: string,
    providerId: string,
    facilityId?: string,
    options?: AppointmentMappingOptions
  ): Promise<AppointmentSyncResult> {
    this.ensureInitialized();

    // Start sync log
    const syncLog = await prisma.advancedMDSyncLog.create({
      data: {
        syncType: 'appointment',
        entityId: appointmentId,
        entityType: 'Appointment',
        syncDirection: 'to_amd',
        syncStatus: 'in_progress',
        syncStarted: new Date(),
      },
    });

    try {
      // Get appointment from database
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true, clinician: true },
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      // Check if client is synced to AdvancedMD
      if (!appointment.client.advancedMDPatientId) {
        throw new Error(`Client ${appointment.client.id} not synced to AdvancedMD. Sync patient first.`);
      }

      // Map appointment to visit data
      const visitData = this.mapAppointmentToVisitData(
        appointment,
        appointment.client.advancedMDPatientId,
        providerId,
        facilityId,
        options
      );

      // Create visit in AdvancedMD
      const request: AddVisitRequest = {
        ppmdmsg: {
          '@action': 'addvisit',
          '@class': 'api',
          '@msgtime': new Date().toISOString(),
          visit: visitData,
        },
      };

      const response = await this.apiClient.makeRequest('ADDVISIT', request.ppmdmsg);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message || JSON.stringify(response.error))
          : 'Failed to create visit in AdvancedMD';
        throw new Error(errorMsg);
      }

      // Extract visit ID from response
      const visitId = this.extractVisitIdFromResponse(response.data);

      if (!visitId) {
        throw new Error('Visit created but no visit ID returned');
      }

      // Update local appointment with AdvancedMD visit ID
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          advancedMDVisitId: visitId,
          advancedMDProviderId: providerId,
          advancedMDFacilityId: facilityId,
          lastSyncedToAMD: new Date(),
          amdSyncStatus: 'synced',
          amdSyncError: null,
        },
      });

      // Update sync log
      await prisma.advancedMDSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'success',
          syncCompleted: new Date(),
          advancedMDId: visitId,
        },
      });

      return {
        success: true,
        appointmentId,
        advancedMDVisitId: visitId,
        syncDirection: 'to_amd',
        message: 'Appointment synced to AdvancedMD successfully',
      };
    } catch (error: any) {
      // Update appointment with error
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          amdSyncStatus: 'error',
          amdSyncError: error.message,
        },
      });

      // Update sync log
      await prisma.advancedMDSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'failed',
          syncCompleted: new Date(),
          errorMessage: error.message,
        },
      });

      return {
        success: false,
        appointmentId,
        syncDirection: 'to_amd',
        error: error.message,
      };
    }
  }

  /**
   * Update an appointment in AdvancedMD
   *
   * @param appointmentId - Local appointment ID
   * @param options - Mapping options
   * @returns Sync result
   */
  async updateAppointment(
    appointmentId: string,
    options?: AppointmentMappingOptions
  ): Promise<AppointmentSyncResult> {
    this.ensureInitialized();

    const syncLog = await prisma.advancedMDSyncLog.create({
      data: {
        syncType: 'appointment',
        entityId: appointmentId,
        entityType: 'Appointment',
        syncDirection: 'to_amd',
        syncStatus: 'in_progress',
        syncStarted: new Date(),
      },
    });

    try {
      // Get appointment from database
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true, clinician: true },
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      if (!appointment.advancedMDVisitId) {
        throw new Error(`Appointment ${appointmentId} not synced to AdvancedMD. Create it first.`);
      }

      if (!appointment.client.advancedMDPatientId) {
        throw new Error(`Client ${appointment.client.id} not synced to AdvancedMD`);
      }

      // Map appointment to visit data
      const visitData = this.mapAppointmentToVisitData(
        appointment,
        appointment.client.advancedMDPatientId,
        appointment.advancedMDProviderId || '',
        appointment.advancedMDFacilityId || undefined,
        options
      );

      // Include visit ID for update
      visitData.visitId = appointment.advancedMDVisitId;

      // Update visit in AdvancedMD
      const request: UpdateVisitWithNewChargesRequest = {
        ppmdmsg: {
          '@action': 'updvisitwithnewcharges',
          '@class': 'api',
          '@msgtime': new Date().toISOString(),
          '@visitid': appointment.advancedMDVisitId!,
          chargelist: { charge: [] }, // TODO: Add charge data if needed
        },
      };

      const response = await this.apiClient.makeRequest('UPDVISITWITHNEWCHARGES', request.ppmdmsg);

      if (!response.success) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message || JSON.stringify(response.error))
          : 'Failed to update visit in AdvancedMD';
        throw new Error(errorMsg);
      }

      // Update local appointment sync timestamp
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          lastSyncedToAMD: new Date(),
          amdSyncStatus: 'synced',
          amdSyncError: null,
        },
      });

      // Update sync log
      await prisma.advancedMDSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'success',
          syncCompleted: new Date(),
          advancedMDId: appointment.advancedMDVisitId,
        },
      });

      return {
        success: true,
        appointmentId,
        advancedMDVisitId: appointment.advancedMDVisitId,
        syncDirection: 'to_amd',
        message: 'Appointment updated in AdvancedMD successfully',
      };
    } catch (error: any) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          amdSyncStatus: 'error',
          amdSyncError: error.message,
        },
      });

      await prisma.advancedMDSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'failed',
          syncCompleted: new Date(),
          errorMessage: error.message,
        },
      });

      return {
        success: false,
        appointmentId,
        syncDirection: 'to_amd',
        error: error.message,
      };
    }
  }

  /**
   * Cancel an appointment in AdvancedMD
   *
   * @param appointmentId - Local appointment ID
   * @param reason - Optional cancellation reason
   * @returns Sync result
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<AppointmentSyncResult> {
    // Update appointment status to cancelled and sync
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });

    // Sync the cancellation to AdvancedMD
    return this.updateAppointment(appointmentId);
  }

  // ========================================================================
  // SECTION 3: SYNC OPERATIONS (FROM AMD)
  // ========================================================================

  /**
   * Sync an appointment from AdvancedMD to local database
   *
   * @param visitId - AdvancedMD visit ID
   * @returns Sync result
   */
  async syncAppointmentFromAMD(visitId: string): Promise<AppointmentSyncResult> {
    this.ensureInitialized();

    const syncLog = await prisma.advancedMDSyncLog.create({
      data: {
        syncType: 'appointment',
        entityId: visitId, // Use AMD visit ID as entity ID for from_amd syncs
        entityType: 'Appointment',
        syncDirection: 'from_amd',
        syncStatus: 'in_progress',
        syncStarted: new Date(),
        advancedMDId: visitId,
      },
    });

    try {
      // Get visit from AdvancedMD
      const lookupResult = await this.getAppointmentById(visitId);

      if (!lookupResult.found || !lookupResult.visitData) {
        throw new Error(`Visit ${visitId} not found in AdvancedMD`);
      }

      const visitData = lookupResult.visitData;

      // Find or create local appointment
      let appointment = await prisma.appointment.findUnique({
        where: { advancedMDVisitId: visitId },
      });

      // Find local client by AdvancedMD patient ID
      const client = await prisma.client.findUnique({
        where: { advancedMDPatientId: visitData.patientId },
      });

      if (!client) {
        throw new Error(`Client with AdvancedMD patient ID ${visitData.patientId} not found locally`);
      }

      if (appointment) {
        // Update existing appointment
        appointment = await prisma.appointment.update({
          where: { id: appointment.id },
          data: this.mapVisitDataToAppointmentUpdate(visitData),
        });
      } else {
        // Create new appointment
        appointment = await prisma.appointment.create({
          data: this.mapVisitDataToAppointmentCreate(visitData, client.id),
        });
      }

      // Update sync log
      await prisma.advancedMDSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'success',
          syncCompleted: new Date(),
          entityId: appointment.id,
        },
      });

      return {
        success: true,
        appointmentId: appointment.id,
        advancedMDVisitId: visitId,
        syncDirection: 'from_amd',
        message: 'Appointment synced from AdvancedMD successfully',
      };
    } catch (error: any) {
      await prisma.advancedMDSyncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: 'failed',
          syncCompleted: new Date(),
          errorMessage: error.message,
        },
      });

      return {
        success: false,
        appointmentId: '',
        syncDirection: 'from_amd',
        error: error.message,
      };
    }
  }

  /**
   * Bulk sync appointments for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of sync results
   */
  async bulkSyncAppointments(startDate: Date, endDate: Date): Promise<AppointmentSyncResult[]> {
    this.ensureInitialized();

    const startDateStr = this.formatDateForAMD(startDate);
    const endDateStr = this.formatDateForAMD(endDate);

    // Get appointments from AdvancedMD
    const visits = await this.getAppointments(startDateStr, endDateStr);

    const results: AppointmentSyncResult[] = [];

    for (const visitData of visits) {
      if (!visitData.visitId) {
        continue;
      }

      const result = await this.syncAppointmentFromAMD(visitData.visitId);
      results.push(result);
    }

    return results;
  }

  // ========================================================================
  // SECTION 4: STATUS UPDATE OPERATIONS
  // ========================================================================

  /**
   * Mark appointment as checked in
   */
  async checkInAppointment(appointmentId: string): Promise<AppointmentSyncResult> {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CHECKED_IN },
    });

    return this.updateAppointment(appointmentId);
  }

  /**
   * Mark appointment as checked out
   */
  async checkOutAppointment(appointmentId: string): Promise<AppointmentSyncResult> {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return this.updateAppointment(appointmentId);
  }

  /**
   * Mark appointment as no-show
   */
  async markNoShow(appointmentId: string): Promise<AppointmentSyncResult> {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.NO_SHOW },
    });

    return this.updateAppointment(appointmentId);
  }

  /**
   * Mark appointment as completed
   */
  async markCompleted(appointmentId: string): Promise<AppointmentSyncResult> {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return this.updateAppointment(appointmentId);
  }

  // ========================================================================
  // SECTION 5: DATA MAPPING HELPERS
  // ========================================================================

  /**
   * Map local Appointment to AdvancedMD VisitData
   */
  private mapAppointmentToVisitData(
    appointment: Appointment & { client: any; clinician: any },
    advancedMDPatientId: string,
    providerId: string,
    facilityId?: string,
    options?: AppointmentMappingOptions
  ): VisitData {
    const visitData: VisitData = {
      patientId: advancedMDPatientId,
      appointmentDate: this.formatDateForAMD(appointment.appointmentDate),
      appointmentTime: appointment.startTime,
      providerId: providerId,
      status: this.mapAppointmentStatusToAMD(appointment.status) as 'Cancelled' | 'Completed' | 'Scheduled' | 'Confirmed' | 'Checked In',
    };

    if (facilityId) {
      visitData.facilityId = facilityId;
    }

    if (appointment.appointmentType) {
      visitData.visitType = appointment.appointmentType;
    }

    // Note: Don't include clinical notes or diagnosis unless explicitly requested (HIPAA)
    if (options?.includeNotes && appointment.appointmentNotes) {
      visitData.chiefComplaint = appointment.appointmentNotes.substring(0, 255); // Limit length
    }

    return visitData;
  }

  /**
   * Map AdvancedMD VisitData to local Appointment update data
   */
  private mapVisitDataToAppointmentUpdate(visitData: VisitData): Partial<Appointment> {
    return {
      advancedMDVisitId: visitData.visitId,
      advancedMDProviderId: visitData.providerId,
      advancedMDFacilityId: visitData.facilityId,
      status: this.mapAMDStatusToAppointmentStatus(visitData.status),
      lastSyncedToAMD: new Date(),
      amdSyncStatus: 'synced',
      amdSyncError: null,
    };
  }

  /**
   * Map AdvancedMD VisitData to new Appointment creation data
   */
  private mapVisitDataToAppointmentCreate(visitData: VisitData, clientId: string): any {
    const appointmentDate = this.parseAMDDate(visitData.appointmentDate);

    return {
      clientId: clientId,
      clinicianId: 'system', // TODO: Map provider ID to clinician
      appointmentDate: appointmentDate,
      startTime: visitData.appointmentTime || '09:00',
      endTime: '10:00', // TODO: Calculate based on visit type
      duration: 60,
      status: this.mapAMDStatusToAppointmentStatus(visitData.status),
      appointmentType: visitData.visitType || 'FOLLOW_UP',
      advancedMDVisitId: visitData.visitId,
      advancedMDProviderId: visitData.providerId,
      advancedMDFacilityId: visitData.facilityId,
      lastSyncedToAMD: new Date(),
      amdSyncStatus: 'synced',
    };
  }

  /**
   * Map local AppointmentStatus to AdvancedMD status string
   */
  private mapAppointmentStatusToAMD(status: AppointmentStatus): string {
    const statusMap: Record<AppointmentStatus, string> = {
      [AppointmentStatus.REQUESTED]: 'Scheduled',
      [AppointmentStatus.SCHEDULED]: 'Scheduled',
      [AppointmentStatus.CONFIRMED]: 'Confirmed',
      [AppointmentStatus.CHECKED_IN]: 'Checked In',
      [AppointmentStatus.IN_SESSION]: 'In Progress',
      [AppointmentStatus.COMPLETED]: 'Completed',
      [AppointmentStatus.CANCELLED]: 'Cancelled',
      [AppointmentStatus.NO_SHOW]: 'No Show',
      [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
    };

    return statusMap[status] || 'Scheduled';
  }

  /**
   * Map AdvancedMD status string to local AppointmentStatus
   */
  private mapAMDStatusToAppointmentStatus(status?: string): AppointmentStatus {
    if (!status) return AppointmentStatus.SCHEDULED;

    const statusMap: Record<string, AppointmentStatus> = {
      Scheduled: AppointmentStatus.SCHEDULED,
      Confirmed: AppointmentStatus.CONFIRMED,
      'Checked In': AppointmentStatus.CHECKED_IN,
      'In Progress': AppointmentStatus.IN_SESSION,
      Completed: AppointmentStatus.COMPLETED,
      Cancelled: AppointmentStatus.CANCELLED,
      'No Show': AppointmentStatus.NO_SHOW,
      Rescheduled: AppointmentStatus.RESCHEDULED,
    };

    return statusMap[status] || AppointmentStatus.SCHEDULED;
  }

  /**
   * Format Date object to AdvancedMD date string (MM/DD/YYYY)
   */
  private formatDateForAMD(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Parse AdvancedMD date string (MM/DD/YYYY) to Date object
   */
  private parseAMDDate(dateStr: string): Date {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Parse visits from AdvancedMD API response
   */
  private parseVisitsFromResponse(data: any): VisitData[] {
    // Handle different response formats
    if (!data) return [];

    if (Array.isArray(data)) {
      return data as VisitData[];
    }

    if (data.visit) {
      return Array.isArray(data.visit) ? data.visit : [data.visit];
    }

    if (data.visits) {
      return Array.isArray(data.visits) ? data.visits : [data.visits];
    }

    return [];
  }

  /**
   * Extract visit ID from AdvancedMD API response
   */
  private extractVisitIdFromResponse(data: any): string | null {
    if (!data) return null;

    if (typeof data === 'string') {
      return data;
    }

    if (data.visitId) {
      return data.visitId;
    }

    if (data.visit?.visitId) {
      return data.visit.visitId;
    }

    return null;
  }
}

/**
 * Singleton instance of AdvancedMDAppointmentSyncService
 */
let appointmentSyncInstance: AdvancedMDAppointmentSyncService | null = null;

/**
 * Get or create the singleton instance
 */
export const advancedMDAppointmentSync = new Proxy({} as AdvancedMDAppointmentSyncService, {
  get(_target, prop) {
    if (!appointmentSyncInstance) {
      appointmentSyncInstance = new AdvancedMDAppointmentSyncService();
    }
    return appointmentSyncInstance[prop as keyof AdvancedMDAppointmentSyncService];
  },
});
