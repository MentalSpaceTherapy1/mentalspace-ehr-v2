// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Authentication
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMINISTRATOR' | 'SUPERVISOR' | 'CLINICIAN' | 'BILLING_STAFF' | 'FRONT_DESK' | 'ASSOCIATE';
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  npiNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// Client
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  maritalStatus?: string;
  preferredLanguage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  emergencyContacts?: EmergencyContact[];
  insurances?: Insurance[];
  guardians?: LegalGuardian[];
}

export interface EmergencyContact {
  id: string;
  clientId: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Insurance {
  id: string;
  clientId: string;
  type: 'PRIMARY' | 'SECONDARY';
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName: string;
  subscriberDOB: string;
  subscriberRelationship: string;
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalGuardian {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// Appointment
export interface Appointment {
  id: string;
  clientId: string;
  clinicianId: string;
  appointmentType: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  location: 'IN_PERSON' | 'TELEHEALTH';
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  clinician?: User;
}

// Clinical Note
export interface ClinicalNote {
  id: string;
  clientId: string;
  clinicianId: string;
  appointmentId?: string;
  noteType: 'INTAKE_ASSESSMENT' | 'PROGRESS_NOTE' | 'TREATMENT_PLAN' | 'CANCELLATION_NOTE' | 'CONSULTATION_NOTE' | 'CONTACT_NOTE' | 'TERMINATION_NOTE' | 'MISCELLANEOUS';
  dateOfService: string;
  chiefComplaint?: string;
  presentingProblem?: string;
  currentSymptoms?: string;
  interventions?: string;
  clinicalImpression?: string;
  treatmentPlan?: string;
  progress?: string;
  goals?: any;
  objectives?: any;
  icd10Codes: string[];
  cptCode?: string;
  status: 'DRAFT' | 'PENDING_COSIGN' | 'SIGNED' | 'LOCKED';
  requiresCosign: boolean;
  cosignedBy?: string;
  cosignedAt?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  clinician?: User;
}

// Billing
export interface Charge {
  id: string;
  clientId: string;
  appointmentId?: string;
  clinicalNoteId?: string;
  serviceDate: string;
  cptCode: string;
  units: number;
  ratePerUnit: number;
  totalAmount: number;
  status: 'PENDING' | 'SUBMITTED' | 'PAID' | 'DENIED' | 'ADJUSTED';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  clientId: string;
  chargeId?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Productivity Metrics
export interface ProductivityMetrics {
  totalClients: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalClinicalNotes: number;
  pendingCosignNotes: number;
  averageNotesPerDay: number;
  totalBilledAmount: number;
  totalCollectedAmount: number;
  periodStart: string;
  periodEnd: string;
}

// Waitlist
export interface WaitlistEntry {
  id: string;
  clientId: string;
  requestDate: string;
  preferredDays?: string[];
  preferredTimes?: string[];
  notes?: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  client?: Client;
}

// Clinician Schedule
export interface ClinicianSchedule {
  id: string;
  clinicianId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  location: 'IN_PERSON' | 'TELEHEALTH' | 'BOTH';
  createdAt: string;
  updatedAt: string;
}

// Telehealth
export interface TelehealthSession {
  id: string;
  appointmentId: string;
  meetingId: string;
  attendeeId: string;
  joinToken: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Form data types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface ClientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  maritalStatus?: string;
  preferredLanguage: string;
}

export interface AppointmentFormData {
  clientId: string;
  clinicianId: string;
  appointmentType: string;
  startTime: string;
  duration: number;
  location: 'IN_PERSON' | 'TELEHEALTH';
  notes?: string;
}

export interface ClinicalNoteFormData {
  clientId: string;
  appointmentId?: string;
  noteType: string;
  dateOfService: string;
  chiefComplaint?: string;
  presentingProblem?: string;
  currentSymptoms?: string;
  interventions?: string;
  clinicalImpression?: string;
  treatmentPlan?: string;
  progress?: string;
  icd10Codes: string[];
  cptCode?: string;
}
