import express from 'express';
import {
  exportReportPDF,
  exportReportExcel,
  exportReportCSV,
  bulkExportReports,
  exportDashboard,
  downloadExport,
  listExportHistory,
  deleteExport,
  cleanupOldExports
} from '../controllers/export.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All export routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/reports/:id/export/pdf
 * @desc    Export report to PDF
 * @access  Private
 */
router.post('/reports/:id/export/pdf', exportReportPDF);

/**
 * @route   POST /api/v1/reports/:id/export/excel
 * @desc    Export report to Excel
 * @access  Private
 */
router.post('/reports/:id/export/excel', exportReportExcel);

/**
 * @route   POST /api/v1/reports/:id/export/csv
 * @desc    Export report to CSV
 * @access  Private
 */
router.post('/reports/:id/export/csv', exportReportCSV);

/**
 * @route   POST /api/v1/reports/bulk-export
 * @desc    Export multiple reports as ZIP
 * @access  Private
 */
router.post('/reports/bulk-export', bulkExportReports);

/**
 * @route   POST /api/v1/dashboards/:id/export/pdf
 * @desc    Export dashboard to PDF
 * @access  Private
 */
router.post('/dashboards/:id/export/pdf', exportDashboard);

/**
 * @route   GET /api/v1/exports/download/:filename
 * @desc    Download exported file
 * @access  Private
 */
router.get('/exports/download/:filename', downloadExport);

/**
 * @route   GET /api/v1/exports/history
 * @desc    List export history
 * @access  Private
 */
router.get('/exports/history', listExportHistory);

/**
 * @route   DELETE /api/v1/exports/:filename
 * @desc    Delete export file
 * @access  Private
 */
router.delete('/exports/:filename', deleteExport);

/**
 * @route   POST /api/v1/exports/cleanup
 * @desc    Clean up old export files
 * @access  Private (Admin only)
 */
router.post('/exports/cleanup', cleanupOldExports);

export default router;
