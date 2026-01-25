/**
 * Subscriptions Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateSubscriptionInput {
  reportId: string;
  reportType: string;
  userId: string;
  frequency: string;
  format: string;
  deliveryMethod: string;
}

export interface UpdateSubscriptionInput {
  frequency?: string;
  format?: string;
  deliveryMethod?: string;
  isActive?: boolean;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Create a new subscription
 */
export async function createSubscription(data: CreateSubscriptionInput) {
  return prisma.subscription.create({
    data: {
      reportId: data.reportId,
      reportType: data.reportType,
      userId: data.userId,
      frequency: data.frequency,
      format: data.format,
      deliveryMethod: data.deliveryMethod,
      isActive: true,
    },
  });
}

/**
 * Get all subscriptions for a user
 */
export async function getSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Find a subscription by ID for a specific user
 */
export async function findSubscriptionByIdAndUser(id: string, userId: string) {
  return prisma.subscription.findFirst({
    where: {
      id,
      userId,
    },
  });
}

/**
 * Update a subscription
 */
export async function updateSubscription(id: string, data: UpdateSubscriptionInput) {
  const updateData: UpdateSubscriptionInput = {};

  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.format !== undefined) updateData.format = data.format;
  if (data.deliveryMethod !== undefined) updateData.deliveryMethod = data.deliveryMethod;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.subscription.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(id: string) {
  return prisma.subscription.delete({
    where: { id },
  });
}

/**
 * Pause a subscription (set isActive to false)
 */
export async function pauseSubscription(id: string) {
  return prisma.subscription.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Resume a subscription (set isActive to true)
 */
export async function resumeSubscription(id: string) {
  return prisma.subscription.update({
    where: { id },
    data: { isActive: true },
  });
}

/**
 * Find report schedule for a subscription's report
 */
export async function findReportScheduleForSubscription(reportId: string, userId: string) {
  return prisma.reportSchedule.findFirst({
    where: {
      reportId,
      userId,
    },
  });
}
