import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, differenceInMinutes } from 'date-fns';
import { UserRoles } from '@mentalspace/shared';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Provider Load Metrics
 */
export interface ProviderLoadMetrics {
  providerId: string;
  providerName: string;
  currentWeek: {
    totalAppointments: number;
    totalMinutes: number;
    utilizationRate: number; // Percentage of available time used
    averageAppointmentsPerDay: number;
  };
  nextWeek: {
    totalAppointments: number;
    totalMinutes: number;
    utilizationRate: number;
    averageAppointmentsPerDay: number;
  };
  overall: {
    loadScore: number; // 0-100, higher = more loaded
    status: 'UNDERUTILIZED' | 'BALANCED' | 'OVERLOADED' | 'CRITICAL';
    availableCapacity: number; // Percentage of remaining capacity
  };
  recommendations: string[];
}

/**
 * Team Load Distribution
 */
export interface TeamLoadDistribution {
  teamMetrics: {
    averageLoad: number;
    standardDeviation: number;
    balanceScore: number; // 0-100, higher = better balanced
    totalProviders: number;
    activeProviders: number;
  };
  providers: ProviderLoadMetrics[];
  recommendations: string[];
  imbalances: {
    overloaded: string[]; // Provider IDs
    underutilized: string[]; // Provider IDs
  };
}

/**
 * Load Balancing Recommendation
 */
export interface LoadBalancingRecommendation {
  type: 'REDISTRIBUTE' | 'INCREASE_AVAILABILITY' | 'REDUCE_BOOKINGS' | 'HIRE_STAFF';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedProviders: string[];
  description: string;
  estimatedImpact: string;
  actionItems: string[];
}

/**
 * Configuration Constants
 */
const LOAD_THRESHOLDS = {
  UNDERUTILIZED: 40, // < 40% utilization
  BALANCED_MIN: 40,
  BALANCED_MAX: 80,
  OVERLOADED: 80, // > 80% utilization
  CRITICAL: 95 // > 95% utilization
};

const STANDARD_WORK_HOURS = {
  hoursPerDay: 8,
  daysPerWeek: 5,
  minutesPerDay: 480, // 8 hours * 60 minutes
  minutesPerWeek: 2400 // 8 hours * 5 days * 60 minutes
};

/**
 * Calculate load metrics for a single provider
 */
export async function calculateProviderLoadMetrics(
  providerId: string
): Promise<ProviderLoadMetrics> {
  // Get provider details
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
      availableForScheduling: true
    }
  });

  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const providerName = `${provider.firstName} ${provider.lastName}`;

  // Date ranges
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  const nextWeekStart = addDays(currentWeekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  // Fetch appointments for current week
  const currentWeekAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId: providerId,
      appointmentDate: {
        gte: currentWeekStart,
        lte: currentWeekEnd
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_SESSION']
      }
    },
    select: {
      id: true,
      duration: true,
      appointmentDate: true
    }
  });

  // Fetch appointments for next week
  const nextWeekAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId: providerId,
      appointmentDate: {
        gte: nextWeekStart,
        lte: nextWeekEnd
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED']
      }
    },
    select: {
      id: true,
      duration: true,
      appointmentDate: true
    }
  });

  // Fetch provider availability for both weeks
  const availabilitySlots = await prisma.providerAvailability.findMany({
    where: {
      providerId: providerId,
      isActive: true,
      OR: [
        {
          effectiveDate: { lte: currentWeekEnd },
          expiryDate: { gte: currentWeekStart }
        },
        {
          effectiveDate: { lte: currentWeekEnd },
          expiryDate: null
        }
      ]
    }
  });

  // Calculate available minutes per week based on availability slots
  const availableMinutesPerWeek = calculateAvailableMinutes(availabilitySlots);

  // Calculate current week metrics
  const currentWeekTotalMinutes = currentWeekAppointments.reduce(
    (sum, apt) => sum + apt.duration,
    0
  );
  const currentWeekUtilization = availableMinutesPerWeek > 0
    ? (currentWeekTotalMinutes / availableMinutesPerWeek) * 100
    : 0;
  const currentWeekAvgPerDay = currentWeekAppointments.length / 7;

  // Calculate next week metrics
  const nextWeekTotalMinutes = nextWeekAppointments.reduce(
    (sum, apt) => sum + apt.duration,
    0
  );
  const nextWeekUtilization = availableMinutesPerWeek > 0
    ? (nextWeekTotalMinutes / availableMinutesPerWeek) * 100
    : 0;
  const nextWeekAvgPerDay = nextWeekAppointments.length / 7;

  // Calculate overall load score (weighted: 60% current, 40% next)
  const loadScore = (currentWeekUtilization * 0.6) + (nextWeekUtilization * 0.4);

  // Determine status
  let status: ProviderLoadMetrics['overall']['status'];
  if (loadScore >= LOAD_THRESHOLDS.CRITICAL) {
    status = 'CRITICAL';
  } else if (loadScore >= LOAD_THRESHOLDS.OVERLOADED) {
    status = 'OVERLOADED';
  } else if (loadScore < LOAD_THRESHOLDS.UNDERUTILIZED) {
    status = 'UNDERUTILIZED';
  } else {
    status = 'BALANCED';
  }

  const availableCapacity = Math.max(0, 100 - loadScore);

  // Generate recommendations
  const recommendations = generateProviderRecommendations(
    status,
    loadScore,
    currentWeekAppointments.length,
    nextWeekAppointments.length,
    provider.availableForScheduling || false
  );

  return {
    providerId,
    providerName,
    currentWeek: {
      totalAppointments: currentWeekAppointments.length,
      totalMinutes: currentWeekTotalMinutes,
      utilizationRate: parseFloat(currentWeekUtilization.toFixed(2)),
      averageAppointmentsPerDay: parseFloat(currentWeekAvgPerDay.toFixed(2))
    },
    nextWeek: {
      totalAppointments: nextWeekAppointments.length,
      totalMinutes: nextWeekTotalMinutes,
      utilizationRate: parseFloat(nextWeekUtilization.toFixed(2)),
      averageAppointmentsPerDay: parseFloat(nextWeekAvgPerDay.toFixed(2))
    },
    overall: {
      loadScore: parseFloat(loadScore.toFixed(2)),
      status,
      availableCapacity: parseFloat(availableCapacity.toFixed(2))
    },
    recommendations
  };
}

