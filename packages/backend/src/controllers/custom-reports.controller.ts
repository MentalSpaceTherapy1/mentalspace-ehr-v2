import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import queryBuilderService, { QueryConfig } from '../services/query-builder.service';

const prisma = new PrismaClient();

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
    res.json(dataSources);
  } catch (error) {
    console.error('Error fetching data sources:', error);
    res.status(500).json({ error: 'Failed to fetch data sources' });
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

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate query config
    const validation = queryBuilderService.validateQueryConfig(queryConfig);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid query configuration',
        details: validation.errors
      });
    }

    // Create report definition
    const report = await prisma.reportDefinition.create({
      data: {
        userId,
        name,
        description,
        category: category || 'CUSTOM',
        queryConfig,
        isPublic: isPublic || false,
        isTemplate: isTemplate || false
      }
    });

    // Create initial version
    await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        versionNumber: 1,
        queryConfig,
        changedBy: userId,
        changeNote: 'Initial version'
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = {
      OR: [
        { userId },
        ...(includePublic === 'true' ? [{ isPublic: true }] : [])
      ]
    };

    if (category) {
      where.category = category;
    }

    if (isTemplate !== undefined) {
      where.isTemplate = isTemplate === 'true';
    }

    const reports = await prisma.reportDefinition.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        versions: {
          take: 1,
          orderBy: { versionNumber: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const report = await prisma.reportDefinition.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            changedByUser: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user owns the report
    const existingReport = await prisma.reportDefinition.findFirst({
      where: { id, userId }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    // Validate query config if provided
    if (queryConfig) {
      const validation = queryBuilderService.validateQueryConfig(queryConfig);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid query configuration',
          details: validation.errors
        });
      }
    }

    // Update report
    const report = await prisma.reportDefinition.update({
      where: { id },
      data: {
        name,
        description,
        category,
        queryConfig,
        isPublic
      }
    });

    // Create new version if query config changed
    if (queryConfig) {
      const latestVersion = await prisma.reportVersion.findFirst({
        where: { reportId: id },
        orderBy: { versionNumber: 'desc' }
      });

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      await prisma.reportVersion.create({
        data: {
          reportId: id,
          versionNumber: newVersionNumber,
          queryConfig,
          changedBy: userId,
          changeNote: changeNote || 'Updated report configuration'
        }
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user owns the report
    const existingReport = await prisma.reportDefinition.findFirst({
      where: { id, userId }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    // Delete report (cascade will delete versions)
    await prisma.reportDefinition.delete({
      where: { id }
    });

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get report definition
    const report = await prisma.reportDefinition.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Merge custom filters with report filters
    const queryConfig = { ...report.queryConfig } as QueryConfig;
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

    res.json({
      report: {
        id: report.id,
        name: report.name,
        description: report.description
      },
      results,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error executing report:', error);
    res.status(500).json({ error: 'Failed to execute report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get original report
    const originalReport = await prisma.reportDefinition.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      }
    });

    if (!originalReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Create cloned report
    const clonedReport = await prisma.reportDefinition.create({
      data: {
        userId,
        name: name || `${originalReport.name} (Copy)`,
        description: originalReport.description,
        category: originalReport.category,
        queryConfig: originalReport.queryConfig,
        isPublic: false,
        isTemplate: false
      }
    });

    // Create initial version for cloned report
    await prisma.reportVersion.create({
      data: {
        reportId: clonedReport.id,
        versionNumber: 1,
        queryConfig: originalReport.queryConfig,
        changedBy: userId,
        changeNote: `Cloned from report: ${originalReport.name}`
      }
    });

    res.status(201).json(clonedReport);
  } catch (error) {
    console.error('Error cloning report:', error);
    res.status(500).json({ error: 'Failed to clone report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user owns the report
    const existingReport = await prisma.reportDefinition.findFirst({
      where: { id, userId }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    // Update sharing status
    const report = await prisma.reportDefinition.update({
      where: { id },
      data: { isPublic }
    });

    res.json(report);
  } catch (error) {
    console.error('Error sharing report:', error);
    res.status(500).json({ error: 'Failed to share report' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check access to report
    const report = await prisma.reportDefinition.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get versions
    const versions = await prisma.reportVersion.findMany({
      where: { reportId: id },
      include: {
        changedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { versionNumber: 'desc' }
    });

    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user owns the report
    const report = await prisma.reportDefinition.findFirst({
      where: { id, userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    // Get version to rollback to
    const version = await prisma.reportVersion.findFirst({
      where: { id: versionId, reportId: id }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Update report with version's query config
    const updatedReport = await prisma.reportDefinition.update({
      where: { id },
      data: { queryConfig: version.queryConfig }
    });

    // Create new version for rollback
    const latestVersion = await prisma.reportVersion.findFirst({
      where: { reportId: id },
      orderBy: { versionNumber: 'desc' }
    });

    await prisma.reportVersion.create({
      data: {
        reportId: id,
        versionNumber: (latestVersion?.versionNumber || 0) + 1,
        queryConfig: version.queryConfig,
        changedBy: userId,
        changeNote: `Rolled back to version ${version.versionNumber}`
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error rolling back version:', error);
    res.status(500).json({ error: 'Failed to rollback version' });
  }
};

/**
 * Validate query configuration
 */
export const validateQuery = async (req: Request, res: Response) => {
  try {
    const { queryConfig } = req.body;

    const validation = queryBuilderService.validateQueryConfig(queryConfig);

    res.json(validation);
  } catch (error) {
    console.error('Error validating query:', error);
    res.status(500).json({ error: 'Failed to validate query' });
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
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate query config
    const validation = queryBuilderService.validateQueryConfig(queryConfig);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid query configuration',
        details: validation.errors
      });
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

    res.json({
      results,
      rowCount: Array.isArray(results) ? results.length : 1,
      previewNote: 'Limited to 10 rows for preview'
    });
  } catch (error) {
    console.error('Error previewing query:', error);
    res.status(500).json({ error: 'Failed to preview query' });
  }
};
