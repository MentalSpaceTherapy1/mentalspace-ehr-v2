import { PrismaClient } from '@mentalspace/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';

const prisma = new PrismaClient();

// Initialize S3 client
const s3Client = new S3Client({
  region: config.awsRegion,
});

const BUCKET_NAME = config.s3BucketName;

// ============================================================================
// INSURANCE CARD MANAGEMENT
// ============================================================================

export async function uploadInsuranceCard(data: {
  clientId: string;
  insuranceType: 'PRIMARY' | 'SECONDARY';
  frontImage: Buffer;
  backImage: Buffer;
  frontImageMimeType: string;
  backImageMimeType: string;
  insuranceName?: string;
  policyNumber?: string;
  groupNumber?: string;
}) {
  try {
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Generate S3 keys
    const frontS3Key = `insurance-cards/${data.clientId}/${data.insuranceType.toLowerCase()}-front-${uuidv4()}.${getFileExtension(data.frontImageMimeType)}`;
    const backS3Key = `insurance-cards/${data.clientId}/${data.insuranceType.toLowerCase()}-back-${uuidv4()}.${getFileExtension(data.backImageMimeType)}`;

    // Upload front image to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: frontS3Key,
        Body: data.frontImage,
        ContentType: data.frontImageMimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          clientId: data.clientId,
          type: 'insurance-card-front',
        },
      })
    );

    // Upload back image to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: backS3Key,
        Body: data.backImage,
        ContentType: data.backImageMimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          clientId: data.clientId,
          type: 'insurance-card-back',
        },
      })
    );

    // Deactivate previous cards of same type
    await prisma.insuranceCard.updateMany({
      where: {
        clientId: data.clientId,
        insuranceType: data.insuranceType,
      },
      data: { isActive: false },
    });

    // Create insurance card record
    const insuranceCard = await prisma.insuranceCard.create({
      data: {
        clientId: data.clientId,
        insuranceType: data.insuranceType,
        frontImageS3Key: frontS3Key,
        backImageS3Key: backS3Key,
        insuranceName: data.insuranceName,
        policyNumber: data.policyNumber,
        groupNumber: data.groupNumber,
        isActive: true,
      },
    });

    // TODO: Update the EHR InsuranceInformation if policy number provided
    // await updateEHRInsuranceInfo(data);

    logger.info(`Insurance card uploaded for client ${data.clientId}, type: ${data.insuranceType}`);
    return insuranceCard;
  } catch (error) {
    logger.error('Error uploading insurance card:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to upload insurance card', 500);
  }
}

export async function getInsuranceCards(clientId: string) {
  try {
    const cards = await prisma.insuranceCard.findMany({
      where: { clientId },
      orderBy: { uploadedAt: 'desc' },
    });

    return cards;
  } catch (error) {
    logger.error('Error fetching insurance cards:', error);
    throw new AppError('Failed to fetch insurance cards', 500);
  }
}

export async function getActiveInsuranceCards(clientId: string) {
  try {
    const cards = await prisma.insuranceCard.findMany({
      where: {
        clientId,
        isActive: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return cards;
  } catch (error) {
    logger.error('Error fetching active insurance cards:', error);
    throw new AppError('Failed to fetch active insurance cards', 500);
  }
}

export async function getInsuranceCardImages(data: {
  clientId: string;
  cardId: string;
}) {
  try {
    const card = await prisma.insuranceCard.findFirst({
      where: {
        id: data.cardId,
        clientId: data.clientId, // Security: ensure card belongs to client
      },
    });

    if (!card) {
      throw new AppError('Insurance card not found', 404);
    }

    // In production, generate presigned URLs for temporary access
    // For now, return S3 keys
    return {
      frontImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${card.frontImageS3Key}`,
      backImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${card.backImageS3Key}`,
    };
  } catch (error) {
    logger.error('Error fetching insurance card images:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch insurance card images', 500);
  }
}

export async function deleteInsuranceCard(data: {
  clientId: string;
  cardId: string;
}) {
  try {
    const card = await prisma.insuranceCard.findFirst({
      where: {
        id: data.cardId,
        clientId: data.clientId,
      },
    });

    if (!card) {
      throw new AppError('Insurance card not found', 404);
    }

    // Mark as inactive instead of deleting (for audit trail)
    await prisma.insuranceCard.update({
      where: { id: data.cardId },
      data: { isActive: false },
    });

    logger.info(`Insurance card ${data.cardId} deactivated for client ${data.clientId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting insurance card:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete insurance card', 500);
  }
}

// ============================================================================
// EHR INTEGRATION
// ============================================================================

async function updateEHRInsuranceInfo(data: {
  clientId: string;
  insuranceType: 'PRIMARY' | 'SECONDARY';
  insuranceName?: string;
  policyNumber?: string;
  groupNumber?: string;
}) {
  try {
    // Check if insurance info already exists
    const existing = await prisma.insuranceInformation.findFirst({
      where: {
        clientId: data.clientId,
        insuranceType: data.insuranceType,
      },
    });

    if (existing) {
      // Update existing
      await prisma.insuranceInformation.update({
        where: { id: existing.id },
        data: {
          insuranceCompany: data.insuranceName || existing.insuranceCompany,
          policyNumber: data.policyNumber || existing.policyNumber,
          groupNumber: data.groupNumber || existing.groupNumber,
        },
      });
    } else if (data.insuranceName && data.policyNumber) {
      // Create new insurance info in EHR
      await prisma.insuranceInformation.create({
        data: {
          clientId: data.clientId,
          insuranceType: data.insuranceType,
          insuranceCompany: data.insuranceName,
          policyNumber: data.policyNumber,
          groupNumber: data.groupNumber || '',
          policyHolderName: '', // Client can fill this in later
          policyHolderDOB: new Date(), // Placeholder
          relationshipToInsured: 'SELF',
          isActive: true,
        },
      });
    }

    logger.info(`EHR insurance info updated for client ${data.clientId}`);
  } catch (error) {
    logger.error('Error updating EHR insurance info:', error);
    // Don't throw - this is a nice-to-have sync, not critical
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };

  return extensions[mimeType] || 'jpg';
}
