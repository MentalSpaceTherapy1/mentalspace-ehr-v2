/**
 * Policy Controller
 * Module 9: Compliance Management - Agent 3
 *
 * Handles HTTP requests for policy management operations.
 */

import { Request, Response } from 'express';
import policyService, { CreatePolicyDto, UpdatePolicyDto, AcknowledgePolicyDto, PolicySearchFilters, ComplianceReportFilters } from '../services/policy.service';
import { PolicyCategory, PolicyStatus } from '@prisma/client';

export class PolicyController {
  /**
   * Create a new policy
   * POST /api/policies
   */
  async createPolicy(req: Request, res: Response): Promise<void> {
    try {
      const data: CreatePolicyDto = req.body;

      // Validate required fields
      if (!data.policyName || !data.policyNumber || !data.category || !data.version || !data.ownerId || !data.content) {
        res.status(400).json({
          error: 'Missing required fields: policyName, policyNumber, category, version, ownerId, content'
        });
        return;
      }

      const policy = await policyService.createPolicy(data);

      res.status(201).json({
        message: 'Policy created successfully',
        policy
      });
    } catch (error: any) {
      console.error('Error in createPolicy controller:', error);
      res.status(500).json({
        error: 'Failed to create policy',
        details: error.message
      });
    }
  }

  /**
   * Get policy by ID
   * GET /api/policies/:id
   */
  async getPolicyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const policy = await policyService.getPolicyById(id);

      if (!policy) {
        res.status(404).json({ error: 'Policy not found' });
        return;
      }

      res.status(200).json(policy);
    } catch (error: any) {
      console.error('Error in getPolicyById controller:', error);
      res.status(500).json({
        error: 'Failed to fetch policy',
        details: error.message
      });
    }
  }

  /**
   * Get policy by policy number
   * GET /api/policies/number/:policyNumber
   */
  async getPolicyByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { policyNumber } = req.params;

      const policy = await policyService.getPolicyByNumber(policyNumber);

      if (!policy) {
        res.status(404).json({ error: 'Policy not found' });
        return;
      }

      res.status(200).json(policy);
    } catch (error: any) {
      console.error('Error in getPolicyByNumber controller:', error);
      res.status(500).json({
        error: 'Failed to fetch policy',
        details: error.message
      });
    }
  }

  /**
   * List all policies with optional filters
   * GET /api/policies
   */
  async listPolicies(req: Request, res: Response): Promise<void> {
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

      res.status(200).json({
        count: policies.length,
        policies
      });
    } catch (error: any) {
      console.error('Error in listPolicies controller:', error);
      res.status(500).json({
        error: 'Failed to list policies',
        details: error.message
      });
    }
  }

  /**
   * Update a policy
   * PUT /api/policies/:id
   */
  async updatePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdatePolicyDto = req.body;

      const policy = await policyService.updatePolicy(id, data);

      res.status(200).json({
        message: 'Policy updated successfully',
        policy
      });
    } catch (error: any) {
      console.error('Error in updatePolicy controller:', error);
      res.status(500).json({
        error: 'Failed to update policy',
        details: error.message
      });
    }
  }

  /**
   * Delete a policy (soft delete)
   * DELETE /api/policies/:id
   */
  async deletePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const policy = await policyService.deletePolicy(id);

      res.status(200).json({
        message: 'Policy archived successfully',
        policy
      });
    } catch (error: any) {
      console.error('Error in deletePolicy controller:', error);
      res.status(500).json({
        error: 'Failed to delete policy',
        details: error.message
      });
    }
  }

  /**
   * Create a new version of a policy
   * POST /api/policies/:id/version
   */
  async createNewVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newVersion, changes } = req.body;

      if (!newVersion) {
        res.status(400).json({ error: 'New version number is required' });
        return;
      }

      const policy = await policyService.createNewVersion(id, newVersion, changes || {});

      res.status(201).json({
        message: 'New policy version created successfully',
        policy
      });
    } catch (error: any) {
      console.error('Error in createNewVersion controller:', error);
      res.status(500).json({
        error: 'Failed to create new version',
        details: error.message
      });
    }
  }

  /**
   * Distribute policy to users
   * POST /api/policies/:id/distribute
   */
  async distributePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ error: 'User IDs array is required' });
        return;
      }

      const policy = await policyService.distributePolicy(id, userIds);

      res.status(200).json({
        message: 'Policy distributed successfully',
        policy
      });
    } catch (error: any) {
      console.error('Error in distributePolicy controller:', error);
      res.status(500).json({
        error: 'Failed to distribute policy',
        details: error.message
      });
    }
  }

  /**
   * Acknowledge a policy
   * POST /api/policies/:id/acknowledge
   */
  async acknowledgePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, signature, ipAddress } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const data: AcknowledgePolicyDto = {
        policyId: id,
        userId,
        signature,
        ipAddress
      };

      const acknowledgment = await policyService.acknowledgePolicy(data);

      res.status(201).json({
        message: 'Policy acknowledged successfully',
        acknowledgment
      });
    } catch (error: any) {
      console.error('Error in acknowledgePolicy controller:', error);
      res.status(500).json({
        error: 'Failed to acknowledge policy',
        details: error.message
      });
    }
  }

  /**
   * Get pending acknowledgments for a user
   * GET /api/policies/pending-acknowledgments/:userId
   */
  async getPendingAcknowledgments(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const policies = await policyService.getPendingAcknowledgments(userId);

      res.status(200).json({
        count: policies.length,
        policies
      });
    } catch (error: any) {
      console.error('Error in getPendingAcknowledgments controller:', error);
      res.status(500).json({
        error: 'Failed to fetch pending acknowledgments',
        details: error.message
      });
    }
  }

  /**
   * Get compliance report
   * GET /api/policies/reports/compliance
   */
  async getComplianceReport(req: Request, res: Response): Promise<void> {
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

      res.status(200).json(report);
    } catch (error: any) {
      console.error('Error in getComplianceReport controller:', error);
      res.status(500).json({
        error: 'Failed to generate compliance report',
        details: error.message
      });
    }
  }

  /**
   * Get policies due for review
   * GET /api/policies/due-for-review
   */
  async getPoliciesDueForReview(req: Request, res: Response): Promise<void> {
    try {
      const policies = await policyService.getPoliciesDueForReview();

      res.status(200).json({
        count: policies.length,
        policies
      });
    } catch (error: any) {
      console.error('Error in getPoliciesDueForReview controller:', error);
      res.status(500).json({
        error: 'Failed to fetch policies due for review',
        details: error.message
      });
    }
  }

  /**
   * Approve a policy
   * POST /api/policies/:id/approve
   */
  async approvePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { approverId } = req.body;

      if (!approverId) {
        res.status(400).json({ error: 'Approver ID is required' });
        return;
      }

      const policy = await policyService.approvePolicy(id, approverId);

      res.status(200).json({
        message: 'Policy approved successfully',
        policy
      });
    } catch (error: any) {
      console.error('Error in approvePolicy controller:', error);
      res.status(500).json({
        error: 'Failed to approve policy',
        details: error.message
      });
    }
  }
}

export default new PolicyController();
