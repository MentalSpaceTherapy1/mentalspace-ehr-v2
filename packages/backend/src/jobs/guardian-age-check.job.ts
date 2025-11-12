import cron from 'node-cron';
import prisma from '../services/database';
import logger from '../utils/logger';
import guardianRelationshipService from '../services/guardian-relationship.service';

/**
 * Guardian Age Check Job
 *
 * Daily job to:
 * 1. Check for minors turning 18
 * 2. Auto-expire guardian relationships (except HEALTHCARE_PROXY)
 * 3. Send notifications 30 days before expiration
 * 4. Clean up expired relationships
 */

interface MinorTurning18 {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;
  turnedAdultAt: Date;
}

class GuardianAgeCheckJob {
  private isRunning = false;

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
   * Get date when client will turn 18
   */
  private getAdultDate(dateOfBirth: Date): Date {
    const adultDate = new Date(dateOfBirth);
    adultDate.setFullYear(adultDate.getFullYear() + 18);
    return adultDate;
  }

  /**
   * Check for minors turning 18 today
   */
  private async checkMinorsTurning18(): Promise<MinorTurning18[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate date 18 years ago
      const eighteenYearsAgo = new Date(today);
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

      // Find clients born exactly 18 years ago today
      const clients = await prisma.client.findMany({
        where: {
          dateOfBirth: {
            gte: eighteenYearsAgo,
            lt: new Date(eighteenYearsAgo.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      return clients.map((client) => ({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        dateOfBirth: client.dateOfBirth,
        age: this.calculateAge(client.dateOfBirth),
        turnedAdultAt: today,
      }));
    } catch (error) {
      logger.error('Error checking minors turning 18:', error);
      throw error;
    }
  }

  /**
   * Expire guardian relationships for new adults
   */
  private async expireRelationshipsForNewAdults(
    newAdults: MinorTurning18[]
  ): Promise<number> {
    let expiredCount = 0;

    for (const adult of newAdults) {
      try {
        // Get all active guardian relationships for this client
        const relationships = await prisma.guardianRelationship.findMany({
          where: {
            minorId: adult.id,
            verificationStatus: 'VERIFIED',
            relationshipType: {
              not: 'HEALTHCARE_PROXY', // Don't auto-expire healthcare proxies
            },
            OR: [
              { endDate: null },
              { endDate: { gt: new Date() } },
            ],
          },
          include: {
            guardian: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Expire each relationship
        for (const rel of relationships) {
          await guardianRelationshipService.revokeRelationship(
            rel.id,
            `Automatic expiration: Client turned 18 on ${adult.turnedAdultAt.toISOString().split('T')[0]}`
          );

          expiredCount++;

          logger.info('Guardian relationship auto-expired', {
            relationshipId: rel.id,
            guardianId: rel.guardianId,
            minorId: rel.minorId,
            reason: 'turned_18',
          });

          // TODO: Send notification to guardian and client
          // await sendExpirationNotification(rel);
        }

        logger.info(`Expired ${relationships.length} relationships for ${adult.firstName} ${adult.lastName}`);
      } catch (error) {
        logger.error(`Error expiring relationships for client ${adult.id}:`, error);
      }
    }

    return expiredCount;
  }

  /**
   * Check for relationships expiring soon (30 days)
   */
  private async checkUpcomingExpirations(): Promise<any[]> {
    try {
      const relationships = await guardianRelationshipService.getExpiringRelationships(30);

      for (const rel of relationships) {
        const daysUntilExpiration = Math.ceil(
          (rel.endDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        logger.info('Guardian relationship expiring soon', {
          relationshipId: rel.id,
          guardianId: rel.guardianId,
          minorId: rel.minorId,
          daysUntilExpiration,
        });

        // TODO: Send notification
        // await sendExpirationWarning(rel, daysUntilExpiration);
      }

      return relationships;
    } catch (error) {
      logger.error('Error checking upcoming expirations:', error);
      throw error;
    }
  }

  /**
   * Check for minors approaching 18 (30 days before)
   */
  private async checkMinorsApproaching18(): Promise<any[]> {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Calculate date 18 years ago minus 30 days
      const eighteenYearsAgoMinus30Days = new Date(thirtyDaysFromNow);
      eighteenYearsAgoMinus30Days.setFullYear(eighteenYearsAgoMinus30Days.getFullYear() - 18);

      // Find clients who will turn 18 in about 30 days
      const clients = await prisma.client.findMany({
        where: {
          dateOfBirth: {
            gte: new Date(eighteenYearsAgoMinus30Days.getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(eighteenYearsAgoMinus30Days.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      for (const client of clients) {
        const adultDate = this.getAdultDate(client.dateOfBirth);
        const daysUntilAdult = Math.ceil(
          (adultDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get their guardian relationships
        const relationships = await prisma.guardianRelationship.findMany({
          where: {
            minorId: client.id,
            verificationStatus: 'VERIFIED',
            relationshipType: {
              not: 'HEALTHCARE_PROXY',
            },
            OR: [
              { endDate: null },
              { endDate: { gt: new Date() } },
            ],
          },
          include: {
            guardian: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        logger.info('Minor approaching 18', {
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          daysUntilAdult,
          relationshipsCount: relationships.length,
        });

        // TODO: Send notification to guardians and client
        // await sendApproaching18Notification(client, relationships, daysUntilAdult);
      }

      return clients;
    } catch (error) {
      logger.error('Error checking minors approaching 18:', error);
      throw error;
    }
  }

  /**
   * Clean up already expired relationships
   */
  private async cleanupExpiredRelationships(): Promise<number> {
    try {
      // This doesn't delete, just logs for audit purposes
      const expiredRelationships = await prisma.guardianRelationship.findMany({
        where: {
          endDate: {
            lt: new Date(),
          },
        },
      });

      logger.info(`Found ${expiredRelationships.length} expired relationships`);

      return expiredRelationships.length;
    } catch (error) {
      logger.error('Error cleaning up expired relationships:', error);
      throw error;
    }
  }

  /**
   * Run the full age check process
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Guardian age check job already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('Starting guardian age check job...');

      // 1. Check for minors turning 18 today
      const newAdults = await this.checkMinorsTurning18();
      logger.info(`Found ${newAdults.length} clients turning 18 today`);

      // 2. Expire their guardian relationships
      const expiredCount = await this.expireRelationshipsForNewAdults(newAdults);
      logger.info(`Expired ${expiredCount} guardian relationships`);

      // 3. Check for relationships expiring in next 30 days
      const upcomingExpirations = await this.checkUpcomingExpirations();
      logger.info(`Found ${upcomingExpirations.length} relationships expiring in 30 days`);

      // 4. Check for minors approaching 18 (30-day warning)
      const approaching18 = await this.checkMinorsApproaching18();
      logger.info(`Found ${approaching18.length} clients turning 18 in ~30 days`);

      // 5. Clean up expired relationships
      const cleanedCount = await this.cleanupExpiredRelationships();
      logger.info(`Found ${cleanedCount} already expired relationships`);

      logger.info('Guardian age check job completed successfully', {
        newAdults: newAdults.length,
        expiredRelationships: expiredCount,
        upcomingExpirations: upcomingExpirations.length,
        approaching18: approaching18.length,
        alreadyExpired: cleanedCount,
      });
    } catch (error) {
      logger.error('Error running guardian age check job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the cron job (runs daily at 2 AM)
   */
  start(): void {
    logger.info('Starting guardian age check cron job...');

    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.run();
      } catch (error) {
        logger.error('Error in guardian age check cron job:', error);
      }
    });

    logger.info('Guardian age check cron job scheduled (daily at 2 AM)');
  }

  /**
   * Run immediately (for testing)
   */
  async runNow(): Promise<void> {
    await this.run();
  }
}

export default new GuardianAgeCheckJob();
