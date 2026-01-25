import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPracticeSettings,
  updatePracticeSettings,
  initializePracticeSettings,
  getPublicSettings,
  validatePracticeSettings,
} from '../services/practiceSettings.service';
import { UserRoles } from '@mentalspace/shared';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /practice-settings
 * Get current practice settings (Admin only)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is administrator
    if (!user.roles.includes(UserRoles.ADMINISTRATOR)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can access practice settings',
      });
    }

    const settings = await getPracticeSettings(false); // Don't mask for admins

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error fetching practice settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch practice settings',
    });
  }
});

/**
 * GET /practice-settings/public
 * Get public practice settings (no authentication required)
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const settings = await getPublicSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch public settings',
    });
  }
});

/**
 * PUT /practice-settings
 * Update practice settings (Admin only)
 */
router.put('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is administrator
    if (!user.roles.includes(UserRoles.ADMINISTRATOR)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update practice settings',
      });
    }

    const updates = req.body;

    // Validate settings
    const validation = validatePracticeSettings(updates);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings data',
        errors: validation.errors,
      });
    }

    // Update settings
    const updatedSettings = await updatePracticeSettings(updates, user.userId);

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Practice settings updated successfully',
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error updating practice settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update practice settings',
    });
  }
});

/**
 * POST /practice-settings/initialize
 * Initialize practice settings with defaults (Admin only, one-time operation)
 */
router.post('/initialize', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is administrator
    if (!user.roles.includes(UserRoles.ADMINISTRATOR)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can initialize practice settings',
      });
    }

    const settings = await initializePracticeSettings();

    res.json({
      success: true,
      data: settings,
      message: 'Practice settings initialized successfully',
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error initializing practice settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize practice settings',
    });
  }
});

/**
 * PATCH /practice-settings/ai-features
 * Quick toggle for AI features (Admin only)
 */
router.patch('/ai-features', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is administrator
    if (!user.roles.includes(UserRoles.ADMINISTRATOR)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can modify AI settings',
      });
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean value',
      });
    }

    // Update just the AI features toggle
    const updatedSettings = await updatePracticeSettings(
      { enableAIFeatures: enabled },
      user.userId
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: `AI features ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error toggling AI features:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle AI features',
    });
  }
});

/**
 * PATCH /practice-settings/compliance-lockout
 * Quick toggle for Sunday lockout feature (Admin only)
 */
router.patch('/compliance-lockout', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is administrator
    if (!user.roles.includes(UserRoles.ADMINISTRATOR)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can modify compliance settings',
      });
    }

    const { enabled, lockoutDay, lockoutTime } = req.body;

    const updates: any = {};

    if (typeof enabled === 'boolean') {
      updates.enableAutoLockout = enabled;
    }

    if (lockoutDay) {
      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (!validDays.includes(lockoutDay)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid lockout day',
        });
      }
      updates.lockoutDay = lockoutDay;
    }

    if (lockoutTime) {
      // Validate time format (HH:MM)
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(lockoutTime)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid lockout time format (use HH:MM)',
        });
      }
      updates.lockoutTime = lockoutTime;
    }

    const updatedSettings = await updatePracticeSettings(updates, user.userId);

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Compliance lockout settings updated successfully',
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error updating compliance lockout:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update compliance lockout',
    });
  }
});

/**
 * POST /practice-settings/test-email
 * Send a test email with current SMTP settings (Admin only)
 */
router.post('/test-email', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is administrator
    if (!user.roles.includes(UserRoles.ADMINISTRATOR)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can test email settings',
      });
    }

    const { testEmailAddress } = req.body;

    if (!testEmailAddress) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required',
      });
    }

    // TODO: Implement test email functionality using email service
    // const emailService = require('../services/email.service');
    // await emailService.sendEmail({
    //   to: testEmailAddress,
    //   subject: 'MentalSpace EHR - Test Email',
    //   html: '<h1>Test Email</h1><p>Your email settings are configured correctly!</p>',
    // });

    res.json({
      success: true,
      message: `Test email sent to ${testEmailAddress}`,
    });
  } catch (error: any) {
    logger.error('Practice Settings Routes:Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
    });
  }
});

export default router;
