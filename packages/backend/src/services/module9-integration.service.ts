import prisma from './database';
import logger from '../utils/logger';

/**
 * ============================================================================
 * MODULE 9: INTEGRATION SERVICE
 * ============================================================================
 *
 * Ensures proper data flow and integration between all Module 9 subsystems:
 * - Credentialing
 * - Training & Development
 * - Policy Management
 * - Incident Tracking
 * - Performance Management
 * - Attendance Tracking
 * - Financial Management
 * - Vendor Management
 * - Audit Logging
 *
 * This service provides cross-subsystem operations and data synchronization.
 */

// ============================================================================
// STAFF ONBOARDING INTEGRATION
// ============================================================================

export interface OnboardingData {
  userId: string;
  department: string;
  jobTitle: string;
  hireDate: Date;
  requiredCredentials?: string[];
  requiredTraining?: string[];
  requiredPolicies?: string[];
}

/**
 * Handles complete staff onboarding across all Module 9 subsystems
 */
export async function initiateStaffOnboarding(data: OnboardingData) {
  try {
    logger.info('Initiating staff onboarding', { userId: data.userId });

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roles: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const tasks: any[] = [];

    // 1. Assign required training
    if (data.requiredTraining && data.requiredTraining.length > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days to complete

      for (const trainingType of data.requiredTraining) {
        tasks.push(
          prisma.trainingRecord.create({
            data: {
              userId: data.userId,
              trainingType: trainingType as any,
              courseName: `${trainingType} Training`,
              provider: 'Internal',
              category: 'MANDATORY',
              status: 'NOT_STARTED',
              assignedDate: new Date(),
              dueDate,
              creditsRequired: 0
            }
          })
        );
      }
    }

    // 2. Assign required policies for acknowledgment
    if (data.requiredPolicies && data.requiredPolicies.length > 0) {
      const policies = await prisma.policy.findMany({
        where: {
          policyNumber: { in: data.requiredPolicies },
          isActive: true,
          requireAck: true
        }
      });

      for (const policy of policies) {
        // Update distribution list to include new user
        if (!policy.distributionList.includes(data.userId)) {
          tasks.push(
            prisma.policy.update({
              where: { id: policy.id },
              data: {
                distributionList: [...policy.distributionList, data.userId]
              }
            })
          );
        }
      }
    }

    // 3. Create initial performance goals
    const performanceGoalDate = new Date();
    performanceGoalDate.setMonth(performanceGoalDate.getMonth() + 3); // 90-day goals

    tasks.push(
      prisma.performanceGoal.create({
        data: {
          userId: data.userId,
          metricType: 'TRAINING_COMPLETION',
          targetValue: 100,
          startDate: new Date(),
          endDate: performanceGoalDate,
          status: 'ACTIVE'
        }
      })
    );

    // 4. Log onboarding in audit trail
    tasks.push(
      prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: 'ONBOARDING_INITIATED',
          entityType: 'User',
          entityId: data.userId,
          changes: {
            department: data.department,
            jobTitle: data.jobTitle,
            hireDate: data.hireDate,
            requiredTraining: data.requiredTraining,
            requiredPolicies: data.requiredPolicies
          },
          ipAddress: '0.0.0.0',
          userAgent: 'System'
        }
      })
    );

    // Execute all tasks
    await prisma.$transaction(tasks);

    logger.info('Staff onboarding completed', { userId: data.userId });

    return {
      success: true,
      message: 'Staff onboarding initiated successfully',
      data: {
        userId: data.userId,
        userName: `${user.firstName} ${user.lastName}`,
        trainingAssigned: data.requiredTraining?.length || 0,
        policiesAssigned: data.requiredPolicies?.length || 0,
        goalsCreated: 1
      }
    };
  } catch (error) {
    logger.error('Error initiating staff onboarding:', error);
    throw error;
  }
}

// ============================================================================
// COMPLIANCE DASHBOARD INTEGRATION
// ============================================================================

export interface ComplianceDashboardData {
  userId?: string;
  department?: string;
}

/**
 * Aggregates compliance data across all Module 9 subsystems
 */
