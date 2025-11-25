/**
 * Module 6 Telehealth Phase 2: AI Note Generation Controller
 *
 * REST API endpoints for AI-powered clinical note generation
 */

import { Request, Response } from 'express';
import * as aiNoteService from '../services/aiNoteGeneration.service';
import prisma from '../services/database';
import logger from '../utils/logger';
import {
  GenerateNoteRequest,
  RegenerateNoteRequest,
  ReviewNoteRequest,
  ExportToNoteRequest,
  AIGeneratedNoteStatus,
  AuditEventType,
  ClinicianEdit,
} from '../types/aiNote.types';

/**
 * POST /api/v1/telehealth/sessions/:sessionId/generate-note
 * Generate AI note from session transcript
 */
export async function generateNote(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      transcriptText,
      transcriptId,
      sessionMetadata,
      noteType,
      includeTreatmentPlanUpdates,
    } = req.body;

    // Validate required fields
    if (!transcriptText) {
      res.status(400).json({ error: 'Transcript text is required' });
      return;
    }

    if (!sessionMetadata) {
      res.status(400).json({ error: 'Session metadata is required' });
      return;
    }

    // Verify session exists and user has access
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            clinician: true,
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if user is the clinician or has admin rights
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAuthorized =
      session.appointment.clinicianId === userId ||
      user?.roles.includes('ADMINISTRATOR') ||
      user?.roles.includes('SUPERVISOR');

    if (!isAuthorized) {
      res.status(403).json({ error: 'Not authorized to generate note for this session' });
      return;
    }

    // Check if AI note already exists
    const existingNote = await aiNoteService.getAINoteBySession(sessionId);
    if (existingNote && existingNote.status !== AIGeneratedNoteStatus.FAILED) {
      res.status(409).json({
        error: 'AI note already exists for this session',
        aiNoteId: existingNote.id,
        status: existingNote.status,
      });
      return;
    }

    const request: GenerateNoteRequest = {
      sessionId,
      transcriptText,
      transcriptId,
      sessionMetadata,
      noteType,
      includeTreatmentPlanUpdates,
    };

    logger.info('Generating AI note', {
      sessionId,
      userId,
      transcriptLength: transcriptText.length,
    });

    const result = await aiNoteService.generateSOAPNote(request, userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to generate AI note', {
      error: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId,
    });

    res.status(error.code === 'TRANSCRIPT_TOO_SHORT' ? 400 : 500).json({
      error: error.message || 'Failed to generate AI note',
      code: error.code,
      details: error.details,
    });
  }
}

/**
 * GET /api/v1/telehealth/sessions/:sessionId/ai-note
 * Get AI-generated note for a session
 */
export async function getAINote(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const aiNote = await aiNoteService.getAINoteBySession(sessionId);

    if (!aiNote) {
      res.status(404).json({ error: 'AI note not found for this session' });
      return;
    }

    // Check authorization
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAuthorized =
      aiNote.clinicianId === userId ||
      user?.roles.includes('ADMINISTRATOR') ||
      user?.roles.includes('SUPERVISOR');

    if (!isAuthorized) {
      res.status(403).json({ error: 'Not authorized to view this note' });
      return;
    }

    res.json({
      success: true,
      data: aiNote,
    });
  } catch (error: any) {
    logger.error('Failed to get AI note', {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      error: 'Failed to retrieve AI note',
    });
  }
}

/**
 * PUT /api/v1/telehealth/sessions/:sessionId/ai-note/review
 * Clinician review and approval of AI-generated note
 */
