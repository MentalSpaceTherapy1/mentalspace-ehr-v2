import { Request, Response } from 'express';
import logger from '../utils/logger';
// Phase 3.2: Removed unused prisma import - all operations delegated to export services
import { exportReportToPDF, exportDashboardToPDF } from '../services/export-pdf.service';
import { exportReportToExcel, exportMultipleReportsToExcel } from '../services/export-excel.service';
import { exportReportToCSV } from '../services/export-csv.service';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

// Type definitions for export controller
interface MockResponse {
  json: (data: unknown) => unknown;
  status: (code: number) => { json: (data: unknown) => unknown };
}

interface ReportData {
  [key: string]: unknown;
}

interface ReportResult {
  data?: ReportData;
}

interface QuickStatsData {
  data: ReportData;
}
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

const EXPORTS_DIR = path.join(__dirname, '../../exports');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Get report data by ID and type
 */
async function getReportData(reportId: string, reportType: string, req: Request): Promise<ReportData | undefined> {
  const { startDate, endDate, clinicianId } = req.query;

  // Import report controllers dynamically
  const reportsController = await import('./reports.controller');

  // Create a mock response to capture data
  const mockRes: MockResponse = {
    json: (data: unknown) => data,
    status: (code: number) => ({
      json: (data: unknown) => {
        if (code !== 200) {
          const errorData = data as { message?: string };
          throw new Error(errorData.message || 'Failed to fetch report data');
        }
        return data;
      }
    })
  };

  const mockReq = {
    ...req,
    query: { startDate, endDate, clinicianId }
  };

  let result;

  switch (reportType) {
    case 'revenue-by-clinician':
      result = await reportsController.getRevenueByClinicianReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'revenue-by-cpt':
      result = await reportsController.getRevenueByCPTReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'revenue-by-payer':
      result = await reportsController.getRevenueByPayerReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'payment-collection':
      result = await reportsController.getPaymentCollectionReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'kvr-analysis':
      result = await reportsController.getKVRAnalysisReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'sessions-per-day':
      result = await reportsController.getSessionsPerDayReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'unsigned-notes':
      result = await reportsController.getUnsignedNotesReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'missing-treatment-plans':
      result = await reportsController.getMissingTreatmentPlansReport(mockReq as unknown as Request, mockRes as Response);
      break;
    case 'client-demographics':
      result = await reportsController.getClientDemographicsReport(mockReq as unknown as Request, mockRes as Response);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  return (result as ReportResult | undefined)?.data;
}

/**
 * Export report to PDF
 */
export async function exportReportPDF(req: Request, res: Response) {
  try {
    const { id: reportId } = req.params;
    const { reportType } = req.body;

    if (!reportType) {
      return sendBadRequest(res, 'Report type is required');
    }

    logger.info(`Exporting report ${reportId} to PDF (type: ${reportType})`);

    // Get report data
    const reportData = await getReportData(reportId, reportType, req);

    // Generate PDF
    const result = await exportReportToPDF(reportId, reportType, reportData);

    // Return download URL
    return sendSuccess(res, {
      filename: result.filename,
      downloadUrl: `/api/v1/exports/download/${result.filename}`,
      size: result.size,
      format: 'PDF'
    });
  } catch (error) {
    logger.error('Error exporting report to PDF:', error);
    return sendServerError(res, 'Failed to export report to PDF');
  }
}

/**
 * Export report to Excel
 */
export async function exportReportExcel(req: Request, res: Response) {
  try {
    const { id: reportId } = req.params;
    const { reportType } = req.body;

    if (!reportType) {
      return sendBadRequest(res, 'Report type is required');
    }

    logger.info(`Exporting report ${reportId} to Excel (type: ${reportType})`);

    // Get report data
    const reportData = await getReportData(reportId, reportType, req);

    // Generate Excel
    const result = await exportReportToExcel(reportId, reportType, reportData);

    // Return download URL
    return sendSuccess(res, {
      filename: result.filename,
      downloadUrl: `/api/v1/exports/download/${result.filename}`,
      size: result.size,
      format: 'Excel'
    });
  } catch (error) {
    logger.error('Error exporting report to Excel:', error);
    return sendServerError(res, 'Failed to export report to Excel');
  }
}

/**
 * Export report to CSV
 */
export async function exportReportCSV(req: Request, res: Response) {
  try {
    const { id: reportId } = req.params;
    const { reportType } = req.body;

    if (!reportType) {
      return sendBadRequest(res, 'Report type is required');
    }

    logger.info(`Exporting report ${reportId} to CSV (type: ${reportType})`);

    // Get report data
    const reportData = await getReportData(reportId, reportType, req);

    // Generate CSV
    const result = await exportReportToCSV(reportId, reportType, reportData);

    // Return download URL
    return sendSuccess(res, {
      filename: result.filename,
      downloadUrl: `/api/v1/exports/download/${result.filename}`,
      size: result.size,
      format: 'CSV'
    });
  } catch (error) {
    logger.error('Error exporting report to CSV:', error);
    return sendServerError(res, 'Failed to export report to CSV');
  }
}

/**
 * Bulk export multiple reports as ZIP
 */
export async function bulkExportReports(req: Request, res: Response) {
  try {
    const { reports, format = 'pdf' } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return sendBadRequest(res, 'Reports array is required and must not be empty');
    }

    logger.info(`Bulk exporting ${reports.length} reports in ${format} format`);

    const exportedFiles: string[] = [];

    // Generate exports for each report
    for (const report of reports) {
      const reportData = await getReportData(report.reportId, report.reportType, req);

      let result;
      switch (format.toLowerCase()) {
        case 'pdf':
          result = await exportReportToPDF(report.reportId, report.reportType, reportData);
          break;
        case 'excel':
        case 'xlsx':
          result = await exportReportToExcel(report.reportId, report.reportType, reportData);
          break;
        case 'csv':
          result = await exportReportToCSV(report.reportId, report.reportType, reportData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      exportedFiles.push(result.filepath);
    }

    // Create ZIP archive
    const zipFilename = `bulk-export-${Date.now()}.zip`;
    const zipFilepath = path.join(EXPORTS_DIR, zipFilename);

    const output = fs.createWriteStream(zipFilepath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      throw err;
    });

    // Pipe archive to output file
    archive.pipe(output);

    // Add each file to archive
    exportedFiles.forEach(filepath => {
      const filename = path.basename(filepath);
      archive.file(filepath, { name: filename });
    });

    // Finalize archive
    await archive.finalize();

    // Wait for output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
    });

    const stats = fs.statSync(zipFilepath);

    // Clean up individual files
    exportedFiles.forEach(filepath => {
      try {
        fs.unlinkSync(filepath);
      } catch (error) {
        logger.warn(`Failed to delete temporary file: ${filepath}`, error);
      }
    });

    return sendSuccess(res, {
      filename: zipFilename,
      downloadUrl: `/api/v1/exports/download/${zipFilename}`,
      size: stats.size,
      format: 'ZIP',
      fileCount: exportedFiles.length
    });
  } catch (error) {
    logger.error('Error in bulk export:', error);
    return sendServerError(res, 'Failed to perform bulk export');
  }
}

