/**
 * AdvancedMD Integration - Main Export
 *
 * Phase 1: Authentication, Rate Limiting, Base API Client
 * Phase 2: Patient Synchronization
 * Phase 3: Appointment/Visit Synchronization
 *
 * @module integrations/advancedmd
 */

// Phase 1: Core Services
export { AdvancedMDAuthService, advancedMDAuth } from './auth.service';
export { AdvancedMDRateLimiterService, advancedMDRateLimiter } from './rate-limiter.service';
export { AdvancedMDAPIClient, advancedMDAPI, APIRequestOptions, APIResponse } from './api-client';

// Phase 2: Patient Sync
export {
  AdvancedMDPatientSyncService,
  advancedMDPatientSync,
  PatientLookupResult,
  PatientSyncResult,
  MappingOptions,
} from './patient-sync.service';

// Phase 3: Appointment Sync
export {
  AdvancedMDAppointmentSyncService,
  advancedMDAppointmentSync,
  AppointmentLookupResult,
  AppointmentSyncResult,
  AppointmentMappingOptions,
} from './appointment-sync.service';

// Re-export types from shared package (using relative path for monorepo)
export * from '../../../../shared/src/types/advancedmd.types';