/**
 * Calculate available minutes per week from availability slots
 */
function calculateAvailableMinutes(availabilitySlots: any[]): number {
  if (availabilitySlots.length === 0) {
    // Default to standard work hours if no availability defined
    return STANDARD_WORK_HOURS.minutesPerWeek;
  }

  let totalMinutes = 0;

  for (const slot of availabilitySlots) {
    // Parse time strings (HH:mm format)
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    const slotDuration = endMinutes - startMinutes;
    totalMinutes += slotDuration;
  }

  // Assume availability slots represent one week's pattern
  return totalMinutes;
}

/**
 * Generate recommendations for a single provider
 */
function generateProviderRecommendations(
  status: ProviderLoadMetrics['overall']['status'],
  loadScore: number,
  currentWeekAppointments: number,
  nextWeekAppointments: number,
  availableForScheduling: boolean
): string[] {
  const recommendations: string[] = [];

  if (status === 'CRITICAL') {
    recommendations.push('⚠️ CRITICAL: Provider is severely overloaded and may experience burnout');
    recommendations.push('Immediately stop accepting new appointments');
    recommendations.push('Consider redistributing existing appointments to other providers');
    recommendations.push('Schedule a workload review meeting');
  } else if (status === 'OVERLOADED') {
    recommendations.push('⚠️ Provider is overloaded and nearing capacity');
    recommendations.push('Temporarily reduce new appointment bookings');
    recommendations.push('Redistribute some waitlist clients to other providers');
    recommendations.push('Consider extending availability hours if provider agrees');
  } else if (status === 'UNDERUTILIZED') {
    if (!availableForScheduling) {
      recommendations.push('Provider is marked as unavailable for scheduling');
      recommendations.push('Consider enabling scheduling if provider has capacity');
    } else {
      recommendations.push('✓ Provider has significant available capacity');
      recommendations.push('Prioritize this provider for new appointment bookings');
      recommendations.push('Consider assigning waitlist clients to this provider');
      recommendations.push('Review if provider wants more availability hours');
    }
  } else {
    recommendations.push('✓ Provider workload is well-balanced');
    recommendations.push('Continue current scheduling patterns');
    recommendations.push('Monitor for changes in next week');
  }

  // Trend-based recommendations
  if (nextWeekAppointments > currentWeekAppointments * 1.5) {
    recommendations.push('📈 Significant increase in appointments next week - monitor closely');
  } else if (nextWeekAppointments < currentWeekAppointments * 0.5 && currentWeekAppointments > 5) {
    recommendations.push('📉 Sharp decrease in appointments next week - consider filling gaps');
  }

  return recommendations;
}

/**
 * Analyze team-wide load distribution
 */
