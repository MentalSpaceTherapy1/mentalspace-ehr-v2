import { Request, Response } from 'express';
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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'clientId and appointmentTypeId are required'
      });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, status: true }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        details: `No client found with ID: ${clientId}`
      });
    }

    if (client.status !== 'ACTIVE') {
      return res.status(400).json({
        error: 'Client is not active',
        details: `Client status: ${client.status}`
      });
    }

    // Verify appointment type exists
    const appointmentType = await prisma.appointmentType.findUnique({
      where: { id: appointmentTypeId },
      select: { id: true, typeName: true, isActive: true }
    });

    if (!appointmentType) {
      return res.status(404).json({
        error: 'Appointment type not found',
        details: `No appointment type found with ID: ${appointmentTypeId}`
      });
    }

    if (!appointmentType.isActive) {
      return res.status(400).json({
        error: 'Appointment type is not active',
        details: `Appointment type: ${appointmentType.typeName}`
      });
    }

    // If provider specified, verify they exist
    if (providerId) {
      const provider = await prisma.user.findUnique({
        where: { id: providerId },
        select: { id: true, isActive: true, availableForScheduling: true }
      });

      if (!provider) {
        return res.status(404).json({
          error: 'Provider not found',
          details: `No provider found with ID: ${providerId}`
        });
      }

      if (!provider.isActive || !provider.availableForScheduling) {
        return res.status(400).json({
          error: 'Provider is not available',
          details: 'Provider is not active or not available for scheduling'
        });
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
      return res.status(200).json({
        message: 'No available slots found',
        suggestions: [],
        searchCriteria: {
          clientId,
          providerId,
          appointmentTypeId,
          requestedDate,
          requestedTime,
          flexibility: flexibility || 7
        }
      });
    }

    res.status(200).json({
      message: 'Suggestions generated successfully',
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
    });
  } catch (error: any) {
    console.error('Error generating scheduling suggestions:', error);
    res.status(500).json({
      error: 'Failed to generate scheduling suggestions',
      details: error.message
    });
  }
}

/**
 * Accept a scheduling suggestion and create appointment
 * POST /api/v1/ai-scheduling/suggest/:suggestionId/accept
 */
export async function acceptSchedulingSuggestion(req: Request, res: Response) {
  try {
    const { suggestionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User authentication required'
      });
    }

    if (!suggestionId) {
      return res.status(400).json({
        error: 'Missing suggestion ID',
        details: 'suggestionId parameter is required'
      });
    }

    // Verify suggestion exists
    const suggestion = await prisma.schedulingSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        suggestedProvider: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!suggestion) {
      return res.status(404).json({
        error: 'Suggestion not found',
        details: `No suggestion found with ID: ${suggestionId}`
      });
    }

    if (suggestion.wasAccepted) {
      return res.status(400).json({
        error: 'Suggestion already accepted',
        details: `This suggestion was accepted on ${suggestion.acceptedAt}`,
        appointmentId: suggestion.createdAppointmentId
      });
    }

    // Accept suggestion and create appointment
    const appointment = await acceptSuggestion(suggestionId, userId);

    res.status(201).json({
      message: 'Appointment created successfully',
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
    });
  } catch (error: any) {
    console.error('Error accepting scheduling suggestion:', error);
    res.status(500).json({
      error: 'Failed to accept scheduling suggestion',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'providerId and clientId are required'
      });
    }

    // Verify provider and client exist
    const [provider, client] = await Promise.all([
      prisma.user.findUnique({
        where: { id: providerId },
        select: { id: true, firstName: true, lastName: true }
      }),
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, firstName: true, lastName: true }
      })
    ]);

    if (!provider) {
      return res.status(404).json({
        error: 'Provider not found',
        details: `No provider found with ID: ${providerId}`
      });
    }

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        details: `No client found with ID: ${clientId}`
      });
    }

    // Calculate compatibility score
    const result = await calculateCompatibilityScore(providerId, clientId);

    res.status(200).json({
      message: 'Compatibility score calculated successfully',
      provider: {
        id: provider.id,
        name: `${provider.firstName} ${provider.lastName}`
      },
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      },
      compatibility: result
    });
  } catch (error: any) {
    console.error('Error calculating compatibility score:', error);
    res.status(500).json({
      error: 'Failed to calculate compatibility score',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'clientId is required'
      });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, status: true }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        details: `No client found with ID: ${clientId}`
      });
    }

    // Get top compatible providers
    const limitNum = limit ? parseInt(limit as string) : 5;
    const providers = await getTopCompatibleProviders(clientId, limitNum);

    res.status(200).json({
      message: 'Compatible providers retrieved successfully',
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
    });
  } catch (error: any) {
    console.error('Error getting compatible providers:', error);
    res.status(500).json({
      error: 'Failed to get compatible providers',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'clientId is required'
      });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        details: `No client found with ID: ${clientId}`
      });
    }

    const limitNum = limit ? parseInt(limit as string) : 20;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    // Get suggestions history
    const suggestions = await prisma.schedulingSuggestion.findMany({
      where: { clientId },
      include: {
        suggestedProvider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true
          }
        },
        appointmentType: {
          select: {
            id: true,
            typeName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum
    });

    const total = await prisma.schedulingSuggestion.count({
      where: { clientId }
    });

    res.status(200).json({
      message: 'Suggestions history retrieved successfully',
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      },
      total,
      count: suggestions.length,
      limit: limitNum,
      offset: offsetNum,
      suggestions
    });
  } catch (error: any) {
    console.error('Error getting suggestions history:', error);
    res.status(500).json({
      error: 'Failed to get suggestions history',
      details: error.message
    });
  }
}

