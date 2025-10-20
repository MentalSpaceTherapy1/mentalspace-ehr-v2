import { Request, Response } from 'express';
import { z } from 'zod';
import * as telehealthConsentService from '../services/telehealthConsent.service';
import logger from '../utils/logger';

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
    const userId = (req as any).user?.userId;

    const consent = await telehealthConsentService.getOrCreateTelehealthConsent({
      clientId: validatedData.clientId,
      consentType: validatedData.consentType,
      createdBy: userId,
    });

    res.status(200).json({
      success: true,
      message: 'Telehealth consent retrieved',
      data: consent,
    });
  } catch (error: any) {
    logger.error('Error getting/creating telehealth consent', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get/create telehealth consent',
    });
  }
};

export const signConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = signConsentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    // Extract consentId and consent data
    const { consentId, ...consentData } = validatedData;

    const consent = await telehealthConsentService.signTelehealthConsent(
      consentId,
      consentData as any,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Telehealth consent signed successfully',
      data: consent,
    });
  } catch (error: any) {
    logger.error('Error signing telehealth consent', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to sign telehealth consent',
    });
  }
};

export const withdrawConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = withdrawConsentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const consent = await telehealthConsentService.withdrawTelehealthConsent(
      validatedData.consentId,
      validatedData.reason,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Telehealth consent withdrawn successfully',
      data: consent,
    });
  } catch (error: any) {
    logger.error('Error withdrawing telehealth consent', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to withdraw telehealth consent',
    });
  }
};

export const validateConsent = async (req: Request, res: Response) => {
  try {
    const validatedData = validateConsentSchema.parse(req.query);

    const hasValidConsent = await telehealthConsentService.hasValidTelehealthConsent(
      validatedData.clientId,
      validatedData.consentType
    );

    res.status(200).json({
      success: true,
      data: {
        hasValidConsent,
        message: hasValidConsent
          ? 'Client has valid telehealth consent'
          : 'Client does not have valid telehealth consent',
      },
    });
  } catch (error: any) {
    logger.error('Error validating telehealth consent', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to validate telehealth consent',
    });
  }
};

export const getClientConsents = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const consents = await telehealthConsentService.getClientTelehealthConsents(clientId);

    res.status(200).json({
      success: true,
      data: consents,
    });
  } catch (error: any) {
    logger.error('Error getting client telehealth consents', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get client telehealth consents',
    });
  }
};
