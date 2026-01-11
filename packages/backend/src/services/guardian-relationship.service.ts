import prisma from './database';
import logger from '../utils/logger';
import { Prisma } from '@prisma/client';

export interface CreateGuardianRelationshipData {
  guardianId: string;
  minorId: string;
  relationshipType: 'PARENT' | 'LEGAL_GUARDIAN' | 'HEALTHCARE_PROXY';
  accessLevel: 'FULL' | 'LIMITED' | 'VIEW_ONLY';
  canScheduleAppointments?: boolean;
  canViewRecords?: boolean;
  canCommunicateWithClinician?: boolean;
  notes?: string;
}

export interface GuardianRelationshipFilters {
  guardianId?: string;
  minorId?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  relationshipType?: string;
  page?: number;
  limit?: number;
}

export interface UpdateRelationshipData {
  relationshipType?: 'PARENT' | 'LEGAL_GUARDIAN' | 'HEALTHCARE_PROXY';
  accessLevel?: 'FULL' | 'LIMITED' | 'VIEW_ONLY';
  canScheduleAppointments?: boolean;
  canViewRecords?: boolean;
  canCommunicateWithClinician?: boolean;
  endDate?: Date;
  notes?: string;
}

class GuardianRelationshipService {
  /**
   * Create a new guardian relationship request
   * Initial status is PENDING until admin verifies
   */
  async createGuardianRelationship(data: CreateGuardianRelationshipData) {
    try {
      // Verify guardian user exists
      const guardian = await prisma.user.findUnique({
        where: { id: data.guardianId },
      });

      if (!guardian) {
        throw new Error('Guardian user not found');
      }

      // Verify minor client exists
      const minor = await prisma.client.findUnique({
        where: { id: data.minorId },
      });

      if (!minor) {
        throw new Error('Minor client not found');
      }

      // Check if relationship already exists
      const existing = await prisma.guardianRelationship.findFirst({
        where: {
          guardianId: data.guardianId,
          minorId: data.minorId,
          verificationStatus: {
            in: ['PENDING', 'VERIFIED'],
          },
        },
      });

      if (existing) {
        throw new Error('Guardian relationship already exists or is pending verification');
      }

      // Set permissions based on access level
      let permissions = {
        canScheduleAppointments: true,
        canViewRecords: true,
        canCommunicateWithClinician: true,
      };

      if (data.accessLevel === 'LIMITED') {
        permissions = {
          canScheduleAppointments: false,
          canViewRecords: true,
          canCommunicateWithClinician: false,
        };
      } else if (data.accessLevel === 'VIEW_ONLY') {
        permissions = {
          canScheduleAppointments: false,
          canViewRecords: true,
          canCommunicateWithClinician: false,
        };
      }

      // Allow custom overrides
      if (data.canScheduleAppointments !== undefined) {
        permissions.canScheduleAppointments = data.canScheduleAppointments;
      }
      if (data.canViewRecords !== undefined) {
        permissions.canViewRecords = data.canViewRecords;
      }
      if (data.canCommunicateWithClinician !== undefined) {
        permissions.canCommunicateWithClinician = data.canCommunicateWithClinician;
      }

      const relationship = await prisma.guardianRelationship.create({
        data: {
          guardianId: data.guardianId,
          minorId: data.minorId,
          relationshipType: data.relationshipType,
          accessLevel: data.accessLevel,
          verificationStatus: 'PENDING',
          ...permissions,
          notes: data.notes,
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
              dateOfBirth: true,
            },
          },
        },
      });

      logger.info(`Guardian relationship created: ${relationship.id}`, {
        guardianId: data.guardianId,
        minorId: data.minorId,
        relationshipType: data.relationshipType,
      });

