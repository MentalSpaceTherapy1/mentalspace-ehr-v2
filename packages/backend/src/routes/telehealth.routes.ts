import { Router } from 'express';
import {
  createTelehealthSession,
  joinTelehealthSession,
  endTelehealthSession,
  getTelehealthSession,
  enableRecording,
  stopRecording,
} from '../controllers/telehealth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create telehealth session
router.post('/sessions', createTelehealthSession);

// Get telehealth session by appointment ID
router.get('/sessions/:appointmentId', getTelehealthSession);

// Join telehealth session
router.post('/sessions/join', joinTelehealthSession);

// End telehealth session
router.post('/sessions/end', endTelehealthSession);

// Enable recording
router.post('/sessions/recording/start', enableRecording);

// Stop recording
router.post('/sessions/recording/stop/:sessionId', stopRecording);

export default router;
