/**
 * Module 6 Telehealth Phase 2: AI Note Generation Frontend Types
 * Type definitions for AI-powered clinical note generation UI
 */

export enum AIGeneratedNoteStatus {
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REGENERATING = 'REGENERATING',
  FAILED = 'FAILED',
}

export enum AIRiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AIGeneratedNoteType {
  PROGRESS_NOTE = 'PROGRESS_NOTE',
  INTAKE_NOTE = 'INTAKE_NOTE',
  CRISIS_NOTE = 'CRISIS_NOTE',
  TERMINATION_NOTE = 'TERMINATION_NOTE',
}

export enum TranscriptQuality {
  POOR = 'POOR',
  FAIR = 'FAIR',
  GOOD = 'GOOD',
  EXCELLENT = 'EXCELLENT',
}

// SOAP Note Structure
export interface SOAPNoteSubjective {
  chiefComplaint: string;
  mood: string;
  symptoms: string[];
  recentEvents: string;
  clientReportedProgress?: string;
  stressorsDiscussed?: string[];
}

export interface SOAPNoteObjective {
  appearance: string;
  affect: string;
  behavior: string;
  speech: string;
  mentalStatus: {
    orientation: string;
    memory: string;
    concentration: string;
    insight: string;
    judgment: string;
  };
}

export interface SOAPNoteAssessment {
  clinicalImpressions: string;
  diagnosis: string[];
  progress: string;
  functionalStatus: string;
  responseToTreatment: string;
}

export interface SOAPNotePlan {
  interventionsUsed: string[];
  homeworkAssigned?: string[];
  medicationChanges?: string;
  nextSessionFocus: string;
  nextSessionDate?: string;
  safetyPlan?: string;
  referrals?: string[];
}

export interface SOAPNote {
  subjective: SOAPNoteSubjective;
  objective: SOAPNoteObjective;
  assessment: SOAPNoteAssessment;
  plan: SOAPNotePlan;
}

// Risk Assessment
export interface RiskAssessment {
  riskLevel: AIRiskLevel;
  suicidalIdeation: boolean;
  suicidalPlan: boolean;
  suicidalIntent: boolean;
  homicidalIdeation: boolean;
  selfHarm: boolean;
  substanceAbuse: boolean;
  nonCompliance: boolean;
  indicators: string[];
  recommendedActions: string[];
  requiresImmediateAction: boolean;
  safetyPlanRecommendations?: string[];
}

// Treatment Plan Updates
export interface TreatmentPlanUpdates {
  goalsDiscussed: string[];
  progressNotes: string[];
  newInterventions: string[];
  modifications: string[];
  goalAchievements?: string[];
  barriers?: string[];
}

// Session Metadata
export interface SessionMetadata {
  sessionDate: string;
  sessionDuration: number;
  sessionType: string;
  clientName: string;
  clinicianName: string;
  previousDiagnoses?: string[];
  currentTreatmentPlan?: string;
  sessionNumber?: number;
  emergencyActivated?: boolean;
}

// Clinician Edit
export interface ClinicianEdit {
  section: string;
  fieldPath: string;
  originalValue: string;
  editedValue: string;
  timestamp: string;
  editReason?: string;
}

export interface ClinicianEdits {
  changes: ClinicianEdit[];
  totalEdits: number;
  lastEditedAt: string;
}

// AI Generated Note (full object)
export interface AIGeneratedNote {
  id: string;
  sessionId: string;
  appointmentId: string;
  clientId: string;
  clinicianId: string;
  noteType: AIGeneratedNoteType;
  status: AIGeneratedNoteStatus;
  transcriptText: string;
  transcriptId?: string;
  sessionMetadata: SessionMetadata;
  soapNote: SOAPNote;
  riskAssessment: RiskAssessment;
  treatmentPlanUpdates?: TreatmentPlanUpdates;
  generationConfidence?: number;
  modelUsed: string;
  promptVersion: string;
  generationTimeMs?: number;
  tokenCount?: number;
  transcriptQuality?: TranscriptQuality;
  missingInformation: string[];
  warnings: string[];
  clinicianReviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  clinicianEdits?: ClinicianEdits;
  regenerationCount: number;
  regenerationFeedback: string[];
  previousVersions: any[];
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  generatedAt?: string;
  approvedAt?: string;
}

