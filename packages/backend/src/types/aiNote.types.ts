/**
 * Module 6 Telehealth Phase 2: AI Note Generation Types
 * Type definitions for AI-powered clinical note generation system
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

// ============================================================================
// SOAP Note Structure
// ============================================================================

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

// ============================================================================
// Risk Assessment Structure
// ============================================================================

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

// ============================================================================
// Treatment Plan Updates Structure
// ============================================================================

export interface TreatmentPlanUpdates {
  goalsDiscussed: string[];
  progressNotes: string[];
  newInterventions: string[];
  modifications: string[];
  goalAchievements?: string[];
  barriers?: string[];
}

// ============================================================================
// Session Metadata
// ============================================================================

export interface SessionMetadata {
  sessionDate: string;
  sessionDuration: number; // minutes
  sessionType: string;
  clientName: string;
  clinicianName: string;
  previousDiagnoses?: string[];
  currentTreatmentPlan?: string;
  sessionNumber?: number;
  emergencyActivated?: boolean;
}

// ============================================================================
// Clinician Edit Tracking
// ============================================================================

export interface ClinicianEdit {
  section: string; // 'subjective', 'objective', 'assessment', 'plan', 'riskAssessment'
  fieldPath: string; // e.g., 'subjective.chiefComplaint', 'riskAssessment.riskLevel'
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

// ============================================================================
// AI Generation Request/Response
// ============================================================================

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
  preserveSections?: string[]; // Sections to keep unchanged
  focusAreas?: string[]; // Areas to improve
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

// ============================================================================
// Risk Assessment Request/Response
// ============================================================================

export interface GenerateRiskAssessmentRequest {
  sessionId: string;
  transcriptText: string;
  clientHistory?: {
    previousRiskLevels?: string[];
    diagnosisCodes?: string[];
    medications?: string[];
  };
}

export interface GenerateRiskAssessmentResponse {
  riskAssessment: RiskAssessment;
  confidence: number;
  analysisTimeMs: number;
  requiresClinicianReview: boolean;
}

// ============================================================================
// Prompt Configuration
// ============================================================================

export interface PromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  stopSequences?: string[];
}

export interface AIModelConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ============================================================================
// Audit Log
// ============================================================================

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
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AIGenerationError';
  }
}

export enum AIErrorCode {
  TRANSCRIPT_TOO_SHORT = 'TRANSCRIPT_TOO_SHORT',
  TRANSCRIPT_POOR_QUALITY = 'TRANSCRIPT_POOR_QUALITY',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_ERROR = 'API_ERROR',
  INVALID_SESSION = 'INVALID_SESSION',
  MISSING_METADATA = 'MISSING_METADATA',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  INSUFFICIENT_CONTENT = 'INSUFFICIENT_CONTENT',
}

// ============================================================================
// Database Models (matching Prisma schema)
// ============================================================================

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
  reviewedAt?: Date;
  reviewedBy?: string;
  clinicianEdits?: ClinicianEdits;
  regenerationCount: number;
  regenerationFeedback: string[];
  previousVersions: any[];
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  generatedAt?: Date;
  approvedAt?: Date;
}

export interface AIPromptTemplate {
  id: string;
  templateName: string;
  templateType: string;
  version: string;
  promptText: string;
  systemPrompt: string;
  modelConfig: AIModelConfig;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface GenerationMetrics {
  totalNotes: number;
  averageConfidence: number;
  averageGenerationTime: number;
  highRiskDetected: number;
  approvalRate: number;
  editRate: number;
  regenerationRate: number;
}

export interface TranscriptChunk {
  text: string;
  startTime?: number;
  endTime?: number;
  speaker?: string;
}
