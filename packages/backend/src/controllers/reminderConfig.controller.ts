import { Request, Response } from 'express';
import * as reminderConfigService from '../services/reminderConfig.service';
import emailReminderService from '../services/emailReminder.service';
import logger from '../utils/logger';
import prisma from '../services/database';

/**
 * Get all reminder configurations
 * GET /api/v1/reminder-config
 */
export const getAllConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await reminderConfigService.getAllConfigs();

    res.status(200).json({
      success: true,
      data: configs,
      message: `Retrieved ${configs.length} reminder configurations`,
    });
  } catch (error: any) {
    logger.error('Error getting all reminder configurations', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve reminder configurations',
    });
  }
};

/**
 * Get practice-wide configuration
 * GET /api/v1/reminder-config/practice
 */
export const getPracticeConfig = async (req: Request, res: Response) => {
  try {
    const config = await reminderConfigService.getPracticeConfig();

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Practice configuration not found',
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('Error getting practice reminder configuration', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve practice configuration',
    });
  }
};

/**
 * Get user-specific configuration
 * GET /api/v1/reminder-config/user/:userId
 */
export const getUserConfig = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const config = await reminderConfigService.getUserConfig(userId);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'User configuration not found',
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('Error getting user reminder configuration', {
      error: error.message,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user configuration',
    });
  }
};

/**
 * Get effective configuration for current user
 * GET /api/v1/reminder-config/effective
 */
export const getEffectiveConfig = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { noteType } = req.query;

    const config = await reminderConfigService.getEffectiveConfig(
      userId,
      noteType as string | undefined
    );

    res.status(200).json({
      success: true,
      data: config,
      message: config ? 'Effective configuration retrieved' : 'No configuration found, using defaults',
    });
  } catch (error: any) {
    logger.error('Error getting effective reminder configuration', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve effective configuration',
    });
  }
};

/**
 * Create a reminder configuration
 * POST /api/v1/reminder-config
 */
export const createConfig = async (req: Request, res: Response) => {
  try {
    const config = await reminderConfigService.createReminderConfig(req.body);

    res.status(201).json({
      success: true,
      data: config,
      message: 'Reminder configuration created successfully',
    });
  } catch (error: any) {
    logger.error('Error creating reminder configuration', {
      error: error.message,
      body: req.body,
    });

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create reminder configuration',
    });
  }
};

/**
 * Update a reminder configuration
 * PUT /api/v1/reminder-config/:id
 */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const config = await reminderConfigService.updateReminderConfig({
      id,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      data: config,
      message: 'Reminder configuration updated successfully',
    });
  } catch (error: any) {
    logger.error('Error updating reminder configuration', {
      error: error.message,
      configId: req.params.id,
    });

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update reminder configuration',
    });
  }
};

/**
 * Delete a reminder configuration
 * DELETE /api/v1/reminder-config/:id
 */
export const deleteConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await reminderConfigService.deleteReminderConfig(id);

    res.status(200).json({
      success: true,
      message: 'Reminder configuration deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting reminder configuration', {
      error: error.message,
      configId: req.params.id,
    });

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete reminder configuration',
    });
  }
};

/**
 * Initialize default practice configuration
 * POST /api/v1/reminder-config/initialize
 */
export const initializeDefaults = async (req: Request, res: Response) => {
  try {
    const config = await reminderConfigService.initializeDefaultConfig();

    res.status(200).json({
      success: true,
      data: config,
      message: 'Default configuration initialized successfully',
    });
  } catch (error: any) {
    logger.error('Error initializing default configuration', {
      error: error.message,
    });

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to initialize default configuration',
    });
  }
};

/**
 * Check if email service is configured
 * GET /api/v1/reminder-config/email-status
 */
export const getEmailStatus = async (req: Request, res: Response) => {
  try {
    const isConfigured = emailReminderService.isConfigured();

    res.status(200).json({
      success: true,
      data: {
        isConfigured,
        message: isConfigured
          ? 'Email service is configured and ready'
          : 'Email service is not configured. Please set SMTP environment variables.',
      },
    });
  } catch (error: any) {
    logger.error('Error checking email status', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check email status',
    });
  }
};

/**
 * Send a test email to verify configuration
 * POST /api/v1/reminder-config/test-email
 */
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const jwtUser = req.user!;

    if (!emailReminderService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Email service is not configured. Please set SMTP environment variables.',
      });
    }

    // Fetch actual user from database to get firstName/lastName
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Send a test reminder (using current user's info as test data)
    const testNote: any = {
      id: 'test-note-id',
      noteType: 'PROGRESS_NOTE',
      sessionDate: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      client: {
        firstName: 'Test',
        lastName: 'Client',
      },
      clinician: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };

    const sent = await emailReminderService.sendDueSoonReminder({
      recipientEmail: user.email,
      recipientName: `${user.firstName} ${user.lastName}`,
      note: testNote,
      reminderType: 'DUE_SOON',
      hoursRemaining: 24,
    });

    if (sent) {
      res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${user.email}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
      });
    }
  } catch (error: any) {
    logger.error('Error sending test email', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email',
    });
  }
};
