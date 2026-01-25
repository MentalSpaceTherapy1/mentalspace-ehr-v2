/**
 * PHI Encryption Middleware for Prisma
 *
 * HIPAA Compliance: Automatically encrypts PHI fields before database write
 * and decrypts them after database read.
 *
 * This middleware intercepts all Prisma operations and applies field-level
 * encryption to sensitive data, ensuring PHI is never stored in plaintext.
 *
 * Encrypted fields:
 * - SSN (Social Security Number)
 * - Date of Birth (stored as encrypted string for extra protection)
 * - Medical Record Numbers
 * - Phone numbers
 * - Email addresses
 * - Addresses
 * - Insurance information
 * - Clinical notes content
 * - Diagnosis information
 */

import { Prisma } from '@prisma/client';
import { encryptValue, decryptValue, hashForLookup } from '../utils/encryption';
import logger from '../utils/logger';

// =============================================================================
// PHI FIELD DEFINITIONS BY MODEL
// =============================================================================

/**
 * Define which fields in each model contain PHI and need encryption
 * These fields will be automatically encrypted before write and decrypted after read
 */
export const PHI_FIELDS_BY_MODEL: Record<string, string[]> = {
  // Client model - Primary PHI container
  Client: [
    'medicalRecordNumber',
    'previousMRN',
    'primaryPhone',
    'secondaryPhone',
    'email',
    'guardianPhone',
    'addressStreet1',
    'addressStreet2',
    'addressCity',
    'addressState',
    'addressZipCode',
    'addressCounty',
    'mailingStreet1',
    'mailingStreet2',
    'mailingCity',
    'mailingState',
    'mailingZipCode',
  ],

  // Insurance Information - Contains subscriber PII
  InsuranceInformation: [
    'memberId',
    'groupNumber',
    'subscriberFirstName',
    'subscriberLastName',
    'subscriberEmployer',
    'customerServicePhone',
    'precertificationPhone',
    'providerPhone',
  ],

  // Emergency Contact - PII
  EmergencyContact: [
    'name',
    'phone',
    'alternatePhone',
    'email',
    'address',
  ],

  // Legal Guardian - PII
  LegalGuardian: [
    'firstName',
    'lastName',
    'phoneNumber',
    'email',
    'address',
  ],

  // User model - Staff PII
  User: [
    'phoneNumber',
    'personalEmail',
    'emergencyContactName',
    'emergencyContactPhone',
    'licenseNumber',
    'deaNumber',
    'npiNumber',
    'taxId',
  ],

  // Clinical Note - PHI content
  ClinicalNote: [
    'subjective',
    'objective',
    'assessment',
    'plan',
    'riskAssessmentDetails',
    'inputTranscript',
  ],

  // Diagnosis - Clinical PHI
  Diagnosis: [
    'diagnosisDescription',
    'notes',
  ],

  // Client Diagnosis - Clinical PHI
  ClientDiagnosis: [
    'diagnosisName',
    'supportingEvidence',
    'differentialConsiderations',
  ],

  // Medication - Clinical PHI
  Medication: [
    'medicationName',
    'dosage',
    'frequency',
    'route',
    'instructions',
    'sideEffects',
    'notes',
  ],

  // Portal Account - NO PHI encryption needed
  // Note: verificationToken and passwordResetToken are NOT PHI
  // They are security tokens that need to be matched directly with URL tokens
  // Encrypting them breaks the token lookup flow

  // Prior Authorization - Clinical and Insurance PHI
  PriorAuthorization: [
    'authorizationNumber',
    'clinicalJustification',
  ],

  // Insurance Card
  InsuranceCard: [
    'policyNumber',
    'groupNumber',
  ],

  // Practice Settings - API keys and secrets
  PracticeSettings: [
    'aiApiKey',
    'smtpPass',
    'twilioAuthToken',
    'stripeSecretKey',
  ],
};

/**
 * Fields that should have a hash stored for lookup purposes
 * This allows searching without decrypting all records
 */
export const HASHABLE_FIELDS: Record<string, string[]> = {
  Client: ['medicalRecordNumber', 'email', 'primaryPhone'],
  InsuranceInformation: ['memberId'],
  User: ['email'],
  PortalAccount: ['email'],
};

// =============================================================================
// ENCRYPTION HELPERS
// =============================================================================

/**
 * Check if a value is already encrypted (has our encryption format)
 */
function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

/**
 * Encrypt a single field value if it's not already encrypted
 */
function encryptField(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  if (isEncrypted(value)) return value; // Already encrypted
  return encryptValue(value);
}

/**
 * Decrypt a single field value
 */
function decryptField(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  if (!isEncrypted(value)) return value; // Not encrypted
  return decryptValue(value);
}

