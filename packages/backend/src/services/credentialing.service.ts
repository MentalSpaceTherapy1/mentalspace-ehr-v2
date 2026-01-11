import prisma from './database';
import logger from '../utils/logger';
import {
  Credential,
  CredentialType,
  VerificationStatus,
  ScreeningStatus,
  Prisma
} from '@prisma/client';

/**
 * Credential Create Input Interface
 */
export interface CredentialCreateInput {
  userId: string;
  credentialType: CredentialType;
  credentialNumber: string;
  issuingAuthority: string;
  issuingState?: string;
  issueDate: Date;
  expirationDate: Date;
  renewalDate?: Date;
  ceuRequirements?: number;
  renewalRequirements?: any;
  verificationStatus?: VerificationStatus;
  verificationDate?: Date;
  verificationMethod?: string;
  lastScreeningDate?: Date;
  screeningStatus?: ScreeningStatus;
  screeningNotes?: string;
  documents?: string[];
  restrictions?: string;
  scope?: string;
  alertsSent?: any;
}

/**
 * Credential Update Input Interface
 */
export interface CredentialUpdateInput {
  credentialType?: CredentialType;
  credentialNumber?: string;
  issuingAuthority?: string;
  issuingState?: string;
  issueDate?: Date;
  expirationDate?: Date;
  renewalDate?: Date;
  ceuRequirements?: number;
  renewalRequirements?: any;
  verificationStatus?: VerificationStatus;
  verificationDate?: Date;
  verificationMethod?: string;
  lastScreeningDate?: Date;
  screeningStatus?: ScreeningStatus;
  screeningNotes?: string;
  documents?: string[];
  restrictions?: string;
  scope?: string;
  alertsSent?: any;
}

/**
 * Credential Filter Interface
 */
export interface CredentialFilters {
  userId?: string;
  credentialType?: CredentialType;
  verificationStatus?: VerificationStatus;
  screeningStatus?: ScreeningStatus;
  expiringWithinDays?: number;
  expired?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Verification Input Interface
 */
export interface VerificationInput {
  verificationStatus: VerificationStatus;
  verificationMethod: string;
  verificationDate?: Date;
  notes?: string;
}

/**
 * Screening Result Interface
 */
export interface ScreeningResult {
  status: ScreeningStatus;
  notes?: string;
  screeningDate: Date;
  details?: any;
}

/**
 * Expiration Alert Interface
 */
export interface ExpirationAlert {
  credentialId: string;
  userId: string;
  credentialType: CredentialType;
  expirationDate: Date;
  daysUntilExpiration: number;
  alertLevel: 'WARNING_90' | 'WARNING_60' | 'CRITICAL_30' | 'EXPIRED';
}

/**
 * Credentialing Service
 *
 * Manages professional credentials and licenses for healthcare providers.
 * Handles license expiration tracking, primary source verification,
 * OIG/SAM screening, and renewal workflow management.
 */
class CredentialingService {
  /**
   * Create a new credential
   */
  async createCredential(data: CredentialCreateInput): Promise<Credential> {
    try {
      logger.info('Creating credential', {
        userId: data.userId,
        credentialType: data.credentialType,
      });

      const credential = await prisma.credential.create({
        data: {
          userId: data.userId,
          credentialType: data.credentialType,
          credentialNumber: data.credentialNumber,
          issuingAuthority: data.issuingAuthority,
          issuingState: data.issuingState,
          issueDate: data.issueDate,
          expirationDate: data.expirationDate,
          renewalDate: data.renewalDate,
          ceuRequirements: data.ceuRequirements,
          renewalRequirements: data.renewalRequirements,
          verificationStatus: data.verificationStatus || VerificationStatus.PENDING,
          verificationDate: data.verificationDate,
          verificationMethod: data.verificationMethod,
          lastScreeningDate: data.lastScreeningDate,
          screeningStatus: data.screeningStatus || ScreeningStatus.CLEAR,
          screeningNotes: data.screeningNotes,
          documents: data.documents || [],
          restrictions: data.restrictions,
          scope: data.scope,
          alertsSent: data.alertsSent || {},
        },
      });

      logger.info('Credential created successfully', { credentialId: credential.id });
      return credential;
    } catch (error) {
      logger.error('Error creating credential:', error);
      throw new Error('Failed to create credential');
    }
  }

