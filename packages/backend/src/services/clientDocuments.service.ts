/**
 * Client Documents Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';
import logger from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ShareDocumentInput {
  clientId: string;
  documentName: string;
  documentType: string;
  documentS3Key: string;
  sharedBy: string;
  expiresAt?: Date | null;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get all documents shared with a client
 */
export async function getSharedDocumentsForClient(clientId: string) {
  return prisma.sharedDocument.findMany({
    where: { clientId },
    orderBy: { sharedAt: 'desc' },
  });
}

/**
 * Share a document with a client
 */
export async function shareDocument(data: ShareDocumentInput) {
  return prisma.sharedDocument.create({
    data: {
      clientId: data.clientId,
      documentName: data.documentName,
      documentType: data.documentType,
      documentS3Key: data.documentS3Key,
      sharedBy: data.sharedBy,
      expiresAt: data.expiresAt ?? null,
    },
  });
}

/**
 * Find a shared document by ID and clientId
 */
export async function findSharedDocument(documentId: string, clientId: string) {
  return prisma.sharedDocument.findFirst({
    where: {
      id: documentId,
      clientId,
    },
  });
}

/**
 * Delete a shared document (revoke access)
 */
export async function deleteSharedDocument(documentId: string) {
  return prisma.sharedDocument.delete({
    where: { id: documentId },
  });
}

/**
 * Get document analytics (document with view stats)
 */
export async function getDocumentWithAnalytics(documentId: string, clientId: string) {
  const document = await prisma.sharedDocument.findFirst({
    where: {
      id: documentId,
      clientId,
    },
  });

  if (!document) {
    return null;
  }

  return {
    document,
    analytics: {
      viewCount: document.viewCount,
      lastViewedAt: document.lastViewedAt,
      sharedAt: document.sharedAt,
      expiresAt: document.expiresAt,
      hasBeenViewed: document.viewCount > 0,
    },
  };
}
