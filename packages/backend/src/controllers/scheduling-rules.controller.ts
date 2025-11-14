import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import * as schedulingRulesService from '../services/scheduling-rules.service';

/**
 * Module 7: Scheduling Rules Controller
 *
 * Admin and clinician endpoints for managing scheduling rules
 */

// Validation schemas
const blockoutPeriodSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(1, 'Reason is required'),
});

const createSchedulingRuleSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID').optional().nullable(),
  maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
  minNoticeHours: z.number().int().min(0).max(168).optional(),
  cancellationWindowHours: z.number().int().min(0).max(168).optional(),
  allowWeekends: z.boolean().optional(),
  allowedDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
  blockoutPeriods: z.array(blockoutPeriodSchema).optional(),
  slotDuration: z.number().int().min(15).max(240).optional(),
  bufferTime: z.number().int().min(0).max(60).optional(),
  maxDailyAppointments: z.number().int().min(1).optional().nullable(),
  autoConfirm: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateSchedulingRuleSchema = createSchedulingRuleSchema.omit({ clinicianId: true });

/**
 * GET /api/scheduling-rules
 * Get all scheduling rules with optional filtering
 */
export const getSchedulingRules = async (req: Request, res: Response) => {
  try {
    const { clinicianId, isActive, includeOrgWide } = req.query;

    logger.info('Getting scheduling rules', {
      clinicianId,
      isActive,
      includeOrgWide,
      userId: req.user?.id,
    });

    // Build filters
    const filters: any = {};

    if (clinicianId) {
      filters.clinicianId = clinicianId as string;
      filters.includeOrgWide = includeOrgWide === 'true';
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    // If user is a clinician, restrict to their own rules unless they're admin
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('ADMINISTRATOR') || userRoles.includes('SUPER_ADMIN');

    if (!isAdmin && userRoles.includes('CLINICIAN')) {
      filters.clinicianId = req.user?.id;
      filters.includeOrgWide = true;
    }

    const rules = await schedulingRulesService.getSchedulingRules(filters);

    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error: any) {
    logger.error('Get scheduling rules error', {
      error: error.message,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduling rules',
      error: error.message,
    });
  }
};

/**
 * GET /api/scheduling-rules/:id
 * Get a specific scheduling rule
 */
export const getSchedulingRuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Getting scheduling rule by ID', {
      ruleId: id,
      userId: req.user?.id,
    });

    const rule = await schedulingRulesService.getSchedulingRuleById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling rule not found',
      });
    }

    // Check authorization
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('ADMINISTRATOR') || userRoles.includes('SUPER_ADMIN');

    if (!isAdmin && rule.clinicianId && rule.clinicianId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this scheduling rule',
      });
    }

    res.status(200).json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    logger.error('Get scheduling rule by ID error', {
      error: error.message,
      ruleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduling rule',
      error: error.message,
    });
  }
};

/**
 * POST /api/scheduling-rules
 * Create a new scheduling rule
 */
export const createSchedulingRule = async (req: Request, res: Response) => {
  try {
    const validation = createSchedulingRuleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const data = validation.data;

    logger.info('Creating scheduling rule', {
      clinicianId: data.clinicianId,
      userId: req.user?.id,
    });

    // Check authorization
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('ADMINISTRATOR') || userRoles.includes('SUPER_ADMIN');

    // Only admins can create org-wide rules
    if (!data.clinicianId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create organization-wide scheduling rules',
      });
    }

    // Clinicians can only create rules for themselves
    if (data.clinicianId && !isAdmin && data.clinicianId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create scheduling rule for another clinician',
      });
    }

    const rule = await schedulingRulesService.createSchedulingRule(data);

    res.status(201).json({
      success: true,
      message: 'Scheduling rule created successfully',
      data: rule,
    });
  } catch (error: any) {
    logger.error('Create scheduling rule error', {
      error: error.message,
      body: req.body,
    });

    // Handle specific error cases
    if (error.message.includes('already has an active')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create scheduling rule',
      error: error.message,
    });
  }
};

/**
 * PUT /api/scheduling-rules/:id
 * Update an existing scheduling rule
 */
export const updateSchedulingRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateSchedulingRuleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const data = validation.data;

    logger.info('Updating scheduling rule', {
      ruleId: id,
      userId: req.user?.id,
    });

    // Get existing rule to check authorization
    const existingRule = await schedulingRulesService.getSchedulingRuleById(id);

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling rule not found',
      });
    }

    // Check authorization
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('ADMINISTRATOR') || userRoles.includes('SUPER_ADMIN');

    // Only admins can update org-wide rules
    if (!existingRule.clinicianId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update organization-wide scheduling rules',
      });
    }

    // Clinicians can only update their own rules
    if (existingRule.clinicianId && !isAdmin && existingRule.clinicianId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this scheduling rule',
      });
    }

    const rule = await schedulingRulesService.updateSchedulingRule(id, data);

    res.status(200).json({
      success: true,
      message: 'Scheduling rule updated successfully',
      data: rule,
    });
  } catch (error: any) {
    logger.error('Update scheduling rule error', {
      error: error.message,
      ruleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update scheduling rule',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/scheduling-rules/:id
 * Delete a scheduling rule
 */
export const deleteSchedulingRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Deleting scheduling rule', {
      ruleId: id,
      userId: req.user?.id,
    });

    // Get existing rule to check authorization
    const existingRule = await schedulingRulesService.getSchedulingRuleById(id);

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling rule not found',
      });
    }

    // Check authorization
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes('ADMINISTRATOR') || userRoles.includes('SUPER_ADMIN');

    // Only admins can delete org-wide rules
    if (!existingRule.clinicianId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete organization-wide scheduling rules',
      });
    }

    // Clinicians can only delete their own rules
    if (existingRule.clinicianId && !isAdmin && existingRule.clinicianId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this scheduling rule',
      });
    }

    await schedulingRulesService.deleteSchedulingRule(id);

    res.status(200).json({
      success: true,
      message: 'Scheduling rule deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete scheduling rule error', {
      error: error.message,
      ruleId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete scheduling rule',
      error: error.message,
    });
  }
};

/**
 * GET /api/scheduling-rules/effective/:clinicianId
 * Get effective scheduling rules for a clinician
 */
export const getEffectiveRules = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;

    logger.info('Getting effective scheduling rules', {
      clinicianId,
      userId: req.user?.id,
    });

    const rules = await schedulingRulesService.getEffectiveRules(clinicianId);

    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error: any) {
    logger.error('Get effective rules error', {
      error: error.message,
      clinicianId: req.params.clinicianId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve effective scheduling rules',
      error: error.message,
    });
  }
};