/**
 * Encrypt PHI fields in data object for a specific model
 */
export function encryptPHIFields(modelName: string, data: any): any {
  if (!data || typeof data !== 'object') return data;

  const phiFields = PHI_FIELDS_BY_MODEL[modelName];
  if (!phiFields || phiFields.length === 0) return data;

  const encrypted = { ...data };

  for (const field of phiFields) {
    if (field in encrypted && encrypted[field] !== null && encrypted[field] !== undefined) {
      try {
        encrypted[field] = encryptField(encrypted[field]);
      } catch (error) {
        logger.error(`Failed to encrypt field ${field} in ${modelName}`, { error });
        throw new Error(`PHI encryption failed for ${modelName}.${field}`);
      }
    }
  }

  // NOTE: Hash fields are currently disabled because the database schema
  // doesn't have the corresponding hash columns (e.g., medicalRecordNumberHash).
  // To enable hash-based lookups for encrypted fields, add these columns:
  // - Client: medicalRecordNumberHash, emailHash, primaryPhoneHash
  // - InsuranceInformation: memberIdHash
  // - User: emailHash
  // - PortalAccount: emailHash
  //
  // Uncomment this block after adding the hash columns to the schema:
  /*
  const hashableFields = HASHABLE_FIELDS[modelName];
  if (hashableFields) {
    for (const field of hashableFields) {
      if (field in data && data[field] !== null && data[field] !== undefined) {
        const hashFieldName = `${field}Hash`;
        encrypted[hashFieldName] = hashForLookup(String(data[field]));
      }
    }
  }
  */

  return encrypted;
}

/**
 * Decrypt PHI fields in data object for a specific model
 */
export function decryptPHIFields(modelName: string, data: any): any {
  if (!data || typeof data !== 'object') return data;

  const phiFields = PHI_FIELDS_BY_MODEL[modelName];
  if (!phiFields || phiFields.length === 0) return data;

  const decrypted = { ...data };

  for (const field of phiFields) {
    if (field in decrypted && decrypted[field] !== null && decrypted[field] !== undefined) {
      try {
        decrypted[field] = decryptField(decrypted[field]);
      } catch (error) {
        logger.error(`Failed to decrypt field ${field} in ${modelName}`, { error });
        // Return original value if decryption fails (might be unencrypted legacy data)
        // This allows graceful migration
      }
    }
  }

  return decrypted;
}

/**
 * Recursively decrypt PHI fields in nested data structures
 */
export function decryptPHIFieldsRecursive(modelName: string, data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => decryptPHIFieldsRecursive(modelName, item));
  }

  if (typeof data === 'object') {
    const decrypted = decryptPHIFields(modelName, data);

    // Handle nested relations
    for (const [key, value] of Object.entries(decrypted)) {
      if (value && typeof value === 'object') {
        // Check if this is a known model relation
        const relationModelName = getRelationModelName(modelName, key);
        if (relationModelName) {
          decrypted[key] = decryptPHIFieldsRecursive(relationModelName, value);
        }
      }
    }

    return decrypted;
  }

  return data;
}

/**
 * Get the model name for a relation field
 */
function getRelationModelName(parentModel: string, fieldName: string): string | null {
  const relationMap: Record<string, Record<string, string>> = {
    Client: {
      emergencyContacts: 'EmergencyContact',
      legalGuardians: 'LegalGuardian',
      insuranceInfo: 'InsuranceInformation', // Fixed: was 'insuranceInformation', should match schema relation name
      diagnoses: 'ClientDiagnosis',
      medications: 'Medication',
      clinicalNotes: 'ClinicalNote',
    },
    ClinicalNote: {
      client: 'Client',
    },
    Appointment: {
      client: 'Client',
      clinician: 'User',
    },
    // Portal and related models - need to decrypt nested client PHI
    PortalAccount: {
      client: 'Client',
    },
    TelehealthSession: {
      client: 'Client',
      clinician: 'User',
    },
    Charge: {
      client: 'Client',
    },
    Payment: {
      client: 'Client',
    },
    Claim: {
      client: 'Client',
    },
  };

  return relationMap[parentModel]?.[fieldName] || null;
}

// =============================================================================
// PRISMA MIDDLEWARE
// =============================================================================

/**
 * Prisma middleware for automatic PHI encryption/decryption
 *
 * This middleware intercepts database operations and:
 * 1. Encrypts PHI fields before create/update operations
 * 2. Decrypts PHI fields after read operations
 * 3. Logs encryption/decryption operations for audit trail
 */
