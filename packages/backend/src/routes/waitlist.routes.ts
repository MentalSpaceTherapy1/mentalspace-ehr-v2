import { Router } from 'express';
import {
  addToWaitlist,
  getWaitlistEntries,
  findAvailableSlots,
  offerAppointment,
  bookFromWaitlist,
  removeFromWaitlist,
  updatePriority,
  getMyWaitlistEntries,
  getMyWaitlistOffers,
  acceptWaitlistOffer,
  declineWaitlistOffer,
} from '../controllers/waitlist.controller';
import { authenticate } from '../middleware/auth';
import { authenticateDual } from '../middleware/dualAuth';

const router = Router();

// ============================================================================
// CLIENT-SPECIFIC ROUTES (Portal clients accessing their own data)
// These routes use authenticateDual to support both portal and staff tokens
// ============================================================================

// Get current client's waitlist entries
router.get('/my-entries', authenticateDual, getMyWaitlistEntries);

// Get current client's waitlist offers
router.get('/my-offers', authenticateDual, getMyWaitlistOffers);

// Accept a waitlist offer
router.post('/:entryId/accept/:offerId', authenticateDual, acceptWaitlistOffer);

// Decline a waitlist offer
router.post('/:entryId/decline/:offerId', authenticateDual, declineWaitlistOffer);

// ============================================================================
// STAFF-ONLY ROUTES (Admin view and mutations)
// These routes use authenticate (staff-only) to avoid race conditions
// ============================================================================

// Get all waitlist entries (with filters)
router.get('/', authenticate, getWaitlistEntries);

// Add client to waitlist
router.post('/', authenticate, addToWaitlist);

// Find available slots for a waitlist entry
router.get('/:id/available-slots', authenticate, findAvailableSlots);

// Offer appointment to waitlist client
router.post('/:id/offer', authenticate, offerAppointment);

// Book appointment from waitlist
router.post('/:id/book', authenticate, bookFromWaitlist);

// Update waitlist entry priority
router.patch('/:id/priority', authenticate, updatePriority);

// Remove client from waitlist
router.delete('/:id', authenticate, removeFromWaitlist);

export default router;
