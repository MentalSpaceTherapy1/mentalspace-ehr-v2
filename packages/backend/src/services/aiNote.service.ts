/**
 * AI Note Service
 * Phase 3.2: Moved database operations from controller to service
 *
 * Note: This service handles database operations for AI note controller.
 * Business logic for AI generation is in aiNoteGeneration.service.ts
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';
import logger from '../utils/logger';

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Find telehealth session by ID with appointment and clinician
 */
export async function findTelehealthSessionWithAppointment(sessionId: string) {
  return prisma.telehealthSession.findUnique({
    where: { id: sessionId },
    include: {
      appointment: {
        include: {
          clinician: true,
        },
      },
    },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * Get user by ID with roles only (optimized for auth checks)
 */
export async function getUserRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roles: true,
    },
  });
}

/**
 * Get AI-generated note by ID
 */
export async function getAINote(aiNoteId: string) {
  return prisma.aIGeneratedNote.findUnique({
    where: { id: aiNoteId },
    include: {
      session: true,
      client: true,
    },
  });
}

/**
 * Get audit logs for an AI note
 */
export async function getAINoteAuditLogs(aiNoteId: string) {
  return prisma.aIGenerationAuditLog.findMany({
    where: { aiNoteId },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Create clinical note from AI generated note
 */
export async function createClinicalNoteFromAI(data: {
  clientId: string;
  clinicianId: string;
  appointmentId: string;
  noteType: string;
  sessionDate: Date;
  sessionDuration?: number | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suicidalIdeation?: boolean;
  suicidalPlan?: boolean;
  homicidalIdeation?: boolean;
  selfHarm?: boolean;
  riskLevel?: string;
  riskAssessmentDetails?: string;
  interventionsUsed?: string[];
  lastModifiedBy: string;
}) {
  return prisma.clinicalNote.create({
    data: {
      clientId: data.clientId,
      clinicianId: data.clinicianId,
      appointmentId: data.appointmentId,
      noteType: data.noteType,
      sessionDate: data.sessionDate,
      sessionDuration: data.sessionDuration,
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      suicidalIdeation: data.suicidalIdeation ?? false,
      suicidalPlan: data.suicidalPlan ?? false,
      homicidalIdeation: data.homicidalIdeation ?? false,
      selfHarm: data.selfHarm ?? false,
      riskLevel: data.riskLevel,
      riskAssessmentDetails: data.riskAssessmentDetails,
      interventionsUsed: data.interventionsUsed ?? [],
      status: 'DRAFT',
      aiGenerated: true,
      lastModifiedBy: data.lastModifiedBy,
    },
  });
}