export async function analyzeTeamLoadDistribution(): Promise<TeamLoadDistribution> {
  // Get all active providers
  const providers = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: {
        hasSome: [UserRoles.ADMINISTRATOR, UserRoles.CLINICIAN]
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      availableForScheduling: true
    }
  });

  if (providers.length === 0) {
    throw new Error('No active providers found');
  }

  // Calculate metrics for each provider
  const providerMetrics = await Promise.all(
    providers.map(p => calculateProviderLoadMetrics(p.id))
  );

  // Calculate team-wide statistics
  const loadScores = providerMetrics.map(p => p.overall.loadScore);
  const activeProviders = providerMetrics.filter(
    p => p.overall.loadScore > 0 || p.currentWeek.totalAppointments > 0
  );

  const averageLoad = loadScores.reduce((sum, score) => sum + score, 0) / loadScores.length;

  // Calculate standard deviation
  const variance = loadScores.reduce(
    (sum, score) => sum + Math.pow(score - averageLoad, 2),
    0
  ) / loadScores.length;
  const standardDeviation = Math.sqrt(variance);

  // Balance score: lower std dev = better balance (0-100 scale)
  // Perfect balance (std dev = 0) = 100, high imbalance (std dev > 30) = 0
  const balanceScore = Math.max(0, Math.min(100, 100 - (standardDeviation * 3.33)));

  // Identify imbalances
  const overloaded = providerMetrics
    .filter(p => p.overall.status === 'OVERLOADED' || p.overall.status === 'CRITICAL')
    .map(p => p.providerId);

  const underutilized = providerMetrics
    .filter(p => p.overall.status === 'UNDERUTILIZED')
    .map(p => p.providerId);

  // Generate team-level recommendations
  const recommendations = generateTeamRecommendations(
    balanceScore,
    standardDeviation,
    overloaded.length,
    underutilized.length,
    providers.length
  );

  return {
    teamMetrics: {
      averageLoad: parseFloat(averageLoad.toFixed(2)),
      standardDeviation: parseFloat(standardDeviation.toFixed(2)),
      balanceScore: parseFloat(balanceScore.toFixed(2)),
      totalProviders: providers.length,
      activeProviders: activeProviders.length
    },
    providers: providerMetrics,
    recommendations,
    imbalances: {
      overloaded,
      underutilized
    }
  };
}

/**
 * Generate team-level recommendations
 */
function generateTeamRecommendations(
  balanceScore: number,
  standardDeviation: number,
  overloadedCount: number,
  underutilizedCount: number,
  totalProviders: number
): string[] {
  const recommendations: string[] = [];

  if (balanceScore >= 80) {
    recommendations.push('✓ Excellent team load balance - maintain current distribution');
  } else if (balanceScore >= 60) {
    recommendations.push('✓ Good team load balance with minor adjustments needed');
  } else if (balanceScore >= 40) {
    recommendations.push('⚠️ Moderate load imbalance - consider redistributing appointments');
  } else {
    recommendations.push('⚠️ Significant load imbalance - immediate action required');
  }

  if (overloadedCount > 0) {
    recommendations.push(
      `${overloadedCount} provider(s) overloaded - redistribute workload immediately`
    );
  }

  if (underutilizedCount > 0 && overloadedCount > 0) {
    recommendations.push(
      `Redistribute appointments from ${overloadedCount} overloaded to ${underutilizedCount} underutilized providers`
    );
  } else if (underutilizedCount > totalProviders * 0.3) {
    recommendations.push(
      `${underutilizedCount} providers underutilized - increase marketing or reduce staff`
    );
  }

  if (standardDeviation > 25) {
    recommendations.push(
      'High workload variance detected - implement load balancing policies'
    );
  }

  return recommendations;
}

/**
 * Get load balancing recommendations
 */
