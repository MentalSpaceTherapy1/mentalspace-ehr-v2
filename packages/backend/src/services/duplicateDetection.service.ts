/**
 * Duplicate Detection Service
 * Implements algorithms for detecting potential duplicate clients
 *
 * Detection Algorithms:
 * 1. Exact Match - Name + DOB + Phone
 * 2. SSN Match - (Without actual SSN in this implementation)
 * 3. Phonetic Match - Soundex algorithm for name similarity
 * 4. Fuzzy Match - Levenshtein distance for name similarity
 * 5. Partial DOB Match - Year/Month match with name similarity
 * 6. Address Match - Street address + zip code similarity
 */

import { PrismaClient, Client, PotentialDuplicate } from '@mentalspace/database';
// @ts-ignore - no type declarations available
import soundex from 'soundex-code';
// @ts-ignore - no type declarations available
import levenshtein from 'fast-levenshtein';

const prisma = new PrismaClient();

export interface DuplicateMatch {
  clientId: string;
  matchType: 'EXACT' | 'PHONETIC' | 'FUZZY' | 'PARTIAL_DOB' | 'ADDRESS';
  confidenceScore: number;
  matchFields: string[];
  matchedClient: Client;
}

export interface MergeClientsParams {
  sourceClientId: string;
  targetClientId: string;
  reviewedBy: string;
  resolutionNotes?: string;
}

/**
 * Check for potential duplicates when creating or updating a client
 */
export async function checkForDuplicates(clientData: {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  primaryPhone: string;
  addressStreet1?: string;
  addressZipCode?: string;
  excludeClientId?: string;
}): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];

  // Get all active clients (not merged)
  const clients = await prisma.client.findMany({
    where: {
      isMerged: false,
      id: clientData.excludeClientId
        ? { not: clientData.excludeClientId }
        : undefined,
    },
  });

  for (const client of clients) {
    // Algorithm 1: Exact Match
    const exactMatch = checkExactMatch(clientData, client);
    if (exactMatch) {
      matches.push(exactMatch);
      continue; // Skip other checks if exact match found
    }

    // Algorithm 3: Phonetic Match (Soundex)
    const phoneticMatch = checkPhoneticMatch(clientData, client);
    if (phoneticMatch) {
      matches.push(phoneticMatch);
    }

    // Algorithm 4: Fuzzy Match (Levenshtein)
    const fuzzyMatch = checkFuzzyMatch(clientData, client);
    if (fuzzyMatch) {
      matches.push(fuzzyMatch);
    }

    // Algorithm 5: Partial DOB Match
    const partialDobMatch = checkPartialDobMatch(clientData, client);
    if (partialDobMatch) {
      matches.push(partialDobMatch);
    }

    // Algorithm 6: Address Match
    if (clientData.addressStreet1 && clientData.addressZipCode) {
      const addressClientData = {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        addressStreet1: clientData.addressStreet1,
        addressZipCode: clientData.addressZipCode,
      };
      const addressMatch = checkAddressMatch(addressClientData, client);
      if (addressMatch) {
        matches.push(addressMatch);
      }
    }
  }

  // Sort by confidence score (highest first)
  matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

  // Remove duplicates (same client matched by multiple algorithms)
  const uniqueMatches = matches.reduce((acc, match) => {
    const existing = acc.find((m) => m.clientId === match.clientId);
    if (!existing || match.confidenceScore > existing.confidenceScore) {
      return [
        ...acc.filter((m) => m.clientId !== match.clientId),
        match,
      ];
    }
    return acc;
  }, [] as DuplicateMatch[]);

  return uniqueMatches;
}

/**
 * Algorithm 1: Exact Match
 * Checks for exact matches on name, DOB, and phone
 */
function checkExactMatch(
  clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    primaryPhone: string;
  },
  existingClient: Client
): DuplicateMatch | null {
  const nameMatch =
    normalizeString(clientData.firstName) ===
      normalizeString(existingClient.firstName) &&
    normalizeString(clientData.lastName) ===
      normalizeString(existingClient.lastName);

  const dobMatch =
    clientData.dateOfBirth.toISOString().split('T')[0] ===
    existingClient.dateOfBirth.toISOString().split('T')[0];

  const phoneMatch =
    normalizePhone(clientData.primaryPhone) ===
    normalizePhone(existingClient.primaryPhone);

  if (nameMatch && dobMatch && phoneMatch) {
    return {
      clientId: existingClient.id,
      matchType: 'EXACT',
      confidenceScore: 1.0,
      matchFields: ['firstName', 'lastName', 'dateOfBirth', 'primaryPhone'],
      matchedClient: existingClient,
    };
  }

  return null;
}

/**
 * Algorithm 3: Phonetic Match (Soundex)
 * Checks for phonetically similar names
 */
