/**
 * Module 6 Telehealth Phase 2: AI Note Generation Service
 *
 * Implements AI-powered clinical note generation using Claude AI.
 * Generates SOAP notes, risk assessments, and treatment plan updates from session transcripts.
 *
 * Features:
 * - SOAP note generation with mental health specificity
 * - Risk assessment and safety screening
 * - Treatment plan recommendations
 * - Note regeneration with clinician feedback
 * - Quality validation and confidence scoring
 * - Audit logging for compliance
 */

import Anthropic from '@anthropic-ai/sdk';
import prisma from './database';
import logger from '../utils/logger';
import {
  AIGeneratedNoteStatus,
  AIGeneratedNoteType,
  AIRiskLevel,
  TranscriptQuality,
  SOAPNote,
  RiskAssessment,
  TreatmentPlanUpdates,
  SessionMetadata,
  GenerateNoteRequest,
  GenerateNoteResponse,
  RegenerateNoteRequest,
  AIGenerationError,
  AIErrorCode,
  AuditEventType,
} from '../types/aiNote.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_NAME = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.3; // Low temperature for clinical consistency
const MAX_TOKENS = 4096;
const PROMPT_VERSION = '1.0';

// Minimum transcript length (characters) for generation
const MIN_TRANSCRIPT_LENGTH = 200;

// ============================================================================
// TODO: AI Generated Note Models Not Implemented
// ============================================================================
// The AIGeneratedNote and AIGenerationAuditLog models are not yet implemented
// in the Prisma schema. All AI note generation functionality is disabled until
// these models are added to packages/database/prisma/schema.prisma

const AI_NOTE_MODELS_NOT_IMPLEMENTED = true;

function throwNotImplementedError(): never {
  throw new AIGenerationError(
    'AI note generation is not yet implemented - required database models are missing',
    AIErrorCode.API_ERROR,
    {
      message: 'AIGeneratedNote and AIGenerationAuditLog models need to be added to Prisma schema',
      feature: 'ai-note-generation',
    }
  );
}

// Type helper to suppress missing model errors (models don't exist in schema yet)
const prismaAI = prisma as any;

// ============================================================================
// INITIALIZE ANTHROPIC CLIENT
// ============================================================================

let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new AIGenerationError(
      'Anthropic API key not configured',
      AIErrorCode.API_ERROR,
      { message: 'ANTHROPIC_API_KEY environment variable is required' }
    );
  }

  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
  }

  return anthropic;
}

// ============================================================================
// PROMPT ENGINEERING
// ============================================================================

const SYSTEM_PROMPT = `You are a clinical documentation assistant specializing in mental health therapy notes. Your role is to help licensed mental health professionals create accurate, comprehensive SOAP (Subjective, Objective, Assessment, Plan) notes from therapy session transcripts.

**CRITICAL INSTRUCTIONS:**

1. **Stay Grounded**: ONLY include information explicitly stated or clearly implied in the transcript. NEVER fabricate, assume, or add information not present.

2. **Clinical Tone**: Use professional, objective, person-first language appropriate for clinical documentation.

3. **Completeness**: Include all relevant clinical information while being concise.

4. **Risk Assessment**: Pay careful attention to any indicators of suicide risk, self-harm, violence, or other safety concerns.

5. **Confidentiality**: This is protected health information (PHI). Maintain appropriate clinical language.

6. **Uncertainty**: If critical information is missing or unclear, note this explicitly in the "missingInformation" field.

**OUTPUT FORMAT**: You must respond with valid JSON only. No additional text before or after the JSON.`;

