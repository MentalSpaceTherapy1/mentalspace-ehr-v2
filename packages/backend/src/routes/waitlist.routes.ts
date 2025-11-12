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
import { authenticateDual } from '../middleware/dualAuth';

const router = Router();

// All routes require authentication (accepts both staff AND portal tokens)
router.use(authenticateDual);

// ============================================================================
// CLIENT-SPECIFIC ROUTES (Portal clients accessing their own data)
// ============================================================================

// Get current client's waitlist entries
router.get('/my-entries', getMyWaitlistEntries);

// Get current client's waitlist offers
router.get('/my-offers', getMyWaitlistOffers);

// Accept a waitlist offer
router.post('/:entryId/accept/:offerId', acceptWaitlistOffer);

// Decline a waitlist offer
router.post('/:entryId/decline/:offerId', declineWaitlistOffer);

// ============================================================================
// GENERAL ROUTES (Staff admin view and mutations)
// ============================================================================

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
