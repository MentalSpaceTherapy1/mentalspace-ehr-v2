import { Router } from 'express';
import { authorize } from '../middleware/auth';
import { authenticateDual } from '../middleware/dualAuth';

// Symptom tracking controllers
import {
  createSymptomLog,
  getSymptomLogs,
  getSymptomLogById,
  updateSymptomLog,
  deleteSymptomLog,
  getSymptomTrends,
  getSymptomSummary,
} from '../controllers/symptom-tracking.controller';

// Sleep tracking controllers
import {
  createSleepLog,
  getSleepLogs,
  getSleepLogById,
  updateSleepLog,
  deleteSleepLog,
  getSleepMetrics,
  getSleepTrends,
} from '../controllers/sleep-tracking.controller';

// Exercise tracking controllers
import {
  createExerciseLog,
  getExerciseLogs,
  getExerciseLogById,
  updateExerciseLog,
  deleteExerciseLog,
  getExerciseStats,
  getExerciseTrends,
} from '../controllers/exercise-tracking.controller';

// Progress analytics controllers
import {
  getCombinedAnalytics,
  generateProgressReport,
  compareToGoals,
  exportToCSV,
  exportToJSON,
  generatePDFData,
  getReminderPreferences,
  updateReminderPreferences,
  getLoggingStreak,
  getEngagementScore,
} from '../controllers/progress-analytics.controller';

const router = Router();

console.log('[PROGRESS-TRACKING] Router being created, applying authenticateDual middleware');

// All routes require authentication (accepts both staff and portal tokens)
router.use(authenticateDual);
console.log('[PROGRESS-TRACKING] authenticateDual middleware applied');

// ============================================================================
// SYMPTOM TRACKING ROUTES
// ============================================================================

// Create symptom log (clients can create their own, clinicians can create for clients)
router.post(
  '/symptoms/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  createSymptomLog
);

// Get symptom logs (with filtering)
router.get(
  '/symptoms/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSymptomLogs
);

// Get single symptom log
router.get(
  '/symptoms/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSymptomLogById
);

// Update symptom log
router.put(
  '/symptoms/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  updateSymptomLog
);

// Delete symptom log
router.delete(
  '/symptoms/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  deleteSymptomLog
);

// Get symptom trends
router.get(
  '/symptoms/:clientId/trends',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSymptomTrends
);

// Get symptom summary
router.get(
  '/symptoms/:clientId/summary',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSymptomSummary
);

// ============================================================================
// SLEEP TRACKING ROUTES
// ============================================================================

// Create sleep log
router.post(
  '/sleep/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  createSleepLog
);

// Get sleep logs (with filtering)
router.get(
  '/sleep/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSleepLogs
);

// Get single sleep log
router.get(
  '/sleep/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSleepLogById
);

// Update sleep log
router.put(
  '/sleep/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  updateSleepLog
);

// Delete sleep log
router.delete(
  '/sleep/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  deleteSleepLog
);

// Get sleep metrics
router.get(
  '/sleep/:clientId/metrics',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSleepMetrics
);

// Get sleep trends
router.get(
  '/sleep/:clientId/trends',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getSleepTrends
);

// ============================================================================
// EXERCISE TRACKING ROUTES
// ============================================================================

// Create exercise log
router.post(
  '/exercise/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  createExerciseLog
);

// Get exercise logs (with filtering)
router.get(
  '/exercise/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getExerciseLogs
);

// Get single exercise log
router.get(
  '/exercise/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getExerciseLogById
);

// Update exercise log
router.put(
  '/exercise/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  updateExerciseLog
);

// Delete exercise log
router.delete(
  '/exercise/log/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  deleteExerciseLog
);

// Get exercise stats
router.get(
  '/exercise/:clientId/stats',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getExerciseStats
);

// Get exercise trends
router.get(
  '/exercise/:clientId/trends',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getExerciseTrends
);

// ============================================================================
// PROGRESS ANALYTICS ROUTES
// ============================================================================

// Get combined analytics
router.get(
  '/analytics/:clientId/combined',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getCombinedAnalytics
);

// Generate progress report
router.get(
  '/analytics/:clientId/report',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  generateProgressReport
);

// Compare to goals
router.get(
  '/analytics/:clientId/goals',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  compareToGoals
);

// ============================================================================
// DATA EXPORT ROUTES
// ============================================================================

// Export to CSV
router.get(
  '/export/:clientId/csv',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  exportToCSV
);

// Export to JSON
router.get(
  '/export/:clientId/json',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  exportToJSON
);

// Generate PDF data
router.get(
  '/export/:clientId/pdf',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  generatePDFData
);

// ============================================================================
// REMINDER ROUTES
// ============================================================================

// Get reminder preferences
router.get(
  '/reminders/:clientId/preferences',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getReminderPreferences
);

// Update reminder preferences
router.put(
  '/reminders/:clientId/preferences',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLIENT'),
  updateReminderPreferences
);

// Get logging streak
router.get(
  '/reminders/:clientId/streak',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT'),
  getLoggingStreak
);

// Get engagement score
router.get(
  '/reminders/:clientId/engagement',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'),
  getEngagementScore
);

export default router;
