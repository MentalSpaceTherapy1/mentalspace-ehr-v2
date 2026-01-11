import { PrismaClient } from '@prisma/client';
import { addDays, format, parse, addMinutes, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { calculateCompatibilityScore } from './compatibilityScoring.service';

const prisma = new PrismaClient();

interface SchedulingRequest {
  clientId: string;
  providerId?: string; // Optional - if not specified, find best provider
  appointmentTypeId: string;
  requestedDate?: Date;
  requestedTime?: string; // HH:mm format
  flexibility?: number; // Days of flexibility (0-30)
  duration?: number; // Minutes
}

interface SchedulingSuggestion {
  suggestedProviderId: string;
  providerName: string;
  suggestedDate: Date;
  suggestedTime: string;
  suggestedDuration: number;
  alternativeSlots: TimeSlot[];
  compatibilityScore: number;
  loadBalanceScore: number;
  efficiencyScore: number;
  overallScore: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  providerId: string;
  providerName: string;
}

/**
 * Generate optimal scheduling suggestions for a client
 */
export async function generateSchedulingSuggestions(
  request: SchedulingRequest
): Promise<SchedulingSuggestion[]> {
  const requestId = generateRequestId();

  // Get appointment type details
  const appointmentType = await prisma.appointmentType.findUnique({
    where: { id: request.appointmentTypeId }
  });

  if (!appointmentType) {
    throw new Error('Appointment type not found');
  }

  const duration = request.duration || appointmentType.defaultDuration;
  const flexibility = request.flexibility || 7; // Default 7 days flexibility

  // Determine date range to search
  const startDate = request.requestedDate || new Date();
  const endDate = addDays(startDate, flexibility);

  let suggestions: SchedulingSuggestion[] = [];

  if (request.providerId) {
    // Specific provider requested - find best slots
    suggestions = await findBestSlotsForProvider(
      request.providerId,
      request.clientId,
      startDate,
      endDate,
      duration,
      request.requestedTime,
      requestId
    );
  } else {
    // Find best provider based on compatibility and availability
    suggestions = await findBestProviderAndSlots(
      request.clientId,
      startDate,
      endDate,
      duration,
      request.requestedTime,
      requestId,
      appointmentType.id
    );
  }

  // Save all suggestions to database
  await saveSuggestions(suggestions, request, requestId);

  return suggestions;
}

/**
 * Find best available slots for a specific provider
 */
async function findBestSlotsForProvider(
  providerId: string,
  clientId: string,
  startDate: Date,
  endDate: Date,
  duration: number,
  preferredTime?: string,
  requestId?: string
): Promise<SchedulingSuggestion[]> {
  // Get provider details
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    include: { availability: true }
  });

  if (!provider) {
    throw new Error('Provider not found');
  }

  // Get provider's existing appointments in date range
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId: providerId,
      appointmentDate: {
        gte: startDate,
        lte: endDate
      },
      status: { in: ['SCHEDULED', 'CONFIRMED'] }
    },
    orderBy: { appointmentDate: 'asc' }
  });

  // Calculate compatibility score
  const compatibility = await calculateCompatibilityScore(providerId, clientId);

  // Find available time slots
  const availableSlots = await findAvailableTimeSlots(
    provider,
    existingAppointments,
    startDate,
    endDate,
    duration,
    preferredTime
  );

  if (availableSlots.length === 0) {
    return [];
  }

  // Calculate load balance score (prefer less busy days)
  const loadBalanceScore = calculateLoadBalanceScore(provider.id, existingAppointments, startDate);

  // Calculate efficiency score (prefer slots that minimize gaps)
  const efficiencyScore = calculateEfficiencyScore(availableSlots[0], existingAppointments);

  // Calculate overall score
  const overallScore =
    compatibility.overallScore * 0.4 +  // 40% compatibility
    loadBalanceScore * 0.3 +            // 30% load balance
    efficiencyScore * 0.3;              // 30% efficiency

  // Generate reasoning
  const reasoning = generateReasoning(
    provider,
    compatibility,
    loadBalanceScore,
    efficiencyScore,
    availableSlots[0]
  );

  const suggestion: SchedulingSuggestion = {
    suggestedProviderId: provider.id,
    providerName: `${provider.firstName} ${provider.lastName}`,
    suggestedDate: availableSlots[0].date,
    suggestedTime: availableSlots[0].startTime,
    suggestedDuration: duration,
    alternativeSlots: availableSlots.slice(1, 6), // Up to 5 alternatives
    compatibilityScore: compatibility.overallScore,
    loadBalanceScore,
    efficiencyScore,
    overallScore,
    confidenceLevel: getConfidenceLevel(overallScore),
    reasoning
  };

  return [suggestion];
}

/**
 * Find best provider and available slots
 */
