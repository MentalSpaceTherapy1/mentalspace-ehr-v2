/**
 * Client Assessments Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';
import logger from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AssignAssessmentInput {
  clientId: string;
  assessmentType: string;
  assessmentName: string;
  description?: string;
  assignedBy: string;
  dueDate?: Date | null;
}

export interface GetAssessmentsFilters {
  clientId: string;
  status?: string;
}

export interface GetHistoryFilters {
  clientId: string;
  assessmentType?: string;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get all assessments assigned to a client
 */
export async function getClientAssessments(filters: GetAssessmentsFilters) {
  const where: Prisma.AssessmentAssignmentWhereInput = {
    clientId: filters.clientId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  return prisma.assessmentAssignment.findMany({
    where,
    orderBy: { assignedAt: 'desc' },
  });
}

/**
 * Assign an assessment to a client
 */
export async function assignAssessment(data: AssignAssessmentInput) {
  return prisma.assessmentAssignment.create({
    data: {
      clientId: data.clientId,
      assessmentType: data.assessmentType,
      assessmentName: data.assessmentName,
      description: data.description || `Complete the ${data.assessmentName}`,
      assignedBy: data.assignedBy,
      assignedAt: new Date(),
      dueDate: data.dueDate ?? null,
      status: 'PENDING',
    },
  });
}

/**
 * Find assessment assignment by ID and client
 */
export async function findAssignment(assessmentId: string, clientId: string) {
  return prisma.assessmentAssignment.findFirst({
    where: {
      id: assessmentId,
      clientId,
    },
  });
}

/**
 * Find pending assessment
 */
export async function findPendingAssignment(assessmentId: string, clientId: string) {
  return prisma.assessmentAssignment.findFirst({
    where: {
      id: assessmentId,
      clientId,
      status: 'PENDING',
    },
  });
}

/**
 * Find completed assessment
 */
export async function findCompletedAssignment(assessmentId: string, clientId: string) {
  return prisma.assessmentAssignment.findFirst({
    where: {
      id: assessmentId,
      clientId,
      status: 'COMPLETED',
    },
  });
}

/**
 * Delete assessment assignment
 */
export async function deleteAssignment(assessmentId: string) {
  return prisma.assessmentAssignment.delete({
    where: { id: assessmentId },
  });
}

/**
 * Get assessment history for a client (completed assessments)
 */
export async function getAssessmentHistory(filters: GetHistoryFilters) {
  const where: Prisma.AssessmentAssignmentWhereInput = {
    clientId: filters.clientId,
    status: 'COMPLETED',
  };

  if (filters.assessmentType) {
    where.assessmentType = filters.assessmentType;
  }

  return prisma.assessmentAssignment.findMany({
    where,
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      assessmentName: true,
      assessmentType: true,
      assignedAt: true,
      completedAt: true,
      score: true,
      interpretation: true,
    },
  });
}
