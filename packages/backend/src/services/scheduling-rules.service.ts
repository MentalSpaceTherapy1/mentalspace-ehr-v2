import prisma from './database';
import logger from '../utils/logger';
import type { SchedulingRule } from '@prisma/client';

/**
 * Module 7: Scheduling Rules Service
 *
 * Manages scheduling rules for self-scheduling functionality.
 * Rules can be organization-wide (clinicianId = null) or clinician-specific.
 */

export interface CreateSchedulingRuleRequest {
  clinicianId?: string | null;
  maxAdvanceBookingDays?: number;
  minNoticeHours?: number;
  cancellationWindowHours?: number;
  allowWeekends?: boolean;
  allowedDays?: string[];
  blockoutPeriods?: BlockoutPeriod[];
  slotDuration?: number;
  bufferTime?: number;
  maxDailyAppointments?: number | null;
  autoConfirm?: boolean;
  isActive?: boolean;
}

export interface UpdateSchedulingRuleRequest {
  maxAdvanceBookingDays?: number;
  minNoticeHours?: number;
  cancellationWindowHours?: number;
  allowWeekends?: boolean;
  allowedDays?: string[];
  blockoutPeriods?: BlockoutPeriod[];
  slotDuration?: number;
  bufferTime?: number;
  maxDailyAppointments?: number | null;
  autoConfirm?: boolean;
  isActive?: boolean;
}

export interface BlockoutPeriod {
  startDate: string; // ISO date string
  endDate: string;
  reason: string;
}

export interface EffectiveRule extends SchedulingRule {
  source: 'organization' | 'clinician';
}

/**
 * Get all scheduling rules with optional filtering
 */
export async function getSchedulingRules(filters?: {
  clinicianId?: string;
  isActive?: boolean;
  includeOrgWide?: boolean;
}): Promise<SchedulingRule[]> {
  try {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.clinicianId !== undefined) {
      if (filters.includeOrgWide) {
        where.OR = [
          { clinicianId: filters.clinicianId },
          { clinicianId: null },
        ];
      } else {
        where.clinicianId = filters.clinicianId;
      }
    }

    const rules = await prisma.schedulingRule.findMany({
      where,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: [
        { clinicianId: 'asc' }, // Org-wide (null) first
        { createdAt: 'desc' },
      ],
    });

    return rules;
  } catch (error: any) {
    logger.error('Failed to get scheduling rules', {
      error: error.message,
      filters,
    });
    throw new Error('Failed to retrieve scheduling rules');
  }
}

/**
 * Get a specific scheduling rule by ID
 */
