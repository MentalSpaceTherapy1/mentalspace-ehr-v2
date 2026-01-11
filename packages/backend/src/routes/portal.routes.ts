import { Router, RequestHandler } from 'express';
import * as dashboardController from '../controllers/portal/dashboard.controller';

// Helper to cast portal controllers to RequestHandler (they use PortalRequest which extends Request)
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;
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
import * as symptomTrackingController from '../controllers/portal/symptomTracking.controller';
import * as sleepTrackingController from '../controllers/portal/sleepTracking.controller';
import * as exerciseTrackingController from '../controllers/portal/exerciseTracking.controller';
import * as telehealthController from '../controllers/portal/telehealth.controller';
import * as selfSchedulingController from '../controllers/portal/selfScheduling.controller';
import * as waitlistController from '../controllers/portal/waitlist.controller';
import { authenticatePortal } from '../middleware/portalAuth';

const router = Router();

// ========== PROTECTED ROUTES (Require authentication) ==========
// Note: Auth routes are in /portal-auth (see portalAuth.routes.ts)

// Dashboard
router.get('/dashboard', authenticatePortal, asHandler(dashboardController.getDashboard));

// Profile & Account Management
router.get('/profile', authenticatePortal, asHandler(profileController.getProfile));
router.put('/profile', authenticatePortal, asHandler(profileController.updateProfile));
router.get('/account/settings', authenticatePortal, asHandler(profileController.getAccountSettings));
router.put('/account/notifications', authenticatePortal, asHandler(profileController.updateNotificationPreferences));
router.post('/account/change-password', authenticatePortal, asHandler(profileController.changePassword));

// Appointments - Specific routes MUST come before wildcard routes
router.get('/appointments/upcoming', authenticatePortal, asHandler(dashboardController.getUpcomingAppointments));
router.get('/appointments/past', authenticatePortal, asHandler(dashboardController.getPastAppointments));

// Appointment Requests (New Appointments) - These must come BEFORE :appointmentId wildcard
router.get('/appointments/types', authenticatePortal, asHandler(appointmentRequestController.getAppointmentTypes));
router.get('/appointments/requested', authenticatePortal, asHandler(appointmentRequestController.getRequestedAppointments));
router.get('/appointments/availability', authenticatePortal, asHandler(appointmentRequestController.getTherapistAvailability));
router.post('/appointments/request', authenticatePortal, asHandler(appointmentRequestController.requestAppointment));
router.delete('/appointments/request/:appointmentId', authenticatePortal, asHandler(appointmentRequestController.cancelRequestedAppointment));

// Appointment Details - Wildcard route MUST be last
router.get('/appointments/:appointmentId', authenticatePortal, asHandler(dashboardController.getAppointmentDetails));
router.post('/appointments/:appointmentId/cancel', authenticatePortal, asHandler(dashboardController.cancelAppointment));

// Messages (Secure Communication)
router.get('/messages', authenticatePortal, asHandler(messagesController.getMessages));
router.post('/messages', authenticatePortal, asHandler(messagesController.sendMessage));
router.get('/messages/unread-count', authenticatePortal, asHandler(messagesController.getUnreadCount));
router.get('/messages/thread/:threadId', authenticatePortal, asHandler(messagesController.getMessageThread));
router.post('/messages/:messageId/reply', authenticatePortal, asHandler(messagesController.replyToMessage));
router.post('/messages/:messageId/read', authenticatePortal, asHandler(messagesController.markMessageAsRead));

// ========== PHASE 1: CORE TRANSACTIONAL FEATURES ==========

// Billing & Payments
router.get('/billing/balance', authenticatePortal, asHandler(billingController.getBalance));
router.get('/billing/charges', authenticatePortal, asHandler(billingController.getCharges));
router.get('/billing/payments', authenticatePortal, asHandler(billingController.getPayments));
router.post('/billing/payments', authenticatePortal, asHandler(billingController.makePayment));

// Payment Methods (TODO: Implement payment method management)
router.post('/billing/payment-methods', authenticatePortal, asHandler(phase1Controller.addPaymentMethod));
router.get('/billing/payment-methods', authenticatePortal, asHandler(phase1Controller.getPaymentMethods));
router.put('/billing/payment-methods/default', authenticatePortal, asHandler(phase1Controller.setDefaultPaymentMethod));
router.delete('/billing/payment-methods/:paymentMethodId', authenticatePortal, asHandler(phase1Controller.removePaymentMethod));

