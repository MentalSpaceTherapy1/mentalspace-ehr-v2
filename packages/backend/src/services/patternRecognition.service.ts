import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, differenceInMinutes, format, startOfWeek, endOfWeek } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Pattern Recognition Service
 * Detects scheduling inefficiencies, trends, and optimization opportunities
 */

/**
 * Detected Pattern Result
 */
export interface DetectedPattern {
  patternType: 'INEFFICIENCY' | 'OPTIMIZATION' | 'TREND' | 'ANOMALY';
  category: 'NO_SHOW_CLUSTER' | 'UNDERUTILIZATION' | 'OVERBOOKING' | 'GAP_TIME' | 'PREFERENCE_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedEntities: {
    providerIds?: string[];
    clientIds?: string[];
    timeSlots?: string[];
    dayOfWeek?: number[];
  };
  dateRangeStart: Date;
  dateRangeEnd: Date;
  description: string;
  recommendations: string[];
  estimatedImpact: string;
  metrics?: any;
}

/**
 * Detection Configuration
 */
const DETECTION_CONFIG = {
  // No-show detection thresholds
  NO_SHOW_RATE_THRESHOLD: 0.25, // 25% or higher is concerning
  NO_SHOW_CRITICAL_THRESHOLD: 0.40, // 40% or higher is critical
  NO_SHOW_MIN_APPOINTMENTS: 5, // Minimum appointments to analyze

  // Underutilization thresholds
  UNDERUTILIZATION_THRESHOLD: 0.30, // Less than 30% utilization
  UNDERUTILIZATION_CRITICAL: 0.15, // Less than 15% is critical

  // Gap time thresholds (minutes)
  GAP_TIME_THRESHOLD: 60, // Gaps over 60 minutes
  GAP_TIME_CRITICAL: 120, // Gaps over 120 minutes

  // Analysis period (days)
  ANALYSIS_PERIOD_DAYS: 30,

  // Minimum data points for pattern detection
  MIN_DATA_POINTS: 3
};

/**
 * Run comprehensive pattern detection analysis
 */
export async function detectAllPatterns(
  dateRangeStart?: Date,
  dateRangeEnd?: Date
): Promise<DetectedPattern[]> {
  const endDate = dateRangeEnd || new Date();
  const startDate = dateRangeStart || subDays(endDate, DETECTION_CONFIG.ANALYSIS_PERIOD_DAYS);

  const patterns: DetectedPattern[] = [];

  // Run all detection algorithms in parallel
  const [
    noShowPatterns,
    underutilizationPatterns,
    gapTimePatterns,
    preferenceMismatchPatterns
  ] = await Promise.all([
    detectNoShowClusters(startDate, endDate),
    detectUnderutilization(startDate, endDate),
    detectGapTimeInefficiencies(startDate, endDate),
    detectPreferenceMismatches(startDate, endDate)
  ]);

  patterns.push(...noShowPatterns);
  patterns.push(...underutilizationPatterns);
  patterns.push(...gapTimePatterns);
  patterns.push(...preferenceMismatchPatterns);

  // Store patterns in database
  await storeDetectedPatterns(patterns);

  return patterns;
}

/**
 * Detect no-show clusters by time of day, day of week, or provider
 */
