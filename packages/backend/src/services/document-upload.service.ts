import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';
import logger from '../utils/logger';
import guardianRelationshipService from './guardian-relationship.service';
import auditLogService from './audit-log.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Cast config for AWS properties that may not be in the type definition
const configAny = config as any;

// Initialize S3 client
const s3Client = new S3Client({
  region: configAny.awsRegion || process.env.AWS_REGION || 'us-east-1',
  credentials: configAny.awsCredentials || {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Fallback to local storage if AWS not configured
const USE_LOCAL_STORAGE = !process.env.AWS_ACCESS_KEY_ID;
const LOCAL_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH ||
  path.join(__dirname, '../../uploads/verification-documents');

export interface UploadDocumentParams {
  relationshipId: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  uploadedBy: string;
  documentType: 'BIRTH_CERTIFICATE' | 'COURT_ORDER' | 'POWER_OF_ATTORNEY' | 'HEALTHCARE_PROXY' | 'OTHER';
}

export interface DocumentMetadata {
  documentId: string;
  relationshipId: string;
  documentType: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  storageLocation: string;
}

class DocumentUploadService {
  private readonly BUCKET_NAME = process.env.GUARDIAN_DOCS_BUCKET || 'mentalspace-guardian-documents';
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Initialize local storage directory if using local storage
   */
  async initialize() {
    if (USE_LOCAL_STORAGE) {
      try {
        if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
          fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
          logger.info('Created local document storage directory', { path: LOCAL_STORAGE_PATH });
        }
      } catch (error) {
        logger.error('Error creating local storage directory:', error);
        throw error;
      }
    }
  }

  /**
   * Upload verification document
   */
  async uploadDocument(params: UploadDocumentParams): Promise<DocumentMetadata> {
    try {
      const { relationshipId, file, uploadedBy, documentType } = params;

      // Validate file
      this.validateFile(file);

      // Verify relationship exists
      const relationship = await guardianRelationshipService.getRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      // Generate unique document ID and key
      const documentId = uuidv4();
      const fileExtension = this.getFileExtension(file.originalname);
      const key = `${relationshipId}/${documentId}${fileExtension}`;

      let storageLocation: string;

      if (USE_LOCAL_STORAGE) {
        storageLocation = await this.uploadToLocal(key, file.buffer);
      } else {
        storageLocation = await this.uploadToS3(key, file.buffer, file.mimetype, {
          relationshipId,
          documentType,
          uploadedBy,
          guardianId: relationship.guardianId,
          minorId: relationship.minorId,
        });
      }

      // Add document to relationship
      await guardianRelationshipService.uploadVerificationDocument(relationshipId, storageLocation);

      // Audit log
      await auditLogService.logDocumentAccess(uploadedBy, documentId, 'UPLOAD', {
        relationshipId,
        documentType,
        fileSize: file.size,
      });

      const metadata: DocumentMetadata = {
        documentId,
        relationshipId,
        documentType,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy,
        uploadedAt: new Date(),
        storageLocation,
      };

      logger.info('Document uploaded successfully', {
        documentId,
        relationshipId,
        documentType,
      });

      return metadata;
    } catch (error) {
      logger.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get presigned URL for viewing document
   */
  async getDocumentUrl(
    storageLocation: string,
    userId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      if (USE_LOCAL_STORAGE) {
        // For local storage, return a token-based URL
        // In production, this would be handled by a secure endpoint
        return `/api/documents/view/${encodeURIComponent(storageLocation)}`;
      }

      // Extract key from storage location (format: s3://bucket/key or https://bucket.s3.region.amazonaws.com/key)
      const key = this.extractKeyFromLocation(storageLocation);

      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });

      // Audit log
      const documentId = key.split('/').pop()?.split('.')[0] || 'unknown';
      await auditLogService.logDocumentAccess(userId, documentId, 'VIEW', {
        expiresIn,
      });

      logger.info('Generated presigned URL for document', {
        key,
        expiresIn,
        userId,
      });

      return url;
    } catch (error) {
      logger.error('Error generating document URL:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(storageLocation: string, userId: string): Promise<void> {
    try {
      if (USE_LOCAL_STORAGE) {
        await this.deleteFromLocal(storageLocation);
      } else {
        const key = this.extractKeyFromLocation(storageLocation);
        await this.deleteFromS3(key);
      }

      const documentId = storageLocation.split('/').pop()?.split('.')[0] || 'unknown';
      await auditLogService.log({
        userId,
        action: 'DELETE',
        resource: 'Document',
        resourceId: documentId,
        metadata: { storageLocation },
      });

      logger.info('Document deleted', { storageLocation, userId });
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(storageLocation: string): Promise<any> {
    try {
      if (USE_LOCAL_STORAGE) {
        const filePath = path.join(LOCAL_STORAGE_PATH, storageLocation);
        const stats = fs.statSync(filePath);
        return {
          size: stats.size,
          lastModified: stats.mtime,
          exists: true,
        };
      }

      const key = this.extractKeyFromLocation(storageLocation);
      const command = new HeadObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);

      return {
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      logger.error('Error getting document metadata:', error);
      throw error;
    }
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata: Record<string, string>
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      ServerSideEncryption: 'AES256', // HIPAA-compliant encryption
    });

    await s3Client.send(command);

    return `s3://${this.BUCKET_NAME}/${key}`;
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(LOCAL_STORAGE_PATH, key);
    const directory = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, buffer);

    return key;
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(key: string): Promise<void> {
    const filePath = path.join(LOCAL_STORAGE_PATH, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: { mimetype: string; size: number; originalname: string }): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Check for malicious file names
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      throw new Error('Invalid file name');
    }
  }

  /**
   * Extract S3 key from storage location
   */
  private extractKeyFromLocation(location: string): string {
    if (location.startsWith('s3://')) {
      return location.replace(`s3://${this.BUCKET_NAME}/`, '');
    }

    if (location.startsWith('http')) {
      const url = new URL(location);
      return url.pathname.substring(1); // Remove leading /
    }

    return location;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const ext = path.extname(filename);
    return ext || '';
  }

  /**
   * Get document from local storage
   */
  async getLocalDocument(key: string): Promise<Buffer> {
    try {
      const filePath = path.join(LOCAL_STORAGE_PATH, key);

      if (!fs.existsSync(filePath)) {
        throw new Error('Document not found');
      }

      return fs.readFileSync(filePath);
    } catch (error) {
      logger.error('Error reading local document:', error);
      throw error;
    }
  }

  /**
   * Clean up old documents (for expired relationships)
   * Should be run as a scheduled job
   */
  async cleanupExpiredDocuments(retentionDays: number = 2555): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info('Starting document cleanup', {
        cutoffDate,
        retentionDays,
      });

      // This would need to be implemented based on your database schema
      // For now, just log the intent
      logger.info('Document cleanup completed (not implemented yet)');

      return 0;
    } catch (error) {
      logger.error('Error cleaning up expired documents:', error);
      throw error;
    }
  }
}

export default new DocumentUploadService();
