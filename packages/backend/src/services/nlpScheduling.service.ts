import { PrismaClient } from '@prisma/client';
import { parse, addDays, addWeeks, addMonths, setHours, setMinutes, startOfDay, isBefore, isAfter } from 'date-fns';
import * as schedulingSuggestionsService from './schedulingSuggestions.service';

const prisma = new PrismaClient();

interface ParsedEntities {
  intent?: 'SCHEDULE' | 'RESCHEDULE' | 'CANCEL' | 'FIND_SLOT' | 'CHECK_AVAILABILITY';
  providerName?: string;
  providerId?: string;
  clientName?: string;
  clientId?: string;
  date?: Date;
  dateText?: string;
  time?: string;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  duration?: number;
  appointmentType?: string;
  flexibility?: number; // days
}

interface ParseResult {
  success: boolean;
  confidence: number; // 0.0 to 1.0
  intent?: string;
  entities: ParsedEntities;
  clarificationNeeded?: string;
  reasoning: string[];
}

/**
 * Parse natural language scheduling request
 */
export async function parseSchedulingRequest(
  requestText: string,
  userId: string
): Promise<ParseResult> {
  const startTime = Date.now();
  const reasoning: string[] = [];
  const entities: ParsedEntities = {};

  const normalizedText = requestText.toLowerCase().trim();

  // Step 1: Extract intent
  const intent = extractIntent(normalizedText);
  entities.intent = intent;

  if (intent) {
    reasoning.push(`Detected intent: ${intent}`);
  } else {
    reasoning.push('Could not determine intent from request');
  }

  // Step 2: Extract provider information
  const providerInfo = await extractProvider(normalizedText);
  if (providerInfo) {
    entities.providerName = providerInfo.name;
    entities.providerId = providerInfo.id;
    reasoning.push(`Identified provider: ${providerInfo.name}`);
  }

  // Step 3: Extract client information (if mentioned)
  const clientInfo = await extractClient(normalizedText);
  if (clientInfo) {
    entities.clientName = clientInfo.name;
    entities.clientId = clientInfo.id;
    reasoning.push(`Identified client: ${clientInfo.name}`);
  }

  // Step 4: Extract date
  const dateInfo = extractDate(normalizedText);
  if (dateInfo.date) {
    entities.date = dateInfo.date;
    entities.dateText = dateInfo.text;
    reasoning.push(`Parsed date: ${dateInfo.text} → ${dateInfo.date.toLocaleDateString()}`);
  }

  // Step 5: Extract time
  const timeInfo = extractTime(normalizedText);
  if (timeInfo.time) {
    entities.time = timeInfo.time;
    reasoning.push(`Parsed time: ${timeInfo.time}`);
  } else if (timeInfo.timeOfDay) {
    entities.timeOfDay = timeInfo.timeOfDay;
    reasoning.push(`Identified time of day: ${timeInfo.timeOfDay}`);
  }

  // Step 6: Extract duration
  const duration = extractDuration(normalizedText);
  if (duration) {
    entities.duration = duration;
    reasoning.push(`Extracted duration: ${duration} minutes`);
  }

  // Step 7: Extract appointment type
  const appointmentType = extractAppointmentType(normalizedText);
  if (appointmentType) {
    entities.appointmentType = appointmentType;
    reasoning.push(`Identified appointment type: ${appointmentType}`);
  }

  // Step 8: Extract flexibility
  const flexibility = extractFlexibility(normalizedText);
  if (flexibility) {
    entities.flexibility = flexibility;
    reasoning.push(`Extracted flexibility: ${flexibility} days`);
  }

  // Calculate confidence score
  const confidence = calculateConfidence(intent, entities, normalizedText);

  // Determine if clarification is needed
  const clarification = determineClarificationNeeded(intent, entities);

  // Determine success
  const success = confidence >= 0.5 && !clarification;

  // Log the parsing attempt
  const parsingTimeMs = Date.now() - startTime;
  await logParsingAttempt(
    userId,
    requestText,
    intent || 'UNKNOWN',
    entities,
    confidence,
    success,
    parsingTimeMs,
    clarification
  );

  return {
    success,
    confidence,
    intent: intent || undefined,
    entities,
    clarificationNeeded: clarification,
    reasoning
  };
}

/**
 * Extract intent from request text
 */
