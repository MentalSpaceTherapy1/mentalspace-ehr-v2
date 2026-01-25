import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as telehealthConsentService from '../services/telehealthConsent.service';
import logger from '../utils/logger';
import { sendSuccess, sendBadRequest, sendUnauthorized } from '../utils/apiResponse';

const createConsentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  consentType: z.enum(['Georgia_Telehealth', 'HIPAA_Telehealth', 'Recording']),
});

const signConsentSchema = z.object({
  consentId: z.string().uuid('Invalid consent ID'),
  consentGiven: z.boolean(),
  patientRightsAcknowledged: z.boolean().optional(),
  emergencyProtocolsUnderstood: z.boolean().optional(),
  privacyRisksAcknowledged: z.boolean().optional(),
  technologyRequirementsUnderstood: z.boolean().optional(),
  clientSignature: z.string().optional(),
  clientIPAddress: z.string().optional(),
  clientUserAgent: z.string().optional(),
});

const withdrawConsentSchema = z.object({
  consentId: z.string().uuid('Invalid consent ID'),
  reason: z.string().min(1, 'Withdrawal reason is required'),
});

const validateConsentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  consentType: z.string().optional(),
});

export const getOrCreateConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = createConsentSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const consent = await telehealthConsentService.getOrCreateTelehealthConsent({
      clientId: validatedData.clientId,
      consentType: validatedData.consentType,
      createdBy: userId,
    });

    return sendSuccess(res, consent, 'Telehealth consent retrieved');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get/create telehealth consent';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error getting/creating telehealth consent', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const signConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = signConsentSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Extract consentId and consent data
    const { consentId, ...consentData } = validatedData;

    const consent = await telehealthConsentService.signTelehealthConsent(
      consentId,
      consentData,
      userId
    );

    return sendSuccess(res, consent, 'Telehealth consent signed successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to sign telehealth consent';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error signing telehealth consent', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const withdrawConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = withdrawConsentSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const consent = await telehealthConsentService.withdrawTelehealthConsent(
      validatedData.consentId,
      validatedData.reason,
      userId
    );

    return sendSuccess(res, consent, 'Telehealth consent withdrawn successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to withdraw telehealth consent';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error withdrawing telehealth consent', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const validateConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = validateConsentSchema.parse(req.query);

    const hasValidConsent = await telehealthConsentService.hasValidTelehealthConsent(
      validatedData.clientId,
      validatedData.consentType
    );

    return sendSuccess(res, {
      hasValidConsent,
      message: hasValidConsent
        ? 'Client has valid telehealth consent'
        : 'Client does not have valid telehealth consent',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to validate telehealth consent';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error validating telehealth consent', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const getClientConsents = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return sendBadRequest(res, 'Client ID is required');
    }

    const consents = await telehealthConsentService.getClientTelehealthConsents(clientId);

    return sendSuccess(res, consents);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get client telehealth consents';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error getting client telehealth consents', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};