/**
 * Export dashboard to PDF
 */
export async function exportDashboard(req: Request, res: Response) {
  try {
    const { id: dashboardId } = req.params;

    logger.info(`Exporting dashboard ${dashboardId} to PDF`);

    // Get dashboard data (quick stats)
    const reportsController = await import('./reports.controller');
    let statsData: QuickStatsData | undefined;
    const mockRes = {
      json: (data: unknown) => {
        statsData = data as QuickStatsData;
        return mockRes;
      },
      status: () => mockRes,
      setHeader: () => mockRes,
    } as unknown as Response;

    await reportsController.getReportQuickStats(req, mockRes);

    if (!statsData) {
      return sendServerError(res, 'Failed to retrieve dashboard data');
    }

    // Generate PDF
    const result = await exportDashboardToPDF(dashboardId, statsData.data);

    return sendSuccess(res, {
      filename: result.filename,
      downloadUrl: `/api/v1/exports/download/${result.filename}`,
      size: result.size,
      format: 'PDF'
    });
  } catch (error) {
    logger.error('Error exporting dashboard:', error);
    return sendServerError(res, 'Failed to export dashboard');
  }
}

/**
 * Download exported file
 */
export async function downloadExport(req: Request, res: Response) {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return sendBadRequest(res, 'Invalid filename');
    }

    const filepath = path.join(EXPORTS_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return sendNotFound(res, 'Export file');
    }

    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.zip': 'application/zip'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    // Clean up file after download (optional - could keep for history)
    fileStream.on('end', () => {
      logger.info(`File downloaded: ${filename}`);
      // Uncomment to delete file after download:
      // setTimeout(() => {
      //   fs.unlinkSync(filepath);
      // }, 5000);
    });
  } catch (error) {
    logger.error('Error downloading export:', error);
    return sendServerError(res, 'Failed to download export');
  }
}

