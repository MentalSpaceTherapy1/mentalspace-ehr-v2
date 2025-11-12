import { Request, Response } from 'express';
import logger from '../utils/logger';
import prisma from '../services/database';
import { exportReportToPDF, exportDashboardToPDF } from '../services/export-pdf.service';
import { exportReportToExcel, exportMultipleReportsToExcel } from '../services/export-excel.service';
import { exportReportToCSV } from '../services/export-csv.service';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

const EXPORTS_DIR = path.join(__dirname, '../../exports');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Get report data by ID and type
 */
async function getReportData(reportId: string, reportType: string, req: Request): Promise<any> {
  const { startDate, endDate, clinicianId } = req.query;

  // Import report controllers dynamically
  const reportsController = await import('./reports.controller');

  // Create a mock response to capture data
  const mockRes: any = {
    json: (data: any) => data,
    status: (code: number) => ({
      json: (data: any) => {
        if (code !== 200) {
          throw new Error(data.message || 'Failed to fetch report data');
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
      result = await reportsController.getRevenueByClinicianReport(mockReq as Request, mockRes as Response);
      break;
    case 'revenue-by-cpt':
      result = await reportsController.getRevenueByCPTReport(mockReq as Request, mockRes as Response);
      break;
    case 'revenue-by-payer':
      result = await reportsController.getRevenueByPayerReport(mockReq as Request, mockRes as Response);
      break;
    case 'payment-collection':
      result = await reportsController.getPaymentCollectionReport(mockReq as Request, mockRes as Response);
      break;
    case 'kvr-analysis':
      result = await reportsController.getKVRAnalysisReport(mockReq as Request, mockRes as Response);
      break;
    case 'sessions-per-day':
      result = await reportsController.getSessionsPerDayReport(mockReq as Request, mockRes as Response);
      break;
    case 'unsigned-notes':
      result = await reportsController.getUnsignedNotesReport(mockReq as Request, mockRes as Response);
      break;
    case 'missing-treatment-plans':
      result = await reportsController.getMissingTreatmentPlansReport(mockReq as Request, mockRes as Response);
      break;
    case 'client-demographics':
      result = await reportsController.getClientDemographicsReport(mockReq as Request, mockRes as Response);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  return result.data;
}

/**
 * Export report to PDF
 */
export async function exportReportPDF(req: Request, res: Response) {
  try {
    const { id: reportId } = req.params;
    const { reportType } = req.body;

    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    logger.info(`Exporting report ${reportId} to PDF (type: ${reportType})`);

    // Get report data
    const reportData = await getReportData(reportId, reportType, req);

    // Generate PDF
    const result = await exportReportToPDF(reportId, reportType, reportData);

    // Return download URL
    res.json({
      success: true,
      data: {
        filename: result.filename,
        downloadUrl: `/api/v1/exports/download/${result.filename}`,
        size: result.size,
        format: 'PDF'
      }
    });
  } catch (error) {
    logger.error('Error exporting report to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report to PDF',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    logger.info(`Exporting report ${reportId} to Excel (type: ${reportType})`);

    // Get report data
    const reportData = await getReportData(reportId, reportType, req);

    // Generate Excel
    const result = await exportReportToExcel(reportId, reportType, reportData);

    // Return download URL
    res.json({
      success: true,
      data: {
        filename: result.filename,
        downloadUrl: `/api/v1/exports/download/${result.filename}`,
        size: result.size,
        format: 'Excel'
      }
    });
  } catch (error) {
    logger.error('Error exporting report to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report to Excel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    logger.info(`Exporting report ${reportId} to CSV (type: ${reportType})`);

    // Get report data
    const reportData = await getReportData(reportId, reportType, req);

    // Generate CSV
    const result = await exportReportToCSV(reportId, reportType, reportData);

    // Return download URL
    res.json({
      success: true,
      data: {
        filename: result.filename,
        downloadUrl: `/api/v1/exports/download/${result.filename}`,
        size: result.size,
        format: 'CSV'
      }
    });
  } catch (error) {
    logger.error('Error exporting report to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report to CSV',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Bulk export multiple reports as ZIP
 */
export async function bulkExportReports(req: Request, res: Response) {
  try {
    const { reports, format = 'pdf' } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reports array is required and must not be empty'
      });
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
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
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

    res.json({
      success: true,
      data: {
        filename: zipFilename,
        downloadUrl: `/api/v1/exports/download/${zipFilename}`,
        size: stats.size,
        format: 'ZIP',
        fileCount: exportedFiles.length
      }
    });
  } catch (error) {
    logger.error('Error in bulk export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk export',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
    const mockRes: any = {
      json: (data: any) => data
    };

    const quickStats = await reportsController.getReportQuickStats(req, mockRes as Response);

    // Generate PDF
    const result = await exportDashboardToPDF(dashboardId, quickStats.data);

    res.json({
      success: true,
      data: {
        filename: result.filename,
        downloadUrl: `/api/v1/exports/download/${result.filename}`,
        size: result.size,
        format: 'PDF'
      }
    });
  } catch (error) {
    logger.error('Error exporting dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filepath = path.join(EXPORTS_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Export file not found'
      });
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
    res.status(500).json({
      success: false,
      message: 'Failed to download export',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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

    res.json({
      success: true,
      data: {
        exports,
        total: files.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Error listing export history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list export history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filepath = path.join(EXPORTS_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Export file not found'
      });
    }

    // Delete file
    fs.unlinkSync(filepath);

    logger.info(`Export file deleted: ${filename}`);

    res.json({
      success: true,
      message: 'Export file deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete export',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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

    res.json({
      success: true,
      message: `Deleted ${deletedCount} export file(s) older than ${daysToKeep} days`
    });
  } catch (error) {
    logger.error('Error cleaning up exports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up old exports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