export async function detectNoShowClusters(
  startDate: Date,
  endDate: Date
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Get all appointments in date range with no-show status
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['NO_SHOW', 'CANCELLED', 'SCHEDULED', 'CONFIRMED', 'COMPLETED']
      }
    },
    include: {
      clinician: {
        select: { id: true, firstName: true, lastName: true }
      },
      client: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });

  if (appointments.length < DETECTION_CONFIG.NO_SHOW_MIN_APPOINTMENTS) {
    return patterns; // Not enough data
  }

  // Analyze by provider
  const providerStats = new Map<string, { total: number; noShows: number }>();

  for (const apt of appointments) {
    if (!apt.clinicianId) continue;

    const stats = providerStats.get(apt.clinicianId) || { total: 0, noShows: 0 };
    stats.total++;
    if (apt.status === 'NO_SHOW') {
      stats.noShows++;
    }
    providerStats.set(apt.clinicianId, stats);
  }

  // Detect provider-specific no-show patterns
  for (const [providerId, stats] of providerStats.entries()) {
    if (stats.total < DETECTION_CONFIG.NO_SHOW_MIN_APPOINTMENTS) continue;

    const noShowRate = stats.noShows / stats.total;

    if (noShowRate >= DETECTION_CONFIG.NO_SHOW_RATE_THRESHOLD) {
      const provider = (appointments.find(a => a.clinicianId === providerId) as any)?.clinician;
      const providerName = provider ? `${provider.firstName} ${provider.lastName}` : 'Unknown';

      const severity: DetectedPattern['severity'] =
        noShowRate >= DETECTION_CONFIG.NO_SHOW_CRITICAL_THRESHOLD ? 'CRITICAL' :
        noShowRate >= 0.35 ? 'HIGH' :
        noShowRate >= 0.30 ? 'MEDIUM' : 'LOW';

      patterns.push({
        patternType: 'INEFFICIENCY',
        category: 'NO_SHOW_CLUSTER',
        severity,
        affectedEntities: { providerIds: [providerId] },
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        description: `High no-show rate detected for ${providerName}: ${(noShowRate * 100).toFixed(1)}% (${stats.noShows}/${stats.total} appointments)`,
        recommendations: [
          'Implement reminder system (SMS/email) 24 hours before appointment',
          'Consider requiring deposit or cancellation policy',
          'Review scheduling practices and client communication',
          'Offer telehealth options to reduce no-shows',
          'Identify clients with repeat no-shows for follow-up'
        ],
        estimatedImpact: `Potential revenue loss: ${stats.noShows} missed appointments. Average session value may be significant.`,
        metrics: {
          noShowRate,
          totalAppointments: stats.total,
          noShowCount: stats.noShows
        }
      });
    }
  }

  // Analyze by day of week
  const dayOfWeekStats = new Array(7).fill(null).map(() => ({ total: 0, noShows: 0 }));

  for (const apt of appointments) {
    const dayOfWeek = apt.appointmentDate.getDay();
    dayOfWeekStats[dayOfWeek].total++;
    if (apt.status === 'NO_SHOW') {
      dayOfWeekStats[dayOfWeek].noShows++;
    }
  }

  // Detect day-of-week patterns
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let day = 0; day < 7; day++) {
    const stats = dayOfWeekStats[day];
    if (stats.total < DETECTION_CONFIG.NO_SHOW_MIN_APPOINTMENTS) continue;

    const noShowRate = stats.noShows / stats.total;

    if (noShowRate >= DETECTION_CONFIG.NO_SHOW_RATE_THRESHOLD) {
      const severity: DetectedPattern['severity'] =
        noShowRate >= DETECTION_CONFIG.NO_SHOW_CRITICAL_THRESHOLD ? 'HIGH' :
        noShowRate >= 0.30 ? 'MEDIUM' : 'LOW';

      patterns.push({
        patternType: 'TREND',
        category: 'NO_SHOW_CLUSTER',
        severity,
        affectedEntities: { dayOfWeek: [day] },
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        description: `Elevated no-show rate on ${dayNames[day]}s: ${(noShowRate * 100).toFixed(1)}% (${stats.noShows}/${stats.total} appointments)`,
        recommendations: [
          `Send extra reminders for ${dayNames[day]} appointments`,
          `Consider overbooking slightly on ${dayNames[day]}s to compensate`,
          'Analyze if certain time slots on this day are more problematic',
          'Review if this day has specific scheduling challenges'
        ],
        estimatedImpact: `${stats.noShows} no-shows on ${dayNames[day]}s could be reduced with targeted interventions`,
        metrics: {
          dayOfWeek: day,
          dayName: dayNames[day],
          noShowRate,
          totalAppointments: stats.total,
          noShowCount: stats.noShows
        }
      });
    }
  }

  return patterns;
}

/**
 * Detect provider underutilization
 */
