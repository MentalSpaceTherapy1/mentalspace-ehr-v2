import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const EXPORTS_DIR = path.join(__dirname, '../../exports');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Escape CSV value
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(headers: string[], data: any[]): string {
  const lines: string[] = [];

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';

  // Add header row
  lines.push(headers.map(escapeCSVValue).join(','));

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    });
    lines.push(values.join(','));
  });

  return BOM + lines.join('\n');
}

/**
 * Export report to CSV
 */
export async function exportReportToCSV(
  reportId: string,
  reportType: string,
  data: any
): Promise<{ filename: string; filepath: string; size: number }> {
  try {
    logger.info(`Generating CSV export for report ${reportId}`);

    let csvContent = '';

    switch (reportType) {
      case 'revenue-by-clinician':
        csvContent = generateRevenueByClinicianCSV(data);
        break;
      case 'revenue-by-cpt':
        csvContent = generateRevenueByCPTCSV(data);
        break;
      case 'revenue-by-payer':
        csvContent = generateRevenueByPayerCSV(data);
        break;
      case 'payment-collection':
        csvContent = generatePaymentCollectionCSV(data);
        break;
      case 'kvr-analysis':
        csvContent = generateKVRAnalysisCSV(data);
        break;
      case 'sessions-per-day':
        csvContent = generateSessionsPerDayCSV(data);
        break;
      case 'unsigned-notes':
        csvContent = generateUnsignedNotesCSV(data);
        break;
      case 'missing-treatment-plans':
        csvContent = generateMissingTreatmentPlansCSV(data);
        break;
      case 'client-demographics':
        csvContent = generateClientDemographicsCSV(data);
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
        csvContent = generateGenericCSV(data);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    const filename = `report-${reportType}-${reportId}-${Date.now()}.csv`;
    const filepath = path.join(EXPORTS_DIR, filename);

    // Write with UTF-8 encoding
    fs.writeFileSync(filepath, csvContent, { encoding: 'utf8' });

    const stats = fs.statSync(filepath);

    logger.info(`CSV export generated successfully: ${filename}`);

    return {
      filename,
      filepath,
      size: stats.size
    };
  } catch (error) {
    logger.error('Error generating CSV export:', error);
    throw error;
  }
}

/**
 * Generate Revenue by Clinician CSV
 */
function generateRevenueByClinicianCSV(data: any): string {
  const { report, period, totalRevenue, totalSessions } = data;

  const headers = [
    'clinicianId',
    'clinicianName',
    'roles',
    'totalRevenue',
    'sessionCount',
    'averagePerSession'
  ];

  const formattedData = report.map((item: any) => ({
    clinicianId: item.clinicianId,
    clinicianName: item.clinicianName,
    roles: Array.isArray(item.roles) ? item.roles.join('; ') : item.roles,
    totalRevenue: item.totalRevenue.toFixed(2),
    sessionCount: item.sessionCount,
    averagePerSession: item.averagePerSession.toFixed(2)
  }));

  let csv = `Revenue by Clinician Report\n`;
  csv += `Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}\n`;
  csv += `Total Revenue: $${totalRevenue.toFixed(2)}\n`;
  csv += `Total Sessions: ${totalSessions}\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Revenue by CPT CSV
 */
function generateRevenueByCPTCSV(data: any): string {
  const { report, period, totalRevenue } = data;

  const headers = [
    'cptCode',
    'description',
    'totalRevenue',
    'sessionCount',
    'averageCharge',
    'percentageOfTotal'
  ];

  const formattedData = report.map((item: any) => ({
    cptCode: item.cptCode,
    description: item.description,
    totalRevenue: item.totalRevenue.toFixed(2),
    sessionCount: item.sessionCount,
    averageCharge: item.averageCharge.toFixed(2),
    percentageOfTotal: totalRevenue > 0 ? ((item.totalRevenue / totalRevenue) * 100).toFixed(1) + '%' : '0%'
  }));

  let csv = `Revenue by CPT Code Report\n`;
  csv += `Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}\n`;
  csv += `Total Revenue: $${totalRevenue.toFixed(2)}\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Revenue by Payer CSV
 */
function generateRevenueByPayerCSV(data: any): string {
  const { report, period, totalRevenue } = data;

  const headers = [
    'payerName',
    'totalRevenue',
    'sessionCount',
    'averagePerSession',
    'percentage'
  ];

  const formattedData = report.map((item: any) => ({
    payerName: item.payerName,
    totalRevenue: item.totalRevenue.toFixed(2),
    sessionCount: item.sessionCount,
    averagePerSession: item.averagePerSession.toFixed(2),
    percentage: item.percentage.toFixed(1) + '%'
  }));

  let csv = `Revenue by Payer Report\n`;
  csv += `Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}\n`;
  csv += `Total Revenue: $${totalRevenue.toFixed(2)}\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Payment Collection CSV
 */
function generatePaymentCollectionCSV(data: any): string {
  const { period, totalCharged, totalCollected, outstanding, collectionRate } = data;

  let csv = `Payment Collection Report\n`;
  csv += `Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}\n`;
  csv += `\n`;
  csv += `Metric,Value\n`;
  csv += `Total Charged,$${totalCharged.toFixed(2)}\n`;
  csv += `Total Collected,$${totalCollected.toFixed(2)}\n`;
  csv += `Outstanding,$${outstanding.toFixed(2)}\n`;
  csv += `Collection Rate,${collectionRate.toFixed(1)}%\n`;

  return csv;
}

/**
 * Generate KVR Analysis CSV
 */
function generateKVRAnalysisCSV(data: any): string {
  const { report, period, averageKVR } = data;

  const headers = [
    'clinicianName',
    'scheduled',
    'kept',
    'cancelled',
    'noShow',
    'kvrPercentage'
  ];

  const formattedData = report.map((item: any) => ({
    clinicianName: item.clinicianName,
    scheduled: item.scheduled,
    kept: item.kept,
    cancelled: item.cancelled,
    noShow: item.noShow,
    kvrPercentage: item.kvr.toFixed(1) + '%'
  }));

  let csv = `KVR Analysis Report\n`;
  csv += `Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}\n`;
  csv += `Average KVR: ${averageKVR.toFixed(1)}%\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Sessions Per Day CSV
 */
