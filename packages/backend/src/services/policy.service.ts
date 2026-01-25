/**
 * Policy Service
 * Module 9: Compliance Management - Agent 3
 *
 * Handles policy lifecycle management, version control, distribution,
 * acknowledgment tracking, and compliance reporting.
 */

import { PrismaClient, Policy, PolicyAcknowledgment, PolicyCategory, PolicyStatus } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface CreatePolicyDto {
  policyName: string;
  policyNumber: string;
  category: PolicyCategory;
  version: string;
  effectiveDate: Date;
  reviewDate: Date;
  nextReviewDate?: Date;
  ownerId: string;
  content: string;
  summary?: string;
  attachments?: string[];
  distributionList?: string[];
  requireAck?: boolean;
  status?: PolicyStatus;
}

export interface UpdatePolicyDto {
  policyName?: string;
  category?: PolicyCategory;
  version?: string;
  effectiveDate?: Date;
  reviewDate?: Date;
  nextReviewDate?: Date;
  ownerId?: string;
  approvedById?: string;
  approvalDate?: Date;
  content?: string;
  summary?: string;
  attachments?: string[];
  distributionList?: string[];
  requireAck?: boolean;
  status?: PolicyStatus;
  isActive?: boolean;
}

export interface AcknowledgePolicyDto {
  policyId: string;
  userId: string;
  signature?: string;
  ipAddress?: string;
}

export interface PolicySearchFilters {
  category?: PolicyCategory;
  status?: PolicyStatus;
  isActive?: boolean;
  ownerId?: string;
  approvedById?: string;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
  requiresReview?: boolean;
}

export interface ComplianceReportFilters {
  policyId?: string;
  userId?: string;
  acknowledgedFrom?: Date;
  acknowledgedTo?: Date;
  pending?: boolean;
}