      return relationship;
    } catch (error) {
      logger.error('Error creating guardian relationship:', error);
      throw error;
    }
  }

  /**
   * Get guardian relationships with filters and pagination
   */
  async getGuardianRelationships(filters: GuardianRelationshipFilters) {
    try {
      const {
        guardianId,
        minorId,
        verificationStatus,
        relationshipType,
        page = 1,
        limit = 20,
      } = filters;

      const where: Prisma.GuardianRelationshipWhereInput = {};

      if (guardianId) where.guardianId = guardianId;
      if (minorId) where.minorId = minorId;
      if (verificationStatus) where.verificationStatus = verificationStatus;
      if (relationshipType) where.relationshipType = relationshipType;

      const [relationships, total] = await Promise.all([
        prisma.guardianRelationship.findMany({
          where,
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
            minor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                medicalRecordNumber: true,
                dateOfBirth: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.guardianRelationship.count({ where }),
      ]);

      return {
        relationships,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting guardian relationships:', error);
      throw error;
    }
  }

  /**
   * Get all minors for a specific guardian
   */
  async getMinorsByGuardian(guardianId: string) {
    try {
      const relationships = await prisma.guardianRelationship.findMany({
        where: {
          guardianId,
          verificationStatus: 'VERIFIED',
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } },
          ],
        },
        include: {
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
              dateOfBirth: true,
              email: true,
              primaryPhone: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return relationships.map((rel) => ({
        relationshipId: rel.id,
        minor: (rel as any).minor,
        relationshipType: rel.relationshipType,
        accessLevel: rel.accessLevel,
        permissions: {
          canScheduleAppointments: rel.canScheduleAppointments,
          canViewRecords: rel.canViewRecords,
          canCommunicateWithClinician: rel.canCommunicateWithClinician,
        },
        startDate: rel.startDate,
        endDate: rel.endDate,
      }));
    } catch (error) {
      logger.error('Error getting minors by guardian:', error);
      throw error;
    }
  }

  /**
   * Get all guardians for a specific minor
   */
  async getGuardiansByMinor(minorId: string) {
    try {
      const relationships = await prisma.guardianRelationship.findMany({
        where: {
          minorId,
          verificationStatus: 'VERIFIED',
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } },
          ],
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return relationships.map((rel) => ({
        relationshipId: rel.id,
        guardian: rel.guardian,
        relationshipType: rel.relationshipType,
        accessLevel: rel.accessLevel,
        permissions: {
          canScheduleAppointments: rel.canScheduleAppointments,
          canViewRecords: rel.canViewRecords,
          canCommunicateWithClinician: rel.canCommunicateWithClinician,
        },
        startDate: rel.startDate,
        endDate: rel.endDate,
      }));
    } catch (error) {
      logger.error('Error getting guardians by minor:', error);
      throw error;
    }
  }

  /**
   * Update a guardian relationship
   */
  async updateRelationship(id: string, data: UpdateRelationshipData) {
    try {
      const relationship = await prisma.guardianRelationship.update({
        where: { id },
        data,
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
            },
          },
        },
      });

      logger.info(`Guardian relationship updated: ${id}`, { data });

      return relationship;
    } catch (error) {
      logger.error('Error updating guardian relationship:', error);
      throw error;
    }
  }

  /**
   * Admin verifies a guardian relationship
   */
  async verifyRelationship(id: string, adminId: string, notes?: string) {
    try {
      const relationship = await prisma.guardianRelationship.findUnique({
        where: { id },
        include: {
          minor: true,
        },
      });

      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      if (relationship.verificationStatus !== 'PENDING') {
        throw new Error('Relationship is not in pending status');
      }

      // Check if minor is under 18 or if it's a healthcare proxy
      const age = this.calculateAge(relationship.minor.dateOfBirth);
      if (age >= 18 && relationship.relationshipType !== 'HEALTHCARE_PROXY') {
        throw new Error('Guardian access for adults only allowed for HEALTHCARE_PROXY');
      }

      const updated = await prisma.guardianRelationship.update({
        where: { id },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedBy: adminId,
          verifiedAt: new Date(),
          notes: notes || relationship.notes,
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info(`Guardian relationship verified: ${id}`, {
        adminId,
        guardianId: relationship.guardianId,
        minorId: relationship.minorId,
      });

      return updated;
    } catch (error) {
      logger.error('Error verifying guardian relationship:', error);
      throw error;
    }
  }

  /**
   * Admin rejects a guardian relationship
   */
  async rejectRelationship(id: string, adminId: string, reason: string) {
    try {
      const relationship = await prisma.guardianRelationship.findUnique({
        where: { id },
      });

      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      if (relationship.verificationStatus !== 'PENDING') {
        throw new Error('Relationship is not in pending status');
      }

      const updated = await prisma.guardianRelationship.update({
        where: { id },
        data: {
          verificationStatus: 'REJECTED',
          verifiedBy: adminId,
          verifiedAt: new Date(),
          notes: reason,
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info(`Guardian relationship rejected: ${id}`, {
        adminId,
        reason,
      });

      return updated;
    } catch (error) {
      logger.error('Error rejecting guardian relationship:', error);
      throw error;
    }
  }

  /**
   * Revoke a guardian relationship (end access)
   */
  async revokeRelationship(id: string, reason: string) {
    try {
      const relationship = await prisma.guardianRelationship.update({
        where: { id },
        data: {
          endDate: new Date(),
          notes: `REVOKED: ${reason}`,
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info(`Guardian relationship revoked: ${id}`, { reason });

      return relationship;
    } catch (error) {
      logger.error('Error revoking guardian relationship:', error);
      throw error;
    }
  }

  /**
   * Check if guardian has specific permission for a minor
   */
  async checkAccess(
    guardianId: string,
    minorId: string,
    permission?: 'schedule' | 'view' | 'communicate'
  ): Promise<boolean> {
    try {
      const relationship = await prisma.guardianRelationship.findFirst({
        where: {
          guardianId,
          minorId,
          verificationStatus: 'VERIFIED',
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } },
          ],
        },
      });

      if (!relationship) {
        return false;
      }

      // If no specific permission requested, just check relationship exists
      if (!permission) {
        return true;
      }

      // Check specific permission
      switch (permission) {
        case 'schedule':
          return relationship.canScheduleAppointments;
        case 'view':
          return relationship.canViewRecords;
        case 'communicate':
          return relationship.canCommunicateWithClinician;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking guardian access:', error);
      return false;
    }
  }

  /**
   * Upload verification document for a relationship
   */
  async uploadVerificationDocument(relationshipId: string, fileUrl: string) {
    try {
      const relationship = await prisma.guardianRelationship.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      const documents = relationship.verificationDocuments || [];
      documents.push(fileUrl);

      const updated = await prisma.guardianRelationship.update({
        where: { id: relationshipId },
        data: {
          verificationDocuments: documents,
        },
      });

      logger.info(`Verification document uploaded for relationship: ${relationshipId}`);

      return updated;
    } catch (error) {
      logger.error('Error uploading verification document:', error);
      throw error;
    }
  }

  /**
   * Get relationships expiring soon (for notifications)
   */
  async getExpiringRelationships(daysFromNow: number = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysFromNow);

      const relationships = await prisma.guardianRelationship.findMany({
        where: {
          verificationStatus: 'VERIFIED',
          endDate: {
            lte: futureDate,
            gt: new Date(),
          },
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
        },
      });

      return relationships;
    } catch (error) {
      logger.error('Error getting expiring relationships:', error);
      throw error;
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Get relationship by ID
   */
  async getRelationshipById(id: string) {
    try {
      const relationship = await prisma.guardianRelationship.findUnique({
        where: { id },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          minor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
              dateOfBirth: true,
              email: true,
              primaryPhone: true,
            },
          },
        },
      });

      return relationship;
    } catch (error) {
      logger.error('Error getting relationship by ID:', error);
      throw error;
    }
  }
}

export default new GuardianRelationshipService();