async function findBestProviderAndSlots(
  clientId: string,
  startDate: Date,
  endDate: Date,
  duration: number,
  preferredTime?: string,
  requestId?: string,
  appointmentTypeId?: string
): Promise<SchedulingSuggestion[]> {
  // Get all available providers
  const providers = await prisma.user.findMany({
    where: {
      roles: { hasSome: ['CLINICIAN', 'SUPERVISOR'] },
      isActive: true,
      availableForScheduling: true,
      acceptsNewClients: true
    },
    include: { availability: true }
  });

  // Generate suggestions for each provider
  const allSuggestions = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await findBestSlotsForProvider(
          provider.id,
          clientId,
          startDate,
          endDate,
          duration,
          preferredTime,
          requestId
        );
      } catch (error) {
        console.error(`Error finding slots for provider ${provider.id}:`, error);
        return [];
      }
    })
  );

  // Flatten and sort by overall score
  return allSuggestions
    .flat()
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5); // Return top 5 suggestions
}

/**
 * Find available time slots for a provider
 */
async function findAvailableTimeSlots(
  provider: any,
  existingAppointments: any[],
  startDate: Date,
  endDate: Date,
  duration: number,
  preferredTime?: string
): Promise<TimeSlot[]> {
  const availableSlots: TimeSlot[] = [];

  // Iterate through each day in the range
  let currentDate = startDate;
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // Find provider's availability for this day
    const dayAvailability = provider.availability.filter(
      (a: any) => a.dayOfWeek === dayOfWeek && a.isAvailable
    );

    for (const avail of dayAvailability) {
      // Generate time slots for this availability window
      const slots = generateTimeSlotsForDay(
        currentDate,
        avail.startTime,
        avail.endTime,
        duration,
        existingAppointments,
        preferredTime
      );

      availableSlots.push(...slots.map(slot => ({
        ...slot,
        providerId: provider.id,
        providerName: `${provider.firstName} ${provider.lastName}`
      })));
    }

    currentDate = addDays(currentDate, 1);
  }

  // Sort by preference: preferred time first, then chronological
  return availableSlots.sort((a, b) => {
    if (preferredTime) {
      const aMatchesPreference = a.startTime === preferredTime ? 0 : 1;
      const bMatchesPreference = b.startTime === preferredTime ? 0 : 1;
      if (aMatchesPreference !== bMatchesPreference) {
        return aMatchesPreference - bMatchesPreference;
      }
    }
    return a.date.getTime() - b.date.getTime();
  });
}

/**
 * Generate time slots for a specific day
 */
