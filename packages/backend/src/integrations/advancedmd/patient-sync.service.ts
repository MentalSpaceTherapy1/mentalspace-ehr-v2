/**
 * AdvancedMD Patient Synchronization Service
 *
 * Handles bidirectional patient sync between MentalSpace EHR and AdvancedMD:
 * - Patient lookup (find existing patients)
 * - Patient creation (add new patients to AMD)
 * - Patient updates (sync demographics)
 * - Incremental sync (pull updated patients from AMD)
 *
 * @module integrations/advancedmd/patient-sync.service
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import {
  PatientDemographic,
  LookupPatientRequest,
  AddPatientRequest,
  UpdatePatientRequest,
  GetUpdatedPatientsRequest,
  AdvancedMDResponse,
  SyncDirection,
  SyncStatus,
  AMDDateString,
  AMDDateTimeString,
} from '../../../../shared/src/types/advancedmd.types';
import { AdvancedMDAuthService } from './auth.service';
import { AdvancedMDRateLimiterService } from './rate-limiter.service';

const prisma = new PrismaClient();

/**
 * Patient Lookup Result
 */
export interface PatientLookupResult {
  found: boolean;
  advancedMDPatientId?: string;
  demographic?: PatientDemographic;
  multipleMatches?: PatientDemographic[];
}

/**
 * Patient Sync Result
 */
export interface PatientSyncResult {
  success: boolean;
  advancedMDPatientId?: string;
  errorMessage?: string;
  syncLogId?: string;
}

/**
 * Client to Patient Demographic Mapping Options
 */
export interface MappingOptions {
  includeSSN?: boolean;
  includeEmail?: boolean;
  includePhone?: boolean;
}

/**
 * Patient Synchronization Service
 */
export class AdvancedMDPatientSyncService {
  private authService: AdvancedMDAuthService;
  private rateLimiter: AdvancedMDRateLimiterService;
  private httpClient: AxiosInstance;