// Insurance Cards
router.post('/insurance/cards', authenticatePortal, asHandler(phase1Controller.uploadInsuranceCard));
router.get('/insurance/cards', authenticatePortal, asHandler(phase1Controller.getInsuranceCards));

// Session Reviews
router.post('/reviews', authenticatePortal, asHandler(phase1Controller.createSessionReview));
router.get('/reviews', authenticatePortal, asHandler(phase1Controller.getClientReviews));
router.put('/reviews/:reviewId/sharing', authenticatePortal, asHandler(phase1Controller.updateReviewSharing));

// Therapist Change Requests
router.post('/therapist-change-requests', authenticatePortal, asHandler(phase1Controller.createChangeRequest));
router.get('/therapist-change-requests', authenticatePortal, asHandler(phase1Controller.getClientChangeRequests));
router.delete('/therapist-change-requests/:requestId', authenticatePortal, asHandler(phase1Controller.cancelChangeRequest));

// Mood Tracking
router.post('/mood-entries', authenticatePortal, asHandler(moodTrackingController.createMoodEntry));
router.get('/mood-entries', authenticatePortal, asHandler(moodTrackingController.getMoodEntries));
router.get('/mood-entries/trends', authenticatePortal, asHandler(moodTrackingController.getMoodTrends));

// Symptom Diary - Specific routes MUST come before :logId wildcard
router.post('/symptom-diary', authenticatePortal, asHandler(symptomTrackingController.createSymptomLog));
router.get('/symptom-diary', authenticatePortal, asHandler(symptomTrackingController.getSymptomLogs));
router.get('/symptom-diary/trends', authenticatePortal, asHandler(symptomTrackingController.getSymptomTrends));
router.get('/symptom-diary/:logId', authenticatePortal, asHandler(symptomTrackingController.getSymptomLogById));
router.put('/symptom-diary/:logId', authenticatePortal, asHandler(symptomTrackingController.updateSymptomLog));
router.delete('/symptom-diary/:logId', authenticatePortal, asHandler(symptomTrackingController.deleteSymptomLog));

// Sleep Diary - Specific routes MUST come before :logId wildcard
router.post('/sleep-diary', authenticatePortal, asHandler(sleepTrackingController.createSleepLog));
router.get('/sleep-diary', authenticatePortal, asHandler(sleepTrackingController.getSleepLogs));
router.get('/sleep-diary/trends', authenticatePortal, asHandler(sleepTrackingController.getSleepTrends));
router.get('/sleep-diary/:logId', authenticatePortal, asHandler(sleepTrackingController.getSleepLogById));
router.put('/sleep-diary/:logId', authenticatePortal, asHandler(sleepTrackingController.updateSleepLog));
router.delete('/sleep-diary/:logId', authenticatePortal, asHandler(sleepTrackingController.deleteSleepLog));

// Exercise Log - Specific routes MUST come before :logId wildcard
router.post('/exercise-log', authenticatePortal, asHandler(exerciseTrackingController.createExerciseLog));
router.get('/exercise-log', authenticatePortal, asHandler(exerciseTrackingController.getExerciseLogs));
router.get('/exercise-log/stats', authenticatePortal, asHandler(exerciseTrackingController.getExerciseStats));
router.get('/exercise-log/:logId', authenticatePortal, asHandler(exerciseTrackingController.getExerciseLogById));
router.put('/exercise-log/:logId', authenticatePortal, asHandler(exerciseTrackingController.updateExerciseLog));
router.delete('/exercise-log/:logId', authenticatePortal, asHandler(exerciseTrackingController.deleteExerciseLog));

// ========== TELEHEALTH ==========

// Telehealth consent and session access
router.get('/telehealth/consent-status', authenticatePortal, asHandler(telehealthController.getConsentStatus));
router.get('/telehealth/session/:appointmentId', authenticatePortal, asHandler(telehealthController.getSession));
router.post('/telehealth/session/:appointmentId/join', authenticatePortal, asHandler(telehealthController.joinSession));
router.post('/telehealth/session/:appointmentId/leave', authenticatePortal, asHandler(telehealthController.leaveSession));
router.post('/telehealth/session/:sessionId/rate', authenticatePortal, asHandler(telehealthController.rateSession));

