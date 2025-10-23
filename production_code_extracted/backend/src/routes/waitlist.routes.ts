import { Router } from 'express';
import {
  addToWaitlist,
  getWaitlistEntries,
  findAvailableSlots,
  offerAppointment,
  bookFromWaitlist,
  removeFromWaitlist,
  updatePriority,
} from '../controllers/waitlist.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all waitlist entries (with filters)
router.get('/', getWaitlistEntries);

// Add client to waitlist
router.post('/', addToWaitlist);

// Find available slots for a waitlist entry
router.get('/:id/available-slots', findAvailableSlots);

// Offer appointment to waitlist client
router.post('/:id/offer', offerAppointment);

// Book appointment from waitlist
router.post('/:id/book', bookFromWaitlist);

// Update waitlist entry priority
router.patch('/:id/priority', updatePriority);

// Remove client from waitlist
router.delete('/:id', removeFromWaitlist);

export default router;
