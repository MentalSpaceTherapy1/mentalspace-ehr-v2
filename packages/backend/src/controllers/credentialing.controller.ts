import { Request, Response } from 'express';
import credentialingService from '../services/credentialing.service';
import logger from '../utils/logger';
import { CredentialType, VerificationStatus } from '@prisma/client';

/**
 * Credentialing Controller
 *
 * Handles HTTP requests for credential management including:
 * - Creating and managing credentials
 * - Verification workflows
 * - OIG/SAM screening
 * - Expiration alerts
 * - Compliance reporting
 */
class CredentialingController {
  /**
   * Create a new credential
   * POST /api/credentialing
   */
  async createCredential(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        credentialType,
        credentialNumber,
        issuingAuthority,
        issuingState,
        issueDate,
        expirationDate,
        renewalDate,
        ceuRequirements,
        renewalRequirements,
        documents,
        restrictions,
        scope,
      } = req.body;

      // Validation
      if (!userId || !credentialType || !credentialNumber || !issuingAuthority || !issueDate || !expirationDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, credentialType, credentialNumber, issuingAuthority, issueDate, expirationDate',
        });
        return;
      }

      const credential = await credentialingService.createCredential({
        userId,
        credentialType: credentialType as CredentialType,
        credentialNumber,
        issuingAuthority,
        issuingState,
        issueDate: new Date(issueDate),
        expirationDate: new Date(expirationDate),
        renewalDate: renewalDate ? new Date(renewalDate) : undefined,
        ceuRequirements,
        renewalRequirements,
        documents,
        restrictions,
        scope,
      });

      logger.info('Credential created via API', { credentialId: credential.id });

      res.status(201).json({
        success: true,
        data: credential,
        message: 'Credential created successfully',
      });
    } catch (error: any) {
      logger.error('Error in createCredential controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create credential',
      });
    }
  }

  /**
   * Get credential by ID
   * GET /api/credentialing/:id
   */
  async getCredentialById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const credential = await credentialingService.getCredentialById(id);

      if (!credential) {
        res.status(404).json({
          success: false,
          error: 'Credential not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: credential,
      });
    } catch (error: any) {
      logger.error('Error in getCredentialById controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch credential',
      });
    }
  }

  /**
   * Get all credentials with optional filters
   * GET /api/credentialing
   */
  async getCredentials(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        credentialType,
        verificationStatus,
        screeningStatus,
        expiringWithinDays,
        expired,
        page,
        limit,
      } = req.query;

      const filters: any = {};

      if (userId) filters.userId = userId as string;
      if (credentialType) filters.credentialType = credentialType as CredentialType;
      if (verificationStatus) filters.verificationStatus = verificationStatus as VerificationStatus;
      if (screeningStatus) filters.screeningStatus = screeningStatus as string;
      if (expiringWithinDays) filters.expiringWithinDays = parseInt(expiringWithinDays as string);
      if (expired === 'true') filters.expired = true;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await credentialingService.getCredentials(filters);

      res.status(200).json({
        success: true,
        data: result.credentials,
        pagination: {
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
        },
      });
    } catch (error: any) {
      logger.error('Error in getCredentials controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch credentials',
      });
    }
  }

  /**
   * Get all credentials for a specific user
   * GET /api/credentialing/user/:userId
   */
  async getUserCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const credentials = await credentialingService.getCredentialsByUserId(userId);

      res.status(200).json({
        success: true,
        data: credentials,
        count: credentials.length,
      });
    } catch (error: any) {
      logger.error('Error in getUserCredentials controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user credentials',
      });
    }
  }

  /**
   * Update credential
   * PUT /api/credentialing/:id
   */
  async updateCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Convert date strings to Date objects
      if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
      if (updateData.expirationDate) updateData.expirationDate = new Date(updateData.expirationDate);
      if (updateData.renewalDate) updateData.renewalDate = new Date(updateData.renewalDate);
      if (updateData.verificationDate) updateData.verificationDate = new Date(updateData.verificationDate);
      if (updateData.lastScreeningDate) updateData.lastScreeningDate = new Date(updateData.lastScreeningDate);

      const credential = await credentialingService.updateCredential(id, updateData);

      logger.info('Credential updated via API', { credentialId: id });

      res.status(200).json({
        success: true,
        data: credential,
        message: 'Credential updated successfully',
      });
    } catch (error: any) {
      logger.error('Error in updateCredential controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update credential',
      });
    }
  }

  /**
   * Delete credential
   * DELETE /api/credentialing/:id
   */
  async deleteCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await credentialingService.deleteCredential(id);

      logger.info('Credential deleted via API', { credentialId: id });

      res.status(200).json({
        success: true,
        message: 'Credential deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error in deleteCredential controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete credential',
      });
    }
  }

  /**
   * Verify credential
   * POST /api/credentialing/:id/verify
   */
  async verifyCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { verificationStatus, verificationMethod, verificationDate, notes } = req.body;

      if (!verificationStatus || !verificationMethod) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: verificationStatus, verificationMethod',
        });
        return;
      }

      const credential = await credentialingService.verifyCredential(id, {
        verificationStatus: verificationStatus as VerificationStatus,
        verificationMethod,
        verificationDate: verificationDate ? new Date(verificationDate) : undefined,
        notes,
      });

      logger.info('Credential verified via API', {
        credentialId: id,
        status: verificationStatus,
      });

      res.status(200).json({
        success: true,
        data: credential,
        message: 'Credential verified successfully',
      });
    } catch (error: any) {
      logger.error('Error in verifyCredential controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify credential',
      });
    }
  }

  /**
   * Run OIG/SAM screening
   * POST /api/credentialing/:id/screening
   */
  async runScreening(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const credential = await credentialingService.runScreening(id);

      logger.info('Screening completed via API', {
        credentialId: id,
        status: credential.screeningStatus,
      });

      res.status(200).json({
        success: true,
        data: credential,
        message: 'Screening completed successfully',
      });
    } catch (error: any) {
      logger.error('Error in runScreening controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to run screening',
      });
    }
  }

  /**
   * Get expiring credentials
   * GET /api/credentialing/expiring
   */
  async getExpiringCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysThreshold = days ? parseInt(days as string) : 90;

      const alerts = await credentialingService.getExpiringCredentials(daysThreshold);

      res.status(200).json({
        success: true,
        data: alerts,
        count: alerts.length,
        threshold: daysThreshold,
      });
    } catch (error: any) {
      logger.error('Error in getExpiringCredentials controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch expiring credentials',
      });
    }
  }

  /**
   * Get credential alerts (alias for expiring credentials)
   * GET /api/credentialing/alerts
   */
  async getCredentialAlerts(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await credentialingService.getExpiringCredentials(90);

      // Filter to only show alerts that need attention
      const activeAlerts = alerts.filter(
        (alert) => alert.alertLevel === 'CRITICAL_30' || alert.alertLevel === 'EXPIRED'
      );

      res.status(200).json({
        success: true,
        data: activeAlerts,
        count: activeAlerts.length,
        allAlerts: alerts.length,
      });
    } catch (error: any) {
      logger.error('Error in getCredentialAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch credential alerts',
      });
    }
  }

  /**
   * Send expiration reminders manually
   * POST /api/credentialing/send-reminders
   */
  async sendExpirationReminders(req: Request, res: Response): Promise<void> {
    try {
      const result = await credentialingService.sendExpirationAlerts();

      logger.info('Expiration reminders sent via API', result);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Expiration reminders sent successfully',
      });
    } catch (error: any) {
      logger.error('Error in sendExpirationReminders controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send expiration reminders',
      });
    }
  }

  /**
   * Check user compliance
   * GET /api/credentialing/compliance/:userId
   */
  async checkUserCompliance(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const compliance = await credentialingService.checkUserCompliance(userId);

      res.status(200).json({
        success: true,
        data: compliance,
      });
    } catch (error: any) {
      logger.error('Error in checkUserCompliance controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check user compliance',
      });
    }
  }

  /**
   * Generate credentialing report
   * GET /api/credentialing/report
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        credentialType,
        verificationStatus,
        screeningStatus,
        expiringWithinDays,
        expired,
      } = req.query;

      const filters: any = {};

      if (userId) filters.userId = userId as string;
      if (credentialType) filters.credentialType = credentialType as CredentialType;
      if (verificationStatus) filters.verificationStatus = verificationStatus as VerificationStatus;
      if (screeningStatus) filters.screeningStatus = screeningStatus as string;
      if (expiringWithinDays) filters.expiringWithinDays = parseInt(expiringWithinDays as string);
      if (expired === 'true') filters.expired = true;

      const report = await credentialingService.generateReport(filters);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error('Error in generateReport controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate report',
      });
    }
  }

  /**
   * Add document to credential
   * POST /api/credentialing/:id/documents
   */
  async addDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { documentUrl } = req.body;

      if (!documentUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: documentUrl',
        });
        return;
      }

      const credential = await credentialingService.addDocument(id, documentUrl);

      logger.info('Document added to credential via API', { credentialId: id });

      res.status(200).json({
        success: true,
        data: credential,
        message: 'Document added successfully',
      });
    } catch (error: any) {
      logger.error('Error in addDocument controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add document',
      });
    }
  }

  /**
   * Remove document from credential
   * DELETE /api/credentialing/:id/documents
   */
  async removeDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { documentUrl } = req.body;

      if (!documentUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: documentUrl',
        });
        return;
      }

      const credential = await credentialingService.removeDocument(id, documentUrl);

      logger.info('Document removed from credential via API', { credentialId: id });

      res.status(200).json({
        success: true,
        data: credential,
        message: 'Document removed successfully',
      });
    } catch (error: any) {
      logger.error('Error in removeDocument controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove document',
      });
    }
  }

  /**
   * Initiate credential renewal
   * POST /api/credentialing/:id/renewal
   */
  async initiateRenewal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const credential = await credentialingService.initiateRenewal(id);

      logger.info('Credential renewal initiated via API', { credentialId: id });

      res.status(200).json({
        success: true,
        data: credential,
        message: 'Renewal initiated successfully',
      });
    } catch (error: any) {
      logger.error('Error in initiateRenewal controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to initiate renewal',
      });
    }
  }

  /**
   * Get compliance statistics for dashboard
   * GET /api/credentialing/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await credentialingService.getComplianceStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error in getStats controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch statistics',
      });
    }
  }
}

export default new CredentialingController();