// ========== SELF-SCHEDULING ==========

// Get available clinicians and slots
router.get('/self-schedule/clinicians', authenticatePortal, asHandler(selfSchedulingController.getAvailableClinicians));
router.get('/self-schedule/slots/:clinicianId', authenticatePortal, asHandler(selfSchedulingController.getAvailableSlots));
router.get('/self-schedule/appointment-types', authenticatePortal, asHandler(selfSchedulingController.getAppointmentTypes));

// Appointment management
router.post('/self-schedule/book', authenticatePortal, asHandler(selfSchedulingController.bookAppointment));
router.put('/self-schedule/reschedule/:appointmentId', authenticatePortal, asHandler(selfSchedulingController.rescheduleAppointment));
router.delete('/self-schedule/cancel/:appointmentId', authenticatePortal, asHandler(selfSchedulingController.cancelAppointment));
router.get('/self-schedule/my-appointments', authenticatePortal, asHandler(selfSchedulingController.getMyAppointments));

// ========== WAITLIST ==========

// Client waitlist management
router.post('/waitlist', authenticatePortal, asHandler(waitlistController.joinWaitlist));
router.get('/waitlist/my-entries', authenticatePortal, asHandler(waitlistController.getMyWaitlistEntries));
router.get('/waitlist/my-offers', authenticatePortal, asHandler(waitlistController.getMyWaitlistOffers));
router.delete('/waitlist/:entryId', authenticatePortal, asHandler(waitlistController.leaveWaitlist));

// ========== DOCUMENTS & FORMS ==========

// Form Assignments
router.get('/forms/assignments', authenticatePortal, asHandler(documentsController.getFormAssignments));
router.get('/forms/:formId', authenticatePortal, asHandler(documentsController.getFormDetails));
router.post('/forms/:formId/submit', authenticatePortal, asHandler(documentsController.submitForm));

// Documents
router.get('/documents/shared', authenticatePortal, asHandler(documentsController.getSharedDocuments));
router.get('/documents/:documentId/download', authenticatePortal, asHandler(documentsController.downloadDocument));
router.post('/documents/upload', authenticatePortal, asHandler(documentsController.uploadDocument));
router.get('/documents/uploads', authenticatePortal, asHandler(documentsController.getUploadedDocuments));

// ========== ASSESSMENTS ==========

// Assessment Assignments
router.get('/assessments/pending', authenticatePortal, asHandler(assessmentsController.getPendingAssessments));
router.get('/assessments/completed', authenticatePortal, asHandler(assessmentsController.getCompletedAssessments));
router.get('/assessments/history', authenticatePortal, asHandler(assessmentsController.getAssessmentHistory));
router.get('/assessments/:assessmentId', authenticatePortal, asHandler(assessmentsController.getAssessmentDetails));
router.post('/assessments/:assessmentId/start', authenticatePortal, asHandler(assessmentsController.startAssessment));
router.post('/assessments/:assessmentId/submit', authenticatePortal, asHandler(assessmentsController.submitAssessment));
router.get('/assessments/:assessmentId/results', authenticatePortal, asHandler(assessmentsController.getAssessmentResults));

// ========== CLIENT REFERRALS ==========

router.post('/referrals', authenticatePortal, asHandler(referralController.submitReferral));
router.get('/referrals', authenticatePortal, asHandler(referralController.getReferrals));
router.get('/referrals/stats', authenticatePortal, asHandler(referralController.getReferralStats));
router.get('/referrals/:referralId', authenticatePortal, asHandler(referralController.getReferralDetails));

// ========== THERAPIST PROFILES ==========

router.get('/therapist/profile', authenticatePortal, asHandler(therapistProfileController.getMyTherapistProfile));
router.get('/therapist/profile/:therapistId', authenticatePortal, asHandler(therapistProfileController.getTherapistProfile));
router.get('/therapist/available', authenticatePortal, asHandler(therapistProfileController.getAvailableTherapists));
router.get('/therapist/search', authenticatePortal, asHandler(therapistProfileController.searchTherapists));

export default router;