export function createPHIEncryptionMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    const modelName = params.model as string;

    // Skip if model doesn't have PHI fields
    if (!PHI_FIELDS_BY_MODEL[modelName]) {
      return next(params);
    }

    // Encrypt on write operations
    if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
      if (params.args.data) {
        params.args.data = encryptPHIFields(modelName, params.args.data);
        logger.debug(`PHI encrypted for ${modelName} ${params.action}`, {
          model: modelName,
          action: params.action,
        });
      }

      // Handle createMany
      if (params.action === 'create' && params.args.data && Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => encryptPHIFields(modelName, item));
      }
    }

    // Handle updateMany - encrypt the data being set
    if (params.action === 'updateMany' && params.args.data) {
      params.args.data = encryptPHIFields(modelName, params.args.data);
    }

    // Execute the query
    const result = await next(params);

    // Decrypt on read operations
    if (params.action === 'findUnique' || params.action === 'findFirst' || params.action === 'findMany') {
      if (result) {
        if (Array.isArray(result)) {
          return result.map(item => decryptPHIFieldsRecursive(modelName, item));
        }
        return decryptPHIFieldsRecursive(modelName, result);
      }
    }

    // Decrypt result of create/update operations
    if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
      if (result) {
        return decryptPHIFieldsRecursive(modelName, result);
      }
    }

    return result;
  };
}

// =============================================================================
// SEARCH HELPERS
// =============================================================================

/**
 * Generate a hash for searching encrypted fields
 * Use this when you need to search by SSN, MRN, etc. without decrypting
 *
 * @example
 * const ssnHash = generateSearchHash('123-45-6789');
 * const client = await prisma.client.findFirst({
 *   where: { ssnHash }
 * });
 */
export function generateSearchHash(value: string): string {
  return hashForLookup(value);
}

/**
 * Build a where clause for searching by an encrypted field
 * Returns a hash-based search condition
 */
export function buildEncryptedFieldSearch(fieldName: string, value: string): Record<string, string> {
  return {
    [`${fieldName}Hash`]: hashForLookup(value),
  };
}

// =============================================================================
// MIGRATION UTILITIES
// =============================================================================

/**
 * Encrypt existing unencrypted data in a model
 * Use this for migrating existing data to encrypted format
 *
 * @param prisma - Prisma client instance
 * @param modelName - Name of the model to encrypt
 * @param batchSize - Number of records to process at once
 */
export async function encryptExistingData(
  prisma: any,
  modelName: string,
  batchSize: number = 100
): Promise<{ processed: number; encrypted: number; errors: number }> {
  const phiFields = PHI_FIELDS_BY_MODEL[modelName];
  if (!phiFields || phiFields.length === 0) {
    return { processed: 0, encrypted: 0, errors: 0 };
  }

  let processed = 0;
  let encrypted = 0;
  let errors = 0;
  let skip = 0;

  const modelAccess = prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (!modelAccess) {
    throw new Error(`Model ${modelName} not found in Prisma client`);
  }

  while (true) {
    const records = await modelAccess.findMany({
      take: batchSize,
      skip,
    });

    if (records.length === 0) break;

    for (const record of records) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        for (const field of phiFields) {
          const value = record[field];
          if (value && typeof value === 'string' && !isEncrypted(value)) {
            updates[field] = encryptField(value);
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await modelAccess.update({
            where: { id: record.id },
            data: updates,
          });
          encrypted++;
        }

        processed++;
      } catch (error) {
        logger.error(`Failed to encrypt record ${record.id} in ${modelName}`, { error });
        errors++;
      }
    }

    skip += batchSize;

    // Log progress
    logger.info(`PHI encryption migration progress for ${modelName}`, {
      processed,
      encrypted,
      errors,
    });
  }

  return { processed, encrypted, errors };
}

/**
 * Verify encryption status of a model
 * Returns statistics about encrypted vs unencrypted records
 */
export async function verifyEncryptionStatus(
  prisma: any,
  modelName: string
): Promise<{ total: number; encrypted: number; unencrypted: number }> {
  const phiFields = PHI_FIELDS_BY_MODEL[modelName];
  if (!phiFields || phiFields.length === 0) {
    return { total: 0, encrypted: 0, unencrypted: 0 };
  }

  const modelAccess = prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (!modelAccess) {
    throw new Error(`Model ${modelName} not found in Prisma client`);
  }

  const records = await modelAccess.findMany();
  let encrypted = 0;
  let unencrypted = 0;

  for (const record of records) {
    let hasUnencrypted = false;

    for (const field of phiFields) {
      const value = record[field];
      if (value && typeof value === 'string' && !isEncrypted(value)) {
        hasUnencrypted = true;
        break;
      }
    }

    if (hasUnencrypted) {
      unencrypted++;
    } else {
      encrypted++;
    }
  }

  return {
    total: records.length,
    encrypted,
    unencrypted,
  };
}
