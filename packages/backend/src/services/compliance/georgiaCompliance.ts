import prisma from '../database';
// Georgia Compliance Service - Automated Compliance Checking
// Phase 6 - Week 20 - Georgia-Specific Compliance Automation

import logger, { auditLogger } from '../../utils/logger';
import { UserRoles } from '@mentalspace/shared';
import { alertService } from '../alerts/alertService';

interface ComplianceViolation {
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  clinicianId: string;
  message: string;
  actionRequired: string;
  metadata?: Record<string, any>;
}

class GeorgiaComplianceService {
  /**
   * Run all Georgia compliance checks for a clinician
   */
  async checkCompliance(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Run all compliance checks
    violations.push(...(await this.check7DayNoteSignatureRule(clinicianId)));
    violations.push(...(await this.checkTreatmentPlan90DayReview(clinicianId)));
    violations.push(...(await this.checkInformedConsentAnnualRenewal(clinicianId)));
    violations.push(...(await this.checkSupervisionHoursRequirement(clinicianId)));
    violations.push(...(await this.checkMinorConsentValidation(clinicianId)));
    violations.push(...(await this.checkTelehealthConsent(clinicianId)));
    violations.push(...(await this.checkHIPAATrainingRequirement(clinicianId)));

    // Create alerts for violations
    for (const violation of violations) {
      await alertService.createAlert(clinicianId, {
        alertType: violation.type,
        severity: violation.severity,
        message: violation.message,
        actionRequired: violation.actionRequired,
      });
    }

    if (violations.length > 0) {
      logger.warn(`Georgia compliance violations found`, {
        clinicianId,
        violationCount: violations.length,
      });
    }

    return violations;
  }

