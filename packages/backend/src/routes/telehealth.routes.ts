import { Router } from 'express';
import {
  createTelehealthSession,
  joinTelehealthSession,
  endTelehealthSession,
  getTelehealthSession,
  enableRecording as enableRecordingLegacy,
  stopRecording as stopRecordingLegacy,
  activateEmergency,
  getEmergencyContact,
} from '../controllers/telehealth.controller';
// PHASE 2 CONTROLLERS - Commented out until AWS SDK packages are installed
// import * as recordingController from '../controllers/recording.controller';
// import * as aiNoteController from '../controllers/aiNote.controller';
// import * as transcriptionController from '../controllers/transcription.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Webhook endpoint (no auth required - Twilio callback)
// PHASE 2 - Commented out until AWS SDK packages are installed
// router.post('/webhook/recording-status', recordingController.handleRecordingWebhook);

// All other routes require authentication
router.use(authMiddleware);

// Create telehealth session
router.post('/sessions', createTelehealthSession);

// Get telehealth session by appointment ID
router.get('/sessions/:appointmentId', getTelehealthSession);

// Join telehealth session
router.post('/sessions/join', joinTelehealthSession);

// End telehealth session
router.post('/sessions/end', endTelehealthSession);

// ============================================================================
// RECORDING ENDPOINTS (Phase 2) - COMMENTED OUT UNTIL AWS SDK INSTALLED
// ============================================================================

// Start recording (new endpoint with consent verification)
// router.post('/sessions/:sessionId/recording/start', recordingController.startRecording);

// Stop recording (new endpoint)
// router.post('/sessions/:sessionId/recording/stop', recordingController.stopRecording);

// Get recording details for session
// router.get('/sessions/:sessionId/recording', recordingController.getRecording);

// Get playback URL (presigned, expires in 1 hour)
// router.get('/sessions/:sessionId/recording/playback-url', recordingController.getPlaybackUrl);

// Download recording
// router.get('/sessions/:sessionId/recording/download', recordingController.downloadRecording);

// Delete recording
// router.delete('/recordings/:recordingId', recordingController.deleteRecording);

// List all recordings with filters
// router.get('/recordings', recordingController.listRecordings);

// Get recording configuration status
// router.get('/recording/status', recordingController.getRecordingStatus);

// ============================================================================
// LEGACY RECORDING ENDPOINTS (kept for backward compatibility)
// ============================================================================

// Enable recording (legacy)
router.post('/sessions/recording/start', enableRecordingLegacy);

// Stop recording (legacy)
router.post('/sessions/recording/stop/:sessionId', stopRecordingLegacy);

// ============================================================================
// EMERGENCY ENDPOINTS
// ============================================================================

router.post('/sessions/emergency', activateEmergency);
router.get('/sessions/:sessionId/emergency-contact', getEmergencyContact);

// ============================================================================
// MODULE 6 PHASE 2: AI NOTE GENERATION ENDPOINTS - COMMENTED OUT
// ============================================================================

// Generate AI note from transcript
// router.post('/sessions/:sessionId/generate-note', aiNoteController.generateNote);

// Get AI-generated note for a session
// router.get('/sessions/:sessionId/ai-note', aiNoteController.getAINote);

// Review and approve/reject AI note
// router.put('/sessions/:sessionId/ai-note/review', aiNoteController.reviewNote);

// Regenerate AI note with feedback
// router.post('/sessions/:sessionId/ai-note/regenerate', aiNoteController.regenerateNote);

// Export AI note to clinical note
// router.post('/sessions/:sessionId/ai-note/export', aiNoteController.exportToClinicalNote);

// Generate standalone risk assessment
// router.post('/sessions/:sessionId/risk-assessment', aiNoteController.generateRiskAssessment);

// Get audit logs for AI note
// router.get('/ai-notes/:aiNoteId/audit-logs', aiNoteController.getAuditLogs);

// ============================================================================
// MODULE 6 PHASE 2: AI TRANSCRIPTION ENDPOINTS - COMMENTED OUT
// ============================================================================

// Start transcription
// router.post('/sessions/:sessionId/transcription/start', transcriptionController.startTranscription);

// Stop transcription
// router.post('/sessions/:sessionId/transcription/stop', transcriptionController.stopTranscription);

// Get transcripts
// router.get('/sessions/:sessionId/transcription', transcriptionController.getTranscripts);

// Get transcription status
// router.get('/sessions/:sessionId/transcription/status', transcriptionController.getTranscriptionStatus);

// Get formatted transcript
// router.get('/sessions/:sessionId/transcription/formatted', transcriptionController.getFormattedTranscript);

// Export transcript as file
// router.get('/sessions/:sessionId/transcription/export', transcriptionController.exportTranscript);

// Update transcription consent
// router.post('/sessions/:sessionId/transcription/consent', transcriptionController.updateTranscriptionConsent);

// Delete transcripts (HIPAA compliance)
// router.delete('/sessions/:sessionId/transcription', transcriptionController.deleteTranscripts);

export default router;