/**
 * Get AI scheduling statistics
 * GET /api/v1/ai-scheduling/stats
 */
export async function getSchedulingStats(req: Request, res: Response) {
  try {
    const [
      totalSuggestions,
      acceptedSuggestions,
      averageScore,
      topProviders
    ] = await Promise.all([
      // Total suggestions generated
      prisma.schedulingSuggestion.count(),

      // Accepted suggestions
      prisma.schedulingSuggestion.count({
        where: { wasAccepted: true }
      }),

      // Average overall score
      prisma.schedulingSuggestion.aggregate({
        _avg: { overallScore: true }
      }),

      // Top suggested providers
      prisma.schedulingSuggestion.groupBy({
        by: ['suggestedProviderId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })
    ]);

    // Get provider details for top providers
    const providerDetails = await Promise.all(
      topProviders.map(async (tp) => {
        const provider = await prisma.user.findUnique({
          where: { id: tp.suggestedProviderId },
          select: { id: true, firstName: true, lastName: true, title: true }
        });
        return {
          provider,
          suggestionCount: tp._count.id
        };
      })
    );

    const acceptanceRate = totalSuggestions > 0
      ? (acceptedSuggestions / totalSuggestions) * 100
      : 0;

    res.status(200).json({
      message: 'Scheduling statistics retrieved successfully',
      stats: {
        totalSuggestions,
        acceptedSuggestions,
        acceptanceRate: acceptanceRate.toFixed(2) + '%',
        averageScore: averageScore._avg.overallScore?.toFixed(2) || 0,
        topSuggestedProviders: providerDetails
      }
    });
  } catch (error: any) {
    console.error('Error getting scheduling stats:', error);
    res.status(500).json({
      error: 'Failed to get scheduling statistics',
      details: error.message
    });
  }
}

/**
 * Parse natural language scheduling request (parse only, don't execute)
 * POST /api/v1/ai-scheduling/nlp/parse
 */
export async function parseNaturalLanguageRequest(req: Request, res: Response) {
  try {
    const { requestText } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User authentication required'
      });
    }

    if (!requestText || typeof requestText !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid request text',
        details: 'requestText field is required and must be a string'
      });
    }

    if (requestText.length > 500) {
      return res.status(400).json({
        error: 'Request text too long',
        details: 'Request text must be 500 characters or less'
      });
    }

    // Parse the request
    const parseResult = await parseSchedulingRequest(requestText, userId);

    res.status(200).json({
      message: parseResult.success ? 'Request parsed successfully' : 'Could not fully parse request',
      ...parseResult
    });
  } catch (error: any) {
    console.error('Error parsing natural language request:', error);
    res.status(500).json({
      error: 'Failed to parse natural language request',
      details: error.message
    });
  }
}

/**
 * Parse and execute natural language scheduling request
 * POST /api/v1/ai-scheduling/nlp/execute
 */
