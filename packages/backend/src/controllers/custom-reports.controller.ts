import { Request, Response } from 'express';
// Phase 3.2: Removed direct PrismaClient import - using service methods instead
import { Prisma } from '@mentalspace/database';
import { logControllerError } from '../utils/logger';
import queryBuilderService, { QueryConfig } from '../services/query-builder.service';
import * as customReportsService from '../services/custom-reports.service';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

// ============================================================================
// REPORT TEMPLATES
// ============================================================================

const REPORT_TEMPLATES: Record<string, QueryConfig> = {
  'revenue-by-service': {
    dataSources: ['Charge', 'ServiceCode'],
    fields: [
      { source: 'ServiceCode', field: 'code', alias: 'serviceCode' },
      { source: 'ServiceCode', field: 'description', alias: 'serviceName' }
    ],
    filters: [
      { field: 'billingStatus', operator: 'IN', values: ['PAID', 'SUBMITTED'] },
      { field: 'serviceDate', operator: 'GTE', values: [new Date(new Date().setMonth(new Date().getMonth() - 1))] }
    ],
    groupBy: ['serviceCodeId'],
    aggregations: [
      { field: 'chargeAmount', function: 'SUM', alias: 'totalRevenue' },
      { field: 'id', function: 'COUNT', alias: 'chargeCount' }
    ],
    orderBy: [{ field: 'totalRevenue', direction: 'DESC' }]
  },
  'client-retention': {
    dataSources: ['Client', 'Appointment'],
    fields: [
      { source: 'Client', field: 'id', alias: 'clientId' },
      { source: 'Client', field: 'firstName' },
      { source: 'Client', field: 'lastName' },
      { source: 'Client', field: 'createdAt', alias: 'enrollmentDate' }
    ],
    filters: [
      { field: 'Client.status', operator: 'EQUALS', values: ['ACTIVE'] }
    ],
    groupBy: ['clientId'],
    aggregations: [
      { field: 'Appointment.id', function: 'COUNT', alias: 'appointmentCount' }
    ],
    orderBy: [{ field: 'appointmentCount', direction: 'DESC' }]
  },
  'clinician-productivity': {
    dataSources: ['User', 'Appointment'],
    fields: [
      { source: 'User', field: 'firstName', alias: 'clinicianFirstName' },
      { source: 'User', field: 'lastName', alias: 'clinicianLastName' }
    ],
    filters: [
      { field: 'Appointment.status', operator: 'EQUALS', values: ['COMPLETED'] },
      { field: 'Appointment.appointmentDate', operator: 'GTE', values: [new Date(new Date().setMonth(new Date().getMonth() - 1))] }
    ],
    groupBy: ['clinicianId'],
    aggregations: [
      { field: 'Appointment.id', function: 'COUNT', alias: 'completedAppointments' },
      { field: 'Appointment.duration', function: 'SUM', alias: 'totalMinutes' }
    ],
    orderBy: [{ field: 'completedAppointments', direction: 'DESC' }]
  },
  'payer-performance': {
    dataSources: ['Payer', 'Insurance', 'Charge'],
    fields: [
      { source: 'Payer', field: 'name', alias: 'payerName' },
      { source: 'Payer', field: 'type', alias: 'payerType' }
    ],
    filters: [
      { field: 'Charge.billingStatus', operator: 'IN', values: ['PAID', 'SUBMITTED', 'DENIED'] }
    ],
    groupBy: ['payerId'],
    aggregations: [
      { field: 'Charge.id', function: 'COUNT', alias: 'totalClaims' },
      { field: 'Charge.chargeAmount', function: 'SUM', alias: 'totalBilled' },
      { field: 'Charge.paidAmount', function: 'SUM', alias: 'totalPaid' }
    ],
    orderBy: [{ field: 'totalBilled', direction: 'DESC' }]
  },
  'appointment-utilization': {
    dataSources: ['Appointment'],
    fields: [
      { source: 'Appointment', field: 'appointmentType' },
      { source: 'Appointment', field: 'status' }
    ],
    filters: [
      { field: 'appointmentDate', operator: 'GTE', values: [new Date(new Date().setMonth(new Date().getMonth() - 1))] }
    ],
    groupBy: ['appointmentType', 'status'],
    aggregations: [
      { field: 'id', function: 'COUNT', alias: 'appointmentCount' },
      { field: 'duration', function: 'AVG', alias: 'avgDuration' }
    ],
    orderBy: [{ field: 'appointmentCount', direction: 'DESC' }]
  },
  'no-show-analysis': {
    dataSources: ['Appointment', 'Client'],
    fields: [
      { source: 'Client', field: 'firstName' },
      { source: 'Client', field: 'lastName' },
      { source: 'Appointment', field: 'appointmentDate' }
    ],
    filters: [
      { field: 'status', operator: 'EQUALS', values: ['NO_SHOW'] },
      { field: 'appointmentDate', operator: 'GTE', values: [new Date(new Date().setMonth(new Date().getMonth() - 3))] }
    ],
    groupBy: ['clientId'],
    aggregations: [
      { field: 'id', function: 'COUNT', alias: 'noShowCount' }
    ],
    orderBy: [{ field: 'noShowCount', direction: 'DESC' }]
  }
};

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

