/**
 * Module 6 Telehealth Phase 2: AI Note Generation Controller
 *
 * REST API endpoints for AI-powered clinical note generation
 */

import { Request, Response } from 'express';
import { UserRoles } from '@mentalspace/shared';
import * as aiNoteGenerationService from '../services/aiNoteGeneration.service';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as aiNoteService from '../services/aiNote.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendConflict } from '../utils/apiResponse';
import {
  GenerateNoteRequest,
  RegenerateNoteRequest,
  ReviewNoteRequest,
  ExportToNoteRequest,
  AIGeneratedNoteStatus,
  AuditEventType,
  ClinicianEdit,
  SOAPNote,
  RiskAssessment,
  ClinicianEdits,
} from '../types/aiNote.types';

/**
 * POST /api/v1/telehealth/sessions/:sessionId/generate-note
 * Generate AI note from session transcript
 */
export async function generateNote(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
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
      return sendBadRequest(res, 'Transcript text is required');
    }

    if (!sessionMetadata) {
      return sendBadRequest(res, 'Session metadata is required');
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Verify session exists and user has access
    const session = await aiNoteService.findTelehealthSessionWithAppointment(sessionId);

    if (!session) {
      return sendNotFound(res, 'Session');
    }

    // Check if user is the clinician or has admin rights
    const user = await aiNoteService.getUserById(userId);
    const isAuthorized =
      session.appointment.clinicianId === userId ||
      user?.roles.includes(UserRoles.ADMINISTRATOR) ||
      user?.roles.includes(UserRoles.SUPERVISOR);

    if (!isAuthorized) {
      return sendForbidden(res, 'Not authorized to generate note for this session');
    }

    // Check if AI note already exists
    const existingNote = await aiNoteGenerationService.getAINoteBySession(sessionId);
    if (existingNote && existingNote.status !== AIGeneratedNoteStatus.FAILED) {
      return sendConflict(res, 'AI note already exists for this session', {
        aiNoteId: existingNote.id,
        status: existingNote.status,
      });
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

    const result = await aiNoteGenerationService.generateSOAPNote(request, userId);

    return sendCreated(res, result);
  } catch (error) {
    logger.error('Failed to generate AI note', {
      error: getErrorMessage(error),
      stack: getErrorStack(error),
      sessionId: req.params.sessionId,
    });

    if (getErrorCode(error) === 'TRANSCRIPT_TOO_SHORT') {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to generate AI note', getErrorCode(error));
    }
    return sendServerError(res, getErrorMessage(error) || 'Failed to generate AI note');
  }
}

/**
 * GET /api/v1/telehealth/sessions/:sessionId/ai-note
 * Get AI-generated note for a session
 */
export async function getAINote(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const aiNote = await aiNoteGenerationService.getAINoteBySession(sessionId);

    if (!aiNote) {
      return sendNotFound(res, 'AI note');
    }

    // Check authorization
    const user = await aiNoteService.getUserById(userId);
    const isAuthorized =
      aiNote.clinicianId === userId ||
      user?.roles.includes(UserRoles.ADMINISTRATOR) ||
      user?.roles.includes(UserRoles.SUPERVISOR);

    if (!isAuthorized) {
      return sendForbidden(res, 'Not authorized to view this note');
    }

    return sendSuccess(res, aiNote);
  } catch (error) {
    logger.error('Failed to get AI note', {
      error: getErrorMessage(error),
      sessionId: req.params.sessionId,
    });

    return sendServerError(res, 'Failed to retrieve AI note');
  }
}

/**
 * PUT /api/v1/telehealth/sessions/:sessionId/ai-note/review
 * Clinician review and approval of AI-generated note
 */
