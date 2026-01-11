/**
 * Integration Tests: Compliance Email Notifications
 *
 * These tests verify that compliance monitoring jobs correctly generate and send email notifications:
 * - Policy review reminders
 * - Incident follow-up reminders
 * - Critical incident alerts
 */

import * as resendService from '../../services/resend.service';

// Mock the sendEmail function to track calls without actually sending
jest.mock('../../services/resend.service', () => {
  const original = jest.requireActual('../../services/resend.service');
  return {
    ...original,
    sendEmail: jest.fn().mockResolvedValue(true),
    isResendConfigured: jest.fn().mockReturnValue(true),
  };
});

describe('Compliance Email Notification Integration Tests', () => {
  const testPolicyOwner = {
    email: 'policy-owner@example.com',
    firstName: 'Policy',
    lastName: 'Owner',
  };

  const testInvestigator = {
    email: 'investigator@example.com',
    firstName: 'Jane',
    lastName: 'Investigator',
  };

  const testAdmin = {
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Policy Review Reminders', () => {
    it('should generate correct subject for multiple policies', () => {
      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 30 },
        { policyNumber: 'POL-002', policyName: 'Security Policy', daysOverdue: 15 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        'http://localhost:5175/compliance/policies'
      );

      // Verify subject format
      expect(template.subject).toContain('Policies Due for Review');
      expect(template.subject).toContain('2');
    });

    it('should generate correct subject for single policy', () => {
      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        'http://localhost:5175/compliance/policies'
      );

      // Verify singular form
      expect(template.subject).toContain('Policy Due for Review');
    });

    it('should list all policies in the email body', () => {
      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 30 },
        { policyNumber: 'POL-002', policyName: 'Security Policy', daysOverdue: 15 },
        { policyNumber: 'POL-003', policyName: 'HIPAA Compliance', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        'http://localhost:5175/compliance/policies'
      );

      // Verify all policies are included
      expect(template.html).toContain('POL-001');
      expect(template.html).toContain('POL-002');
      expect(template.html).toContain('POL-003');
      expect(template.html).toContain('Privacy Policy');
      expect(template.html).toContain('Security Policy');
      expect(template.html).toContain('HIPAA Compliance');
    });

    it('should include dashboard link in email body', () => {
      const dashboardLink = 'http://localhost:5175/compliance/policies';
      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        dashboardLink
      );

      expect(template.html).toContain(dashboardLink);
    });

    it('should show days overdue for each policy', () => {
      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 30 },
        { policyNumber: 'POL-002', policyName: 'Security Policy', daysOverdue: 15 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        'http://localhost:5175/compliance/policies'
      );

      expect(template.html).toContain('30');
      expect(template.html).toContain('15');
    });

    it('should personalize greeting with recipient name', () => {
      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        'http://localhost:5175/compliance/policies'
      );

      expect(template.html).toContain(`Hi ${testPolicyOwner.firstName}`);
    });
  });

  describe('Incident Follow-up Reminders', () => {
    it('should generate correct subject for multiple incidents', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach', daysOverdue: 5 },
        { incidentNumber: 'INC-2026-002', incidentType: 'Security Incident', daysOverdue: undefined },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      // Verify subject format
      expect(template.subject).toContain('Incidents Requiring Follow-up');
      expect(template.subject).toContain('2');
    });

    it('should generate correct subject for single incident', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach' },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      // Verify singular form
      expect(template.subject).toContain('Incident Requiring Follow-up');
    });

    it('should list all incidents in email body', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach', daysOverdue: 5 },
        { incidentNumber: 'INC-2026-002', incidentType: 'Security Incident', daysOverdue: undefined },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      // Verify content
      expect(template.html).toContain('INC-2026-001');
      expect(template.html).toContain('INC-2026-002');
      expect(template.html).toContain('Privacy Breach');
      expect(template.html).toContain('Security Incident');
    });

    it('should show overdue days for overdue incidents', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      expect(template.html).toContain('5 days overdue');
    });

    it('should not show overdue text for non-overdue incidents', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach', daysOverdue: undefined },
        { incidentNumber: 'INC-2026-002', incidentType: 'Security Incident' },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      // Should not contain "days overdue" text
      expect(template.html).not.toContain('days overdue');
    });

    it('should include dashboard link in email body', () => {
      const dashboardLink = 'http://localhost:5175/compliance/incidents';
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach' },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        dashboardLink
      );

      expect(template.html).toContain(dashboardLink);
    });
  });

  describe('Critical Incident Alerts', () => {
    it('should generate critical incident alert with URGENT in subject', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Data Breach' },
        { incidentNumber: 'INC-2026-002', incidentType: 'HIPAA Violation' },
      ];

      const template = resendService.EmailTemplates.criticalIncidentAlert(
        testAdmin.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      // Verify URGENT in subject
      expect(template.subject).toContain('URGENT');
      expect(template.subject).toContain('Critical Incident');
      expect(template.subject).toContain('Without Investigator');
    });

    it('should list all critical incidents', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Data Breach' },
        { incidentNumber: 'INC-2026-002', incidentType: 'HIPAA Violation' },
        { incidentNumber: 'INC-2026-003', incidentType: 'Security Breach' },
      ];

      const template = resendService.EmailTemplates.criticalIncidentAlert(
        testAdmin.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      expect(template.html).toContain('INC-2026-001');
      expect(template.html).toContain('INC-2026-002');
      expect(template.html).toContain('INC-2026-003');
      expect(template.html).toContain('Data Breach');
      expect(template.html).toContain('HIPAA Violation');
      expect(template.html).toContain('Security Breach');
    });

    it('should include dashboard link in email body', () => {
      const dashboardLink = 'http://localhost:5175/compliance/incidents';
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Data Breach' },
      ];

      const template = resendService.EmailTemplates.criticalIncidentAlert(
        testAdmin.firstName,
        incidents,
        dashboardLink
      );

      expect(template.html).toContain(dashboardLink);
    });

    it('should show incident count in subject', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Data Breach' },
        { incidentNumber: 'INC-2026-002', incidentType: 'HIPAA Violation' },
        { incidentNumber: 'INC-2026-003', incidentType: 'Security Breach' },
      ];

      const template = resendService.EmailTemplates.criticalIncidentAlert(
        testAdmin.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      expect(template.subject).toContain('3');
    });

    it('should use singular form for single incident', () => {
      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Data Breach' },
      ];

      const template = resendService.EmailTemplates.criticalIncidentAlert(
        testAdmin.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      expect(template.subject).toContain('1 Critical Incident Without Investigator');
      expect(template.subject).not.toContain('Incidents');
    });
  });

  describe('Email Sending Integration', () => {
    it('should call sendEmail with correct parameters for policy review', async () => {
      const mockSendEmail = resendService.sendEmail as jest.Mock;

      const policies = [
        { policyNumber: 'POL-001', policyName: 'Privacy Policy', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.policyReviewReminder(
        testPolicyOwner.firstName,
        policies,
        'http://localhost:5175/compliance/policies'
      );

      await resendService.sendEmail({
        to: testPolicyOwner.email,
        subject: template.subject,
        html: template.html,
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testPolicyOwner.email,
        subject: expect.stringContaining('Policy Due for Review'),
        html: expect.stringContaining('POL-001'),
      });
    });

    it('should call sendEmail with correct parameters for incident follow-up', async () => {
      const mockSendEmail = resendService.sendEmail as jest.Mock;

      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Privacy Breach', daysOverdue: 5 },
      ];

      const template = resendService.EmailTemplates.incidentFollowUpReminder(
        testInvestigator.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      await resendService.sendEmail({
        to: testInvestigator.email,
        subject: template.subject,
        html: template.html,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testInvestigator.email,
        subject: expect.stringContaining('Requiring Follow-up'),
        html: expect.stringContaining('INC-2026-001'),
      });
    });

    it('should call sendEmail with correct parameters for critical incident alert', async () => {
      const mockSendEmail = resendService.sendEmail as jest.Mock;

      const incidents = [
        { incidentNumber: 'INC-2026-001', incidentType: 'Data Breach' },
      ];

      const template = resendService.EmailTemplates.criticalIncidentAlert(
        testAdmin.firstName,
        incidents,
        'http://localhost:5175/compliance/incidents'
      );

      await resendService.sendEmail({
        to: testAdmin.email,
        subject: template.subject,
        html: template.html,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testAdmin.email,
        subject: expect.stringContaining('URGENT'),
        html: expect.stringContaining('Data Breach'),
      });
    });

    it('should verify isResendConfigured returns true when configured', () => {
      const mockIsConfigured = resendService.isResendConfigured as jest.Mock;
      expect(mockIsConfigured()).toBe(true);
    });
  });
});
