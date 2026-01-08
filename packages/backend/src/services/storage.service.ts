/**
 * Storage Service - AWS S3 Integration for Secure Recording Storage
 *
 * Handles HIPAA-compliant storage of telehealth recordings with:
 * - Server-side encryption (AES-256 or KMS)
 * - Presigned URLs for temporary access
 * - Lifecycle policies for automatic archival
 * - Access logging and monitoring
 *
 * @module storage.service
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';
import logger from '../utils/logger';
import axios from 'axios';
import { Readable } from 'stream';

// Initialize S3 client with AWS SDK v3
const s3Client = new S3Client({
  region: config.awsRegion || process.env.AWS_REGION || 'us-east-1',
  credentials: config.awsCredentials || {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadRecordingParams {
  recordingSid: string;
  recordingUrl: string;
  bucket: string;
  key: string;
  metadata: Record<string, any>;
  accountSid: string;
  authToken: string;
}

export interface PresignedUrlParams {
  bucket: string;
  key: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
  contentType?: string;
}

export interface DeleteRecordingParams {
  bucket: string;
  key: string;
}

/**
 * Upload recording from Twilio to S3 with encryption
 */
export async function uploadRecording(params: UploadRecordingParams): Promise<{ size: number; etag: string }> {
  try {
    const { recordingSid, recordingUrl, bucket, key, metadata, accountSid, authToken } = params;

    logger.info('Starting recording upload to S3', {
      recordingSid,
      bucket,
      key,
    });

    // Download recording from Twilio using Basic Auth
    const response = await axios.get(recordingUrl, {
      auth: {
        username: accountSid,
        password: authToken,
      },
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minutes timeout for large files
    });

    const fileBuffer = Buffer.from(response.data);
    const fileSize = fileBuffer.length;

    logger.info('Downloaded recording from Twilio', {
      recordingSid,
      size: fileSize,
      contentType: response.headers['content-type'],
    });

    // Prepare metadata for S3
    const s3Metadata: Record<string, string> = {
      'recording-sid': recordingSid,
      'session-id': metadata.sessionId,
      'appointment-id': metadata.appointmentId,
      'client-id': metadata.clientId,
      'clinician-id': metadata.clinicianId,
      'consent-given': metadata.consentGiven ? 'true' : 'false',
      'uploaded-at': new Date().toISOString(),
    };

    // Upload to S3 with server-side encryption
    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      ServerSideEncryption: 'AES256', // or 'aws:kms' for KMS encryption
      Metadata: s3Metadata,
      StorageClass: 'STANDARD_IA', // Infrequent Access for cost optimization
      Tagging: `Type=TelehealthRecording&SessionId=${metadata.sessionId}&ConsentGiven=${metadata.consentGiven}`,
    });

    const uploadResult = await s3Client.send(uploadCommand);

    logger.info('Recording uploaded to S3 successfully', {
      recordingSid,
      bucket,
      key,
      size: fileSize,
      etag: uploadResult.ETag,
    });

    return {
      size: fileSize,
      etag: uploadResult.ETag || '',
    };
  } catch (error: any) {
    logger.error('Failed to upload recording to S3', {
      error: error.message,
      recordingSid: params.recordingSid,
      bucket: params.bucket,
      key: params.key,
    });
    throw new Error(`S3 upload failed: ${error.message}`);
  }
}

/**
 * Generate presigned URL for temporary access to recording
 * HIPAA Compliance: URLs expire after 1 hour by default
 */
export async function generatePresignedUrl(params: PresignedUrlParams): Promise<string> {
  try {
    const { bucket, key, expiresIn = 3600, contentType } = params; // Default 1 hour

    // Maximum expiration: 1 hour for HIPAA compliance
    const maxExpiration = 3600;
    const actualExpiration = Math.min(expiresIn, maxExpiration);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: contentType || 'video/mp4',
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: actualExpiration,
    });

    logger.info('Generated presigned URL for recording', {
      bucket,
      key,
      expiresIn: actualExpiration,
    });

    return url;
  } catch (error: any) {
    logger.error('Failed to generate presigned URL', {
      error: error.message,
      bucket: params.bucket,
      key: params.key,
    });
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Stream recording from S3 (for playback)
 */
export async function streamRecording(bucket: string, key: string): Promise<Readable> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No data returned from S3');
    }

    logger.info('Streaming recording from S3', { bucket, key });

    // Convert ReadableStream to Node.js Readable stream
    return response.Body as Readable;
  } catch (error: any) {
    logger.error('Failed to stream recording from S3', {
      error: error.message,
      bucket,
      key,
    });
    throw new Error(`Failed to stream recording: ${error.message}`);
  }
}

/**
 * Delete recording from S3 (permanent deletion)
 */
export async function deleteRecording(params: DeleteRecordingParams): Promise<void> {
  try {
    const { bucket, key } = params;

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);

    logger.info('Recording deleted from S3', { bucket, key });
  } catch (error: any) {
    logger.error('Failed to delete recording from S3', {
      error: error.message,
      bucket: params.bucket,
      key: params.key,
    });
    throw new Error(`Failed to delete recording: ${error.message}`);
  }
}

/**
 * Get recording metadata from S3
 */
export async function getRecordingMetadata(bucket: string, key: string): Promise<any> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
      etag: response.ETag,
      storageClass: response.StorageClass,
      serverSideEncryption: response.ServerSideEncryption,
    };
  } catch (error: any) {
    logger.error('Failed to get recording metadata', {
      error: error.message,
      bucket,
      key,
    });
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
}

/**
 * List recordings in S3 bucket with prefix
 */