export async function reviewNote(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const { approved, edits, reviewComments }: ReviewNoteRequest = req.body;

    // Phase 3.2: Use service method instead of direct prisma call
    const aiNote = await aiNoteGenerationService.getAINoteBySession(sessionId);

    if (!aiNote) {
      return sendNotFound(res, 'AI note');
    }

    // Verify clinician is authorized
    if (aiNote.clinicianId !== userId) {
      const user = await aiNoteService.getUserById(userId);
      const isAdmin = user?.roles.includes(UserRoles.ADMINISTRATOR) || user?.roles.includes(UserRoles.SUPERVISOR);

      if (!isAdmin) {
        return sendForbidden(res, 'Only the treating clinician can review this note');
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
    return sendSuccess(res, {
      id: aiNote.id,
      status: approved ? 'APPROVED' : 'REVIEWED',
    }, 'AI note review feature temporarily unavailable');
  } catch (error) {
    logger.error('Failed to review AI note', {
      error: getErrorMessage(error),
      sessionId: req.params.sessionId,
    });

    return sendServerError(res, 'Failed to review AI note');
  }
}

/**
 * POST /api/v1/telehealth/sessions/:sessionId/ai-note/regenerate
 * Regenerate AI note with clinician feedback
 */
export async function regenerateNote(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const { feedback, preserveSections, focusAreas } = req.body;

    if (!feedback) {
      return sendBadRequest(res, 'Feedback is required for regeneration');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const aiNote = await aiNoteGenerationService.getAINoteBySession(sessionId);

    if (!aiNote) {
      return sendNotFound(res, 'AI note');
    }

    // Verify clinician is authorized
    if (aiNote.clinicianId !== userId) {
      const user = await aiNoteService.getUserById(userId);
      const isAdmin = user?.roles.includes(UserRoles.ADMINISTRATOR) || user?.roles.includes(UserRoles.SUPERVISOR);

      if (!isAdmin) {
        return sendForbidden(res, 'Only the treating clinician can regenerate this note');
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

    const result = await aiNoteGenerationService.regenerateNote(request, userId);

    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Failed to regenerate AI note', {
      error: getErrorMessage(error),
      sessionId: req.params.sessionId,
    });

    return sendServerError(res, 'Failed to regenerate AI note');
  }
}

/**
 * POST /api/v1/telehealth/sessions/:sessionId/ai-note/export
 * Export AI note to clinical note (final step after approval)
 */
export async function exportToClinicalNote(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const { noteType, includeEdits }: ExportToNoteRequest = req.body;

    // Phase 3.2: Use service method instead of direct prisma call
    const aiNote = await aiNoteGenerationService.getAINoteBySession(sessionId);

    if (!aiNote) {
      return sendNotFound(res, 'AI note');
    }

    // Verify note is approved
    if (aiNote.status !== AIGeneratedNoteStatus.APPROVED) {
      return sendBadRequest(res, 'AI note must be approved before exporting to clinical note');
    }

    // Verify clinician is authorized
    if (aiNote.clinicianId !== userId) {
      const user = await aiNoteService.getUserById(userId);
      const isAdmin = user?.roles.includes(UserRoles.ADMINISTRATOR) || user?.roles.includes(UserRoles.SUPERVISOR);

      if (!isAdmin) {
        return sendForbidden(res, 'Only the treating clinician can export this note');
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

    const soapNote = aiNote.soapNote as SOAPNote;
    const riskAssessment = aiNote.riskAssessment as RiskAssessment;

    // Apply clinician edits if requested
    let finalSOAP = soapNote;
    if (includeEdits && aiNote.clinicianEdits) {
      finalSOAP = applyClinicianEdits(soapNote, aiNote.clinicianEdits as ClinicianEdits);
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Create clinical note from AI note
    const clinicalNote = await aiNoteService.createClinicalNoteFromAI({
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
      lastModifiedBy: aiNote.clinicianId,
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

    return sendCreated(res, {
      clinicalNoteId: clinicalNote.id,
      aiNoteId: aiNote.id,
    });
  } catch (error) {
    logger.error('Failed to export AI note', {
      error: getErrorMessage(error),
      sessionId: req.params.sessionId,
    });

    return sendServerError(res, 'Failed to export AI note to clinical note');
  }
}

/**
 * POST /api/v1/telehealth/sessions/:sessionId/risk-assessment
 * Generate standalone risk assessment
 */
export async function generateRiskAssessment(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const { transcriptText } = req.body;

    if (!transcriptText) {
      return sendBadRequest(res, 'Transcript text is required');
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Verify session exists and user has access
    const session = await aiNoteService.findTelehealthSessionWithAppointment(sessionId);

    if (!session) {
      return sendNotFound(res, 'Session');
    }

    const user = await aiNoteService.getUserById(userId);
    const isAuthorized =
      session.appointment.clinicianId === userId ||
      user?.roles.includes(UserRoles.ADMINISTRATOR) ||
      user?.roles.includes(UserRoles.SUPERVISOR);

    if (!isAuthorized) {
      return sendForbidden(res, 'Not authorized');
    }

    const riskAssessment = await aiNoteGenerationService.generateRiskAssessment(
      transcriptText,
      sessionId,
      userId
    );

    return sendSuccess(res, riskAssessment);
  } catch (error) {
    logger.error('Failed to generate risk assessment', {
      error: getErrorMessage(error),
      sessionId: req.params.sessionId,
    });

    return sendServerError(res, 'Failed to generate risk assessment');
  }
}

/**
 * GET /api/v1/telehealth/ai-notes/:aiNoteId/audit-logs
 * Get audit logs for an AI note
 */
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { aiNoteId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const aiNote = await aiNoteService.getAINote(aiNoteId);

    if (!aiNote) {
      return sendNotFound(res, 'AI note');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Check authorization
    const user = await aiNoteService.getUserById(userId);
    const isAuthorized =
      aiNote.clinicianId === userId ||
      user?.roles.includes(UserRoles.ADMINISTRATOR) ||
      user?.roles.includes(UserRoles.SUPERVISOR);

    if (!isAuthorized) {
      return sendForbidden(res, 'Not authorized');
    }

    const auditLogs = await aiNoteService.getAINoteAuditLogs(aiNoteId);

    return sendSuccess(res, auditLogs);
  } catch (error) {
    logger.error('Failed to get audit logs', {
      error: getErrorMessage(error),
      aiNoteId: req.params.aiNoteId,
    });

    return sendServerError(res, 'Failed to retrieve audit logs');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function applyClinicianEdits(soapNote: SOAPNote, clinicianEdits: ClinicianEdits): SOAPNote {
  const editedNote = JSON.parse(JSON.stringify(soapNote)) as SOAPNote; // Deep clone

  if (!clinicianEdits.changes || !Array.isArray(clinicianEdits.changes)) {
    return editedNote;
  }

  clinicianEdits.changes.forEach((edit: ClinicianEdit) => {
    const pathParts = edit.fieldPath.split('.');
    let current: Record<string, unknown> = editedNote as unknown as Record<string, unknown>;

    // Navigate to the field
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]] as Record<string, unknown>;
    }

    // Apply the edit
    const finalKey = pathParts[pathParts.length - 1];
    current[finalKey] = edit.editedValue;
  });

  return editedNote;
}
