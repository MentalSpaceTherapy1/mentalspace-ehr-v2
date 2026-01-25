/**
 * Incident Controller
 * Module 9: Compliance Management - Agent 3
 *
 * Handles HTTP requests for incident management operations.
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
import incidentService, {
  CreateIncidentDto,
  UpdateIncidentDto,
  IncidentSearchFilters,
  TrendAnalysisFilters,
  CorrectiveAction,
  PreventiveAction
} from '../services/incident.service';
import { IncidentType, Severity, InvestigationStatus } from '@prisma/client';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

export class IncidentController {
  /**
   * Create a new incident
   * POST /api/incidents
   */
  async createIncident(req: Request, res: Response) {
    try {
      const data: CreateIncidentDto = req.body;

      // Validate required fields
      if (!data.incidentDate || !data.incidentType || !data.severity || !data.reportedById || !data.description) {
        return sendBadRequest(res, 'Missing required fields: incidentDate, incidentType, severity, reportedById, description');
      }

      const incident = await incidentService.createIncident(data);

      return sendCreated(res, incident, 'Incident created successfully');
    } catch (error: unknown) {
      logControllerError('Error in createIncident controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to create incident';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get incident by ID
   * GET /api/incidents/:id
   */
  async getIncidentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const incident = await incidentService.getIncidentById(id);

      if (!incident) {
        return sendNotFound(res, 'Incident');
      }

      return sendSuccess(res, incident);
    } catch (error: unknown) {
      logControllerError('Error in getIncidentById controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch incident';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get incident by incident number
   * GET /api/incidents/number/:incidentNumber
   */
  async getIncidentByNumber(req: Request, res: Response) {
    try {
      const { incidentNumber } = req.params;

      const incident = await incidentService.getIncidentByNumber(incidentNumber);

      if (!incident) {
        return sendNotFound(res, 'Incident');
      }

      return sendSuccess(res, incident);
    } catch (error: unknown) {
      logControllerError('Error in getIncidentByNumber controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch incident';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * List all incidents with optional filters
   * GET /api/incidents
   */
  async listIncidents(req: Request, res: Response) {
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

      return sendSuccess(res, { count: incidents.length, incidents });
    } catch (error: unknown) {
      logControllerError('Error in listIncidents controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to list incidents';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Update an incident
   * PUT /api/incidents/:id
   */
  async updateIncident(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateIncidentDto = req.body;

      const incident = await incidentService.updateIncident(id, data);

      return sendSuccess(res, incident, 'Incident updated successfully');
    } catch (error: unknown) {
      logControllerError('Error in updateIncident controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update incident';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Assign investigator to incident
   * POST /api/incidents/:id/assign
   */
  async assignInvestigator(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { investigatorId } = req.body;

      if (!investigatorId) {
        return sendBadRequest(res, 'Investigator ID is required');
      }

      const incident = await incidentService.assignInvestigator(id, investigatorId);

      return sendSuccess(res, incident, 'Investigator assigned successfully');
    } catch (error: unknown) {
      logControllerError('Error in assignInvestigator controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to assign investigator';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Update investigation notes
   * POST /api/incidents/:id/investigation-notes
   */
  async updateInvestigationNotes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        return sendBadRequest(res, 'Investigation notes are required');
      }

      const incident = await incidentService.updateInvestigationNotes(id, notes);

      return sendSuccess(res, incident, 'Investigation notes updated successfully');
    } catch (error: unknown) {
      logControllerError('Error in updateInvestigationNotes controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update investigation notes';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Add root cause analysis
   * POST /api/incidents/:id/root-cause
   */
  async addRootCause(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rootCause } = req.body;

      if (!rootCause) {
        return sendBadRequest(res, 'Root cause analysis is required');
      }

      const incident = await incidentService.addRootCause(id, rootCause);

      return sendSuccess(res, incident, 'Root cause added successfully');
    } catch (error: unknown) {
      logControllerError('Error in addRootCause controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to add root cause';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Add corrective actions
   * POST /api/incidents/:id/corrective-actions
   */
  async addCorrectiveActions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { actions } = req.body;

      if (!Array.isArray(actions) || actions.length === 0) {
        return sendBadRequest(res, 'Corrective actions array is required');
      }

      const incident = await incidentService.addCorrectiveActions(id, actions as CorrectiveAction[]);

      return sendSuccess(res, incident, 'Corrective actions added successfully');
    } catch (error: unknown) {
      logControllerError('Error in addCorrectiveActions controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to add corrective actions';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Add preventive actions
   * POST /api/incidents/:id/preventive-actions
   */
  async addPreventiveActions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { actions } = req.body;

      if (!Array.isArray(actions) || actions.length === 0) {
        return sendBadRequest(res, 'Preventive actions array is required');
      }

      const incident = await incidentService.addPreventiveActions(id, actions as PreventiveAction[]);

      return sendSuccess(res, incident, 'Preventive actions added successfully');
    } catch (error: unknown) {
      logControllerError('Error in addPreventiveActions controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to add preventive actions';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Update corrective action status
   * PUT /api/incidents/:id/corrective-actions/:actionId
   */
  async updateCorrectiveActionStatus(req: Request, res: Response) {
    try {
      const { id, actionId } = req.params;
      const { status, completedDate } = req.body;

      if (!status) {
        return sendBadRequest(res, 'Status is required');
      }

      const incident = await incidentService.updateCorrectiveActionStatus(
        id,
        actionId,
        status,
        completedDate ? new Date(completedDate) : undefined
      );

      return sendSuccess(res, incident, 'Corrective action status updated successfully');
    } catch (error: unknown) {
      logControllerError('Error in updateCorrectiveActionStatus controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update corrective action status';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Resolve incident
   * POST /api/incidents/:id/resolve
   */
  async resolveIncident(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;

      const incident = await incidentService.resolveIncident(id, resolutionNotes);

      return sendSuccess(res, incident, 'Incident resolved successfully');
    } catch (error: unknown) {
      logControllerError('Error in resolveIncident controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to resolve incident';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Close incident
   * POST /api/incidents/:id/close
   */
  async closeIncident(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const incident = await incidentService.closeIncident(id);

      return sendSuccess(res, incident, 'Incident closed successfully');
    } catch (error: unknown) {
      logControllerError('Error in closeIncident controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to close incident';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get trend analysis
   * GET /api/incidents/reports/trend-analysis
   */
  async getTrendAnalysis(req: Request, res: Response) {
    try {
      const filters: TrendAnalysisFilters = {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string)
      };

      if (!filters.startDate || !filters.endDate) {
        return sendBadRequest(res, 'Start date and end date are required');
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

      return sendSuccess(res, analysis);
    } catch (error: unknown) {
      logControllerError('Error in getTrendAnalysis controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to generate trend analysis';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get incidents requiring follow-up
   * GET /api/incidents/requiring-follow-up
   */
  async getIncidentsRequiringFollowUp(req: Request, res: Response) {
    try {
      const incidents = await incidentService.getIncidentsRequiringFollowUp();

      return sendSuccess(res, { count: incidents.length, incidents });
    } catch (error: unknown) {
      logControllerError('Error in getIncidentsRequiringFollowUp controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch incidents requiring follow-up';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get high severity open incidents
   * GET /api/incidents/high-severity-open
   */
  async getHighSeverityOpenIncidents(req: Request, res: Response) {
    try {
      const incidents = await incidentService.getHighSeverityOpenIncidents();

      return sendSuccess(res, { count: incidents.length, incidents });
    } catch (error: unknown) {
      logControllerError('Error in getHighSeverityOpenIncidents controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch high severity open incidents';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get incident statistics for dashboard
   * GET /api/incidents/stats
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await incidentService.getStats();

      return sendSuccess(res, stats);
    } catch (error: unknown) {
      logControllerError('Error in getStats controller', error);
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch incident statistics';
      return sendServerError(res, errorMessage);
    }
  }
}

export default new IncidentController();
