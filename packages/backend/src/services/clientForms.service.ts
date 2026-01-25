/**
 * Client Forms Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';
import logger from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AssignFormInput {
  clientId: string;
  formId: string;
  assignedBy: string;
  dueDate?: Date | null;
  isRequired?: boolean;
  assignmentNotes?: string;
  clientMessage?: string;
}

export interface FormAssignmentFilters {
  clientId: string;
  status?: string;
}

export interface FormLibraryFilters {
  isActive?: boolean;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get form library (available intake forms)
 */
export async function getFormLibrary(filters: FormLibraryFilters = {}) {
  const where: Prisma.IntakeFormWhereInput = {};
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return prisma.intakeForm.findMany({
    where,
    orderBy: { formName: 'asc' },
    select: {
      id: true,
      formName: true,
      formDescription: true,
      formType: true,
      isActive: true,
      isRequired: true,
      assignedToNewClients: true,
    },
  });
}

/**
 * Get form assignments for a client
 */
export async function getClientFormAssignments(filters: FormAssignmentFilters) {
  const where: Prisma.FormAssignmentWhereInput = { clientId: filters.clientId };
  if (filters.status) {
    where.status = filters.status;
  }

  return prisma.formAssignment.findMany({
    where,
    include: {
      form: {
        select: {
          id: true,
          formName: true,
          formDescription: true,
          formType: true,
        },
      },
      submission: {
        select: {
          id: true,
          submittedDate: true,
          reviewedDate: true,
          reviewedBy: true,
          reviewerNotes: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
}

/**
 * Find form by ID
 */
export async function findFormById(formId: string) {
  return prisma.intakeForm.findUnique({
    where: { id: formId },
  });
}

/**
 * Find existing pending/in-progress form assignment
 */
export async function findExistingAssignment(clientId: string, formId: string) {
  return prisma.formAssignment.findFirst({
    where: {
      clientId,
      formId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });
}

/**
 * Create form assignment
 */
export async function createFormAssignment(data: AssignFormInput) {
  return prisma.formAssignment.create({
    data: {
      clientId: data.clientId,
      formId: data.formId,
      assignedBy: data.assignedBy,
      assignedAt: new Date(),
      dueDate: data.dueDate ?? null,
      isRequired: data.isRequired ?? false,
      assignmentNotes: data.assignmentNotes,
      clientMessage: data.clientMessage,
      status: 'PENDING',
    },
    include: {
      form: {
        select: {
          formName: true,
          formDescription: true,
        },
      },
    },
  });
}

/**
 * Find form assignment by ID and client
 */
export async function findFormAssignment(assignmentId: string, clientId: string) {
  return prisma.formAssignment.findFirst({
    where: {
      id: assignmentId,
      clientId,
    },
  });
}

/**
 * Delete form assignment
 */
export async function deleteFormAssignment(assignmentId: string) {
  return prisma.formAssignment.delete({
    where: { id: assignmentId },
  });
}

/**
 * Find pending form assignment with form details
 */
export async function findPendingAssignmentWithForm(assignmentId: string, clientId: string) {
  return prisma.formAssignment.findFirst({
    where: {
      id: assignmentId,
      clientId,
      status: 'PENDING',
    },
    include: {
      form: true,
    },
  });
}

/**
 * Update form assignment's last reminder sent timestamp
 */
export async function updateLastReminderSent(assignmentId: string) {
  return prisma.formAssignment.update({
    where: { id: assignmentId },
    data: {
      lastReminderSent: new Date(),
    },
  });
}

/**
 * Find completed form assignment with submission
 */
export async function findCompletedAssignmentWithSubmission(assignmentId: string, clientId: string) {
  return prisma.formAssignment.findFirst({
    where: {
      id: assignmentId,
      clientId,
      status: 'COMPLETED',
    },
    include: {
      form: true,
      submission: true,
    },
  });
}

/**
 * Find form assignment with submission (any status)
 */
export async function findAssignmentWithSubmission(assignmentId: string, clientId: string) {
  return prisma.formAssignment.findFirst({
    where: {
      id: assignmentId,
      clientId,
    },
    include: {
      form: true,
      submission: true,
    },
  });
}

/**
 * Get user by ID (for name lookup)
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
}

/**
 * Get client by ID
 */
export async function getClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
  });
}

/**
 * Update client demographics
 */
export async function updateClientDemographics(clientId: string, data: Record<string, any>) {
  return prisma.client.update({
    where: { id: clientId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update intake form submission with review information
 */
export async function markSubmissionAsReviewed(
  submissionId: string,
  reviewedBy: string,
  notes?: string
) {
  return prisma.intakeFormSubmission.update({
    where: { id: submissionId },
    data: {
      reviewedDate: new Date(),
      reviewedBy,
      reviewerNotes: notes || null,
      status: 'REVIEWED',
    },
  });
}
