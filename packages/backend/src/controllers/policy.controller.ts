/**
 * Policy Controller
 * Module 9: Compliance Management - Agent 3
 *
 * Handles HTTP requests for policy management operations.
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import policyService, { CreatePolicyDto, UpdatePolicyDto, AcknowledgePolicyDto, PolicySearchFilters, ComplianceReportFilters } from '../services/policy.service';
import { PolicyCategory, PolicyStatus } from '@prisma/client';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

export class PolicyController {
  /**
   * Create a new policy
   * POST /api/policies
   */
  async createPolicy(req: Request, res: Response) {
    try {
      const data: CreatePolicyDto = req.body;

      // Validate required fields
      if (!data.policyName || !data.policyNumber || !data.category || !data.version || !data.ownerId || !data.content) {
        return sendBadRequest(res, 'Missing required fields: policyName, policyNumber, category, version, ownerId, content');
      }

      const policy = await policyService.createPolicy(data);

      return sendCreated(res, policy, 'Policy created successfully');
    } catch (error: unknown) {
      logControllerError('Error in createPolicy controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to create policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get policy by ID
   * GET /api/policies/:id
   */
  async getPolicyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const policy = await policyService.getPolicyById(id);

      if (!policy) {
        return sendNotFound(res, 'Policy');
      }

      return sendSuccess(res, policy);
    } catch (error: unknown) {
      logControllerError('Error in getPolicyById controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get policy by policy number
   * GET /api/policies/number/:policyNumber
   */
  async getPolicyByNumber(req: Request, res: Response) {
    try {
      const { policyNumber } = req.params;

      const policy = await policyService.getPolicyByNumber(policyNumber);

      if (!policy) {
        return sendNotFound(res, 'Policy');
      }

      return sendSuccess(res, policy);
    } catch (error: unknown) {
      logControllerError('Error in getPolicyByNumber controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * List all policies with optional filters
   * GET /api/policies
   */
  async listPolicies(req: Request, res: Response) {
    try {
      const filters: PolicySearchFilters = {};

      if (req.query.category) {
        filters.category = req.query.category as PolicyCategory;
      }

      if (req.query.status) {
        filters.status = req.query.status as PolicyStatus;
      }

      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }

      if (req.query.ownerId) {
        filters.ownerId = req.query.ownerId as string;
      }

      if (req.query.approvedById) {
        filters.approvedById = req.query.approvedById as string;
      }

      if (req.query.effectiveDateFrom) {
        filters.effectiveDateFrom = new Date(req.query.effectiveDateFrom as string);
      }

      if (req.query.effectiveDateTo) {
        filters.effectiveDateTo = new Date(req.query.effectiveDateTo as string);
      }

      if (req.query.requiresReview === 'true') {
        filters.requiresReview = true;
      }

      const policies = await policyService.listPolicies(filters);

      return sendSuccess(res, { count: policies.length, policies });
    } catch (error: unknown) {
      logControllerError('Error in listPolicies controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to list policies';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Update a policy
   * PUT /api/policies/:id
   */
  async updatePolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdatePolicyDto = req.body;

      const policy = await policyService.updatePolicy(id, data);

      return sendSuccess(res, policy, 'Policy updated successfully');
    } catch (error: unknown) {
      logControllerError('Error in updatePolicy controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Delete a policy (soft delete)
   * DELETE /api/policies/:id
   */
  async deletePolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const policy = await policyService.deletePolicy(id);

      return sendSuccess(res, policy, 'Policy archived successfully');
    } catch (error: unknown) {
      logControllerError('Error in deletePolicy controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to delete policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Create a new version of a policy
   * POST /api/policies/:id/version
   */
  async createNewVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newVersion, changes } = req.body;

      if (!newVersion) {
        return sendBadRequest(res, 'New version number is required');
      }

      const policy = await policyService.createNewVersion(id, newVersion, changes || {});

      return sendCreated(res, policy, 'New policy version created successfully');
    } catch (error: unknown) {
      logControllerError('Error in createNewVersion controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to create new version';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Distribute policy to users
   * POST /api/policies/:id/distribute
   */
  async distributePolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return sendBadRequest(res, 'User IDs array is required');
      }

      const policy = await policyService.distributePolicy(id, userIds);

      return sendSuccess(res, policy, 'Policy distributed successfully');
    } catch (error: unknown) {
      logControllerError('Error in distributePolicy controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to distribute policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Acknowledge a policy
   * POST /api/policies/:id/acknowledge
   */
  async acknowledgePolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId, signature, ipAddress } = req.body;

      if (!userId) {
        return sendBadRequest(res, 'User ID is required');
      }

      const data: AcknowledgePolicyDto = {
        policyId: id,
        userId,
        signature,
        ipAddress
      };

      const acknowledgment = await policyService.acknowledgePolicy(data);

      return sendCreated(res, acknowledgment, 'Policy acknowledged successfully');
    } catch (error: unknown) {
      logControllerError('Error in acknowledgePolicy controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to acknowledge policy';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get pending acknowledgments for a user
   * GET /api/policies/pending-acknowledgments/:userId
   */
  async getPendingAcknowledgments(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const policies = await policyService.getPendingAcknowledgments(userId);

      return sendSuccess(res, { count: policies.length, policies });
    } catch (error: unknown) {
      logControllerError('Error in getPendingAcknowledgments controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch pending acknowledgments';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get compliance report
   * GET /api/policies/reports/compliance
   */
  async getComplianceReport(req: Request, res: Response) {
    try {
      const filters: ComplianceReportFilters = {};

      if (req.query.policyId) {
        filters.policyId = req.query.policyId as string;
      }

      if (req.query.userId) {
        filters.userId = req.query.userId as string;
      }

      if (req.query.acknowledgedFrom) {
        filters.acknowledgedFrom = new Date(req.query.acknowledgedFrom as string);
      }

      if (req.query.acknowledgedTo) {
        filters.acknowledgedTo = new Date(req.query.acknowledgedTo as string);
      }

      if (req.query.pending === 'true') {
        filters.pending = true;
      }

      const report = await policyService.getComplianceReport(filters);

      return sendSuccess(res, report);
    } catch (error: unknown) {
      logControllerError('Error in getComplianceReport controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to generate compliance report';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get policies due for review
   * GET /api/policies/due-for-review
   */
  async getPoliciesDueForReview(req: Request, res: Response) {
    try {
      const policies = await policyService.getPoliciesDueForReview();

      return sendSuccess(res, { count: policies.length, policies });
    } catch (error: unknown) {
      logControllerError('Error in getPoliciesDueForReview controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch policies due for review';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Approve a policy
   * POST /api/policies/:id/approve
   */
  async approvePolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approverId } = req.body;

      if (!approverId) {
        return sendBadRequest(res, 'Approver ID is required');
      }

      const policy = await policyService.approvePolicy(id, approverId);

      return sendSuccess(res, policy, 'Policy approved successfully');
    } catch (error: unknown) {
      logControllerError('Error in approvePolicy controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to approve policy';
      return sendServerError(res, errorMessage);
    }
  }
}

export default new PolicyController();