function generateTimeSlotsForDay(
  date: Date,
  startTime: string,
  endTime: string,
  duration: number,
  existingAppointments: any[],
  preferredTime?: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = parse(startTime, 'HH:mm', date);
  const end = parse(endTime, 'HH:mm', date);

  let currentSlot = start;

  while (addMinutes(currentSlot, duration) <= end) {
    const slotStartTime = format(currentSlot, 'HH:mm');
    const slotEndTime = format(addMinutes(currentSlot, duration), 'HH:mm');

    // Check if this slot conflicts with existing appointments
    const hasConflict = existingAppointments.some(appt => {
      if (format(appt.appointmentDate, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd')) {
        return false;
      }

      const apptStart = parse(appt.startTime, 'HH:mm', date);
      const apptEnd = parse(appt.endTime, 'HH:mm', date);

      return (
        (currentSlot >= apptStart && currentSlot < apptEnd) ||
        (addMinutes(currentSlot, duration) > apptStart && addMinutes(currentSlot, duration) <= apptEnd)
      );
    });

    if (!hasConflict) {
      slots.push({
        date,
        startTime: slotStartTime,
        endTime: slotEndTime,
        providerId: '',
        providerName: ''
      });
    }

    // Move to next slot (15-minute increments)
    currentSlot = addMinutes(currentSlot, 15);
  }

  return slots;
}

/**
 * Calculate load balance score for a provider
 */
function calculateLoadBalanceScore(
  providerId: string,
  existingAppointments: any[],
  targetDate: Date
): number {
  const appointmentsOnDate = existingAppointments.filter(
    appt => format(appt.appointmentDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')
  );

  // Prefer less busy days
  if (appointmentsOnDate.length === 0) return 1.0;
  if (appointmentsOnDate.length <= 2) return 0.9;
  if (appointmentsOnDate.length <= 4) return 0.7;
  if (appointmentsOnDate.length <= 6) return 0.5;

  return 0.3;
}

/**
 * Calculate efficiency score (minimize gaps in schedule)
 */
function calculateEfficiencyScore(
  proposedSlot: TimeSlot,
  existingAppointments: any[]
): number {
  const appointmentsOnDate = existingAppointments.filter(
    appt => format(appt.appointmentDate, 'yyyy-MM-dd') === format(proposedSlot.date, 'yyyy-MM-dd')
  );

  if (appointmentsOnDate.length === 0) return 0.8; // Neutral - first appointment of day

  // Check for gaps before or after this slot
  const proposedStart = parse(proposedSlot.startTime, 'HH:mm', proposedSlot.date);

  let minGap = Infinity;
  for (const appt of appointmentsOnDate) {
    const apptEnd = parse(appt.endTime, 'HH:mm', proposedSlot.date);
    const gap = Math.abs((proposedStart.getTime() - apptEnd.getTime()) / (1000 * 60));
    minGap = Math.min(minGap, gap);
  }

  // Prefer slots close to existing appointments (< 30 min gap)
  if (minGap <= 15) return 1.0;  // Back-to-back
  if (minGap <= 30) return 0.9;
  if (minGap <= 60) return 0.7;

  return 0.5; // Large gap
}

/**
 * Generate reasoning for suggestion
 */
function generateReasoning(
  provider: any,
  compatibility: any,
  loadBalanceScore: number,
  efficiencyScore: number,
  slot: TimeSlot
): string {
  const reasons: string[] = [];

  if (compatibility.overallScore >= 0.8) {
    reasons.push(`Strong compatibility match (${(compatibility.overallScore * 100).toFixed(0)}%)`);
  }

  if (loadBalanceScore >= 0.8) {
    reasons.push('Provider has good availability on this date');
  }

  if (efficiencyScore >= 0.8) {
    reasons.push('Minimizes scheduling gaps');
  }

  if (provider.yearsOfExperience >= 5) {
    reasons.push(`Experienced provider (${provider.yearsOfExperience} years)`);
  }

  if (reasons.length === 0) {
    reasons.push('Available slot matching requested criteria');
  }

  return reasons.join('. ') + '.';
}

/**
 * Get confidence level based on overall score
 */
function getConfidenceLevel(overallScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (overallScore >= 0.8) return 'HIGH';
  if (overallScore >= 0.6) return 'MEDIUM';
  return 'LOW';
}

/**
 * Save suggestions to database
 */
async function saveSuggestions(
  suggestions: SchedulingSuggestion[],
  request: SchedulingRequest,
  requestId: string
): Promise<void> {
  await Promise.all(
    suggestions.map((suggestion, index) =>
      prisma.schedulingSuggestion.create({
        data: {
          requestId,
          suggestionType: index === 0 ? 'OPTIMAL_SLOT' : 'ALTERNATIVE_PROVIDER',
          clientId: request.clientId,
          providerId: request.providerId,
          appointmentTypeId: request.appointmentTypeId,
          requestedDate: request.requestedDate,
          requestedTime: request.requestedTime,
          flexibility: request.flexibility,
          suggestedProviderId: suggestion.suggestedProviderId,
          suggestedDate: suggestion.suggestedDate,
          suggestedTime: suggestion.suggestedTime,
          suggestedDuration: suggestion.suggestedDuration,
          alternativeSlots: suggestion.alternativeSlots as any,
          compatibilityScore: suggestion.compatibilityScore,
          loadBalanceScore: suggestion.loadBalanceScore,
          efficiencyScore: suggestion.efficiencyScore,
          overallScore: suggestion.overallScore,
          confidenceLevel: suggestion.confidenceLevel,
          reasoning: suggestion.reasoning,
          factors: {
            compatibility: suggestion.compatibilityScore,
            loadBalance: suggestion.loadBalanceScore,
            efficiency: suggestion.efficiencyScore
          }
        }
      })
    )
  );
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Accept a scheduling suggestion and create appointment
 */
export async function acceptSuggestion(
  suggestionId: string,
  userId: string
): Promise<any> {
  const suggestion = await prisma.schedulingSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      client: true,
      suggestedProvider: true,
      appointmentType: true
    }
  });

  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.wasAccepted) {
    throw new Error('Suggestion already accepted');
  }

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      clientId: suggestion.clientId!,
      clinicianId: suggestion.suggestedProviderId,
      appointmentDate: suggestion.suggestedDate,
      startTime: suggestion.suggestedTime,
      endTime: format(
        addMinutes(
          parse(suggestion.suggestedTime, 'HH:mm', suggestion.suggestedDate),
          suggestion.suggestedDuration
        ),
        'HH:mm'
      ),
      duration: suggestion.suggestedDuration,
      appointmentType: suggestion.appointmentType?.typeName || 'Follow-up',
      appointmentTypeId: suggestion.appointmentTypeId,
      serviceLocation: 'Office',
      status: 'SCHEDULED',
      createdBy: userId,
      lastModifiedBy: userId,
      statusUpdatedBy: userId
    }
  });

  // Update suggestion as accepted
  await prisma.schedulingSuggestion.update({
    where: { id: suggestionId },
    data: {
      wasAccepted: true,
      acceptedAt: new Date(),
      createdAppointmentId: appointment.id
    }
  });

  return appointment;
}