  /**
   * Get credential by ID
   */
  async getCredentialById(credentialId: string): Promise<Credential | null> {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              roles: true,
            },
          },
        },
      });

      return credential;
    } catch (error) {
      logger.error('Error fetching credential:', error);
      throw new Error('Failed to fetch credential');
    }
  }

  /**
   * Get all credentials with filters
   */
  async getCredentials(filters: CredentialFilters = {}): Promise<{
    credentials: Credential[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.CredentialWhereInput = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.credentialType) {
        where.credentialType = filters.credentialType;
      }

      if (filters.verificationStatus) {
        where.verificationStatus = filters.verificationStatus;
      }

      if (filters.screeningStatus) {
        where.screeningStatus = filters.screeningStatus;
      }

      if (filters.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
        where.expirationDate = {
          lte: futureDate,
          gte: new Date(),
        };
      }

      if (filters.expired === true) {
        where.expirationDate = {
          lt: new Date(),
        };
      }

      // Get total count
      const total = await prisma.credential.count({ where });

      // Get credentials
      const credentials = await prisma.credential.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              roles: true,
            },
          },
        },
        orderBy: { expirationDate: 'asc' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        credentials,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error fetching credentials:', error);
      throw new Error('Failed to fetch credentials');
    }
  }

  /**
   * Get all credentials for a specific user
   */
  async getCredentialsByUserId(userId: string): Promise<Credential[]> {
    try {
      const credentials = await prisma.credential.findMany({
        where: { userId },
        orderBy: { expirationDate: 'asc' },
      });

      return credentials;
    } catch (error) {
      logger.error('Error fetching user credentials:', error);
      throw new Error('Failed to fetch user credentials');
    }
  }

  /**
   * Update credential
   */
  async updateCredential(
    credentialId: string,
    data: CredentialUpdateInput
  ): Promise<Credential> {
    try {
      logger.info('Updating credential', { credentialId });

      const credential = await prisma.credential.update({
        where: { id: credentialId },
        data,
      });

      logger.info('Credential updated successfully', { credentialId });
      return credential;
    } catch (error) {
      logger.error('Error updating credential:', error);
      throw new Error('Failed to update credential');
    }
  }

  /**
   * Delete credential
   */
  async deleteCredential(credentialId: string): Promise<void> {
    try {
      logger.info('Deleting credential', { credentialId });

      await prisma.credential.delete({
        where: { id: credentialId },
      });

      logger.info('Credential deleted successfully', { credentialId });
    } catch (error) {
      logger.error('Error deleting credential:', error);
      throw new Error('Failed to delete credential');
    }
  }

  /**
   * Mark credential as verified
   */
  async verifyCredential(
    credentialId: string,
    verificationInput: VerificationInput
  ): Promise<Credential> {
    try {
      logger.info('Verifying credential', { credentialId });

      const credential = await prisma.credential.update({
        where: { id: credentialId },
        data: {
          verificationStatus: verificationInput.verificationStatus,
          verificationMethod: verificationInput.verificationMethod,
          verificationDate: verificationInput.verificationDate || new Date(),
        },
      });

      logger.info('Credential verified successfully', {
        credentialId,
        status: verificationInput.verificationStatus,
      });

      return credential;
    } catch (error) {
      logger.error('Error verifying credential:', error);
      throw new Error('Failed to verify credential');
    }
  }

  /**
   * Run OIG/SAM screening (mock implementation)
   * In production, this would integrate with actual OIG/SAM API
   */
  async runScreening(credentialId: string): Promise<Credential> {
    try {
      logger.info('Running OIG/SAM screening', { credentialId });

      const credential = await this.getCredentialById(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      // Mock screening result - in production, call external API
      // Type assertion for credential with user relation
      const credWithUser = credential as typeof credential & { user: { firstName: string; lastName: string } };
      const screeningResult: ScreeningResult = await this.mockOIGSAMScreening(
        credential.credentialNumber,
        credWithUser.user.firstName + ' ' + credWithUser.user.lastName
      );

      // Update credential with screening results
      const updatedCredential = await prisma.credential.update({
        where: { id: credentialId },
        data: {
          lastScreeningDate: screeningResult.screeningDate,
          screeningStatus: screeningResult.status,
          screeningNotes: screeningResult.notes,
        },
      });

      logger.info('Screening completed', {
        credentialId,
        status: screeningResult.status,
      });

      return updatedCredential;
    } catch (error) {
      logger.error('Error running screening:', error);
      throw new Error('Failed to run screening');
    }
  }

  /**
   * Mock OIG/SAM screening API call
   * Replace with actual API integration in production
   */
  private async mockOIGSAMScreening(
    credentialNumber: string,
    providerName: string
  ): Promise<ScreeningResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock screening logic - always returns CLEAR for demo
    // In production, this would call real OIG/SAM APIs
    return {
      status: ScreeningStatus.CLEAR,
      notes: 'No exclusions found in OIG/SAM databases (mock screening)',
      screeningDate: new Date(),
      details: {
        oigChecked: true,
        samChecked: true,
        medicareOptOutChecked: true,
      },
    };
  }

  /**
   * Get expiring credentials
   * Returns credentials that are expiring or expired
   */
  async getExpiringCredentials(daysThreshold: number = 90): Promise<ExpirationAlert[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysThreshold);

      const credentials = await prisma.credential.findMany({
        where: {
          expirationDate: {
            lte: futureDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { expirationDate: 'asc' },
      });

      // Transform to expiration alerts
      const alerts: ExpirationAlert[] = credentials.map((credential) => {
        const daysUntilExpiration = Math.ceil(
          (credential.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let alertLevel: ExpirationAlert['alertLevel'];
        if (daysUntilExpiration < 0) {
          alertLevel = 'EXPIRED';
        } else if (daysUntilExpiration <= 30) {
          alertLevel = 'CRITICAL_30';
        } else if (daysUntilExpiration <= 60) {
          alertLevel = 'WARNING_60';
        } else {
          alertLevel = 'WARNING_90';
        }

        return {
          credentialId: credential.id,
          userId: credential.userId,
          credentialType: credential.credentialType,
          expirationDate: credential.expirationDate,
          daysUntilExpiration,
          alertLevel,
        };
      });

      return alerts;
    } catch (error) {
      logger.error('Error getting expiring credentials:', error);
      throw new Error('Failed to get expiring credentials');
    }
  }

  /**
   * Send expiration alerts for credentials
   * This should be called by a cron job
   */
  async sendExpirationAlerts(): Promise<{
    alertsSent: number;
    errors: number;
  }> {
    try {
      logger.info('Starting expiration alert process');

      const alerts = await this.getExpiringCredentials(90);
      let alertsSent = 0;
      let errors = 0;

      for (const alert of alerts) {
        try {
          const credential = await this.getCredentialById(alert.credentialId);
          if (!credential) continue;

          // Check if alert for this level was already sent
          const alertsSentData = (credential.alertsSent as any) || {};
          const alertKey = `alert_${alert.alertLevel}`;

          if (alertsSentData[alertKey]) {
            // Alert already sent for this level
            continue;
          }

          // Get user details
          const user = await prisma.user.findUnique({
            where: { id: alert.userId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          });

          if (!user) continue;

          // Send alert email (mock - integrate with actual email service)
          await this.sendExpirationEmail(user, credential, alert);

          // Update credential to mark alert as sent
          alertsSentData[alertKey] = new Date().toISOString();
          await prisma.credential.update({
            where: { id: credential.id },
            data: {
              alertsSent: alertsSentData,
            },
          });

          alertsSent++;
          logger.info('Expiration alert sent', {
            userId: user.id,
            credentialId: credential.id,
            alertLevel: alert.alertLevel,
          });
        } catch (error) {
          logger.error('Error sending expiration alert:', error);
          errors++;
        }
      }

      logger.info('Expiration alert process completed', { alertsSent, errors });
      return { alertsSent, errors };
    } catch (error) {
      logger.error('Error in expiration alert process:', error);
      throw new Error('Failed to send expiration alerts');
    }
  }

  /**
   * Send expiration email (mock implementation)
   * Replace with actual email service integration
   */
  private async sendExpirationEmail(
    user: any,
    credential: Credential,
    alert: ExpirationAlert
  ): Promise<void> {
    // Mock email sending - integrate with actual email service
    logger.info('Sending expiration email (mock)', {
      to: user.email,
      subject: `Credential Expiration Alert: ${credential.credentialType}`,
      daysUntilExpiration: alert.daysUntilExpiration,
      alertLevel: alert.alertLevel,
    });

    // In production, use email service like:
    // await emailService.send({
    //   to: user.email,
    //   subject: `Credential Expiration Alert: ${credential.credentialType}`,
    //   template: 'credential-expiration',
    //   data: { user, credential, alert }
    // });
  }

  /**
   * Initiate credential renewal workflow
   */
  async initiateRenewal(credentialId: string): Promise<Credential> {
    try {
      logger.info('Initiating credential renewal', { credentialId });

      const credential = await prisma.credential.update({
        where: { id: credentialId },
        data: {
          renewalDate: new Date(),
        },
      });

      logger.info('Renewal initiated', { credentialId });
      return credential;
    } catch (error) {
      logger.error('Error initiating renewal:', error);
      throw new Error('Failed to initiate renewal');
    }
  }

  /**
   * Check compliance status for a user
   * Returns whether all credentials are valid and up-to-date
   */
  async checkUserCompliance(userId: string): Promise<{
    isCompliant: boolean;
    issues: string[];
    credentials: Credential[];
  }> {
    try {
      const credentials = await this.getCredentialsByUserId(userId);
      const issues: string[] = [];
      const today = new Date();

      for (const credential of credentials) {
        // Check expiration
        if (credential.expirationDate < today) {
          issues.push(
            `${credential.credentialType} expired on ${credential.expirationDate.toLocaleDateString()}`
          );
        }

        // Check verification status
        if (credential.verificationStatus !== VerificationStatus.VERIFIED) {
          issues.push(`${credential.credentialType} not verified`);
        }

        // Check screening status
        if (credential.screeningStatus === ScreeningStatus.FLAGGED) {
          issues.push(`${credential.credentialType} flagged in OIG/SAM screening`);
        }

        // Check if screening is overdue (should be done monthly)
        if (credential.lastScreeningDate) {
          const daysSinceScreening = Math.floor(
            (today.getTime() - credential.lastScreeningDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceScreening > 30) {
            issues.push(`${credential.credentialType} screening overdue`);
          }
        } else {
          issues.push(`${credential.credentialType} never screened`);
        }
      }

      return {
        isCompliant: issues.length === 0,
        issues,
        credentials,
      };
    } catch (error) {
      logger.error('Error checking user compliance:', error);
      throw new Error('Failed to check user compliance');
    }
  }

  /**
   * Generate credentialing report
   */
  async generateReport(filters: CredentialFilters = {}): Promise<{
    summary: {
      total: number;
      verified: number;
      pending: number;
      expired: number;
      expiringWithin30Days: number;
      expiringWithin60Days: number;
      expiringWithin90Days: number;
      screeningFlagged: number;
    };
    credentials: Credential[];
  }> {
    try {
      const result = await this.getCredentials(filters);
      const credentials = result.credentials;

      const today = new Date();
      const date30 = new Date();
      date30.setDate(date30.getDate() + 30);
      const date60 = new Date();
      date60.setDate(date60.getDate() + 60);
      const date90 = new Date();
      date90.setDate(date90.getDate() + 90);

      const summary = {
        total: result.total,
        verified: credentials.filter(
          (c) => c.verificationStatus === VerificationStatus.VERIFIED
        ).length,
        pending: credentials.filter(
          (c) => c.verificationStatus === VerificationStatus.PENDING
        ).length,
        expired: credentials.filter((c) => c.expirationDate < today).length,
        expiringWithin30Days: credentials.filter(
          (c) => c.expirationDate >= today && c.expirationDate <= date30
        ).length,
        expiringWithin60Days: credentials.filter(
          (c) => c.expirationDate > date30 && c.expirationDate <= date60
        ).length,
        expiringWithin90Days: credentials.filter(
          (c) => c.expirationDate > date60 && c.expirationDate <= date90
        ).length,
        screeningFlagged: credentials.filter(
          (c) => c.screeningStatus === ScreeningStatus.FLAGGED
        ).length,
      };

      return {
        summary,
        credentials,
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Add document to credential
   */
  async addDocument(credentialId: string, documentUrl: string): Promise<Credential> {
    try {
      const credential = await this.getCredentialById(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const updatedDocuments = [...credential.documents, documentUrl];

      const updatedCredential = await prisma.credential.update({
        where: { id: credentialId },
        data: {
          documents: updatedDocuments,
        },
      });

      logger.info('Document added to credential', { credentialId, documentUrl });
      return updatedCredential;
    } catch (error) {
      logger.error('Error adding document:', error);
      throw new Error('Failed to add document');
    }
  }

  /**
   * Remove document from credential
   */
  async removeDocument(credentialId: string, documentUrl: string): Promise<Credential> {
    try {
      const credential = await this.getCredentialById(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const updatedDocuments = credential.documents.filter((doc) => doc !== documentUrl);

      const updatedCredential = await prisma.credential.update({
        where: { id: credentialId },
        data: {
          documents: updatedDocuments,
        },
      });

      logger.info('Document removed from credential', { credentialId, documentUrl });
      return updatedCredential;
    } catch (error) {
      logger.error('Error removing document:', error);
      throw new Error('Failed to remove document');
    }
  }

  /**
   * Get compliance statistics for dashboard
   */
  async getComplianceStats(): Promise<{
    totalCredentials: number;
    verified: number;
    pending: number;
    expired: number;
    expiringWithin30Days: number;
    expiringWithin60Days: number;
    expiringWithin90Days: number;
    screeningFlagged: number;
    screeningClear: number;
    byType: {
      [key: string]: number;
    };
  }> {
    try {
      const today = new Date();
      const date30 = new Date();
      date30.setDate(date30.getDate() + 30);
      const date60 = new Date();
      date60.setDate(date60.getDate() + 60);
      const date90 = new Date();
      date90.setDate(date90.getDate() + 90);

      // Get all credentials
      const allCredentials = await prisma.credential.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Calculate statistics
      const stats = {
        totalCredentials: allCredentials.length,
        verified: allCredentials.filter(
          (c) => c.verificationStatus === VerificationStatus.VERIFIED
        ).length,
        pending: allCredentials.filter(
          (c) => c.verificationStatus === VerificationStatus.PENDING
        ).length,
        expired: allCredentials.filter((c) => c.expirationDate < today).length,
        expiringWithin30Days: allCredentials.filter(
          (c) => c.expirationDate >= today && c.expirationDate <= date30
        ).length,
        expiringWithin60Days: allCredentials.filter(
          (c) => c.expirationDate > date30 && c.expirationDate <= date60
        ).length,
        expiringWithin90Days: allCredentials.filter(
          (c) => c.expirationDate > date60 && c.expirationDate <= date90
        ).length,
        screeningFlagged: allCredentials.filter(
          (c) => c.screeningStatus === ScreeningStatus.FLAGGED
        ).length,
        screeningClear: allCredentials.filter(
          (c) => c.screeningStatus === ScreeningStatus.CLEAR
        ).length,
        byType: {} as { [key: string]: number },
      };

      // Count credentials by type
      for (const credential of allCredentials) {
        const type = credential.credentialType;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }

      logger.info('Compliance stats generated', stats);
      return stats;
    } catch (error) {
      logger.error('Error generating compliance stats:', error);
      throw new Error('Failed to generate compliance stats');
    }
  }
}

export default new CredentialingService();