function checkPhoneticMatch(
  clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
  },
  existingClient: Client
): DuplicateMatch | null {
  const firstNameSoundex = soundex(clientData.firstName);
  const lastNameSoundex = soundex(clientData.lastName);

  const existingFirstNameSoundex = soundex(existingClient.firstName);
  const existingLastNameSoundex = soundex(existingClient.lastName);

  const nameMatch =
    firstNameSoundex === existingFirstNameSoundex &&
    lastNameSoundex === existingLastNameSoundex;

  const dobMatch =
    clientData.dateOfBirth.toISOString().split('T')[0] ===
    existingClient.dateOfBirth.toISOString().split('T')[0];

  if (nameMatch && dobMatch) {
    return {
      clientId: existingClient.id,
      matchType: 'PHONETIC',
      confidenceScore: 0.85,
      matchFields: ['firstName', 'lastName', 'dateOfBirth'],
      matchedClient: existingClient,
    };
  }

  return null;
}

/**
 * Algorithm 4: Fuzzy Match (Levenshtein Distance)
 * Checks for similar names using edit distance
 */
function checkFuzzyMatch(
  clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
  },
  existingClient: Client
): DuplicateMatch | null {
  const firstNameDistance = levenshtein.get(
    normalizeString(clientData.firstName),
    normalizeString(existingClient.firstName)
  );
  const lastNameDistance = levenshtein.get(
    normalizeString(clientData.lastName),
    normalizeString(existingClient.lastName)
  );

  // Calculate similarity score (0-1, where 1 is identical)
  const firstNameSimilarity =
    1 -
    firstNameDistance /
      Math.max(
        clientData.firstName.length,
        existingClient.firstName.length
      );
  const lastNameSimilarity =
    1 -
    lastNameDistance /
      Math.max(clientData.lastName.length, existingClient.lastName.length);

  // Require both names to be at least 80% similar
  const namesSimilar =
    firstNameSimilarity >= 0.8 && lastNameSimilarity >= 0.8;

  const dobMatch =
    clientData.dateOfBirth.toISOString().split('T')[0] ===
    existingClient.dateOfBirth.toISOString().split('T')[0];

  if (namesSimilar && dobMatch) {
    const avgSimilarity = (firstNameSimilarity + lastNameSimilarity) / 2;
    return {
      clientId: existingClient.id,
      matchType: 'FUZZY',
      confidenceScore: avgSimilarity * 0.9, // Max 0.9 for fuzzy matches
      matchFields: ['firstName', 'lastName', 'dateOfBirth'],
      matchedClient: existingClient,
    };
  }

  return null;
}

/**
 * Algorithm 5: Partial DOB Match
 * Checks for same year/month of birth with similar names
 */
function checkPartialDobMatch(
  clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
  },
  existingClient: Client
): DuplicateMatch | null {
  const clientYear = clientData.dateOfBirth.getFullYear();
  const clientMonth = clientData.dateOfBirth.getMonth();
  const existingYear = existingClient.dateOfBirth.getFullYear();
  const existingMonth = existingClient.dateOfBirth.getMonth();

  const yearMonthMatch = clientYear === existingYear && clientMonth === existingMonth;

  if (yearMonthMatch) {
    // Check for name similarity using fuzzy matching
    const firstNameDistance = levenshtein.get(
      normalizeString(clientData.firstName),
      normalizeString(existingClient.firstName)
    );
    const lastNameDistance = levenshtein.get(
      normalizeString(clientData.lastName),
      normalizeString(existingClient.lastName)
    );

    const firstNameSimilarity =
      1 -
      firstNameDistance /
        Math.max(
          clientData.firstName.length,
          existingClient.firstName.length
        );
    const lastNameSimilarity =
      1 -
      lastNameDistance /
        Math.max(clientData.lastName.length, existingClient.lastName.length);

    const namesSimilar =
      firstNameSimilarity >= 0.7 && lastNameSimilarity >= 0.7;

    if (namesSimilar) {
      return {
        clientId: existingClient.id,
        matchType: 'PARTIAL_DOB',
        confidenceScore: 0.65,
        matchFields: ['firstName', 'lastName', 'year', 'month'],
        matchedClient: existingClient,
      };
    }
  }

  return null;
}

/**
 * Algorithm 6: Address Match
 * Checks for same address
 */
function checkAddressMatch(
  clientData: {
    firstName: string;
    lastName: string;
    addressStreet1: string;
    addressZipCode: string;
  },
  existingClient: Client
): DuplicateMatch | null {
  const streetMatch =
    normalizeString(clientData.addressStreet1) ===
    normalizeString(existingClient.addressStreet1);

  const zipMatch =
    normalizeString(clientData.addressZipCode) ===
    normalizeString(existingClient.addressZipCode);

  if (streetMatch && zipMatch) {
    // Check for name similarity
    const firstNameDistance = levenshtein.get(
      normalizeString(clientData.firstName),
      normalizeString(existingClient.firstName)
    );
    const lastNameDistance = levenshtein.get(
      normalizeString(clientData.lastName),
      normalizeString(existingClient.lastName)
    );

    const firstNameSimilarity =
      1 -
      firstNameDistance /
        Math.max(
          clientData.firstName.length,
          existingClient.firstName.length
        );
    const lastNameSimilarity =
      1 -
      lastNameDistance /
        Math.max(clientData.lastName.length, existingClient.lastName.length);

    const namesSimilar =
      firstNameSimilarity >= 0.6 && lastNameSimilarity >= 0.6;

    if (namesSimilar) {
      return {
        clientId: existingClient.id,
        matchType: 'ADDRESS',
        confidenceScore: 0.75,
        matchFields: ['addressStreet1', 'addressZipCode', 'name'],
        matchedClient: existingClient,
      };
    }
  }

  return null;
}