  constructor() {
    this.authService = new AdvancedMDAuthService();
    this.rateLimiter = new AdvancedMDRateLimiterService();

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MentalSpace-EHR/2.0',
      },
    });
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.authService.initialize();
    console.log('[AMD Patient Sync] Service initialized');
  }

  /**
   * Lookup patient in AdvancedMD by demographics
   */
  async lookupPatient(
    lastName: string,
    firstName: string,
    dateOfBirth?: string
  ): Promise<PatientLookupResult> {
    try {
      console.log(`[AMD Patient Sync] Looking up patient: ${firstName} ${lastName}`);

      // Check rate limit
      await this.rateLimiter.checkRateLimit('LOOKUPPATIENT');

      // Get auth token and URL
      const token = await this.authService.getToken();
      const apiURL = await this.authService.getRedirectURL('XMLRPC');

      // Build request
      const request: LookupPatientRequest = {
        ppmdmsg: {
          '@action': 'lookuppatient',
          '@class': 'api',
          '@msgtime': this.formatDateTime(new Date()),
          '@lastname': lastName,
          '@firstname': firstName,
          ...(dateOfBirth && { '@dob': dateOfBirth }),
        },
      };

      // Make API call
      const response = await this.httpClient.post<any>(apiURL, request, {
        headers: {
          Cookie: `token=${token}`,
        },
      });

      // Record success
      await this.rateLimiter.recordSuccess('LOOKUPPATIENT');

      // Parse response
      return this.parseLookupResponse(response.data);
    } catch (error: any) {
      await this.rateLimiter.recordFailure('LOOKUPPATIENT', error.message);
      console.error('[AMD Patient Sync] Lookup failed:', error.message);
      throw error;
    }
  }

  /**
   * Lookup patient by AdvancedMD patient ID
   */
  async lookupPatientById(advancedMDPatientId: string): Promise<PatientLookupResult> {
    try {
      console.log(`[AMD Patient Sync] Looking up patient by ID: ${advancedMDPatientId}`);

      await this.rateLimiter.checkRateLimit('LOOKUPPATIENT');
      const token = await this.authService.getToken();
      const apiURL = await this.authService.getRedirectURL('XMLRPC');

      const request: LookupPatientRequest = {
        ppmdmsg: {
          '@action': 'lookuppatient',
          '@class': 'api',
          '@msgtime': this.formatDateTime(new Date()),
          '@patientid': advancedMDPatientId,
        },
      };

      const response = await this.httpClient.post<any>(apiURL, request, {
        headers: {
          Cookie: `token=${token}`,
        },
      });

      await this.rateLimiter.recordSuccess('LOOKUPPATIENT');
      return this.parseLookupResponse(response.data);
    } catch (error: any) {
      await this.rateLimiter.recordFailure('LOOKUPPATIENT', error.message);
      throw error;
    }
  }

  /**
   * Create new patient in AdvancedMD
   */
  async createPatient(
    clientId: string,
    profileId: string,
    options: MappingOptions = {}
  ): Promise<PatientSyncResult> {
    const syncLog = await this.createSyncLog(clientId, 'to_amd', 'pending');

    try {
      console.log(`[AMD Patient Sync] Creating patient for client: ${clientId}`);

      // Get client data
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          emergencyContacts: { where: { isPrimary: true }, take: 1 },
        },
      });

      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // Check if already synced
      if (client.advancedMDPatientId) {
        throw new Error(`Client already synced to AdvancedMD: ${client.advancedMDPatientId}`);
      }

      // Map to patient demographic
      const demographic = this.mapClientToDemographic(client, options);

      // Check rate limit
      await this.rateLimiter.checkRateLimit('ADDPATIENT');

      // Get auth
      const token = await this.authService.getToken();
      const apiURL = await this.authService.getRedirectURL('XMLRPC');

      // Build request
      const request: AddPatientRequest = {
        ppmdmsg: {
          '@action': 'addpatient',
          '@class': 'api',
          '@msgtime': this.formatDateTime(new Date()),
          patient: {
            ...demographic,
            '@profileid': profileId,
          },
        },
      };

      // Log request
      await this.updateSyncLog(syncLog.id, { requestData: request });

      // Make API call
      const response = await this.httpClient.post<any>(apiURL, request, {
        headers: {
          Cookie: `token=${token}`,
        },
      });

      await this.rateLimiter.recordSuccess('ADDPATIENT');

      // Parse response
      const patientId = this.parseCreateResponse(response.data);

      // Update client with AdvancedMD ID
      await prisma.client.update({
        where: { id: clientId },
        data: {
          advancedMDPatientId: patientId,
          lastSyncedToAMD: new Date(),
          amdSyncStatus: 'synced',
          amdSyncError: null,
        },
      });

      // Complete sync log
      await this.completeSyncLog(syncLog.id, 'success', response.data, patientId);

      console.log(`[AMD Patient Sync] Patient created: ${patientId}`);

      return {
        success: true,
        advancedMDPatientId: patientId,
        syncLogId: syncLog.id,
      };
    } catch (error: any) {
      await this.rateLimiter.recordFailure('ADDPATIENT', error.message);
      await this.completeSyncLog(syncLog.id, 'error', null, null, error.message);

      // Update client sync status
      await prisma.client.update({
        where: { id: clientId },
        data: {
          amdSyncStatus: 'error',
          amdSyncError: error.message,
        },
      });

      console.error('[AMD Patient Sync] Create failed:', error.message);

      return {
        success: false,
        errorMessage: error.message,
        syncLogId: syncLog.id,
      };
    }
  }

  /**
   * Update existing patient in AdvancedMD
   */
  async updatePatient(
    clientId: string,
    options: MappingOptions = {}
  ): Promise<PatientSyncResult> {
    const syncLog = await this.createSyncLog(clientId, 'to_amd', 'pending');

    try {
      console.log(`[AMD Patient Sync] Updating patient for client: ${clientId}`);

      // Get client data
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          emergencyContacts: { where: { isPrimary: true }, take: 1 },
        },
      });

      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      if (!client.advancedMDPatientId) {
        throw new Error(`Client not synced to AdvancedMD yet`);
      }

      // Map to patient demographic
      const demographic = this.mapClientToDemographic(client, options);

      // Check rate limit (using GETDEMOGRAPHIC as proxy for update)
      await this.rateLimiter.checkRateLimit('GETDEMOGRAPHIC');

      // Get auth
      const token = await this.authService.getToken();
      const apiURL = await this.authService.getRedirectURL('XMLRPC');

      // Build request
      const request: UpdatePatientRequest = {
        ppmdmsg: {
          '@action': 'updatepatient',
          '@class': 'api',
          '@msgtime': this.formatDateTime(new Date()),
          patient: {
            ...demographic,
            '@patientid': client.advancedMDPatientId,
          },
        },
      };

      // Log request
      await this.updateSyncLog(syncLog.id, { requestData: request });

      // Make API call
      const response = await this.httpClient.post<any>(apiURL, request, {
        headers: {
          Cookie: `token=${token}`,
        },
      });

      await this.rateLimiter.recordSuccess('GETDEMOGRAPHIC');

      // Update client
      await prisma.client.update({
        where: { id: clientId },
        data: {
          lastSyncedToAMD: new Date(),
          amdSyncStatus: 'synced',
          amdSyncError: null,
        },
      });

      // Complete sync log
      await this.completeSyncLog(
        syncLog.id,
        'success',
        response.data,
        client.advancedMDPatientId
      );

      console.log(`[AMD Patient Sync] Patient updated: ${client.advancedMDPatientId}`);

      return {
        success: true,
        advancedMDPatientId: client.advancedMDPatientId,
        syncLogId: syncLog.id,
      };
    } catch (error: any) {
      await this.rateLimiter.recordFailure('GETDEMOGRAPHIC', error.message);
      await this.completeSyncLog(syncLog.id, 'error', null, null, error.message);

      await prisma.client.update({
        where: { id: clientId },
        data: {
          amdSyncStatus: 'error',
          amdSyncError: error.message,
        },
      });

      console.error('[AMD Patient Sync] Update failed:', error.message);

      return {
        success: false,
        errorMessage: error.message,
        syncLogId: syncLog.id,
      };
    }
  }

  /**
   * Sync patient from AdvancedMD to local database (pull)
   */
  async syncPatientFromAMD(advancedMDPatientId: string): Promise<PatientSyncResult> {
    try {
      console.log(`[AMD Patient Sync] Syncing patient from AMD: ${advancedMDPatientId}`);

      // Lookup patient in AMD
      const lookupResult = await this.lookupPatientById(advancedMDPatientId);

      if (!lookupResult.found || !lookupResult.demographic) {
        throw new Error(`Patient not found in AdvancedMD: ${advancedMDPatientId}`);
      }

      // Find matching client
      const client = await prisma.client.findFirst({
        where: { advancedMDPatientId },
      });

      if (!client) {
        throw new Error(`No client linked to AdvancedMD patient: ${advancedMDPatientId}`);
      }

      // Update client with AMD data
      await this.updateClientFromDemographic(client.id, lookupResult.demographic);

      console.log(`[AMD Patient Sync] Patient synced from AMD: ${advancedMDPatientId}`);

      return {
        success: true,
        advancedMDPatientId,
      };
    } catch (error: any) {
      console.error('[AMD Patient Sync] Sync from AMD failed:', error.message);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Get updated patients from AdvancedMD (incremental sync)
   */
  async getUpdatedPatients(since: Date): Promise<PatientDemographic[]> {
    try {
      console.log(`[AMD Patient Sync] Getting updated patients since: ${since.toISOString()}`);

      await this.rateLimiter.checkRateLimit('GETUPDATEDPATIENTS');
      const token = await this.authService.getToken();
      const apiURL = await this.authService.getRedirectURL('XMLRPC');

      const request: GetUpdatedPatientsRequest = {
        ppmdmsg: {
          '@action': 'getupdatedpatients',
          '@class': 'api',
          '@msgtime': this.formatDateTime(new Date()),
          '@datechanged': this.formatDateTime(since),
        },
      };

      const response = await this.httpClient.post<any>(apiURL, request, {
        headers: {
          Cookie: `token=${token}`,
        },
      });

      await this.rateLimiter.recordSuccess('GETUPDATEDPATIENTS');

      // Parse and return updated patients
      return this.parseUpdatedPatientsResponse(response.data);
    } catch (error: any) {
      await this.rateLimiter.recordFailure('GETUPDATEDPATIENTS', error.message);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Map Client model to AdvancedMD PatientDemographic
   */
  private mapClientToDemographic(
    client: any,
    options: MappingOptions = {}
  ): PatientDemographic {
    const demographic: PatientDemographic = {
      lastName: client.lastName,
      firstName: client.firstName,
      middleName: client.middleName || undefined,
      dateOfBirth: this.formatDate(client.dateOfBirth),
      gender: this.mapGender(client.gender),
    };

    // Optional fields based on options
    if (options.includeSSN && client.ssn) {
      demographic.ssn = client.ssn;
    }

    if (options.includeEmail && client.email) {
      demographic.email = client.email;
    }

    if (options.includePhone) {
      demographic.homePhone = client.homePhone || undefined;
      demographic.cellPhone = client.cellPhone || undefined;
      demographic.workPhone = client.workPhone || undefined;
    }

    // Address
    demographic.address1 = client.address || undefined;
    demographic.city = client.city || undefined;
    demographic.state = client.state || undefined;
    demographic.zip = client.zipCode || undefined;

    // Demographics
    demographic.maritalStatus = client.maritalStatus || undefined;
    demographic.race = client.race || undefined;
    demographic.ethnicity = client.ethnicity || undefined;
    demographic.language = client.preferredLanguage || undefined;

    // Emergency contact
    if (client.emergencyContacts && client.emergencyContacts.length > 0) {
      const emergency = client.emergencyContacts[0];
      demographic.emergencyContactName = emergency.name;
      demographic.emergencyContactPhone = emergency.phone;
      demographic.emergencyContactRelationship = emergency.relationship;
    }

    return demographic;
  }

  /**
   * Update Client from AdvancedMD PatientDemographic
   */
  private async updateClientFromDemographic(
    clientId: string,
    demographic: PatientDemographic
  ): Promise<void> {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        firstName: demographic.firstName,
        lastName: demographic.lastName,
        middleName: demographic.middleName || null,
        dateOfBirth: demographic.dateOfBirth ? new Date(demographic.dateOfBirth) : undefined,
        gender: this.unmapGender(demographic.gender),
        email: demographic.email || null,
        homePhone: demographic.homePhone || null,
        cellPhone: demographic.cellPhone || null,
        workPhone: demographic.workPhone || null,
        address: demographic.address1 || null,
        city: demographic.city || null,
        state: demographic.state || null,
        zipCode: demographic.zip || null,
        maritalStatus: demographic.maritalStatus || null,
        race: demographic.race || null,
        ethnicity: demographic.ethnicity || null,
        preferredLanguage: demographic.language || null,
        lastSyncedToAMD: new Date(),
        amdSyncStatus: 'synced',
      },
    });
  }

  /**
   * Map gender from Client to AdvancedMD format
   */
  private mapGender(gender: string | null): 'M' | 'F' | 'U' {
    if (!gender) return 'U';
    const g = gender.toUpperCase();
    if (g === 'MALE' || g === 'M') return 'M';
    if (g === 'FEMALE' || g === 'F') return 'F';
    return 'U';
  }

  /**
   * Map gender from AdvancedMD to Client format
   */
  private unmapGender(gender: 'M' | 'F' | 'U'): string {
    if (gender === 'M') return 'Male';
    if (gender === 'F') return 'Female';
    return 'Unknown';
  }

  /**
   * Format date to AdvancedMD format (MM/DD/YYYY)
   */
  private formatDate(date: Date | string): AMDDateString {
    const d = typeof date === 'string' ? new Date(date) : date;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Format date/time to AdvancedMD format (MM/DD/YYYY HH:MM:SS AM/PM)
   */
  private formatDateTime(date: Date): AMDDateTimeString {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    return `${month}/${day}/${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   * Parse lookup patient response
   */
  private parseLookupResponse(data: any): PatientLookupResult {
    // Handle PPMDResults format
    if (data.PPMDResults) {
      const results = data.PPMDResults.Results;

      // Check for error
      if (data.PPMDResults.Error) {
        return { found: false };
      }

      // Check for patient data
      if (results && results.patient) {
        const patients = Array.isArray(results.patient) ? results.patient : [results.patient];

        if (patients.length === 1) {
          return {
            found: true,
            advancedMDPatientId: patients[0]['@patientid'] || patients[0].patientId,
            demographic: patients[0],
          };
        } else if (patients.length > 1) {
          return {
            found: true,
            multipleMatches: patients,
          };
        }
      }

      return { found: false };
    }

    // Handle ppmdmsg format (legacy)
    if (data.ppmdmsg) {
      const msg = data.ppmdmsg;

      if (msg['@status'] === 'error') {
        return { found: false };
      }

      if (msg.patient) {
        return {
          found: true,
          advancedMDPatientId: msg.patient['@patientid'] || msg.patient.patientId,
          demographic: msg.patient,
        };
      }

      return { found: false };
    }

    return { found: false };
  }

  /**
   * Parse create patient response
   */
  private parseCreateResponse(data: any): string {
    if (data.PPMDResults) {
      const results = data.PPMDResults.Results;

      if (data.PPMDResults.Error) {
        const fault = data.PPMDResults.Error.Fault;
        throw new Error(`Create patient failed: ${fault.detail.description}`);
      }

      if (results && results.patient) {
        return results.patient['@patientid'] || results.patient.patientId;
      }

      throw new Error('Create patient response missing patient ID');
    }

    if (data.ppmdmsg) {
      if (data.ppmdmsg['@status'] === 'error') {
        throw new Error(`Create patient failed: ${data.ppmdmsg['@errormessage']}`);
      }

      if (data.ppmdmsg.patient) {
        return data.ppmdmsg.patient['@patientid'] || data.ppmdmsg.patient.patientId;
      }

      throw new Error('Create patient response missing patient ID');
    }

    throw new Error('Unknown response format');
  }

  /**
   * Parse get updated patients response
   */
  private parseUpdatedPatientsResponse(data: any): PatientDemographic[] {
    if (data.PPMDResults && data.PPMDResults.Results && data.PPMDResults.Results.patients) {
      const patients = data.PPMDResults.Results.patients.patient;
      return Array.isArray(patients) ? patients : [patients];
    }

    if (data.ppmdmsg && data.ppmdmsg.patients) {
      const patients = data.ppmdmsg.patients.patient;
      return Array.isArray(patients) ? patients : [patients];
    }

    return [];
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(
    clientId: string,
    direction: SyncDirection,
    status: SyncStatus
  ) {
    return await prisma.advancedMDSyncLog.create({
      data: {
        syncType: 'patient',
        entityId: clientId,
        entityType: 'Client',
        syncDirection: direction,
        syncStatus: status,
        syncStarted: new Date(),
      },
    });
  }

  /**
   * Update sync log
   */
  private async updateSyncLog(id: string, data: any) {
    await prisma.advancedMDSyncLog.update({
      where: { id },
      data,
    });
  }

  /**
   * Complete sync log
   */
  private async completeSyncLog(
    id: string,
    status: SyncStatus,
    responseData: any,
    advancedMDId: string | null,
    errorMessage?: string
  ) {
    const syncCompleted = new Date();

    const log = await prisma.advancedMDSyncLog.findUnique({ where: { id } });
    const durationMs = log ? syncCompleted.getTime() - log.syncStarted.getTime() : null;

    await prisma.advancedMDSyncLog.update({
      where: { id },
      data: {
        syncStatus: status,
        syncCompleted,
        durationMs,
        responseData,
        advancedMDId,
        errorMessage,
      },
    });
  }
}

/**
 * Lazy singleton instance
 */
let _patientSyncInstance: AdvancedMDPatientSyncService | null = null;

function getPatientSyncInstance(): AdvancedMDPatientSyncService {
  if (!_patientSyncInstance) {
    _patientSyncInstance = new AdvancedMDPatientSyncService();
  }
  return _patientSyncInstance;
}

// Export as a property getter to maintain lazy initialization
export const advancedMDPatientSync = new Proxy({} as AdvancedMDPatientSyncService, {
  get(target, prop) {
    return getPatientSyncInstance()[prop as keyof AdvancedMDPatientSyncService];
  },
});
