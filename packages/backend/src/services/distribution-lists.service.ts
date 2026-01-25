/**
 * Distribution Lists Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateDistributionListInput {
  name: string;
  description?: string;
  emails: string[];
  createdBy: string;
}

export interface UpdateDistributionListInput {
  name?: string;
  description?: string;
  emails?: string[];
}

const creatorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
};

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Create a new distribution list
 */
export async function createDistributionList(data: CreateDistributionListInput) {
  return prisma.distributionList.create({
    data: {
      name: data.name,
      description: data.description,
      emails: data.emails,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Get all distribution lists for a user with creator info
 */
export async function getDistributionListsByUser(userId: string) {
  return prisma.distributionList.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: {
        select: creatorSelect,
      },
    },
  });
}

/**
 * Find distribution list by ID and user with creator info
 */
export async function findDistributionListByIdAndUser(id: string, userId: string) {
  return prisma.distributionList.findFirst({
    where: {
      id,
      createdBy: userId,
    },
    include: {
      creator: {
        select: creatorSelect,
      },
    },
  });
}

/**
 * Find distribution list by ID and user (basic, no includes)
 */
export async function findDistributionListByIdAndUserBasic(id: string, userId: string) {
  return prisma.distributionList.findFirst({
    where: {
      id,
      createdBy: userId,
    },
  });
}

/**
 * Update a distribution list
 */
export async function updateDistributionList(id: string, data: UpdateDistributionListInput) {
  const updateData: UpdateDistributionListInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.emails !== undefined) updateData.emails = data.emails;

  return prisma.distributionList.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete a distribution list
 */
export async function deleteDistributionList(id: string) {
  return prisma.distributionList.delete({
    where: { id },
  });
}

/**
 * Add email to distribution list
 */
export async function addEmailToList(id: string, currentEmails: string[], newEmail: string) {
  return prisma.distributionList.update({
    where: { id },
    data: {
      emails: [...currentEmails, newEmail],
    },
  });
}

/**
 * Remove email from distribution list
 */
export async function removeEmailFromList(id: string, currentEmails: string[], emailToRemove: string) {
  return prisma.distributionList.update({
    where: { id },
    data: {
      emails: currentEmails.filter((e) => e !== emailToRemove),
    },
  });
}