export async function getLoadBalancingRecommendations(): Promise<LoadBalancingRecommendation[]> {
  const distribution = await analyzeTeamLoadDistribution();
  const recommendations: LoadBalancingRecommendation[] = [];

  // Critical overload recommendation
  const criticalProviders = distribution.providers.filter(
    p => p.overall.status === 'CRITICAL'
  );
  if (criticalProviders.length > 0) {
    recommendations.push({
      type: 'REDISTRIBUTE',
      severity: 'CRITICAL',
      affectedProviders: criticalProviders.map(p => p.providerId),
      description: `${criticalProviders.length} provider(s) are critically overloaded and require immediate workload reduction`,
      estimatedImpact: 'Prevents provider burnout and maintains service quality',
      actionItems: [
        'Stop accepting new appointments for these providers',
        'Contact affected providers to discuss workload',
        'Redistribute scheduled appointments where possible',
        'Increase availability of underutilized providers'
      ]
    });
  }

  // Overload recommendation
  const overloadedProviders = distribution.providers.filter(
    p => p.overall.status === 'OVERLOADED'
  );
  if (overloadedProviders.length > 0 && criticalProviders.length === 0) {
    recommendations.push({
      type: 'REDISTRIBUTE',
      severity: 'HIGH',
      affectedProviders: overloadedProviders.map(p => p.providerId),
      description: `${overloadedProviders.length} provider(s) are overloaded and nearing capacity`,
      estimatedImpact: 'Prevents escalation to critical overload',
      actionItems: [
        'Reduce new appointment bookings for these providers',
        'Offer waitlist clients to underutilized providers',
        'Consider extending availability if providers agree',
        'Monitor workload closely'
      ]
    });
  }

  // Underutilization recommendation
  if (distribution.imbalances.underutilized.length > 0) {
    const underutilizedProviders = distribution.providers.filter(
      p => p.overall.status === 'UNDERUTILIZED'
    );

    recommendations.push({
      type: 'INCREASE_AVAILABILITY',
      severity: distribution.imbalances.overloaded.length > 0 ? 'HIGH' : 'MEDIUM',
      affectedProviders: distribution.imbalances.underutilized,
      description: `${distribution.imbalances.underutilized.length} provider(s) are underutilized and have available capacity`,
      estimatedImpact: 'Improves resource utilization and reduces wait times',
      actionItems: [
        'Prioritize these providers for new appointment bookings',
        'Assign waitlist clients to these providers',
        'Review if providers want additional availability hours',
        'Consider marketing to increase client volume'
      ]
    });
  }

  // Poor balance recommendation
  if (distribution.teamMetrics.balanceScore < 50) {
    recommendations.push({
      type: 'REDISTRIBUTE',
      severity: 'MEDIUM',
      affectedProviders: [
        ...distribution.imbalances.overloaded,
        ...distribution.imbalances.underutilized
      ],
      description: 'Team workload distribution is significantly imbalanced',
      estimatedImpact: 'Improves team morale and service consistency',
      actionItems: [
        'Implement automated load balancing in scheduling algorithm',
        'Review and update provider availability schedules',
        'Consider team-based scheduling policies',
        'Monitor load distribution weekly'
      ]
    });
  }

  // Capacity shortage recommendation
  const averageUtilization = distribution.teamMetrics.averageLoad;
  if (averageUtilization > 85) {
    recommendations.push({
      type: 'HIRE_STAFF',
      severity: 'HIGH',
      affectedProviders: [],
      description: 'Team-wide utilization is very high - additional staff may be needed',
      estimatedImpact: 'Reduces wait times and prevents provider burnout',
      actionItems: [
        'Analyze hiring needs and budget',
        'Consider hiring additional clinicians',
        'Explore part-time or contract providers',
        'Review waitlist size and growth trends'
      ]
    });
  }

  return recommendations;
}

/**
 * Calculate load balancing adjustment for a provider
 * Returns a multiplier (0.5 to 1.5) to adjust suggestion scores
 * Underutilized providers get higher scores, overloaded get lower scores
 */
export async function getLoadBalancingAdjustment(providerId: string): Promise<number> {
  try {
    const metrics = await calculateProviderLoadMetrics(providerId);
    const loadScore = metrics.overall.loadScore;

    // Adjustment formula:
    // Underutilized (< 40%): 1.3x - 1.5x boost
    // Balanced (40-80%): 0.9x - 1.1x (near neutral)
    // Overloaded (> 80%): 0.5x - 0.7x penalty
    // Critical (> 95%): 0.5x heavy penalty

    if (loadScore >= LOAD_THRESHOLDS.CRITICAL) {
      return 0.5; // Heavy penalty for critical overload
    } else if (loadScore >= LOAD_THRESHOLDS.OVERLOADED) {
      // Linear interpolation: 80% = 0.7x, 95% = 0.5x
      return 0.7 - ((loadScore - 80) / 15) * 0.2;
    } else if (loadScore < LOAD_THRESHOLDS.UNDERUTILIZED) {
      // Linear interpolation: 0% = 1.5x, 40% = 1.3x
      return 1.5 - (loadScore / 40) * 0.2;
    } else {
      // Balanced range: 40% = 1.1x, 80% = 0.9x
      return 1.1 - ((loadScore - 40) / 40) * 0.2;
    }
  } catch (error) {
    logger.error('Error calculating load balancing adjustment', { error });
    return 1.0; // Neutral adjustment on error
  }
}

/**
 * Get providers sorted by available capacity (for load balancing)
 */
export async function getProvidersByCapacity(limit: number = 10): Promise<{
  providerId: string;
  providerName: string;
  availableCapacity: number;
  loadScore: number;
  status: string;
}[]> {
  const distribution = await analyzeTeamLoadDistribution();

  return distribution.providers
    .filter(p => p.overall.availableCapacity > 0)
    .sort((a, b) => b.overall.availableCapacity - a.overall.availableCapacity)
    .slice(0, limit)
    .map(p => ({
      providerId: p.providerId,
      providerName: p.providerName,
      availableCapacity: p.overall.availableCapacity,
      loadScore: p.overall.loadScore,
      status: p.overall.status
    }));
}
