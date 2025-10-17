import { Router } from 'express';
import * as dashboardController from '../controllers/portal/dashboard.controller';
import * as phase1Controller from '../controllers/portal/phase1.controller';
import * as documentsController from '../controllers/portal/documents.controller';
import * as assessmentsController from '../controllers/portal/assessments.controller';
import * as appointmentRequestController from '../controllers/portal/appointmentRequest.controller';
import * as referralController from '../controllers/portal/referral.controller';
import * as therapistProfileController from '../controllers/portal/therapistProfile.controller';
import * as billingController from '../controllers/portal/billing.controller';
import * as profileController from '../controllers/portal/profile.controller';
import * as messagesController from '../controllers/portal/messages.controller';
import * as moodTrackingController from '../controllers/portal/moodTracking.controller';
import { authenticatePortal } from '../middleware/portalAuth';

const router = Router();

// ========== PROTECTED ROUTES (Require authentication) ==========
// Note: Auth routes are in /portal-auth (see portalAuth.routes.ts)

// Dashboard
router.get('/dashboard', authenticatePortal, dashboardController.getDashboard);

// Profile & Account Management
router.get('/profile', authenticatePortal, profileController.getProfile);
router.put('/profile', authenticatePortal, profileController.updateProfile);
router.get('/account/settings', authenticatePortal, profileController.getAccountSettings);
router.put('/account/notifications', authenticatePortal, profileController.updateNotificationPreferences);
router.post('/account/change-password', authenticatePortal, profileController.changePassword);

// Appointments - Specific routes MUST come before wildcard routes
router.get('/appointments/upcoming', authenticatePortal, dashboardController.getUpcomingAppointments);
router.get('/appointments/past', authenticatePortal, dashboardController.getPastAppointments);

// Appointment Requests (New Appointments) - These must come BEFORE :appointmentId wildcard
router.get('/appointments/types', authenticatePortal, appointmentRequestController.getAppointmentTypes);
router.get('/appointments/requested', authenticatePortal, appointmentRequestController.getRequestedAppointments);
router.get('/appointments/availability', authenticatePortal, appointmentRequestController.getTherapistAvailability);
router.post('/appointments/request', authenticatePortal, appointmentRequestController.requestAppointment);
router.delete('/appointments/request/:appointmentId', authenticatePortal, appointmentRequestController.cancelRequestedAppointment);

// Appointment Details - Wildcard route MUST be last
router.get('/appointments/:appointmentId', authenticatePortal, dashboardController.getAppointmentDetails);
router.post('/appointments/:appointmentId/cancel', authenticatePortal, dashboardController.cancelAppointment);

// Messages (Secure Communication)
router.get('/messages', authenticatePortal, messagesController.getMessages);
router.post('/messages', authenticatePortal, messagesController.sendMessage);
router.get('/messages/unread-count', authenticatePortal, messagesController.getUnreadCount);
router.get('/messages/thread/:threadId', authenticatePortal, messagesController.getMessageThread);
router.post('/messages/:messageId/reply', authenticatePortal, messagesController.replyToMessage);
router.post('/messages/:messageId/read', authenticatePortal, messagesController.markMessageAsRead);

// ========== PHASE 1: CORE TRANSACTIONAL FEATURES ==========

// Billing & Payments
router.get('/billing/balance', authenticatePortal, billingController.getBalance);
router.get('/billing/charges', authenticatePortal, billingController.getCharges);
router.get('/billing/payments', authenticatePortal, billingController.getPayments);
router.post('/billing/payments', authenticatePortal, billingController.makePayment);

// Payment Methods (TODO: Implement payment method management)
router.post('/billing/payment-methods', authenticatePortal, phase1Controller.addPaymentMethod);
router.get('/billing/payment-methods', authenticatePortal, phase1Controller.getPaymentMethods);
router.put('/billing/payment-methods/default', authenticatePortal, phase1Controller.setDefaultPaymentMethod);
router.delete('/billing/payment-methods/:paymentMethodId', authenticatePortal, phase1Controller.removePaymentMethod);

// Insurance Cards
router.post('/insurance/cards', authenticatePortal, phase1Controller.uploadInsuranceCard);
router.get('/insurance/cards', authenticatePortal, phase1Controller.getInsuranceCards);

// Session Reviews
router.post('/reviews', authenticatePortal, phase1Controller.createSessionReview);
router.get('/reviews', authenticatePortal, phase1Controller.getClientReviews);
router.put('/reviews/:reviewId/sharing', authenticatePortal, phase1Controller.updateReviewSharing);

// Therapist Change Requests
router.post('/therapist-change-requests', authenticatePortal, phase1Controller.createChangeRequest);
router.get('/therapist-change-requests', authenticatePortal, phase1Controller.getClientChangeRequests);
router.delete('/therapist-change-requests/:requestId', authenticatePortal, phase1Controller.cancelChangeRequest);

// Mood Tracking
router.post('/mood-entries', authenticatePortal, moodTrackingController.createMoodEntry);
router.get('/mood-entries', authenticatePortal, moodTrackingController.getMoodEntries);
router.get('/mood-entries/trends', authenticatePortal, moodTrackingController.getMoodTrends);

// ========== DOCUMENTS & FORMS ==========

// Form Assignments
router.get('/forms/assignments', authenticatePortal, documentsController.getFormAssignments);
router.get('/forms/:formId', authenticatePortal, documentsController.getFormDetails);
router.post('/forms/:formId/submit', authenticatePortal, documentsController.submitForm);

// Documents
router.get('/documents/shared', authenticatePortal, documentsController.getSharedDocuments);
router.get('/documents/:documentId/download', authenticatePortal, documentsController.downloadDocument);
router.post('/documents/upload', authenticatePortal, documentsController.uploadDocument);
router.get('/documents/uploads', authenticatePortal, documentsController.getUploadedDocuments);

// ========== ASSESSMENTS ==========

// Assessment Assignments
router.get('/assessments/pending', authenticatePortal, assessmentsController.getPendingAssessments);
router.get('/assessments/completed', authenticatePortal, assessmentsController.getCompletedAssessments);
router.get('/assessments/history', authenticatePortal, assessmentsController.getAssessmentHistory);
router.get('/assessments/:assessmentId', authenticatePortal, assessmentsController.getAssessmentDetails);
router.post('/assessments/:assessmentId/start', authenticatePortal, assessmentsController.startAssessment);
router.post('/assessments/:assessmentId/submit', authenticatePortal, assessmentsController.submitAssessment);
router.get('/assessments/:assessmentId/results', authenticatePortal, assessmentsController.getAssessmentResults);

// ========== CLIENT REFERRALS ==========

router.post('/referrals', authenticatePortal, referralController.submitReferral);
router.get('/referrals', authenticatePortal, referralController.getReferrals);
router.get('/referrals/stats', authenticatePortal, referralController.getReferralStats);
router.get('/referrals/:referralId', authenticatePortal, referralController.getReferralDetails);

// ========== THERAPIST PROFILES ==========

router.get('/therapist/profile', authenticatePortal, therapistProfileController.getMyTherapistProfile);
router.get('/therapist/profile/:therapistId', authenticatePortal, therapistProfileController.getTherapistProfile);
router.get('/therapist/available', authenticatePortal, therapistProfileController.getAvailableTherapists);
router.get('/therapist/search', authenticatePortal, therapistProfileController.searchTherapists);

export default router;