export async function reviewNote(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { approved, edits, reviewComments }: ReviewNoteRequest = req.body;

    const aiNote = await aiNoteService.getAINoteBySession(sessionId);

    if (!aiNote) {
      res.status(404).json({ error: 'AI note not found' });
      return;
    }

    // Verify clinician is authorized
    if (aiNote.clinicianId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isAdmin = user?.roles.includes('ADMINISTRATOR') || user?.roles.includes('SUPERVISOR');

      if (!isAdmin) {
        res.status(403).json({ error: 'Only the treating clinician can review this note' });
        return;
      }
    }

    // Process edits
    let clinicianEdits = aiNote.clinicianEdits || { changes: [], totalEdits: 0, lastEditedAt: new Date().toISOString() };
    if (edits && Array.isArray(edits) && edits.length > 0) {
      const existingChanges = Array.isArray(clinicianEdits.changes) ? clinicianEdits.changes : [];
      clinicianEdits = {
        changes: [...existingChanges, ...edits],
        totalEdits: existingChanges.length + edits.length,
        lastEditedAt: new Date().toISOString(),
      };
    }

    // TODO: Re-enable when aIGeneratedNote and aIGenerationAuditLog models are added to schema
    // Update note status
    // const updatedNote = await prisma.aIGeneratedNote.update({
    //   where: { id: aiNote.id },
    //   data: {
    //     status: approved ? AIGeneratedNoteStatus.APPROVED : AIGeneratedNoteStatus.REVIEWED,
    //     clinicianReviewed: true,
    //     reviewedAt: new Date(),
    //     reviewedBy: userId,
    //     clinicianEdits: clinicianEdits as any,
    //     approvedAt: approved ? new Date() : undefined,
    //   },
    // });

    // Log audit event
    // await prisma.aIGenerationAuditLog.create({
    //   data: {
    //     aiNoteId: aiNote.id,
    //     eventType: approved ? AuditEventType.APPROVED : AuditEventType.REVIEW_COMPLETED,
    //     eventData: {
    //       reviewComments,
    //       editCount: edits?.length || 0,
    //     } as any,
    //     userId,
    //     timestamp: new Date(),
    //   },
    // });

    logger.info('AI note reviewed', {
      aiNoteId: aiNote.id,
      approved,
      editCount: edits?.length || 0,
      reviewedBy: userId,
    });

    // TODO: Return actual updated note data when aIGeneratedNote model is added
    res.json({
      success: true,
      message: 'AI note review feature temporarily unavailable',
      data: {
        id: aiNote.id,
        status: approved ? 'APPROVED' : 'REVIEWED',
      },
    });
  } catch (error: any) {
    logger.error('Failed to review AI note', {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      error: 'Failed to review AI note',
    });
  }
}

/**
 * POST /api/v1/telehealth/sessions/:sessionId/ai-note/regenerate
 * Regenerate AI note with clinician feedback
 */
export async function regenerateNote(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { feedback, preserveSections, focusAreas } = req.body;

    if (!feedback) {
      res.status(400).json({ error: 'Feedback is required for regeneration' });
      return;
    }

    const aiNote = await aiNoteService.getAINoteBySession(sessionId);

    if (!aiNote) {
      res.status(404).json({ error: 'AI note not found' });
      return;
    }

    // Verify clinician is authorized
    if (aiNote.clinicianId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isAdmin = user?.roles.includes('ADMINISTRATOR') || user?.roles.includes('SUPERVISOR');

      if (!isAdmin) {
        res.status(403).json({ error: 'Only the treating clinician can regenerate this note' });
        return;
      }
    }

    const request: RegenerateNoteRequest = {
      aiNoteId: aiNote.id,
      feedback,
      preserveSections,
      focusAreas,
    };

    logger.info('Regenerating AI note', {
      aiNoteId: aiNote.id,
      userId,
      feedback: feedback.substring(0, 100),
    });

    const result = await aiNoteService.regenerateNote(request, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to regenerate AI note', {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      error: 'Failed to regenerate AI note',
    });
  }
}

/**
 * POST /api/v1/telehealth/sessions/:sessionId/ai-note/export
 * Export AI note to clinical note (final step after approval)
 */