function buildSOAPNotePrompt(transcriptText: string, metadata: SessionMetadata): string {
  return `Generate a comprehensive SOAP note from the following therapy session transcript.

**SESSION INFORMATION:**
- Date: ${metadata.sessionDate}
- Duration: ${metadata.sessionDuration} minutes
- Session Type: ${metadata.sessionType}
- Client: ${metadata.clientName}
- Clinician: ${metadata.clinicianName}
${metadata.previousDiagnoses ? `- Previous Diagnoses: ${metadata.previousDiagnoses.join(', ')}` : ''}
${metadata.sessionNumber ? `- Session Number: ${metadata.sessionNumber}` : ''}

**TRANSCRIPT:**
${transcriptText}

**INSTRUCTIONS:**
Create a structured SOAP note with the following sections:

1. **Subjective**: What the client reported
   - Chief complaint or main concerns
   - Mood (client-reported)
   - Symptoms described
   - Recent events or stressors
   - Client-reported progress

2. **Objective**: What the clinician observed
   - Appearance (grooming, dress, posture)
   - Affect (observed emotional state)
   - Behavior (cooperative, guarded, agitated, etc.)
   - Speech (rate, tone, coherence)
   - Mental Status Exam:
     * Orientation (person, place, time, situation)
     * Memory (immediate, recent, remote)
     * Concentration and attention
     * Insight (into problems)
     * Judgment (decision-making ability)

3. **Assessment**: Clinical analysis
   - Clinical impressions
   - Diagnosis (ICD-10 codes if mentioned or clearly applicable)
   - Progress toward treatment goals
   - Functional status
   - Response to treatment

4. **Plan**: Treatment interventions and next steps
   - Interventions used in session (CBT, DBT skills, psychoeducation, etc.)
   - Homework or between-session assignments
   - Medication changes (if discussed)
   - Next session focus
   - Next session date (if scheduled)
   - Safety plan (if needed)
   - Referrals (if discussed)

5. **Risk Assessment**: Safety screening
   - Risk level: LOW, MODERATE, HIGH, or CRITICAL
   - Suicidal ideation (yes/no)
   - Suicidal plan (yes/no)
   - Suicidal intent (yes/no)
   - Homicidal ideation (yes/no)
   - Self-harm behaviors (yes/no)
   - Substance abuse concerns (yes/no)
   - Medication non-compliance (yes/no)
   - Specific risk indicators found in transcript
   - Recommended safety actions
   - Whether immediate action is required

6. **Quality Indicators**:
   - Transcript quality: POOR, FAIR, GOOD, or EXCELLENT
   - Missing information that would improve the note
   - Warnings about any unclear or ambiguous content

**OUTPUT FORMAT** (valid JSON):
{
  "soapNote": {
    "subjective": {
      "chiefComplaint": "string",
      "mood": "string",
      "symptoms": ["string"],
      "recentEvents": "string",
      "clientReportedProgress": "string"
    },
    "objective": {
      "appearance": "string",
      "affect": "string",
      "behavior": "string",
      "speech": "string",
      "mentalStatus": {
        "orientation": "string",
        "memory": "string",
        "concentration": "string",
        "insight": "string",
        "judgment": "string"
      }
    },
    "assessment": {
      "clinicalImpressions": "string",
      "diagnosis": ["string"],
      "progress": "string",
      "functionalStatus": "string",
      "responseToTreatment": "string"
    },
    "plan": {
      "interventionsUsed": ["string"],
      "homeworkAssigned": ["string"],
      "medicationChanges": "string or null",
      "nextSessionFocus": "string",
      "nextSessionDate": "string or null",
      "safetyPlan": "string or null",
      "referrals": ["string"]
    }
  },
  "riskAssessment": {
    "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
    "suicidalIdeation": boolean,
    "suicidalPlan": boolean,
    "suicidalIntent": boolean,
    "homicidalIdeation": boolean,
    "selfHarm": boolean,
    "substanceAbuse": boolean,
    "nonCompliance": boolean,
    "indicators": ["string"],
    "recommendedActions": ["string"],
    "requiresImmediateAction": boolean,
    "safetyPlanRecommendations": ["string"]
  },
  "transcriptQuality": "POOR|FAIR|GOOD|EXCELLENT",
  "missingInformation": ["string"],
  "warnings": ["string"]
}`;
}