export class PolicyService {
  /**
   * Create a new policy
   * @param data Policy creation data
   * @returns Created policy
   */
  async createPolicy(data: CreatePolicyDto): Promise<Policy> {
    try {
      // Check if policy number already exists
      const existingPolicy = await prisma.policy.findUnique({
        where: { policyNumber: data.policyNumber }
      });

      if (existingPolicy) {
        throw new Error(`Policy number ${data.policyNumber} already exists`);
      }

      // Verify owner exists
      const owner = await prisma.user.findUnique({
        where: { id: data.ownerId }
      });

      if (!owner) {
        throw new Error(`Owner with ID ${data.ownerId} not found`);
      }

      // Create policy
      const policy = await prisma.policy.create({
        data: {
          policyName: data.policyName,
          policyNumber: data.policyNumber,
          category: data.category,
          version: data.version,
          effectiveDate: data.effectiveDate,
          reviewDate: data.reviewDate,
          nextReviewDate: data.nextReviewDate,
          ownerId: data.ownerId,
          content: data.content,
          summary: data.summary,
          attachments: data.attachments || [],
          distributionList: data.distributionList || [],
          requireAck: data.requireAck || false,
          status: data.status || PolicyStatus.DRAFT,
          isActive: true
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      logger.info(`✅ Policy created: ${policy.policyNumber} - ${policy.policyName}`);
      return policy;
    } catch (error) {
      logger.error(' Error creating policy:', error);
      throw error;
    }
  }

  /**
   * Get policy by ID
   * @param id Policy ID
   * @returns Policy with related data
   */
  async getPolicyById(id: string): Promise<Policy | null> {
    try {
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          },
          acknowledgments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            },
            orderBy: {
              acknowledgedDate: 'desc'
            }
          }
        }
      });

      return policy;
    } catch (error) {
      logger.error(' Error fetching policy:', error);
      throw error;
    }
  }

  /**
   * Get policy by policy number
   * @param policyNumber Policy number
   * @returns Policy
   */
  async getPolicyByNumber(policyNumber: string): Promise<Policy | null> {
    try {
      const policy = await prisma.policy.findUnique({
        where: { policyNumber },
        include: {
          owner: true,
          approvedBy: true,
          acknowledgments: {
            include: {
              user: true
            }
          }
        }
      });

      return policy;
    } catch (error) {
      logger.error(' Error fetching policy by number:', error);
      throw error;
    }
  }

  /**
   * List all policies with optional filters
   * @param filters Search filters
   * @returns Array of policies
   */
  async listPolicies(filters?: PolicySearchFilters): Promise<Policy[]> {
    try {
      const where: any = {};

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.ownerId) {
        where.ownerId = filters.ownerId;
      }

      if (filters?.approvedById) {
        where.approvedById = filters.approvedById;
      }

      if (filters?.effectiveDateFrom || filters?.effectiveDateTo) {
        where.effectiveDate = {};
        if (filters.effectiveDateFrom) {
          where.effectiveDate.gte = filters.effectiveDateFrom;
        }
        if (filters.effectiveDateTo) {
          where.effectiveDate.lte = filters.effectiveDateTo;
        }
      }

      // Filter policies requiring review (nextReviewDate in the past)
      if (filters?.requiresReview) {
        where.nextReviewDate = {
          lte: new Date()
        };
      }

      const policies = await prisma.policy.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              acknowledgments: true
            }
          }
        },
        orderBy: {
          effectiveDate: 'desc'
        }
      });

      return policies;
    } catch (error) {
      logger.error(' Error listing policies:', error);
      throw error;
    }
  }

  /**
   * Update an existing policy
   * @param id Policy ID
   * @param data Update data
   * @returns Updated policy
   */
  async updatePolicy(id: string, data: UpdatePolicyDto): Promise<Policy> {
    try {
      // Check if policy exists
      const existingPolicy = await prisma.policy.findUnique({
        where: { id }
      });

      if (!existingPolicy) {
        throw new Error(`Policy with ID ${id} not found`);
      }

      // If changing status to PUBLISHED, automatically distribute
      const shouldDistribute = data.status === PolicyStatus.PUBLISHED &&
                              existingPolicy.status !== PolicyStatus.PUBLISHED;

      const policy = await prisma.policy.update({
        where: { id },
        data,
        include: {
          owner: true,
          approvedBy: true,
          acknowledgments: {
            include: {
              user: true
            }
          }
        }
      });

      logger.info(`✅ Policy updated: ${policy.policyNumber} - ${policy.policyName}`);

      // If publishing for the first time, log distribution
      if (shouldDistribute && policy.distributionList.length > 0) {
        logger.info(`📧 Policy distributed to ${policy.distributionList.length} users`);
      }

      return policy;
    } catch (error) {
      logger.error(' Error updating policy:', error);
      throw error;
    }
  }

  /**
   * Delete a policy (soft delete by setting isActive to false)
   * @param id Policy ID
   * @returns Deleted policy
   */
  async deletePolicy(id: string): Promise<Policy> {
    try {
      const policy = await prisma.policy.update({
        where: { id },
        data: {
          isActive: false,
          status: PolicyStatus.ARCHIVED
        }
      });

      logger.info(`🗑️ Policy archived: ${policy.policyNumber}`);
      return policy;
    } catch (error) {
      logger.error(' Error deleting policy:', error);
      throw error;
    }
  }

  /**
   * Create a new version of an existing policy
   * @param policyId Original policy ID
   * @param newVersion New version number
   * @param changes Changes made in this version
   * @returns New policy version
   */
  async createNewVersion(
    policyId: string,
    newVersion: string,
    changes: Partial<CreatePolicyDto>
  ): Promise<Policy> {
    try {
      const originalPolicy = await this.getPolicyById(policyId);

      if (!originalPolicy) {
        throw new Error(`Policy with ID ${policyId} not found`);
      }

      // Archive the old version
      await this.updatePolicy(policyId, {
        status: PolicyStatus.ARCHIVED,
        isActive: false
      });

      // Create new version with updated data
      const newPolicy = await this.createPolicy({
        ...changes,
        policyName: changes.policyName || originalPolicy.policyName,
        policyNumber: originalPolicy.policyNumber, // Keep same policy number
        category: changes.category || originalPolicy.category,
        version: newVersion,
        effectiveDate: changes.effectiveDate || new Date(),
        reviewDate: changes.reviewDate || new Date(),
        nextReviewDate: changes.nextReviewDate,
        ownerId: changes.ownerId || originalPolicy.ownerId,
        content: changes.content || originalPolicy.content,
        summary: changes.summary || originalPolicy.summary || undefined,
        status: PolicyStatus.DRAFT // New versions start as draft
      });

      logger.info(`📝 New version created: ${newPolicy.policyNumber} v${newVersion}`);
      return newPolicy;
    } catch (error) {
      logger.error(' Error creating new version:', error);
      throw error;
    }
  }

  /**
   * Distribute policy to users
   * @param policyId Policy ID
   * @param userIds Array of user IDs
   * @returns Updated policy
   */
  async distributePolicy(policyId: string, userIds: string[]): Promise<Policy> {
    try {
      const policy = await prisma.policy.update({
        where: { id: policyId },
        data: {
          distributionList: userIds,
          status: PolicyStatus.PUBLISHED
        },
        include: {
          owner: true,
          acknowledgments: true
        }
      });

      logger.info(`📧 Policy ${policy.policyNumber} distributed to ${userIds.length} users`);
      return policy;
    } catch (error) {
      logger.error(' Error distributing policy:', error);
      throw error;
    }
  }

  /**
   * Acknowledge a policy
   * @param data Acknowledgment data
   * @returns Created acknowledgment
   */
  async acknowledgePolicy(data: AcknowledgePolicyDto): Promise<PolicyAcknowledgment> {
    try {
      // Check if already acknowledged
      const existing = await prisma.policyAcknowledgment.findUnique({
        where: {
          policyId_userId: {
            policyId: data.policyId,
            userId: data.userId
          }
        }
      });

      if (existing) {
        throw new Error('Policy already acknowledged by this user');
      }

      // Verify policy and user exist
      const [policy, user] = await Promise.all([
        prisma.policy.findUnique({ where: { id: data.policyId } }),
        prisma.user.findUnique({ where: { id: data.userId } })
      ]);

      if (!policy) {
        throw new Error(`Policy with ID ${data.policyId} not found`);
      }

      if (!user) {
        throw new Error(`User with ID ${data.userId} not found`);
      }

      // Create acknowledgment
      const acknowledgment = await prisma.policyAcknowledgment.create({
        data: {
          policyId: data.policyId,
          userId: data.userId,
          signature: data.signature,
          ipAddress: data.ipAddress
        },
        include: {
          policy: {
            select: {
              policyNumber: true,
              policyName: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      logger.info(`✅ Policy ${policy.policyNumber} acknowledged by ${user.firstName} ${user.lastName}`);
      return acknowledgment;
    } catch (error) {
      logger.error(' Error acknowledging policy:', error);
      throw error;
    }
  }

  /**
   * Get policies pending acknowledgment for a user
   * @param userId User ID
   * @returns Array of policies pending acknowledgment
   */
  async getPendingAcknowledgments(userId: string): Promise<Policy[]> {
    try {
      // Find all policies distributed to this user
      const policies = await prisma.policy.findMany({
        where: {
          status: PolicyStatus.PUBLISHED,
          isActive: true,
          requireAck: true,
          distributionList: {
            has: userId
          },
          acknowledgments: {
            none: {
              userId: userId
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          effectiveDate: 'desc'
        }
      });

      return policies;
    } catch (error) {
      logger.error(' Error getting pending acknowledgments:', error);
      throw error;
    }
  }

  /**
   * Get compliance report for policies
   * @param filters Report filters
   * @returns Compliance statistics
   */
  async getComplianceReport(filters?: ComplianceReportFilters) {
    try {
      const where: any = {};

      if (filters?.policyId) {
        where.policyId = filters.policyId;
      }

      if (filters?.userId) {
        where.userId = filters.userId;
      }

      if (filters?.acknowledgedFrom || filters?.acknowledgedTo) {
        where.acknowledgedDate = {};
        if (filters.acknowledgedFrom) {
          where.acknowledgedDate.gte = filters.acknowledgedFrom;
        }
        if (filters.acknowledgedTo) {
          where.acknowledgedDate.lte = filters.acknowledgedTo;
        }
      }

      // Get all acknowledgments matching filters
      const acknowledgments = await prisma.policyAcknowledgment.findMany({
        where,
        include: {
          policy: {
            include: {
              owner: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              roles: true
            }
          }
        },
        orderBy: {
          acknowledgedDate: 'desc'
        }
      });

      // Get policies requiring acknowledgment
      const policiesRequiringAck = await prisma.policy.findMany({
        where: {
          status: PolicyStatus.PUBLISHED,
          requireAck: true,
          isActive: true,
          ...(filters?.policyId ? { id: filters.policyId } : {})
        },
        include: {
          _count: {
            select: {
              acknowledgments: true
            }
          }
        }
      });

      // Calculate statistics
      const totalPolicies = policiesRequiringAck.length;
      const totalAcknowledgments = acknowledgments.length;

      // Calculate expected acknowledgments (sum of distribution list lengths)
      const expectedAcknowledgments = policiesRequiringAck.reduce((sum, policy) => {
        return sum + policy.distributionList.length;
      }, 0);

      const complianceRate = expectedAcknowledgments > 0
        ? (totalAcknowledgments / expectedAcknowledgments) * 100
        : 0;

      // Group by policy
      const byPolicy = policiesRequiringAck.map(policy => {
        const policyAcks = acknowledgments.filter(ack => ack.policyId === policy.id);
        const ackCount = policyAcks.length;
        const expectedCount = policy.distributionList.length;
        const policyComplianceRate = expectedCount > 0 ? (ackCount / expectedCount) * 100 : 0;

        return {
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          policyName: policy.policyName,
          category: policy.category,
          effectiveDate: policy.effectiveDate,
          acknowledgedCount: ackCount,
          expectedCount: expectedCount,
          complianceRate: policyComplianceRate,
          pendingCount: expectedCount - ackCount
        };
      });

      return {
        summary: {
          totalPolicies,
          totalAcknowledgments,
          expectedAcknowledgments,
          complianceRate: Math.round(complianceRate * 100) / 100,
          pendingAcknowledgments: expectedAcknowledgments - totalAcknowledgments
        },
        byPolicy,
        recentAcknowledgments: acknowledgments.slice(0, 10)
      };
    } catch (error) {
      logger.error(' Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Get policies due for review
   * @returns Array of policies due for review
   */
  async getPoliciesDueForReview(): Promise<Policy[]> {
    try {
      const now = new Date();

      const policies = await prisma.policy.findMany({
        where: {
          isActive: true,
          nextReviewDate: {
            lte: now
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          nextReviewDate: 'asc'
        }
      });

      return policies;
    } catch (error) {
      logger.error(' Error getting policies due for review:', error);
      throw error;
    }
  }

  /**
   * Approve a policy
   * @param policyId Policy ID
   * @param approverId Approver user ID
   * @returns Updated policy
   */
  async approvePolicy(policyId: string, approverId: string): Promise<Policy> {
    try {
      const policy = await prisma.policy.update({
        where: { id: policyId },
        data: {
          status: PolicyStatus.APPROVED,
          approvedById: approverId,
          approvalDate: new Date()
        },
        include: {
          owner: true,
          approvedBy: true
        }
      });

      logger.info(`✅ Policy ${policy.policyNumber} approved`);
      return policy;
    } catch (error) {
      logger.error(' Error approving policy:', error);
      throw error;
    }
  }
}

export default new PolicyService();
