import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const EXPORTS_DIR = path.join(__dirname, '../../exports');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

interface ExcelExportOptions {
  includeCharts?: boolean;
  includeFormatting?: boolean;
  multiSheet?: boolean;
}

/**
 * Export report to Excel
 */
export async function exportReportToExcel(
  reportId: string,
  reportType: string,
  data: any,
  options: ExcelExportOptions = {}
): Promise<{ filename: string; filepath: string; size: number }> {
  try {
    logger.info(`Generating Excel export for report ${reportId}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MentalSpace EHR V2';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Generate sheets based on report type
    switch (reportType) {
      case 'revenue-by-clinician':
        await generateRevenueByClinicianExcel(workbook, data);
        break;
      case 'revenue-by-cpt':
        await generateRevenueByCPTExcel(workbook, data);
        break;
      case 'revenue-by-payer':
        await generateRevenueByPayerExcel(workbook, data);
        break;
      case 'payment-collection':
        await generatePaymentCollectionExcel(workbook, data);
        break;
      case 'kvr-analysis':
        await generateKVRAnalysisExcel(workbook, data);
        break;
      case 'sessions-per-day':
        await generateSessionsPerDayExcel(workbook, data);
        break;
      case 'unsigned-notes':
        await generateUnsignedNotesExcel(workbook, data);
        break;
      case 'missing-treatment-plans':
        await generateMissingTreatmentPlansExcel(workbook, data);
        break;
      case 'client-demographics':
        await generateClientDemographicsExcel(workbook, data);
        break;
      // Module 9 Reports
      case 'credentialing':
      case 'training-compliance':
      case 'policy-compliance':
      case 'incident-analysis':
      case 'performance':
      case 'attendance':
      case 'financial':
      case 'vendor':
      case 'practice-management':
      case 'audit-trail':
        await generateGenericExcelReport(workbook, reportType, data);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Save to file
    const filename = `report-${reportType}-${reportId}-${Date.now()}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);
    await workbook.xlsx.writeFile(filepath);

    const stats = fs.statSync(filepath);

    logger.info(`Excel export generated successfully: ${filename}`);

    return {
      filename,
      filepath,
      size: stats.size
    };
  } catch (error) {
    logger.error('Error generating Excel export:', error);
    throw error;
  }
}

/**
 * Style header row
 */
function styleHeaderRow(worksheet: ExcelJS.Worksheet, rowNumber: number = 1): void {
  const headerRow = worksheet.getRow(rowNumber);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
}

/**
 * Auto-fit columns
 */
function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach(column => {
    if (column.values) {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 50);
    }
  });
}

/**
 * Add summary section
 */
function addSummarySection(
  worksheet: ExcelJS.Worksheet,
  title: string,
  data: Record<string, any>,
  startRow: number = 1
): number {
  let currentRow = startRow;

  // Title
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
  currentRow += 2;

  // Data rows
  Object.entries(data).forEach(([key, value]) => {
    worksheet.getCell(`A${currentRow}`).value = key;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };

    const valueCell = worksheet.getCell(`B${currentRow}`);
    valueCell.value = value;

    // Format currency
    if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('charge') || key.toLowerCase().includes('collect')) {
      valueCell.numFmt = '$#,##0.00';
    }

    // Format percentage
    if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('kvr')) {
      valueCell.numFmt = '0.0"%"';
      valueCell.value = typeof value === 'number' ? value / 100 : value;
    }

    currentRow++;
  });

  return currentRow + 2;
}

/**
 * Generate Revenue by Clinician Excel
 */
