import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import {
  processNaturalLanguageQuery,
  getExampleQueries,
  suggestReportType,
} from '../services/natural-language-reports.service';
import logger from '../utils/logger';
import { sendSuccess, sendBadRequest, sendServerError } from '../utils/apiResponse';

/**
 * Natural Language Reports Controller
 * Handles AI-powered report queries in plain English
 */

/**
 * Process a natural language report query
 * POST /api/v1/reports/natural-language
 */
export async function handleNaturalLanguageQuery(req: Request, res: Response) {
  try {
    const { query } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return sendBadRequest(res, 'Query is required and must be a string');
    }

    // Validate query length
    if (query.length < 3) {
      return sendBadRequest(res, 'Query is too short. Please provide more details.');
    }

    if (query.length > 500) {
      return sendBadRequest(res, 'Query is too long. Please keep it under 500 characters.');
    }

    // Process the query
    const result = await processNaturalLanguageQuery(query);

    // Log the query for analytics
    logger.info('Natural language report query processed', {
      userId: req.user?.userId,
      query,
      reportType: result.interpretation.reportType,
      success: result.success,
      confidence: result.interpretation.confidence,
    });

    if (result.success) {
      return sendSuccess(res, result);
    } else {
      return sendBadRequest(res, result.error || 'Query processing failed');
    }

  } catch (error) {
    logger.error('Error in natural language query controller:', { error: getErrorMessage(error) });
    return sendServerError(res, 'An error occurred while processing your query. Please try again.');
  }
}

/**
 * Get example queries for each report type
 * GET /api/v1/reports/natural-language/examples
 */
export async function getQueryExamples(req: Request, res: Response) {
  try {
    const examples = getExampleQueries();
    return sendSuccess(res, examples);
  } catch (error) {
    logger.error('Error getting query examples:', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to get example queries');
  }
}

/**
 * Get report type suggestions based on partial query
 * GET /api/v1/reports/natural-language/suggest?q=revenue
 */
export async function getSuggestions(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return sendBadRequest(res, 'Query parameter "q" is required');
    }

    const suggestions = suggestReportType(q);

    return sendSuccess(res, {
      query: q,
      suggestedReportTypes: suggestions,
    });
  } catch (error) {
    logger.error('Error getting suggestions:', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to get suggestions');
  }
}

export default {
  handleNaturalLanguageQuery,
  getQueryExamples,
  getSuggestions,
};
