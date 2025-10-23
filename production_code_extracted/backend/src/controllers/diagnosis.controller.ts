/**
 * Diagnosis Controller
 *
 * Handles HTTP requests for diagnosis management with Clinical Notes Business Rules
 */

import { Request, Response, NextFunction } from 'express';
import { DiagnosisService } from '../services/diagnosis.service';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * Create a new diagnosis
 * POST /api/v1/diagnoses
 */
export const createDiagnosis = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const {
      clientId,
      icdCode,
      diagnosisDescription,
      diagnosisType,
      severity,
      specifiers,
      onsetDate,
      notes,
      diagnosisNoteId,
      createdInNoteType
    } = req.body;

    // Validate required fields
    if (!clientId || !icdCode || !diagnosisDescription || !diagnosisNoteId || !createdInNoteType) {
      throw new BadRequestError(
        'Missing required fields: clientId, icdCode, diagnosisDescription, diagnosisNoteId, createdInNoteType'
      );
    }

    const diagnosis = await DiagnosisService.createDiagnosis({
      clientId,
      icdCode,
      diagnosisDescription,
      diagnosisType,
      severity,
      specifiers,
      onsetDate: onsetDate ? new Date(onsetDate) : undefined,
      notes,
      diagnosedBy: userId,
      diagnosisNoteId,
      createdInNoteType
    });

    res.status(201).json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis created successfully'
    });
  }
);

/**
 * Update a diagnosis
 * PUT /api/v1/diagnoses/:id
 */
export const updateDiagnosis = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const { id } = req.params;
    const {
      icdCode,
      diagnosisDescription,
      diagnosisType,
      severity,
      specifiers,
      onsetDate,
      resolvedDate,
      status,
      notes,
      lastUpdatedNoteId,
      lastUpdatedInNoteType,
      changeReason
    } = req.body;

    // Validate required fields for update
    if (!lastUpdatedNoteId || !lastUpdatedInNoteType) {
      throw new BadRequestError(
        'Missing required fields: lastUpdatedNoteId, lastUpdatedInNoteType'
      );
    }

    const diagnosis = await DiagnosisService.updateDiagnosis(id, {
      icdCode,
      diagnosisDescription,
      diagnosisType,
      severity,
      specifiers,
      onsetDate: onsetDate ? new Date(onsetDate) : undefined,
      resolvedDate: resolvedDate ? new Date(resolvedDate) : undefined,
      status,
      notes,
      lastUpdatedNoteId,
      lastUpdatedInNoteType,
      updatedBy: userId,
      changeReason
    });

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis updated successfully'
    });
  }
);

/**
 * Get diagnosis by ID
 * GET /api/v1/diagnoses/:id
 */
export const getDiagnosisById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const diagnosis = await DiagnosisService.getDiagnosisById(id);

    res.json({
      success: true,
      data: diagnosis
    });
  }
);

/**
 * Get all diagnoses for a client
 * GET /api/v1/diagnoses/client/:clientId
 */
export const getClientDiagnoses = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;
    const { activeOnly } = req.query;

    const diagnoses = await DiagnosisService.getClientDiagnoses(
      clientId,
      activeOnly === 'true'
    );

    res.json({
      success: true,
      data: diagnoses,
      count: diagnoses.length
    });
  }
);

/**
 * Get diagnosis history
 * GET /api/v1/diagnoses/:id/history
 */
export const getDiagnosisHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const history = await DiagnosisService.getDiagnosisHistory(id);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  }
);

/**
 * Delete (deactivate) a diagnosis
 * DELETE /api/v1/diagnoses/:id
 */
export const deleteDiagnosis = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const { id } = req.params;
    const { noteId, noteType, reason } = req.body;

    // Validate required fields
    if (!noteId || !noteType) {
      throw new BadRequestError(
        'Missing required fields: noteId, noteType'
      );
    }

    const diagnosis = await DiagnosisService.deleteDiagnosis(
      id,
      userId,
      noteId,
      noteType,
      reason
    );

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis deactivated successfully'
    });
  }
);

/**
 * Get diagnosis statistics for a client
 * GET /api/v1/diagnoses/client/:clientId/stats
 */
export const getClientDiagnosisStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;

    const stats = await DiagnosisService.getClientDiagnosisStats(clientId);

    res.json({
      success: true,
      data: stats
    });
  }
);
