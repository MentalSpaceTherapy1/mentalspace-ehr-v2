import { Router } from 'express';
import { authorize } from '../middleware/auth';
import { authenticateDual } from '../middleware/dualAuth';
import { UserRoles } from '@mentalspace/shared';

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
  getClinicianNotes,
  createProgressNote,
} from '../controllers/progress-analytics.controller';

const router = Router();

// All routes require authentication (accepts both staff and portal tokens)
router.use(authenticateDual);

// ============================================================================
// SYMPTOM TRACKING ROUTES
// ============================================================================

// Create symptom log (clients can create their own, clinicians can create for clients)
router.post(
  '/symptoms/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  createSymptomLog
);

// Get symptom logs (with filtering)
router.get(
  '/symptoms/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSymptomLogs
);

// Get single symptom log
router.get(
  '/symptoms/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSymptomLogById
);

// Update symptom log
router.put(
  '/symptoms/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  updateSymptomLog
);

// Delete symptom log
router.delete(
  '/symptoms/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  deleteSymptomLog
);

// Get symptom trends
router.get(
  '/symptoms/:clientId/trends',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSymptomTrends
);

// Get symptom summary
router.get(
  '/symptoms/:clientId/summary',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSymptomSummary
);

// ============================================================================
// SLEEP TRACKING ROUTES
// ============================================================================

// Create sleep log
router.post(
  '/sleep/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  createSleepLog
);

// Get sleep logs (with filtering)
router.get(
  '/sleep/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSleepLogs
);

// Get single sleep log
router.get(
  '/sleep/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSleepLogById
);

// Update sleep log
router.put(
  '/sleep/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  updateSleepLog
);

// Delete sleep log
router.delete(
  '/sleep/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  deleteSleepLog
);

// Get sleep metrics
router.get(
  '/sleep/:clientId/metrics',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSleepMetrics
);

// Get sleep trends
router.get(
  '/sleep/:clientId/trends',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getSleepTrends
);

// ============================================================================
// EXERCISE TRACKING ROUTES
// ============================================================================

// Create exercise log
router.post(
  '/exercise/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  createExerciseLog
);

// Get exercise logs (with filtering)
router.get(
  '/exercise/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getExerciseLogs
);

// Get single exercise log
router.get(
  '/exercise/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getExerciseLogById
);

// Update exercise log
router.put(
  '/exercise/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  updateExerciseLog
);

// Delete exercise log
router.delete(
  '/exercise/log/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  deleteExerciseLog
);

// Get exercise stats
router.get(
  '/exercise/:clientId/stats',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getExerciseStats
);

// Get exercise trends
router.get(
  '/exercise/:clientId/trends',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getExerciseTrends
);

// ============================================================================
// PROGRESS ANALYTICS ROUTES
// ============================================================================

// Get combined analytics
router.get(
  '/analytics/:clientId/combined',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getCombinedAnalytics
);

// Generate progress report
router.get(
  '/analytics/:clientId/report',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  generateProgressReport
);

// Compare to goals
router.get(
  '/analytics/:clientId/goals',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  compareToGoals
);

// ============================================================================
// DATA EXPORT ROUTES
// ============================================================================

// Export to CSV
router.get(
  '/export/:clientId/csv',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  exportToCSV
);

// Export to JSON
router.get(
  '/export/:clientId/json',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  exportToJSON
);

// Generate PDF data
router.get(
  '/export/:clientId/pdf',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  generatePDFData
);

// ============================================================================
// REMINDER ROUTES
// ============================================================================

// Get reminder preferences
router.get(
  '/reminders/:clientId/preferences',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getReminderPreferences
);

// Update reminder preferences
router.put(
  '/reminders/:clientId/preferences',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLIENT),
  updateReminderPreferences
);

// Get logging streak
router.get(
  '/reminders/:clientId/streak',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLIENT),
  getLoggingStreak
);

// Get engagement score
router.get(
  '/reminders/:clientId/engagement',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN),
  getEngagementScore
);

// ============================================================================
// CLINICIAN NOTES ROUTES
// ============================================================================

// Get clinician notes for a client (from clinical notes)
router.get(
  '/notes/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN),
  getClinicianNotes
);

// Create a progress observation note
router.post(
  '/notes/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN),
  createProgressNote
);

export default router;
