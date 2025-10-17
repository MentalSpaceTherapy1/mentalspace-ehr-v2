import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Insurance validation schema
const insuranceSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  rank: z.number().int().min(1).max(3),
  insuranceType: z.string().min(1, 'Insurance type is required'),
  payerName: z.string().min(1, 'Payer name is required'),
  payerId: z.string().optional(),
  memberNumber: z.string().min(1, 'Member number is required'),
  groupNumber: z.string().optional(),
  planName: z.string().optional(),
  planType: z.string().optional(),
  effectiveDate: z.string().datetime('Invalid effective date'),
  terminationDate: z.string().datetime().optional(),
  subscriberFirstName: z.string().min(1, 'Subscriber first name is required'),
  subscriberLastName: z.string().min(1, 'Subscriber last name is required'),
  subscriberDOB: z.string().datetime('Invalid subscriber DOB'),
  subscriberRelationship: z.string().min(1, 'Relationship is required'),
  subscriberSSN: z.string().optional(),
  copay: z.number().optional(),
  deductible: z.number().optional(),
  outOfPocketMax: z.number().optional(),
  verificationStatus: z.string().default('PENDING'),
  verificationDate: z.string().datetime().optional(),
  verifiedBy: z.string().optional(),
  authorizationRequired: z.boolean().default(false),
  authorizationNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateInsuranceSchema = insuranceSchema.partial().omit({ clientId: true });

// Get all insurance for a client
export const getClientInsurance = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const insurance = await prisma.insuranceInfo.findMany({
      where: { clientId },
      orderBy: { rank: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: insurance,
    });
  } catch (error) {
    console.error('Get insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve insurance information',
      errors: [error],
    });
  }
};

// Get single insurance by ID
export const getInsuranceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const insurance = await prisma.insuranceInfo.findUnique({
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
    console.error('Get insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve insurance information',
      errors: [error],
    });
  }
};

// Create insurance
export const createInsurance = async (req: Request, res: Response) => {
  try {
    const validatedData = insuranceSchema.parse(req.body);

    // Check if rank already exists for this client
    const existingInsurance = await prisma.insuranceInfo.findFirst({
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

    const insurance = await prisma.insuranceInfo.create({
      data: {
        ...validatedData,
        effectiveDate: new Date(validatedData.effectiveDate),
        terminationDate: validatedData.terminationDate ? new Date(validatedData.terminationDate) : null,
        subscriberDOB: new Date(validatedData.subscriberDOB),
        verificationDate: validatedData.verificationDate ? new Date(validatedData.verificationDate) : null,
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

    console.error('Create insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create insurance information',
      errors: [error],
    });
  }
};

// Update insurance
export const updateInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateInsuranceSchema.parse(req.body);

    const existingInsurance = await prisma.insuranceInfo.findUnique({
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
      const conflictingInsurance = await prisma.insuranceInfo.findFirst({
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
    if (validatedData.verificationDate) {
      updateData.verificationDate = new Date(validatedData.verificationDate);
    }

    const insurance = await prisma.insuranceInfo.update({
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

    console.error('Update insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance information',
      errors: [error],
    });
  }
};

// Delete insurance
export const deleteInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingInsurance = await prisma.insuranceInfo.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance information not found',
      });
    }

    await prisma.insuranceInfo.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Insurance information deleted successfully',
    });
  } catch (error) {
    console.error('Delete insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete insurance information',
      errors: [error],
    });
  }
};

// Verify insurance
export const verifyInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const existingInsurance = await prisma.insuranceInfo.findUnique({
      where: { id },
    });

    if (!existingInsurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance information not found',
      });
    }

    const insurance = await prisma.insuranceInfo.update({
      where: { id },
      data: {
        verificationStatus: 'VERIFIED',
        verificationDate: new Date(),
        verifiedBy: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Insurance verified successfully',
      data: insurance,
    });
  } catch (error) {
    console.error('Verify insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify insurance',
      errors: [error],
    });
  }
};
