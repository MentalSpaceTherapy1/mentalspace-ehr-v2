import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import {
  generateSchedulingSuggestions,
  acceptSuggestion
} from '../services/schedulingSuggestions.service';
import {
  calculateCompatibilityScore,
  getTopCompatibleProviders
} from '../services/compatibilityScoring.service';
import {
  parseSchedulingRequest,
  executeSchedulingRequest
} from '../services/nlpScheduling.service';
import {
  calculateProviderLoadMetrics,
  analyzeTeamLoadDistribution,
  getLoadBalancingRecommendations,
  getProvidersByCapacity
} from '../services/loadBalancing.service';
import {
  detectAllPatterns,
  getActivePatterns,
  resolvePattern,
  ignorePattern,
  getPatternStatistics
} from '../services/patternRecognition.service';
// Phase 3.2: Removed direct PrismaClient import - using service methods instead
import * as aiSchedulingService from '../services/aiScheduling.service';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * Generate scheduling suggestions for a client
 * POST /api/v1/ai-scheduling/suggest
 */
export async function generateSuggestions(req: Request, res: Response) {
  try {
    const {
      clientId,
      providerId,
      appointmentTypeId,
      requestedDate,
      requestedTime,
      flexibility,
      duration
    } = req.body;

    // Validation
    if (!clientId || !appointmentTypeId) {
      return sendBadRequest(res, 'Missing required fields: clientId and appointmentTypeId are required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify client exists
    const client = await aiSchedulingService.findClientForScheduling(clientId);

    if (!client) {
      return sendNotFound(res, 'Client');
    }

    if (client.status !== 'ACTIVE') {
      return sendBadRequest(res, `Client is not active. Status: ${client.status}`);
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify appointment type exists
    const appointmentType = await aiSchedulingService.findAppointmentType(appointmentTypeId);

    if (!appointmentType) {
      return sendNotFound(res, 'Appointment type');
    }

    if (!appointmentType.isActive) {
      return sendBadRequest(res, `Appointment type is not active: ${appointmentType.typeName}`);
    }

    // If provider specified, verify they exist
    if (providerId) {
      // Phase 3.2: Use service method instead of direct prisma call
      const provider = await aiSchedulingService.findProviderForScheduling(providerId);

      if (!provider) {
        return sendNotFound(res, 'Provider');
      }

      if (!provider.isActive || !provider.availableForScheduling) {
        return sendBadRequest(res, 'Provider is not active or not available for scheduling');
      }
    }

    // Generate suggestions
    const suggestions = await generateSchedulingSuggestions({
      clientId,
      providerId,
      appointmentTypeId,
      requestedDate: requestedDate ? new Date(requestedDate) : undefined,
      requestedTime,
      flexibility: flexibility || 7,
      duration
    });

    if (suggestions.length === 0) {
      return sendSuccess(res, {
        suggestions: [],
        searchCriteria: {
          clientId,
          providerId,
          appointmentTypeId,
          requestedDate,
          requestedTime,
          flexibility: flexibility || 7
        }
      }, 'No available slots found');
    }

    return sendSuccess(res, {
      count: suggestions.length,
      suggestions,
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      },
      appointmentType: {
        id: appointmentType.id,
        name: appointmentType.typeName
      }
    }, 'Suggestions generated successfully');
  } catch (error) {
    logControllerError('Error generating scheduling suggestions', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to generate scheduling suggestions');
  }
}

/**
 * Accept a scheduling suggestion and create appointment
 * POST /api/v1/ai-scheduling/suggest/:suggestionId/accept
 */
export async function acceptSchedulingSuggestion(req: Request, res: Response) {
  try {
    const { suggestionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User authentication required');
    }

    if (!suggestionId) {
      return sendBadRequest(res, 'Missing suggestion ID: suggestionId parameter is required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify suggestion exists
    const suggestion = await aiSchedulingService.findSuggestionWithDetails(suggestionId);

    if (!suggestion) {
      return sendNotFound(res, 'Suggestion');
    }

    if (suggestion.wasAccepted) {
      return sendBadRequest(res, `Suggestion already accepted on ${suggestion.acceptedAt}. Appointment ID: ${suggestion.createdAppointmentId}`);
    }

    // Accept suggestion and create appointment
    const appointment = await acceptSuggestion(suggestionId, userId);

    return sendCreated(res, {
      appointment: {
        id: appointment.id,
        clientId: appointment.clientId,
        clinicianId: appointment.clinicianId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        duration: appointment.duration,
        status: appointment.status
      },
      suggestion: {
        id: suggestion.id,
        reasoning: suggestion.reasoning,
        overallScore: suggestion.overallScore,
        confidenceLevel: suggestion.confidenceLevel
      }
    }, 'Appointment created successfully');
  } catch (error) {
    logControllerError('Error accepting scheduling suggestion', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to accept scheduling suggestion');
  }
}

/**
 * Get compatibility score between provider and client
 * GET /api/v1/ai-scheduling/compatibility/:providerId/:clientId
 */
export async function getCompatibilityScore(req: Request, res: Response) {
  try {
    const { providerId, clientId } = req.params;

    if (!providerId || !clientId) {
      return sendBadRequest(res, 'Missing required parameters: providerId and clientId are required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify provider and client exist
    const [provider, client] = await aiSchedulingService.findProviderAndClient(providerId, clientId);

    if (!provider) {
      return sendNotFound(res, 'Provider');
    }

    if (!client) {
      return sendNotFound(res, 'Client');
    }

    // Calculate compatibility score
    const result = await calculateCompatibilityScore(providerId, clientId);

    return sendSuccess(res, {
      provider: {
        id: provider.id,
        name: `${provider.firstName} ${provider.lastName}`
      },
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      },
      compatibility: result
    }, 'Compatibility score calculated successfully');
  } catch (error) {
    logControllerError('Error calculating compatibility score', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to calculate compatibility score');
  }
}

/**
 * Get top compatible providers for a client
 * GET /api/v1/ai-scheduling/compatible-providers/:clientId
 */
export async function getCompatibleProviders(req: Request, res: Response) {
  try {
    const { clientId } = req.params;
    const { limit } = req.query;

    if (!clientId) {
      return sendBadRequest(res, 'Missing required parameter: clientId is required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify client exists
    const client = await aiSchedulingService.findClientForScheduling(clientId);

    if (!client) {
      return sendNotFound(res, 'Client');
    }

    // Get top compatible providers
    const limitNum = limit ? parseInt(limit as string) : 5;
    const providers = await getTopCompatibleProviders(clientId, limitNum);

    return sendSuccess(res, {
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      },
      count: providers.length,
      providers: providers.map(p => ({
        provider: {
          id: p.provider.id,
          name: `${p.provider.firstName} ${p.provider.lastName}`,
          title: p.provider.title,
          specialties: p.provider.specialties,
          yearsOfExperience: p.provider.yearsOfExperience
        },
        overallScore: p.overallScore,
        factors: p.factors,
        details: p.details
      }))
    }, 'Compatible providers retrieved successfully');
  } catch (error) {
    logControllerError('Error getting compatible providers', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get compatible providers');
  }
}

/**
 * Get scheduling suggestions history for a client
 * GET /api/v1/ai-scheduling/suggestions/:clientId
 */
export async function getSuggestionsHistory(req: Request, res: Response) {
  try {
    const { clientId } = req.params;
    const { limit, offset } = req.query;

    if (!clientId) {
      return sendBadRequest(res, 'Missing required parameter: clientId is required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify client exists
    const client = await aiSchedulingService.findClientForScheduling(clientId);

    if (!client) {
      return sendNotFound(res, 'Client');
    }

    const limitNum = limit ? parseInt(limit as string) : 20;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Get suggestions history
    const suggestions = await aiSchedulingService.getSuggestionsHistory(clientId, limitNum, offsetNum);

    const total = await aiSchedulingService.countClientSuggestions(clientId);

    return sendSuccess(res, {
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      },
      total,
      count: suggestions.length,
      limit: limitNum,
      offset: offsetNum,
      suggestions
    }, 'Suggestions history retrieved successfully');
  } catch (error) {
    logControllerError('Error getting suggestions history', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get suggestions history');
  }
}

/**
 * Get AI scheduling statistics
 * GET /api/v1/ai-scheduling/stats
 */
export async function getSchedulingStats(req: Request, res: Response) {
  try {
    // Phase 3.2: Use service method instead of direct prisma call
    // Check if the scheduling_suggestions table exists
    const tableExists = await aiSchedulingService.checkSchedulingSuggestionsTableExists();

    // If table doesn't exist, return empty stats
    if (!tableExists) {
      return sendSuccess(res, {
        stats: {
          totalSuggestions: 0,
          acceptedSuggestions: 0,
          acceptanceRate: '0%',
          averageScore: '0',
          topSuggestedProviders: []
        },
        featureStatus: 'NOT_ENABLED'
      }, 'AI Scheduling feature not yet enabled');
    }

    // Wrap Prisma model calls in try-catch in case table/model doesn't exist
    let stats;

    try {
      // Phase 3.2: Use service method instead of direct prisma calls
      stats = await aiSchedulingService.getSchedulingStatistics();
    } catch (error) {
      // If Prisma model calls fail, return empty stats
      logControllerError('Error querying scheduling suggestions', error);
      return sendSuccess(res, {
        stats: {
          totalSuggestions: 0,
          acceptedSuggestions: 0,
          acceptanceRate: '0%',
          averageScore: '0',
          topSuggestedProviders: []
        },
        featureStatus: 'NOT_ENABLED',
        error: getErrorMessage(error)
      }, 'AI Scheduling feature not yet enabled');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    // Get provider details for top providers
    const providerIds = stats.topProviders.map(tp => tp.suggestedProviderId);
    const providers = await aiSchedulingService.getProviderDetailsForStats(providerIds);
    const providerDetails = stats.topProviders.map((tp, idx) => ({
      provider: providers[idx],
      suggestionCount: tp._count.id,
    }));

    const acceptanceRate = stats.totalSuggestions > 0
      ? (stats.acceptedSuggestions / stats.totalSuggestions) * 100
      : 0;

    return sendSuccess(res, {
      stats: {
        totalSuggestions: stats.totalSuggestions,
        acceptedSuggestions: stats.acceptedSuggestions,
        acceptanceRate: acceptanceRate.toFixed(2) + '%',
        averageScore: stats.averageScore._avg.overallScore?.toFixed(2) || 0,
        topSuggestedProviders: providerDetails
      }
    }, 'Scheduling statistics retrieved successfully');
  } catch (error) {
    logControllerError('Error getting scheduling stats', error);

    // Return graceful fallback for any database errors
    return sendSuccess(res, {
      stats: {
        totalSuggestions: 0,
        acceptedSuggestions: 0,
        acceptanceRate: '0%',
        averageScore: '0',
        topSuggestedProviders: []
      },
      featureStatus: 'NOT_ENABLED',
      error: getErrorMessage(error)
    }, 'AI Scheduling feature not yet enabled');
  }
}

/**
 * Parse natural language scheduling request (parse only, don't execute)
 * POST /api/v1/ai-scheduling/nlp/parse
 */
export async function parseNaturalLanguageRequest(req: Request, res: Response) {
  try {
    const { requestText } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User authentication required');
    }

    if (!requestText || typeof requestText !== 'string') {
      return sendBadRequest(res, 'Missing or invalid request text: requestText field is required and must be a string');
    }

    if (requestText.length > 500) {
      return sendBadRequest(res, 'Request text too long: must be 500 characters or less');
    }

    // Parse the request
    const parseResult = await parseSchedulingRequest(requestText, userId);

    return sendSuccess(res, parseResult, parseResult.success ? 'Request parsed successfully' : 'Could not fully parse request');
  } catch (error) {
    logControllerError('Error parsing natural language request', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to parse natural language request');
  }
}

/**
 * Parse and execute natural language scheduling request
 * POST /api/v1/ai-scheduling/nlp/execute
 */
export async function executeNaturalLanguageRequest(req: Request, res: Response) {
  try {
    const { requestText } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User authentication required');
    }

    if (!requestText || typeof requestText !== 'string') {
      return sendBadRequest(res, 'Missing or invalid request text: requestText field is required and must be a string');
    }

    if (requestText.length > 500) {
      return sendBadRequest(res, 'Request text too long: must be 500 characters or less');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Check if AI scheduling features are enabled (table exists)
    const tableExists = await aiSchedulingService.checkSchedulingSuggestionsTableExists();

    // If table doesn't exist, return feature not enabled message
    if (!tableExists) {
      return sendSuccess(res, {
        parseResult: {
          intent: 'UNKNOWN',
          entities: {},
          confidence: 0,
          reasoning: ['AI Scheduling feature is currently not enabled in this environment']
        },
        result: {
          suggestions: [],
          message: 'Natural language scheduling is not yet available. Please use the manual scheduling interface.'
        },
        featureStatus: 'NOT_ENABLED'
      }, 'AI Scheduling feature not yet enabled. Please use the manual scheduling interface.');
    }

    // Parse the request
    const parseResult = await parseSchedulingRequest(requestText, userId);

    if (!parseResult.success) {
      return sendBadRequest(res, parseResult.clarificationNeeded || 'Unable to understand the scheduling request');
    }

    // Execute the parsed request
    const executionResult = await executeSchedulingRequest(parseResult, userId);

    return sendSuccess(res, {
      parseResult: {
        intent: parseResult.intent,
        entities: parseResult.entities,
        confidence: parseResult.confidence,
        reasoning: parseResult.reasoning
      },
      result: executionResult
    }, 'Request executed successfully');
  } catch (error) {
    logControllerError('Error executing natural language request', error);

    // Return graceful fallback for any errors
    return sendSuccess(res, {
      parseResult: {
        intent: 'UNKNOWN',
        entities: {},
        confidence: 0,
        reasoning: ['AI Scheduling feature encountered an error: ' + getErrorMessage(error)]
      },
      result: {
        suggestions: [],
        message: 'Natural language scheduling is not yet available. Please use the manual scheduling interface.'
      },
      featureStatus: 'NOT_ENABLED',
      error: getErrorMessage(error)
    }, 'AI Scheduling feature not yet enabled');
  }
}

/**
 * Get load metrics for a specific provider
 * GET /api/v1/ai-scheduling/load-balancing/provider/:providerId
 */
export async function getProviderLoadMetrics(req: Request, res: Response) {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return sendBadRequest(res, 'Missing required parameter: providerId is required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify provider exists
    const provider = await aiSchedulingService.findProviderWithName(providerId);

    if (!provider) {
      return sendNotFound(res, 'Provider');
    }

    const metrics = await calculateProviderLoadMetrics(providerId);

    return sendSuccess(res, { metrics }, 'Provider load metrics retrieved successfully');
  } catch (error) {
    logControllerError('Error getting provider load metrics', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get provider load metrics');
  }
}

/**
 * Get team-wide load distribution analysis
 * GET /api/v1/ai-scheduling/load-balancing/team
 */
export async function getTeamLoadDistribution(req: Request, res: Response) {
  try {
    const distribution = await analyzeTeamLoadDistribution();

    return sendSuccess(res, { distribution }, 'Team load distribution analyzed successfully');
  } catch (error) {
    logControllerError('Error analyzing team load distribution', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to analyze team load distribution');
  }
}

/**
 * Get load balancing recommendations
 * GET /api/v1/ai-scheduling/load-balancing/recommendations
 */
export async function getLoadRecommendations(req: Request, res: Response) {
  try {
    const recommendations = await getLoadBalancingRecommendations();

    return sendSuccess(res, {
      count: recommendations.length,
      recommendations
    }, 'Load balancing recommendations retrieved successfully');
  } catch (error) {
    logControllerError('Error getting load balancing recommendations', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get load balancing recommendations');
  }
}

/**
 * Get providers sorted by available capacity
 * GET /api/v1/ai-scheduling/load-balancing/capacity
 */
export async function getProviderCapacity(req: Request, res: Response) {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 10;

    if (limitNum < 1 || limitNum > 50) {
      return sendBadRequest(res, 'Invalid limit parameter: must be between 1 and 50');
    }

    const providers = await getProvidersByCapacity(limitNum);

    return sendSuccess(res, {
      count: providers.length,
      providers
    }, 'Providers with available capacity retrieved successfully');
  } catch (error) {
    logControllerError('Error getting provider capacity', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get provider capacity');
  }
}

/**
 * Run pattern detection analysis
 * POST /api/v1/ai-scheduling/patterns/detect
 */
export async function runPatternDetection(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const patterns = await detectAllPatterns(start, end);

    return sendSuccess(res, {
      count: patterns.length,
      patterns
    }, 'Pattern detection completed successfully');
  } catch (error) {
    logControllerError('Error running pattern detection', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to run pattern detection');
  }
}

/**
 * Get active patterns
 * GET /api/v1/ai-scheduling/patterns
 */
export async function getPatterns(req: Request, res: Response) {
  try {
    const { severity, category } = req.query;

    const patterns = await getActivePatterns(
      severity as any,
      category as any
    );

    return sendSuccess(res, {
      count: patterns.length,
      patterns
    }, 'Active patterns retrieved successfully');
  } catch (error) {
    logControllerError('Error getting patterns', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get patterns');
  }
}

/**
 * Get pattern statistics
 * GET /api/v1/ai-scheduling/patterns/stats
 */
export async function getPatternsStats(req: Request, res: Response) {
  try {
    const stats = await getPatternStatistics();

    return sendSuccess(res, { stats }, 'Pattern statistics retrieved successfully');
  } catch (error) {
    logControllerError('Error getting pattern statistics', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get pattern statistics');
  }
}

/**
 * Resolve a pattern
 * POST /api/v1/ai-scheduling/patterns/:patternId/resolve
 */
export async function resolvePatternController(req: Request, res: Response) {
  try {
    const { patternId } = req.params;
    const { resolutionNotes } = req.body;

    if (!patternId) {
      return sendBadRequest(res, 'Missing required parameter: patternId is required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify pattern exists
    const pattern = await aiSchedulingService.findSchedulingPattern(patternId);

    if (!pattern) {
      return sendNotFound(res, 'Pattern');
    }

    await resolvePattern(patternId, resolutionNotes);

    return sendSuccess(res, null, 'Pattern marked as resolved successfully');
  } catch (error) {
    logControllerError('Error resolving pattern', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to resolve pattern');
  }
}

/**
 * Ignore a pattern
 * POST /api/v1/ai-scheduling/patterns/:patternId/ignore
 */
export async function ignorePatternController(req: Request, res: Response) {
  try {
    const { patternId } = req.params;
    const { ignoreReason } = req.body;

    if (!patternId) {
      return sendBadRequest(res, 'Missing required parameter: patternId is required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify pattern exists
    const pattern = await aiSchedulingService.findSchedulingPattern(patternId);

    if (!pattern) {
      return sendNotFound(res, 'Pattern');
    }

    await ignorePattern(patternId, ignoreReason);

    return sendSuccess(res, null, 'Pattern marked as ignored successfully');
  } catch (error) {
    logControllerError('Error ignoring pattern', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to ignore pattern');
  }
}
