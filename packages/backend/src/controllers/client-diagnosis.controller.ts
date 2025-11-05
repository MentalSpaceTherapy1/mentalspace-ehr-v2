/**
 * Client Diagnosis Controller
 *
 * Module 2: Client Management - Diagnosis Management
 * Handles HTTP requests for client diagnosis operations
 */

import { Request, Response, NextFunction } from 'express';
import { ClientDiagnosisService } from '../services/client-diagnosis.service';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * POST /api/v1/clients/:clientId/diagnoses
 * Add a new diagnosis for a client
 */
export const addDiagnosis = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const {
      diagnosisType,
      icd10Code,
      dsm5Code,
      diagnosisName,
      diagnosisCategory,
      severitySpecifier,
      courseSpecifier,
      onsetDate,
      supportingEvidence,
      differentialConsiderations
    } = req.body;

    // Validate required fields
    if (!diagnosisType || !diagnosisName) {
      throw new BadRequestError('Missing required fields: diagnosisType, diagnosisName');
    }

    // Validate diagnosis type
    const validTypes = ['PRIMARY', 'SECONDARY', 'RULE_OUT', 'HISTORICAL', 'PROVISIONAL'];
    if (!validTypes.includes(diagnosisType)) {
      throw new BadRequestError(
        `Invalid diagnosis type. Must be one of: ${validTypes.join(', ')}`
      );
    }

    const diagnosis = await ClientDiagnosisService.addDiagnosis({
      clientId,
      diagnosisType,
      icd10Code,
      dsm5Code,
      diagnosisName,
      diagnosisCategory,
      severitySpecifier,
      courseSpecifier,
      onsetDate: onsetDate ? new Date(onsetDate) : undefined,
      supportingEvidence,
      differentialConsiderations,
      diagnosedById: userId
    });

    res.status(201).json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis added successfully'
    });
  }
);

/**
 * GET /api/v1/clients/:clientId/diagnoses
 * Get all diagnoses for a client
 */
export const getClientDiagnoses = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;
    const { activeOnly, diagnosisType } = req.query;

    const diagnoses = await ClientDiagnosisService.getClientDiagnoses(clientId, {
      activeOnly: activeOnly === 'true',
      diagnosisType: diagnosisType as string | undefined
    });

    res.json({
      success: true,
      data: diagnoses,
      count: diagnoses.length
    });
  }
);

/**
 * GET /api/v1/diagnoses/:id
 * Get a single diagnosis by ID
 */
export const getDiagnosisById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const diagnosis = await ClientDiagnosisService.getDiagnosisById(id);

    res.json({
      success: true,
      data: diagnosis
    });
  }
);

/**
 * PATCH /api/v1/diagnoses/:id
 * Update a diagnosis
 */
export const updateDiagnosis = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const {
      diagnosisType,
      icd10Code,
      dsm5Code,
      diagnosisName,
      diagnosisCategory,
      severitySpecifier,
      courseSpecifier,
      onsetDate,
      remissionDate,
      status,
      dateResolved,
      resolutionNotes,
      supportingEvidence,
      differentialConsiderations
    } = req.body;

    // Validate diagnosis type if provided
    if (diagnosisType) {
      const validTypes = ['PRIMARY', 'SECONDARY', 'RULE_OUT', 'HISTORICAL', 'PROVISIONAL'];
      if (!validTypes.includes(diagnosisType)) {
        throw new BadRequestError(
          `Invalid diagnosis type. Must be one of: ${validTypes.join(', ')}`
        );
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['ACTIVE', 'RESOLVED', 'RULE_OUT_REJECTED'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestError(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }
    }

    const diagnosis = await ClientDiagnosisService.updateDiagnosis(id, {
      diagnosisType,
      icd10Code,
      dsm5Code,
      diagnosisName,
      diagnosisCategory,
      severitySpecifier,
      courseSpecifier,
      onsetDate: onsetDate ? new Date(onsetDate) : undefined,
      remissionDate: remissionDate ? new Date(remissionDate) : undefined,
      status,
      dateResolved: dateResolved ? new Date(dateResolved) : undefined,
      resolutionNotes,
      supportingEvidence,
      differentialConsiderations,
      lastReviewedById: userId,
      lastReviewedDate: new Date()
    });

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis updated successfully'
    });
  }
);

/**
 * PATCH /api/v1/diagnoses/:id/status
 * Update diagnosis status (quick status change)
 */
export const updateDiagnosisStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const { status, dateResolved, resolutionNotes } = req.body;

    if (!status) {
      throw new BadRequestError('Missing required field: status');
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'RESOLVED', 'RULE_OUT_REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      );
    }

    const diagnosis = await ClientDiagnosisService.updateDiagnosisStatus(id, status, {
      dateResolved: dateResolved ? new Date(dateResolved) : undefined,
      resolutionNotes,
      lastReviewedById: userId
    });

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis status updated successfully'
    });
  }
);

/**
 * DELETE /api/v1/diagnoses/:id
 * Delete (soft delete) a diagnosis
 */
export const deleteDiagnosis = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const diagnosis = await ClientDiagnosisService.deleteDiagnosis(id, userId);

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis deleted successfully'
    });
  }
);

/**
 * GET /api/v1/diagnoses/icd10/search?q=depression
 * Search ICD-10 codes
 */
export const searchICD10Codes = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      throw new BadRequestError('Missing or invalid query parameter: q');
    }

    const results = await ClientDiagnosisService.searchICD10Codes(q);

    res.json({
      success: true,
      data: results,
      count: results.length,
      query: q
    });
  }
);

/**
 * GET /api/v1/clients/:clientId/diagnoses/stats
 * Get diagnosis statistics for a client
 */
export const getClientDiagnosisStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;

    const stats = await ClientDiagnosisService.getClientDiagnosisStats(clientId);

    res.json({
      success: true,
      data: stats
    });
  }
);

// Export all controller functions
export const ClientDiagnosisController = {
  addDiagnosis,
  getClientDiagnoses,
  getDiagnosisById,
  updateDiagnosis,
  updateDiagnosisStatus,
  deleteDiagnosis,
  searchICD10Codes,
  getClientDiagnosisStats
};