export async function getComplianceDashboard(params: ComplianceDashboardData) {
  try {
    logger.info('Generating compliance dashboard', { params });

    const { userId, department } = params;

    // Build user filter
    const userFilter: any = { isActive: true };
    if (userId) userFilter.id = userId;
    if (department) userFilter.department = department;

    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        jobTitle: true,
        employmentStatus: true
      }
    });

    const userIds = users.map(u => u.id);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    // Get compliance data for all users
    const [
      credentials,
      trainingRecords,
      policyAcknowledgments,
      activeIncidents
    ] = await Promise.all([
      // Credentials
      prisma.credential.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          credentialType: true,
          verificationStatus: true,
          expirationDate: true,
          screeningStatus: true
        }
      }),

      // Training
      prisma.trainingRecord.findMany({
        where: {
          userId: { in: userIds },
          category: 'MANDATORY'
        },
        select: {
          userId: true,
          status: true,
          dueDate: true,
          expirationDate: true
        }
      }),

      // Policy acknowledgments
      prisma.policyAcknowledgment.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          policyId: true
        }
      }),

      // Incidents involving users
      prisma.incident.findMany({
        where: {
          OR: [
            { reportedById: { in: userIds } },
            { assignedToId: { in: userIds } }
          ],
          investigationStatus: {
            in: ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW']
          }
        },
        select: {
          reportedById: true,
          assignedToId: true,
          severity: true,
          incidentType: true
        }
      })
    ]);

    // Get required policies count
    const requiredPolicies = await prisma.policy.count({
      where: {
        isActive: true,
        requireAck: true
      }
    });

    // Calculate compliance for each user
    const userCompliance = users.map(user => {
      // Credentials compliance
      const userCredentials = credentials.filter(c => c.userId === user.id);
      const credentialIssues = userCredentials.filter(c =>
        c.verificationStatus !== 'VERIFIED' ||
        c.expirationDate < futureDate ||
        c.screeningStatus === 'FLAGGED'
      ).length;

      // Training compliance
      const userTraining = trainingRecords.filter(t => t.userId === user.id);
      const trainingIssues = userTraining.filter(t =>
        t.status !== 'COMPLETED' ||
        (t.expirationDate && t.expirationDate < now) ||
        (t.dueDate && t.dueDate < now && t.status !== 'COMPLETED')
      ).length;

      // Policy compliance
      const userPolicyAcks = policyAcknowledgments.filter(p => p.userId === user.id).length;
      const policyComplianceRate = requiredPolicies > 0
        ? (userPolicyAcks / requiredPolicies) * 100
        : 100;

      // Incident involvement
      const userIncidents = activeIncidents.filter(i =>
        i.reportedById === user.id || i.assignedToId === user.id
      );
      const criticalIncidents = userIncidents.filter(i => i.severity === 'CRITICAL').length;

      // Overall compliance score (weighted average)
      const credentialScore = userCredentials.length > 0
        ? ((userCredentials.length - credentialIssues) / userCredentials.length) * 100
        : 100;
      const trainingScore = userTraining.length > 0
        ? ((userTraining.length - trainingIssues) / userTraining.length) * 100
        : 100;

      const overallScore = (credentialScore * 0.4) + (trainingScore * 0.4) + (policyComplianceRate * 0.2);

      return {
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          department: user.department,
          jobTitle: user.jobTitle,
          employmentStatus: user.employmentStatus
        },
        compliance: {
          overallScore: Math.round(overallScore * 100) / 100,
          credentials: {
            total: userCredentials.length,
            issues: credentialIssues,
            score: Math.round(credentialScore * 100) / 100
          },
          training: {
            total: userTraining.length,
            issues: trainingIssues,
            score: Math.round(trainingScore * 100) / 100
          },
          policies: {
            acknowledged: userPolicyAcks,
            required: requiredPolicies,
            score: Math.round(policyComplianceRate * 100) / 100
          },
          incidents: {
            active: userIncidents.length,
            critical: criticalIncidents
          }
        }
      };
    });

    // Calculate department-level statistics
    const departmentStats = userCompliance.reduce((acc: any, userData) => {
      const dept = userData.user.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          totalUsers: 0,
          averageScore: 0,
          totalScore: 0,
          credentialIssues: 0,
          trainingIssues: 0,
          activeIncidents: 0
        };
      }

      acc[dept].totalUsers++;
      acc[dept].totalScore += userData.compliance.overallScore;
      acc[dept].credentialIssues += userData.compliance.credentials.issues;
      acc[dept].trainingIssues += userData.compliance.training.issues;
      acc[dept].activeIncidents += userData.compliance.incidents.active;

      return acc;
    }, {});

    // Calculate averages
    Object.keys(departmentStats).forEach(dept => {
      const deptData = departmentStats[dept];
      deptData.averageScore = deptData.totalUsers > 0
        ? Math.round((deptData.totalScore / deptData.totalUsers) * 100) / 100
        : 0;
    });

    // Overall statistics
    const totalUsers = users.length;
    const totalIssues = userCompliance.reduce(
      (sum, u) => sum + u.compliance.credentials.issues + u.compliance.training.issues,
      0
    );
    const averageScore = totalUsers > 0
      ? userCompliance.reduce((sum, u) => sum + u.compliance.overallScore, 0) / totalUsers
      : 0;

    return {
      success: true,
      data: {
        summary: {
          totalUsers,
          averageComplianceScore: Math.round(averageScore * 100) / 100,
          totalIssues,
          criticalIncidents: activeIncidents.filter(i => i.severity === 'CRITICAL').length,
          departmentStats
        },
        users: userCompliance,
        generatedAt: now
      }
    };
  } catch (error) {
    logger.error('Error generating compliance dashboard:', error);
    throw error;
  }
}

