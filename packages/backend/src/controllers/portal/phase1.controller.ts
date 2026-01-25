import { Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../../utils/errorHelpers';
import {
  billingService,
  insuranceService,
  sessionReviewsService,
  therapistChangeService,
  moodTrackingService,
} from '../../services/portal';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendServerError } from '../../utils/apiResponse';

// ============================================================================
// BILLING & PAYMENTS
// ============================================================================

const addPaymentMethodSchema = z.object({
  stripeToken: z.string().min(1),
});

export const addPaymentMethod = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = addPaymentMethodSchema.parse(req.body);

    const paymentMethod = await billingService.addPaymentMethod({
      clientId,
      stripeToken: data.stripeToken,
    });

    return sendCreated(res, paymentMethod, 'Payment method added successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to add payment method');
  }
};

export const getPaymentMethods = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const paymentMethods = await billingService.getPaymentMethods(clientId);

    return sendSuccess(res, paymentMethods);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch payment methods');
  }
};

const setDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().uuid(),
});

export const setDefaultPaymentMethod = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = setDefaultPaymentMethodSchema.parse(req.body);

    const updated = await billingService.setDefaultPaymentMethod({
      clientId,
      paymentMethodId: data.paymentMethodId,
    });

    return sendSuccess(res, updated, 'Default payment method updated');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to update default payment method');
  }
};

export const removePaymentMethod = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { paymentMethodId } = req.params;

    await billingService.removePaymentMethod({
      clientId,
      paymentMethodId,
    });

    return sendSuccess(res, null, 'Payment method removed successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to remove payment method');
  }
};

export const getCurrentBalance = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const balance = await billingService.getCurrentBalance(clientId);

    return sendSuccess(res, balance);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch balance');
  }
};

const makePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethodId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export const makePayment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = makePaymentSchema.parse(req.body);

    const result = await billingService.makePayment({
      clientId,
      amount: data.amount,
      paymentMethodId: data.paymentMethodId,
      description: data.description,
    });

    return sendSuccess(res, result, 'Payment processed successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to process payment');
  }
};

export const getPaymentHistory = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || 20;

    const payments = await billingService.getPaymentHistory(clientId, limit);

    return sendSuccess(res, payments);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch payment history');
  }
};

// ============================================================================
// INSURANCE CARDS
// ============================================================================

export const uploadInsuranceCard = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    // In a real implementation, use multer or similar for file uploads
    // For now, expecting base64 encoded images in request body
    const { insuranceType, frontImage, backImage, insuranceName, policyNumber, groupNumber } = req.body;

    if (!insuranceType || !frontImage || !backImage) {
      return sendBadRequest(res, 'Insurance type and both card images are required');
    }

    // Convert base64 to buffer
    const frontBuffer = Buffer.from(frontImage.split(',')[1], 'base64');
    const backBuffer = Buffer.from(backImage.split(',')[1], 'base64');

    const card = await insuranceService.uploadInsuranceCard({
      clientId,
      insuranceType,
      frontImage: frontBuffer,
      backImage: backBuffer,
      frontImageMimeType: 'image/jpeg',
      backImageMimeType: 'image/jpeg',
      insuranceName,
      policyNumber,
      groupNumber,
    });

    return sendCreated(res, card, 'Insurance card uploaded successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to upload insurance card');
  }
};

export const getInsuranceCards = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const cards = await insuranceService.getActiveInsuranceCards(clientId);

    return sendSuccess(res, cards);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch insurance cards');
  }
};

// ============================================================================
// SESSION REVIEWS
// ============================================================================

const createSessionReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
  categories: z
    .object({
      effectiveness: z.number().int().min(1).max(5).optional(),
      alliance: z.number().int().min(1).max(5).optional(),
      environment: z.number().int().min(1).max(5).optional(),
      technology: z.number().int().min(1).max(5).optional(),
      scheduling: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
  isSharedWithClinician: z.boolean(),
  isAnonymous: z.boolean().optional(),
});

export const createSessionReview = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = createSessionReviewSchema.parse(req.body);

    const review = await sessionReviewsService.createSessionReview({
      clientId,
      appointmentId: data.appointmentId,
      rating: data.rating,
      feedback: data.feedback,
      categories: data.categories,
      isSharedWithClinician: data.isSharedWithClinician,
      isAnonymous: data.isAnonymous,
    });

    return sendCreated(res, review, 'Session review submitted successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to submit session review');
  }
};

export const getClientReviews = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const reviews = await sessionReviewsService.getClientReviews(clientId);

    return sendSuccess(res, reviews);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch reviews');
  }
};

const updateReviewSharingSchema = z.object({
  isSharedWithClinician: z.boolean(),
});

export const updateReviewSharing = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { reviewId } = req.params;
    const data = updateReviewSharingSchema.parse(req.body);

    const updated = await sessionReviewsService.updateReviewSharing({
      clientId,
      reviewId,
      isSharedWithClinician: data.isSharedWithClinician,
    });

    return sendSuccess(res, updated, 'Review sharing settings updated');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to update review sharing');
  }
};

// ============================================================================
// THERAPIST CHANGE REQUESTS
// ============================================================================

const createChangeRequestSchema = z.object({
  requestReason: z.enum(['SCHEDULE_CONFLICT', 'THERAPEUTIC_FIT', 'SPECIALTY_NEEDS', 'PERSONAL_PREFERENCE', 'OTHER']),
  reasonDetails: z.string().min(10),
  isSensitive: z.boolean().optional(),
});

export const createChangeRequest = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = createChangeRequestSchema.parse(req.body);

    const request = await therapistChangeService.createChangeRequest({
      clientId,
      requestReason: data.requestReason,
      reasonDetails: data.reasonDetails,
      isSensitive: data.isSensitive,
    });

    return sendCreated(res, request, 'Therapist change request submitted successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to submit change request');
  }
};

export const getClientChangeRequests = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    const requests = await therapistChangeService.getClientChangeRequests(clientId);

    return sendSuccess(res, requests);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch change requests');
  }
};

export const cancelChangeRequest = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { requestId } = req.params;

    await therapistChangeService.cancelChangeRequest({
      clientId,
      requestId,
    });

    return sendSuccess(res, null, 'Change request cancelled successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to cancel change request');
  }
};

// ============================================================================
// MOOD TRACKING
// ============================================================================

const createMoodEntrySchema = z.object({
  moodScore: z.number().int().min(1).max(10),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  symptoms: z.array(z.string()).optional(),
  customMetrics: z.record(z.number()).optional(),
  notes: z.string().optional(),
  sharedWithClinician: z.boolean().optional(),
});

export const createMoodEntry = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const data = createMoodEntrySchema.parse(req.body);

    const entry = await moodTrackingService.createMoodEntry({
      clientId,
      moodScore: data.moodScore,
      timeOfDay: data.timeOfDay,
      symptoms: data.symptoms,
      customMetrics: data.customMetrics,
      notes: data.notes,
      sharedWithClinician: data.sharedWithClinician,
    });

    return sendCreated(res, entry, 'Mood entry recorded successfully');
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to record mood entry');
  }
};

export const getMoodEntries = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const entries = await moodTrackingService.getMoodEntries({
      clientId,
      startDate,
      endDate,
      limit,
    });

    return sendSuccess(res, entries);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch mood entries');
  }
};

export const getMoodTrends = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const trends = await moodTrackingService.getMoodTrends({
      clientId,
      days,
    });

    return sendSuccess(res, trends);
  } catch (error) {
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch mood trends');
  }
};
