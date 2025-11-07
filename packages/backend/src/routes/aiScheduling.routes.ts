import express from 'express';
import {
  generateSuggestions,
  acceptSchedulingSuggestion,
  getCompatibilityScore,
  getCompatibleProviders,
  getSuggestionsHistory,
  getSchedulingStats,
  parseNaturalLanguageRequest,
  executeNaturalLanguageRequest,
  getProviderLoadMetrics,
  getTeamLoadDistribution,
  getLoadRecommendations,
  getProviderCapacity,
  runPatternDetection,
  getPatterns,
  getPatternsStats,
  resolvePatternController,
  ignorePatternController
} from '../controllers/aiScheduling.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * AI Scheduling Routes
 * Base path: /api/v1/ai-scheduling
 */

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/ai-scheduling/suggest
 * Generate scheduling suggestions for a client
 *
 * Request body:
 * {
 *   clientId: string (required)
 *   appointmentTypeId: string (required)
 *   providerId?: string (optional - if specified, only suggest slots with this provider)
 *   requestedDate?: string (optional - ISO date, defaults to today)
 *   requestedTime?: string (optional - HH:mm format)
 *   flexibility?: number (optional - days of flexibility, defaults to 7)
 *   duration?: number (optional - minutes, defaults to appointment type default)
 * }
 *
 * Response:
 * {
 *   message: string
 *   count: number
 *   suggestions: SchedulingSuggestion[]
 *   client: { id, name }
 *   appointmentType: { id, name }
 * }
 */
router.post('/suggest', generateSuggestions);

/**
 * POST /api/v1/ai-scheduling/suggest/:suggestionId/accept
 * Accept a scheduling suggestion and create an appointment
 *
 * Response:
 * {
 *   message: string
 *   appointment: Appointment
 *   suggestion: { id, reasoning, overallScore, confidenceLevel }
 * }
 */
router.post('/suggest/:suggestionId/accept', acceptSchedulingSuggestion);

/**
 * GET /api/v1/ai-scheduling/compatibility/:providerId/:clientId
 * Get compatibility score between a provider and client
 *
 * Response:
 * {
 *   message: string
 *   provider: { id, name }
 *   client: { id, name }
 *   compatibility: {
 *     overallScore: number
 *     factors: { specialtyMatch, availabilityMatch, experienceMatch, ... }
 *     details: { specialty, availability, experience, ... }
 *   }
 * }
 */
router.get('/compatibility/:providerId/:clientId', getCompatibilityScore);

/**
 * GET /api/v1/ai-scheduling/compatible-providers/:clientId
 * Get top compatible providers for a client
 *
 * Query params:
 * - limit: number (optional, default 5, max 20)
 *
 * Response:
 * {
 *   message: string
 *   client: { id, name }
 *   count: number
 *   providers: Array<{
 *     provider: { id, name, title, specialties, yearsOfExperience }
 *     overallScore: number
 *     factors: { specialtyMatch, availabilityMatch, ... }
 *     details: { specialty, availability, experience, ... }
 *   }>
 * }
 */
router.get('/compatible-providers/:clientId', getCompatibleProviders);

/**
 * GET /api/v1/ai-scheduling/suggestions/:clientId
 * Get scheduling suggestions history for a client
 *
 * Query params:
 * - limit: number (optional, default 20)
 * - offset: number (optional, default 0)
 *
 * Response:
 * {
 *   message: string
 *   client: { id, name }
 *   total: number
 *   count: number
 *   limit: number
 *   offset: number
 *   suggestions: SchedulingSuggestion[]
 * }
 */
router.get('/suggestions/:clientId', getSuggestionsHistory);

/**
 * GET /api/v1/ai-scheduling/stats
 * Get AI scheduling statistics
 *
 * Response:
 * {
 *   message: string
 *   stats: {
 *     totalSuggestions: number
 *     acceptedSuggestions: number
 *     acceptanceRate: string
 *     averageScore: string
 *     topSuggestedProviders: Array<{ provider, suggestionCount }>
 *   }
 * }
 */
router.get('/stats', getSchedulingStats);

/**
 * POST /api/v1/ai-scheduling/nlp/parse
 * Parse natural language scheduling request (parse only, don't execute)
 *
 * Request body:
 * {
 *   requestText: string (required, max 500 chars)
 * }
 *
 * Response:
 * {
 *   message: string
 *   success: boolean
 *   confidence: number (0.0 to 1.0)
 *   intent?: string (SCHEDULE, RESCHEDULE, CANCEL, FIND_SLOT, CHECK_AVAILABILITY)
 *   entities: {
 *     providerName?: string
 *     providerId?: string
 *     clientName?: string
 *     clientId?: string
 *     date?: Date
 *     dateText?: string
 *     time?: string (HH:mm)
 *     timeOfDay?: string (MORNING, AFTERNOON, EVENING)
 *     duration?: number (minutes)
 *     appointmentType?: string
 *     flexibility?: number (days)
 *   }
 *   clarificationNeeded?: string
 *   reasoning: string[]
 * }
 *
 * Examples:
 * - "Schedule an appointment with Dr. Smith tomorrow at 2pm"
 * - "Find me an available slot next Tuesday afternoon"
 * - "Book a follow-up session with Dr. Johnson for next week"
 * - "When is Dr. Smith available on Friday?"
 */
router.post('/nlp/parse', parseNaturalLanguageRequest);