// ============================================================================
// CREDENTIAL EXPIRATION ALERT INTEGRATION
// ============================================================================

/**
 * Creates compliance alerts for expiring credentials
 */
export async function createCredentialExpirationAlerts() {
  try {
    logger.info('Creating credential expiration alerts');

    const now = new Date();
    const futureDate90 = new Date();
    futureDate90.setDate(futureDate90.getDate() + 90);
    const futureDate60 = new Date();
    futureDate60.setDate(futureDate60.getDate() + 60);
    const futureDate30 = new Date();
    futureDate30.setDate(futureDate30.getDate() + 30);

    // Get credentials expiring within 90 days
    const expiringCredentials = await prisma.credential.findMany({
      where: {
        expirationDate: {
          gte: now,
          lte: futureDate90
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
            managerId: true
          }
        }
      }
    });

    const alertsToCreate = [];

    for (const credential of expiringCredentials) {
      const daysUntilExpiration = Math.ceil(
        (credential.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (daysUntilExpiration <= 30) severity = 'HIGH';
      else if (daysUntilExpiration <= 60) severity = 'MEDIUM';

      // Check if alert already sent for this timeframe
      const alertsSent = (credential.alertsSent as any) || {};
      const shouldSendAlert =
        (daysUntilExpiration <= 30 && !alertsSent['30days']) ||
        (daysUntilExpiration <= 60 && !alertsSent['60days']) ||
        (daysUntilExpiration <= 90 && !alertsSent['90days']);

      if (shouldSendAlert) {
        alertsToCreate.push({
          targetUserId: credential.userId,
          supervisorId: credential.user.managerId,
          alertType: 'CREDENTIAL_EXPIRATION',
          severity,
          message: `${credential.credentialType} credential will expire in ${daysUntilExpiration} days`,
          actionRequired: 'Renew credential before expiration date',
          metadata: {
            credentialId: credential.id,
            credentialType: credential.credentialType,
            expirationDate: credential.expirationDate,
            daysUntilExpiration
          },
          dueDate: credential.expirationDate
        });

        // Update credential with alert sent flag
        const alertKey = daysUntilExpiration <= 30 ? '30days' :
                        daysUntilExpiration <= 60 ? '60days' : '90days';
        alertsSent[alertKey] = now;

        await prisma.credential.update({
          where: { id: credential.id },
          data: { alertsSent }
        });
      }
    }

    // Create all alerts
    if (alertsToCreate.length > 0) {
      await prisma.complianceAlert.createMany({
        data: alertsToCreate
      });
    }

    logger.info(`Created ${alertsToCreate.length} credential expiration alerts`);

    return {
      success: true,
      alertsCreated: alertsToCreate.length
    };
  } catch (error) {
    logger.error('Error creating credential expiration alerts:', error);
    throw error;
  }
}

// ============================================================================
// TRAINING DUE DATE ALERT INTEGRATION
// ============================================================================

/**
 * Creates compliance alerts for overdue or upcoming training
 */
export async function createTrainingDueAlerts() {
  try {
    logger.info('Creating training due date alerts');

    const now = new Date();
    const futureDate7 = new Date();
    futureDate7.setDate(futureDate7.getDate() + 7);
    const futureDate14 = new Date();
    futureDate14.setDate(futureDate14.getDate() + 14);

    // Get training records that are overdue or due soon
    const dueTraining = await prisma.trainingRecord.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        category: 'MANDATORY',
        dueDate: {
          lte: futureDate14
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            managerId: true
          }
        }
      }
    });

    const alertsToCreate = [];

    for (const training of dueTraining) {
      if (!training.dueDate) continue;

      const daysUntilDue = Math.ceil(
        (training.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      let alertType = 'TRAINING_DUE_SOON';

      if (daysUntilDue < 0) {
        severity = 'CRITICAL';
        alertType = 'TRAINING_OVERDUE';
      } else if (daysUntilDue <= 7) {
        severity = 'HIGH';
      } else {
        severity = 'MEDIUM';
      }

      alertsToCreate.push({
        targetUserId: training.userId,
        supervisorId: training.user.managerId,
        alertType,
        severity,
        message: daysUntilDue < 0
          ? `${training.courseName} is ${Math.abs(daysUntilDue)} days overdue`
          : `${training.courseName} is due in ${daysUntilDue} days`,
        actionRequired: daysUntilDue < 0
          ? 'Complete overdue training immediately'
          : 'Complete training before due date',
        metadata: {
          trainingId: training.id,
          courseName: training.courseName,
          dueDate: training.dueDate,
          status: training.status,
          daysUntilDue
        },
        dueDate: training.dueDate
      });
    }

    // Create all alerts
    if (alertsToCreate.length > 0) {
      await prisma.complianceAlert.createMany({
        data: alertsToCreate
      });
    }

    logger.info(`Created ${alertsToCreate.length} training due date alerts`);

    return {
      success: true,
      alertsCreated: alertsToCreate.length
    };
  } catch (error) {
    logger.error('Error creating training due alerts:', error);
    throw error;
  }
}