export async function executeNaturalLanguageRequest(req: Request, res: Response) {
  try {
    const { requestText } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User authentication required'
      });
    }

    if (!requestText || typeof requestText !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid request text',
        details: 'requestText field is required and must be a string'
      });
    }

    if (requestText.length > 500) {
      return res.status(400).json({
        error: 'Request text too long',
        details: 'Request text must be 500 characters or less'
      });
    }

    // Parse the request
    const parseResult = await parseSchedulingRequest(requestText, userId);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Could not parse request',
        details: parseResult.clarificationNeeded || 'Unable to understand the scheduling request',
        parseResult
      });
    }

    // Execute the parsed request
    const executionResult = await executeSchedulingRequest(parseResult, userId);

    res.status(200).json({
      message: 'Request executed successfully',
      parseResult: {
        intent: parseResult.intent,
        entities: parseResult.entities,
        confidence: parseResult.confidence,
        reasoning: parseResult.reasoning
      },
      result: executionResult
    });
  } catch (error: any) {
    console.error('Error executing natural language request:', error);
    res.status(500).json({
      error: 'Failed to execute natural language request',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'providerId is required'
      });
    }

    // Verify provider exists
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!provider) {
      return res.status(404).json({
        error: 'Provider not found',
        details: `No provider found with ID: ${providerId}`
      });
    }

    const metrics = await calculateProviderLoadMetrics(providerId);

    res.status(200).json({
      message: 'Provider load metrics retrieved successfully',
      metrics
    });
  } catch (error: any) {
    console.error('Error getting provider load metrics:', error);
    res.status(500).json({
      error: 'Failed to get provider load metrics',
      details: error.message
    });
  }
}

/**
 * Get team-wide load distribution analysis
 * GET /api/v1/ai-scheduling/load-balancing/team
 */
export async function getTeamLoadDistribution(req: Request, res: Response) {
  try {
    const distribution = await analyzeTeamLoadDistribution();

    res.status(200).json({
      message: 'Team load distribution analyzed successfully',
      distribution
    });
  } catch (error: any) {
    console.error('Error analyzing team load distribution:', error);
    res.status(500).json({
      error: 'Failed to analyze team load distribution',
      details: error.message
    });
  }
}

/**
 * Get load balancing recommendations
 * GET /api/v1/ai-scheduling/load-balancing/recommendations
 */
export async function getLoadRecommendations(req: Request, res: Response) {
  try {
    const recommendations = await getLoadBalancingRecommendations();

    res.status(200).json({
      message: 'Load balancing recommendations retrieved successfully',
      count: recommendations.length,
      recommendations
    });
  } catch (error: any) {
    console.error('Error getting load balancing recommendations:', error);
    res.status(500).json({
      error: 'Failed to get load balancing recommendations',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Invalid limit parameter',
        details: 'Limit must be between 1 and 50'
      });
    }

    const providers = await getProvidersByCapacity(limitNum);

    res.status(200).json({
      message: 'Providers with available capacity retrieved successfully',
      count: providers.length,
      providers
    });
  } catch (error: any) {
    console.error('Error getting provider capacity:', error);
    res.status(500).json({
      error: 'Failed to get provider capacity',
      details: error.message
    });
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

    res.status(200).json({
      message: 'Pattern detection completed successfully',
      count: patterns.length,
      patterns
    });
  } catch (error: any) {
    console.error('Error running pattern detection:', error);
    res.status(500).json({
      error: 'Failed to run pattern detection',
      details: error.message
    });
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

    res.status(200).json({
      message: 'Active patterns retrieved successfully',
      count: patterns.length,
      patterns
    });
  } catch (error: any) {
    console.error('Error getting patterns:', error);
    res.status(500).json({
      error: 'Failed to get patterns',
      details: error.message
    });
  }
}

/**
 * Get pattern statistics
 * GET /api/v1/ai-scheduling/patterns/stats
 */
export async function getPatternsStats(req: Request, res: Response) {
  try {
    const stats = await getPatternStatistics();

    res.status(200).json({
      message: 'Pattern statistics retrieved successfully',
      stats
    });
  } catch (error: any) {
    console.error('Error getting pattern statistics:', error);
    res.status(500).json({
      error: 'Failed to get pattern statistics',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'patternId is required'
      });
    }

    // Verify pattern exists
    const pattern = await prisma.schedulingPattern.findUnique({
      where: { id: patternId }
    });

    if (!pattern) {
      return res.status(404).json({
        error: 'Pattern not found',
        details: `No pattern found with ID: ${patternId}`
      });
    }

    await resolvePattern(patternId, resolutionNotes);

    res.status(200).json({
      message: 'Pattern marked as resolved successfully'
    });
  } catch (error: any) {
    console.error('Error resolving pattern:', error);
    res.status(500).json({
      error: 'Failed to resolve pattern',
      details: error.message
    });
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
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'patternId is required'
      });
    }

    // Verify pattern exists
    const pattern = await prisma.schedulingPattern.findUnique({
      where: { id: patternId }
    });

    if (!pattern) {
      return res.status(404).json({
        error: 'Pattern not found',
        details: `No pattern found with ID: ${patternId}`
      });
    }

    await ignorePattern(patternId, ignoreReason);

    res.status(200).json({
      message: 'Pattern marked as ignored successfully'
    });
  } catch (error: any) {
    console.error('Error ignoring pattern:', error);
    res.status(500).json({
      error: 'Failed to ignore pattern',
      details: error.message
    });
  }
}