function buildRiskAssessmentPrompt(transcriptText: string): string {
  return `Analyze this therapy session transcript for risk indicators and provide a comprehensive risk assessment.

**TRANSCRIPT:**
${transcriptText}

**INSTRUCTIONS:**
Carefully review the transcript for any indicators of:
1. Suicidal ideation, plan, or intent
2. Self-harm behaviors
3. Homicidal or violent ideation
4. Substance abuse
5. Medication non-compliance
6. Other safety concerns

**OUTPUT FORMAT** (valid JSON):
{
  "riskAssessment": {
    "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
    "suicidalIdeation": boolean,
    "suicidalPlan": boolean,
    "suicidalIntent": boolean,
    "homicidalIdeation": boolean,
    "selfHarm": boolean,
    "substanceAbuse": boolean,
    "nonCompliance": boolean,
    "indicators": ["specific quotes or observations from transcript"],
    "recommendedActions": ["specific recommended actions"],
    "requiresImmediateAction": boolean,
    "safetyPlanRecommendations": ["specific safety plan elements"]
  },
  "confidence": 0.95
}`;
}

// ============================================================================
// CORE GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a SOAP note from a session transcript
 */
export async function generateSOAPNote(
  request: GenerateNoteRequest,
  userId: string
): Promise<GenerateNoteResponse> {
  // TODO: Feature not implemented - models missing from schema
  if (AI_NOTE_MODELS_NOT_IMPLEMENTED) {
    throwNotImplementedError();
  }

  const startTime = Date.now();

  try {
    // Validate transcript
    validateTranscript(request.transcriptText);

    // Get session details
    const session = await prisma.telehealthSession.findUnique({
      where: { id: request.sessionId },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
    });

    if (!session) {
      throw new AIGenerationError(
        'Session not found',
        AIErrorCode.INVALID_SESSION,
        { sessionId: request.sessionId }
      );
    }

    // Create AI note record in GENERATING status
    const aiNote = await prismaAI.aIGeneratedNote.create({
      data: {
        sessionId: request.sessionId,
        appointmentId: session.appointmentId,
        clientId: session.appointment.clientId,
        clinicianId: session.appointment.clinicianId,
        noteType: request.noteType || AIGeneratedNoteType.PROGRESS_NOTE,
        status: AIGeneratedNoteStatus.GENERATING,
        transcriptText: request.transcriptText,
        transcriptId: request.transcriptId,
        sessionMetadata: request.sessionMetadata as any,
        soapNote: {},
        riskAssessment: {},
        modelUsed: MODEL_NAME,
        promptVersion: PROMPT_VERSION,
      },
    });

    // Log generation started
    await logAuditEvent(aiNote.id, AuditEventType.GENERATION_STARTED, {}, userId);

    // Call Claude API
    const client = getAnthropicClient();
    const prompt = buildSOAPNotePrompt(request.transcriptText, request.sessionMetadata);

    logger.info('Calling Claude API for SOAP note generation', {
      aiNoteId: aiNote.id,
      model: MODEL_NAME,
      transcriptLength: request.transcriptText.length,
    });

    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new AIGenerationError(
        'Unexpected response format from Claude',
        AIErrorCode.API_ERROR
      );
    }

    const generatedData = parseClaudeResponse(content.text);
    const generationTimeMs = Date.now() - startTime;

    // Calculate confidence score
    const confidence = calculateConfidence(
      generatedData.soapNote,
      generatedData.transcriptQuality,
      generatedData.missingInformation
    );

    // Update AI note with generated content
    const updatedNote = await prismaAI.aIGeneratedNote.update({
      where: { id: aiNote.id },
      data: {
        status: AIGeneratedNoteStatus.GENERATED,
        soapNote: generatedData.soapNote as any,
        riskAssessment: generatedData.riskAssessment as any,
        transcriptQuality: generatedData.transcriptQuality,
        missingInformation: generatedData.missingInformation || [],
        warnings: generatedData.warnings || [],
        generationConfidence: confidence,
        generationTimeMs,
        tokenCount: response.usage.input_tokens + response.usage.output_tokens,
        generatedAt: new Date(),
      },
    });

    // Update session with AI note reference
    // TODO: TelehealthSession model doesn't have aiNoteGenerated, aiNoteGeneratedAt, aiNoteId fields yet
    // await prisma.telehealthSession.update({
    //   where: { id: request.sessionId },
    //   data: {
    //     aiNoteGenerated: true,
    //     aiNoteGeneratedAt: new Date(),
    //     aiNoteId: aiNote.id,
    //   },
    // });

    // Log generation completed
    await logAuditEvent(
      aiNote.id,
      AuditEventType.GENERATION_COMPLETED,
      {
        confidence,
        generationTimeMs,
        transcriptQuality: generatedData.transcriptQuality,
        riskLevel: generatedData.riskAssessment.riskLevel,
      },
      userId
    );

    // If high or critical risk detected, log immediately
    if (
      generatedData.riskAssessment.riskLevel === AIRiskLevel.HIGH ||
      generatedData.riskAssessment.riskLevel === AIRiskLevel.CRITICAL
    ) {
      await logAuditEvent(aiNote.id, AuditEventType.RISK_FLAG_RAISED, {
        riskLevel: generatedData.riskAssessment.riskLevel,
        indicators: generatedData.riskAssessment.indicators,
      }, userId);

      logger.warn('HIGH/CRITICAL risk detected in AI note generation', {
        aiNoteId: aiNote.id,
        sessionId: request.sessionId,
        riskLevel: generatedData.riskAssessment.riskLevel,
        requiresImmediateAction: generatedData.riskAssessment.requiresImmediateAction,
      });
    }

    return {
      id: updatedNote.id,
      status: updatedNote.status as AIGeneratedNoteStatus,
      soapNote: updatedNote.soapNote as SOAPNote,
      riskAssessment: updatedNote.riskAssessment as RiskAssessment,
      treatmentPlanUpdates: updatedNote.treatmentPlanUpdates as TreatmentPlanUpdates | undefined,
      generationConfidence: confidence,
      transcriptQuality: updatedNote.transcriptQuality as TranscriptQuality,
      missingInformation: updatedNote.missingInformation,
      warnings: updatedNote.warnings,
      generationTimeMs,
      tokenCount: updatedNote.tokenCount!,
      createdAt: updatedNote.createdAt.toISOString(),
    };
  } catch (error: any) {
    logger.error('Failed to generate SOAP note', {
      error: error.message,
      sessionId: request.sessionId,
      stack: error.stack,
    });

    // Update note status to FAILED if it was created
    if (error.aiNoteId) {
      await prismaAI.aIGeneratedNote.update({
        where: { id: error.aiNoteId },
        data: {
          status: AIGeneratedNoteStatus.FAILED,
          errorMessage: error.message,
          errorDetails: {
            code: error.code,
            details: error.details,
          } as any,
        },
      });

      await logAuditEvent(error.aiNoteId, AuditEventType.GENERATION_FAILED, {
        error: error.message,
        code: error.code,
      }, userId);
    }

    throw error;
  }
}