/**
 * List export history
 */
export async function listExportHistory(req: Request, res: Response) {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Read exports directory
    const files = fs.readdirSync(EXPORTS_DIR);

    // Get file stats
    const exports = files
      .map(filename => {
        const filepath = path.join(EXPORTS_DIR, filename);
        const stats = fs.statSync(filepath);

        const ext = path.extname(filename).toLowerCase();
        const formatMap: Record<string, string> = {
          '.pdf': 'PDF',
          '.xlsx': 'Excel',
          '.csv': 'CSV',
          '.zip': 'ZIP'
        };

        return {
          filename,
          format: formatMap[ext] || 'Unknown',
          size: stats.size,
          createdAt: stats.birthtime,
          downloadUrl: `/api/v1/exports/download/${filename}`
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    return sendSuccess(res, {
      exports,
      total: files.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    logger.error('Error listing export history:', error);
    return sendServerError(res, 'Failed to list export history');
  }
}

/**
 * Delete export file
 */
export async function deleteExport(req: Request, res: Response) {
  try {
    const { filename } = req.params;

    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return sendBadRequest(res, 'Invalid filename');
    }

    const filepath = path.join(EXPORTS_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return sendNotFound(res, 'Export file');
    }

    // Delete file
    fs.unlinkSync(filepath);

    logger.info(`Export file deleted: ${filename}`);

    return sendSuccess(res, { message: 'Export file deleted successfully' });
  } catch (error) {
    logger.error('Error deleting export:', error);
    return sendServerError(res, 'Failed to delete export');
  }
}

/**
 * Clean up old exports (older than 30 days)
 */
export async function cleanupOldExports(req: Request, res: Response) {
  try {
    const daysToKeep = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const files = fs.readdirSync(EXPORTS_DIR);
    let deletedCount = 0;

    files.forEach(filename => {
      const filepath = path.join(EXPORTS_DIR, filename);
      const stats = fs.statSync(filepath);

      if (stats.birthtime < cutoffDate) {
        fs.unlinkSync(filepath);
        deletedCount++;
      }
    });

    logger.info(`Cleaned up ${deletedCount} old export files`);

    return sendSuccess(res, { message: `Deleted ${deletedCount} export file(s) older than ${daysToKeep} days` });
  } catch (error) {
    logger.error('Error cleaning up exports:', error);
    return sendServerError(res, 'Failed to clean up old exports');
  }
}

export default {
  exportReportPDF,
  exportReportExcel,
  exportReportCSV,
  bulkExportReports,
  exportDashboard,
  downloadExport,
  listExportHistory,
  deleteExport,
  cleanupOldExports
};
