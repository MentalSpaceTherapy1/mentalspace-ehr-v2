/**
 * Insurance Service
 * Phase 3.2: Business logic extracted from insurance.controller.ts
 *
 * Handles all insurance-related business operations including:
 * - Insurance CRUD operations
 * - Rank conflict validation
 * - Date string conversions
 * - Verification tracking
 */

import prisma from './database';
import { InsuranceInformation, Prisma } from '@mentalspace/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';

// Validation schemas
export const insuranceSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  rank: z.string().min(1, 'Rank is required'), // Primary, Secondary, Tertiary
  insuranceCompany: z.string().min(1, 'Insurance company is required'),
  insuranceCompanyId: z.string().optional(),
  planName: z.string().min(1, 'Plan name is required'),
  planType: z.string().min(1, 'Plan type is required'),
  memberId: z.string().min(1, 'Member ID is required'),
  groupNumber: z.string().optional(),
  effectiveDate: z.string().datetime('Invalid effective date'),
  terminationDate: z.string().optional(),
  subscriberFirstName: z.string().optional(),
  subscriberLastName: z.string().optional(),
  subscriberDOB: z.string().optional(),
  relationshipToSubscriber: z.string().optional(),
  copay: z.number().optional(),
  deductible: z.number().optional(),
  outOfPocketMax: z.number().optional(),
  lastVerificationDate: z.string().optional(),
  lastVerifiedBy: z.string().optional(),
  verificationNotes: z.string().optional(),
});

export const updateInsuranceSchema = insuranceSchema.partial().omit({ clientId: true });

// Types
export type CreateInsuranceInput = z.infer<typeof insuranceSchema>;
export type UpdateInsuranceInput = z.infer<typeof updateInsuranceSchema>;

/**
 * Insurance Service Class
 * Encapsulates all insurance-related business logic
 */
class InsuranceService {
  /**
   * Convert empty strings to undefined for optional fields
   */
  private sanitizeOptionalString(value: string | undefined): string | undefined {
    return value === '' ? undefined : value;
  }

  /**
   * Convert date string to Date object, handling empty strings
   */
  private parseDateString(dateStr: string | undefined): Date | null {
    if (!dateStr || dateStr === '') {
      return null;
    }
    return new Date(dateStr);
  }

  /**
   * Build Prisma create data from validated input
   */
  private buildCreateData(data: CreateInsuranceInput): Prisma.InsuranceInformationUncheckedCreateInput {
    return {
      clientId: data.clientId,
      rank: data.rank,
      insuranceCompany: data.insuranceCompany,
      insuranceCompanyId: this.sanitizeOptionalString(data.insuranceCompanyId),
      planName: data.planName,
      planType: data.planType,
      memberId: data.memberId,
      groupNumber: this.sanitizeOptionalString(data.groupNumber),
      effectiveDate: new Date(data.effectiveDate),
      terminationDate: this.parseDateString(data.terminationDate),
      subscriberFirstName: this.sanitizeOptionalString(data.subscriberFirstName),
      subscriberLastName: this.sanitizeOptionalString(data.subscriberLastName),
      subscriberDOB: this.parseDateString(data.subscriberDOB),
      relationshipToSubscriber: this.sanitizeOptionalString(data.relationshipToSubscriber),
      copay: data.copay,
      deductible: data.deductible,
      outOfPocketMax: data.outOfPocketMax,
      lastVerificationDate: this.parseDateString(data.lastVerificationDate),
      lastVerifiedBy: this.sanitizeOptionalString(data.lastVerifiedBy),
      verificationNotes: data.verificationNotes,
    };
  }

