export interface PartnerLoginRequest {
    ppmdmsg: {
        '@action': 'login';
        '@class': 'login';
        '@msgtime': string;
        '@username': string;
        '@psw': string;
        '@officecode': number;
        '@appname': 'API';
    };
}
export interface PartnerLoginResponse {
    ppmdmsg: {
        '@action': 'login';
        '@status': 'success' | 'error';
        '@errormessage'?: string;
        webserver?: string;
        redirectUrl?: string;
        redirectUrlPM?: string;
        redirectUrlEHR?: string;
    };
}
export interface RedirectLoginRequest {
    ppmdmsg: {
        '@action': 'login';
        '@class': 'api';
        '@msgtime': string;
        '@appname': 'API';
        username: string;
        password: string;
    };
}
export interface SessionTokenResponse {
    ppmdmsg: {
        '@action': 'login';
        '@status': 'success' | 'error';
        '@errormessage'?: string;
        token?: string;
    };
}
export interface AdvancedMDAuthConfig {
    officeKey: string;
    partnerUsername: string;
    partnerPassword: string;
    appUsername: string;
    appPassword: string;
    partnerLoginURL: string;
    environment: 'sandbox' | 'production';
}
export interface SessionState {
    token: string | null;
    tokenExpiresAt: Date | null;
    tokenRefreshedAt: Date | null;
    redirectURLXMLRPC: string | null;
    redirectURLRESTPM: string | null;
    redirectURLRESTEHR: string | null;
    redirectURLScheduler: string | null;
}
export type RateLimitTier = 'tier1' | 'tier2' | 'tier3';
export interface RateLimitConfig {
    tier: RateLimitTier;
    endpoint: string;
    limitPeak: number;
    limitOffPeak: number;
    peakHoursStart: string;
    peakHoursEnd: string;
}
export declare const TIER1_ENDPOINTS: readonly ["GETUPDATEDVISITS", "GETUPDATEDPATIENTS"];
export declare const TIER2_ENDPOINTS: readonly ["SAVECHARGES", "GETDEMOGRAPHIC", "GETDATEVISITS", "UPDVISITWITHNEWCHARGES", "GETTXHISTORY", "GETAPPTS", "GETPAYMENTDETAILDATA"];
export declare const TIER3_PATTERN: RegExp;
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
export interface PatientDemographic {
    patientId?: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    dateOfBirth: string;
    gender: 'M' | 'F' | 'U';
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
export interface AddPatientRequest {
    ppmdmsg: {
        '@action': 'addpatient';
        '@class': 'api';
        '@msgtime': string;
        patient: PatientDemographic & {
            '@profileid': string;
        };
    };
}
export interface UpdatePatientRequest {
    ppmdmsg: {
        '@action': 'updatepatient';
        '@class': 'api';
        '@msgtime': string;
        patient: PatientDemographic & {
            '@patientid': string;
        };
    };
}
export interface GetUpdatedPatientsRequest {
    ppmdmsg: {
        '@action': 'getupdatedpatients';
        '@class': 'api';
        '@msgtime': string;
        '@datechanged': string;
    };
}
export interface LookupPatientRequest {
    ppmdmsg: {
        '@action': 'lookuppatient';
        '@class': 'api';
        '@msgtime': string;
        '@lastname'?: string;
        '@firstname'?: string;
        '@dob'?: string;
        '@patientid'?: string;
    };
}
export interface VisitData {
    visitId?: string;
    patientId: string;
    appointmentDate: string;
    appointmentTime?: string;
    providerId: string;
    facilityId?: string;
    visitType?: string;
    chiefComplaint?: string;
    status?: 'Scheduled' | 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled';
}
export interface AddVisitRequest {
    ppmdmsg: {
        '@action': 'addvisit';
        '@class': 'api';
        '@msgtime': string;
        visit: VisitData;
    };
}
export interface GetUpdatedVisitsRequest {
    ppmdmsg: {
        '@action': 'getupdatedvisits';
        '@class': 'api';
        '@msgtime': string;
        '@datechanged': string;
        '@includecharges'?: '1' | '0';
    };
}
export interface GetDateVisitsRequest {
    ppmdmsg: {
        '@action': 'getdatevisits';
        '@class': 'api';
        '@msgtime': string;
        '@startdate': string;
        '@enddate': string;
        '@providerid'?: string;
    };
}
export interface ChargeData {
    visitId: string;
    procCode: string;
    procCodeId?: string;
    diagCodes: string[];
    modifiers?: string[];
    units: number;
    amount: string;
    placeOfService?: string;
    renderingProvider?: string;
    supervisingProvider?: string;
}
export interface SaveChargesRequest {
    ppmdmsg: {
        '@action': 'savecharges';
        '@class': 'api';
        '@msgtime': string;
        chargelist: {
            charge: ChargeData | ChargeData[];
        };
    };
}
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
export interface VoidChargesRequest {
    ppmdmsg: {
        '@action': 'voidcharges';
        '@class': 'api';
        '@msgtime': string;
        '@chargeid': string | string[];
    };
}
export interface InsuranceCoverage {
    patientId: string;
    insuranceType: 'Primary' | 'Secondary' | 'Tertiary';
    carrierId?: string;
    carrierName: string;
    policyNumber: string;
    groupNumber?: string;
    subscriberFirstName?: string;
    subscriberLastName?: string;
    subscriberDOB?: string;
    subscriberRelationship?: 'Self' | 'Spouse' | 'Child' | 'Other';
    effectiveDate?: string;
    terminationDate?: string;
    copay?: string;
    deductible?: string;
}
export interface AddInsuranceRequest {
    ppmdmsg: {
        '@action': 'addinsurance';
        '@class': 'api';
        '@msgtime': string;
        insurance: InsuranceCoverage;
    };
}
export interface CheckEligibilityRequest {
    ppmdmsg: {
        '@action': 'checkeligibility';
        '@class': 'api';
        '@msgtime': string;
        '@patientid': string;
        '@carriercode': string;
        '@servicedate': string;
        '@servicetype'?: string;
    };
}
export interface EligibilityResponse {
    ppmdmsg: {
        '@action': 'checkeligibility';
        '@status': 'success' | 'error';
        '@errormessage'?: string;
        eligibility?: {
            coverageActive: boolean;
            eligibleForService: boolean;
            copay?: string;
            coinsurance?: string;
            deductible?: string;
            deductibleMet?: string;
            outOfPocketMax?: string;
            outOfPocketMet?: string;
            planName?: string;
            planType?: string;
            coverageLevel?: 'Individual' | 'Family';
            requiresAuth?: boolean;
            authNumber?: string;
            serviceLimit?: number;
            serviceUsed?: number;
            serviceRemaining?: number;
        };
    };
}
export type ClaimStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected' | 'in_process' | 'paid' | 'denied' | 'partial_paid';
export interface ClaimData {
    claimId?: string;
    claimNumber: string;
    clientId: string;
    insuranceId: string;
    claimType: 'Professional' | 'Institutional';
    billingProvider: string;
    renderingProvider?: string;
    supervisingProvider?: string;
    serviceStartDate: string;
    serviceEndDate: string;
    totalChargeAmount: number;
    diagnoses: string[];
    charges: ClaimChargeLineItem[];
    status: ClaimStatus;
}
export interface ClaimChargeLineItem {
    serviceDate: string;
    cptCode: string;
    modifiers?: string[];
    units: number;
    chargeAmount: number;
    diagnosisPointers: number[];
}
export interface CheckClaimStatusRequest {
    ppmdmsg: {
        '@action': 'checkclaimstatus';
        '@class': 'api';
        '@msgtime': string;
        '@claimid'?: string;
        '@claimnumber'?: string;
        '@startdate'?: string;
        '@enddate'?: string;
    };
}
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
export interface ClaimStatusDetail {
    claimId: string;
    claimNumber: string;
    status: ClaimStatus;
    statusDate: string;
    clearinghouseStatus?: string;
    payerStatus?: string;
    rejectionReason?: string;
    rejectionCode?: string;
    totalBilled: string;
    totalPaid: string;
    totalAdjustment: string;
    patientResponsibility?: string;
}
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
export interface LookupProcCodeRequest {
    ppmdmsg: {
        '@action': 'lookupproccode';
        '@class': 'api';
        '@msgtime': string;
        '@proccode': string;
    };
}
export interface LookupCarrierRequest {
    ppmdmsg: {
        '@action': 'lookupcarrier';
        '@class': 'api';
        '@msgtime': string;
        '@carriername'?: string;
        '@payerid'?: string;
    };
}
export interface LookupOfficeRequest {
    ppmdmsg: {
        '@action': 'lookupoffice';
        '@class': 'api';
        '@msgtime': string;
        '@officename'?: string;
    };
}
export interface ClaimValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
}
export interface ValidationError {
    code: string;
    field: string;
    message: string;
    severity: 'error';
    ruleName: string;
    canOverride: boolean;
    overrideRequiresRole?: string[];
}
export interface ValidationWarning {
    code: string;
    field: string;
    message: string;
    severity: 'warning';
    ruleName: string;
}
export interface ValidationInfo {
    code: string;
    field: string;
    message: string;
    severity: 'info';
}
export interface PaymentData {
    paymentId: string;
    paymentAmount: number;
    paymentDate: string;
    paymentSource: 'ERA' | 'EOB' | 'Check' | 'EFT';
    checkNumber?: string;
    patientId: string;
    insuranceId?: string;
    payerName?: string;
}
export interface ClaimMatchSuggestion {
    claim: ClaimData;
    matchScore: number;
    matchReason: string;
    matchDetails: {
        amountMatch: boolean;
        dateInRange: boolean;
        patientMatch: boolean;
        insuranceMatch: boolean;
    };
}
export type SyncDirection = 'to_amd' | 'from_amd';
export type SyncStatus = 'pending' | 'success' | 'error';
export type SyncType = 'patient' | 'appointment' | 'charge' | 'claim' | 'eligibility';
export interface SyncLogEntry {
    id: string;
    syncType: SyncType;
    entityId: string;
    entityType: string;
    syncDirection: SyncDirection;
    syncStatus: SyncStatus;
    requestData?: any;
    responseData?: any;
    errorMessage?: string;
    advancedMDId?: string;
    syncStarted: Date;
    syncCompleted?: Date;
    durationMs?: number;
    triggeredBy?: string;
    retryCount: number;
}
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
export interface RateLimitError extends AdvancedMDError {
    tier: RateLimitTier;
    retryAfter?: Date;
    backoffSeconds: number;
}
export type AMDDateString = string;
export type AMDDateTimeString = string;
export type AMDDecimalString = string;
export type ResponseStatus = 'success' | 'error';
export interface AdvancedMDResponse<T = any> {
    ppmdmsg: {
        '@action': string;
        '@status': ResponseStatus;
        '@errormessage'?: string;
    } & T;
}
//# sourceMappingURL=advancedmd.types.d.ts.map