  /**
   * Check 7-Day Note Signature Rule (Georgia Requirement)
   * Notes must be signed within 7 days. Billing hold at 14 days.
   */
  private async check7DayNoteSignatureRule(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // Check notes >7 days unsigned (WARNING)
    const notesOver7Days = await prisma.clinicalNote.findMany({
      where: {
        clinicianId,
        status: 'DRAFT',
        sessionDate: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (notesOver7Days.length > 0) {
      violations.push({
        type: 'GEORGIA_7DAY_NOTE_RULE_WARNING',
        severity: 'WARNING',
        clinicianId,
        message: `${notesOver7Days.length} notes are 7-14 days old and unsigned`,
        actionRequired: 'Sign these notes immediately to maintain Georgia compliance',
        metadata: {
          noteIds: notesOver7Days.map((n) => n.id),
          oldestNote: notesOver7Days[0]?.sessionDate,
        },
      });
    }

    // Check notes >14 days unsigned (CRITICAL - billing hold)
    const notesOver14Days = await prisma.clinicalNote.findMany({
      where: {
        clinicianId,
        status: 'DRAFT',
        sessionDate: { lt: fourteenDaysAgo },
      },
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (notesOver14Days.length > 0) {
      violations.push({
        type: 'GEORGIA_7DAY_NOTE_RULE_CRITICAL',
        severity: 'CRITICAL',
        clinicianId,
        message: `${notesOver14Days.length} notes are over 14 days unsigned (BILLING HOLD)`,
        actionRequired: 'URGENT: Sign these notes immediately. Associated charges cannot be billed.',
        metadata: {
          noteIds: notesOver14Days.map((n) => n.id),
          billingHold: true,
        },
      });

      // Apply billing hold to associated charges
      for (const note of notesOver14Days) {
        if (note.appointmentId) {
          await prisma.chargeEntry.updateMany({
            where: { appointmentId: note.appointmentId },
            data: { chargeStatus: 'Hold - Unsigned Note' as any },
          });
        }
      }

      auditLogger.warn('Billing hold applied due to unsigned notes', {
        clinicianId,
        noteCount: notesOver14Days.length,
      });
    }

    return violations;
  }

  /**
   * Check Treatment Plan 90-Day Review Requirement
   */
  private async checkTreatmentPlan90DayReview(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get active clients without current treatment plans
    const clientsWithoutCurrentPlans = await prisma.client.findMany({
      where: {
        primaryTherapistId: clinicianId,
        status: 'ACTIVE',
        OR: [
          {
            treatmentPlans: {
              none: {},
            },
          },
          {
            treatmentPlans: {
              none: {
                OR: [
                  { planDate: { gte: ninetyDaysAgo } },
                  { reviewDate: { gte: ninetyDaysAgo } },
                ],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (clientsWithoutCurrentPlans.length > 0) {
      violations.push({
        type: 'GEORGIA_TREATMENT_PLAN_90DAY_REVIEW',
        severity: 'CRITICAL',
        clinicianId,
        message: `${clientsWithoutCurrentPlans.length} clients have outdated treatment plans (>90 days)`,
        actionRequired: 'Review and update treatment plans. Georgia requires 90-day reviews.',
        metadata: {
          clientIds: clientsWithoutCurrentPlans.map((c) => c.id),
        },
      });
    }

    return violations;
  }

  /**
   * Check Informed Consent Annual Renewal
   */
  private async checkInformedConsentAnnualRenewal(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Get active clients with expired consent
    const clientsWithExpiredConsent = await prisma.client.count({
      where: {
        primaryTherapistId: clinicianId,
        status: 'ACTIVE',
        treatmentConsentDate: { lt: oneYearAgo },
      },
    });

    if (clientsWithExpiredConsent > 0) {
      violations.push({
        type: 'GEORGIA_INFORMED_CONSENT_EXPIRED',
        severity: 'CRITICAL',
        clinicianId,
        message: `${clientsWithExpiredConsent} clients have expired informed consent (>1 year)`,
        actionRequired: 'Obtain renewed informed consent. Georgia requires annual renewal.',
      });
    }

    return violations;
  }

  /**
   * Check Supervision Hours Requirement (License-Specific)
   */
  private async checkSupervisionHoursRequirement(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Get user and check if under supervision
    const user = await prisma.user.findUnique({
      where: { id: clinicianId },
      select: {
        isUnderSupervision: true,
        licenseNumber: true,
        requiredSupervisionHours: true,
      },
    });

    if (!user?.isUnderSupervision) return violations;

    // Calculate hours for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const supervisionSessions = await prisma.supervisionSession.findMany({
      where: {
        superviseeId: clinicianId,
        sessionDate: { gte: startOfMonth },
      },
      select: { hoursEarned: true },
    });

    const totalHours = supervisionSessions.reduce((sum, session) => sum + session.hoursEarned, 0);
    const requiredHours = user.requiredSupervisionHours || 2; // Default 2 hours

    if (totalHours < requiredHours) {
      const remainingHours = requiredHours - totalHours;
      violations.push({
        type: 'GEORGIA_SUPERVISION_HOURS_DEFICIT',
        severity: remainingHours > requiredHours * 0.5 ? 'CRITICAL' : 'WARNING',
        clinicianId,
        message: `Supervision hours deficit: ${totalHours.toFixed(1)}/${requiredHours} hours logged this month`,
        actionRequired: `Schedule ${remainingHours.toFixed(1)} more hours of supervision this month`,
        metadata: {
          totalHours,
          requiredHours,
          remainingHours,
        },
      });
    }

    return violations;
  }

  /**
   * Check Minor Consent Validation
   */
  private async checkMinorConsentValidation(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Get minor clients (<18) without guardian consent
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    const minorsWithoutGuardian = await prisma.client.count({
      where: {
        primaryTherapistId: clinicianId,
        status: 'ACTIVE',
        dateOfBirth: { gt: eighteenYearsAgo },
        legalGuardians: {
          none: {},
        },
      },
    });

    if (minorsWithoutGuardian > 0) {
      violations.push({
        type: 'GEORGIA_MINOR_CONSENT_MISSING',
        severity: 'CRITICAL',
        clinicianId,
        message: `${minorsWithoutGuardian} minor clients lack guardian consent`,
        actionRequired: 'URGENT: Obtain parental/guardian consent. Cannot treat minors without consent.',
      });
    }

    return violations;
  }

  /**
   * Check Telehealth Consent
   */
  private async checkTelehealthConsent(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Get telehealth appointments without consent (mock - would need additional field in Client model)
    // For now, we'll skip this check as the schema doesn't have telehealthConsent field
    // In production, this would check: client.telehealthConsent === false && appointment.isTelehealth === true

    return violations;
  }

  /**
   * Check HIPAA Training Annual Requirement
   */
  private async checkHIPAATrainingRequirement(clinicianId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // In production, this would check a HIPAATraining table
    // For now, we'll create a mock check

    // Mock: Assume training date stored in user profile (would need additional field)
    // This is a placeholder for the actual implementation

    return violations;
  }

  /**
   * Run compliance checks for all clinicians (scheduled job)
   */
  async runComplianceChecksForAll(): Promise<void> {
    logger.info('Running Georgia compliance checks for all clinicians...');

    const clinicians = await prisma.user.findMany({
      where: { roles: { hasSome: [UserRoles.CLINICIAN] }, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    let totalViolations = 0;

    for (const clinician of clinicians) {
      const violations = await this.checkCompliance(clinician.id);
      totalViolations += violations.length;
    }

    logger.info(`Compliance checks complete`, {
      cliniciansChecked: clinicians.length,
      totalViolations,
    });
  }

  /**
   * Get compliance summary for practice
   */
  async getPracticeComplianceSummary(): Promise<{
    totalClinicians: number;
    compliantClinicians: number;
    violationsBySeverity: { critical: number; warning: number; info: number };
    violationsByType: Record<string, number>;
  }> {
    const clinicians = await prisma.user.findMany({
      where: { roles: { hasSome: [UserRoles.CLINICIAN] }, isActive: true },
      select: { id: true },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count clinicians with violations
    const cliniciansWithViolations = new Set<string>();

    const alerts = await prisma.complianceAlert.findMany({
      where: {
        alertType: { startsWith: 'GEORGIA_' },
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        targetUserId: true,
        severity: true,
        alertType: true,
      },
    });

    const violationsBySeverity = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    const violationsByType: Record<string, number> = {};

    alerts.forEach((alert) => {
      cliniciansWithViolations.add(alert.targetUserId);

      if (alert.severity === 'CRITICAL') violationsBySeverity.critical++;
      else if (alert.severity === 'WARNING') violationsBySeverity.warning++;
      else violationsBySeverity.info++;

      violationsByType[alert.alertType] = (violationsByType[alert.alertType] || 0) + 1;
    });

    return {
      totalClinicians: clinicians.length,
      compliantClinicians: clinicians.length - cliniciansWithViolations.size,
      violationsBySeverity,
      violationsByType,
    };
  }
}

export const georgiaComplianceService = new GeorgiaComplianceService();
