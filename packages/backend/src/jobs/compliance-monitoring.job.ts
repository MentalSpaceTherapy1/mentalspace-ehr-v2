/**
 * Compliance Monitoring Cron Job
 * Module 9: Compliance Management - Agent 3
 *
 * Scheduled tasks for compliance monitoring:
 * - Policy review reminders
 * - Incident follow-up checks
 * - Compliance reporting
 */

import cron from 'node-cron';
import policyService from '../services/policy.service';
import incidentService from '../services/incident.service';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendEmail, EmailTemplates, isResendConfigured } from '../services/resend.service';
import config from '../config';
import { UserRoles } from '@mentalspace/shared';

const prisma = new PrismaClient();

/**
 * Send policy review reminders
 * Runs daily at 9:00 AM
 */
export const policyReviewReminders = cron.schedule('0 9 * * *', async () => {
  try {
    logger.info('Running policy review reminders job');

    const policiesDueForReview = await policyService.getPoliciesDueForReview();

    if (policiesDueForReview.length === 0) {
      logger.info('No policies due for review');
      return;
    }

    logger.info('Policies due for review', { count: policiesDueForReview.length });

    // Group policies by owner
    const policiesByOwner: { [key: string]: any[] } = {};
    policiesDueForReview.forEach(policy => {
      if (!policiesByOwner[policy.ownerId]) {
        policiesByOwner[policy.ownerId] = [];
      }
      policiesByOwner[policy.ownerId].push(policy);
    });

    // Log reminders for each owner
    for (const [ownerId, policies] of Object.entries(policiesByOwner)) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { firstName: true, lastName: true, email: true }
      });

      if (owner) {
        const overdueDetails = policies.map(policy => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - policy.nextReviewDate!.getTime()) / (1000 * 60 * 60 * 24)
          );
          return { policyNumber: policy.policyNumber, policyName: policy.policyName, daysOverdue };
        });

        // Send email notification
        if (owner.email && isResendConfigured()) {
          const dashboardUrl = `${config.frontendUrl}/compliance/policies`;
          const template = EmailTemplates.policyReviewReminder(
            owner.firstName,
            overdueDetails,
            dashboardUrl
          );

          const sent = await sendEmail({
            to: owner.email,
            subject: template.subject,
            html: template.html,
          });

          if (sent) {
            logger.info('Policy review reminder sent', {
              ownerEmail: owner.email,
              ownerName: `${owner.firstName} ${owner.lastName}`,
              policyCount: policies.length,
              policies: overdueDetails
            });
          }
        } else {
          logger.info('Policy review reminder logged (email not configured)', {
            ownerEmail: owner.email,
            ownerName: `${owner.firstName} ${owner.lastName}`,
            policyCount: policies.length,
            policies: overdueDetails
          });
        }
      }
    }

    logger.info('Policy review reminders completed');
  } catch (error) {
    logger.error('Error in policy review reminders job', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Check for incidents requiring follow-up
 * Runs daily at 10:00 AM
 */
export const incidentFollowUpCheck = cron.schedule('0 10 * * *', async () => {
  try {
    logger.info('Running incident follow-up check job');

    const incidentsRequiringFollowUp = await incidentService.getIncidentsRequiringFollowUp();

    if (incidentsRequiringFollowUp.length === 0) {
      logger.info('No incidents requiring follow-up');
      return;
    }

    logger.info('Incidents requiring follow-up', { count: incidentsRequiringFollowUp.length });

    // Check for overdue follow-ups
    const now = new Date();
    const overdueIncidents = incidentsRequiringFollowUp.filter(
      incident => incident.followUpDate && incident.followUpDate < now
    );

    if (overdueIncidents.length > 0) {
      const overdueDetails = overdueIncidents.map(incident => {
        const daysOverdue = Math.floor(
          (now.getTime() - incident.followUpDate!.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { incidentNumber: incident.incidentNumber, incidentType: incident.incidentType, daysOverdue };
      });
      logger.warn('Overdue incident follow-ups', { count: overdueIncidents.length, incidents: overdueDetails });
    }

    // Group by assigned investigator
    const incidentsByInvestigator: { [key: string]: any[] } = {};
    incidentsRequiringFollowUp.forEach(incident => {
      if (incident.assignedToId) {
        if (!incidentsByInvestigator[incident.assignedToId]) {
          incidentsByInvestigator[incident.assignedToId] = [];
        }
        incidentsByInvestigator[incident.assignedToId].push(incident);
      }
    });

    // Log reminders for each investigator
    for (const [investigatorId, incidents] of Object.entries(incidentsByInvestigator)) {
      const investigator = await prisma.user.findUnique({
        where: { id: investigatorId },
        select: { firstName: true, lastName: true, email: true }
      });

      if (investigator) {
        // Send email notification
        if (investigator.email && isResendConfigured()) {
          const dashboardUrl = `${config.frontendUrl}/compliance/incidents`;
          const now = new Date();
          const incidentDetails = incidents.map(incident => {
            const daysOverdue = incident.followUpDate && incident.followUpDate < now
              ? Math.floor((now.getTime() - incident.followUpDate.getTime()) / (1000 * 60 * 60 * 24))
              : undefined;
            return { incidentNumber: incident.incidentNumber, incidentType: incident.incidentType, daysOverdue };
          });

          const template = EmailTemplates.incidentFollowUpReminder(
            investigator.firstName,
            incidentDetails,
            dashboardUrl
          );

          const sent = await sendEmail({
            to: investigator.email,
            subject: template.subject,
            html: template.html,
          });

          if (sent) {
            logger.info('Incident follow-up reminder sent', {
              investigatorName: `${investigator.firstName} ${investigator.lastName}`,
              investigatorEmail: investigator.email,
              incidentCount: incidents.length
            });
          }
        } else {
          logger.info('Incident follow-up reminder logged (email not configured)', {
            investigatorName: `${investigator.firstName} ${investigator.lastName}`,
            investigatorEmail: investigator.email,
            incidentCount: incidents.length
          });
        }
      }
    }

    logger.info('Incident follow-up check completed');
  } catch (error) {
    logger.error('Error in incident follow-up check job', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Monitor high-severity open incidents
 * Runs every 4 hours
 */
export const highSeverityIncidentMonitor = cron.schedule('0 */4 * * *', async () => {
  try {
    logger.info('Running high-severity incident monitor');

    const highSeverityIncidents = await incidentService.getHighSeverityOpenIncidents();

    if (highSeverityIncidents.length === 0) {
      logger.info('No high-severity open incidents');
      return;
    }

    logger.warn('High-severity open incidents found', { count: highSeverityIncidents.length });

    // Check for critical incidents without investigators
    const unassignedCritical = highSeverityIncidents.filter(
      incident => incident.severity === 'CRITICAL' && !incident.assignedToId
    );

    if (unassignedCritical.length > 0) {
      const criticalDetails = unassignedCritical.map(incident => ({
        incidentNumber: incident.incidentNumber,
        incidentType: incident.incidentType
      }));
      logger.error('CRITICAL unassigned incidents', { count: unassignedCritical.length, incidents: criticalDetails });

      // Send urgent alert to compliance team
      if (isResendConfigured()) {
        const complianceTeam = await prisma.user.findMany({
          where: {
            roles: { hasSome: [UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN] },
            employmentStatus: 'ACTIVE',
          },
          select: { email: true, firstName: true },
        });

        const dashboardUrl = `${config.frontendUrl}/compliance/incidents`;

        for (const member of complianceTeam) {
          if (member.email) {
            const template = EmailTemplates.criticalIncidentAlert(
              member.firstName,
              criticalDetails,
              dashboardUrl
            );

            const sent = await sendEmail({
              to: member.email,
              subject: template.subject,
              html: template.html,
            });

            if (sent) {
              logger.info('Critical incident alert sent', {
                recipient: member.email,
                incidentCount: criticalDetails.length,
              });
            }
          }
        }
      }
    }

    // Check for incidents open too long
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleIncidents = highSeverityIncidents.filter(
      incident => incident.incidentDate < sevenDaysAgo &&
                  (incident.investigationStatus === 'PENDING' || incident.investigationStatus === 'IN_PROGRESS')
    );

    if (staleIncidents.length > 0) {
      const staleDetails = staleIncidents.map(incident => {
        const daysOpen = Math.floor(
          (new Date().getTime() - incident.incidentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { incidentNumber: incident.incidentNumber, daysOpen };
      });
      logger.warn('High-severity incidents open > 7 days', { count: staleIncidents.length, incidents: staleDetails });
    }

    logger.info('High-severity incident monitoring completed');
  } catch (error) {
    logger.error('Error in high-severity incident monitor', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Generate weekly compliance report
 * Runs every Monday at 8:00 AM
 */
export const weeklyComplianceReport = cron.schedule('0 8 * * 1', async () => {
  try {
    logger.info('Generating weekly compliance report');

    // Get policy compliance report
    const policyReport = await policyService.getComplianceReport();

    // Get incident trend analysis for past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const incidentTrends = await incidentService.getTrendAnalysis({
      startDate,
      endDate
    });

    logger.info('Weekly compliance report generated', {
      report: {
        policyCompliance: {
          totalPolicies: policyReport.summary.totalPolicies,
          complianceRate: policyReport.summary.complianceRate,
          pendingAcknowledgments: policyReport.summary.pendingAcknowledgments
        },
        incidentSummary: {
          totalIncidents: incidentTrends.summary.totalIncidents,
          averageResolutionDays: incidentTrends.summary.averageResolutionDays,
          bySeverity: incidentTrends.bySeverity,
          byType: incidentTrends.byType,
          investigationStatuses: incidentTrends.investigationStatuses
        }
      }
    });

    // TODO: Send email report to compliance team
    // await emailService.sendWeeklyComplianceReport({
    //   policyReport,
    //   incidentTrends
    // });

    logger.info('Weekly compliance report completed');
  } catch (error) {
    logger.error('Error generating weekly compliance report', { error: error instanceof Error ? error.message : error });
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Start all compliance monitoring jobs
 */
export function startComplianceMonitoring() {
  logger.info('Starting compliance monitoring jobs');

  policyReviewReminders.start();
  logger.info('Scheduled: Policy review reminders (daily at 9:00 AM)');

  incidentFollowUpCheck.start();
  logger.info('Scheduled: Incident follow-up checks (daily at 10:00 AM)');

  highSeverityIncidentMonitor.start();
  logger.info('Scheduled: High-severity incident monitor (every 4 hours)');

  weeklyComplianceReport.start();
  logger.info('Scheduled: Weekly compliance report (Mondays at 8:00 AM)');

  logger.info('All compliance monitoring jobs started successfully');
}

/**
 * Stop all compliance monitoring jobs
 */
export function stopComplianceMonitoring() {
  logger.info('Stopping compliance monitoring jobs');

  policyReviewReminders.stop();
  incidentFollowUpCheck.stop();
  highSeverityIncidentMonitor.stop();
  weeklyComplianceReport.stop();

  logger.info('All compliance monitoring jobs stopped');
}

export default {
  policyReviewReminders,
  incidentFollowUpCheck,
  highSeverityIncidentMonitor,
  weeklyComplianceReport,
  startComplianceMonitoring,
  stopComplianceMonitoring
};