export async function listRecordings(bucket: string, prefix?: string): Promise<any[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000,
    });

    const response = await s3Client.send(command);

    return (response.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      etag: item.ETag,
      storageClass: item.StorageClass,
    }));
  } catch (error: any) {
    logger.error('Failed to list recordings', {
      error: error.message,
      bucket,
      prefix,
    });
    throw new Error(`Failed to list recordings: ${error.message}`);
  }
}

/**
 * Apply retention policy to recording
 * Move to Glacier for archival after X days
 */
export async function applyRetentionPolicy(bucket: string, key: string, daysToArchive: number = 365): Promise<void> {
  try {
    // Note: This is typically handled by S3 Lifecycle Policies configured at the bucket level
    // This function is a placeholder for custom retention logic if needed

    logger.info('Retention policy applied (via S3 Lifecycle)', {
      bucket,
      key,
      daysToArchive,
    });

    // Actual lifecycle transitions are configured in S3 bucket settings
    // Example: STANDARD -> STANDARD_IA (30 days) -> GLACIER (90 days) -> DEEP_ARCHIVE (365 days)
  } catch (error: any) {
    logger.error('Failed to apply retention policy', {
      error: error.message,
      bucket,
      key,
    });
    throw error;
  }
}

/**
 * Copy recording to another location (for backup or migration)
 */
export async function copyRecording(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string
): Promise<void> {
  try {
    // Get source object
    const getCommand = new GetObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    });

    const sourceObject = await s3Client.send(getCommand);

    if (!sourceObject.Body) {
      throw new Error('No data in source object');
    }

    // Read body into buffer
    const chunks: Buffer[] = [];
    const body = sourceObject.Body as Readable;

    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);

    // Upload to destination
    const putCommand = new PutObjectCommand({
      Bucket: destBucket,
      Key: destKey,
      Body: buffer,
      ContentType: sourceObject.ContentType,
      ServerSideEncryption: 'AES256',
      Metadata: sourceObject.Metadata,
      StorageClass: 'STANDARD_IA',
    });

    await s3Client.send(putCommand);

    logger.info('Recording copied successfully', {
      sourceBucket,
      sourceKey,
      destBucket,
      destKey,
    });
  } catch (error: any) {
    logger.error('Failed to copy recording', {
      error: error.message,
      sourceBucket,
      sourceKey,
      destBucket,
      destKey,
    });
    throw error;
  }
}

/**
 * Check if S3 storage is properly configured
 */
export function isStorageConfigured(): boolean {
  return !!(
    config.s3RecordingBucket &&
    (config.awsCredentials || (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY))
  );
}

/**
 * Get storage configuration status
 */
export function getStorageConfigStatus() {
  return {
    configured: isStorageConfigured(),
    hasBucket: !!config.s3RecordingBucket,
    hasCredentials: !!(
      config.awsCredentials ||
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ),
    region: config.awsRegion || process.env.AWS_REGION || 'us-east-1',
  };
}

/**
 * Validate S3 bucket access (for health checks)
 */
export async function validateBucketAccess(bucket: string): Promise<boolean> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1,
    });

    await s3Client.send(command);

    return true;
  } catch (error: any) {
    logger.error('S3 bucket access validation failed', {
      error: error.message,
      bucket,
    });
    return false;
  }
}

/**
 * Upload document to S3 with encryption
 * For general document uploads (not just recordings)
 */
export interface UploadDocumentParams {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface UploadDocumentResult {
  key: string;
  bucket: string;
  etag: string;
  size: number;
  url: string;
}

export async function uploadDocument(params: UploadDocumentParams): Promise<UploadDocumentResult> {
  try {
    const { bucket, key, body, contentType, metadata = {}, tags = {} } = params;

    logger.info('Starting document upload to S3', {
      bucket,
      key,
      contentType,
      size: body.length,
    });

    // Build tag string
    const tagString = Object.entries(tags)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        ...metadata,
        'uploaded-at': new Date().toISOString(),
      },
      ...(tagString ? { Tagging: tagString } : {}),
    });

    const uploadResult = await s3Client.send(uploadCommand);

    logger.info('Document uploaded to S3 successfully', {
      bucket,
      key,
      size: body.length,
      etag: uploadResult.ETag,
    });

    return {
      key,
      bucket,
      etag: uploadResult.ETag || '',
      size: body.length,
      url: `s3://${bucket}/${key}`,
    };
  } catch (error: any) {
    logger.error('Failed to upload document to S3', {
      error: error.message,
      bucket: params.bucket,
      key: params.key,
    });
    throw new Error(`S3 document upload failed: ${error.message}`);
  }
}

/**
 * Generate presigned URL for document upload (PUT)
 * Allows client-side direct upload to S3
 */
export async function generateUploadPresignedUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ url: string; key: string }> {
  try {
    const { bucket, key, contentType, expiresIn = 3600 } = params;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    logger.info('Generated presigned upload URL', {
      bucket,
      key,
      contentType,
      expiresIn,
    });

    return { url, key };
  } catch (error: any) {
    logger.error('Failed to generate upload presigned URL', {
      error: error.message,
      bucket: params.bucket,
      key: params.key,
    });
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
}

/**
 * Get the documents bucket name from config
 */
export function getDocumentsBucket(): string {
  return config.s3DocumentsBucket || config.s3RecordingBucket || process.env.S3_DOCUMENTS_BUCKET || 'mentalspace-documents';
}

/**
 * Delete document from S3
 */
export async function deleteDocument(bucket: string, key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);

    logger.info('Document deleted from S3', { bucket, key });
  } catch (error: any) {
    logger.error('Failed to delete document from S3', {
      error: error.message,
      bucket,
      key,
    });
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}