/**
 * Get available data sources
 */
export const getDataSources = async (req: Request, res: Response) => {
  try {
    const dataSources = queryBuilderService.getAvailableDataSources();
    return sendSuccess(res, dataSources);
  } catch (error) {
    logControllerError('Error fetching data sources', error);
    return sendServerError(res, 'Failed to fetch data sources');
  }
};

/**
 * Get available report templates
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const templates = Object.keys(REPORT_TEMPLATES).map(key => ({
      id: key,
      name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      config: REPORT_TEMPLATES[key]
    }));

    return sendSuccess(res, templates);
  } catch (error) {
    logControllerError('Error fetching templates', error);
    return sendServerError(res, 'Failed to fetch templates');
  }
};

/**
 * Create a new custom report
 */
export const createReport = async (req: Request, res: Response) => {
  try {
    const { name, description, category, queryConfig, isPublic, isTemplate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Validate query config
    const validation = queryBuilderService.validateQueryConfig(queryConfig);
    if (!validation.valid) {
      return sendBadRequest(res, 'Invalid query configuration');
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    const report = await customReportsService.createReportDefinition({
      userId,
      name,
      description,
      category: category || 'CUSTOM',
      queryConfig,
      isPublic: isPublic || false,
      isTemplate: isTemplate || false,
    });

    // Create initial version
    await customReportsService.createReportVersion(
      report.id,
      1,
      queryConfig,
      userId,
      'Initial version'
    );

    return sendCreated(res, report);
  } catch (error) {
    logControllerError('Error creating report', error);
    return sendServerError(res, 'Failed to create report');
  }
};

/**
 * Get all reports for current user
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { category, isTemplate, includePublic } = req.query;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const reports = await customReportsService.getReportsList({
      userId,
      category: category as string,
      isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
      includePublic: includePublic === 'true',
    });

    return sendSuccess(res, reports);
  } catch (error) {
    logControllerError('Error fetching reports', error);
    return sendServerError(res, 'Failed to fetch reports');
  }
};

/**
 * Get a single report by ID
 */
export const getReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const report = await customReportsService.findReportByIdWithAccess(id, userId);

    if (!report) {
      return sendNotFound(res, 'Report');
    }

    return sendSuccess(res, report);
  } catch (error) {
    logControllerError('Error fetching report', error);
    return sendServerError(res, 'Failed to fetch report');
  }
};

/**
 * Update a report
 */
export const updateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, queryConfig, isPublic, changeNote } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const existingReport = await customReportsService.findReportByIdAndOwner(id, userId);

    if (!existingReport) {
      return sendNotFound(res, 'Report');
    }

    // Validate query config if provided
    if (queryConfig) {
      const validation = queryBuilderService.validateQueryConfig(queryConfig);
      if (!validation.valid) {
        return sendBadRequest(res, 'Invalid query configuration');
      }
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    const report = await customReportsService.updateReportDefinition(id, {
      name,
      description,
      category,
      queryConfig,
      isPublic,
    });

    // Create new version if query config changed
    if (queryConfig) {
      const latestVersionNumber = await customReportsService.getLatestVersionNumber(id);
      const newVersionNumber = latestVersionNumber + 1;

      await customReportsService.createReportVersion(
        id,
        newVersionNumber,
        queryConfig,
        userId,
        changeNote || 'Updated report configuration'
      );
    }

    return sendSuccess(res, report);
  } catch (error) {
    logControllerError('Error updating report', error);
    return sendServerError(res, 'Failed to update report');
  }
};

/**
 * Delete a report
 */
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const existingReport = await customReportsService.findReportByIdAndOwner(id, userId);

    if (!existingReport) {
      return sendNotFound(res, 'Report');
    }

    // Delete report (cascade will delete versions)
    await customReportsService.deleteReportDefinition(id);

    return sendSuccess(res, { message: 'Report deleted successfully' });
  } catch (error) {
    logControllerError('Error deleting report', error);
    return sendServerError(res, 'Failed to delete report');
  }
};

/**
 * Execute a report
 */
export const executeReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filters, limit, offset } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const report = await customReportsService.findReportByIdWithAccessBasic(id, userId);

    if (!report) {
      return sendNotFound(res, 'Report');
    }

    // Merge custom filters with report filters
    const queryConfig = { ...(report.queryConfig as Record<string, any>) } as QueryConfig;
    if (filters && Array.isArray(filters)) {
      queryConfig.filters = [...(queryConfig.filters || []), ...filters];
    }
    if (limit) {
      queryConfig.limit = limit;
    }
    if (offset) {
      queryConfig.offset = offset;
    }

    // Execute query
    let results;
    if (queryConfig.groupBy && queryConfig.groupBy.length > 0) {
      results = await queryBuilderService.executeGroupedAggregationQuery(queryConfig);
    } else if (queryConfig.aggregations && queryConfig.aggregations.length > 0 && !queryConfig.groupBy) {
      results = await queryBuilderService.executeAggregationQuery(queryConfig);
    } else {
      results = await queryBuilderService.executeQuery(queryConfig);
    }

    return sendSuccess(res, {
      report: {
        id: report.id,
        name: report.name,
        description: report.description
      },
      results,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    logControllerError('Error executing report', error);
    return sendServerError(res, 'Failed to execute report');
  }
};

