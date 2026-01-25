/**
 * Duplicate Detection Controller
 * Handles API requests for duplicate client detection and resolution
 */

import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as duplicateDetectionService from '../services/duplicateDetection.service';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendServerError } from '../utils/apiResponse';

/**
 * POST /api/v1/clients/check-duplicates
 * Check for potential duplicate clients
 */
export async function checkDuplicates(req: Request, res: Response) {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      primaryPhone,
      addressStreet1,
      addressZipCode,
      excludeClientId,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !primaryPhone) {
      return sendBadRequest(res, 'Missing required fields: firstName, lastName, dateOfBirth, primaryPhone');
    }

    // Convert dateOfBirth string to Date
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return sendBadRequest(res, 'Invalid dateOfBirth format');
    }

    // Check for duplicates
    const matches = await duplicateDetectionService.checkForDuplicates({
      firstName,
      lastName,
      dateOfBirth: dob,
      primaryPhone,
      addressStreet1,
      addressZipCode,
      excludeClientId,
    });

    return sendSuccess(res, {
      foundDuplicates: matches.length > 0,
      count: matches.length,
      matches: matches.map((match) => ({
        clientId: match.clientId,
        matchType: match.matchType,
        confidenceScore: match.confidenceScore,
        matchFields: match.matchFields,
        client: {
          id: match.matchedClient.id,
          firstName: match.matchedClient.firstName,
          lastName: match.matchedClient.lastName,
          dateOfBirth: match.matchedClient.dateOfBirth,
          primaryPhone: match.matchedClient.primaryPhone,
          medicalRecordNumber: match.matchedClient.medicalRecordNumber,
        },
      })),
    });
  } catch (error) {
    logControllerError('Error checking for duplicates', error);
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to check for duplicates');
  }
}

/**
 * POST /api/v1/clients/:clientId/save-duplicates
 * Save detected duplicates to database for review
 */
export async function saveDuplicates(req: Request, res: Response) {
  try {
    const { clientId } = req.params;
    const { matches } = req.body;

    if (!matches || !Array.isArray(matches)) {
      return sendBadRequest(res, 'Invalid matches array');
    }

    await duplicateDetectionService.savePotentialDuplicates(
      clientId,
      matches
    );

    return sendSuccess(res, null, `Saved ${matches.length} potential duplicate(s) for review`);
  } catch (error) {
    logControllerError('Error saving duplicates', error);
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to save duplicates');
  }
}

/**
 * GET /api/v1/duplicates/pending
 * Get all pending duplicate records for review
 */
export async function getPendingDuplicates(req: Request, res: Response) {
  try {
    const duplicates = await duplicateDetectionService.getPendingDuplicates();

    return sendSuccess(res, {
      count: duplicates.length,
      duplicates: duplicates.map((dup: any) => ({
        id: dup.id,
        client1: {
          id: dup.client1.id,
          firstName: dup.client1.firstName,
          lastName: dup.client1.lastName,
          dateOfBirth: dup.client1.dateOfBirth,
          primaryPhone: dup.client1.primaryPhone,
          medicalRecordNumber: dup.client1.medicalRecordNumber,
        },
        client2: {
          id: dup.client2.id,
          firstName: dup.client2.firstName,
          lastName: dup.client2.lastName,
          dateOfBirth: dup.client2.dateOfBirth,
          primaryPhone: dup.client2.primaryPhone,
          medicalRecordNumber: dup.client2.medicalRecordNumber,
        },
        matchType: dup.matchType,
        confidenceScore: dup.confidenceScore,
        matchFields: dup.matchFields,
        createdAt: dup.createdAt,
      })),
    });
  } catch (error) {
    logControllerError('Error fetching pending duplicates', error);
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch pending duplicates');
  }
}

/**
 * POST /api/v1/duplicates/:id/merge
 * Merge two client records
 */
export async function mergeDuplicate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sourceClientId, targetClientId, resolutionNotes } = req.body;

    // Get reviewer ID from authenticated user
    const reviewedBy = req.user?.userId;
    if (!reviewedBy) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Validate required fields
    if (!sourceClientId || !targetClientId) {
      return sendBadRequest(res, 'Missing required fields: sourceClientId, targetClientId');
    }

    // Prevent merging a client with itself
    if (sourceClientId === targetClientId) {
      return sendBadRequest(res, 'Cannot merge a client with itself');
    }

    // Merge clients
    await duplicateDetectionService.mergeClients({
      sourceClientId,
      targetClientId,
      reviewedBy,
      resolutionNotes,
    });

    return sendSuccess(res, {
      sourceClientId,
      targetClientId,
    }, 'Clients merged successfully');
  } catch (error) {
    logControllerError('Error merging clients', error);
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to merge clients');
  }
}

/**
 * POST /api/v1/duplicates/:id/dismiss
 * Dismiss a potential duplicate (mark as not a duplicate)
 */
export async function dismissDuplicate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    // Get reviewer ID from authenticated user
    const reviewedBy = req.user?.userId;
    if (!reviewedBy) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await duplicateDetectionService.dismissDuplicate(
      id,
      reviewedBy,
      resolutionNotes
    );

    return sendSuccess(res, null, 'Duplicate dismissed successfully');
  } catch (error) {
    logControllerError('Error dismissing duplicate', error);
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to dismiss duplicate');
  }
}

/**
 * GET /api/v1/duplicates/stats
 * Get duplicate detection statistics
 */
export async function getDuplicateStats(req: Request, res: Response) {
  try {
    // Phase 3.2: Use service method instead of direct prisma call
    const stats = await duplicateDetectionService.getDuplicateStats();

    return sendSuccess(res, stats);
  } catch (error) {
    logControllerError('Error fetching duplicate stats', error);
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch duplicate stats');
  }
}
