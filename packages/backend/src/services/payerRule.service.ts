import prisma from './database';
import type { PayerRule } from '@prisma/client';
import { validateNoteForBilling } from './billingReadiness.service';

/**
 * Phase 2.1: Payer Rule Service
 *
 * Manages payer-specific billing rules
 */

export interface CreatePayerRuleRequest {
  payerId: string;
  clinicianCredential: string;
  placeOfService: string;
  serviceType: string;
  supervisionRequired?: boolean;
  cosignRequired?: boolean;
  incidentToBillingAllowed?: boolean;
  renderingClinicianOverride?: boolean;
  cosignTimeframeDays?: number;
  noteCompletionDays?: number;
  diagnosisRequired?: boolean;
  treatmentPlanRequired?: boolean;
  medicalNecessityRequired?: boolean;
  priorAuthRequired?: boolean;
  isProhibited?: boolean;
  prohibitionReason?: string;
  effectiveDate: Date;
  terminationDate?: Date;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdatePayerRuleRequest {
  clinicianCredential?: string;
  placeOfService?: string;
  serviceType?: string;
  supervisionRequired?: boolean;
  cosignRequired?: boolean;
  incidentToBillingAllowed?: boolean;
  renderingClinicianOverride?: boolean;
  cosignTimeframeDays?: number;
  noteCompletionDays?: number;
  diagnosisRequired?: boolean;
  treatmentPlanRequired?: boolean;
  medicalNecessityRequired?: boolean;
  priorAuthRequired?: boolean;
  isProhibited?: boolean;
  prohibitionReason?: string;
  effectiveDate?: Date;
  terminationDate?: Date;
  isActive?: boolean;
}

export interface PayerRuleFilters {
  payerId?: string;
  clinicianCredential?: string;
  serviceType?: string;
  placeOfService?: string;
  isActive?: boolean;
  isProhibited?: boolean;
}

export interface TestRuleResult {
  ruleId: string;
  noteTested: number;
  wouldBlock: number;
  wouldPass: number;
  blockedNotes: Array<{
    noteId: string;
    clientId: string;
    sessionDate: Date;
    holds: string[];
  }>;
}

/**
 * Create a new payer rule
 */
export async function createPayerRule(data: CreatePayerRuleRequest): Promise<PayerRule> {
  return await prisma.payerRule.create({
    data: {
      payerId: data.payerId,
      clinicianCredential: data.clinicianCredential,
      placeOfService: data.placeOfService,
      serviceType: data.serviceType,
      supervisionRequired: data.supervisionRequired ?? false,
      cosignRequired: data.cosignRequired ?? false,
      incidentToBillingAllowed: data.incidentToBillingAllowed ?? false,
      renderingClinicianOverride: data.renderingClinicianOverride ?? false,
      cosignTimeframeDays: data.cosignTimeframeDays,
      noteCompletionDays: data.noteCompletionDays,
      diagnosisRequired: data.diagnosisRequired ?? true,
      treatmentPlanRequired: data.treatmentPlanRequired ?? true,
      medicalNecessityRequired: data.medicalNecessityRequired ?? true,
      priorAuthRequired: data.priorAuthRequired ?? false,
      isProhibited: data.isProhibited ?? false,
      prohibitionReason: data.prohibitionReason,
      effectiveDate: data.effectiveDate,
      terminationDate: data.terminationDate,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Update an existing payer rule
 */
export async function updatePayerRule(
  id: string,
  data: UpdatePayerRuleRequest
): Promise<PayerRule> {
  return await prisma.payerRule.update({
    where: { id },
    data,
  });
}

/**
 * Delete a payer rule (soft delete)
 */
export async function deletePayerRule(id: string): Promise<PayerRule> {
  return await prisma.payerRule.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Get payer rule by ID
 */
export async function getPayerRuleById(id: string): Promise<PayerRule | null> {
  return await prisma.payerRule.findUnique({
    where: { id },
    include: {
      payer: true,
    },
  });
}

/**
 * Get all payer rules with optional filters
 */
export async function getPayerRules(filters?: PayerRuleFilters): Promise<PayerRule[]> {
  const where: any = {};

  if (filters?.payerId) {
    where.payerId = filters.payerId;
  }

  if (filters?.clinicianCredential) {
    where.clinicianCredential = filters.clinicianCredential;
  }

  if (filters?.serviceType) {
    where.serviceType = filters.serviceType;
  }

  if (filters?.placeOfService) {
    where.placeOfService = filters.placeOfService;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.isProhibited !== undefined) {
    where.isProhibited = filters.isProhibited;
  }

  return await prisma.payerRule.findMany({
    where,
    include: {
      payer: true,
    },
    orderBy: [
      { payer: { name: 'asc' } },
      { clinicianCredential: 'asc' },
      { serviceType: 'asc' },
    ],
  });
}

/**
 * Find matching rule for specific parameters
 */
export async function findMatchingRule(
  payerId: string,
  clinicianCredential: string,
  serviceType: string,
  placeOfService: string
): Promise<PayerRule | null> {
  const now = new Date();

  return await prisma.payerRule.findFirst({
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
    include: {
      payer: true,
    },
    orderBy: {
      effectiveDate: 'desc',
    },
  });
}

/**
 * Test a rule against existing notes to see impact
 */
export async function testRuleAgainstNotes(
  ruleId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TestRuleResult> {
  const rule = await getPayerRuleById(ruleId);
  if (!rule) {
    throw new Error(`Payer rule ${ruleId} not found`);
  }

  // Find notes that would match this rule
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const notes = await prisma.clinicalNote.findMany({
    where: {
      clinician: {
        credentials: { some: { credentialType: rule.clinicianCredential as any } },
      },
      noteType: rule.serviceType,
      appointment: {
        serviceLocation: rule.placeOfService as any,
      },
      ...(Object.keys(dateFilter).length > 0 ? { sessionDate: dateFilter } : {}),
      status: { in: ['SIGNED', 'COSIGNED'] },
    },
    include: {
      clinician: true,
      appointment: {
        include: {
          client: true,
        },
      },
    },
    take: 100, // Limit to 100 notes for performance
  });

  const blockedNotes: Array<{
    noteId: string;
    clientId: string;
    sessionDate: Date;
    holds: string[];
  }> = [];

  let wouldBlock = 0;
  let wouldPass = 0;

  // Test each note
  for (const note of notes) {
    const validation = await validateNoteForBilling(note.id, false);

    if (!validation.canBill) {
      wouldBlock++;
      blockedNotes.push({
        noteId: note.id,
        clientId: note.clientId,
        sessionDate: note.sessionDate || new Date(),
        holds: validation.holds.map(h => h.reason),
      });
    } else {
      wouldPass++;
    }
  }

  return {
    ruleId,
    noteTested: notes.length,
    wouldBlock,
    wouldPass,
    blockedNotes,
  };
}

/**
 * Bulk import payer rules from CSV data
 */
export interface CSVPayerRule {
  payerName: string;
  clinicianCredential: string;
  placeOfService: string;
  serviceType: string;
  supervisionRequired: string;
  cosignRequired: string;
  cosignTimeframeDays?: string;
  noteCompletionDays?: string;
  incidentToBillingAllowed: string;
  renderingClinicianOverride: string;
  diagnosisRequired: string;
  treatmentPlanRequired: string;
  medicalNecessityRequired: string;
  priorAuthRequired: string;
  isProhibited: string;
  prohibitionReason?: string;
  effectiveDate: string;
  terminationDate?: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  createdRules: PayerRule[];
}

export async function bulkImportPayerRules(
  csvData: CSVPayerRule[],
  createdBy?: string
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    createdRules: [],
  };

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2; // +2 because index is 0-based and row 1 is header

    try {
      // Find payer by name
      const payer = await prisma.payer.findFirst({
        where: {
          name: { equals: row.payerName, mode: 'insensitive' },
        },
      });

      if (!payer) {
        result.errors.push({
          row: rowNumber,
          error: `Payer '${row.payerName}' not found`,
          data: row,
        });
        result.failed++;
        continue;
      }

      // Parse boolean values
      const parseBoolean = (value: string): boolean => {
        return ['true', 'yes', '1', 'y'].includes(value.toLowerCase());
      };

      // Create rule
      const rule = await createPayerRule({
        payerId: payer.id,
        clinicianCredential: row.clinicianCredential.toUpperCase(),
        placeOfService: row.placeOfService.toUpperCase(),
        serviceType: row.serviceType.toUpperCase(),
        supervisionRequired: parseBoolean(row.supervisionRequired),
        cosignRequired: parseBoolean(row.cosignRequired),
        cosignTimeframeDays: row.cosignTimeframeDays
          ? parseInt(row.cosignTimeframeDays)
          : undefined,
        noteCompletionDays: row.noteCompletionDays
          ? parseInt(row.noteCompletionDays)
          : undefined,
        incidentToBillingAllowed: parseBoolean(row.incidentToBillingAllowed),
        renderingClinicianOverride: parseBoolean(row.renderingClinicianOverride),
        diagnosisRequired: parseBoolean(row.diagnosisRequired),
        treatmentPlanRequired: parseBoolean(row.treatmentPlanRequired),
        medicalNecessityRequired: parseBoolean(row.medicalNecessityRequired),
        priorAuthRequired: parseBoolean(row.priorAuthRequired),
        isProhibited: parseBoolean(row.isProhibited),
        prohibitionReason: row.prohibitionReason,
        effectiveDate: new Date(row.effectiveDate),
        terminationDate: row.terminationDate ? new Date(row.terminationDate) : undefined,
        createdBy,
      });

      result.createdRules.push(rule);
      result.success++;
    } catch (error) {
      result.errors.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: row,
      });
      result.failed++;
    }
  }

  return result;
}

/**
 * Get payer rule statistics
 */
export async function getPayerRuleStats() {
  const [total, active, prohibited, byCredential, byService] = await Promise.all([
    prisma.payerRule.count(),
    prisma.payerRule.count({ where: { isActive: true } }),
    prisma.payerRule.count({ where: { isActive: true, isProhibited: true } }),
    prisma.payerRule.groupBy({
      by: ['clinicianCredential'],
      _count: { id: true },
      where: { isActive: true },
    }),
    prisma.payerRule.groupBy({
      by: ['serviceType'],
      _count: { id: true },
      where: { isActive: true },
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    prohibited,
    byCredential: byCredential.reduce((acc, item) => {
      acc[item.clinicianCredential] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
    byService: byService.reduce((acc, item) => {
      acc[item.serviceType] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