/**
 * Generate risk assessment only (faster than full SOAP note)
 */
export async function generateRiskAssessment(
  transcriptText: string,
  sessionId: string,
  userId: string
): Promise<RiskAssessment> {
  // TODO: Feature not implemented - models missing from schema
  if (AI_NOTE_MODELS_NOT_IMPLEMENTED) {
    throwNotImplementedError();
  }

  try {
    validateTranscript(transcriptText);

    const client = getAnthropicClient();
    const prompt = buildRiskAssessmentPrompt(transcriptText);

    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 2000,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new AIGenerationError(
        'Unexpected response format from Claude',
        AIErrorCode.API_ERROR
      );
    }

    const result = JSON.parse(content.text);

    logger.info('Risk assessment generated', {
      sessionId,
      riskLevel: result.riskAssessment.riskLevel,
      requiresImmediateAction: result.riskAssessment.requiresImmediateAction,
    });

    return result.riskAssessment;
  } catch (error: any) {
    logger.error('Failed to generate risk assessment', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Regenerate note with clinician feedback
 */
export async function regenerateNote(
  request: RegenerateNoteRequest,
  userId: string
): Promise<GenerateNoteResponse> {
  // TODO: Feature not implemented - models missing from schema
  if (AI_NOTE_MODELS_NOT_IMPLEMENTED) {
    throwNotImplementedError();
  }

  try {
    const existingNote = await prismaAI.aIGeneratedNote.findUnique({
      where: { id: request.aiNoteId },
      include: {
        session: {
          include: {
            appointment: {
              include: {
                client: true,
                clinician: true,
              },
            },
          },
        },
      },
    });

    if (!existingNote) {
      throw new AIGenerationError(
        'AI note not found',
        AIErrorCode.INVALID_SESSION,
        { aiNoteId: request.aiNoteId }
      );
    }

    // Store previous version
    const previousVersions = Array.isArray(existingNote.previousVersions)
      ? existingNote.previousVersions
      : [];

    previousVersions.push({
      version: existingNote.regenerationCount + 1,
      soapNote: existingNote.soapNote,
      riskAssessment: existingNote.riskAssessment,
      generatedAt: existingNote.generatedAt,
      confidence: existingNote.generationConfidence,
    });

    // Update status to REGENERATING
    await prismaAI.aIGeneratedNote.update({
      where: { id: request.aiNoteId },
      data: {
        status: AIGeneratedNoteStatus.REGENERATING,
        regenerationCount: existingNote.regenerationCount + 1,
        regenerationFeedback: [
          ...existingNote.regenerationFeedback,
          request.feedback,
        ],
        previousVersions: previousVersions as any,
      },
    });

    await logAuditEvent(
      request.aiNoteId,
      AuditEventType.REGENERATION_REQUESTED,
      { feedback: request.feedback },
      userId
    );

    // Build enhanced prompt with feedback
    const sessionMetadata = existingNote.sessionMetadata as SessionMetadata;
    let enhancedPrompt = buildSOAPNotePrompt(existingNote.transcriptText, sessionMetadata);

    enhancedPrompt += `\n\n**CLINICIAN FEEDBACK FOR IMPROVEMENT:**
${request.feedback}

${request.preserveSections && request.preserveSections.length > 0 ? `
**PRESERVE THESE SECTIONS (do not change):**
${request.preserveSections.join(', ')}
` : ''}

${request.focusAreas && request.focusAreas.length > 0 ? `
**FOCUS ON IMPROVING:**
${request.focusAreas.join(', ')}
` : ''}

Please regenerate the note incorporating this feedback while maintaining clinical accuracy.`;

    // Call Claude API with enhanced prompt
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: enhancedPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new AIGenerationError(
        'Unexpected response format from Claude',
        AIErrorCode.API_ERROR
      );
    }

    const generatedData = parseClaudeResponse(content.text);
    const confidence = calculateConfidence(
      generatedData.soapNote,
      generatedData.transcriptQuality,
      generatedData.missingInformation
    );

    // Update note with regenerated content
    const updatedNote = await prismaAI.aIGeneratedNote.update({
      where: { id: request.aiNoteId },
      data: {
        status: AIGeneratedNoteStatus.GENERATED,
        soapNote: generatedData.soapNote as any,
        riskAssessment: generatedData.riskAssessment as any,
        generationConfidence: confidence,
        generatedAt: new Date(),
      },
    });

    await logAuditEvent(
      request.aiNoteId,
      AuditEventType.GENERATION_COMPLETED,
      { regenerated: true, confidence },
      userId
    );

    return {
      id: updatedNote.id,
      status: updatedNote.status as AIGeneratedNoteStatus,
      soapNote: updatedNote.soapNote as SOAPNote,
      riskAssessment: updatedNote.riskAssessment as RiskAssessment,
      treatmentPlanUpdates: updatedNote.treatmentPlanUpdates as TreatmentPlanUpdates | undefined,
      generationConfidence: confidence,
      transcriptQuality: updatedNote.transcriptQuality as TranscriptQuality,
      missingInformation: updatedNote.missingInformation,
      warnings: updatedNote.warnings,
      generationTimeMs: 0, // Not tracked for regeneration
      tokenCount: updatedNote.tokenCount!,
      createdAt: updatedNote.createdAt.toISOString(),
    };
  } catch (error: any) {
    logger.error('Failed to regenerate note', {
      error: error.message,
      aiNoteId: request.aiNoteId,
    });
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateTranscript(transcriptText: string): void {
  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new AIGenerationError(
      'Transcript text is required',
      AIErrorCode.INSUFFICIENT_CONTENT
    );
  }

  if (transcriptText.length < MIN_TRANSCRIPT_LENGTH) {
    throw new AIGenerationError(
      `Transcript too short (minimum ${MIN_TRANSCRIPT_LENGTH} characters)`,
      AIErrorCode.TRANSCRIPT_TOO_SHORT,
      { length: transcriptText.length, minimum: MIN_TRANSCRIPT_LENGTH }
    );
  }
}

function parseClaudeResponse(responseText: string): any {
  try {
    // Clean response (remove markdown code blocks if present)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedText);
    return parsed;
  } catch (error: any) {
    logger.error('Failed to parse Claude response', {
      error: error.message,
      responseText: responseText.substring(0, 500),
    });
    throw new AIGenerationError(
      'Failed to parse AI response',
      AIErrorCode.API_ERROR,
      { parseError: error.message }
    );
  }
}

function calculateConfidence(
  soapNote: SOAPNote,
  transcriptQuality: TranscriptQuality,
  missingInformation: string[]
): number {
  let confidence = 1.0;

  // Adjust based on transcript quality
  switch (transcriptQuality) {
    case TranscriptQuality.EXCELLENT:
      confidence *= 1.0;
      break;
    case TranscriptQuality.GOOD:
      confidence *= 0.9;
      break;
    case TranscriptQuality.FAIR:
      confidence *= 0.7;
      break;
    case TranscriptQuality.POOR:
      confidence *= 0.5;
      break;
  }

  // Reduce confidence for missing information
  const missingCount = missingInformation?.length || 0;
  if (missingCount > 0) {
    confidence *= Math.max(0.5, 1 - (missingCount * 0.1));
  }

  // Check completeness of SOAP sections
  let completenessScore = 0;
  if (soapNote.subjective.chiefComplaint) completenessScore++;
  if (soapNote.objective.appearance) completenessScore++;
  if (soapNote.assessment.clinicalImpressions) completenessScore++;
  if (soapNote.plan.interventionsUsed?.length > 0) completenessScore++;

  confidence *= (completenessScore / 4);

  return Math.round(confidence * 100) / 100; // Round to 2 decimal places
}

async function logAuditEvent(
  aiNoteId: string,
  eventType: AuditEventType,
  eventData: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    await prismaAI.aIGenerationAuditLog.create({
      data: {
        aiNoteId,
        eventType,
        eventData: eventData as any,
        userId,
        timestamp: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Failed to log audit event', {
      error: error.message,
      aiNoteId,
      eventType,
    });
    // Don't throw - audit logging failure shouldn't break the main flow
  }
}

// ============================================================================
// RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get AI generated note by ID
 */
export async function getAINote(aiNoteId: string) {
  // TODO: Feature not implemented - models missing from schema
  if (AI_NOTE_MODELS_NOT_IMPLEMENTED) {
    throwNotImplementedError();
  }

  return prismaAI.aIGeneratedNote.findUnique({
    where: { id: aiNoteId },
    include: {
      session: {
        include: {
          appointment: {
            include: {
              client: true,
              clinician: true,
            },
          },
        },
      },
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Get AI note by session ID
 */
export async function getAINoteBySession(sessionId: string) {
  // TODO: Feature not implemented - models missing from schema
  if (AI_NOTE_MODELS_NOT_IMPLEMENTED) {
    throwNotImplementedError();
  }

  return prismaAI.aIGeneratedNote.findUnique({
    where: { sessionId },
    include: {
      session: {
        include: {
          appointment: {
            include: {
              client: true,
              clinician: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get audit logs for an AI note
 */
export async function getAINoteAuditLogs(aiNoteId: string) {
  // TODO: Feature not implemented - models missing from schema
  if (AI_NOTE_MODELS_NOT_IMPLEMENTED) {
    throwNotImplementedError();
  }

  return prismaAI.aIGenerationAuditLog.findMany({
    where: { aiNoteId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });
}