async function generateRevenueByClinicianExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Revenue by Clinician');
  const { report, period, totalRevenue, totalSessions } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'Revenue by Clinician Report',
    {
      'Report Period': `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`,
      'Total Revenue': totalRevenue,
      'Total Sessions': totalSessions,
      'Average Per Session': totalSessions > 0 ? totalRevenue / totalSessions : 0
    }
  );

  // Add data table
  worksheet.getCell(`A${currentRow}`).value = 'Clinician Performance Details';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
  currentRow += 2;

  // Headers
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = [
    'Clinician ID',
    'Clinician Name',
    'Roles',
    'Total Revenue',
    'Session Count',
    'Average Per Session'
  ];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.clinicianId,
      item.clinicianName,
      Array.isArray(item.roles) ? item.roles.join(', ') : item.roles,
      item.totalRevenue,
      item.sessionCount,
      item.averagePerSession
    ];

    // Format currency columns
    row.getCell(4).numFmt = '$#,##0.00';
    row.getCell(6).numFmt = '$#,##0.00';

    currentRow++;
  });

  // Add totals row
  const totalsRow = worksheet.getRow(currentRow);
  totalsRow.values = [
    '',
    'TOTAL',
    '',
    { formula: `SUM(D${headerRow + 1}:D${currentRow - 1})` },
    { formula: `SUM(E${headerRow + 1}:E${currentRow - 1})` },
    { formula: `AVERAGE(F${headerRow + 1}:F${currentRow - 1})` }
  ];
  totalsRow.font = { bold: true };
  totalsRow.getCell(4).numFmt = '$#,##0.00';
  totalsRow.getCell(6).numFmt = '$#,##0.00';

  autoFitColumns(worksheet);
}

/**
 * Generate Revenue by CPT Excel
 */
async function generateRevenueByCPTExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Revenue by CPT');
  const { report, period, totalRevenue } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'Revenue by CPT Code Report',
    {
      'Report Period': `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`,
      'Total Revenue': totalRevenue
    }
  );

  // Add data table
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = [
    'CPT Code',
    'Description',
    'Total Revenue',
    'Session Count',
    'Average Charge',
    '% of Total Revenue'
  ];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.cptCode,
      item.description,
      item.totalRevenue,
      item.sessionCount,
      item.averageCharge,
      totalRevenue > 0 ? item.totalRevenue / totalRevenue : 0
    ];

    row.getCell(3).numFmt = '$#,##0.00';
    row.getCell(5).numFmt = '$#,##0.00';
    row.getCell(6).numFmt = '0.0%';

    currentRow++;
  });

  autoFitColumns(worksheet);
}

/**
 * Generate Revenue by Payer Excel
 */
async function generateRevenueByPayerExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Revenue by Payer');
  const { report, period, totalRevenue } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'Revenue by Payer Report',
    {
      'Report Period': `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`,
      'Total Revenue': totalRevenue
    }
  );

  // Add data table
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = [
    'Payer Name',
    'Total Revenue',
    'Session Count',
    'Average Per Session',
    '% of Total Revenue'
  ];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.payerName,
      item.totalRevenue,
      item.sessionCount,
      item.averagePerSession,
      item.percentage / 100
    ];

    row.getCell(2).numFmt = '$#,##0.00';
    row.getCell(4).numFmt = '$#,##0.00';
    row.getCell(5).numFmt = '0.0%';

    currentRow++;
  });

  autoFitColumns(worksheet);
}

/**
 * Generate Payment Collection Excel
 */
async function generatePaymentCollectionExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Payment Collection');
  const { period, totalCharged, totalCollected, outstanding, collectionRate } = data;

  addSummarySection(
    worksheet,
    'Payment Collection Report',
    {
      'Report Period': `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`,
      'Total Charged': totalCharged,
      'Total Collected': totalCollected,
      'Outstanding': outstanding,
      'Collection Rate': collectionRate
    }
  );

  autoFitColumns(worksheet);
}

/**
 * Generate KVR Analysis Excel
 */
async function generateKVRAnalysisExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('KVR Analysis');
  const { report, period, averageKVR } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'KVR Analysis Report',
    {
      'Report Period': `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`,
      'Average KVR': averageKVR
    }
  );

  // Add data table
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = [
    'Clinician Name',
    'Scheduled',
    'Kept',
    'Cancelled',
    'No Show',
    'KVR %'
  ];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.clinicianName,
      item.scheduled,
      item.kept,
      item.cancelled,
      item.noShow,
      item.kvr / 100
    ];

    row.getCell(6).numFmt = '0.0%';

    // Highlight low KVR
    if (item.kvr < 75) {
      row.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF2F2' }
      };
    }

    currentRow++;
  });

  autoFitColumns(worksheet);
}

/**
 * Generate Sessions Per Day Excel
 */
