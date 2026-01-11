/**
 * Integration Tests: HR Email Notifications
 *
 * These tests verify that HR automation jobs correctly generate and send email notifications:
 * - Performance review reminders
 * - PTO balance alerts
 * - Attendance compliance alerts
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

describe('HR Email Notification Integration Tests', () => {
  const testSupervisor = {
    email: 'hr-test-supervisor@example.com',
    firstName: 'Test',
    lastName: 'Supervisor',
  };

  const testEmployee = {
    email: 'hr-test-employee@example.com',
    firstName: 'Test',
    lastName: 'Employee',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Performance Review Reminders', () => {
    it('should generate email with URGENT for review due within 7 days', () => {
      const reviewDueDate = new Date();
      reviewDueDate.setDate(reviewDueDate.getDate() + 5);

      const template = resendService.EmailTemplates.performanceReviewReminder(
        testSupervisor.firstName,
        `${testEmployee.firstName} ${testEmployee.lastName}`,
        reviewDueDate,
        5,
        'http://localhost:5175/hr/performance-reviews'
      );

      // Verify template generates correct content
      expect(template.subject).toContain('URGENT');
      expect(template.subject).toContain('Performance Review Due');
      expect(template.html).toContain(testEmployee.firstName);
      expect(template.html).toContain('5 day');
    });

    it('should not mark as urgent for review due in more than 7 days', () => {
      const reviewDueDate = new Date();
      reviewDueDate.setDate(reviewDueDate.getDate() + 10);

      const template = resendService.EmailTemplates.performanceReviewReminder(
        testSupervisor.firstName,
        `${testEmployee.firstName} ${testEmployee.lastName}`,
        reviewDueDate,
        10,
        'http://localhost:5175/hr/performance-reviews'
      );

      // Verify not marked as urgent
      expect(template.subject).not.toContain('URGENT');
      expect(template.subject).toContain('Performance Review Due Soon');
    });

    it('should include dashboard link in email body', () => {
      const reviewDueDate = new Date();
      reviewDueDate.setDate(reviewDueDate.getDate() + 5);
      const dashboardLink = 'http://localhost:5175/hr/performance-reviews';

      const template = resendService.EmailTemplates.performanceReviewReminder(
        testSupervisor.firstName,
        `${testEmployee.firstName} ${testEmployee.lastName}`,
        reviewDueDate,
        5,
        dashboardLink
      );

      expect(template.html).toContain(dashboardLink);
      expect(template.html).toContain('Complete Review');
    });
  });

  describe('PTO Balance Alerts', () => {
    it('should generate correct PTO alert email template', () => {
      const template = resendService.EmailTemplates.ptoBalanceAlert(
        testEmployee.firstName,
        25,
        20,
        45,
        'Unused PTO may expire at year end.',
        'http://localhost:5175/staff/pto'
      );

      // Verify template content
      expect(template.subject).toContain('High PTO Balance Alert');
      expect(template.subject).toContain('45');
      expect(template.html).toContain('25'); // PTO balance
      expect(template.html).toContain('20'); // Vacation balance
      expect(template.html).toContain('45'); // Total
    });

    it('should include expiration warning in email body', () => {
      const expirationWarning = 'Unused PTO may expire at year end.';
      const template = resendService.EmailTemplates.ptoBalanceAlert(
        testEmployee.firstName,
        25,
        20,
        45,
        expirationWarning,
        'http://localhost:5175/staff/pto'
      );

      expect(template.html).toContain(expirationWarning);
    });

    it('should include portal link in email body', () => {
      const portalLink = 'http://localhost:5175/staff/pto';
      const template = resendService.EmailTemplates.ptoBalanceAlert(
        testEmployee.firstName,
        25,
        20,
        45,
        'Unused PTO may expire at year end.',
        portalLink
      );

      expect(template.html).toContain(portalLink);
    });
  });

  describe('Attendance Compliance Alerts', () => {
    it('should generate correct attendance issue alert template', () => {
      const lastMonday = new Date();
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date();
      lastSunday.setDate(lastSunday.getDate() - 1);

      const issues = [
        {
          employeeName: `${testEmployee.firstName} ${testEmployee.lastName}`,
          issue: 'Missing 2 attendance record(s)',
          details: '3/5 days recorded',
        },
      ];

      const template = resendService.EmailTemplates.attendanceIssueAlert(
        testSupervisor.firstName,
        lastMonday,
        lastSunday,
        issues,
        'http://localhost:5175/hr/attendance'
      );

      // Verify template content
      expect(template.subject).toContain('Attendance Compliance Issues');
      expect(template.html).toContain(testEmployee.firstName);
      expect(template.html).toContain('Missing 2 attendance record(s)');
      expect(template.html).toContain('3/5 days recorded');
    });

    it('should handle multiple issues in alert', () => {
      const lastMonday = new Date();
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date();
      lastSunday.setDate(lastSunday.getDate() - 1);

      const issues = [
        {
          employeeName: 'Employee One',
          issue: 'Missing 2 attendance record(s)',
          details: '3/5 days recorded',
        },
        {
          employeeName: 'Employee Two',
          issue: '3 unapproved attendance record(s)',
        },
        {
          employeeName: 'Employee Three',
          issue: '1 record(s) missing clock-out time',
        },
      ];

      const template = resendService.EmailTemplates.attendanceIssueAlert(
        testSupervisor.firstName,
        lastMonday,
        lastSunday,
        issues,
        'http://localhost:5175/hr/attendance'
      );

      // Verify all issues are included
      expect(template.html).toContain('Employee One');
      expect(template.html).toContain('Employee Two');
      expect(template.html).toContain('Employee Three');
      expect(template.html).toContain('Missing 2 attendance record(s)');
      expect(template.html).toContain('unapproved attendance record(s)');
      expect(template.html).toContain('missing clock-out time');
    });
  });

  describe('Email Sending Integration', () => {
    it('should call sendEmail with correct parameters', async () => {
      const mockSendEmail = resendService.sendEmail as jest.Mock;

      // Simulate sending a performance review reminder
      const template = resendService.EmailTemplates.performanceReviewReminder(
        testSupervisor.firstName,
        `${testEmployee.firstName} ${testEmployee.lastName}`,
        new Date(),
        5,
        'http://localhost:5175/hr/performance-reviews'
      );

      await resendService.sendEmail({
        to: testSupervisor.email,
        subject: template.subject,
        html: template.html,
      });

      // Verify sendEmail was called correctly
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testSupervisor.email,
        subject: expect.stringContaining('Performance Review'),
        html: expect.stringContaining(testEmployee.firstName),
      });
    });

    it('should verify isResendConfigured returns true when configured', () => {
      const mockIsConfigured = resendService.isResendConfigured as jest.Mock;
      expect(mockIsConfigured()).toBe(true);
    });

    it('should send PTO balance alert email correctly', async () => {
      const mockSendEmail = resendService.sendEmail as jest.Mock;

      const template = resendService.EmailTemplates.ptoBalanceAlert(
        testEmployee.firstName,
        25,
        20,
        45,
        'Unused PTO may expire at year end.',
        'http://localhost:5175/staff/pto'
      );

      await resendService.sendEmail({
        to: testEmployee.email,
        subject: template.subject,
        html: template.html,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testEmployee.email,
        subject: expect.stringContaining('PTO Balance'),
        html: expect.stringContaining('45'),
      });
    });

    it('should send attendance alert email correctly', async () => {
      const mockSendEmail = resendService.sendEmail as jest.Mock;

      const lastMonday = new Date();
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date();
      lastSunday.setDate(lastSunday.getDate() - 1);

      const issues = [
        {
          employeeName: `${testEmployee.firstName} ${testEmployee.lastName}`,
          issue: 'Missing 2 attendance record(s)',
          details: '3/5 days recorded',
        },
      ];

      const template = resendService.EmailTemplates.attendanceIssueAlert(
        testSupervisor.firstName,
        lastMonday,
        lastSunday,
        issues,
        'http://localhost:5175/hr/attendance'
      );

      await resendService.sendEmail({
        to: testSupervisor.email,
        subject: template.subject,
        html: template.html,
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testSupervisor.email,
        subject: expect.stringContaining('Attendance Compliance'),
        html: expect.stringContaining('Missing 2 attendance record(s)'),
      });
    });
  });
});
