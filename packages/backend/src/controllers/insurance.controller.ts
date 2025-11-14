import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

// Insurance validation schema
const insuranceSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  rank: z.string().min(1, 'Rank is required'), // Primary, Secondary, Tertiary
  insuranceCompany: z.string().min(1, 'Insurance company is required'),
  insuranceCompanyId: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  planName: z.string().min(1, 'Plan name is required'),
  planType: z.string().min(1, 'Plan type is required'),
  memberId: z.string().min(1, 'Member ID is required'),
  groupNumber: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  effectiveDate: z.string().datetime('Invalid effective date'),
  terminationDate: z.preprocess((val) => val === '' ? undefined : val, z.string().datetime().optional()),
  subscriberFirstName: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  subscriberLastName: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  subscriberDOB: z.preprocess((val) => val === '' ? undefined : val, z.string().datetime().optional()),
  subscriberSSN: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  relationshipToSubscriber: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  copay: z.number().optional(),
  deductible: z.number().optional(),
  outOfPocketMax: z.number().optional(),
  lastVerificationDate: z.preprocess((val) => val === '' ? undefined : val, z.string().datetime().optional()),
  lastVerifiedBy: z.preprocess((val) => val === '' ? undefined : val, z.string().min(1).optional()),
  verificationNotes: z.string().optional(),
});

const updateInsuranceSchema = insuranceSchema.partial().omit({ clientId: true });

// Get all insurance for a client
export const getClientInsurance = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const insurance = await prisma.insuranceInformation.findMany({
      where: { clientId },
      orderBy: { rank: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: insurance,
    });
  } catch (error) {
    const errorId = logControllerError('Get insurance', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve insurance information',
      errorId,
    });
  }
};

// Get single insurance by ID
export const getInsuranceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
      return res.status(404).json({
        success: false,
        message: 'Insurance information not found',
      });
    }

    res.status(200).json({
      success: true,
      data: insurance,
    });
  } catch (error) {
    const errorId = logControllerError('Get insurance', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve insurance information',
      errorId,
    });
  }
};

// Create insurance
export const createInsurance = async (req: Request, res: Response) => {
  try {
    const validatedData = insuranceSchema.parse(req.body);

    // Check if rank already exists for this client
    const existingInsurance = await prisma.insuranceInformation.findFirst({
      where: {
        clientId: validatedData.clientId,
        rank: validatedData.rank,
      },
    });

    if (existingInsurance) {
      return res.status(400).json({
        success: false,
        message: `Insurance rank ${validatedData.rank} already exists for this client`,
      });
    }

    const insurance = await prisma.insuranceInformation.create({
      data: {
        clientId: validatedData.clientId,
        rank: validatedData.rank,
        insuranceCompany: validatedData.insuranceCompany,
        insuranceCompanyId: validatedData.insuranceCompanyId,
        planName: validatedData.planName,
        planType: validatedData.planType,
        memberId: validatedData.memberId,
        groupNumber: validatedData.groupNumber,
        effectiveDate: new Date(validatedData.effectiveDate),
        terminationDate: validatedData.terminationDate ? new Date(validatedData.terminationDate) : null,
        subscriberFirstName: validatedData.subscriberFirstName,
        subscriberLastName: validatedData.subscriberLastName,
        subscriberDOB: validatedData.subscriberDOB ? new Date(validatedData.subscriberDOB) : null,
        subscriberSSN: validatedData.subscriberSSN,
        relationshipToSubscriber: validatedData.relationshipToSubscriber,
        copay: validatedData.copay,
        deductible: validatedData.deductible,
        outOfPocketMax: validatedData.outOfPocketMax,
        lastVerificationDate: validatedData.lastVerificationDate ? new Date(validatedData.lastVerificationDate) : null,
        lastVerifiedBy: validatedData.lastVerifiedBy,
        verificationNotes: validatedData.verificationNotes,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Insurance information created successfully',
      data: insurance,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Create insurance', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create insurance information',
      errorId,
    });
  }
};

// Update insurance
export const updateInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateInsuranceSchema.parse(req.body);

    const existingInsurance = await prisma.insuranceInformation.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance information not found',
      });
    }

    // If rank is being updated, check for conflicts
    if (validatedData.rank && validatedData.rank !== existingInsurance.rank) {
      const conflictingInsurance = await prisma.insuranceInformation.findFirst({
        where: {
          clientId: existingInsurance.clientId,
          rank: validatedData.rank,
          id: { not: id },
        },
      });

      if (conflictingInsurance) {
        return res.status(400).json({
          success: false,
          message: `Insurance rank ${validatedData.rank} already exists for this client`,
        });
      }
    }

    const updateData: any = { ...validatedData };

    // Convert date strings to Date objects
    if (validatedData.effectiveDate) {
      updateData.effectiveDate = new Date(validatedData.effectiveDate);
    }
    if (validatedData.terminationDate) {
      updateData.terminationDate = new Date(validatedData.terminationDate);
    }
    if (validatedData.subscriberDOB) {
      updateData.subscriberDOB = new Date(validatedData.subscriberDOB);
    }
    if (validatedData.lastVerificationDate) {
      updateData.lastVerificationDate = new Date(validatedData.lastVerificationDate);
    }

    const insurance = await prisma.insuranceInformation.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Insurance information updated successfully',
      data: insurance,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Update insurance', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance information',
      errorId,
    });
  }
};

// Delete insurance
export const deleteInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingInsurance = await prisma.insuranceInformation.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance information not found',
      });
    }

    await prisma.insuranceInformation.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Insurance information deleted successfully',
    });
  } catch (error) {
    const errorId = logControllerError('Delete insurance', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete insurance information',
      errorId,
    });
  }
};

// Verify insurance
export const verifyInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const existingInsurance = await prisma.insuranceInformation.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance information not found',
      });
    }

    const insurance = await prisma.insuranceInformation.update({
      where: { id },
      data: {
        lastVerificationDate: new Date(),
        lastVerifiedBy: userId,
        verificationNotes: 'Verified',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Insurance verified successfully',
      data: insurance,
    });
  } catch (error) {
    const errorId = logControllerError('Verify insurance', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to verify insurance',
      errorId,
    });
  }
};
