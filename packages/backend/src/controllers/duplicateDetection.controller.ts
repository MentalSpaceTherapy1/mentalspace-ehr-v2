/**
 * Duplicate Detection Controller
 * Handles API requests for duplicate client detection and resolution
 */

import { Request, Response } from 'express';
import * as duplicateDetectionService from '../services/duplicateDetection.service';
import { logControllerError } from '../utils/logger';

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
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, dateOfBirth, primaryPhone',
      });
    }

    // Convert dateOfBirth string to Date
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({
        error: 'Invalid dateOfBirth format',
      });
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

    res.json({
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
    res.status(500).json({
      error: 'Failed to check for duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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
      return res.status(400).json({
        error: 'Invalid matches array',
      });
    }

    await duplicateDetectionService.savePotentialDuplicates(
      clientId,
      matches
    );

    res.json({
      success: true,
      message: `Saved ${matches.length} potential duplicate(s) for review`,
    });
  } catch (error) {
    logControllerError('Error saving duplicates', error);
    res.status(500).json({
      error: 'Failed to save duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/v1/duplicates/pending
 * Get all pending duplicate records for review
 */
export async function getPendingDuplicates(req: Request, res: Response) {
  try {
    const duplicates = await duplicateDetectionService.getPendingDuplicates();

    res.json({
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
    res.status(500).json({
      error: 'Failed to fetch pending duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const reviewedBy = (req as any).user?.id;
    if (!reviewedBy) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Validate required fields
    if (!sourceClientId || !targetClientId) {
      return res.status(400).json({
        error: 'Missing required fields: sourceClientId, targetClientId',
      });
    }

    // Prevent merging a client with itself
    if (sourceClientId === targetClientId) {
      return res.status(400).json({
        error: 'Cannot merge a client with itself',
      });
    }

    // Merge clients
    await duplicateDetectionService.mergeClients({
      sourceClientId,
      targetClientId,
      reviewedBy,
      resolutionNotes,
    });

    res.json({
      success: true,
      message: 'Clients merged successfully',
      sourceClientId,
      targetClientId,
    });
  } catch (error) {
    logControllerError('Error merging clients', error);
    res.status(500).json({
      error: 'Failed to merge clients',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const reviewedBy = (req as any).user?.id;
    if (!reviewedBy) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    await duplicateDetectionService.dismissDuplicate(
      id,
      reviewedBy,
      resolutionNotes
    );

    res.json({
      success: true,
      message: 'Duplicate dismissed successfully',
    });
  } catch (error) {
    logControllerError('Error dismissing duplicate', error);
    res.status(500).json({
      error: 'Failed to dismiss duplicate',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/v1/duplicates/stats
 * Get duplicate detection statistics
 */
export async function getDuplicateStats(req: Request, res: Response) {
  try {
    const { PrismaClient } = await import('@mentalspace/database');
    const prisma = new PrismaClient();

    const [pending, dismissed, merged, total] = await Promise.all([
      prisma.potentialDuplicate.count({ where: { status: 'PENDING' } }),
      prisma.potentialDuplicate.count({ where: { status: 'DISMISSED' } }),
      prisma.potentialDuplicate.count({ where: { status: 'MERGED' } }),
      prisma.potentialDuplicate.count(),
    ]);

    res.json({
      total,
      pending,
      dismissed,
      merged,
      byMatchType: await prisma.potentialDuplicate.groupBy({
        by: ['matchType'],
        _count: true,
        where: { status: 'PENDING' },
      }),
    });
  } catch (error) {
    logControllerError('Error fetching duplicate stats', error);
    res.status(500).json({
      error: 'Failed to fetch duplicate stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
