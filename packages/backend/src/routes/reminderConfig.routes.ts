import { Router } from 'express';
import * as reminderConfigController from '../controllers/reminderConfig.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all configurations (admin only)
router.get('/', reminderConfigController.getAllConfigs);

// Get practice configuration
router.get('/practice', reminderConfigController.getPracticeConfig);

// Get user-specific configuration
router.get('/user/:userId', reminderConfigController.getUserConfig);

// Get effective configuration for current user
router.get('/effective', reminderConfigController.getEffectiveConfig);

// Create a configuration
router.post('/', reminderConfigController.createConfig);

// Initialize default configuration
router.post('/initialize', reminderConfigController.initializeDefaults);

// Update a configuration
router.put('/:id', reminderConfigController.updateConfig);

// Delete a configuration
router.delete('/:id', reminderConfigController.deleteConfig);

// Check email service status
router.get('/email-status', reminderConfigController.getEmailStatus);

// Send test email
router.post('/test-email', reminderConfigController.sendTestEmail);

export default router;
