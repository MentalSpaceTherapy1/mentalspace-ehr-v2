import prisma from './database';
import type { ClinicalNote, PayerRule, BillingHold } from '@prisma/client';

/**
 * Phase 2.1: Billing Readiness Service
 *
 * Validates clinical notes against payer-specific rules to determine
 * if they can be submitted for billing. Creates billing holds when
 * validation fails.
 */

export interface BillingValidationResult {
  canBill: boolean;
  holds: BillingHoldInfo[];
  warnings: string[];
  payerRule?: PayerRule;
  noteStatus?: string;
}

export interface BillingHoldInfo {
  reason: string;
  details: string;
  severity: 'CRITICAL' | 'WARNING';
  payerRuleId?: string;
}

/**
 * Main validation function - checks if a note is ready for billing
 */
export async function validateNoteForBilling(
  noteId: string,
  createHolds: boolean = true
): Promise<BillingValidationResult> {
  // Fetch note with all required relationships
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    include: {
      clinician: {
        select: {
          id: true,
          title: true, // Changed from credential
          // TODO: requiresSupervision field doesn't exist on User model
          supervisorId: true,
        },
      },
      supervisor: {
        select: {
          id: true,
          title: true, // Changed from credential
        },
      },
      appointment: {
        include: {
          client: {
            select: {
              id: true,
              // TODO: payerId field doesn't exist in Client model
            },
          },
        },
      },
      billingHolds: {
        where: { isActive: true },
      },
    },
  });

  if (!note) {
    throw new Error(`Clinical note ${noteId} not found`);
  }

  // Type assertion to include relations (TypeScript inference issue)
  const noteWithRelations = note as typeof note & {
    clinician: { id: string; title: string | null; supervisorId: string | null };
    supervisor: { id: string; title: string | null } | null;
    appointment: typeof note.appointment & { client: { id: string } };
  };

  const holds: BillingHoldInfo[] = [];
  const warnings: string[] = [];
  let matchingRule: PayerRule | null = null;

  // 1. CHECK NOTE STATUS
  const statusCheck = validateNoteStatus(note);
  if (!statusCheck.valid) {
    holds.push({
      reason: 'INVALID_STATUS',
      details: statusCheck.message,
      severity: 'CRITICAL',
    });
  }

  // 2. FIND MATCHING PAYER RULE
  // TODO: Client.payerId field missing - skipping payer rule validation
  const clientPayerId = null; // noteWithRelations.appointment.client.payerId doesn't exist
  if (clientPayerId) {
    matchingRule = await findMatchingPayerRule(
      clientPayerId,
      noteWithRelations.clinician.title || 'UNKNOWN',
      noteWithRelations.noteType,
      noteWithRelations.appointment.placeOfService || 'OFFICE'
    );

    if (matchingRule) {
      // 3. CHECK PROHIBITED COMBINATIONS
      if (matchingRule.isProhibited) {
        holds.push({
          reason: 'PROHIBITED_COMBINATION',
          details: matchingRule.prohibitionReason ||
            `${noteWithRelations.clinician.title} cannot bill ${noteWithRelations.noteType} services for this payer`,
          severity: 'CRITICAL',
          payerRuleId: matchingRule.id,
        });

        // If prohibited, no need to check other rules
        if (createHolds) {
          await createBillingHolds(noteId, holds);
        }

        return {
          canBill: false,
          holds,
          warnings,
          payerRule: matchingRule,
          noteStatus: noteWithRelations.status,
        };
      }

      // 4. CHECK SUPERVISION REQUIREMENTS
      if (matchingRule.supervisionRequired || matchingRule.cosignRequired) {
        const supervisionCheck = validateSupervision(noteWithRelations as any, matchingRule);
        if (!supervisionCheck.valid) {
          holds.push({
            reason: 'SUPERVISION_REQUIRED',
            details: supervisionCheck.message,
            severity: 'CRITICAL',
            payerRuleId: matchingRule.id,
          });
        }
      }

      // 5. CHECK COSIGN TIMEFRAME
      if (matchingRule.cosignRequired && matchingRule.cosignTimeframeDays) {
        const timeframeCheck = validateCosignTimeframe(note, matchingRule);
        if (!timeframeCheck.valid) {
          if (timeframeCheck.severity === 'CRITICAL') {
            holds.push({
              reason: 'COSIGN_TIMEFRAME_EXCEEDED',
              details: timeframeCheck.message,
              severity: 'CRITICAL',
              payerRuleId: matchingRule.id,
            });
          } else {
            warnings.push(timeframeCheck.message);
          }
        }
      }

      // 6. CHECK NOTE COMPLETION TIMEFRAME
      if (matchingRule.noteCompletionDays) {
        const completionCheck = validateNoteCompletionTimeframe(note, matchingRule);
        if (!completionCheck.valid) {
          if (completionCheck.severity === 'CRITICAL') {
            holds.push({
              reason: 'NOTE_COMPLETION_LATE',
              details: completionCheck.message,
              severity: 'CRITICAL',
              payerRuleId: matchingRule.id,
            });
          } else {
            warnings.push(completionCheck.message);
          }
        }
      }

      // 7. CHECK DIAGNOSIS REQUIRED
      if (matchingRule.diagnosisRequired) {
        const diagnosisCheck = validateDiagnosis(note);
        if (!diagnosisCheck.valid) {
          holds.push({
            reason: 'MISSING_DIAGNOSIS',
            details: diagnosisCheck.message,
            severity: 'CRITICAL',
            payerRuleId: matchingRule.id,
          });
        }
      }

      // 8. CHECK TREATMENT PLAN REQUIRED
      if (matchingRule.treatmentPlanRequired) {
        const treatmentPlanCheck = await validateTreatmentPlan(note);
        if (!treatmentPlanCheck.valid) {
          if (treatmentPlanCheck.severity === 'CRITICAL') {
            holds.push({
              reason: 'MISSING_TREATMENT_PLAN',
              details: treatmentPlanCheck.message,
              severity: 'CRITICAL',
              payerRuleId: matchingRule.id,
            });
          } else {
            warnings.push(treatmentPlanCheck.message);
          }
        }
      }

      // 9. CHECK MEDICAL NECESSITY
      if (matchingRule.medicalNecessityRequired) {
        const medicalNecessityCheck = validateMedicalNecessity(note);
        if (!medicalNecessityCheck.valid) {
          holds.push({
            reason: 'MISSING_MEDICAL_NECESSITY',
            details: medicalNecessityCheck.message,
            severity: 'CRITICAL',
            payerRuleId: matchingRule.id,
          });
        }
      }

      // 10. CHECK PRIOR AUTHORIZATION
      if (matchingRule.priorAuthRequired) {
        const priorAuthCheck = await validatePriorAuthorization(note);
        if (!priorAuthCheck.valid) {
          holds.push({
            reason: 'MISSING_PRIOR_AUTH',
            details: priorAuthCheck.message,
            severity: 'CRITICAL',
            payerRuleId: matchingRule.id,
          });
        }
      }
    } else {
      // No matching rule found - this might be okay for some payers
      warnings.push(
        `No specific billing rule found for ${noteWithRelations.clinician.title} + ${noteWithRelations.noteType}. ` +
        'Please verify payer requirements before submitting.'
      );
    }
  } else {
    warnings.push('No payer assigned to client. Cannot validate billing rules.');
  }

  // Create holds in database if requested and holds exist
  if (createHolds && holds.length > 0) {
    await createBillingHolds(noteId, holds);
  }

  // Can only bill if there are no critical holds
  const canBill = holds.filter(h => h.severity === 'CRITICAL').length === 0;

  return {
    canBill,
    holds,
    warnings,
    payerRule: matchingRule || undefined,
    noteStatus: note.status,
  };
}