/**
 * POST /api/v1/ai-scheduling/nlp/execute
 * Parse and execute natural language scheduling request
 *
 * Request body:
 * {
 *   requestText: string (required, max 500 chars)
 * }
 *
 * Response:
 * {
 *   message: string
 *   parseResult: {
 *     intent: string
 *     entities: { ... }
 *     confidence: number
 *     reasoning: string[]
 *   }
 *   result: (depends on intent - suggestions for SCHEDULE/FIND_SLOT, availability for CHECK_AVAILABILITY, etc.)
 * }
 *
 * Examples:
 * - "Schedule an appointment with Dr. Smith tomorrow at 2pm" → Returns scheduling suggestions
 * - "Find me an available slot next Tuesday afternoon" → Returns available time slots
 * - "Check Dr. Smith's availability on Friday" → Returns availability status
 */
router.post('/nlp/execute', executeNaturalLanguageRequest);

/**
 * GET /api/v1/ai-scheduling/load-balancing/provider/:providerId
 * Get load metrics for a specific provider
 *
 * Response:
 * {
 *   message: string
 *   metrics: {
 *     providerId: string
 *     providerName: string
 *     currentWeek: {
 *       totalAppointments: number
 *       totalMinutes: number
 *       utilizationRate: number
 *       averageAppointmentsPerDay: number
 *     }
 *     nextWeek: { ... }
 *     overall: {
 *       loadScore: number (0-100)
 *       status: 'UNDERUTILIZED' | 'BALANCED' | 'OVERLOADED' | 'CRITICAL'
 *       availableCapacity: number (percentage)
 *     }
 *     recommendations: string[]
 *   }
 * }
 */
router.get('/load-balancing/provider/:providerId', getProviderLoadMetrics);

/**
 * GET /api/v1/ai-scheduling/load-balancing/team
 * Get team-wide load distribution analysis
 *
 * Response:
 * {
 *   message: string
 *   distribution: {
 *     teamMetrics: {
 *       averageLoad: number
 *       standardDeviation: number
 *       balanceScore: number (0-100, higher = better balanced)
 *       totalProviders: number
 *       activeProviders: number
 *     }
 *     providers: ProviderLoadMetrics[]
 *     recommendations: string[]
 *     imbalances: {
 *       overloaded: string[] (provider IDs)
 *       underutilized: string[] (provider IDs)
 *     }
 *   }
 * }
 */
router.get('/load-balancing/team', getTeamLoadDistribution);

/**
 * GET /api/v1/ai-scheduling/load-balancing/recommendations
 * Get load balancing recommendations
 *
 * Response:
 * {
 *   message: string
 *   count: number
 *   recommendations: Array<{
 *     type: 'REDISTRIBUTE' | 'INCREASE_AVAILABILITY' | 'REDUCE_BOOKINGS' | 'HIRE_STAFF'
 *     severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 *     affectedProviders: string[]
 *     description: string
 *     estimatedImpact: string
 *     actionItems: string[]
 *   }>
 * }
 */
router.get('/load-balancing/recommendations', getLoadRecommendations);

/**
 * GET /api/v1/ai-scheduling/load-balancing/capacity
 * Get providers sorted by available capacity
 *
 * Query params:
 * - limit: number (optional, default 10, max 50)
 *
 * Response:
 * {
 *   message: string
 *   count: number
 *   providers: Array<{
 *     providerId: string
 *     providerName: string
 *     availableCapacity: number (percentage)
 *     loadScore: number
 *     status: string
 *   }>
 * }
 */
router.get('/load-balancing/capacity', getProviderCapacity);

/**
 * POST /api/v1/ai-scheduling/patterns/detect
 * Run comprehensive pattern detection analysis
 *
 * Request body (optional):
 * {
 *   startDate?: string (ISO date)
 *   endDate?: string (ISO date)
 * }
 *
 * Response:
 * {
 *   message: string
 *   count: number
 *   patterns: DetectedPattern[]
 * }
 */
router.post('/patterns/detect', runPatternDetection);

/**
 * GET /api/v1/ai-scheduling/patterns
 * Get active scheduling patterns
 *
 * Query params:
 * - severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * - category?: 'NO_SHOW_CLUSTER' | 'UNDERUTILIZATION' | 'OVERBOOKING' | 'GAP_TIME' | 'PREFERENCE_MISMATCH'
 *
 * Response:
 * {
 *   message: string
 *   count: number
 *   patterns: Array<{
 *     id: string
 *     patternType: string
 *     category: string
 *     severity: string
 *     description: string
 *     recommendations: string[]
 *     estimatedImpact: string
 *     detectedAt: Date
 *     status: string
 *   }>
 * }
 */
router.get('/patterns', getPatterns);

/**
 * GET /api/v1/ai-scheduling/patterns/stats
 * Get pattern statistics
 *
 * Response:
 * {
 *   message: string
 *   stats: {
 *     total: number
 *     active: number
 *     resolved: number
 *     ignored: number
 *     bySeverity: Record<string, number>
 *     byCategory: Record<string, number>
 *   }
 * }
 */
router.get('/patterns/stats', getPatternsStats);

/**
 * POST /api/v1/ai-scheduling/patterns/:patternId/resolve
 * Mark a pattern as resolved
 *
 * Request body (optional):
 * {
 *   resolutionNotes?: string
 * }
 *
 * Response:
 * {
 *   message: string
 * }
 */
router.post('/patterns/:patternId/resolve', resolvePatternController);

/**
 * POST /api/v1/ai-scheduling/patterns/:patternId/ignore
 * Mark a pattern as ignored
 *
 * Request body (optional):
 * {
 *   ignoreReason?: string
 * }
 *
 * Response:
 * {
 *   message: string
 * }
 */
router.post('/patterns/:patternId/ignore', ignorePatternController);

export default router;
