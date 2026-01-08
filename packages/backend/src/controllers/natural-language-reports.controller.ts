import { Request, Response } from 'express';
import {
  processNaturalLanguageQuery,
  getExampleQueries,
  suggestReportType,
} from '../services/natural-language-reports.service';
import logger from '../utils/logger';

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
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string',
      });
    }

    // Validate query length
    if (query.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Query is too short. Please provide more details.',
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Query is too long. Please keep it under 500 characters.',
      });
    }

    // Process the query
    const result = await processNaturalLanguageQuery(query);

    // Log the query for analytics
    logger.info('Natural language report query processed', {
      userId: (req as any).user?.id,
      query,
      reportType: result.interpretation.reportType,
      success: result.success,
      confidence: result.interpretation.confidence,
    });

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error: any) {
    logger.error('Error in natural language query controller:', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your query. Please try again.',
    });
  }
}

/**
 * Get example queries for each report type
 * GET /api/v1/reports/natural-language/examples
 */
export async function getQueryExamples(req: Request, res: Response) {
  try {
    const examples = getExampleQueries();
    return res.status(200).json({
      success: true,
      data: examples,
    });
  } catch (error: any) {
    logger.error('Error getting query examples:', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to get example queries',
    });
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
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const suggestions = suggestReportType(q);

    return res.status(200).json({
      success: true,
      data: {
        query: q,
        suggestedReportTypes: suggestions,
      },
    });
  } catch (error: any) {
    logger.error('Error getting suggestions:', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
}

export default {
  handleNaturalLanguageQuery,
  getQueryExamples,
  getSuggestions,
};
