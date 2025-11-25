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

const prisma = new PrismaClient();

/**
 * Send policy review reminders
 * Runs daily at 9:00 AM
 */
export const policyReviewReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🔔 Running policy review reminders job...');

    const policiesDueForReview = await policyService.getPoliciesDueForReview();

    if (policiesDueForReview.length === 0) {
      console.log('✅ No policies due for review');
      return;
    }

    console.log(`📋 Found ${policiesDueForReview.length} policies due for review`);

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
        console.log(`📧 Policy review reminder for ${owner.firstName} ${owner.lastName} (${owner.email})`);
        console.log(`   - ${policies.length} policy/policies require review:`);

        policies.forEach(policy => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - policy.nextReviewDate!.getTime()) / (1000 * 60 * 60 * 24)
          );
          console.log(`     • ${policy.policyNumber} - ${policy.policyName} (${daysOverdue} days overdue)`);
        });

        // TODO: Send email notification using email service
        // await emailService.sendPolicyReviewReminder(owner.email, policies);
      }
    }

    console.log('✅ Policy review reminders completed');
  } catch (error) {
    console.error('❌ Error in policy review reminders job:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Check for incidents requiring follow-up
 * Runs daily at 10:00 AM
 */
export const incidentFollowUpCheck = cron.schedule('0 10 * * *', async () => {
  try {
    console.log('🔔 Running incident follow-up check job...');

    const incidentsRequiringFollowUp = await incidentService.getIncidentsRequiringFollowUp();

    if (incidentsRequiringFollowUp.length === 0) {
      console.log('✅ No incidents requiring follow-up');
      return;
    }

    console.log(`📋 Found ${incidentsRequiringFollowUp.length} incidents requiring follow-up`);

    // Check for overdue follow-ups
    const now = new Date();
    const overdueIncidents = incidentsRequiringFollowUp.filter(
      incident => incident.followUpDate && incident.followUpDate < now
    );

    if (overdueIncidents.length > 0) {
      console.log(`⚠️ ${overdueIncidents.length} incidents have OVERDUE follow-ups:`);
      overdueIncidents.forEach(incident => {
        const daysOverdue = Math.floor(
          (now.getTime() - incident.followUpDate!.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   • ${incident.incidentNumber} - ${incident.incidentType} (${daysOverdue} days overdue)`);
      });
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
        console.log(`📧 Incident follow-up reminder for ${investigator.firstName} ${investigator.lastName}`);
        console.log(`   - ${incidents.length} incident(s) require follow-up`);

        // TODO: Send email notification
        // await emailService.sendIncidentFollowUpReminder(investigator.email, incidents);
      }
    }

    console.log('✅ Incident follow-up check completed');
  } catch (error) {
    console.error('❌ Error in incident follow-up check job:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Monitor high-severity open incidents
 * Runs every 4 hours
 */
export const highSeverityIncidentMonitor = cron.schedule('0 */4 * * *', async () => {
  try {
    console.log('🔔 Running high-severity incident monitor...');

    const highSeverityIncidents = await incidentService.getHighSeverityOpenIncidents();

    if (highSeverityIncidents.length === 0) {
      console.log('✅ No high-severity open incidents');
      return;
    }

    console.log(`⚠️ Found ${highSeverityIncidents.length} high-severity open incidents`);

    // Check for critical incidents without investigators
    const unassignedCritical = highSeverityIncidents.filter(
      incident => incident.severity === 'CRITICAL' && !incident.assignedToId
    );

    if (unassignedCritical.length > 0) {
      console.log(`🚨 ALERT: ${unassignedCritical.length} CRITICAL incidents are UNASSIGNED:`);
      unassignedCritical.forEach(incident => {
        console.log(`   • ${incident.incidentNumber} - ${incident.incidentType}`);
      });

      // TODO: Send urgent alert to compliance team
      // await emailService.sendCriticalIncidentAlert(unassignedCritical);
    }

    // Check for incidents open too long
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleIncidents = highSeverityIncidents.filter(
      incident => incident.incidentDate < sevenDaysAgo &&
                  (incident.investigationStatus === 'PENDING' || incident.investigationStatus === 'IN_PROGRESS')
    );

    if (staleIncidents.length > 0) {
      console.log(`⚠️ ${staleIncidents.length} high-severity incidents open for > 7 days:`);
      staleIncidents.forEach(incident => {
        const daysOpen = Math.floor(
          (new Date().getTime() - incident.incidentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   • ${incident.incidentNumber} - ${daysOpen} days open`);
      });
    }

    console.log('✅ High-severity incident monitoring completed');
  } catch (error) {
    console.error('❌ Error in high-severity incident monitor:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Generate weekly compliance report
 * Runs every Monday at 8:00 AM
 */
export const weeklyComplianceReport = cron.schedule('0 8 * * 1', async () => {
  try {
    console.log('🔔 Generating weekly compliance report...');

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

    console.log('\n📊 WEEKLY COMPLIANCE REPORT');
    console.log('='.repeat(50));

    console.log('\n📋 Policy Compliance:');
    console.log(`   Total Policies: ${policyReport.summary.totalPolicies}`);
    console.log(`   Compliance Rate: ${policyReport.summary.complianceRate}%`);
    console.log(`   Pending Acknowledgments: ${policyReport.summary.pendingAcknowledgments}`);

    console.log('\n🚨 Incident Summary (Past 7 Days):');
    console.log(`   Total Incidents: ${incidentTrends.summary.totalIncidents}`);
    console.log(`   Average Resolution: ${incidentTrends.summary.averageResolutionDays} days`);

    console.log('\n📊 Incidents by Severity:');
    Object.entries(incidentTrends.bySeverity).forEach(([severity, count]) => {
      console.log(`   ${severity}: ${count}`);
    });

    console.log('\n📊 Incidents by Type:');
    Object.entries(incidentTrends.byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    console.log('\n📊 Investigation Status:');
    Object.entries(incidentTrends.investigationStatuses).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n' + '='.repeat(50));

    // TODO: Send email report to compliance team
    // await emailService.sendWeeklyComplianceReport({
    //   policyReport,
    //   incidentTrends
    // });

    console.log('✅ Weekly compliance report generated');
  } catch (error) {
    console.error('❌ Error generating weekly compliance report:', error);
  }
}); // TODO: Cron task - call .start() manually to begin

/**
 * Start all compliance monitoring jobs
 */
export function startComplianceMonitoring() {
  console.log('🚀 Starting compliance monitoring jobs...');

  policyReviewReminders.start();
  console.log('✅ Policy review reminders scheduled (daily at 9:00 AM)');

  incidentFollowUpCheck.start();
  console.log('✅ Incident follow-up checks scheduled (daily at 10:00 AM)');

  highSeverityIncidentMonitor.start();
  console.log('✅ High-severity incident monitor scheduled (every 4 hours)');

  weeklyComplianceReport.start();
  console.log('✅ Weekly compliance report scheduled (Mondays at 8:00 AM)');

  console.log('🎉 All compliance monitoring jobs started successfully');
}

/**
 * Stop all compliance monitoring jobs
 */
export function stopComplianceMonitoring() {
  console.log('🛑 Stopping compliance monitoring jobs...');

  policyReviewReminders.stop();
  incidentFollowUpCheck.stop();
  highSeverityIncidentMonitor.stop();
  weeklyComplianceReport.stop();

  console.log('✅ All compliance monitoring jobs stopped');
}

export default {
  policyReviewReminders,
  incidentFollowUpCheck,
  highSeverityIncidentMonitor,
  weeklyComplianceReport,
  startComplianceMonitoring,
  stopComplianceMonitoring
};