function generateSessionsPerDayCSV(data: any): string {
  const { report, period, totalSessions, daysWorked, averagePerDay } = data;

  const headers = ['date', 'sessionCount'];

  const formattedData = report.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString(),
    sessionCount: item.sessionCount
  }));

  let csv = `Sessions Per Day Report\n`;
  csv += `Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}\n`;
  csv += `Total Sessions: ${totalSessions}\n`;
  csv += `Days Worked: ${daysWorked}\n`;
  csv += `Average Per Day: ${averagePerDay.toFixed(1)}\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Unsigned Notes CSV
 */
function generateUnsignedNotesCSV(data: any): string {
  const { report, totalUnsigned, criticalCount } = data;

  const headers = [
    'noteId',
    'clientName',
    'clinicianName',
    'sessionDate',
    'noteType',
    'status',
    'daysOverdue'
  ];

  const formattedData = report.map((item: any) => ({
    noteId: item.noteId,
    clientName: item.clientName,
    clinicianName: item.clinicianName,
    sessionDate: new Date(item.sessionDate).toLocaleDateString(),
    noteType: item.noteType,
    status: item.status,
    daysOverdue: item.daysOverdue
  }));

  let csv = `Unsigned Notes Report\n`;
  csv += `Total Unsigned: ${totalUnsigned}\n`;
  csv += `Critical (>7 days): ${criticalCount}\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Missing Treatment Plans CSV
 */