async function generateSessionsPerDayExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Sessions Per Day');
  const { report, period, totalSessions, daysWorked, averagePerDay } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'Sessions Per Day Report',
    {
      'Report Period': `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`,
      'Total Sessions': totalSessions,
      'Days Worked': daysWorked,
      'Average Per Day': averagePerDay
    }
  );

  // Add data table
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = ['Date', 'Session Count'];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [new Date(item.date), item.sessionCount];
    row.getCell(1).numFmt = 'mm/dd/yyyy';
    currentRow++;
  });

  autoFitColumns(worksheet);
}

/**
 * Generate Unsigned Notes Excel
 */
async function generateUnsignedNotesExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Unsigned Notes');
  const { report, totalUnsigned, criticalCount } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'Unsigned Notes Report',
    {
      'Total Unsigned': totalUnsigned,
      'Critical (>7 days)': criticalCount
    }
  );

  // Add data table
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = [
    'Note ID',
    'Client Name',
    'Clinician Name',
    'Session Date',
    'Note Type',
    'Status',
    'Days Overdue'
  ];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.noteId,
      item.clientName,
      item.clinicianName,
      new Date(item.sessionDate),
      item.noteType,
      item.status,
      item.daysOverdue
    ];

    row.getCell(4).numFmt = 'mm/dd/yyyy';

    // Highlight critical notes
    if (item.daysOverdue > 7) {
      row.getCell(7).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF2F2' }
      };
      row.getCell(7).font = { bold: true, color: { argb: 'FFDC2626' } };
    }

    currentRow++;
  });

  autoFitColumns(worksheet);
}

/**
 * Generate Missing Treatment Plans Excel
 */
async function generateMissingTreatmentPlansExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const worksheet = workbook.addWorksheet('Missing Treatment Plans');
  const { report, totalMissing, criticalCount } = data;

  // Add summary
  let currentRow = addSummarySection(
    worksheet,
    'Missing Treatment Plans Report',
    {
      'Total Missing': totalMissing,
      'Critical (>30 days overdue)': criticalCount
    }
  );

  // Add data table
  const headerRow = currentRow;
  worksheet.getRow(headerRow).values = [
    'Client ID',
    'Client Name',
    'Last Treatment Plan Date',
    'Days Overdue'
  ];
  styleHeaderRow(worksheet, headerRow);
  currentRow++;

  // Data rows
  report.forEach((item: any) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      item.clientId,
      item.clientName,
      item.lastTreatmentPlanDate ? new Date(item.lastTreatmentPlanDate) : 'Never',
      item.daysOverdue === 'Never' ? 'Never' : item.daysOverdue
    ];

    if (item.lastTreatmentPlanDate) {
      row.getCell(3).numFmt = 'mm/dd/yyyy';
    }

    // Highlight critical items
    if (typeof item.daysOverdue === 'number' && item.daysOverdue > 30) {
      row.getCell(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF2F2' }
      };
      row.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
    }

    currentRow++;
  });

  autoFitColumns(worksheet);
}

/**
 * Generate Client Demographics Excel
 */
async function generateClientDemographicsExcel(workbook: ExcelJS.Workbook, data: any): Promise<void> {
  const { totalActive, ageGroups, genderDistribution } = data;

  // Age Distribution Sheet
  const ageSheet = workbook.addWorksheet('Age Distribution');
  let currentRow = addSummarySection(
    ageSheet,
    'Client Demographics - Age Distribution',
    { 'Total Active Clients': totalActive }
  );

  const ageHeaderRow = currentRow;
  ageSheet.getRow(ageHeaderRow).values = ['Age Group', 'Count', 'Percentage'];
  styleHeaderRow(ageSheet, ageHeaderRow);
  currentRow++;

  Object.entries(ageGroups).forEach(([group, count]: [string, any]) => {
    const row = ageSheet.getRow(currentRow);
    row.values = [group, count, totalActive > 0 ? count / totalActive : 0];
    row.getCell(3).numFmt = '0.0%';
    currentRow++;
  });

  autoFitColumns(ageSheet);

  // Gender Distribution Sheet
  const genderSheet = workbook.addWorksheet('Gender Distribution');
  currentRow = addSummarySection(
    genderSheet,
    'Client Demographics - Gender Distribution',
    { 'Total Active Clients': totalActive }
  );

  const genderHeaderRow = currentRow;
  genderSheet.getRow(genderHeaderRow).values = ['Gender', 'Count', 'Percentage'];
  styleHeaderRow(genderSheet, genderHeaderRow);
  currentRow++;

  Object.entries(genderDistribution).forEach(([gender, count]: [string, any]) => {
    const row = genderSheet.getRow(currentRow);
    row.values = [
      gender.charAt(0).toUpperCase() + gender.slice(1),
      count,
      totalActive > 0 ? count / totalActive : 0
    ];
    row.getCell(3).numFmt = '0.0%';
    currentRow++;
  });

  autoFitColumns(genderSheet);
}