export async function exportToClinicalNote(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { noteType, includeEdits }: ExportToNoteRequest = req.body;

    const aiNote = await aiNoteService.getAINoteBySession(sessionId);

    if (!aiNote) {
      res.status(404).json({ error: 'AI note not found' });
      return;
    }

    // Verify note is approved
    if (aiNote.status !== AIGeneratedNoteStatus.APPROVED) {
      res.status(400).json({
        error: 'AI note must be approved before exporting to clinical note',
        currentStatus: aiNote.status,
      });
      return;
    }

    // Verify clinician is authorized
    if (aiNote.clinicianId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isAdmin = user?.roles.includes('ADMINISTRATOR') || user?.roles.includes('SUPERVISOR');

      if (!isAdmin) {
        res.status(403).json({ error: 'Only the treating clinician can export this note' });
        return;
      }
    }

    // TODO: Re-enable when aiGeneratedNoteId field is added to ClinicalNote model
    // Check if clinical note already exists
    // const existingNote = await prisma.clinicalNote.findFirst({
    //   where: {
    //     appointmentId: aiNote.appointmentId,
    //     aiGeneratedNoteId: aiNote.id,
    //   },
    // });

    // if (existingNote) {
    //   res.status(409).json({
    //     error: 'Clinical note already created from this AI note',
    //     clinicalNoteId: existingNote.id,
    //   });
    //   return;
    // }

    const soapNote = aiNote.soapNote as any;
    const riskAssessment = aiNote.riskAssessment as any;

    // Apply clinician edits if requested
    let finalSOAP = soapNote;
    if (includeEdits && aiNote.clinicianEdits) {
      finalSOAP = applyClinicianEdits(soapNote, aiNote.clinicianEdits as any);
    }

    // Create clinical note from AI note
    const clinicalNote = await prisma.clinicalNote.create({
      data: {
        clientId: aiNote.clientId,
        clinicianId: aiNote.clinicianId,
        appointmentId: aiNote.appointmentId,
        noteType: noteType || 'Progress Note',
        sessionDate: aiNote.session.sessionStartedAt || new Date(),
        sessionDuration: aiNote.session.actualDuration,
        subjective: finalSOAP.subjective?.chiefComplaint || '',
        objective: finalSOAP.objective?.appearance || '',
        assessment: finalSOAP.assessment?.clinicalImpressions || '',
        plan: finalSOAP.plan?.nextSessionFocus || '',
        suicidalIdeation: riskAssessment?.suicidalIdeation || false,
        suicidalPlan: riskAssessment?.suicidalPlan || false,
        homicidalIdeation: riskAssessment?.homicidalIdeation || false,
        selfHarm: riskAssessment?.selfHarm || false,
        riskLevel: riskAssessment?.riskLevel,
        riskAssessmentDetails: JSON.stringify(riskAssessment),
        interventionsUsed: finalSOAP.plan?.interventionsUsed || [],
        status: 'DRAFT',
        aiGenerated: true,
        // TODO: Re-enable when these fields are added to ClinicalNote model
        // generatedFrom: 'telehealth_transcript',
        // aiGeneratedNoteId: aiNote.id,
        // generationConfidence: aiNote.generationConfidence,
        // clinicianReviewedAI: true,
        // aiEditCount: aiNote.clinicianEdits?.changes?.length || 0,
      },
    });

    // TODO: Re-enable when aIGenerationAuditLog model is added to schema
    // Log export event
    // await prisma.aIGenerationAuditLog.create({
    //   data: {
    //     aiNoteId: aiNote.id,
    //     eventType: AuditEventType.EXPORTED_TO_NOTE,
    //     eventData: {
    //       clinicalNoteId: clinicalNote.id,
    //       includeEdits,
    //     } as any,
    //     userId,
    //     timestamp: new Date(),
    //   },
    // });

    logger.info('AI note exported to clinical note', {
      aiNoteId: aiNote.id,
      clinicalNoteId: clinicalNote.id,
      userId,
    });

    res.status(201).json({
      success: true,
      data: {
        clinicalNoteId: clinicalNote.id,
        aiNoteId: aiNote.id,
      },
    });
  } catch (error: any) {
    logger.error('Failed to export AI note', {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      error: 'Failed to export AI note to clinical note',
    });
  }
}

/**
 * POST /api/v1/telehealth/sessions/:sessionId/risk-assessment
 * Generate standalone risk assessment
 */
export async function generateRiskAssessment(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { transcriptText } = req.body;

    if (!transcriptText) {
      res.status(400).json({ error: 'Transcript text is required' });
      return;
    }

    // Verify session exists and user has access
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            clinician: true,
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAuthorized =
      session.appointment.clinicianId === userId ||
      user?.roles.includes('ADMINISTRATOR') ||
      user?.roles.includes('SUPERVISOR');

    if (!isAuthorized) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const riskAssessment = await aiNoteService.generateRiskAssessment(
      transcriptText,
      sessionId,
      userId
    );

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (error: any) {
    logger.error('Failed to generate risk assessment', {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      error: 'Failed to generate risk assessment',
    });
  }
}

/**
 * GET /api/v1/telehealth/ai-notes/:aiNoteId/audit-logs
 * Get audit logs for an AI note
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { aiNoteId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const aiNote = await aiNoteService.getAINote(aiNoteId);

    if (!aiNote) {
      res.status(404).json({ error: 'AI note not found' });
      return;
    }

    // Check authorization
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAuthorized =
      aiNote.clinicianId === userId ||
      user?.roles.includes('ADMINISTRATOR') ||
      user?.roles.includes('SUPERVISOR');

    if (!isAuthorized) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const auditLogs = await aiNoteService.getAINoteAuditLogs(aiNoteId);

    res.json({
      success: true,
      data: auditLogs,
    });
  } catch (error: any) {
    logger.error('Failed to get audit logs', {
      error: error.message,
      aiNoteId: req.params.aiNoteId,
    });

    res.status(500).json({
      error: 'Failed to retrieve audit logs',
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function applyClinicianEdits(soapNote: any, clinicianEdits: any): any {
  const editedNote = JSON.parse(JSON.stringify(soapNote)); // Deep clone

  if (!clinicianEdits.changes || !Array.isArray(clinicianEdits.changes)) {
    return editedNote;
  }

  clinicianEdits.changes.forEach((edit: ClinicianEdit) => {
    const pathParts = edit.fieldPath.split('.');
    let current = editedNote;

    // Navigate to the field
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    // Apply the edit
    const finalKey = pathParts[pathParts.length - 1];
    current[finalKey] = edit.editedValue;
  });

  return editedNote;
}