function extractIntent(text: string): ParsedEntities['intent'] | null {
  // Schedule patterns
  if (
    /\b(schedule|book|make|create|set up|arrange)\b.*\b(appointment|session|meeting)\b/i.test(text) ||
    /\b(appointment|session|meeting)\b.*\b(with|for)\b/i.test(text)
  ) {
    return 'SCHEDULE';
  }

  // Reschedule patterns
  if (
    /\b(reschedule|move|change|shift)\b.*\b(appointment|session|meeting)\b/i.test(text) ||
    /\b(change|move)\b.*\b(time|date)\b/i.test(text)
  ) {
    return 'RESCHEDULE';
  }

  // Cancel patterns
  if (
    /\b(cancel|delete|remove)\b.*\b(appointment|session|meeting)\b/i.test(text)
  ) {
    return 'CANCEL';
  }

  // Find slot patterns
  if (
    /\b(find|show|get|give me)\b.*\b(available|open|free|slot|time)\b/i.test(text) ||
    /\b(when|what time).*\b(available|free|open)\b/i.test(text)
  ) {
    return 'FIND_SLOT';
  }

  // Check availability patterns
  if (
    /\b(check|see|view)\b.*\b(availability|schedule|calendar)\b/i.test(text) ||
    /\b(is|are).*\b(available|free|open)\b/i.test(text)
  ) {
    return 'CHECK_AVAILABILITY';
  }

  return null;
}

/**
 * Extract provider information from text
 */
async function extractProvider(text: string): Promise<{ id: string; name: string } | null> {
  // Look for "Dr." or "doctor" followed by a name
  const drMatch = text.match(/\b(?:dr\.?|doctor)\s+([a-z]+(?:\s+[a-z]+)?)\b/i);

  if (drMatch) {
    const name = drMatch[1];

    // Search for provider in database
    const providers = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } }
        ],
        roles: { hasSome: ['CLINICIAN', 'SUPERVISOR'] },
        isActive: true
      },
      select: { id: true, firstName: true, lastName: true }
    });

    if (providers.length > 0) {
      const provider = providers[0];
      return {
        id: provider.id,
        name: `${provider.firstName} ${provider.lastName}`
      };
    }
  }

  // Look for "with [name]" pattern
  const withMatch = text.match(/\bwith\s+([a-z]+(?:\s+[a-z]+)?)\b/i);
  if (withMatch) {
    const name = withMatch[1];

    const providers = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } }
        ],
        roles: { hasSome: ['CLINICIAN', 'SUPERVISOR'] },
        isActive: true
      },
      select: { id: true, firstName: true, lastName: true }
    });

    if (providers.length > 0) {
      const provider = providers[0];
      return {
        id: provider.id,
        name: `${provider.firstName} ${provider.lastName}`
      };
    }
  }

  return null;
}

/**
 * Extract client information from text
 */
async function extractClient(text: string): Promise<{ id: string; name: string } | null> {
  // Look for "for [name]" pattern
  const forMatch = text.match(/\bfor\s+([a-z]+(?:\s+[a-z]+)?)\b/i);

  if (forMatch) {
    const name = forMatch[1];

    // Skip common words that might match
    const skipWords = ['me', 'myself', 'client', 'patient', 'session', 'appointment'];
    if (skipWords.includes(name.toLowerCase())) {
      return null;
    }

    // Search for client in database
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } }
        ],
        status: 'ACTIVE'
      },
      select: { id: true, firstName: true, lastName: true }
    });

    if (clients.length > 0) {
      const client = clients[0];
      return {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
      };
    }
  }

  return null;
}

/**
 * Extract date from text
 */
