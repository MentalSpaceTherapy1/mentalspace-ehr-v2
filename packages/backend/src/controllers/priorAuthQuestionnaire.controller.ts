/**
 * Prior Authorization Questionnaire Controller
 * Handles HTTP requests for clinical questionnaire operations
 */

import { Request, Response } from 'express';
import { getErrorMessage } from '../utils/errorHelpers';
import '../types/express.d';
import * as QuestionnaireService from '../services/priorAuthQuestionnaire.service';
import * as PriorAuthAIService from '../services/ai/priorAuthAI.service';
import * as PriorAuthPdfService from '../services/priorAuthPdf.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * GET /api/v1/prior-authorizations/:id/questionnaire
 * Get questionnaire for a prior authorization
 */
export const getQuestionnaire = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const questionnaire = await QuestionnaireService.getQuestionnaire(id);

    if (!questionnaire) {
      return sendNotFound(res, 'Questionnaire');
    }

    return sendSuccess(res, questionnaire);
  } catch (error) {
    logger.error('Error fetching questionnaire', {
      error: getErrorMessage(error),
      priorAuthId: req.params.id,
    });
    return sendServerError(res, 'Failed to fetch questionnaire');
  }
};

/**
 * POST /api/v1/prior-authorizations/:id/questionnaire
 * Create or update questionnaire for a prior authorization
 */
export const saveQuestionnaire = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { formData } = req.body;

    if (!formData || typeof formData !== 'object') {
      return sendBadRequest(res, 'Form data is required');
    }

    const questionnaire = await QuestionnaireService.saveQuestionnaire({
      priorAuthorizationId: id,
      formData,
      userId: req.user!.userId,
    });

    return sendSuccess(res, questionnaire, 'Questionnaire saved successfully');
  } catch (error) {
    logger.error('Error saving questionnaire', {
      error: getErrorMessage(error),
      priorAuthId: req.params.id,
    });

    // Handle specific errors
    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes('not found')) {
      return sendNotFound(res, 'Prior Authorization');
    }

    return sendServerError(res, 'Failed to save questionnaire');
  }
};

/**
 * DELETE /api/v1/prior-authorizations/:id/questionnaire
 * Delete questionnaire for a prior authorization (for draft PA deletion)
 */
export const deleteQuestionnaire = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await QuestionnaireService.deleteQuestionnaire(id);

    if (!deleted) {
      return sendNotFound(res, 'Questionnaire');
    }

    return sendSuccess(res, null, 'Questionnaire deleted successfully');
  } catch (error) {
    logger.error('Error deleting questionnaire', {
      error: getErrorMessage(error),
      priorAuthId: req.params.id,
    });
    return sendServerError(res, 'Failed to delete questionnaire');
  }
};

/**
 * POST /api/v1/prior-authorizations/:id/copy-questionnaire
 * Copy questionnaire from previous PA to new PA (for reauthorization)
 */
export const copyQuestionnaire = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // target PA ID
    const { sourcePriorAuthId } = req.body;

    if (!sourcePriorAuthId) {
      return sendBadRequest(res, 'Source prior authorization ID is required');
    }

    const questionnaire = await QuestionnaireService.copyQuestionnaireForReauth(
      sourcePriorAuthId,
      id,
      req.user!.userId
    );

    if (!questionnaire) {
      return sendNotFound(res, 'Source questionnaire');
    }

    return sendCreated(res, questionnaire, 'Questionnaire copied successfully');
  } catch (error) {
    logger.error('Error copying questionnaire', {
      error: getErrorMessage(error),
      targetPriorAuthId: req.params.id,
    });
    return sendServerError(res, 'Failed to copy questionnaire');
  }
};

/**
 * POST /api/v1/prior-authorizations/:id/generate-with-lisa
 * Generate questionnaire content using Lisa AI from patient chart data
 */
export const generateWithLisa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Generate questionnaire content with AI
    const aiResult = await PriorAuthAIService.generateAndSaveQuestionnaire(id, req.user!.userId);

    // Save the generated form data to the questionnaire
    const questionnaire = await QuestionnaireService.saveQuestionnaire({
      priorAuthorizationId: id,
      formData: aiResult.formData,
      userId: req.user!.userId,
    });

    return sendSuccess(
      res,
      {
        questionnaire,
        aiMetadata: {
          dataSourcesSummary: aiResult.dataSourcesSummary,
          confidenceScores: aiResult.confidenceScores,
        },
      },
      'Questionnaire generated successfully with Lisa AI'
    );
  } catch (error) {
    logger.error('Error generating questionnaire with Lisa AI', {
      error: getErrorMessage(error),
      priorAuthId: req.params.id,
    });

    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes('not found')) {
      return sendNotFound(res, 'Prior Authorization');
    }
    if (errorMsg.includes('ANTHROPIC_API_KEY')) {
      return sendServerError(res, 'AI service is not configured');
    }

    return sendServerError(res, 'Failed to generate questionnaire with AI');
  }
};

/**
 * GET /api/v1/prior-authorizations/:id/pdf
 * Generate and download PDF of the PA questionnaire
 */
export const downloadPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Generate PDF
    const pdfBuffer = await PriorAuthPdfService.generatePAPdf(id);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pa-questionnaire-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating PA questionnaire PDF', {
      error: getErrorMessage(error),
      priorAuthId: req.params.id,
    });

    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes('not found')) {
      return sendNotFound(res, 'Questionnaire');
    }

    return sendServerError(res, 'Failed to generate PDF');
  }
};
