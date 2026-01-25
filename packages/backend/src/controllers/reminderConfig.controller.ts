import { Request, Response } from 'express';
import * as reminderConfigService from '../services/reminderConfig.service';
import emailReminderService from '../services/emailReminder.service';
import userService from '../services/user.service';
import logger from '../utils/logger';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 3.2: Removed direct prisma import - using service methods instead
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * Get all reminder configurations
 * GET /api/v1/reminder-config
 */
export const getAllConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await reminderConfigService.getAllConfigs();

    return sendSuccess(res, configs, `Retrieved ${configs.length} reminder configurations`);
  } catch (error) {
    logger.error('Error getting all reminder configurations', {
      error: getErrorMessage(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve reminder configurations');
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
      return sendNotFound(res, 'Practice configuration');
    }

    return sendSuccess(res, config);
  } catch (error) {
    logger.error('Error getting practice reminder configuration', {
      error: getErrorMessage(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve practice configuration');
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
      return sendNotFound(res, 'User configuration');
    }

    return sendSuccess(res, config);
  } catch (error) {
    logger.error('Error getting user reminder configuration', {
      error: getErrorMessage(error),
      userId: req.params.userId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve user configuration');
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

    return sendSuccess(res, config, config ? 'Effective configuration retrieved' : 'No configuration found, using defaults');
  } catch (error) {
    logger.error('Error getting effective reminder configuration', {
      error: getErrorMessage(error),
      userId: req.user?.id,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve effective configuration');
  }
};

/**
 * Create a reminder configuration
 * POST /api/v1/reminder-config
 */
export const createConfig = async (req: Request, res: Response) => {
  try {
    const config = await reminderConfigService.createReminderConfig(req.body);

    return sendCreated(res, config, 'Reminder configuration created successfully');
  } catch (error) {
    logger.error('Error creating reminder configuration', {
      error: getErrorMessage(error),
      body: req.body,
    });

    return sendBadRequest(res, getErrorMessage(error) || 'Failed to create reminder configuration');
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

    return sendSuccess(res, config, 'Reminder configuration updated successfully');
  } catch (error) {
    logger.error('Error updating reminder configuration', {
      error: getErrorMessage(error),
      configId: req.params.id,
    });

    return sendBadRequest(res, getErrorMessage(error) || 'Failed to update reminder configuration');
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

    return sendSuccess(res, null, 'Reminder configuration deleted successfully');
  } catch (error) {
    logger.error('Error deleting reminder configuration', {
      error: getErrorMessage(error),
      configId: req.params.id,
    });

    return sendBadRequest(res, getErrorMessage(error) || 'Failed to delete reminder configuration');
  }
};

/**
 * Initialize default practice configuration
 * POST /api/v1/reminder-config/initialize
 */
export const initializeDefaults = async (req: Request, res: Response) => {
  try {
    const config = await reminderConfigService.initializeDefaultConfig();

    return sendSuccess(res, config, 'Default configuration initialized successfully');
  } catch (error) {
    logger.error('Error initializing default configuration', {
      error: getErrorMessage(error),
    });

    return sendBadRequest(res, getErrorMessage(error) || 'Failed to initialize default configuration');
  }
};

/**
 * Check if email service is configured
 * GET /api/v1/reminder-config/email-status
 */
export const getEmailStatus = async (req: Request, res: Response) => {
  try {
    const isConfigured = emailReminderService.isConfigured();

    return sendSuccess(res, {
      isConfigured,
      message: isConfigured
        ? 'Email service is configured and ready'
        : 'Email service is not configured. Please set SMTP environment variables.',
    });
  } catch (error) {
    logger.error('Error checking email status', {
      error: getErrorMessage(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to check email status');
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
      return sendBadRequest(res, 'Email service is not configured. Please set SMTP environment variables.');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const user = await userService.getUserBasicInfo(jwtUser.userId);

    if (!user) {
      return sendNotFound(res, 'User');
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
      return sendSuccess(res, null, `Test email sent successfully to ${user.email}`);
    } else {
      return sendServerError(res, 'Failed to send test email');
    }
  } catch (error) {
    logger.error('Error sending test email', {
      error: getErrorMessage(error),
      userId: req.user?.id,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to send test email');
  }
};
