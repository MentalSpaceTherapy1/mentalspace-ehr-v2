import prisma from './database';
import logger from '../utils/logger';

/**
 * ============================================================================
 * MODULE 9: REPORTS & INTEGRATION SERVICE
 * ============================================================================
 *
 * Comprehensive reporting service for Module 9 subsystems:
 * - Credentialing
 * - Training & Development
 * - Policy Management
 * - Incident Tracking
 * - Performance Management
 * - Attendance Tracking
 * - Financial Management
 * - Vendor Management
 * - Practice Management Dashboard
 * - Audit Trail
 */

// ============================================================================
// 1. CREDENTIALING REPORT
// ============================================================================

export interface CredentialingReportParams {
  startDate?: Date;
  endDate?: Date;
  credentialType?: string;
  verificationStatus?: string;
  userId?: string;
  includeExpiringSoon?: boolean;
  daysUntilExpiration?: number;
}

export async function generateCredentialingReport(params: CredentialingReportParams) {
  try {
    logger.info('Generating credentialing report', { params });

    const {
      startDate,
      endDate,
      credentialType,
      verificationStatus,
      userId,
      includeExpiringSoon = true,
      daysUntilExpiration = 90
    } = params;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntilExpiration);

    // Build where clause
    const where: any = {};

    if (credentialType) where.credentialType = credentialType;
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Get all credentials
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
            department: true,
            jobTitle: true,
            employmentStatus: true
          }
        }
      },
      orderBy: {
        expirationDate: 'asc'
      }
    });

    // Get expiring credentials
    const expiringCredentials = includeExpiringSoon
      ? await prisma.credential.findMany({
          where: {
            expirationDate: {
              gte: now,
              lte: futureDate
            },
            verificationStatus: 'VERIFIED'
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                roles: true
              }
            }
          },
          orderBy: {
            expirationDate: 'asc'
          }
        })
      : [];

    // Get expired credentials
    const expiredCredentials = await prisma.credential.findMany({
      where: {
        expirationDate: {
          lt: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true
          }
        }
      }
    });

    // Get pending verification credentials
    const pendingVerification = await prisma.credential.findMany({
      where: {
        verificationStatus: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Get OIG/SAM screening issues
    const screeningIssues = await prisma.credential.findMany({
      where: {
        screeningStatus: {
          in: ['FLAGGED', 'PENDING', 'ERROR']
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Calculate statistics by credential type
    const credentialsByType = credentials.reduce((acc: any, cred) => {
      const type = cred.credentialType;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          verified: 0,
          pending: 0,
          expired: 0,
          expiringSoon: 0
        };
      }
      acc[type].total++;
      if (cred.verificationStatus === 'VERIFIED') acc[type].verified++;
      if (cred.verificationStatus === 'PENDING') acc[type].pending++;
      if (cred.expirationDate < now) acc[type].expired++;
      if (cred.expirationDate >= now && cred.expirationDate <= futureDate) acc[type].expiringSoon++;
      return acc;
    }, {});

    // Calculate statistics by verification status
    const statusSummary = {
      VERIFIED: credentials.filter(c => c.verificationStatus === 'VERIFIED').length,
      PENDING: credentials.filter(c => c.verificationStatus === 'PENDING').length,
      REJECTED: credentials.filter(c => c.verificationStatus === 'REJECTED').length,
      EXPIRED: credentials.filter(c => c.verificationStatus === 'EXPIRED').length
    };

    // Calculate compliance rate
    const totalActiveCredentials = credentials.filter(c => c.expirationDate >= now).length;
    const verifiedCredentials = credentials.filter(
      c => c.verificationStatus === 'VERIFIED' && c.expirationDate >= now
    ).length;
    const complianceRate = totalActiveCredentials > 0
      ? (verifiedCredentials / totalActiveCredentials) * 100
      : 0;

    return {
      success: true,
      data: {
        summary: {
          totalCredentials: credentials.length,
          activeCredentials: totalActiveCredentials,
          expiredCredentials: expiredCredentials.length,
          expiringCredentials: expiringCredentials.length,
          pendingVerification: pendingVerification.length,
          screeningIssues: screeningIssues.length,
          complianceRate: Math.round(complianceRate * 100) / 100,
          statusSummary,
          credentialsByType
        },
        credentials: credentials.map(c => ({
          id: c.id,
          user: {
            id: c.user.id,
            name: `${c.user.firstName} ${c.user.lastName}`,
            email: c.user.email,
            roles: c.user.roles,
            department: c.user.department,
            jobTitle: c.user.jobTitle,
            employmentStatus: c.user.employmentStatus
          },
          credentialType: c.credentialType,
          credentialNumber: c.credentialNumber,
          issuingAuthority: c.issuingAuthority,
          issuingState: c.issuingState,
          issueDate: c.issueDate,
          expirationDate: c.expirationDate,
          renewalDate: c.renewalDate,
          verificationStatus: c.verificationStatus,
          verificationDate: c.verificationDate,
          screeningStatus: c.screeningStatus,
          lastScreeningDate: c.lastScreeningDate,
          daysUntilExpiration: Math.ceil(
            (c.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          ),
          isExpired: c.expirationDate < now,
          isExpiringSoon: c.expirationDate >= now && c.expirationDate <= futureDate
        })),
        expiringCredentials: expiringCredentials.map(c => ({
          id: c.id,
          user: `${c.user.firstName} ${c.user.lastName}`,
          credentialType: c.credentialType,
          credentialNumber: c.credentialNumber,
          expirationDate: c.expirationDate,
          daysUntilExpiration: Math.ceil(
            (c.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        })),
        expiredCredentials: expiredCredentials.map(c => ({
          id: c.id,
          user: `${c.user.firstName} ${c.user.lastName}`,
          credentialType: c.credentialType,
          credentialNumber: c.credentialNumber,
          expirationDate: c.expirationDate,
          daysExpired: Math.ceil(
            (now.getTime() - c.expirationDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        })),
        pendingVerification: pendingVerification.map(c => ({
          id: c.id,
          user: `${c.user.firstName} ${c.user.lastName}`,
          credentialType: c.credentialType,
          credentialNumber: c.credentialNumber,
          submittedDate: c.createdAt
        })),
        screeningIssues: screeningIssues.map(c => ({
          id: c.id,
          user: `${c.user.firstName} ${c.user.lastName}`,
          credentialType: c.credentialType,
          screeningStatus: c.screeningStatus,
          lastScreeningDate: c.lastScreeningDate,
          screeningNotes: c.screeningNotes
        })),
        period: {
          startDate,
          endDate,
          daysUntilExpiration,
          generatedAt: now
        }
      }
    };
  } catch (error) {
    logger.error('Error generating credentialing report:', error);
    throw error;
  }
}

// ============================================================================
// 2. TRAINING COMPLIANCE REPORT
// ============================================================================

export interface TrainingComplianceReportParams {
  startDate?: Date;
  endDate?: Date;
  trainingType?: string;
  category?: string;
  userId?: string;
  department?: string;
  includeExpired?: boolean;
}

export async function generateTrainingComplianceReport(params: TrainingComplianceReportParams) {
  try {
    logger.info('Generating training compliance report', { params });

    const {
      startDate,
      endDate,
      trainingType,
      category,
      userId,
      department,
      includeExpired = true
    } = params;

    // Build where clause
    const where: any = {};

    if (trainingType) where.trainingType = trainingType;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.completionDate = {};
      if (startDate) where.completionDate.gte = startDate;
      if (endDate) where.completionDate.lte = endDate;
    }

    // Get training records
    const trainingRecords = await prisma.trainingRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
            department: true,
            jobTitle: true,
            employmentStatus: true,
            hireDate: true
          }
        }
      },
      orderBy: {
        completionDate: 'desc'
      }
    });

    // Filter by department if specified
    const filteredRecords = department
      ? trainingRecords.filter(r => r.user.department === department)
      : trainingRecords;

    const now = new Date();

    // Get overdue training
    const overdueTraining = await prisma.trainingRecord.findMany({
      where: {
        status: 'NOT_STARTED',
        dueDate: {
          lt: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Get expired training
    const expiredTraining = includeExpired
      ? await prisma.trainingRecord.findMany({
          where: {
            status: 'EXPIRED'
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true
              }
            }
          }
        })
      : [];

    // Get mandatory training completion
    const mandatoryTraining = await prisma.trainingRecord.findMany({
      where: {
        category: 'MANDATORY'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true
          }
        }
      }
    });

    // Calculate statistics by training type
    const trainingByType = filteredRecords.reduce((acc: any, record) => {
      const type = record.trainingType;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          expired: 0,
          failed: 0,
          averageScore: 0,
          totalScore: 0,
          scoreCount: 0
        };
      }
      acc[type].total++;
      if (record.status === 'COMPLETED') acc[type].completed++;
      if (record.status === 'IN_PROGRESS') acc[type].inProgress++;
      if (record.status === 'NOT_STARTED') acc[type].notStarted++;
      if (record.status === 'EXPIRED') acc[type].expired++;
      if (record.status === 'FAILED') acc[type].failed++;
      if (record.score) {
        acc[type].totalScore += record.score;
        acc[type].scoreCount++;
      }
      return acc;
    }, {});

    // Calculate average scores
    Object.keys(trainingByType).forEach(type => {
      if (trainingByType[type].scoreCount > 0) {
        trainingByType[type].averageScore = Math.round(
          (trainingByType[type].totalScore / trainingByType[type].scoreCount) * 100
        ) / 100;
      }
    });

    // Calculate statistics by department
    const trainingByDepartment = filteredRecords.reduce((acc: any, record) => {
      const dept = record.user.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          total: 0,
          completed: 0,
          completionRate: 0,
          averageScore: 0,
          totalScore: 0,
          scoreCount: 0
        };
      }
      acc[dept].total++;
      if (record.status === 'COMPLETED') acc[dept].completed++;
      if (record.score) {
        acc[dept].totalScore += record.score;
        acc[dept].scoreCount++;
      }
      return acc;
    }, {});

    // Calculate completion rates and average scores by department
    Object.keys(trainingByDepartment).forEach(dept => {
      const deptData = trainingByDepartment[dept];
      deptData.completionRate = deptData.total > 0
        ? Math.round((deptData.completed / deptData.total) * 10000) / 100
        : 0;
      if (deptData.scoreCount > 0) {
        deptData.averageScore = Math.round((deptData.totalScore / deptData.scoreCount) * 100) / 100;
      }
    });

    // Calculate mandatory training compliance
    const totalMandatory = mandatoryTraining.length;
    const completedMandatory = mandatoryTraining.filter(t => t.status === 'COMPLETED').length;
    const mandatoryComplianceRate = totalMandatory > 0
      ? (completedMandatory / totalMandatory) * 100
      : 0;

    // Calculate overall statistics
    const totalCompleted = filteredRecords.filter(r => r.status === 'COMPLETED').length;
    const overallCompletionRate = filteredRecords.length > 0
      ? (totalCompleted / filteredRecords.length) * 100
      : 0;

    const totalCEUEarned = filteredRecords
      .filter(r => r.status === 'COMPLETED' && r.creditsEarned)
      .reduce((sum, r) => sum + Number(r.creditsEarned || 0), 0);

    return {
      success: true,
      data: {
        summary: {
          totalTrainingRecords: filteredRecords.length,
          completedTraining: totalCompleted,
          inProgressTraining: filteredRecords.filter(r => r.status === 'IN_PROGRESS').length,
          notStartedTraining: filteredRecords.filter(r => r.status === 'NOT_STARTED').length,
          expiredTraining: filteredRecords.filter(r => r.status === 'EXPIRED').length,
          overdueTraining: overdueTraining.length,
          overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
          mandatoryComplianceRate: Math.round(mandatoryComplianceRate * 100) / 100,
          totalCEUEarned: Math.round(totalCEUEarned * 100) / 100,
          trainingByType,
          trainingByDepartment
        },
        records: filteredRecords.map(r => ({
          id: r.id,
          user: {
            id: r.user.id,
            name: `${r.user.firstName} ${r.user.lastName}`,
            email: r.user.email,
            department: r.user.department,
            jobTitle: r.user.jobTitle,
            roles: r.user.roles
          },
          trainingType: r.trainingType,
          courseName: r.courseName,
          provider: r.provider,
          category: r.category,
          status: r.status,
          assignedDate: r.assignedDate,
          dueDate: r.dueDate,
          completionDate: r.completionDate,
          expirationDate: r.expirationDate,
          creditsEarned: r.creditsEarned ? Number(r.creditsEarned) : null,
          creditsRequired: r.creditsRequired ? Number(r.creditsRequired) : null,
          score: r.score,
          passingScore: r.passingScore,
          certificateUrl: r.certificateUrl,
          isOverdue: r.dueDate && r.dueDate < now && r.status !== 'COMPLETED',
          isExpired: r.expirationDate && r.expirationDate < now
        })),
        overdueTraining: overdueTraining.map(r => ({
          id: r.id,
          user: `${r.user.firstName} ${r.user.lastName}`,
          department: r.user.department,
          courseName: r.courseName,
          dueDate: r.dueDate,
          daysOverdue: r.dueDate ? Math.ceil((now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
        })),
        expiredTraining: expiredTraining.map(r => ({
          id: r.id,
          user: `${r.user.firstName} ${r.user.lastName}`,
          department: r.user.department,
          courseName: r.courseName,
          expirationDate: r.expirationDate,
          daysExpired: r.expirationDate
            ? Math.ceil((now.getTime() - r.expirationDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0
        })),
        period: {
          startDate,
          endDate,
          generatedAt: now
        }
      }
    };
  } catch (error) {
    logger.error('Error generating training compliance report:', error);
    throw error;
  }
}

// ============================================================================
// 3. POLICY COMPLIANCE REPORT
// ============================================================================

export interface PolicyComplianceReportParams {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  status?: string;
  department?: string;
}

export async function generatePolicyComplianceReport(params: PolicyComplianceReportParams) {
  try {
    logger.info('Generating policy compliance report', { params });

    const { startDate, endDate, category, status, department } = params;

    // Build where clause for policies
    const where: any = { isActive: true };

    if (category) where.category = category;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.effectiveDate = {};
      if (startDate) where.effectiveDate.gte = startDate;
      if (endDate) where.effectiveDate.lte = endDate;
    }

    // Get policies with acknowledgments
    const policies = await prisma.policy.findMany({
      where,
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        acknowledgments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
                roles: true
              }
            }
          }
        }
      },
      orderBy: {
        effectiveDate: 'desc'
      }
    });

    // Get all active users who should acknowledge policies
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(department && { department })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        roles: true
      }
    });

    const now = new Date();

    // Calculate policy compliance statistics
    const policyStats = policies.map(policy => {
      const requiredAcknowledgments = policy.requireAck
        ? activeUsers.filter(user =>
            policy.distributionList.length === 0 || policy.distributionList.includes(user.id)
          ).length
        : 0;

      const receivedAcknowledgments = policy.acknowledgments.length;
      const complianceRate = requiredAcknowledgments > 0
        ? (receivedAcknowledgments / requiredAcknowledgments) * 100
        : 100;

      const pendingUsers = policy.requireAck
        ? activeUsers
            .filter(user =>
              (policy.distributionList.length === 0 || policy.distributionList.includes(user.id)) &&
              !policy.acknowledgments.some(ack => ack.userId === user.id)
            )
            .map(u => ({
              id: u.id,
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              department: u.department
            }))
        : [];

      const needsReview = policy.nextReviewDate && policy.nextReviewDate < now;

      return {
        id: policy.id,
        policyName: policy.policyName,
        policyNumber: policy.policyNumber,
        category: policy.category,
        version: policy.version,
        status: policy.status,
        effectiveDate: policy.effectiveDate,
        reviewDate: policy.reviewDate,
        nextReviewDate: policy.nextReviewDate,
        needsReview,
        owner: `${policy.owner.firstName} ${policy.owner.lastName}`,
        approvedBy: policy.approvedBy
          ? `${policy.approvedBy.firstName} ${policy.approvedBy.lastName}`
          : null,
        approvalDate: policy.approvalDate,
        requireAck: policy.requireAck,
        requiredAcknowledgments,
        receivedAcknowledgments,
        complianceRate: Math.round(complianceRate * 100) / 100,
        pendingUsers
      };
    });

    // Calculate statistics by category
    const policiesByCategory = policies.reduce((acc: any, policy) => {
      const cat = policy.category;
      if (!acc[cat]) {
        acc[cat] = {
          total: 0,
          active: 0,
          draft: 0,
          archived: 0,
          needingReview: 0
        };
      }
      acc[cat].total++;
      if (policy.status === 'ACTIVE') acc[cat].active++;
      if (policy.status === 'DRAFT') acc[cat].draft++;
      if (policy.status === 'ARCHIVED') acc[cat].archived++;
      if (policy.nextReviewDate && policy.nextReviewDate < now) acc[cat].needingReview++;
      return acc;
    }, {});

    // Calculate overall compliance
    const totalRequiringAck = policies.filter(p => p.requireAck).length;
    const totalAcknowledgments = policies.reduce((sum, p) => sum + p.acknowledgments.length, 0);
    const totalRequired = policies
      .filter(p => p.requireAck)
      .reduce((sum, p) => {
        const required = p.distributionList.length || activeUsers.length;
        return sum + required;
      }, 0);

    const overallComplianceRate = totalRequired > 0
      ? (totalAcknowledgments / totalRequired) * 100
      : 100;

    return {
      success: true,
      data: {
        summary: {
          totalPolicies: policies.length,
          activePolicies: policies.filter(p => p.status === 'ACTIVE').length,
          draftPolicies: policies.filter(p => p.status === 'DRAFT').length,
          archivedPolicies: policies.filter(p => p.status === 'ARCHIVED').length,
          policiesNeedingReview: policies.filter(
            p => p.nextReviewDate && p.nextReviewDate < now
          ).length,
          policiesRequiringAck: totalRequiringAck,
          overallComplianceRate: Math.round(overallComplianceRate * 100) / 100,
          totalAcknowledgments,
          totalRequired,
          policiesByCategory
        },
        policies: policyStats,
        period: {
          startDate,
          endDate,
          generatedAt: now
        }
      }
    };
  } catch (error) {
    logger.error('Error generating policy compliance report:', error);
    throw error;
  }
}