function extractDate(text: string): { date: Date | null; text: string } {
  const now = new Date();

  // Today
  if (/\btoday\b/i.test(text)) {
    return { date: startOfDay(now), text: 'today' };
  }

  // Tomorrow
  if (/\btomorrow\b/i.test(text)) {
    return { date: startOfDay(addDays(now, 1)), text: 'tomorrow' };
  }

  // Day after tomorrow
  if (/\bday after tomorrow\b/i.test(text)) {
    return { date: startOfDay(addDays(now, 2)), text: 'day after tomorrow' };
  }

  // Next week
  if (/\bnext week\b/i.test(text)) {
    return { date: startOfDay(addWeeks(now, 1)), text: 'next week' };
  }

  // This week
  if (/\bthis week\b/i.test(text)) {
    return { date: startOfDay(now), text: 'this week' };
  }

  // Days of week (next Monday, Tuesday, etc.)
  const dayMatch = text.match(/\b(?:next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = daysOfWeek.indexOf(dayName);
    const currentDay = now.getDay();

    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next occurrence
    }

    return {
      date: startOfDay(addDays(now, daysToAdd)),
      text: dayMatch[0]
    };
  }

  // Specific date formats (MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD)
  const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1;
    const day = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);
    const date = new Date(year, month, day);

    if (!isNaN(date.getTime())) {
      return { date: startOfDay(date), text: dateMatch[0] };
    }
  }

  // Relative days (in 3 days, in 1 week, etc.)
  const relativeMatch = text.match(/\bin\s+(\d+)\s+(day|week|month)s?\b/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    let date: Date;
    if (unit === 'day') {
      date = startOfDay(addDays(now, amount));
    } else if (unit === 'week') {
      date = startOfDay(addWeeks(now, amount));
    } else {
      date = startOfDay(addMonths(now, amount));
    }

    return { date, text: relativeMatch[0] };
  }

  return { date: null, text: '' };
}

/**
 * Extract time from text
 */
function extractTime(text: string): { time: string | null; timeOfDay: ParsedEntities['timeOfDay'] | null } {
  // Specific times (2pm, 14:00, 2:30pm, etc.)
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase().replace(/\./g, '');

    // Convert to 24-hour format
    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    // If no meridiem specified, assume PM if hour is between 1-7, AM if 8-12
    if (!meridiem) {
      if (hours >= 1 && hours <= 7) {
        hours += 12;
      }
    }

    return {
      time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      timeOfDay: null
    };
  }

  // Time of day
  if (/\bmorning\b/i.test(text)) {
    return { time: null, timeOfDay: 'MORNING' };
  }

  if (/\bafternoon\b/i.test(text)) {
    return { time: null, timeOfDay: 'AFTERNOON' };
  }

  if (/\bevening\b/i.test(text)) {
    return { time: null, timeOfDay: 'EVENING' };
  }

  return { time: null, timeOfDay: null };
}

/**
 * Extract duration from text
 */
function extractDuration(text: string): number | null {
  // Look for explicit duration (60 minutes, 1 hour, 90 min, etc.)
  const durationMatch = text.match(/\b(\d+)\s*(minute|min|hour|hr)s?\b/i);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();

    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return amount * 60;
    }
    return amount;
  }

  return null;
}

/**
 * Extract appointment type from text
 */