// ============================================================================
// INCIDENT-TRIGGERED TRAINING
// ============================================================================

/**
 * Automatically assigns corrective training based on incident type
 */
export async function assignIncidentCorrectiveTraining(incidentId: string) {
  try {
    logger.info('Assigning corrective training for incident', { incidentId });

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        reportedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    // Determine required training based on incident type
    const trainingMap: Record<string, { type: string; course: string }> = {
      'CLINICAL': { type: 'CLINICAL_COMPETENCY', course: 'Clinical Best Practices Refresher' },
      'SAFETY': { type: 'SAFETY', course: 'Workplace Safety Training' },
      'SECURITY': { type: 'COMPLIANCE', course: 'Security and Privacy Compliance' },
      'COMPLIANCE': { type: 'COMPLIANCE', course: 'Compliance Refresher Training' },
      'MEDICATION_ERROR': { type: 'CLINICAL_COMPETENCY', course: 'Medication Management Training' },
      'DOCUMENTATION_ERROR': { type: 'CLINICAL_COMPETENCY', course: 'Clinical Documentation Training' }
    };

    const trainingInfo = trainingMap[incident.incidentType];

    if (trainingInfo && incident.severity !== 'LOW') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 14 days to complete

      // Assign training to involved parties
      const involvedUserIds = incident.involvedParties;

      const trainingRecords = involvedUserIds.map(userId => ({
        userId,
        trainingType: trainingInfo.type as any,
        courseName: trainingInfo.course,
        provider: 'Internal',
        category: 'MANDATORY' as any,
        status: 'NOT_STARTED' as any,
        assignedDate: new Date(),
        dueDate,
        creditsRequired: 0,
        metadata: {
          triggeredByIncident: incident.id,
          incidentNumber: incident.incidentNumber,
          incidentType: incident.incidentType
        }
      }));

      await prisma.trainingRecord.createMany({
        data: trainingRecords
      });

      logger.info(`Assigned corrective training to ${involvedUserIds.length} users`);

      return {
        success: true,
        trainingAssigned: involvedUserIds.length,
        courseName: trainingInfo.course
      };
    }

    return {
      success: true,
      trainingAssigned: 0,
      message: 'No corrective training required for this incident type/severity'
    };
  } catch (error) {
    logger.error('Error assigning corrective training:', error);
    throw error;
  }
}