export async function getSchedulingRuleById(id: string): Promise<SchedulingRule | null> {
  try {
    const rule = await prisma.schedulingRule.findUnique({
      where: { id },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    return rule;
  } catch (error: any) {
    logger.error('Failed to get scheduling rule by ID', {
      error: error.message,
      id,
    });
    throw new Error('Failed to retrieve scheduling rule');
  }
}

/**
 * Create a new scheduling rule
 */
export async function createSchedulingRule(
  data: CreateSchedulingRuleRequest
): Promise<SchedulingRule> {
  try {
    // Validate clinician exists if specified
    if (data.clinicianId) {
      const clinician = await prisma.user.findUnique({
        where: { id: data.clinicianId },
      });

      if (!clinician) {
        throw new Error('Clinician not found');
      }

      // Check if clinician already has an active rule
      const existingRule = await prisma.schedulingRule.findFirst({
        where: {
          clinicianId: data.clinicianId,
          isActive: true,
        },
      });

      if (existingRule) {
        throw new Error('Clinician already has an active scheduling rule');
      }
    } else {
      // Check if organization already has an active rule
      const existingOrgRule = await prisma.schedulingRule.findFirst({
        where: {
          clinicianId: null,
          isActive: true,
        },
      });

      if (existingOrgRule) {
        throw new Error('Organization already has an active scheduling rule');
      }
    }

    const rule = await prisma.schedulingRule.create({
      data: {
        clinicianId: data.clinicianId || null,
        maxAdvanceBookingDays: data.maxAdvanceBookingDays ?? 30,
        minNoticeHours: data.minNoticeHours ?? 24,
        cancellationWindowHours: data.cancellationWindowHours ?? 24,
        allowWeekends: data.allowWeekends ?? false,
        allowedDays: data.allowedDays ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        blockoutPeriods: (data.blockoutPeriods || []) as any,
        slotDuration: data.slotDuration ?? 60,
        bufferTime: data.bufferTime ?? 0,
        maxDailyAppointments: data.maxDailyAppointments,
        autoConfirm: data.autoConfirm ?? false,
        isActive: data.isActive ?? true,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    logger.info('Scheduling rule created', {
      ruleId: rule.id,
      clinicianId: rule.clinicianId,
      type: rule.clinicianId ? 'clinician-specific' : 'organization-wide',
    });

    return rule;
  } catch (error: any) {
    logger.error('Failed to create scheduling rule', {
      error: error.message,
      data,
    });
    throw error;
  }
}

/**
 * Update an existing scheduling rule
 */
export async function updateSchedulingRule(
  id: string,
  data: UpdateSchedulingRuleRequest
): Promise<SchedulingRule> {
  try {
    const existingRule = await prisma.schedulingRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      throw new Error('Scheduling rule not found');
    }

    const rule = await prisma.schedulingRule.update({
      where: { id },
      data: {
        ...(data.maxAdvanceBookingDays !== undefined && { maxAdvanceBookingDays: data.maxAdvanceBookingDays }),
        ...(data.minNoticeHours !== undefined && { minNoticeHours: data.minNoticeHours }),
        ...(data.cancellationWindowHours !== undefined && { cancellationWindowHours: data.cancellationWindowHours }),
        ...(data.allowWeekends !== undefined && { allowWeekends: data.allowWeekends }),
        ...(data.allowedDays !== undefined && { allowedDays: data.allowedDays }),
        ...(data.blockoutPeriods !== undefined && { blockoutPeriods: data.blockoutPeriods as any }),
        ...(data.slotDuration !== undefined && { slotDuration: data.slotDuration }),
        ...(data.bufferTime !== undefined && { bufferTime: data.bufferTime }),
        ...(data.maxDailyAppointments !== undefined && { maxDailyAppointments: data.maxDailyAppointments }),
        ...(data.autoConfirm !== undefined && { autoConfirm: data.autoConfirm }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    logger.info('Scheduling rule updated', {
      ruleId: id,
      clinicianId: rule.clinicianId,
    });

    return rule;
  } catch (error: any) {
    logger.error('Failed to update scheduling rule', {
      error: error.message,
      id,
      data,
    });
    throw error;
  }
}

/**
 * Delete a scheduling rule
 */
export async function deleteSchedulingRule(id: string): Promise<void> {
  try {
    const existingRule = await prisma.schedulingRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      throw new Error('Scheduling rule not found');
    }

    await prisma.schedulingRule.delete({
      where: { id },
    });

    logger.info('Scheduling rule deleted', {
      ruleId: id,
      clinicianId: existingRule.clinicianId,
    });
  } catch (error: any) {
    logger.error('Failed to delete scheduling rule', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Get effective scheduling rules for a clinician
 * Merges organization-wide rules with clinician-specific rules
 * Clinician-specific rules take precedence
 */
export async function getEffectiveRules(clinicianId: string): Promise<SchedulingRule> {
  try {
    // Get clinician-specific rule
    const clinicianRule = await prisma.schedulingRule.findFirst({
      where: {
        clinicianId,
        isActive: true,
      },
    });

    // If clinician has their own rule, use it
    if (clinicianRule) {
      logger.debug('Using clinician-specific scheduling rule', { clinicianId });
      return clinicianRule;
    }

    // Fall back to organization-wide rule
    const orgRule = await prisma.schedulingRule.findFirst({
      where: {
        clinicianId: null,
        isActive: true,
      },
    });

    if (orgRule) {
      logger.debug('Using organization-wide scheduling rule', { clinicianId });
      return orgRule;
    }

    // No rules found - return default rule
    logger.warn('No scheduling rules found, using defaults', { clinicianId });
    return {
      id: 'default',
      clinicianId,
      maxAdvanceBookingDays: 30,
      minNoticeHours: 24,
      cancellationWindowHours: 24,
      allowWeekends: false,
      allowedDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      blockoutPeriods: [],
      slotDuration: 60,
      bufferTime: 0,
      maxDailyAppointments: null,
      autoConfirm: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SchedulingRule;
  } catch (error: any) {
    logger.error('Failed to get effective rules', {
      error: error.message,
      clinicianId,
    });
    throw new Error('Failed to retrieve effective scheduling rules');
  }
}

/**
 * Validate if a time slot can be booked based on scheduling rules
 */
export async function validateSlot(
  clinicianId: string,
  slotTime: Date,
  appointmentDuration: number = 60
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const rules = await getEffectiveRules(clinicianId);
    const now = new Date();

    // Check minimum notice hours
    const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilSlot < rules.minNoticeHours) {
      return {
        valid: false,
        reason: `Appointments must be booked at least ${rules.minNoticeHours} hours in advance`,
      };
    }

    // Check maximum advance booking days
    const daysUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilSlot > rules.maxAdvanceBookingDays) {
      return {
        valid: false,
        reason: `Appointments can only be booked up to ${rules.maxAdvanceBookingDays} days in advance`,
      };
    }

    // Check if day of week is allowed
    const dayOfWeek = slotTime.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
    if (!rules.allowedDays.includes(dayOfWeek)) {
      return {
        valid: false,
        reason: `Appointments are not available on ${dayOfWeek.toLowerCase()}s`,
      };
    }

    // Check weekends if not allowed
    if (!rules.allowWeekends && (slotTime.getDay() === 0 || slotTime.getDay() === 6)) {
      return {
        valid: false,
        reason: 'Weekend appointments are not available',
      };
    }

    // Check blockout periods
    if (rules.blockoutPeriods && Array.isArray(rules.blockoutPeriods)) {
      const slotDate = slotTime.toISOString().split('T')[0];
      for (const blockout of rules.blockoutPeriods as unknown as BlockoutPeriod[]) {
        if (slotDate >= blockout.startDate && slotDate <= blockout.endDate) {
          return {
            valid: false,
            reason: `Not available: ${blockout.reason}`,
          };
        }
      }
    }

    return { valid: true };
  } catch (error: any) {
    logger.error('Failed to validate slot', {
      error: error.message,
      clinicianId,
      slotTime,
    });
    throw error;
  }
}
