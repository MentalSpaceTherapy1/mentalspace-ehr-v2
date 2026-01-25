/**
 * AI Scheduling Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw query result for checking table existence
 */
export interface TableExistsResult {
  exists: boolean;
}

/**
 * Provider group result from Prisma groupBy
 */
export interface ProviderGroupResult {
  suggestedProviderId: string;
  _count: {
    id: number;
  };
}

// ============================================================================
// CLIENT OPERATIONS
// ============================================================================

/**
 * Find client for scheduling validation
 */
export async function findClientForScheduling(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, firstName: true, lastName: true, status: true },
  });
}

// ============================================================================
// APPOINTMENT TYPE OPERATIONS
// ============================================================================

/**
 * Find appointment type for scheduling validation
 */
export async function findAppointmentType(appointmentTypeId: string) {
  return prisma.appointmentType.findUnique({
    where: { id: appointmentTypeId },
    select: { id: true, typeName: true, isActive: true },
  });
}

// ============================================================================
// PROVIDER (USER) OPERATIONS
// ============================================================================

/**
 * Find provider for scheduling validation
 */
export async function findProviderForScheduling(providerId: string) {
  return prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, isActive: true, availableForScheduling: true },
  });
}

/**
 * Find provider with name only
 */
export async function findProviderWithName(providerId: string) {
  return prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, firstName: true, lastName: true },
  });
}

/**
 * Find provider with title
 */
export async function findProviderWithTitle(providerId: string) {
  return prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, firstName: true, lastName: true, title: true },
  });
}

/**
 * Find provider and client together for compatibility
 */
export async function findProviderAndClient(providerId: string, clientId: string) {
  return Promise.all([
    prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
}

// ============================================================================
// SCHEDULING SUGGESTION OPERATIONS
// ============================================================================

/**
 * Find scheduling suggestion by ID with related data
 */
export async function findSuggestionWithDetails(suggestionId: string) {
  return prisma.schedulingSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      suggestedProvider: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

/**
 * Get suggestions history for a client
 */
export async function getSuggestionsHistory(
  clientId: string,
  limit: number = 20,
  offset: number = 0
) {
  return prisma.schedulingSuggestion.findMany({
    where: { clientId },
    include: {
      suggestedProvider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
      appointmentType: {
        select: {
          id: true,
          typeName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Count suggestions for a client
 */
export async function countClientSuggestions(clientId: string) {
  return prisma.schedulingSuggestion.count({
    where: { clientId },
  });
}

// ============================================================================
// SCHEDULING STATS OPERATIONS
// ============================================================================

/**
 * Check if scheduling_suggestions table exists
 */
export async function checkSchedulingSuggestionsTableExists(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<TableExistsResult[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'scheduling_suggestions'
      ) as exists
    `;
    return result[0]?.exists || false;
  } catch {
    return false;
  }
}

/**
 * Get scheduling statistics
 */
export async function getSchedulingStatistics() {
  const [total, accepted, avgScore, topProviders] = await Promise.all([
    // Total suggestions generated
    prisma.schedulingSuggestion.count(),

    // Accepted suggestions
    prisma.schedulingSuggestion.count({
      where: { wasAccepted: true },
    }),

    // Average overall score
    prisma.schedulingSuggestion.aggregate({
      _avg: { overallScore: true },
    }),

    // Top suggested providers
    prisma.schedulingSuggestion.groupBy({
      by: ['suggestedProviderId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  return {
    totalSuggestions: total,
    acceptedSuggestions: accepted,
    averageScore: avgScore,
    topProviders: topProviders as ProviderGroupResult[],
  };
}

/**
 * Get provider details for statistics
 */
export async function getProviderDetailsForStats(providerIds: string[]) {
  return Promise.all(
    providerIds.map(async (providerId) => {
      const provider = await prisma.user.findUnique({
        where: { id: providerId },
        select: { id: true, firstName: true, lastName: true, title: true },
      });
      return provider;
    })
  );
}

// ============================================================================
// SCHEDULING PATTERN OPERATIONS
// ============================================================================

/**
 * Find scheduling pattern by ID
 */
export async function findSchedulingPattern(patternId: string) {
  return prisma.schedulingPattern.findUnique({
    where: { id: patternId },
  });
}