function generateMissingTreatmentPlansCSV(data: any): string {
  const { report, totalMissing, criticalCount } = data;

  const headers = [
    'clientId',
    'clientName',
    'lastTreatmentPlanDate',
    'daysOverdue'
  ];

  const formattedData = report.map((item: any) => ({
    clientId: item.clientId,
    clientName: item.clientName,
    lastTreatmentPlanDate: item.lastTreatmentPlanDate
      ? new Date(item.lastTreatmentPlanDate).toLocaleDateString()
      : 'Never',
    daysOverdue: item.daysOverdue === 'Never' ? 'Never' : item.daysOverdue
  }));

  let csv = `Missing Treatment Plans Report\n`;
  csv += `Total Missing: ${totalMissing}\n`;
  csv += `Critical (>30 days overdue): ${criticalCount}\n`;
  csv += `\n`;
  csv += arrayToCSV(headers, formattedData);

  return csv;
}

/**
 * Generate Client Demographics CSV
 */
function generateClientDemographicsCSV(data: any): string {
  const { totalActive, ageGroups, genderDistribution } = data;

  let csv = `Client Demographics Report\n`;
  csv += `Total Active Clients: ${totalActive}\n`;
  csv += `\n`;
  csv += `Age Distribution\n`;
  csv += `Age Group,Count,Percentage\n`;

  Object.entries(ageGroups).forEach(([group, count]: [string, any]) => {
    const percentage = totalActive > 0 ? ((count / totalActive) * 100).toFixed(1) : '0';
    csv += `${group},${count},${percentage}%\n`;
  });

  csv += `\n`;
  csv += `Gender Distribution\n`;
  csv += `Gender,Count,Percentage\n`;

  Object.entries(genderDistribution).forEach(([gender, count]: [string, any]) => {
    const percentage = totalActive > 0 ? ((count / totalActive) * 100).toFixed(1) : '0';
    const genderLabel = gender.charAt(0).toUpperCase() + gender.slice(1);
    csv += `${genderLabel},${count},${percentage}%\n`;
  });

  return csv;
}

/**
 * Export raw data to CSV (generic function)
 */
export async function exportRawDataToCSV(
  filename: string,
  headers: string[],
  data: any[]
): Promise<{ filename: string; filepath: string; size: number }> {
  try {
    logger.info(`Generating raw CSV export: ${filename}`);

    const csvContent = arrayToCSV(headers, data);

    const fullFilename = `${filename}-${Date.now()}.csv`;
    const filepath = path.join(EXPORTS_DIR, fullFilename);

    fs.writeFileSync(filepath, csvContent, { encoding: 'utf8' });

    const stats = fs.statSync(filepath);

    logger.info(`Raw CSV export generated successfully: ${fullFilename}`);

    return {
      filename: fullFilename,
      filepath,
      size: stats.size
    };
  } catch (error) {
    logger.error('Error generating raw CSV export:', error);
    throw error;
  }
}

/**
 * Generate generic CSV for Module 9 reports
 */
function generateGenericCSV(data: any): string {
  const records = data.credentials || data.records || data.policies || data.incidents ||
                  data.userPerformance || data.vendors || data.logs ||
                  data.data?.credentials || data.data?.records || [];

  if (!Array.isArray(records) || records.length === 0) {
    return '';
  }

  // Get headers from first record (exclude objects)
  const firstRecord = records[0];
  const headers = Object.keys(firstRecord).filter(key => {
    const value = firstRecord[key];
    return typeof value !== 'object' || value === null || value instanceof Date;
  });

  // Convert records to CSV-friendly format
  const csvData = records.map(record => {
    const row: any = {};
    headers.forEach(header => {
      const value = record[header];
      if (value instanceof Date) {
        row[header] = value.toLocaleDateString();
      } else if (typeof value === 'number') {
        row[header] = value;
      } else if (value !== null && value !== undefined) {
        row[header] = String(value);
      } else {
        row[header] = '';
      }
    });
    return row;
  });

  return arrayToCSV(headers, csvData);
}

export default {
  exportReportToCSV,
  exportRawDataToCSV
};