  /**
   * Build Prisma update data from validated input
   */
  private buildUpdateData(data: UpdateInsuranceInput): Prisma.InsuranceInformationUpdateInput {
    const updateData: Prisma.InsuranceInformationUpdateInput = {};

    if (data.rank !== undefined) updateData.rank = data.rank;
    if (data.insuranceCompany !== undefined) updateData.insuranceCompany = data.insuranceCompany;
    if (data.insuranceCompanyId !== undefined) updateData.insuranceCompanyId = this.sanitizeOptionalString(data.insuranceCompanyId);
    if (data.planName !== undefined) updateData.planName = data.planName;
    if (data.planType !== undefined) updateData.planType = data.planType;
    if (data.memberId !== undefined) updateData.memberId = data.memberId;
    if (data.groupNumber !== undefined) updateData.groupNumber = this.sanitizeOptionalString(data.groupNumber);
    if (data.effectiveDate !== undefined) updateData.effectiveDate = new Date(data.effectiveDate);
    if (data.terminationDate !== undefined) updateData.terminationDate = this.parseDateString(data.terminationDate);
    if (data.subscriberFirstName !== undefined) updateData.subscriberFirstName = this.sanitizeOptionalString(data.subscriberFirstName);
    if (data.subscriberLastName !== undefined) updateData.subscriberLastName = this.sanitizeOptionalString(data.subscriberLastName);
    if (data.subscriberDOB !== undefined) updateData.subscriberDOB = this.parseDateString(data.subscriberDOB);
    if (data.relationshipToSubscriber !== undefined) updateData.relationshipToSubscriber = this.sanitizeOptionalString(data.relationshipToSubscriber);
    if (data.copay !== undefined) updateData.copay = data.copay;
    if (data.deductible !== undefined) updateData.deductible = data.deductible;
    if (data.outOfPocketMax !== undefined) updateData.outOfPocketMax = data.outOfPocketMax;
    if (data.lastVerificationDate !== undefined) updateData.lastVerificationDate = this.parseDateString(data.lastVerificationDate);
    if (data.lastVerifiedBy !== undefined) updateData.lastVerifiedBy = this.sanitizeOptionalString(data.lastVerifiedBy);
    if (data.verificationNotes !== undefined) updateData.verificationNotes = data.verificationNotes;

    return updateData;
  }

  /**
   * Check if an insurance rank already exists for a client
   */
  async checkRankConflict(
    clientId: string,
    rank: string,
    excludeId?: string
  ): Promise<boolean> {
    const existingInsurance = await prisma.insuranceInformation.findFirst({
      where: {
        clientId,
        rank,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return !!existingInsurance;
  }

  /**
   * Get all insurance records for a client
   */
  async getClientInsurance(clientId: string): Promise<InsuranceInformation[]> {
    return prisma.insuranceInformation.findMany({
      where: { clientId },
      orderBy: { rank: 'asc' },
    });
  }

  /**
   * Get a single insurance record by ID
   */
  async getInsuranceById(id: string): Promise<InsuranceInformation & { client: { id: string; firstName: string; lastName: string; medicalRecordNumber: string } }> {
    const insurance = await prisma.insuranceInformation.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
      },
    });

    if (!insurance) {
      throw new NotFoundError('Insurance information');
    }

    return insurance;
  }

  /**
   * Create a new insurance record
   */
  async createInsurance(data: CreateInsuranceInput): Promise<InsuranceInformation> {
    // Validate input
    const validatedData = insuranceSchema.parse(data);

    // Check for rank conflict
    const hasConflict = await this.checkRankConflict(
      validatedData.clientId,
      validatedData.rank
    );

    if (hasConflict) {
      throw new BadRequestError(
        `Insurance rank ${validatedData.rank} already exists for this client`
      );
    }

    // Build and create
    const createData = this.buildCreateData(validatedData);

    logger.info('Creating insurance record', {
      clientId: validatedData.clientId,
      rank: validatedData.rank,
      company: validatedData.insuranceCompany,
    });

    return prisma.insuranceInformation.create({
      data: createData,
    });
  }

  /**
   * Update an existing insurance record
   */
  async updateInsurance(
    id: string,
    data: UpdateInsuranceInput
  ): Promise<InsuranceInformation> {
    // Validate input
    const validatedData = updateInsuranceSchema.parse(data);

    // Check insurance exists
    const existingInsurance = await prisma.insuranceInformation.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      throw new NotFoundError('Insurance information');
    }

    // Check for rank conflict if rank is being changed
    if (validatedData.rank && validatedData.rank !== existingInsurance.rank) {
      const hasConflict = await this.checkRankConflict(
        existingInsurance.clientId,
        validatedData.rank,
        id
      );

      if (hasConflict) {
        throw new BadRequestError(
          `Insurance rank ${validatedData.rank} already exists for this client`
        );
      }
    }

    // Build and update
    const updateData = this.buildUpdateData(validatedData);

    return prisma.insuranceInformation.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete an insurance record
   */
  async deleteInsurance(id: string): Promise<void> {
    const existingInsurance = await prisma.insuranceInformation.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      throw new NotFoundError('Insurance information');
    }

    await prisma.insuranceInformation.delete({
      where: { id },
    });

    logger.info('Insurance record deleted', { id });
  }

  /**
   * Mark insurance as verified
   */
  async verifyInsurance(
    id: string,
    verifiedBy: string,
    notes?: string
  ): Promise<InsuranceInformation> {
    const existingInsurance = await prisma.insuranceInformation.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      throw new NotFoundError('Insurance information');
    }

    return prisma.insuranceInformation.update({
      where: { id },
      data: {
        lastVerificationDate: new Date(),
        lastVerifiedBy: verifiedBy,
        verificationNotes: notes || 'Verified',
      },
    });
  }
}

// Export singleton instance
export const insuranceService = new InsuranceService();
export default insuranceService;