/**
 * Clone a report
 */
export const cloneReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    const originalReport = await customReportsService.findReportByIdWithAccessBasic(id, userId);

    if (!originalReport) {
      return sendNotFound(res, 'Report');
    }

    // Create cloned report
    const clonedReport = await customReportsService.createReportDefinition({
      userId,
      name: name || `${originalReport.name} (Copy)`,
      description: originalReport.description || undefined,
      category: originalReport.category,
      queryConfig: originalReport.queryConfig as Prisma.InputJsonValue,
      isPublic: false,
      isTemplate: false,
    });

    // Create initial version for cloned report
    await customReportsService.createReportVersion(
      clonedReport.id,
      1,
      originalReport.queryConfig as Prisma.InputJsonValue,
      userId,
      `Cloned from report: ${originalReport.name}`
    );

    return sendCreated(res, clonedReport);
  } catch (error) {
    logControllerError('Error cloning report', error);
    return sendServerError(res, 'Failed to clone report');
  }
};

/**
 * Share a report (make public/private)
 */
export const shareReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const existingReport = await customReportsService.findReportByIdAndOwner(id, userId);

    if (!existingReport) {
      return sendNotFound(res, 'Report');
    }

    // Update sharing status
    const report = await customReportsService.updateReportSharing(id, isPublic);

    return sendSuccess(res, report);
  } catch (error) {
    logControllerError('Error sharing report', error);
    return sendServerError(res, 'Failed to share report');
  }
};

/**
 * Get report versions
 */
export const getReportVersions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const report = await customReportsService.findReportByIdWithAccessBasic(id, userId);

    if (!report) {
      return sendNotFound(res, 'Report');
    }

    // Get versions
    const versions = await customReportsService.getReportVersions(id);

    return sendSuccess(res, versions);
  } catch (error) {
    logControllerError('Error fetching versions', error);
    return sendServerError(res, 'Failed to fetch versions');
  }
};

/**
 * Rollback to a specific version
 */
export const rollbackToVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    const report = await customReportsService.findReportByIdAndOwner(id, userId);

    if (!report) {
      return sendNotFound(res, 'Report');
    }

    // Get version to rollback to
    const version = await customReportsService.findVersionByIdAndReport(versionId, id);

    if (!version) {
      return sendNotFound(res, 'Version');
    }

    // Update report with version's query config
    const updatedReport = await customReportsService.updateReportQueryConfig(
      id,
      version.queryConfig as Prisma.InputJsonValue
    );

    // Create new version for rollback
    const latestVersionNumber = await customReportsService.getLatestVersionNumber(id);

    await customReportsService.createReportVersion(
      id,
      latestVersionNumber + 1,
      version.queryConfig as Prisma.InputJsonValue,
      userId,
      `Rolled back to version ${version.versionNumber}`
    );

    return sendSuccess(res, updatedReport);
  } catch (error) {
    logControllerError('Error rolling back version', error);
    return sendServerError(res, 'Failed to rollback version');
  }
};

/**
 * Validate query configuration
 */
export const validateQuery = async (req: Request, res: Response) => {
  try {
    const { queryConfig } = req.body;

    const validation = queryBuilderService.validateQueryConfig(queryConfig);

    return sendSuccess(res, validation);
  } catch (error) {
    logControllerError('Error validating query', error);
    return sendServerError(res, 'Failed to validate query');
  }
};

/**
 * Preview query results
 */
export const previewQuery = async (req: Request, res: Response) => {
  try {
    const { queryConfig } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Validate query config
    const validation = queryBuilderService.validateQueryConfig(queryConfig);
    if (!validation.valid) {
      return sendBadRequest(res, 'Invalid query configuration');
    }

    // Limit preview to 10 rows
    const previewConfig = { ...queryConfig, limit: 10 };

    // Execute query
    let results;
    if (previewConfig.groupBy && previewConfig.groupBy.length > 0) {
      results = await queryBuilderService.executeGroupedAggregationQuery(previewConfig);
    } else if (previewConfig.aggregations && previewConfig.aggregations.length > 0 && !previewConfig.groupBy) {
      results = await queryBuilderService.executeAggregationQuery(previewConfig);
    } else {
      results = await queryBuilderService.executeQuery(previewConfig);
    }

    return sendSuccess(res, {
      results,
      rowCount: Array.isArray(results) ? results.length : 1,
      previewNote: 'Limited to 10 rows for preview'
    });
  } catch (error) {
    logControllerError('Error previewing query', error);
    return sendServerError(res, 'Failed to preview query');
  }
};