export async function detectUnderutilization(
  startDate: Date,
  endDate: Date
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Get all active providers
  const providers = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: { hasSome: ['ADMINISTRATOR', 'CLINICIAN'] }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      availableForScheduling: true
    }
  });

  // Calculate utilization for each provider
  for (const provider of providers) {
    // Get provider's availability
    const availability = await prisma.providerAvailability.findMany({
      where: {
        providerId: provider.id,
        isActive: true,
        OR: [
          {
            effectiveDate: { lte: endDate },
            expiryDate: { gte: startDate }
          },
          {
            effectiveDate: { lte: endDate },
            expiryDate: null
          }
        ]
      }
    });

    if (availability.length === 0) continue;

    // Calculate total available hours
    let totalAvailableMinutes = 0;
    for (const slot of availability) {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      const slotMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

      // Estimate number of days in period (simplified)
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      totalAvailableMinutes += slotMinutes * (daysInPeriod / 7); // Weekly slots
    }

    // Get actual appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: provider.id,
        appointmentDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'IN_SESSION']
        }
      },
      select: {
        duration: true
      }
    });

    const totalScheduledMinutes = appointments.reduce((sum, apt) => sum + apt.duration, 0);
    const utilizationRate = totalAvailableMinutes > 0 ? totalScheduledMinutes / totalAvailableMinutes : 0;

    if (utilizationRate < DETECTION_CONFIG.UNDERUTILIZATION_THRESHOLD &&
        provider.availableForScheduling) {

      const severity: DetectedPattern['severity'] =
        utilizationRate < DETECTION_CONFIG.UNDERUTILIZATION_CRITICAL ? 'CRITICAL' :
        utilizationRate < 0.20 ? 'HIGH' :
        utilizationRate < 0.25 ? 'MEDIUM' : 'LOW';

      patterns.push({
        patternType: 'INEFFICIENCY',
        category: 'UNDERUTILIZATION',
        severity,
        affectedEntities: { providerIds: [provider.id] },
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        description: `Provider ${provider.firstName} ${provider.lastName} is significantly underutilized: ${(utilizationRate * 100).toFixed(1)}% utilization (${appointments.length} appointments)`,
        recommendations: [
          'Review provider availability schedule - may be too optimistic',
          'Increase marketing efforts to fill provider schedule',
          'Consider reassigning clients from overbooked providers',
          'Review if provider specialties match client needs',
          'Evaluate if provider should reduce available hours'
        ],
        estimatedImpact: `${((1 - utilizationRate) * 100).toFixed(0)}% of available time is unused. Potential for ${Math.floor((totalAvailableMinutes - totalScheduledMinutes) / 60)} additional hours of billable appointments.`,
        metrics: {
          utilizationRate,
          totalAppointments: appointments.length,
          availableHours: Math.round(totalAvailableMinutes / 60),
          scheduledHours: Math.round(totalScheduledMinutes / 60),
          unusedHours: Math.round((totalAvailableMinutes - totalScheduledMinutes) / 60)
        }
      });
    }
  }

  return patterns;
}

/**
 * Detect inefficient gap times between appointments
 */