// ============================================================================
// PERFORMANCE METRICS INTEGRATION
// ============================================================================

/**
 * Updates performance metrics based on various Module 9 activities
 */
export async function updatePerformanceMetrics(userId: string, period: { start: Date; end: Date }) {
  try {
    logger.info('Updating performance metrics', { userId, period });

    const { start, end } = period;

    // Get various metrics for the user
    const [
      completedTraining,
      credentialsObtained,
      policyAcknowledgments,
      incidentsReported,
      performanceGoals
    ] = await Promise.all([
      // Training completed
      prisma.trainingRecord.count({
        where: {
          userId,
          status: 'COMPLETED',
          completionDate: { gte: start, lte: end }
        }
      }),

      // Credentials obtained or renewed
      prisma.credential.count({
        where: {
          userId,
          verificationDate: { gte: start, lte: end }
        }
      }),

      // Policies acknowledged
      prisma.policyAcknowledgment.count({
        where: {
          userId,
          acknowledgedDate: { gte: start, lte: end }
        }
      }),

      // Incidents reported
      prisma.incident.count({
        where: {
          reportedById: userId,
          incidentDate: { gte: start, lte: end }
        }
      }),

      // Performance goals
      prisma.performanceGoal.findMany({
        where: {
          userId,
          endDate: { gte: start, lte: end }
        }
      })
    ]);

    // Calculate compliance score
    const goalsAchieved = performanceGoals.filter(g => g.status === 'ACHIEVED').length;
    const goalCompletionRate = performanceGoals.length > 0
      ? (goalsAchieved / performanceGoals.length) * 100
      : 0;

    // Create or update productivity metric
    const existingMetric = await prisma.productivityMetric.findFirst({
      where: {
        clinicianId: userId,
        periodStart: start,
        periodEnd: end
      }
    });

    const metricData = {
      clinicianId: userId,
      metricType: 'COMPLIANCE',
      periodStart: start,
      periodEnd: end,
      metricValue: goalCompletionRate,
      metadata: {
        completedTraining,
        credentialsObtained,
        policyAcknowledgments,
        incidentsReported,
        goalsAchieved,
        totalGoals: performanceGoals.length
      }
    };

    if (existingMetric) {
      await prisma.productivityMetric.update({
        where: { id: existingMetric.id },
        data: metricData
      });
    } else {
      await prisma.productivityMetric.create({
        data: metricData
      });
    }

    logger.info('Performance metrics updated', { userId });

    return {
      success: true,
      metrics: {
        completedTraining,
        credentialsObtained,
        policyAcknowledgments,
        incidentsReported,
        goalCompletionRate: Math.round(goalCompletionRate * 100) / 100
      }
    };
  } catch (error) {
    logger.error('Error updating performance metrics:', error);
    throw error;
  }
}

// ============================================================================
// AUDIT LOG HELPER
// ============================================================================

/**
 * Helper function to create audit log entries for Module 9 operations
 */
export async function createAuditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: { ...(params.changes || {}), metadata: params.metadata || {} },
        ipAddress: params.ipAddress || '0.0.0.0',
        userAgent: params.userAgent || 'System'
      }
    });

    return { success: true };
  } catch (error) {
    logger.error('Error creating audit log:', error);
    throw error;
  }
}
