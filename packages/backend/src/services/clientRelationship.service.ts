import prisma from './database';
/**
 * Client Relationship Service
 *
 * Handles client relationships and provider management for Module 2:
 * - Family tree and relationship management
 * - Provider and care team coordination
 * - ROI and consent tracking
 */

import { BadRequestError, NotFoundError } from '../utils/errors';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateRelationshipDto {
  client1Id: string;
  client2Id: string;
  relationshipType: string; // PARENT, CHILD, SPOUSE, SIBLING, GUARDIAN, EMERGENCY_CONTACT
  relationshipDetails?: string;
  isPrimary?: boolean;

  // Permissions
  isEmergencyContact?: boolean;
  isAuthorizedContact?: boolean;
  canScheduleAppointments?: boolean;
  canAccessPortal?: boolean;
  canReceiveInformation?: boolean;
  canMakeMedicalDecisions?: boolean;
  specificLimitations?: string;

  // ROI
  roiSigned?: boolean;
  roiSignedDate?: Date;
  roiExpirationDate?: Date;
  consentDocumentId?: string;

  // Dates
  relationshipStartDate?: Date;
  createdBy: string;
}

export interface UpdateRelationshipDto {
  relationshipDetails?: string;
  isPrimary?: boolean;

  // Permissions
  isEmergencyContact?: boolean;
  isAuthorizedContact?: boolean;
  canScheduleAppointments?: boolean;
  canAccessPortal?: boolean;
  canReceiveInformation?: boolean;
  canMakeMedicalDecisions?: boolean;
  specificLimitations?: string;

  // ROI
  roiSigned?: boolean;
  roiSignedDate?: Date;
  roiExpirationDate?: Date;
  consentDocumentId?: string;

  // Dates
  relationshipEndDate?: Date;
  isActive?: boolean;
}

export interface CreateProviderDto {
  clientId: string;
  providerType: string; // PRIMARY_THERAPIST, PSYCHIATRIST, CASE_MANAGER, PCP, SPECIALIST

  // Internal or External
  providerId?: string; // Internal provider (User)
  externalProviderName?: string;
  externalProviderNPI?: string;
  externalProviderPhone?: string;
  externalProviderFax?: string;
  externalProviderEmail?: string;
  specialty?: string;

  // ROI
  roiSigned?: boolean;
  roiSignedDate?: Date;
  roiExpirationDate?: Date;
  canReceiveUpdates?: boolean;
  canSendReferrals?: boolean;

  startDate?: Date;
  createdBy: string;
}

export interface UpdateProviderDto {
  externalProviderName?: string;
  externalProviderPhone?: string;
  externalProviderFax?: string;
  externalProviderEmail?: string;
  specialty?: string;

  // ROI
  roiSigned?: boolean;
  roiSignedDate?: Date;
  roiExpirationDate?: Date;
  canReceiveUpdates?: boolean;
  canSendReferrals?: boolean;
  lastCommunicationDate?: Date;

  // Status
  isActive?: boolean;
  endDate?: Date;
}

// ============================================================================
// CLIENT RELATIONSHIP FUNCTIONS
// ============================================================================

/**
 * Create a new client relationship
 */
