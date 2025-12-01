/**
 * Incident Controller
 * Module 9: Compliance Management - Agent 3
 *
 * Handles HTTP requests for incident management operations.
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import incidentService, {
  CreateIncidentDto,
  UpdateIncidentDto,
  IncidentSearchFilters,
  TrendAnalysisFilters,
  CorrectiveAction,
  PreventiveAction
} from '../services/incident.service';
import { IncidentType, Severity, InvestigationStatus } from '@prisma/client';

export class IncidentController {
  /**
   * Create a new incident
   * POST /api/incidents
   */
  async createIncident(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateIncidentDto = req.body;

      // Validate required fields
      if (!data.incidentDate || !data.incidentType || !data.severity || !data.reportedById || !data.description) {
        res.status(400).json({
          error: 'Missing required fields: incidentDate, incidentType, severity, reportedById, description'
        });
        return;
      }

      const incident = await incidentService.createIncident(data);

      res.status(201).json({
        message: 'Incident created successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in createIncident controller', error);
      res.status(500).json({
        error: 'Failed to create incident',
        details: error.message
      });
    }
  }

  /**
   * Get incident by ID
   * GET /api/incidents/:id
   */
  async getIncidentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const incident = await incidentService.getIncidentById(id);

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      res.status(200).json(incident);
    } catch (error: any) {
      logControllerError('Error in getIncidentById controller', error);
      res.status(500).json({
        error: 'Failed to fetch incident',
        details: error.message
      });
    }
  }

  /**
   * Get incident by incident number
   * GET /api/incidents/number/:incidentNumber
   */
  async getIncidentByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { incidentNumber } = req.params;

      const incident = await incidentService.getIncidentByNumber(incidentNumber);

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      res.status(200).json(incident);
    } catch (error: any) {
      logControllerError('Error in getIncidentByNumber controller', error);
      res.status(500).json({
        error: 'Failed to fetch incident',
        details: error.message
      });
    }
  }

  /**
   * List all incidents with optional filters
   * GET /api/incidents
   */
  async listIncidents(req: Request, res: Response): Promise<void> {
    try {
      const filters: IncidentSearchFilters = {};

      if (req.query.incidentType) {
        filters.incidentType = req.query.incidentType as IncidentType;
      }

      if (req.query.severity) {
        filters.severity = req.query.severity as Severity;
      }

      if (req.query.investigationStatus) {
        filters.investigationStatus = req.query.investigationStatus as InvestigationStatus;
      }

      if (req.query.reportedById) {
        filters.reportedById = req.query.reportedById as string;
      }

      if (req.query.assignedToId) {
        filters.assignedToId = req.query.assignedToId as string;
      }

      if (req.query.incidentDateFrom) {
        filters.incidentDateFrom = new Date(req.query.incidentDateFrom as string);
      }

      if (req.query.incidentDateTo) {
        filters.incidentDateTo = new Date(req.query.incidentDateTo as string);
      }

      if (req.query.location) {
        filters.location = req.query.location as string;
      }

      const incidents = await incidentService.listIncidents(filters);

      res.status(200).json({
        count: incidents.length,
        incidents
      });
    } catch (error: any) {
      logControllerError('Error in listIncidents controller', error);
      res.status(500).json({
        error: 'Failed to list incidents',
        details: error.message
      });
    }
  }

  /**
   * Update an incident
   * PUT /api/incidents/:id
   */
  async updateIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateIncidentDto = req.body;

      const incident = await incidentService.updateIncident(id, data);

      res.status(200).json({
        message: 'Incident updated successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in updateIncident controller', error);
      res.status(500).json({
        error: 'Failed to update incident',
        details: error.message
      });
    }
  }

  /**
   * Assign investigator to incident
   * POST /api/incidents/:id/assign
   */
  async assignInvestigator(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { investigatorId } = req.body;

      if (!investigatorId) {
        res.status(400).json({ error: 'Investigator ID is required' });
        return;
      }

      const incident = await incidentService.assignInvestigator(id, investigatorId);

      res.status(200).json({
        message: 'Investigator assigned successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in assignInvestigator controller', error);
      res.status(500).json({
        error: 'Failed to assign investigator',
        details: error.message
      });
    }
  }

  /**
   * Update investigation notes
   * POST /api/incidents/:id/investigation-notes
   */
  async updateInvestigationNotes(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        res.status(400).json({ error: 'Investigation notes are required' });
        return;
      }

      const incident = await incidentService.updateInvestigationNotes(id, notes);

      res.status(200).json({
        message: 'Investigation notes updated successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in updateInvestigationNotes controller', error);
      res.status(500).json({
        error: 'Failed to update investigation notes',
        details: error.message
      });
    }
  }

  /**
   * Add root cause analysis
   * POST /api/incidents/:id/root-cause
   */
  async addRootCause(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rootCause } = req.body;

      if (!rootCause) {
        res.status(400).json({ error: 'Root cause analysis is required' });
        return;
      }

      const incident = await incidentService.addRootCause(id, rootCause);

      res.status(200).json({
        message: 'Root cause added successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in addRootCause controller', error);
      res.status(500).json({
        error: 'Failed to add root cause',
        details: error.message
      });
    }
  }

  /**
   * Add corrective actions
   * POST /api/incidents/:id/corrective-actions
   */
  async addCorrectiveActions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { actions } = req.body;

      if (!Array.isArray(actions) || actions.length === 0) {
        res.status(400).json({ error: 'Corrective actions array is required' });
        return;
      }

      const incident = await incidentService.addCorrectiveActions(id, actions as CorrectiveAction[]);

      res.status(200).json({
        message: 'Corrective actions added successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in addCorrectiveActions controller', error);
      res.status(500).json({
        error: 'Failed to add corrective actions',
        details: error.message
      });
    }
  }

  /**
   * Add preventive actions
   * POST /api/incidents/:id/preventive-actions
   */
  async addPreventiveActions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { actions } = req.body;

      if (!Array.isArray(actions) || actions.length === 0) {
        res.status(400).json({ error: 'Preventive actions array is required' });
        return;
      }

      const incident = await incidentService.addPreventiveActions(id, actions as PreventiveAction[]);

      res.status(200).json({
        message: 'Preventive actions added successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in addPreventiveActions controller', error);
      res.status(500).json({
        error: 'Failed to add preventive actions',
        details: error.message
      });
    }
  }

  /**
   * Update corrective action status
   * PUT /api/incidents/:id/corrective-actions/:actionId
   */
  async updateCorrectiveActionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id, actionId } = req.params;
      const { status, completedDate } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      const incident = await incidentService.updateCorrectiveActionStatus(
        id,
        actionId,
        status,
        completedDate ? new Date(completedDate) : undefined
      );

      res.status(200).json({
        message: 'Corrective action status updated successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in updateCorrectiveActionStatus controller', error);
      res.status(500).json({
        error: 'Failed to update corrective action status',
        details: error.message
      });
    }
  }

  /**
   * Resolve incident
   * POST /api/incidents/:id/resolve
   */
  async resolveIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;

      const incident = await incidentService.resolveIncident(id, resolutionNotes);

      res.status(200).json({
        message: 'Incident resolved successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in resolveIncident controller', error);
      res.status(500).json({
        error: 'Failed to resolve incident',
        details: error.message
      });
    }
  }

  /**
   * Close incident
   * POST /api/incidents/:id/close
   */
  async closeIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const incident = await incidentService.closeIncident(id);

      res.status(200).json({
        message: 'Incident closed successfully',
        incident
      });
    } catch (error: any) {
      logControllerError('Error in closeIncident controller', error);
      res.status(500).json({
        error: 'Failed to close incident',
        details: error.message
      });
    }
  }

  /**
   * Get trend analysis
   * GET /api/incidents/reports/trend-analysis
   */
  async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const filters: TrendAnalysisFilters = {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string)
      };

      if (!filters.startDate || !filters.endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }

      if (req.query.incidentType) {
        filters.incidentType = req.query.incidentType as IncidentType;
      }

      if (req.query.severity) {
        filters.severity = req.query.severity as Severity;
      }

      if (req.query.location) {
        filters.location = req.query.location as string;
      }

      const analysis = await incidentService.getTrendAnalysis(filters);

      res.status(200).json(analysis);
    } catch (error: any) {
      logControllerError('Error in getTrendAnalysis controller', error);
      res.status(500).json({
        error: 'Failed to generate trend analysis',
        details: error.message
      });
    }
  }

  /**
   * Get incidents requiring follow-up
   * GET /api/incidents/requiring-follow-up
   */
  async getIncidentsRequiringFollowUp(req: Request, res: Response): Promise<void> {
    try {
      const incidents = await incidentService.getIncidentsRequiringFollowUp();

      res.status(200).json({
        count: incidents.length,
        incidents
      });
    } catch (error: any) {
      logControllerError('Error in getIncidentsRequiringFollowUp controller', error);
      res.status(500).json({
        error: 'Failed to fetch incidents requiring follow-up',
        details: error.message
      });
    }
  }

  /**
   * Get high severity open incidents
   * GET /api/incidents/high-severity-open
   */
  async getHighSeverityOpenIncidents(req: Request, res: Response): Promise<void> {
    try {
      const incidents = await incidentService.getHighSeverityOpenIncidents();

      res.status(200).json({
        count: incidents.length,
        incidents
      });
    } catch (error: any) {
      logControllerError('Error in getHighSeverityOpenIncidents controller', error);
      res.status(500).json({
        error: 'Failed to fetch high severity open incidents',
        details: error.message
      });
    }
  }

  /**
   * Get incident statistics for dashboard
   * GET /api/incidents/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await incidentService.getStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logControllerError('Error in getStats controller', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch incident statistics',
        details: error.message
      });
    }
  }
}

export default new IncidentController();