// ============================================================================
// 4. INCIDENT ANALYSIS REPORT
// ============================================================================

export interface IncidentAnalysisReportParams {
  startDate?: Date;
  endDate?: Date;
  incidentType?: string;
  severity?: string;
  investigationStatus?: string;
  department?: string;
}

export async function generateIncidentAnalysisReport(params: IncidentAnalysisReportParams) {
  try {
    logger.info('Generating incident analysis report', { params });

    const { startDate, endDate, incidentType, severity, investigationStatus, department } = params;

    // Build where clause
    const where: any = {};

    if (incidentType) where.incidentType = incidentType;
    if (severity) where.severity = severity;
    if (investigationStatus) where.investigationStatus = investigationStatus;

    if (startDate || endDate) {
      where.incidentDate = {};
      if (startDate) where.incidentDate.gte = startDate;
      if (endDate) where.incidentDate.lte = endDate;
    }

    // Get incidents
    const incidents = await prisma.incident.findMany({
      where,
      include: {
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        incidentDate: 'desc'
      }
    });

    // Filter by department if specified
    const filteredIncidents = department
      ? incidents.filter(i => i.reportedBy.department === department)
      : incidents;

    const now = new Date();

    // Calculate statistics by incident type
    const incidentsByType = filteredIncidents.reduce((acc: any, incident) => {
      const type = incident.incidentType;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          resolved: 0,
          pending: 0,
          averageResolutionDays: 0,
          totalResolutionDays: 0,
          resolvedCount: 0
        };
      }
      acc[type].total++;
      if (incident.severity === 'CRITICAL') acc[type].critical++;
      if (incident.severity === 'HIGH') acc[type].high++;
      if (incident.severity === 'MEDIUM') acc[type].medium++;
      if (incident.severity === 'LOW') acc[type].low++;
      if (incident.investigationStatus === 'RESOLVED' || incident.investigationStatus === 'CLOSED') {
        acc[type].resolved++;
        if (incident.resolutionDate) {
          const resolutionDays = Math.ceil(
            (incident.resolutionDate.getTime() - incident.incidentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          acc[type].totalResolutionDays += resolutionDays;
          acc[type].resolvedCount++;
        }
      }
      if (incident.investigationStatus === 'PENDING' || incident.investigationStatus === 'IN_PROGRESS') {
        acc[type].pending++;
      }
      return acc;
    }, {});

    // Calculate average resolution times
    Object.keys(incidentsByType).forEach(type => {
      if (incidentsByType[type].resolvedCount > 0) {
        incidentsByType[type].averageResolutionDays = Math.round(
          (incidentsByType[type].totalResolutionDays / incidentsByType[type].resolvedCount) * 100
        ) / 100;
      }
    });

    // Calculate statistics by severity
    const incidentsBySeverity = {
      CRITICAL: filteredIncidents.filter(i => i.severity === 'CRITICAL').length,
      HIGH: filteredIncidents.filter(i => i.severity === 'HIGH').length,
      MEDIUM: filteredIncidents.filter(i => i.severity === 'MEDIUM').length,
      LOW: filteredIncidents.filter(i => i.severity === 'LOW').length
    };

    // Calculate statistics by status
    const incidentsByStatus = {
      PENDING: filteredIncidents.filter(i => i.investigationStatus === 'PENDING').length,
      IN_PROGRESS: filteredIncidents.filter(i => i.investigationStatus === 'IN_PROGRESS').length,
      UNDER_REVIEW: filteredIncidents.filter(i => i.investigationStatus === 'UNDER_REVIEW').length,
      RESOLVED: filteredIncidents.filter(i => i.investigationStatus === 'RESOLVED').length,
      CLOSED: filteredIncidents.filter(i => i.investigationStatus === 'CLOSED').length
    };

    // Get trends (monthly)
    const monthlyTrends: any = {};
    filteredIncidents.forEach(incident => {
      const monthKey = `${incident.incidentDate.getFullYear()}-${String(incident.incidentDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { total: 0, critical: 0, resolved: 0 };
      }
      monthlyTrends[monthKey].total++;
      if (incident.severity === 'CRITICAL') monthlyTrends[monthKey].critical++;
      if (incident.investigationStatus === 'RESOLVED' || incident.investigationStatus === 'CLOSED') {
        monthlyTrends[monthKey].resolved++;
      }
    });

    // Calculate average resolution time overall
    const resolvedIncidents = filteredIncidents.filter(
      i => (i.investigationStatus === 'RESOLVED' || i.investigationStatus === 'CLOSED') && i.resolutionDate
    );
    const totalResolutionTime = resolvedIncidents.reduce((sum, i) => {
      return sum + (i.resolutionDate!.getTime() - i.incidentDate.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    const averageResolutionTime = resolvedIncidents.length > 0
      ? totalResolutionTime / resolvedIncidents.length
      : 0;

    return {
      success: true,
      data: {
        summary: {
          totalIncidents: filteredIncidents.length,
          criticalIncidents: incidentsBySeverity.CRITICAL,
          highSeverityIncidents: incidentsBySeverity.HIGH,
          resolvedIncidents: incidentsByStatus.RESOLVED + incidentsByStatus.CLOSED,
          pendingIncidents: incidentsByStatus.PENDING,
          inProgressIncidents: incidentsByStatus.IN_PROGRESS,
          averageResolutionDays: Math.round(averageResolutionTime * 100) / 100,
          incidentsByType,
          incidentsBySeverity,
          incidentsByStatus,
          monthlyTrends
        },
        incidents: filteredIncidents.map(i => ({
          id: i.id,
          incidentNumber: i.incidentNumber,
          incidentDate: i.incidentDate,
          incidentTime: i.incidentTime,
          incidentType: i.incidentType,
          severity: i.severity,
          location: i.location,
          reportedBy: {
            id: i.reportedBy.id,
            name: `${i.reportedBy.firstName} ${i.reportedBy.lastName}`,
            department: i.reportedBy.department
          },
          description: i.description,
          investigationStatus: i.investigationStatus,
          assignedTo: i.assignedTo
            ? {
                id: i.assignedTo.id,
                name: `${i.assignedTo.firstName} ${i.assignedTo.lastName}`
              }
            : null,
          rootCause: i.rootCause,
          correctiveActions: i.correctiveActions,
          preventiveActions: i.preventiveActions,
          followUpDate: i.followUpDate,
          resolutionDate: i.resolutionDate,
          resolutionDays: i.resolutionDate
            ? Math.ceil((i.resolutionDate.getTime() - i.incidentDate.getTime()) / (1000 * 60 * 60 * 24))
            : null,
          createdAt: i.createdAt
        })),
        period: {
          startDate,
          endDate,
          generatedAt: now
        }
      }
    };
  } catch (error) {
    logger.error('Error generating incident analysis report:', error);
    throw error;
  }
}

// ============================================================================
// 5. PERFORMANCE REPORT
// ============================================================================

export interface PerformanceReportParams {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  department?: string;
  metricType?: string;
}

export async function generatePerformanceReport(params: PerformanceReportParams) {
  try {
    logger.info('Generating performance report', { params });

    const { startDate, endDate, userId, department, metricType } = params;

    const start = startDate || new Date(new Date().getFullYear(), 0, 1);
    const end = endDate || new Date();

    // Build where clause
    const where: any = {
      periodStart: { gte: start },
      periodEnd: { lte: end }
    };

    if (userId) where.userId = userId;
    if (metricType) where.metricType = metricType;

    // Get productivity metrics
    const productivityMetrics = await prisma.productivityMetric.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
            department: true,
            jobTitle: true
          }
        }
      },
      orderBy: {
        periodStart: 'desc'
      }
    });

    // Filter by department if specified
    const filteredMetrics = department
      ? productivityMetrics.filter(m => m.user.department === department)
      : productivityMetrics;

    // Get performance goals
    const performanceGoals = await prisma.performanceGoal.findMany({
      where: {
        ...(userId && { userId }),
        targetDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true
          }
        }
      }
    });

    // Get compliance alerts
    const complianceAlerts = await prisma.complianceAlert.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        ...(userId && { targetUserId: userId })
      },
      include: {
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true
          }
        }
      }
    });

    // Calculate statistics by user
    const userPerformance = filteredMetrics.reduce((acc: any, metric) => {
      const userKey = metric.userId;
      if (!acc[userKey]) {
        acc[userKey] = {
          user: {
            id: metric.user.id,
            name: `${metric.user.firstName} ${metric.user.lastName}`,
            department: metric.user.department,
            jobTitle: metric.user.jobTitle,
            roles: metric.user.roles
          },
          totalSessions: 0,
          totalRevenue: 0,
          totalHours: 0,
          averageProductivity: 0,
          productivityCount: 0,
          complianceScore: 100,
          alerts: 0,
          goalsCompleted: 0,
          goalsTotal: 0
        };
      }

      acc[userKey].totalSessions += metric.sessionCount || 0;
      acc[userKey].totalRevenue += Number(metric.revenueGenerated || 0);
      acc[userKey].totalHours += Number(metric.hoursWorked || 0);

      if (metric.productivityScore) {
        acc[userKey].averageProductivity += Number(metric.productivityScore);
        acc[userKey].productivityCount++;
      }

      return acc;
    }, {});

    // Calculate averages and add goals/alerts
    Object.keys(userPerformance).forEach(userKey => {
      const userData = userPerformance[userKey];

      // Calculate average productivity score
      if (userData.productivityCount > 0) {
        userData.averageProductivity = Math.round(
          (userData.averageProductivity / userData.productivityCount) * 100
        ) / 100;
      }

      // Add goals
      const userGoals = performanceGoals.filter(g => g.userId === userKey);
      userData.goalsTotal = userGoals.length;
      userData.goalsCompleted = userGoals.filter(g => g.status === 'ACHIEVED').length;
      userData.goalsCompletionRate = userData.goalsTotal > 0
        ? Math.round((userData.goalsCompleted / userData.goalsTotal) * 10000) / 100
        : 0;

      // Add compliance alerts
      const userAlerts = complianceAlerts.filter(a => a.targetUserId === userKey);
      userData.alerts = userAlerts.length;

      // Calculate compliance score (deduct points for alerts)
      userData.complianceScore = Math.max(0, 100 - (userAlerts.length * 5));
    });

    // Calculate statistics by department
    const departmentPerformance = Object.values(userPerformance).reduce((acc: any, userData: any) => {
      const dept = userData.user.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          totalSessions: 0,
          totalRevenue: 0,
          totalHours: 0,
          averageProductivity: 0,
          productivitySum: 0,
          userCount: 0,
          averageComplianceScore: 0,
          complianceSum: 0
        };
      }

      acc[dept].totalSessions += userData.totalSessions;
      acc[dept].totalRevenue += userData.totalRevenue;
      acc[dept].totalHours += userData.totalHours;
      acc[dept].productivitySum += userData.averageProductivity;
      acc[dept].complianceSum += userData.complianceScore;
      acc[dept].userCount++;

      return acc;
    }, {});

    // Calculate department averages
    Object.keys(departmentPerformance).forEach(dept => {
      const deptData = departmentPerformance[dept];
      if (deptData.userCount > 0) {
        deptData.averageProductivity = Math.round((deptData.productivitySum / deptData.userCount) * 100) / 100;
        deptData.averageComplianceScore = Math.round((deptData.complianceSum / deptData.userCount) * 100) / 100;
      }
    });

    // Calculate overall statistics
    const totalUsers = Object.keys(userPerformance).length;
    const totalSessions = Object.values(userPerformance).reduce((sum: number, u: any) => sum + u.totalSessions, 0);
    const totalRevenue = Object.values(userPerformance).reduce((sum: number, u: any) => sum + u.totalRevenue, 0);
    const averageSessionsPerUser = totalUsers > 0 ? totalSessions / totalUsers : 0;

    return {
      success: true,
      data: {
        summary: {
          totalUsers,
          totalSessions,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageSessionsPerUser: Math.round(averageSessionsPerUser * 100) / 100,
          totalGoals: performanceGoals.length,
          completedGoals: performanceGoals.filter(g => g.status === 'ACHIEVED').length,
          totalAlerts: complianceAlerts.length,
          departmentPerformance
        },
        userPerformance: Object.values(userPerformance),
        goals: performanceGoals.map(g => ({
          id: g.id,
          user: `${g.user.firstName} ${g.user.lastName}`,
          department: g.user.department,
          goalDescription: g.goalDescription,
          metricType: g.metricType,
          targetValue: Number(g.targetValue),
          currentValue: g.currentValue ? Number(g.currentValue) : 0,
          targetDate: g.targetDate,
          status: g.status,
          progressPercentage: g.currentValue && g.targetValue
            ? Math.min(100, Math.round((Number(g.currentValue) / Number(g.targetValue)) * 100))
            : 0
        })),
        alerts: complianceAlerts.map(a => ({
          id: a.id,
          user: `${a.targetUser.firstName} ${a.targetUser.lastName}`,
          department: a.targetUser.department,
          alertType: a.alertType,
          severity: a.severity,
          message: a.message,
          createdAt: a.createdAt,
          resolvedAt: a.resolvedAt,
          isResolved: !!a.resolvedAt
        })),
        period: {
          startDate: start,
          endDate: end,
          generatedAt: new Date()
        }
      }
    };
  } catch (error) {
    logger.error('Error generating performance report:', error);
    throw error;
  }
}

// ============================================================================
// 6. ATTENDANCE REPORT
// ============================================================================

export interface AttendanceReportParams {
  startDate?: Date;
  endDate?: Date;
  groupId?: string;
  clientId?: string;
}

export async function generateAttendanceReport(params: AttendanceReportParams) {
  try {
    logger.info('Generating attendance report', { params });

    const { startDate, endDate, groupId, clientId } = params;

    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();

    // Build where clause
    const where: any = {
      sessionDate: {
        gte: start,
        lte: end
      }
    };

    if (groupId) where.groupId = groupId;
    if (clientId) where.clientId = clientId;

    // Get attendance records
    const attendanceRecords = await prisma.groupAttendance.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            groupName: true,
            groupType: true,
            maxCapacity: true
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      }
    });

    // Calculate statistics by group
    const attendanceByGroup = attendanceRecords.reduce((acc: any, record) => {
      const groupId = record.groupId;
      if (!acc[groupId]) {
        acc[groupId] = {
          group: {
            id: record.group.id,
            name: record.group.groupName,
            type: record.group.groupType,
            maxCapacity: record.group.maxCapacity
          },
          totalSessions: 0,
          totalAttended: 0,
          totalAbsent: 0,
          totalExcused: 0,
          totalLate: 0,
          uniqueClients: new Set(),
          attendanceRate: 0
        };
      }

      acc[groupId].totalSessions++;
      if (record.attendanceStatus === 'PRESENT') acc[groupId].totalAttended++;
      if (record.attendanceStatus === 'ABSENT') acc[groupId].totalAbsent++;
      if (record.attendanceStatus === 'EXCUSED') acc[groupId].totalExcused++;
      if (record.arrivedLate) acc[groupId].totalLate++;
      acc[groupId].uniqueClients.add(record.clientId);

      return acc;
    }, {});

    // Calculate attendance rates
    Object.keys(attendanceByGroup).forEach(groupId => {
      const groupData = attendanceByGroup[groupId];
      groupData.uniqueClients = groupData.uniqueClients.size;
      groupData.attendanceRate = groupData.totalSessions > 0
        ? Math.round((groupData.totalAttended / groupData.totalSessions) * 10000) / 100
        : 0;
    });

    // Calculate statistics by client
    const attendanceByClient = attendanceRecords.reduce((acc: any, record) => {
      const clientId = record.clientId;
      if (!acc[clientId]) {
        acc[clientId] = {
          client: {
            id: record.client.id,
            name: `${record.client.firstName} ${record.client.lastName}`,
            dateOfBirth: record.client.dateOfBirth
          },
          totalSessions: 0,
          attended: 0,
          absent: 0,
          excused: 0,
          late: 0,
          attendanceRate: 0
        };
      }

      acc[clientId].totalSessions++;
      if (record.attendanceStatus === 'PRESENT') acc[clientId].attended++;
      if (record.attendanceStatus === 'ABSENT') acc[clientId].absent++;
      if (record.attendanceStatus === 'EXCUSED') acc[clientId].excused++;
      if (record.arrivedLate) acc[clientId].late++;

      return acc;
    }, {});

    // Calculate client attendance rates
    Object.keys(attendanceByClient).forEach(clientId => {
      const clientData = attendanceByClient[clientId];
      clientData.attendanceRate = clientData.totalSessions > 0
        ? Math.round((clientData.attended / clientData.totalSessions) * 10000) / 100
        : 0;
    });

    // Calculate overall statistics
    const totalSessions = attendanceRecords.length;
    const totalAttended = attendanceRecords.filter(r => r.attendanceStatus === 'PRESENT').length;
    const overallAttendanceRate = totalSessions > 0
      ? (totalAttended / totalSessions) * 100
      : 0;

    return {
      success: true,
      data: {
        summary: {
          totalSessions,
          totalAttended,
          totalAbsent: attendanceRecords.filter(r => r.attendanceStatus === 'ABSENT').length,
          totalExcused: attendanceRecords.filter(r => r.attendanceStatus === 'EXCUSED').length,
          totalLate: attendanceRecords.filter(r => r.arrivedLate).length,
          overallAttendanceRate: Math.round(overallAttendanceRate * 100) / 100,
          uniqueGroups: Object.keys(attendanceByGroup).length,
          uniqueClients: Object.keys(attendanceByClient).length,
          attendanceByGroup: Object.values(attendanceByGroup),
          attendanceByClient: Object.values(attendanceByClient)
        },
        records: attendanceRecords.map(r => ({
          id: r.id,
          sessionDate: r.sessionDate,
          group: {
            id: r.group.id,
            name: r.group.groupName,
            type: r.group.groupType
          },
          client: {
            id: r.client.id,
            name: `${r.client.firstName} ${r.client.lastName}`
          },
          attendanceStatus: r.attendanceStatus,
          arrivedLate: r.arrivedLate,
          minutesLate: r.minutesLate,
          leftEarly: r.leftEarly,
          minutesEarly: r.minutesEarly,
          notes: r.notes
        })),
        period: {
          startDate: start,
          endDate: end,
          generatedAt: new Date()
        }
      }
    };
  } catch (error) {
    logger.error('Error generating attendance report:', error);
    throw error;
  }
}

// ============================================================================
// 7. FINANCIAL REPORT
// ============================================================================

export interface FinancialReportParams {
  startDate?: Date;
  endDate?: Date;
  department?: string;
  category?: string;
}

export async function generateFinancialReport(params: FinancialReportParams) {
  try {
    logger.info('Generating financial report', { params });

    const { startDate, endDate, department, category } = params;

    const start = startDate || new Date(new Date().getFullYear(), 0, 1);
    const end = endDate || new Date();

    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
        ...(department && { department }),
        ...(category && { category })
      },
      orderBy: {
        fiscalYear: 'desc'
      }
    });

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: start,
          lte: end
        },
        ...(department && { department }),
        ...(category && { category })
      },
      include: {
        vendor: {
          select: {
            companyName: true,
            category: true
          }
        }
      }
    });

    // Calculate statistics by category
    const budgetByCategory = budgets.reduce((acc: any, budget) => {
      const cat = budget.category;
      if (!acc[cat]) {
        acc[cat] = {
          allocated: 0,
          spent: 0,
          committed: 0,
          remaining: 0,
          utilizationRate: 0
        };
      }

      acc[cat].allocated += Number(budget.allocatedAmount);
      acc[cat].spent += Number(budget.spentAmount);
      acc[cat].committed += Number(budget.committedAmount);
      acc[cat].remaining += Number(budget.remainingAmount);

      return acc;
    }, {});

    // Calculate utilization rates
    Object.keys(budgetByCategory).forEach(cat => {
      const catData = budgetByCategory[cat];
      catData.utilizationRate = catData.allocated > 0
        ? Math.round(((catData.spent + catData.committed) / catData.allocated) * 10000) / 100
        : 0;
    });

    // Calculate expense statistics by category
    const expensesByCategory = expenses.reduce((acc: any, expense) => {
      const cat = expense.category;
      if (!acc[cat]) {
        acc[cat] = {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          count: 0
        };
      }

      acc[cat].total += Number(expense.amount);
      acc[cat].count++;
      if (expense.approvalStatus === 'APPROVED') acc[cat].approved += Number(expense.amount);
      if (expense.approvalStatus === 'PENDING') acc[cat].pending += Number(expense.amount);
      if (expense.approvalStatus === 'REJECTED') acc[cat].rejected += Number(expense.amount);

      return acc;
    }, {});

    // Get purchase orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        orderDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        vendor: {
          select: {
            companyName: true,
            category: true
          }
        }
      }
    });

    // Calculate PO statistics
    const poStats = {
      total: purchaseOrders.length,
      totalValue: purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
      pending: purchaseOrders.filter(po => po.status === 'PENDING').length,
      approved: purchaseOrders.filter(po => po.status === 'APPROVED').length,
      fulfilled: purchaseOrders.filter(po => po.status === 'FULFILLED').length,
      cancelled: purchaseOrders.filter(po => po.status === 'CANCELLED').length
    };

    // Calculate overall statistics
    const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocatedAmount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount), 0);
    const totalCommitted = budgets.reduce((sum, b) => sum + Number(b.committedAmount), 0);
    const totalRemaining = budgets.reduce((sum, b) => sum + Number(b.remainingAmount), 0);
    const overallUtilization = totalAllocated > 0
      ? ((totalSpent + totalCommitted) / totalAllocated) * 100
      : 0;

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      success: true,
      data: {
        summary: {
          totalAllocated: Math.round(totalAllocated * 100) / 100,
          totalSpent: Math.round(totalSpent * 100) / 100,
          totalCommitted: Math.round(totalCommitted * 100) / 100,
          totalRemaining: Math.round(totalRemaining * 100) / 100,
          overallUtilization: Math.round(overallUtilization * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          budgetByCategory,
          expensesByCategory,
          purchaseOrders: poStats
        },
        budgets: budgets.map(b => ({
          id: b.id,
          name: b.name,
          fiscalYear: b.fiscalYear,
          department: b.department,
          category: b.category,
          allocatedAmount: Number(b.allocatedAmount),
          spentAmount: Number(b.spentAmount),
          committedAmount: Number(b.committedAmount),
          remainingAmount: Number(b.remainingAmount),
          utilizationRate: Number(b.allocatedAmount) > 0
            ? Math.round(((Number(b.spentAmount) + Number(b.committedAmount)) / Number(b.allocatedAmount)) * 10000) / 100
            : 0,
          startDate: b.startDate,
          endDate: b.endDate
        })),
        expenses: expenses.map(e => ({
          id: e.id,
          expenseDate: e.expenseDate,
          amount: Number(e.amount),
          category: e.category,
          description: e.description,
          vendor: e.vendor ? e.vendor.companyName : null,
          department: e.department,
          approvalStatus: e.approvalStatus,
          paymentStatus: e.paymentStatus
        })),
        period: {
          startDate: start,
          endDate: end,
          generatedAt: new Date()
        }
      }
    };
  } catch (error) {
    logger.error('Error generating financial report:', error);
    throw error;
  }
}

// ============================================================================
// 8. VENDOR REPORT
// ============================================================================

export interface VendorReportParams {
  category?: string;
  isActive?: boolean;
  includePerformance?: boolean;
}

export async function generateVendorReport(params: VendorReportParams) {
  try {
    logger.info('Generating vendor report', { params });

    const { category, isActive, includePerformance = true } = params;

    // Build where clause
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    // Get vendors
    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        expenses: {
          select: {
            amount: true,
            expenseDate: true,
            approvalStatus: true
          }
        },
        purchaseOrders: {
          select: {
            totalAmount: true,
            orderDate: true,
            status: true
          }
        }
      },
      orderBy: {
        companyName: 'asc'
      }
    });

    const now = new Date();

    // Calculate vendor statistics
    const vendorStats = vendors.map(vendor => {
      const totalExpenses = vendor.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const approvedExpenses = vendor.expenses
        .filter(e => e.approvalStatus === 'APPROVED')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalPOValue = vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
      const fulfilledPOs = vendor.purchaseOrders.filter(po => po.status === 'FULFILLED').length;

      const contractExpiring = vendor.contractEnd && vendor.contractEnd < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const insuranceExpiring = vendor.insuranceExpiration && vendor.insuranceExpiration < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      return {
        id: vendor.id,
        companyName: vendor.companyName,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
        category: vendor.category,
        servicesProvided: vendor.servicesProvided,
        contractStart: vendor.contractStart,
        contractEnd: vendor.contractEnd,
        contractValue: vendor.contractValue ? Number(vendor.contractValue) : null,
        contractExpiring,
        daysUntilContractExpires: vendor.contractEnd
          ? Math.ceil((vendor.contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
        insuranceExpiration: vendor.insuranceExpiration,
        insuranceExpiring,
        performanceScore: vendor.performanceScore,
        isActive: vendor.isActive,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        approvedExpenses: Math.round(approvedExpenses * 100) / 100,
        totalPurchaseOrders: vendor.purchaseOrders.length,
        fulfilledPurchaseOrders: fulfilledPOs,
        totalPOValue: Math.round(totalPOValue * 100) / 100,
        notes: vendor.notes
      };
    });

    // Calculate statistics by category
    const vendorsByCategory = vendors.reduce((acc: any, vendor) => {
      const cat = vendor.category;
      if (!acc[cat]) {
        acc[cat] = {
          total: 0,
          active: 0,
          inactive: 0,
          totalSpend: 0,
          averagePerformance: 0,
          performanceSum: 0,
          performanceCount: 0
        };
      }

      acc[cat].total++;
      if (vendor.isActive) acc[cat].active++;
      else acc[cat].inactive++;

      const vendorExpenses = vendor.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      acc[cat].totalSpend += vendorExpenses;

      if (vendor.performanceScore) {
        acc[cat].performanceSum += vendor.performanceScore;
        acc[cat].performanceCount++;
      }

      return acc;
    }, {});

    // Calculate averages
    Object.keys(vendorsByCategory).forEach(cat => {
      const catData = vendorsByCategory[cat];
      if (catData.performanceCount > 0) {
        catData.averagePerformance = Math.round((catData.performanceSum / catData.performanceCount) * 100) / 100;
      }
      catData.totalSpend = Math.round(catData.totalSpend * 100) / 100;
    });

    // Get vendors with expiring contracts
    const expiringContracts = vendorStats.filter(v => v.contractExpiring);

    // Get vendors with expiring insurance
    const expiringInsurance = vendorStats.filter(v => v.insuranceExpiring);

    return {
      success: true,
      data: {
        summary: {
          totalVendors: vendors.length,
          activeVendors: vendors.filter(v => v.isActive).length,
          inactiveVendors: vendors.filter(v => !v.isActive).length,
          expiringContracts: expiringContracts.length,
          expiringInsurance: expiringInsurance.length,
          vendorsByCategory
        },
        vendors: vendorStats,
        expiringContracts,
        expiringInsurance,
        generatedAt: new Date()
      }
    };
  } catch (error) {
    logger.error('Error generating vendor report:', error);
    throw error;
  }
}

// ============================================================================
// 9. PRACTICE MANAGEMENT DASHBOARD
// ============================================================================

export interface PracticeManagementDashboardParams {
  startDate?: Date;
  endDate?: Date;
}

export async function generatePracticeManagementDashboard(params: PracticeManagementDashboardParams) {
  try {
    logger.info('Generating practice management dashboard', { params });

    const { startDate, endDate } = params;

    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();

    // Get key metrics from various subsystems
    const [
      activeStaff,
      activeClients,
      appointments,
      credentials,
      trainingRecords,
      policies,
      incidents,
      budgets,
      expenses
    ] = await Promise.all([
      // Active staff
      prisma.user.count({
        where: {
          isActive: true,
          employmentStatus: 'ACTIVE'
        }
      }),

      // Active clients
      prisma.client.count({
        where: {
          isActive: true
        }
      }),

      // Appointments in period
      prisma.appointment.findMany({
        where: {
          appointmentDateTime: {
            gte: start,
            lte: end
          }
        },
        select: {
          status: true,
          appointmentDateTime: true
        }
      }),

      // Credentials needing attention
      prisma.credential.findMany({
        where: {
          OR: [
            { verificationStatus: 'PENDING' },
            { screeningStatus: { in: ['FLAGGED', 'PENDING'] } },
            {
              expirationDate: {
                lte: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        }
      }),

      // Training compliance
      prisma.trainingRecord.findMany({
        where: {
          category: 'MANDATORY',
          status: { not: 'COMPLETED' }
        }
      }),

      // Policies needing review
      prisma.policy.findMany({
        where: {
          nextReviewDate: {
            lte: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
          },
          isActive: true
        }
      }),

      // Open incidents
      prisma.incident.findMany({
        where: {
          investigationStatus: {
            in: ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW']
          }
        }
      }),

      // Budget utilization
      prisma.budget.findMany({
        where: {
          startDate: { lte: end },
          endDate: { gte: start }
        }
      }),

      // Recent expenses
      prisma.expense.findMany({
        where: {
          expenseDate: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    // Calculate appointment statistics
    const appointmentStats = {
      total: appointments.length,
      completed: appointments.filter(a => a.status === 'COMPLETED').length,
      scheduled: appointments.filter(a => a.status === 'SCHEDULED').length,
      cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
      noShow: appointments.filter(a => a.status === 'NO_SHOW').length
    };

    // Calculate compliance metrics
    const credentialCompliance = {
      total: credentials.length,
      pendingVerification: credentials.filter(c => c.verificationStatus === 'PENDING').length,
      expiringWithin90Days: credentials.filter(c =>
        c.expirationDate <= new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
      ).length,
      screeningIssues: credentials.filter(c =>
        ['FLAGGED', 'PENDING'].includes(c.screeningStatus)
      ).length
    };

    const trainingCompliance = {
      totalMandatory: trainingRecords.length,
      overdue: trainingRecords.filter(t => t.status === 'NOT_STARTED' && t.dueDate && t.dueDate < new Date()).length,
      inProgress: trainingRecords.filter(t => t.status === 'IN_PROGRESS').length
    };

    // Calculate financial metrics
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.allocatedAmount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount), 0);
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const pendingExpenses = expenses.filter(e => e.approvalStatus === 'PENDING').length;

    // Categorize incidents by severity
    const incidentsBySeverity = {
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      medium: incidents.filter(i => i.severity === 'MEDIUM').length,
      low: incidents.filter(i => i.severity === 'LOW').length
    };

    return {
      success: true,
      data: {
        overview: {
          activeStaff,
          activeClients,
          appointments: appointmentStats,
          period: {
            startDate: start,
            endDate: end
          }
        },
        compliance: {
          credentials: credentialCompliance,
          training: trainingCompliance,
          policiesNeedingReview: policies.length
        },
        incidents: {
          openIncidents: incidents.length,
          bySeverity: incidentsBySeverity
        },
        financial: {
          totalBudget: Math.round(totalBudget * 100) / 100,
          totalSpent: Math.round(totalSpent * 100) / 100,
          budgetUtilization: Math.round(budgetUtilization * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          pendingExpenses
        },
        alerts: {
          credentialsExpiringSoon: credentialCompliance.expiringWithin90Days,
          overdueTraining: trainingCompliance.overdue,
          policiesNeedingReview: policies.length,
          criticalIncidents: incidentsBySeverity.critical,
          screeningIssues: credentialCompliance.screeningIssues
        },
        generatedAt: new Date()
      }
    };
  } catch (error) {
    logger.error('Error generating practice management dashboard:', error);
    throw error;
  }
}

// ============================================================================
// 10. AUDIT TRAIL REPORT
// ============================================================================

export interface AuditTrailReportParams {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  entityType?: string;
  action?: string;
  ipAddress?: string;
}

export async function generateAuditTrailReport(params: AuditTrailReportParams) {
  try {
    logger.info('Generating audit trail report', { params });

    const { startDate, endDate, userId, entityType, action, ipAddress } = params;

    const start = startDate || new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Build where clause
    const where: any = {
      timestamp: {
        gte: start,
        lte: end
      }
    };

    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (ipAddress) where.ipAddress = ipAddress;

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10000 // Limit to prevent overwhelming results
    });

    // Calculate statistics by action
    const actionStats = auditLogs.reduce((acc: any, log) => {
      const act = log.action;
      if (!acc[act]) {
        acc[act] = 0;
      }
      acc[act]++;
      return acc;
    }, {});

    // Calculate statistics by entity type
    const entityStats = auditLogs.reduce((acc: any, log) => {
      const entity = log.entityType;
      if (!acc[entity]) {
        acc[entity] = 0;
      }
      acc[entity]++;
      return acc;
    }, {});

    // Calculate statistics by user
    const userStats = auditLogs.reduce((acc: any, log) => {
      const userId = log.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: log.user
            ? `${log.user.firstName} ${log.user.lastName}`
            : 'System',
          actions: 0,
          creates: 0,
          updates: 0,
          deletes: 0
        };
      }
      acc[userId].actions++;
      if (log.action === 'CREATE') acc[userId].creates++;
      if (log.action === 'UPDATE') acc[userId].updates++;
      if (log.action === 'DELETE') acc[userId].deletes++;
      return acc;
    }, {});

    // Get suspicious activity (multiple failed attempts, unusual access patterns)
    const suspiciousActivity = auditLogs.filter(log =>
      log.action.includes('FAILED') || log.action.includes('DENIED')
    );

    return {
      success: true,
      data: {
        summary: {
          totalLogs: auditLogs.length,
          uniqueUsers: Object.keys(userStats).length,
          actionStats,
          entityStats,
          suspiciousActivity: suspiciousActivity.length
        },
        logs: auditLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          user: log.user
            ? {
                id: log.user.id,
                name: `${log.user.firstName} ${log.user.lastName}`,
                email: log.user.email,
                roles: log.user.roles
              }
            : { name: 'System' },
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          changes: log.changes,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata
        })),
        userStats: Object.values(userStats),
        suspiciousActivity: suspiciousActivity.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
          action: log.action,
          entityType: log.entityType,
          ipAddress: log.ipAddress,
          metadata: log.metadata
        })),
        period: {
          startDate: start,
          endDate: end,
          generatedAt: new Date()
        }
      }
    };
  } catch (error) {
    logger.error('Error generating audit trail report:', error);
    throw error;
  }
}
