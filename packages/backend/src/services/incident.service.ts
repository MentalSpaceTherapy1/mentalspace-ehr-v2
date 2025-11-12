/**
 * Incident Service
 * Module 9: Compliance Management - Agent 3
 *
 * Handles incident reporting, investigation workflow, root cause analysis,
 * corrective action tracking, and trend analysis.
 */

import { PrismaClient, Incident, IncidentType, Severity, InvestigationStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateIncidentDto {
  incidentDate: Date;
  incidentTime?: string;
  incidentType: IncidentType;
  severity: Severity;
  location?: string;
  specificLocation?: string;
  reportedById: string;
  involvedParties?: string[];
  witnesses?: string[];
  description: string;
  immediateAction?: string;
  attachments?: string[];
}

export interface UpdateIncidentDto {
  incidentDate?: Date;
  incidentTime?: string;
  incidentType?: IncidentType;
  severity?: Severity;
  location?: string;
  specificLocation?: string;
  involvedParties?: string[];
  witnesses?: string[];
  description?: string;
  immediateAction?: string;
  investigationStatus?: InvestigationStatus;
  assignedToId?: string;
  investigationNotes?: string;
  rootCause?: string;
  correctiveActions?: any[];
  preventiveActions?: any[];
  followUpDate?: Date;
  resolutionDate?: Date;
  attachments?: string[];
  notifications?: any;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  completedDate?: Date;
  notes?: string;
}

export interface PreventiveAction {
  id: string;
  description: string;
  responsibleParty: string;
  implementationDate?: Date;
  status: 'planned' | 'implemented' | 'verified';
  verificationDate?: Date;
  notes?: string;
}

export interface IncidentSearchFilters {
  incidentType?: IncidentType;
  severity?: Severity;
  investigationStatus?: InvestigationStatus;
  reportedById?: string;
  assignedToId?: string;
  incidentDateFrom?: Date;
  incidentDateTo?: Date;
  location?: string;
}

export interface TrendAnalysisFilters {
  startDate: Date;
  endDate: Date;
  incidentType?: IncidentType;
  severity?: Severity;
  location?: string;
}

export class IncidentService {
  /**
   * Generate unique incident number
   * Format: INC-YYYYMMDD-XXXX
   */
  private async generateIncidentNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Count incidents created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await prisma.incident.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INC-${dateStr}-${sequence}`;
  }

  /**
   * Create a new incident report
   * @param data Incident creation data
   * @returns Created incident
   */
  async createIncident(data: CreateIncidentDto): Promise<Incident> {
    try {
      // Verify reporter exists
      const reporter = await prisma.user.findUnique({
        where: { id: data.reportedById }
      });

      if (!reporter) {
        throw new Error(`Reporter with ID ${data.reportedById} not found`);
      }

      // Generate unique incident number
      const incidentNumber = await this.generateIncidentNumber();

      // Create incident
      const incident = await prisma.incident.create({
        data: {
          incidentNumber,
          incidentDate: data.incidentDate,
          incidentTime: data.incidentTime,
          incidentType: data.incidentType,
          severity: data.severity,
          location: data.location,
          specificLocation: data.specificLocation,
          reportedById: data.reportedById,
          involvedParties: data.involvedParties || [],
          witnesses: data.witnesses || [],
          description: data.description,
          immediateAction: data.immediateAction,
          attachments: data.attachments || [],
          investigationStatus: InvestigationStatus.PENDING
        },
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      console.log(`✅ Incident created: ${incident.incidentNumber} - ${incident.incidentType}`);

      // If severity is HIGH or CRITICAL, automatically log for urgent attention
      if (incident.severity === Severity.HIGH || incident.severity === Severity.CRITICAL) {
        console.log(`🚨 HIGH/CRITICAL SEVERITY INCIDENT: ${incident.incidentNumber}`);
      }

      return incident;
    } catch (error) {
      console.error('❌ Error creating incident:', error);
      throw error;
    }
  }

  /**
   * Get incident by ID
   * @param id Incident ID
   * @returns Incident with related data
   */
  async getIncidentById(id: string): Promise<Incident | null> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id },
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          }
        }
      });

      return incident;
    } catch (error) {
      console.error('❌ Error fetching incident:', error);
      throw error;
    }
  }

  /**
   * Get incident by incident number
   * @param incidentNumber Incident number
   * @returns Incident
   */
  async getIncidentByNumber(incidentNumber: string): Promise<Incident | null> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { incidentNumber },
        include: {
          reportedBy: true,
          assignedTo: true
        }
      });

      return incident;
    } catch (error) {
      console.error('❌ Error fetching incident by number:', error);
      throw error;
    }
  }

  /**
   * List all incidents with optional filters
   * @param filters Search filters
   * @returns Array of incidents
   */
  async listIncidents(filters?: IncidentSearchFilters): Promise<Incident[]> {
    try {
      const where: any = {};

      if (filters?.incidentType) {
        where.incidentType = filters.incidentType;
      }

      if (filters?.severity) {
        where.severity = filters.severity;
      }

      if (filters?.investigationStatus) {
        where.investigationStatus = filters.investigationStatus;
      }

      if (filters?.reportedById) {
        where.reportedById = filters.reportedById;
      }

      if (filters?.assignedToId) {
        where.assignedToId = filters.assignedToId;
      }

      if (filters?.incidentDateFrom || filters?.incidentDateTo) {
        where.incidentDate = {};
        if (filters.incidentDateFrom) {
          where.incidentDate.gte = filters.incidentDateFrom;
        }
        if (filters.incidentDateTo) {
          where.incidentDate.lte = filters.incidentDateTo;
        }
      }

      if (filters?.location) {
        where.location = {
          contains: filters.location,
          mode: 'insensitive'
        };
      }

      const incidents = await prisma.incident.findMany({
        where,
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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

      return incidents;
    } catch (error) {
      console.error('❌ Error listing incidents:', error);
      throw error;
    }
  }

  /**
   * Update an existing incident
   * @param id Incident ID
   * @param data Update data
   * @returns Updated incident
   */
  async updateIncident(id: string, data: UpdateIncidentDto): Promise<Incident> {
    try {
      // Check if incident exists
      const existingIncident = await prisma.incident.findUnique({
        where: { id }
      });

      if (!existingIncident) {
        throw new Error(`Incident with ID ${id} not found`);
      }

      // If assigning to investigator, verify user exists
      if (data.assignedToId) {
        const investigator = await prisma.user.findUnique({
          where: { id: data.assignedToId }
        });

        if (!investigator) {
          throw new Error(`Investigator with ID ${data.assignedToId} not found`);
        }
      }

      const incident = await prisma.incident.update({
        where: { id },
        data,
        include: {
          reportedBy: true,
          assignedTo: true
        }
      });

      console.log(`✅ Incident updated: ${incident.incidentNumber}`);
      return incident;
    } catch (error) {
      console.error('❌ Error updating incident:', error);
      throw error;
    }
  }

  /**
   * Assign incident to investigator
   * @param incidentId Incident ID
   * @param investigatorId Investigator user ID
   * @returns Updated incident
   */
  async assignInvestigator(incidentId: string, investigatorId: string): Promise<Incident> {
    try {
      const incident = await this.updateIncident(incidentId, {
        assignedToId: investigatorId,
        investigationStatus: InvestigationStatus.IN_PROGRESS
      });

      console.log(`👤 Incident ${incident.incidentNumber} assigned to investigator`);
      return incident;
    } catch (error) {
      console.error('❌ Error assigning investigator:', error);
      throw error;
    }
  }

  /**
   * Update investigation notes
   * @param incidentId Incident ID
   * @param notes Investigation notes
   * @returns Updated incident
   */
  async updateInvestigationNotes(incidentId: string, notes: string): Promise<Incident> {
    try {
      const incident = await this.updateIncident(incidentId, {
        investigationNotes: notes,
        investigationStatus: InvestigationStatus.IN_PROGRESS
      });

      console.log(`📝 Investigation notes updated for ${incident.incidentNumber}`);
      return incident;
    } catch (error) {
      console.error('❌ Error updating investigation notes:', error);
      throw error;
    }
  }

  /**
   * Add root cause analysis
   * @param incidentId Incident ID
   * @param rootCause Root cause analysis
   * @returns Updated incident
   */
  async addRootCause(incidentId: string, rootCause: string): Promise<Incident> {
    try {
      const incident = await this.updateIncident(incidentId, {
        rootCause,
        investigationStatus: InvestigationStatus.UNDER_REVIEW
      });

      console.log(`🔍 Root cause identified for ${incident.incidentNumber}`);
      return incident;
    } catch (error) {
      console.error('❌ Error adding root cause:', error);
      throw error;
    }
  }

  /**
   * Add corrective actions to incident
   * @param incidentId Incident ID
   * @param actions Array of corrective actions
   * @returns Updated incident
   */
  async addCorrectiveActions(
    incidentId: string,
    actions: CorrectiveAction[]
  ): Promise<Incident> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId }
      });

      if (!incident) {
        throw new Error(`Incident with ID ${incidentId} not found`);
      }

      // Merge with existing corrective actions
      const existingActions = (incident.correctiveActions as any[]) || [];
      const updatedActions = [...existingActions, ...actions];

      const updatedIncident = await this.updateIncident(incidentId, {
        correctiveActions: updatedActions
      });

      console.log(`✅ ${actions.length} corrective action(s) added to ${incident.incidentNumber}`);
      return updatedIncident;
    } catch (error) {
      console.error('❌ Error adding corrective actions:', error);
      throw error;
    }
  }

  /**
   * Add preventive actions to incident
   * @param incidentId Incident ID
   * @param actions Array of preventive actions
   * @returns Updated incident
   */
  async addPreventiveActions(
    incidentId: string,
    actions: PreventiveAction[]
  ): Promise<Incident> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId }
      });

      if (!incident) {
        throw new Error(`Incident with ID ${incidentId} not found`);
      }

      // Merge with existing preventive actions
      const existingActions = (incident.preventiveActions as any[]) || [];
      const updatedActions = [...existingActions, ...actions];

      const updatedIncident = await this.updateIncident(incidentId, {
        preventiveActions: updatedActions
      });

      console.log(`✅ ${actions.length} preventive action(s) added to ${incident.incidentNumber}`);
      return updatedIncident;
    } catch (error) {
      console.error('❌ Error adding preventive actions:', error);
      throw error;
    }
  }

  /**
   * Update corrective action status
   * @param incidentId Incident ID
   * @param actionId Action ID
   * @param status New status
   * @param completedDate Optional completion date
   * @returns Updated incident
   */
  async updateCorrectiveActionStatus(
    incidentId: string,
    actionId: string,
    status: 'pending' | 'in_progress' | 'completed',
    completedDate?: Date
  ): Promise<Incident> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId }
      });

      if (!incident) {
        throw new Error(`Incident with ID ${incidentId} not found`);
      }

      const actions = (incident.correctiveActions as CorrectiveAction[]) || [];
      const actionIndex = actions.findIndex(a => a.id === actionId);

      if (actionIndex === -1) {
        throw new Error(`Corrective action with ID ${actionId} not found`);
      }

      actions[actionIndex].status = status;
      if (completedDate) {
        actions[actionIndex].completedDate = completedDate;
      }

      const updatedIncident = await this.updateIncident(incidentId, {
        correctiveActions: actions
      });

      console.log(`✅ Corrective action status updated to ${status}`);
      return updatedIncident;
    } catch (error) {
      console.error('❌ Error updating corrective action status:', error);
      throw error;
    }
  }

  /**
   * Resolve incident
   * @param incidentId Incident ID
   * @param resolutionNotes Optional resolution notes
   * @returns Updated incident
   */
  async resolveIncident(incidentId: string, resolutionNotes?: string): Promise<Incident> {
    try {
      const updates: UpdateIncidentDto = {
        investigationStatus: InvestigationStatus.RESOLVED,
        resolutionDate: new Date()
      };

      if (resolutionNotes) {
        updates.investigationNotes = resolutionNotes;
      }

      const incident = await this.updateIncident(incidentId, updates);

      console.log(`✅ Incident ${incident.incidentNumber} resolved`);
      return incident;
    } catch (error) {
      console.error('❌ Error resolving incident:', error);
      throw error;
    }
  }

  /**
   * Close incident
   * @param incidentId Incident ID
   * @returns Updated incident
   */
  async closeIncident(incidentId: string): Promise<Incident> {
    try {
      const incident = await this.updateIncident(incidentId, {
        investigationStatus: InvestigationStatus.CLOSED
      });

      console.log(`✅ Incident ${incident.incidentNumber} closed`);
      return incident;
    } catch (error) {
      console.error('❌ Error closing incident:', error);
      throw error;
    }
  }

  /**
   * Get incident trend analysis
   * @param filters Analysis filters
   * @returns Trend analysis data
   */
  async getTrendAnalysis(filters: TrendAnalysisFilters) {
    try {
      const where: any = {
        incidentDate: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      };

      if (filters.incidentType) {
        where.incidentType = filters.incidentType;
      }

      if (filters.severity) {
        where.severity = filters.severity;
      }

      if (filters.location) {
        where.location = {
          contains: filters.location,
          mode: 'insensitive'
        };
      }

      const incidents = await prisma.incident.findMany({
        where,
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          incidentDate: 'asc'
        }
      });

      // Calculate statistics
      const totalIncidents = incidents.length;

      // Group by incident type
      const byType: { [key: string]: number } = {};
      incidents.forEach(incident => {
        byType[incident.incidentType] = (byType[incident.incidentType] || 0) + 1;
      });

      // Group by severity
      const bySeverity: { [key: string]: number } = {};
      incidents.forEach(incident => {
        bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
      });

      // Group by month
      const byMonth: { [key: string]: number } = {};
      incidents.forEach(incident => {
        const monthKey = incident.incidentDate.toISOString().slice(0, 7); // YYYY-MM
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
      });

      // Group by location
      const byLocation: { [key: string]: number } = {};
      incidents.forEach(incident => {
        if (incident.location) {
          byLocation[incident.location] = (byLocation[incident.location] || 0) + 1;
        }
      });

      // Calculate investigation metrics
      const investigationStatuses = {
        pending: incidents.filter(i => i.investigationStatus === InvestigationStatus.PENDING).length,
        inProgress: incidents.filter(i => i.investigationStatus === InvestigationStatus.IN_PROGRESS).length,
        underReview: incidents.filter(i => i.investigationStatus === InvestigationStatus.UNDER_REVIEW).length,
        resolved: incidents.filter(i => i.investigationStatus === InvestigationStatus.RESOLVED).length,
        closed: incidents.filter(i => i.investigationStatus === InvestigationStatus.CLOSED).length
      };

      // Calculate average resolution time (for resolved incidents)
      const resolvedIncidents = incidents.filter(
        i => i.resolutionDate && i.investigationStatus === InvestigationStatus.RESOLVED
      );

      let averageResolutionDays = 0;
      if (resolvedIncidents.length > 0) {
        const totalDays = resolvedIncidents.reduce((sum, incident) => {
          const days = Math.ceil(
            (incident.resolutionDate!.getTime() - incident.incidentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0);
        averageResolutionDays = totalDays / resolvedIncidents.length;
      }

      return {
        summary: {
          totalIncidents,
          dateRange: {
            start: filters.startDate,
            end: filters.endDate
          },
          averageResolutionDays: Math.round(averageResolutionDays * 10) / 10
        },
        byType,
        bySeverity,
        byMonth,
        byLocation,
        investigationStatuses,
        recentIncidents: incidents.slice(-10).reverse()
      };
    } catch (error) {
      console.error('❌ Error generating trend analysis:', error);
      throw error;
    }
  }

  /**
   * Get incidents requiring follow-up
   * @returns Array of incidents with upcoming or past-due follow-ups
   */
  async getIncidentsRequiringFollowUp(): Promise<Incident[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // Next 7 days

      const incidents = await prisma.incident.findMany({
        where: {
          followUpDate: {
            lte: futureDate
          },
          investigationStatus: {
            not: InvestigationStatus.CLOSED
          }
        },
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
          followUpDate: 'asc'
        }
      });

      return incidents;
    } catch (error) {
      console.error('❌ Error getting incidents requiring follow-up:', error);
      throw error;
    }
  }

  /**
   * Get high-severity open incidents
   * @returns Array of high/critical severity open incidents
   */
  async getHighSeverityOpenIncidents(): Promise<Incident[]> {
    try {
      const incidents = await prisma.incident.findMany({
        where: {
          severity: {
            in: [Severity.HIGH, Severity.CRITICAL]
          },
          investigationStatus: {
            notIn: [InvestigationStatus.RESOLVED, InvestigationStatus.CLOSED]
          }
        },
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
        orderBy: [
          { severity: 'desc' },
          { incidentDate: 'desc' }
        ]
      });

      return incidents;
    } catch (error) {
      console.error('❌ Error getting high severity incidents:', error);
      throw error;
    }
  }

  /**
   * Get incident statistics for dashboard
   * @returns Incident statistics including counts by severity, status, type, and resolution metrics
   */
  async getStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageResolutionTime: number;
    openIncidents: number;
    overdueInvestigations: number;
  }> {
    try {
      // Get all incidents
      const allIncidents = await prisma.incident.findMany({
        include: {
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      const today = new Date();

      // Calculate total
      const total = allIncidents.length;

      // Count by severity
      const bySeverity: Record<string, number> = {};
      for (const severity of Object.values(Severity)) {
        bySeverity[severity] = allIncidents.filter(i => i.severity === severity).length;
      }

      // Count by investigation status
      const byStatus: Record<string, number> = {};
      for (const status of Object.values(InvestigationStatus)) {
        byStatus[status] = allIncidents.filter(i => i.investigationStatus === status).length;
      }

      // Count by incident type
      const byType: Record<string, number> = {};
      for (const type of Object.values(IncidentType)) {
        byType[type] = allIncidents.filter(i => i.incidentType === type).length;
      }

      // Calculate average resolution time (in days)
      const resolvedIncidents = allIncidents.filter(i =>
        i.resolutionDate && i.incidentDate
      );
      let averageResolutionTime = 0;
      if (resolvedIncidents.length > 0) {
        const totalResolutionDays = resolvedIncidents.reduce((sum, incident) => {
          const resolutionTime = incident.resolutionDate!.getTime() - incident.incidentDate.getTime();
          return sum + (resolutionTime / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0);
        averageResolutionTime = totalResolutionDays / resolvedIncidents.length;
      }

      // Count open incidents (not resolved or closed)
      const openIncidents = allIncidents.filter(i =>
        i.investigationStatus !== InvestigationStatus.RESOLVED &&
        i.investigationStatus !== InvestigationStatus.CLOSED
      ).length;

      // Count overdue investigations (assigned but follow-up date passed)
      const overdueInvestigations = allIncidents.filter(i =>
        i.assignedToId &&
        i.followUpDate &&
        i.followUpDate < today &&
        i.investigationStatus !== InvestigationStatus.RESOLVED &&
        i.investigationStatus !== InvestigationStatus.CLOSED
      ).length;

      const stats = {
        total,
        bySeverity,
        byStatus,
        byType,
        averageResolutionTime: Math.round(averageResolutionTime * 10) / 10, // Round to 1 decimal
        openIncidents,
        overdueInvestigations
      };

      console.log('📊 Incident stats generated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error generating incident stats:', error);
      throw error;
    }
  }
}

export default new IncidentService();