export async function createRelationship(data: CreateRelationshipDto) {
  // Validate clients exist
  const [client1, client2] = await Promise.all([
    prisma.client.findUnique({ where: { id: data.client1Id } }),
    prisma.client.findUnique({ where: { id: data.client2Id } })
  ]);

  if (!client1) {
    throw new NotFoundError(`Client 1 with ID ${data.client1Id} not found`);
  }

  if (!client2) {
    throw new NotFoundError(`Client 2 with ID ${data.client2Id} not found`);
  }

  // Prevent self-relationships
  if (data.client1Id === data.client2Id) {
    throw new BadRequestError('Cannot create relationship with same client');
  }

  // Check for duplicate relationship
  const existingRelationship = await prisma.clientRelationship.findFirst({
    where: {
      client1Id: data.client1Id,
      client2Id: data.client2Id,
      relationshipType: data.relationshipType,
      isActive: true
    }
  });

  if (existingRelationship) {
    throw new BadRequestError(
      `A ${data.relationshipType} relationship already exists between these clients`
    );
  }

  // Create relationship
  const relationship = await prisma.clientRelationship.create({
    data: {
      client1Id: data.client1Id,
      client2Id: data.client2Id,
      relationshipType: data.relationshipType,
      relationshipDetails: data.relationshipDetails,
      isPrimary: data.isPrimary || false,

      // Permissions
      isEmergencyContact: data.isEmergencyContact || false,
      isAuthorizedContact: data.isAuthorizedContact || false,
      canScheduleAppointments: data.canScheduleAppointments || false,
      canAccessPortal: data.canAccessPortal || false,
      canReceiveInformation: data.canReceiveInformation || false,
      canMakeMedicalDecisions: data.canMakeMedicalDecisions || false,
      specificLimitations: data.specificLimitations,

      // ROI
      roiSigned: data.roiSigned || false,
      roiSignedDate: data.roiSignedDate,
      roiExpirationDate: data.roiExpirationDate,
      consentDocumentId: data.consentDocumentId,

      // Dates
      relationshipStartDate: data.relationshipStartDate || new Date(),
      createdBy: data.createdBy
    },
    include: {
      client1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      client2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      }
    }
  });

  return relationship;
}

/**
 * Get relationship by ID
 */
export async function getRelationshipById(relationshipId: string) {
  const relationship = await prisma.clientRelationship.findUnique({
    where: { id: relationshipId },
    include: {
      client1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true,
          dateOfBirth: true
        }
      },
      client2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true,
          dateOfBirth: true
        }
      },
      consentDocument: {
        select: {
          id: true,
          documentName: true,
          documentType: true
        }
      }
    }
  });

  if (!relationship) {
    throw new NotFoundError('Relationship not found');
  }

  return relationship;
}

/**
 * Update a relationship
 */
export async function updateRelationship(
  relationshipId: string,
  data: UpdateRelationshipDto
) {
  // Verify relationship exists
  await getRelationshipById(relationshipId);

  const updatedRelationship = await prisma.clientRelationship.update({
    where: { id: relationshipId },
    data: {
      ...(data.relationshipDetails !== undefined && { relationshipDetails: data.relationshipDetails }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),

      // Permissions
      ...(data.isEmergencyContact !== undefined && { isEmergencyContact: data.isEmergencyContact }),
      ...(data.isAuthorizedContact !== undefined && { isAuthorizedContact: data.isAuthorizedContact }),
      ...(data.canScheduleAppointments !== undefined && { canScheduleAppointments: data.canScheduleAppointments }),
      ...(data.canAccessPortal !== undefined && { canAccessPortal: data.canAccessPortal }),
      ...(data.canReceiveInformation !== undefined && { canReceiveInformation: data.canReceiveInformation }),
      ...(data.canMakeMedicalDecisions !== undefined && { canMakeMedicalDecisions: data.canMakeMedicalDecisions }),
      ...(data.specificLimitations !== undefined && { specificLimitations: data.specificLimitations }),

      // ROI
      ...(data.roiSigned !== undefined && { roiSigned: data.roiSigned }),
      ...(data.roiSignedDate !== undefined && { roiSignedDate: data.roiSignedDate }),
      ...(data.roiExpirationDate !== undefined && { roiExpirationDate: data.roiExpirationDate }),
      ...(data.consentDocumentId !== undefined && { consentDocumentId: data.consentDocumentId }),

      // Status
      ...(data.relationshipEndDate !== undefined && { relationshipEndDate: data.relationshipEndDate }),
      ...(data.isActive !== undefined && { isActive: data.isActive })
    },
    include: {
      client1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      client2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      }
    }
  });

  return updatedRelationship;
}

/**
 * Delete (deactivate) a relationship
 */
export async function deleteRelationship(relationshipId: string) {
  await getRelationshipById(relationshipId);

  const deletedRelationship = await prisma.clientRelationship.update({
    where: { id: relationshipId },
    data: {
      isActive: false,
      relationshipEndDate: new Date()
    }
  });

  return deletedRelationship;
}

/**
 * Get family tree for a client
 * Returns all relationships where the client is either client1 or client2
 */