/**
 * Export multiple reports to a single Excel workbook
 */
export async function exportMultipleReportsToExcel(
  reports: Array<{ reportId: string; reportType: string; data: any }>,
  options: ExcelExportOptions = {}
): Promise<{ filename: string; filepath: string; size: number }> {
  try {
    logger.info(`Generating multi-report Excel export with ${reports.length} reports`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MentalSpace EHR V2';
    workbook.created = new Date();

    // Generate a sheet for each report
    for (const report of reports) {
      switch (report.reportType) {
        case 'revenue-by-clinician':
          await generateRevenueByClinicianExcel(workbook, report.data);
          break;
        case 'revenue-by-cpt':
          await generateRevenueByCPTExcel(workbook, report.data);
          break;
        case 'revenue-by-payer':
          await generateRevenueByPayerExcel(workbook, report.data);
          break;
        // Add other report types as needed
      }
    }

    const filename = `multi-report-${Date.now()}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);
    await workbook.xlsx.writeFile(filepath);

    const stats = fs.statSync(filepath);

    logger.info(`Multi-report Excel export generated successfully: ${filename}`);

    return {
      filename,
      filepath,
      size: stats.size
    };
  } catch (error) {
    logger.error('Error generating multi-report Excel export:', error);
    throw error;
  }
}

/**
 * Generate generic Excel report for Module 9 reports
 */
async function generateGenericExcelReport(workbook: ExcelJS.Workbook, reportType: string, data: any) {
  const worksheet = workbook.addWorksheet(reportType.replace(/-/g, ' ').toUpperCase());

  // Add title
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = reportType.replace(/-/g, ' ').toUpperCase();
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Add summary if available
  let currentRow = 3;
  const summary = data.summary || data.data?.summary;

  if (summary && typeof summary === 'object') {
    worksheet.getCell(`A${currentRow}`).value = 'SUMMARY';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow++;

    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value !== 'object' || value === null) {
        worksheet.getCell(`A${currentRow}`).value = key.replace(/([A-Z])/g, ' $1').trim();
        worksheet.getCell(`B${currentRow}`).value = value;
        currentRow++;
      }
    });

    currentRow += 2;
  }

  // Add detailed records
  const records = data.credentials || data.records || data.policies || data.incidents ||
                  data.userPerformance || data.vendors || data.logs ||
                  data.data?.credentials || data.data?.records || [];

  if (Array.isArray(records) && records.length > 0) {
    worksheet.getCell(`A${currentRow}`).value = 'DETAILS';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow++;

    // Get headers from first record
    const firstRecord = records[0];
    const headers = Object.keys(firstRecord).filter(key => typeof firstRecord[key] !== 'object' || firstRecord[key] === null);

    // Add header row
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header.replace(/([A-Z])/g, ' $1').trim();
    });
    styleHeaderRow(worksheet, currentRow);
    currentRow++;

    // Add data rows
    records.forEach(record => {
      headers.forEach((header, index) => {
        const value = record[header];
        const cell = worksheet.getCell(currentRow, index + 1);

        if (value instanceof Date) {
          cell.value = value;
          cell.numFmt = 'mm/dd/yyyy';
        } else if (typeof value === 'number') {
          cell.value = value;
          cell.numFmt = value % 1 === 0 ? '0' : '0.00';
        } else {
          cell.value = value !== null && value !== undefined ? String(value) : '';
        }
      });
      currentRow++;
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, cell => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });
  }
}

export default {
  exportReportToExcel,
  exportMultipleReportsToExcel
};