export async function detectGapTimeInefficiencies(
  startDate: Date,
  endDate: Date
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Get all providers
  const providers = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: { hasSome: ['ADMINISTRATOR', 'CLINICIAN'] }
    },
    select: { id: true, firstName: true, lastName: true }
  });

  for (const provider of providers) {
    // Get all appointments for this provider, sorted by date and time
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: provider.id,
        appointmentDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED']
        }
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { startTime: 'asc' }
      ],
      select: {
        id: true,
        appointmentDate: true,
        startTime: true,
        endTime: true,
        duration: true
      }
    });

    if (appointments.length < 2) continue;

    // Analyze gaps between consecutive appointments on same day
    const gapsByDay = new Map<string, number[]>();
    let largeGapCount = 0;
    let totalGapMinutes = 0;
    let gapCount = 0;

    for (let i = 0; i < appointments.length - 1; i++) {
      const current = appointments[i];
      const next = appointments[i + 1];

      // Check if appointments are on the same day
      if (format(current.appointmentDate, 'yyyy-MM-dd') !== format(next.appointmentDate, 'yyyy-MM-dd')) {
        continue;
      }

      // Calculate gap
      const currentEnd = current.endTime;
      const nextStart = next.startTime;

      const [currentEndHour, currentEndMinute] = currentEnd.split(':').map(Number);
      const [nextStartHour, nextStartMinute] = nextStart.split(':').map(Number);

      const currentEndMinutes = currentEndHour * 60 + currentEndMinute;
      const nextStartMinutes = nextStartHour * 60 + nextStartMinute;

      const gapMinutes = nextStartMinutes - currentEndMinutes;

      if (gapMinutes > 0) {
        const dayKey = format(current.appointmentDate, 'yyyy-MM-dd');
        const dayGaps = gapsByDay.get(dayKey) || [];
        dayGaps.push(gapMinutes);
        gapsByDay.set(dayKey, dayGaps);

        totalGapMinutes += gapMinutes;
        gapCount++;

        if (gapMinutes >= DETECTION_CONFIG.GAP_TIME_THRESHOLD) {
          largeGapCount++;
        }
      }
    }

    if (gapCount > 0) {
      const averageGap = totalGapMinutes / gapCount;
      const largeGapPercentage = largeGapCount / gapCount;

      if (averageGap >= DETECTION_CONFIG.GAP_TIME_THRESHOLD ||
          largeGapPercentage >= 0.30) { // 30% or more gaps are large

        const severity: DetectedPattern['severity'] =
          averageGap >= DETECTION_CONFIG.GAP_TIME_CRITICAL || largeGapPercentage >= 0.50 ? 'HIGH' :
          averageGap >= 90 || largeGapPercentage >= 0.40 ? 'MEDIUM' : 'LOW';

        patterns.push({
          patternType: 'INEFFICIENCY',
          category: 'GAP_TIME',
          severity,
          affectedEntities: { providerIds: [provider.id] },
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
          description: `Inefficient scheduling gaps detected for ${provider.firstName} ${provider.lastName}: ${Math.round(averageGap)} min average gap, ${largeGapCount} gaps over ${DETECTION_CONFIG.GAP_TIME_THRESHOLD} minutes`,
          recommendations: [
            'Optimize appointment scheduling to reduce gaps',
            'Consider offering shorter appointment slots to fill gaps',
            'Use gap times for administrative tasks or breaks (if intentional)',
            'Enable online booking to help fill unexpected gaps',
            'Review appointment duration settings - may be too long'
          ],
          estimatedImpact: `${Math.round(totalGapMinutes / 60)} hours of potential appointment time lost to gaps. Could accommodate ${Math.floor(totalGapMinutes / 45)} additional 45-minute sessions.`,
          metrics: {
            averageGapMinutes: Math.round(averageGap),
            totalGapHours: Math.round(totalGapMinutes / 60),
            largeGapCount,
            largeGapPercentage: (largeGapPercentage * 100).toFixed(1),
            daysAnalyzed: gapsByDay.size
          }
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect preference mismatches (clients scheduled with sub-optimal providers)
 */
export async function detectPreferenceMismatches(
  startDate: Date,
  endDate: Date
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Get appointments with completion and compatibility data
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: {
        gte: startDate,
        lte: endDate
      },
      status: 'COMPLETED'
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  // Get compatibility scores for completed appointments
  const mismatchedPairs: Array<{
    clientId: string;
    clientName: string;
    providerId: string;
    providerName: string;
    appointmentCount: number;
    compatibilityScore: number | null;
  }> = [];

  const clientProviderPairs = new Map<string, {
    clientId: string;
    clientName: string;
    providerId: string;
    providerName: string;
    count: number;
  }>();

  for (const apt of appointments) {
    if (!apt.clientId || !apt.clinicianId) continue;

    const key = `${apt.clientId}:${apt.clinicianId}`;
    const existing = clientProviderPairs.get(key);

    if (existing) {
      existing.count++;
    } else {
      clientProviderPairs.set(key, {
        clientId: apt.clientId,
        clientName: `${apt.client.firstName} ${apt.client.lastName}`,
        providerId: apt.clinicianId,
        providerName: `${apt.clinician.firstName} ${apt.clinician.lastName}`,
        count: 1
      });
    }
  }

  // Check compatibility scores for pairs with multiple appointments
  for (const pair of clientProviderPairs.values()) {
    if (pair.count < DETECTION_CONFIG.MIN_DATA_POINTS) continue;

    const compatibility = await prisma.providerClientCompatibility.findUnique({
      where: {
        providerId_clientId: {
          providerId: pair.providerId,
          clientId: pair.clientId
        }
      },
      select: {
        overallScore: true
      }
    });

    if (compatibility && compatibility.overallScore < 60) {
      // Low compatibility despite multiple appointments
      mismatchedPairs.push({
        clientId: pair.clientId,
        clientName: pair.clientName,
        providerId: pair.providerId,
        providerName: pair.providerName,
        appointmentCount: pair.count,
        compatibilityScore: compatibility.overallScore
      });
    }
  }

  // Group mismatches and create patterns
  if (mismatchedPairs.length > 0) {
    // Group by provider
    const providerMismatches = new Map<string, typeof mismatchedPairs>();

    for (const mismatch of mismatchedPairs) {
      const existing = providerMismatches.get(mismatch.providerId) || [];
      existing.push(mismatch);
      providerMismatches.set(mismatch.providerId, existing);
    }

    for (const [providerId, mismatches] of providerMismatches.entries()) {
      if (mismatches.length < 2) continue;

      const totalAppointments = mismatches.reduce((sum, m) => sum + m.appointmentCount, 0);
      const avgCompatibility = mismatches.reduce((sum, m) => sum + (m.compatibilityScore || 0), 0) / mismatches.length;

      const severity: DetectedPattern['severity'] =
        avgCompatibility < 40 ? 'HIGH' :
        avgCompatibility < 50 ? 'MEDIUM' : 'LOW';

      patterns.push({
        patternType: 'INEFFICIENCY',
        category: 'PREFERENCE_MISMATCH',
        severity,
        affectedEntities: {
          providerIds: [providerId],
          clientIds: mismatches.map(m => m.clientId)
        },
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        description: `${mismatches.length} clients have low compatibility with ${mismatches[0].providerName} (avg score: ${avgCompatibility.toFixed(1)}) despite ${totalAppointments} completed appointments`,
        recommendations: [
          'Review client assignments and consider alternative providers',
          'Consult with clients about provider preferences',
          'Analyze what factors are causing low compatibility scores',
          'Consider transitioning clients to better-matched providers',
          'Review provider specialties and client needs alignment'
        ],
        estimatedImpact: `Improved client-provider matching could increase satisfaction and reduce cancellations/no-shows. ${totalAppointments} appointments may benefit from provider reassignment.`,
        metrics: {
          mismatchedClients: mismatches.length,
          totalAffectedAppointments: totalAppointments,
          averageCompatibility: avgCompatibility.toFixed(1),
          clients: mismatches.map(m => ({
            name: m.clientName,
            appointments: m.appointmentCount,
            score: m.compatibilityScore
          }))
        }
      });
    }
  }

  return patterns;
}

/**
 * Store detected patterns in database
 */
async function storeDetectedPatterns(patterns: DetectedPattern[]): Promise<void> {
  for (const pattern of patterns) {
    try {
      await prisma.schedulingPattern.create({
        data: {
          patternType: pattern.patternType,
          category: pattern.category,
          severity: pattern.severity,
          title: pattern.category.replace(/_/g, ' '),
          timeRange: { startDate: pattern.dateRangeStart, endDate: pattern.dateRangeEnd },
          affectedDates: pattern.affectedEntities as any,
          detectedAt: new Date(),
          description: pattern.description,
          recommendation: Array.isArray(pattern.recommendations) ? pattern.recommendations.join('; ') : String(pattern.recommendations || ''),
          estimatedImpact: pattern.estimatedImpact,
          status: 'ACTIVE',
          metrics: pattern.metrics as any,
          confidence: 0.8
        }
      });
    } catch (error) {
      console.error('Error storing pattern:', error);
      // Continue with other patterns
    }
  }
}

/**
 * Get active patterns from database
 */
export async function getActivePatterns(
  severity?: DetectedPattern['severity'],
  category?: DetectedPattern['category']
): Promise<any[]> {
  return await prisma.schedulingPattern.findMany({
    where: {
      status: 'ACTIVE',
      ...(severity && { severity }),
      ...(category && { category })
    },
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' }
    ]
  });
}

/**
 * Mark a pattern as resolved
 */
export async function resolvePattern(
  patternId: string,
  resolutionNotes?: string
): Promise<void> {
  await prisma.schedulingPattern.update({
    where: { id: patternId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolution: resolutionNotes
    }
  });
}

/**
 * Mark a pattern as ignored
 */
export async function ignorePattern(
  patternId: string,
  ignoreReason?: string
): Promise<void> {
  await prisma.schedulingPattern.update({
    where: { id: patternId },
    data: {
      status: 'IGNORED',
      resolution: ignoreReason
    }
  });
}

/**
 * Get pattern statistics
 */
export async function getPatternStatistics(): Promise<{
  total: number;
  active: number;
  resolved: number;
  ignored: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const [total, active, resolved, ignored, bySeverity, byCategory] = await Promise.all([
    prisma.schedulingPattern.count(),
    prisma.schedulingPattern.count({ where: { status: 'ACTIVE' } }),
    prisma.schedulingPattern.count({ where: { status: 'RESOLVED' } }),
    prisma.schedulingPattern.count({ where: { status: 'IGNORED' } }),
    prisma.schedulingPattern.groupBy({
      by: ['severity'],
      _count: { id: true }
    }),
    prisma.schedulingPattern.groupBy({
      by: ['category'],
      _count: { id: true }
    })
  ]);

  return {
    total,
    active,
    resolved,
    ignored,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>)
  };
}
