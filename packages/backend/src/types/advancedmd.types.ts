/**
 * AdvancedMD Integration - TypeScript Types & Interfaces
 *
 * Comprehensive type definitions for AdvancedMD Practice Management API integration
 * Based on: October 2025 API Documentation, Postman Collection V1.2.1, Common Workflows
 *
 * @module advancedmd.types
 */

// ============================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

/**
 * Partner Login Request (Step 1 - Get Redirect URLs)
 */
export interface PartnerLoginRequest {
  ppmdmsg: {
    '@action': 'login';
    '@class': 'login';
    '@msgtime': string; // Format: "MM/DD/YYYY HH:MM:SS AM/PM"
    '@username': string; // Partner username: CAHCAPI
    '@psw': string; // Partner password
    '@officecode': number; // Office key: 990207
    '@appname': 'API';
  };
}

/**
 * Partner Login Response (Contains Redirect URLs)
 */
export interface PartnerLoginResponse {
  ppmdmsg: {
    '@action': 'login';
    '@status': 'success' | 'error';
    '@errormessage'?: string;
    webserver?: string; // Base URL for building redirect URLs
    redirectUrl?: string; // XMLRPC redirect URL
    redirectUrlPM?: string; // REST PM redirect URL
    redirectUrlEHR?: string; // REST EHR redirect URL
  };
}

/**
 * Redirect Login Request (Step 2 - Get Session Token)
 */
export interface RedirectLoginRequest {
  ppmdmsg: {
    '@action': 'login';
    '@class': 'api';
    '@msgtime': string;
    '@appname': 'API';
    username: string; // Application username: ADMIN
    password: string; // Application password: Bing@@0912
  };
}

/**
 * Session Token Response
 */
export interface SessionTokenResponse {
  ppmdmsg: {
    '@action': 'login';
    '@status': 'success' | 'error';
    '@errormessage'?: string;
    token?: string; // AMD_TOKEN (valid for 24 hours)
  };
}

/**
 * Authentication Configuration
 */
export interface AdvancedMDAuthConfig {
  officeKey: string; // '990207'
  partnerUsername: string; // 'CAHCAPI'
  partnerPassword: string; // Encrypted
  appUsername: string; // 'ADMIN'
  appPassword: string; // Encrypted
  partnerLoginURL: string;
  environment: 'sandbox' | 'production';
}

/**
 * Session State
 */
export interface SessionState {
  token: string | null;
  tokenExpiresAt: Date | null;
  tokenRefreshedAt: Date | null;
  redirectURLXMLRPC: string | null;
  redirectURLRESTPM: string | null;
  redirectURLRESTEHR: string | null;
  redirectURLScheduler: string | null;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate Limit Tier Classification
 */
export type RateLimitTier = 'tier1' | 'tier2' | 'tier3';

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  tier: RateLimitTier;
  endpoint: string;
  limitPeak: number; // calls per minute during peak hours
  limitOffPeak: number; // calls per minute during off-peak hours
  peakHoursStart: string; // '06:00' Mountain Time
  peakHoursEnd: string; // '18:00' Mountain Time
}

/**
 * Tier 1 - High Impact Endpoints (1 call/min peak, 60/min off-peak)
 */
export const TIER1_ENDPOINTS = [
  'GETUPDATEDVISITS',
  'GETUPDATEDPATIENTS',
] as const;

/**
 * Tier 2 - Medium Impact Endpoints (12 calls/min peak, 120/min off-peak)
 */
export const TIER2_ENDPOINTS = [
  'SAVECHARGES',
  'GETDEMOGRAPHIC',
  'GETDATEVISITS',
  'UPDVISITWITHNEWCHARGES',
  'GETTXHISTORY',
  'GETAPPTS',
  'GETPAYMENTDETAILDATA',
] as const;

/**
 * Tier 3 - Low Impact Endpoints (24 calls/min peak, 120/min off-peak)
 */
export const TIER3_PATTERN = /^LOOKUP/; // All LOOKUP* APIs

/**
 * Rate Limiter State
 */
export interface RateLimiterState {
  tier: RateLimitTier;
  endpoint: string;
  callsThisMinute: number;
  callsThisHour: number;
  currentMinuteStart: Date;
  currentHourStart: Date;
  isPeakHours: boolean;
  isBackingOff: boolean;
  backoffUntil: Date | null;
  backoffRetryCount: number;
  lastCallAt: Date | null;
  lastCallSuccess: boolean;
  lastCallError: string | null;
}

// ============================================================================
// PATIENT MANAGEMENT
// ============================================================================

/**
 * Patient Demographic Data
 */