export async function getFamilyTree(clientId: string) {
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true
    }
  });

  if (!client) {
    throw new NotFoundError('Client not found');
  }

  // Get all relationships where this client is involved
  const [relationshipsAsClient1, relationshipsAsClient2] = await Promise.all([
    prisma.clientRelationship.findMany({
      where: {
        client1Id: clientId,
        isActive: true
      },
      include: {
        client2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
            dateOfBirth: true,
            primaryPhone: true,
            email: true
          }
        }
      },
      orderBy: { relationshipType: 'asc' }
    }),
    prisma.clientRelationship.findMany({
      where: {
        client2Id: clientId,
        isActive: true
      },
      include: {
        client1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
            dateOfBirth: true,
            primaryPhone: true,
            email: true
          }
        }
      },
      orderBy: { relationshipType: 'asc' }
    })
  ]);

  // Transform data for easier consumption
  const familyTree = {
    client: client,
    relationships: [
      ...relationshipsAsClient1.map(rel => ({
        relationshipId: rel.id,
        relationshipType: rel.relationshipType,
        relationshipDetails: rel.relationshipDetails,
        isPrimary: rel.isPrimary,
        isEmergencyContact: rel.isEmergencyContact,
        permissions: {
          isAuthorizedContact: rel.isAuthorizedContact,
          canScheduleAppointments: rel.canScheduleAppointments,
          canAccessPortal: rel.canAccessPortal,
          canReceiveInformation: rel.canReceiveInformation,
          canMakeMedicalDecisions: rel.canMakeMedicalDecisions,
          specificLimitations: rel.specificLimitations
        },
        roi: {
          roiSigned: rel.roiSigned,
          roiSignedDate: rel.roiSignedDate,
          roiExpirationDate: rel.roiExpirationDate
        },
        relatedClient: rel.client2,
        direction: 'outgoing' // This client is client1
      })),
      ...relationshipsAsClient2.map(rel => ({
        relationshipId: rel.id,
        relationshipType: rel.relationshipType,
        relationshipDetails: rel.relationshipDetails,
        isPrimary: rel.isPrimary,
        isEmergencyContact: rel.isEmergencyContact,
        permissions: {
          isAuthorizedContact: rel.isAuthorizedContact,
          canScheduleAppointments: rel.canScheduleAppointments,
          canAccessPortal: rel.canAccessPortal,
          canReceiveInformation: rel.canReceiveInformation,
          canMakeMedicalDecisions: rel.canMakeMedicalDecisions,
          specificLimitations: rel.specificLimitations
        },
        roi: {
          roiSigned: rel.roiSigned,
          roiSignedDate: rel.roiSignedDate,
          roiExpirationDate: rel.roiExpirationDate
        },
        relatedClient: rel.client1,
        direction: 'incoming' // This client is client2
      }))
    ]
  };

  return familyTree;
}

// ============================================================================
// CLIENT PROVIDER FUNCTIONS
// ============================================================================

/**
 * Add a provider to a client's care team
 */
export async function addProvider(data: CreateProviderDto) {
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: data.clientId }
  });

  if (!client) {
    throw new NotFoundError('Client not found');
  }

  // If internal provider, verify they exist
  if (data.providerId) {
    const provider = await prisma.user.findUnique({
      where: { id: data.providerId }
    });

    if (!provider) {
      throw new NotFoundError('Internal provider not found');
    }
  }

  // Validate that either internal or external provider info is provided
  if (!data.providerId && !data.externalProviderName) {
    throw new BadRequestError(
      'Either providerId (internal) or externalProviderName (external) must be provided'
    );
  }

  const provider = await prisma.clientProvider.create({
    data: {
      clientId: data.clientId,
      providerType: data.providerType,
      providerId: data.providerId,
      externalProviderName: data.externalProviderName,
      externalProviderNPI: data.externalProviderNPI,
      externalProviderPhone: data.externalProviderPhone,
      externalProviderFax: data.externalProviderFax,
      externalProviderEmail: data.externalProviderEmail,
      specialty: data.specialty,

      // ROI
      roiSigned: data.roiSigned || false,
      roiSignedDate: data.roiSignedDate,
      roiExpirationDate: data.roiExpirationDate,
      canReceiveUpdates: data.canReceiveUpdates || false,
      canSendReferrals: data.canSendReferrals || false,

      startDate: data.startDate || new Date(),
      createdBy: data.createdBy
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          npiNumber: true
        }
      }
    }
  });

  return provider;
}

