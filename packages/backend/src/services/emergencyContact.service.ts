/**
 * Emergency Contact Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateEmergencyContactInput {
  clientId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
  canPickup?: boolean;
  notes?: string;
}

export interface UpdateEmergencyContactInput {
  firstName?: string;
  lastName?: string;
  relationship?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
  canPickup?: boolean;
  notes?: string;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get all emergency contacts for a client
 */
export async function getEmergencyContacts(clientId: string) {
  return prisma.emergencyContact.findMany({
    where: { clientId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

/**
 * Get single emergency contact by ID
 */
export async function getEmergencyContactById(id: string) {
  return prisma.emergencyContact.findUnique({
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
}

/**
 * Create emergency contact
 */
export async function createEmergencyContact(data: CreateEmergencyContactInput) {
  // Transform the data to match database schema
  // Frontend sends: firstName, lastName, phoneNumber, canPickup, notes
  // Database expects: name, phone (no canPickup or notes columns)
  const dbData = {
    clientId: data.clientId,
    name: `${data.firstName} ${data.lastName}`.trim(),
    relationship: data.relationship,
    phone: data.phoneNumber,
    alternatePhone: data.alternatePhone || null,
    email: data.email || null,
    address: data.address || null,
    isPrimary: data.isPrimary ?? false,
    okayToDiscussHealth: false, // Default value
    okayToLeaveMessage: true,   // Default value
  };

  // If this contact is marked as primary, unset any other primary contacts for this client
  if (data.isPrimary) {
    await prisma.emergencyContact.updateMany({
      where: {
        clientId: data.clientId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  }

  return prisma.emergencyContact.create({
    data: dbData,
  });
}

/**
 * Update emergency contact
 */
export async function updateEmergencyContact(id: string, data: UpdateEmergencyContactInput) {
  const existingContact = await prisma.emergencyContact.findUnique({
    where: { id },
  });

  if (!existingContact) {
    return null;
  }

  // Transform the data to match database schema
  const dbData: Partial<{
    name: string;
    phone: string;
    relationship: string;
    alternatePhone: string | null;
    email: string | null;
    address: string | null;
    isPrimary: boolean;
  }> = {};

  if (data.firstName !== undefined && data.lastName !== undefined) {
    dbData.name = `${data.firstName} ${data.lastName}`.trim();
  } else if (data.firstName !== undefined || data.lastName !== undefined) {
    // If only one name field is provided, we need to handle it carefully
    // Parse existing name if needed
    const parts = existingContact.name.split(' ');
    const currentFirst = parts[0] || '';
    const currentLast = parts.slice(1).join(' ') || '';
    const newFirst = data.firstName !== undefined ? data.firstName : currentFirst;
    const newLast = data.lastName !== undefined ? data.lastName : currentLast;
    dbData.name = `${newFirst} ${newLast}`.trim();
  }
  if (data.phoneNumber !== undefined) dbData.phone = data.phoneNumber;
  if (data.relationship !== undefined) dbData.relationship = data.relationship;
  if (data.alternatePhone !== undefined) dbData.alternatePhone = data.alternatePhone || null;
  if (data.email !== undefined) dbData.email = data.email || null;
  if (data.address !== undefined) dbData.address = data.address || null;
  if (data.isPrimary !== undefined) dbData.isPrimary = data.isPrimary;

  // If this contact is being set as primary, unset other primary contacts
  if (data.isPrimary) {
    await prisma.emergencyContact.updateMany({
      where: {
        clientId: existingContact.clientId,
        isPrimary: true,
        id: { not: id },
      },
      data: {
        isPrimary: false,
      },
    });
  }

  return prisma.emergencyContact.update({
    where: { id },
    data: dbData,
  });
}

/**
 * Delete emergency contact
 */
export async function deleteEmergencyContact(id: string) {
  const existingContact = await prisma.emergencyContact.findUnique({
    where: { id },
  });

  if (!existingContact) {
    return null;
  }

  await prisma.emergencyContact.delete({
    where: { id },
  });

  return true;
}