export interface PatientDemographic {
  patientId?: string; // AdvancedMD internal ID
  lastName: string;
  firstName: string;
  middleName?: string;
  dateOfBirth: string; // Format: "MM/DD/YYYY"
  gender: 'M' | 'F' | 'U'; // Male, Female, Unknown
  /** @deprecated SSN is never collected by MentalSpace. Field exists for AdvancedMD API compatibility only. */
  ssn?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  homePhone?: string;
  workPhone?: string;
  cellPhone?: string;
  email?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated';
  race?: string;
  ethnicity?: string;
  language?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

/**
 * Add Patient Request
 */
export interface AddPatientRequest {
  ppmdmsg: {
    '@action': 'addpatient';
    '@class': 'api';
    '@msgtime': string;
    patient: PatientDemographic & {
      '@profileid': string; // Provider profile ID (from LookUpProfile)
    };
  };
}

/**
 * Update Patient Request
 */
export interface UpdatePatientRequest {
  ppmdmsg: {
    '@action': 'updatepatient';
    '@class': 'api';
    '@msgtime': string;
    patient: PatientDemographic & {
      '@patientid': string; // Required for update
    };
  };
}

/**
 * Get Updated Patients Request (Incremental Sync)
 */
export interface GetUpdatedPatientsRequest {
  ppmdmsg: {
    '@action': 'getupdatedpatients';
    '@class': 'api';
    '@msgtime': string;
    '@datechanged': string; // Last sync timestamp: "MM/DD/YYYY HH:MM:SS AM/PM"
  };
}

/**
 * Lookup Patient Request
 */
export interface LookupPatientRequest {
  ppmdmsg: {
    '@action': 'lookuppatient';
    '@class': 'api';
    '@msgtime': string;
    '@lastname'?: string;
    '@firstname'?: string;
    '@dob'?: string; // MM/DD/YYYY
    '@patientid'?: string;
  };
}

// ============================================================================
// VISIT & APPOINTMENT MANAGEMENT
// ============================================================================

/**
 * Visit Data
 */
export interface VisitData {
  visitId?: string; // AdvancedMD internal ID
  patientId: string;
  appointmentDate: string; // MM/DD/YYYY
  appointmentTime?: string; // HH:MM AM/PM
  providerId: string; // From LookUpProfile
  facilityId?: string; // From LookUpOffice
  visitType?: string; // 'Office Visit', 'Telehealth', etc.
  chiefComplaint?: string;
  status?: 'Scheduled' | 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled';
}

/**
 * Add Visit Request
 */
export interface AddVisitRequest {
  ppmdmsg: {
    '@action': 'addvisit';
    '@class': 'api';
    '@msgtime': string;
    visit: VisitData;
  };
}

/**
 * Get Updated Visits Request (Incremental Sync)
 */
export interface GetUpdatedVisitsRequest {
  ppmdmsg: {
    '@action': 'getupdatedvisits';
    '@class': 'api';
    '@msgtime': string;
    '@datechanged': string; // Last sync timestamp
    '@includecharges'?: '1' | '0'; // Include charge data
  };
}

/**
 * Get Date Visits Request
 */
export interface GetDateVisitsRequest {
  ppmdmsg: {
    '@action': 'getdatevisits';
    '@class': 'api';
    '@msgtime': string;
    '@startdate': string; // MM/DD/YYYY
    '@enddate': string; // MM/DD/YYYY
    '@providerid'?: string;
  };
}

// ============================================================================
// BILLING & CHARGES
// ============================================================================

/**
 * Charge Data (CPT/ICD Codes)
 */
export interface ChargeData {
  visitId: string; // Required - links charge to visit
  procCode: string; // CPT code (e.g., '90837')
  procCodeId?: string; // Internal AMD ID (from LookUpProcCode)
  diagCodes: string[]; // ICD-10 codes (e.g., ['F41.1', 'F43.10'])
  modifiers?: string[]; // Modifiers (e.g., ['GT', '95'])
  units: number; // Usually 1
  amount: string; // Charge amount (e.g., '150.00')
  placeOfService?: string; // '02' = Telehealth, '11' = Office
  renderingProvider?: string; // Provider ID
  supervisingProvider?: string; // Supervisor ID (if applicable)
}

/**
 * Save Charges Request
 */
export interface SaveChargesRequest {
  ppmdmsg: {
    '@action': 'savecharges';
    '@class': 'api';
    '@msgtime': string;
    chargelist: {
      charge: ChargeData | ChargeData[]; // Single or multiple charges
    };
  };
}

/**
 * Update Visit With New Charges Request
 */
export interface UpdateVisitWithNewChargesRequest {
  ppmdmsg: {
    '@action': 'updvisitwithnewcharges';
    '@class': 'api';
    '@msgtime': string;
    '@visitid': string;
    chargelist: {
      charge: ChargeData | ChargeData[];
    };
  };
}

/**
 * Void Charges Request (if claim not processed)
 */
export interface VoidChargesRequest {
  ppmdmsg: {
    '@action': 'voidcharges';
    '@class': 'api';
    '@msgtime': string;
    '@chargeid': string | string[]; // Single or multiple charge IDs
  };
}

// ============================================================================
// INSURANCE & ELIGIBILITY
// ============================================================================

/**
 * Insurance Coverage Data
 */
export interface InsuranceCoverage {
  patientId: string;
  insuranceType: 'Primary' | 'Secondary' | 'Tertiary';
  carrierId?: string; // From LookUpCarrier
  carrierName: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberFirstName?: string;
  subscriberLastName?: string;
  subscriberDOB?: string; // MM/DD/YYYY
  subscriberRelationship?: 'Self' | 'Spouse' | 'Child' | 'Other';
  effectiveDate?: string; // MM/DD/YYYY
  terminationDate?: string; // MM/DD/YYYY
  copay?: string; // Amount
  deductible?: string; // Amount
}

/**
 * Add Insurance Request
 */
export interface AddInsuranceRequest {
  ppmdmsg: {
    '@action': 'addinsurance';
    '@class': 'api';
    '@msgtime': string;
    insurance: InsuranceCoverage;
  };
}

/**
 * Check Eligibility Request (270 Transaction)
 */
export interface CheckEligibilityRequest {
  ppmdmsg: {
    '@action': 'checkeligibility';
    '@class': 'api';
    '@msgtime': string;
    '@patientid': string;
    '@carriercode': string; // Insurance carrier code
    '@servicedate': string; // MM/DD/YYYY
    '@servicetype'?: string; // '30' for Mental Health
  };
}

/**
 * Eligibility Response (271 Transaction)
 */
export interface EligibilityResponse {
  ppmdmsg: {
    '@action': 'checkeligibility';
    '@status': 'success' | 'error';
    '@errormessage'?: string;
    eligibility?: {
      coverageActive: boolean;
      eligibleForService: boolean;
      copay?: string;
      coinsurance?: string; // percentage
      deductible?: string;
      deductibleMet?: string;
      outOfPocketMax?: string;
      outOfPocketMet?: string;
      planName?: string;
      planType?: string;
      coverageLevel?: 'Individual' | 'Family';
      requiresAuth?: boolean;
      authNumber?: string;
      serviceLimit?: number; // Visit limit
      serviceUsed?: number; // Visits used
      serviceRemaining?: number;
    };
  };
}

// ============================================================================
// CLAIMS MANAGEMENT
// ============================================================================

/**
 * Claim Status Values
 */
export type ClaimStatus =
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'in_process'
  | 'paid'
  | 'denied'
  | 'partial_paid';

/**
 * Claim Data
 */
export interface ClaimData {
  claimId?: string;
  claimNumber: string;
  clientId: string;
  insuranceId: string;
  claimType: 'Professional' | 'Institutional';
  billingProvider: string;
  renderingProvider?: string;
  supervisingProvider?: string;
  serviceStartDate: string; // MM/DD/YYYY
  serviceEndDate: string; // MM/DD/YYYY
  totalChargeAmount: number;
  diagnoses: string[]; // ICD-10 codes
  charges: ClaimChargeLineItem[];
  status: ClaimStatus;
}

/**
 * Claim Charge Line Item
 */
export interface ClaimChargeLineItem {
  serviceDate: string; // MM/DD/YYYY
  cptCode: string;
  modifiers?: string[];
  units: number;
  chargeAmount: number;
  diagnosisPointers: number[]; // Points to claim diagnosis array
}

/**
 * Check Claim Status Request
 */
export interface CheckClaimStatusRequest {
  ppmdmsg: {
    '@action': 'checkclaimstatus';
    '@class': 'api';
    '@msgtime': string;
    '@claimid'?: string;
    '@claimnumber'?: string;
    '@startdate'?: string; // MM/DD/YYYY
    '@enddate'?: string; // MM/DD/YYYY
  };
}

/**
 * Claim Status Response
 */
export interface ClaimStatusResponse {
  ppmdmsg: {
    '@action': 'checkclaimstatus';
    '@status': 'success' | 'error';
    '@errormessage'?: string;
    claims?: {
      claim: ClaimStatusDetail | ClaimStatusDetail[];
    };
  };
}

/**
 * Claim Status Detail
 */
export interface ClaimStatusDetail {
  claimId: string;
  claimNumber: string;
  status: ClaimStatus;
  statusDate: string; // MM/DD/YYYY
  clearinghouseStatus?: string;
  payerStatus?: string;
  rejectionReason?: string;
  rejectionCode?: string;
  totalBilled: string;
  totalPaid: string;
  totalAdjustment: string;
  patientResponsibility?: string;
}

// ============================================================================
// LOOKUP APIS (Tier 3 - Low Impact)
// ============================================================================

/**
 * Lookup Profile Request (Get Provider ID)
 */
export interface LookupProfileRequest {
  ppmdmsg: {
    '@action': 'lookupprofile';
    '@class': 'api';
    '@msgtime': string;
    '@lastname'?: string;
    '@firstname'?: string;
    '@npi'?: string;
  };
}

/**
 * Lookup Proc Code Request (Get CPT Internal ID)
 */
export interface LookupProcCodeRequest {
  ppmdmsg: {
    '@action': 'lookupproccode';
    '@class': 'api';
    '@msgtime': string;
    '@proccode': string; // CPT code (e.g., '90837')
  };
}

/**
 * Lookup Carrier Request (Get Insurance Carrier ID)
 */
export interface LookupCarrierRequest {
  ppmdmsg: {
    '@action': 'lookupcarrier';
    '@class': 'api';
    '@msgtime': string;
    '@carriername'?: string;
    '@payerid'?: string;
  };
}

/**
 * Lookup Office Request (Get Facility ID)
 */
export interface LookupOfficeRequest {
  ppmdmsg: {
    '@action': 'lookupoffice';
    '@class': 'api';
    '@msgtime': string;
    '@officename'?: string;
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Claim Validation Result
 */
export interface ClaimValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

/**
 * Validation Error (Blocks Submission)
 */
export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error';
  ruleName: string;
  canOverride: boolean;
  overrideRequiresRole?: string[];
}

/**
 * Validation Warning (Can Submit)
 */
export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: 'warning';
  ruleName: string;
}

/**
 * Validation Info (Informational)
 */
export interface ValidationInfo {
  code: string;
  field: string;
  message: string;
  severity: 'info';
}

// ============================================================================
// PAYMENT RECONCILIATION
// ============================================================================

/**
 * Payment Data
 */
export interface PaymentData {
  paymentId: string;
  paymentAmount: number;
  paymentDate: string; // MM/DD/YYYY
  paymentSource: 'ERA' | 'EOB' | 'Check' | 'EFT';
  checkNumber?: string;
  patientId: string;
  insuranceId?: string;
  payerName?: string;
}

/**
 * Claim Match Suggestion
 */
export interface ClaimMatchSuggestion {
  claim: ClaimData;
  matchScore: number; // 0-100
  matchReason: string;
  matchDetails: {
    amountMatch: boolean;
    dateInRange: boolean;
    patientMatch: boolean;
    insuranceMatch: boolean;
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync Direction
 */
export type SyncDirection = 'to_amd' | 'from_amd';

/**
 * Sync Status
 */
export type SyncStatus = 'pending' | 'success' | 'error';

/**
 * Sync Type
 */
export type SyncType = 'patient' | 'appointment' | 'charge' | 'claim' | 'eligibility';

/**
 * Sync Log Entry
 */
export interface SyncLogEntry {
  id: string;
  syncType: SyncType;
  entityId: string; // Client ID, Appointment ID, etc.
  entityType: string; // 'Client', 'Appointment', 'ChargeEntry', 'Claim'
  syncDirection: SyncDirection;
  syncStatus: SyncStatus;
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
  advancedMDId?: string;
  syncStarted: Date;
  syncCompleted?: Date;
  durationMs?: number;
  triggeredBy?: string; // User ID or 'SYSTEM'
  retryCount: number;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * AdvancedMD API Error
 */
export interface AdvancedMDError {
  code: string;
  message: string;
  endpoint: string;
  timestamp: Date;
  requestData?: any;
  responseData?: any;
  httpStatus?: number;
  isRateLimitError: boolean;
  isAuthError: boolean;
  isValidationError: boolean;
  retryable: boolean;
}

/**
 * Rate Limit Error
 */
export interface RateLimitError extends AdvancedMDError {
  tier: RateLimitTier;
  retryAfter?: Date;
  backoffSeconds: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Date Format: MM/DD/YYYY
 */
export type AMDDateString = string;

/**
 * DateTime Format: MM/DD/YYYY HH:MM:SS AM/PM
 */
export type AMDDateTimeString = string;

/**
 * Decimal Amount Format: "150.00"
 */
export type AMDDecimalString = string;

/**
 * Response Status
 */
export type ResponseStatus = 'success' | 'error';

/**
 * Generic AdvancedMD Response
 */
export interface AdvancedMDResponse<T = any> {
  ppmdmsg: {
    '@action': string;
    '@status': ResponseStatus;
    '@errormessage'?: string;
  } & T;
}