// API Request/Response types
export interface GenerateNoteRequest {
  sessionId: string;
  transcriptText: string;
  transcriptId?: string;
  sessionMetadata: SessionMetadata;
  noteType?: AIGeneratedNoteType;
  includeTreatmentPlanUpdates?: boolean;
}

export interface GenerateNoteResponse {
  id: string;
  status: AIGeneratedNoteStatus;
  soapNote: SOAPNote;
  riskAssessment: RiskAssessment;
  treatmentPlanUpdates?: TreatmentPlanUpdates;
  generationConfidence: number;
  transcriptQuality: TranscriptQuality;
  missingInformation: string[];
  warnings: string[];
  generationTimeMs: number;
  tokenCount: number;
  createdAt: string;
}

export interface RegenerateNoteRequest {
  aiNoteId: string;
  feedback: string;
  preserveSections?: string[];
  focusAreas?: string[];
}

export interface ReviewNoteRequest {
  aiNoteId: string;
  approved: boolean;
  edits?: ClinicianEdit[];
  reviewComments?: string;
}

export interface ExportToNoteRequest {
  aiNoteId: string;
  noteType: string;
  includeEdits: boolean;
}

// Audit Log
export enum AuditEventType {
  GENERATION_STARTED = 'GENERATION_STARTED',
  GENERATION_COMPLETED = 'GENERATION_COMPLETED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  REVIEW_STARTED = 'REVIEW_STARTED',
  REVIEW_COMPLETED = 'REVIEW_COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REGENERATION_REQUESTED = 'REGENERATION_REQUESTED',
  EDIT_MADE = 'EDIT_MADE',
  EXPORTED_TO_NOTE = 'EXPORTED_TO_NOTE',
  RISK_FLAG_RAISED = 'RISK_FLAG_RAISED',
}

export interface AuditLogEntry {
  id: string;
  aiNoteId: string;
  eventType: AuditEventType;
  eventData: Record<string, any>;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// UI State
export interface EditMode {
  active: boolean;
  section?: string;
  fieldPath?: string;
  originalValue?: string;
  currentValue?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Helper functions
export function getRiskLevelColor(riskLevel: AIRiskLevel): string {
  switch (riskLevel) {
    case AIRiskLevel.LOW:
      return 'green';
    case AIRiskLevel.MODERATE:
      return 'yellow';
    case AIRiskLevel.HIGH:
      return 'orange';
    case AIRiskLevel.CRITICAL:
      return 'red';
    default:
      return 'gray';
  }
}

export function getStatusBadgeColor(status: AIGeneratedNoteStatus): string {
  switch (status) {
    case AIGeneratedNoteStatus.GENERATING:
      return 'blue';
    case AIGeneratedNoteStatus.GENERATED:
      return 'cyan';
    case AIGeneratedNoteStatus.REVIEWED:
      return 'yellow';
    case AIGeneratedNoteStatus.APPROVED:
      return 'green';
    case AIGeneratedNoteStatus.REJECTED:
      return 'red';
    case AIGeneratedNoteStatus.REGENERATING:
      return 'purple';
    case AIGeneratedNoteStatus.FAILED:
      return 'red';
    default:
      return 'gray';
  }
}

export function getQualityColor(quality: TranscriptQuality): string {
  switch (quality) {
    case TranscriptQuality.EXCELLENT:
      return 'green';
    case TranscriptQuality.GOOD:
      return 'blue';
    case TranscriptQuality.FAIR:
      return 'yellow';
    case TranscriptQuality.POOR:
      return 'red';
    default:
      return 'gray';
  }
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