/**
 * Get provider by ID
 */
export async function getProviderById(providerId: string) {
  const provider = await prisma.clientProvider.findUnique({
    where: { id: providerId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          npiNumber: true,
          phoneNumber: true,
          email: true
        }
      }
    }
  });

  if (!provider) {
    throw new NotFoundError('Provider not found');
  }

  return provider;
}

/**
 * Update a provider
 */
export async function updateProvider(
  providerId: string,
  data: UpdateProviderDto
) {
  await getProviderById(providerId);

  const updatedProvider = await prisma.clientProvider.update({
    where: { id: providerId },
    data: {
      ...(data.externalProviderName !== undefined && { externalProviderName: data.externalProviderName }),
      ...(data.externalProviderPhone !== undefined && { externalProviderPhone: data.externalProviderPhone }),
      ...(data.externalProviderFax !== undefined && { externalProviderFax: data.externalProviderFax }),
      ...(data.externalProviderEmail !== undefined && { externalProviderEmail: data.externalProviderEmail }),
      ...(data.specialty !== undefined && { specialty: data.specialty }),

      // ROI
      ...(data.roiSigned !== undefined && { roiSigned: data.roiSigned }),
      ...(data.roiSignedDate !== undefined && { roiSignedDate: data.roiSignedDate }),
      ...(data.roiExpirationDate !== undefined && { roiExpirationDate: data.roiExpirationDate }),
      ...(data.canReceiveUpdates !== undefined && { canReceiveUpdates: data.canReceiveUpdates }),
      ...(data.canSendReferrals !== undefined && { canSendReferrals: data.canSendReferrals }),
      ...(data.lastCommunicationDate !== undefined && { lastCommunicationDate: data.lastCommunicationDate }),

      // Status
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.endDate !== undefined && { endDate: data.endDate })
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          npiNumber: true
        }
      }
    }
  });

  return updatedProvider;
}

/**
 * Delete (deactivate) a provider
 */
export async function deleteProvider(providerId: string) {
  await getProviderById(providerId);

  const deletedProvider = await prisma.clientProvider.update({
    where: { id: providerId },
    data: {
      isActive: false,
      endDate: new Date()
    }
  });

  return deletedProvider;
}

/**
 * Get care team for a client
 * Returns all active providers associated with the client
 */
export async function getCareTeam(clientId: string) {
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true
    }
  });

  if (!client) {
    throw new NotFoundError('Client not found');
  }

  const providers = await prisma.clientProvider.findMany({
    where: {
      clientId: clientId,
      isActive: true
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          npiNumber: true,
          phoneNumber: true,
          email: true,
          specialties: true
        }
      }
    },
    orderBy: [
      { providerType: 'asc' },
      { startDate: 'desc' }
    ]
  });

  // Group by provider type for easier display
  const careTeamByType = providers.reduce((acc, provider) => {
    const type = provider.providerType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(provider);
    return acc;
  }, {} as Record<string, typeof providers>);

  return {
    client,
    providers,
    byType: careTeamByType,
    totalProviders: providers.length
  };
}

/**
 * Get all relationships for a client (basic list)
 */
export async function getClientRelationships(clientId: string, activeOnly: boolean = true) {
  const where: Prisma.ClientRelationshipWhereInput = {
    OR: [
      { client1Id: clientId },
      { client2Id: clientId }
    ]
  };

  if (activeOnly) {
    where.isActive = true;
  }

  return await prisma.clientRelationship.findMany({
    where,
    include: {
      client1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      client2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get all providers for a client (basic list)
 */
export async function getClientProviders(clientId: string, activeOnly: boolean = true) {
  const where: Prisma.ClientProviderWhereInput = { clientId };

  if (activeOnly) {
    where.isActive = true;
  }

  return await prisma.clientProvider.findMany({
    where,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          npiNumber: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export const ClientRelationshipService = {
  // Relationships
  createRelationship,
  getRelationshipById,
  updateRelationship,
  deleteRelationship,
  getFamilyTree,
  getClientRelationships,

  // Providers
  addProvider,
  getProviderById,
  updateProvider,
  deleteProvider,
  getCareTeam,
  getClientProviders
};