function extractAppointmentType(text: string): string | null {
  const types = [
    'initial',
    'intake',
    'follow-up',
    'followup',
    'consultation',
    'therapy',
    'evaluation',
    'assessment',
    'check-in'
  ];

  for (const type of types) {
    const regex = new RegExp(`\\b${type}\\b`, 'i');
    if (regex.test(text)) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  return null;
}

/**
 * Extract flexibility from text
 */
function extractFlexibility(text: string): number | null {
  // Look for flexibility indicators
  const flexMatch = text.match(/\b(?:within|in the next|up to)\s+(\d+)\s+days?\b/i);
  if (flexMatch) {
    return parseInt(flexMatch[1]);
  }

  if (/\bflexible\b/i.test(text)) {
    return 7; // Default 7 days if they mention flexibility
  }

  return null;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  intent: ParsedEntities['intent'] | null,
  entities: ParsedEntities,
  text: string
): number {
  let score = 0;
  let maxScore = 0;

  // Intent (40% weight)
  maxScore += 40;
  if (intent) {
    score += 40;
  } else {
    score += 10; // Partial credit if text seems scheduling-related
  }

  // Date (25% weight)
  maxScore += 25;
  if (entities.date) {
    score += 25;
  } else if (entities.dateText) {
    score += 15;
  }

  // Time (15% weight)
  maxScore += 15;
  if (entities.time) {
    score += 15;
  } else if (entities.timeOfDay) {
    score += 10;
  }

  // Provider (10% weight)
  maxScore += 10;
  if (entities.providerId) {
    score += 10;
  }

  // Client (5% weight)
  maxScore += 5;
  if (entities.clientId) {
    score += 5;
  }

  // Duration (3% weight)
  maxScore += 3;
  if (entities.duration) {
    score += 3;
  }

  // Appointment type (2% weight)
  maxScore += 2;
  if (entities.appointmentType) {
    score += 2;
  }

  return score / maxScore;
}

/**
 * Determine what clarification is needed
 */
function determineClarificationNeeded(
  intent: ParsedEntities['intent'] | null,
  entities: ParsedEntities
): string | undefined {
  const missing: string[] = [];

  if (!intent) {
    return 'I could not determine what you want to do. Please specify if you want to schedule, reschedule, cancel, or check availability.';
  }

  if (intent === 'SCHEDULE' || intent === 'FIND_SLOT') {
    if (!entities.date && !entities.dateText) {
      missing.push('date');
    }
    if (!entities.time && !entities.timeOfDay) {
      missing.push('time');
    }
  }

  if (missing.length > 0) {
    return `Please specify the ${missing.join(' and ')} for the appointment.`;
  }

  return undefined;
}

/**
 * Log parsing attempt to database
 */
async function logParsingAttempt(
  userId: string,
  requestText: string,
  intent: string,
  entities: ParsedEntities,
  confidence: number,
  success: boolean,
  parsingTimeMs: number,
  clarificationNeeded?: string
): Promise<void> {
  try {
    await prisma.naturalLanguageSchedulingLog.create({
      data: {
        userId,
        requestText,
        parsedIntent: intent,
        parsedEntities: entities,
        confidence,
        parsingSuccess: success,
        executionStatus: success ? 'PENDING' : 'CLARIFICATION_NEEDED',
        clarificationNeeded,
        parsingTimeMs
      }
    });
  } catch (error) {
    console.error('Error logging NLP parsing attempt:', error);
  }
}

/**
 * Execute parsed scheduling request
 */
export async function executeSchedulingRequest(
  parseResult: ParseResult,
  userId: string
): Promise<any> {
  const startTime = Date.now();

  if (!parseResult.success || !parseResult.intent) {
    throw new Error(parseResult.clarificationNeeded || 'Could not parse scheduling request');
  }

  const { intent, entities } = parseResult;

  try {
    let result: any;

    switch (intent) {
      case 'SCHEDULE':
        // Get default appointment type if not specified
        const defaultAppointmentType = await prisma.appointmentType.findFirst({
          where: { isActive: true },
          select: { id: true }
        });

        if (!defaultAppointmentType) {
          throw new Error('No active appointment types found');
        }

        // Use the scheduling suggestions service
        const suggestions = await schedulingSuggestionsService.generateSchedulingSuggestions({
          clientId: entities.clientId || '',
          providerId: entities.providerId,
          appointmentTypeId: defaultAppointmentType.id,
          requestedDate: entities.date,
          requestedTime: entities.time,
          flexibility: entities.flexibility || 7,
          duration: entities.duration
        });

        // Auto-accept the best suggestion and create the appointment
        if (suggestions && suggestions.length > 0) {
          const bestSuggestion = suggestions[0];
          const appointment = await schedulingSuggestionsService.acceptSuggestion(bestSuggestion.id, userId);
          result = {
            success: true,
            message: 'Appointment created successfully',
            appointment,
            suggestion: bestSuggestion
          };
        } else {
          result = {
            success: false,
            message: 'No available time slots found for the requested parameters',
            suggestions: []
          };
        }
        break;

      case 'FIND_SLOT':
        // Similar to SCHEDULE but return suggestions without creating appointment
        result = await schedulingSuggestionsService.generateSchedulingSuggestions({
          clientId: entities.clientId || '',
          providerId: entities.providerId,
          appointmentTypeId: '',
          requestedDate: entities.date,
          requestedTime: entities.time,
          flexibility: entities.flexibility || 7,
          duration: entities.duration
        });
        break;

      case 'CHECK_AVAILABILITY':
        // Check provider availability
        if (entities.providerId) {
          const appointments = await prisma.appointment.findMany({
            where: {
              clinicianId: entities.providerId,
              appointmentDate: entities.date,
              status: { in: ['SCHEDULED', 'CONFIRMED'] }
            },
            orderBy: { startTime: 'asc' }
          });
          result = { available: appointments.length === 0, appointments };
        }
        break;

      default:
        throw new Error(`Intent ${intent} not yet implemented`);
    }

    // Update log with execution results
    const executionTimeMs = Date.now() - startTime;
    // Would update the log here with execution status and result

    return result;
  } catch (error) {
    console.error('Error executing scheduling request:', error);
    throw error;
  }
}