/**
 * Save potential duplicates to database
 */
export async function savePotentialDuplicates(
  newClientId: string,
  matches: DuplicateMatch[]
): Promise<void> {
  for (const match of matches) {
    // Ensure client1Id is always the smaller UUID to avoid duplicates
    const [client1Id, client2Id] = [newClientId, match.clientId].sort();

    // Check if duplicate already exists
    const existing = await prisma.potentialDuplicate.findUnique({
      where: {
        client1Id_client2Id: {
          client1Id,
          client2Id,
        },
      },
    });

    if (!existing) {
      await prisma.potentialDuplicate.create({
        data: {
          client1Id,
          client2Id,
          matchType: match.matchType,
          confidenceScore: match.confidenceScore,
          matchFields: match.matchFields,
          status: 'PENDING',
        },
      });
    }
  }
}

/**
 * Get pending duplicates for review
 */
export async function getPendingDuplicates(): Promise<PotentialDuplicate[]> {
  return prisma.potentialDuplicate.findMany({
    where: {
      status: 'PENDING',
    },
    include: {
      client1: true,
      client2: true,
    },
    orderBy: {
      confidenceScore: 'desc',
    },
  });
}

/**
 * Merge two client records
 * Transfers all relationships from source to target client
 */
export async function mergeClients({
  sourceClientId,
  targetClientId,
  reviewedBy,
  resolutionNotes,
}: MergeClientsParams): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Update all related records to point to target client

    // Emergency Contacts
    await tx.emergencyContact.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Legal Guardians
    await tx.legalGuardian.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Insurance Information
    await tx.insuranceInformation.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Appointments
    await tx.appointment.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Clinical Notes
    await tx.clinicalNote.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Treatment Plans
    await tx.treatmentPlan.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Diagnoses
    await tx.diagnosis.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Medications
    await tx.medication.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Documents
    await tx.clientDocument.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Charges
    await tx.chargeEntry.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Payments
    await tx.paymentRecord.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // Statements
    await tx.clientStatement.updateMany({
      where: { clientId: sourceClientId },
      data: { clientId: targetClientId },
    });

    // 2. Mark source client as merged
    await tx.client.update({
      where: { id: sourceClientId },
      data: {
        isMerged: true,
        mergedIntoId: targetClientId,
        mergedAt: new Date(),
      },
    });

    // 3. Update all potential duplicate records
    await tx.potentialDuplicate.updateMany({
      where: {
        OR: [
          { client1Id: sourceClientId },
          { client2Id: sourceClientId },
          { client1Id: targetClientId },
          { client2Id: targetClientId },
        ],
        status: 'PENDING',
      },
      data: {
        status: 'MERGED',
        reviewedBy,
        reviewedAt: new Date(),
        resolutionNotes: resolutionNotes || 'Clients merged',
      },
    });
  });
}

/**
 * Dismiss a potential duplicate
 */
export async function dismissDuplicate(
  duplicateId: string,
  reviewedBy: string,
  resolutionNotes?: string
): Promise<void> {
  await prisma.potentialDuplicate.update({
    where: { id: duplicateId },
    data: {
      status: 'DISMISSED',
      reviewedBy,
      reviewedAt: new Date(),
      resolutionNotes: resolutionNotes || 'Not a duplicate',
    },
  });
}

/**
 * Helper: Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Helper: Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, ''); // Remove all non-digit characters
}

// ============================================================================
// Phase 3.2: Additional service methods for controller refactoring
// ============================================================================

/**
 * Get duplicate detection statistics
 */
export async function getDuplicateStats() {
  const [pending, dismissed, merged, total] = await Promise.all([
    prisma.potentialDuplicate.count({ where: { status: 'PENDING' } }),
    prisma.potentialDuplicate.count({ where: { status: 'DISMISSED' } }),
    prisma.potentialDuplicate.count({ where: { status: 'MERGED' } }),
    prisma.potentialDuplicate.count(),
  ]);

  const byMatchType = await prisma.potentialDuplicate.groupBy({
    by: ['matchType'],
    _count: true,
    where: { status: 'PENDING' },
  });

  return {
    total,
    pending,
    dismissed,
    merged,
    byMatchType,
  };
}