/**
 * Find matching payer rule for the given parameters
 */
async function findMatchingPayerRule(
  payerId: string,
  clinicianCredential: string,
  serviceType: string,
  placeOfService: string
): Promise<PayerRule | null> {
  const now = new Date();

  const rule = await prisma.payerRule.findFirst({
    where: {
      payerId,
      clinicianCredential,
      serviceType,
      placeOfService,
      isActive: true,
      effectiveDate: { lte: now },
      OR: [
        { terminationDate: null },
        { terminationDate: { gte: now } },
      ],
    },
    orderBy: {
      effectiveDate: 'desc', // Get most recent rule if multiple match
    },
  });

  return rule;
}

/**
 * Validate note status is appropriate for billing
 */
function validateNoteStatus(note: any): { valid: boolean; message: string } {
  const validStatuses = ['SIGNED', 'COSIGNED'];

  if (!validStatuses.includes(note.status)) {
    return {
      valid: false,
      message: `Note must be SIGNED or COSIGNED before billing. Current status: ${note.status}`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Validate supervision requirements are met
 */
function validateSupervision(note: any, rule: PayerRule): { valid: boolean; message: string } {
  if (rule.cosignRequired) {
    if (!note.cosignedBy || !note.cosignedDate) {
      return {
        valid: false,
        message: `Supervisor co-signature required by payer rule. ${
          note.supervisorId
            ? `Awaiting co-signature from supervisor.`
            : 'No supervisor assigned to clinician.'
        }`,
      };
    }
  }

  if (rule.supervisionRequired && !note.supervisorId) {
    return {
      valid: false,
      message: 'This payer requires supervision for this credential level, but no supervisor is assigned.',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Validate cosign happened within required timeframe
 */
function validateCosignTimeframe(
  note: any,
  rule: PayerRule
): { valid: boolean; message: string; severity: 'CRITICAL' | 'WARNING' } {
  if (!rule.cosignTimeframeDays || !note.cosignedDate) {
    return { valid: true, message: '', severity: 'WARNING' };
  }

  const sessionDate = new Date(note.sessionDate);
  const cosignedDate = new Date(note.cosignedDate);
  const daysDiff = Math.floor((cosignedDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > rule.cosignTimeframeDays) {
    return {
      valid: false,
      message: `Co-signature was completed ${daysDiff} days after session, ` +
        `but payer requires co-signature within ${rule.cosignTimeframeDays} days.`,
      severity: 'CRITICAL',
    };
  }

  // Warning if approaching deadline
  if (daysDiff === rule.cosignTimeframeDays) {
    return {
      valid: true,
      message: `Co-signature completed on the last allowable day (${rule.cosignTimeframeDays} days after session).`,
      severity: 'WARNING',
    };
  }

  return { valid: true, message: '', severity: 'WARNING' };
}

/**
 * Validate note was completed within required timeframe
 */
function validateNoteCompletionTimeframe(
  note: any,
  rule: PayerRule
): { valid: boolean; message: string; severity: 'CRITICAL' | 'WARNING' } {
  if (!rule.noteCompletionDays || !note.signedDate) {
    return { valid: true, message: '', severity: 'WARNING' };
  }

  const sessionDate = new Date(note.sessionDate);
  const signedDate = new Date(note.signedDate);
  const daysDiff = Math.floor((signedDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > rule.noteCompletionDays) {
    return {
      valid: false,
      message: `Note was completed ${daysDiff} days after session, ` +
        `but payer requires completion within ${rule.noteCompletionDays} days.`,
      severity: 'CRITICAL',
    };
  }

  // Warning if approaching deadline
  if (daysDiff >= rule.noteCompletionDays - 1) {
    return {
      valid: true,
      message: `Note completed ${daysDiff} days after session ` +
        `(deadline: ${rule.noteCompletionDays} days).`,
      severity: 'WARNING',
    };
  }

  return { valid: true, message: '', severity: 'WARNING' };
}

/**
 * Validate diagnosis is present
 */
function validateDiagnosis(note: any): { valid: boolean; message: string } {
  if (!note.diagnosisCodes || note.diagnosisCodes.length === 0) {
    return {
      valid: false,
      message: 'Diagnosis code required for billing. Please add at least one ICD-10 diagnosis code.',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Validate treatment plan exists and is current
 */
async function validateTreatmentPlan(
  note: any
): Promise<{ valid: boolean; message: string; severity: 'CRITICAL' | 'WARNING' }> {
  // Find most recent treatment plan for this client
  const treatmentPlan = await prisma.clinicalNote.findFirst({
    where: {
      clientId: note.clientId,
      noteType: 'TREATMENT_PLAN',
      status: { in: ['SIGNED', 'COSIGNED'] },
    },
    orderBy: {
      sessionDate: 'desc',
    },
  });

  if (!treatmentPlan) {
    return {
      valid: false,
      message: 'No signed treatment plan found for client. Treatment plan is required for billing.',
      severity: 'CRITICAL',
    };
  }

  // Check if treatment plan is current (within 90 days)
  const treatmentPlanDate = new Date(treatmentPlan.sessionDate);
  const sessionDate = new Date(note.sessionDate);
  const daysDiff = Math.floor((sessionDate.getTime() - treatmentPlanDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > 90) {
    return {
      valid: false,
      message: `Treatment plan is ${daysDiff} days old. Payer requires treatment plan to be updated at least every 90 days.`,
      severity: 'CRITICAL',
    };
  }

  // Warning if approaching 90 days
  if (daysDiff > 75) {
    return {
      valid: true,
      message: `Treatment plan is ${daysDiff} days old. Consider updating within ${90 - daysDiff} days.`,
      severity: 'WARNING',
    };
  }

  return { valid: true, message: '', severity: 'WARNING' };
}

/**
 * Validate medical necessity is documented
 */
function validateMedicalNecessity(note: any): { valid: boolean; message: string } {
  // Check if assessment section has meaningful content
  // (This is a basic check - could be enhanced with more sophisticated validation)
  if (!note.assessment || note.assessment.trim().length < 50) {
    return {
      valid: false,
      message: 'Medical necessity documentation insufficient. ' +
        'Assessment section must clearly document the clinical need for services.',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Validate prior authorization exists if required
 */
async function validatePriorAuthorization(
  note: any
): Promise<{ valid: boolean; message: string }> {
  // TODO: Implement prior authorization tracking in future phase
  // For now, just return a warning
  return {
    valid: false,
    message: 'Prior authorization check not yet implemented. ' +
      'Please verify authorization manually before submitting claim.',
  };
}

/**
 * Create billing hold records in database
 */
async function createBillingHolds(
  noteId: string,
  holds: BillingHoldInfo[]
): Promise<void> {
  // First, resolve any existing holds (they'll be replaced with current validation results)
  await prisma.billingHold.updateMany({
    where: {
      noteId,
      isActive: true,
    },
    data: {
      isActive: false,
      resolvedAt: new Date(),
      resolvedBy: 'SYSTEM',
    },
  });

  // Create new holds
  const holdRecords = holds.map((hold) => ({
    noteId,
    holdReason: hold.reason,
    holdDetails: hold.details,
    payerRuleId: hold.payerRuleId,
    holdPlacedBy: 'SYSTEM',
  }));

  if (holdRecords.length > 0) {
    await prisma.billingHold.createMany({
      data: holdRecords,
    });
  }
}

/**
 * Get all active billing holds (for dashboard)
 */
export async function getActiveHoldsCount(): Promise<number> {
  return await prisma.billingHold.count({
    where: { isActive: true },
  });
}

/**
 * Get holds grouped by reason (for dashboard)
 */
export async function getHoldsByReason(): Promise<Record<string, number>> {
  const holds = await prisma.billingHold.groupBy({
    by: ['holdReason'],
    where: { isActive: true },
    _count: { id: true },
  });

  return holds.reduce((acc, hold) => {
    acc[hold.holdReason] = hold._count.id;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Get all holds for a specific note
 */
export async function getHoldsForNote(noteId: string): Promise<BillingHold[]> {
  return await prisma.billingHold.findMany({
    where: {
      noteId,
      isActive: true,
    },
    include: {
      payerRule: {
        include: {
          payer: true,
        },
      },
    },
    orderBy: {
      holdPlacedAt: 'desc',
    },
  });
}

/**
 * Manually resolve a billing hold
 */
export async function resolveHold(
  holdId: string,
  resolvedBy: string
): Promise<void> {
  await prisma.billingHold.update({
    where: { id: holdId },
    data: {
      isActive: false,
      resolvedAt: new Date(),
      resolvedBy,
    },
  });
}
