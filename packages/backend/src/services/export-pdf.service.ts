import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import prisma from './database';

const EXPORTS_DIR = path.join(__dirname, '../../exports');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

interface PDFExportOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeCharts?: boolean;
}

/**
 * Generate HTML content for a report
 */
async function generateReportHTML(reportId: string, reportType: string, data: any): Promise<string> {
  const timestamp = new Date().toLocaleString();

  let reportContent = '';

  switch (reportType) {
    case 'revenue-by-clinician':
      reportContent = generateRevenueByClinicianHTML(data);
      break;
    case 'revenue-by-cpt':
      reportContent = generateRevenueByCPTHTML(data);
      break;
    case 'revenue-by-payer':
      reportContent = generateRevenueByPayerHTML(data);
      break;
    case 'payment-collection':
      reportContent = generatePaymentCollectionHTML(data);
      break;
    case 'kvr-analysis':
      reportContent = generateKVRAnalysisHTML(data);
      break;
    case 'sessions-per-day':
      reportContent = generateSessionsPerDayHTML(data);
      break;
    case 'unsigned-notes':
      reportContent = generateUnsignedNotesHTML(data);
      break;
    case 'missing-treatment-plans':
      reportContent = generateMissingTreatmentPlansHTML(data);
      break;
    case 'client-demographics':
      reportContent = generateClientDemographicsHTML(data);
      break;
    // Module 9 Reports
    case 'credentialing':
      reportContent = generateGenericTableHTML('Credentialing Report', data);
      break;
    case 'training-compliance':
      reportContent = generateGenericTableHTML('Training Compliance Report', data);
      break;
    case 'policy-compliance':
      reportContent = generateGenericTableHTML('Policy Compliance Report', data);
      break;
    case 'incident-analysis':
      reportContent = generateGenericTableHTML('Incident Analysis Report', data);
      break;
    case 'performance':
      reportContent = generateGenericTableHTML('Performance Report', data);
      break;
    case 'attendance':
      reportContent = generateGenericTableHTML('Attendance Report', data);
      break;
    case 'financial':
      reportContent = generateGenericTableHTML('Financial Report', data);
      break;
    case 'vendor':
      reportContent = generateGenericTableHTML('Vendor Report', data);
      break;
    case 'practice-management':
      reportContent = generateGenericTableHTML('Practice Management Dashboard', data);
      break;
    case 'audit-trail':
      reportContent = generateGenericTableHTML('Audit Trail Report', data);
      break;
    default:
      reportContent = '<p>Unknown report type</p>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MentalSpace EHR Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 10pt;
          line-height: 1.5;
          color: #333;
          padding: 20px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .logo {
          font-size: 24pt;
          font-weight: bold;
          color: #2563eb;
        }

        .header-info {
          text-align: right;
          font-size: 9pt;
          color: #666;
        }

        h1 {
          color: #1e40af;
          font-size: 18pt;
          margin-bottom: 10px;
          font-weight: 600;
        }

        h2 {
          color: #1e3a8a;
          font-size: 14pt;
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        h3 {
          color: #1e40af;
          font-size: 12pt;
          margin-top: 15px;
          margin-bottom: 8px;
          font-weight: 600;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          background: white;
        }

        thead {
          background: #f3f4f6;
        }

        th {
          text-align: left;
          padding: 12px 10px;
          font-weight: 600;
          color: #1e3a8a;
          border-bottom: 2px solid #2563eb;
          font-size: 10pt;
        }

        td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        tr:hover {
          background: #f9fafb;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 20px 0;
        }

        .summary-card {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }

        .summary-card h3 {
          margin-top: 0;
          font-size: 11pt;
          color: #6b7280;
        }

        .summary-card .value {
          font-size: 20pt;
          font-weight: bold;
          color: #1e3a8a;
          margin-top: 5px;
        }

        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          font-size: 8pt;
          color: #6b7280;
          text-align: center;
        }

        .period {
          background: #eff6ff;
          padding: 10px;
          border-radius: 6px;
          margin: 15px 0;
          font-size: 10pt;
        }

        .alert {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
        }

        .alert.warning {
          background: #fffbeb;
          border-left-color: #f59e0b;
        }

        .alert.success {
          background: #f0fdf4;
          border-left-color: #10b981;
        }

        .text-center {
          text-align: center;
        }

        .text-right {
          text-align: right;
        }

        .font-bold {
          font-weight: 600;
        }

        .currency {
          color: #047857;
          font-weight: 600;
        }

        .percentage {
          color: #0891b2;
          font-weight: 600;
        }

        @media print {
          body {
            padding: 0;
          }

          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">MentalSpace EHR</div>
        <div class="header-info">
          <div>Generated: ${timestamp}</div>
          <div>Report ID: ${reportId}</div>
        </div>
      </div>

      ${reportContent}

      <div class="footer">
        <p>MentalSpace EHR V2 - Confidential Report</p>
        <p>This report contains protected health information and should be handled according to HIPAA regulations.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Revenue by Clinician HTML
 */
function generateRevenueByClinicianHTML(data: any): string {
  const { report, period, totalRevenue, totalSessions } = data;

  return `
    <h1>Revenue by Clinician Report</h1>

    <div class="period">
      <strong>Period:</strong> ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Revenue</h3>
        <div class="value currency">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-card">
        <h3>Total Sessions</h3>
        <div class="value">${totalSessions.toLocaleString()}</div>
      </div>
    </div>

    <h2>Clinician Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Clinician Name</th>
          <th class="text-right">Total Revenue</th>
          <th class="text-right">Session Count</th>
          <th class="text-right">Avg Per Session</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td>${item.clinicianName}</td>
            <td class="text-right currency">$${item.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">${item.sessionCount}</td>
            <td class="text-right currency">$${item.averagePerSession.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Revenue by CPT HTML
 */
function generateRevenueByCPTHTML(data: any): string {
  const { report, period, totalRevenue } = data;

  return `
    <h1>Revenue by CPT Code Report</h1>

    <div class="period">
      <strong>Period:</strong> ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}
    </div>

    <div class="summary-card">
      <h3>Total Revenue</h3>
      <div class="value currency">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>

    <h2>Revenue by Service Code</h2>
    <table>
      <thead>
        <tr>
          <th>CPT Code</th>
          <th>Description</th>
          <th class="text-right">Total Revenue</th>
          <th class="text-right">Session Count</th>
          <th class="text-right">Avg Charge</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td class="font-bold">${item.cptCode}</td>
            <td>${item.description}</td>
            <td class="text-right currency">$${item.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">${item.sessionCount}</td>
            <td class="text-right currency">$${item.averageCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Revenue by Payer HTML
 */
function generateRevenueByPayerHTML(data: any): string {
  const { report, period, totalRevenue } = data;

  return `
    <h1>Revenue by Payer Report</h1>

    <div class="period">
      <strong>Period:</strong> ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}
    </div>

    <div class="summary-card">
      <h3>Total Revenue</h3>
      <div class="value currency">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>

    <h2>Payer Mix Analysis</h2>
    <table>
      <thead>
        <tr>
          <th>Payer Name</th>
          <th class="text-right">Total Revenue</th>
          <th class="text-right">Session Count</th>
          <th class="text-right">Avg Per Session</th>
          <th class="text-right">% of Total</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td class="font-bold">${item.payerName}</td>
            <td class="text-right currency">$${item.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">${item.sessionCount}</td>
            <td class="text-right currency">$${item.averagePerSession.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right percentage">${item.percentage.toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Payment Collection HTML
 */
function generatePaymentCollectionHTML(data: any): string {
  const { period, totalCharged, totalCollected, outstanding, collectionRate } = data;

  return `
    <h1>Payment Collection Report</h1>

    <div class="period">
      <strong>Period:</strong> ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Charged</h3>
        <div class="value currency">$${totalCharged.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-card">
        <h3>Total Collected</h3>
        <div class="value currency">$${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-card">
        <h3>Outstanding</h3>
        <div class="value currency">$${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-card">
        <h3>Collection Rate</h3>
        <div class="value percentage">${collectionRate.toFixed(1)}%</div>
      </div>
    </div>

    ${collectionRate < 80 ? `
      <div class="alert warning">
        <strong>Warning:</strong> Collection rate is below industry standard (80%). Consider reviewing billing practices.
      </div>
    ` : ''}
  `;
}

/**
 * Generate KVR Analysis HTML
 */
function generateKVRAnalysisHTML(data: any): string {
  const { report, period, averageKVR } = data;

  return `
    <h1>KVR Analysis Report</h1>

    <div class="period">
      <strong>Period:</strong> ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}
    </div>

    <div class="summary-card">
      <h3>Average KVR</h3>
      <div class="value percentage">${averageKVR.toFixed(1)}%</div>
    </div>

    <h2>Clinician Keep/Visit Ratios</h2>
    <table>
      <thead>
        <tr>
          <th>Clinician Name</th>
          <th class="text-right">Scheduled</th>
          <th class="text-right">Kept</th>
          <th class="text-right">Cancelled</th>
          <th class="text-right">No Show</th>
          <th class="text-right">KVR</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td>${item.clinicianName}</td>
            <td class="text-right">${item.scheduled}</td>
            <td class="text-right">${item.kept}</td>
            <td class="text-right">${item.cancelled}</td>
            <td class="text-right">${item.noShow}</td>
            <td class="text-right percentage ${item.kvr < 75 ? 'alert' : ''}">${item.kvr.toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Sessions Per Day HTML
 */
function generateSessionsPerDayHTML(data: any): string {
  const { report, period, totalSessions, daysWorked, averagePerDay } = data;

  return `
    <h1>Sessions Per Day Report</h1>

    <div class="period">
      <strong>Period:</strong> ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Sessions</h3>
        <div class="value">${totalSessions.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Days Worked</h3>
        <div class="value">${daysWorked.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Average Per Day</h3>
        <div class="value">${averagePerDay.toFixed(1)}</div>
      </div>
    </div>

    <h2>Daily Session Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="text-right">Session Count</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td class="text-right">${item.sessionCount}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Unsigned Notes HTML
 */
function generateUnsignedNotesHTML(data: any): string {
  const { report, totalUnsigned, criticalCount } = data;

  return `
    <h1>Unsigned Notes Report</h1>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Unsigned</h3>
        <div class="value">${totalUnsigned}</div>
      </div>
      <div class="summary-card">
        <h3>Critical (>7 days)</h3>
        <div class="value ${criticalCount > 0 ? 'alert' : ''}">${criticalCount}</div>
      </div>
    </div>

    ${criticalCount > 0 ? `
      <div class="alert">
        <strong>Alert:</strong> ${criticalCount} note(s) exceed Georgia's 7-day signing requirement.
      </div>
    ` : ''}

    <h2>Unsigned Notes Details</h2>
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Clinician Name</th>
          <th>Session Date</th>
          <th>Note Type</th>
          <th>Status</th>
          <th class="text-right">Days Overdue</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td>${item.clientName}</td>
            <td>${item.clinicianName}</td>
            <td>${new Date(item.sessionDate).toLocaleDateString()}</td>
            <td>${item.noteType}</td>
            <td>${item.status}</td>
            <td class="text-right ${item.daysOverdue > 7 ? 'alert' : ''}">${item.daysOverdue}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Missing Treatment Plans HTML
 */
function generateMissingTreatmentPlansHTML(data: any): string {
  const { report, totalMissing, criticalCount } = data;

  return `
    <h1>Missing Treatment Plans Report</h1>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Missing</h3>
        <div class="value">${totalMissing}</div>
      </div>
      <div class="summary-card">
        <h3>Critical (>30 days overdue)</h3>
        <div class="value ${criticalCount > 0 ? 'alert' : ''}">${criticalCount}</div>
      </div>
    </div>

    ${criticalCount > 0 ? `
      <div class="alert">
        <strong>Alert:</strong> ${criticalCount} client(s) are significantly overdue for treatment plan updates.
      </div>
    ` : ''}

    <h2>Clients Needing Treatment Plans</h2>
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Last Treatment Plan Date</th>
          <th class="text-right">Days Overdue</th>
        </tr>
      </thead>
      <tbody>
        ${report.map((item: any) => `
          <tr>
            <td>${item.clientName}</td>
            <td>${item.lastTreatmentPlanDate ? new Date(item.lastTreatmentPlanDate).toLocaleDateString() : 'Never'}</td>
            <td class="text-right ${typeof item.daysOverdue === 'number' && item.daysOverdue > 30 ? 'alert' : ''}">${item.daysOverdue === 'Never' ? 'Never' : item.daysOverdue}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Client Demographics HTML
 */
function generateClientDemographicsHTML(data: any): string {
  const { totalActive, ageGroups, genderDistribution } = data;

  return `
    <h1>Client Demographics Report</h1>

    <div class="summary-card">
      <h3>Total Active Clients</h3>
      <div class="value">${totalActive}</div>
    </div>

    <h2>Age Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Age Group</th>
          <th class="text-right">Count</th>
          <th class="text-right">Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(ageGroups).map(([group, count]: [string, any]) => `
          <tr>
            <td>${group}</td>
            <td class="text-right">${count}</td>
            <td class="text-right percentage">${((count / totalActive) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Gender Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Gender</th>
          <th class="text-right">Count</th>
          <th class="text-right">Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(genderDistribution).map(([gender, count]: [string, any]) => `
          <tr>
            <td>${gender.charAt(0).toUpperCase() + gender.slice(1)}</td>
            <td class="text-right">${count}</td>
            <td class="text-right percentage">${((count / totalActive) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Export report to PDF
 */
export async function exportReportToPDF(
  reportId: string,
  reportType: string,
  data: any,
  options: PDFExportOptions = {}
): Promise<{ filename: string; filepath: string; size: number }> {
  try {
    logger.info(`Generating PDF export for report ${reportId}`);

    // Generate HTML content
    const htmlContent = await generateReportHTML(reportId, reportType, data);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      displayHeaderFooter: options.includeHeader || options.includeFooter,
      headerTemplate: options.includeHeader ? `
        <div style="font-size: 8px; width: 100%; text-align: center; padding: 5px;">
          MentalSpace EHR Report
        </div>
      ` : '',
      footerTemplate: options.includeFooter ? `
        <div style="font-size: 8px; width: 100%; text-align: center; padding: 5px;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      ` : ''
    });

    await browser.close();

    // Save PDF to file
    const filename = `report-${reportType}-${reportId}-${Date.now()}.pdf`;
    const filepath = path.join(EXPORTS_DIR, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const stats = fs.statSync(filepath);

    // Log export to database
    await logExport(reportId, reportType, 'PDF', filename, stats.size);

    logger.info(`PDF export generated successfully: ${filename}`);

    return {
      filename,
      filepath,
      size: stats.size
    };
  } catch (error) {
    logger.error('Error generating PDF export:', error);
    throw error;
  }
}

/**
 * Export dashboard to PDF
 */
export async function exportDashboardToPDF(
  dashboardId: string,
  data: any,
  options: PDFExportOptions = {}
): Promise<{ filename: string; filepath: string; size: number }> {
  try {
    logger.info(`Generating PDF export for dashboard ${dashboardId}`);

    // For dashboards, create a multi-page PDF with all widgets
    const timestamp = new Date().toLocaleString();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>MentalSpace EHR Dashboard</title>
        <style>
          /* Same styles as above */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; font-size: 10pt; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 24pt; font-weight: bold; color: #2563eb; }
          h1 { color: #1e40af; font-size: 18pt; margin-bottom: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .summary-card { background: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
          .summary-card h3 { font-size: 11pt; color: #6b7280; }
          .summary-card .value { font-size: 20pt; font-weight: bold; color: #1e3a8a; margin-top: 5px; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">MentalSpace EHR</div>
          <div class="header-info">
            <div>Generated: ${timestamp}</div>
            <div>Dashboard Export</div>
          </div>
        </div>

        <h1>Dashboard Overview</h1>

        <div class="summary-grid">
          ${data.metrics ? Object.entries(data.metrics).map(([key, value]: [string, any]) => `
            <div class="summary-card">
              <h3>${key.replace(/([A-Z])/g, ' $1').trim()}</h3>
              <div class="value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
            </div>
          `).join('') : ''}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });

    await browser.close();

    const filename = `dashboard-${dashboardId}-${Date.now()}.pdf`;
    const filepath = path.join(EXPORTS_DIR, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const stats = fs.statSync(filepath);

    logger.info(`Dashboard PDF export generated successfully: ${filename}`);

    return {
      filename,
      filepath,
      size: stats.size
    };
  } catch (error) {
    logger.error('Error generating dashboard PDF export:', error);
    throw error;
  }
}

/**
 * Generate generic HTML table for Module 9 reports
 */
function generateGenericTableHTML(title: string, data: any): string {
  const summary = data.summary || {};
  const records = data.credentials || data.records || data.policies || data.incidents ||
                  data.userPerformance || data.vendors || data.logs || [];

  let summaryHTML = '';
  if (Object.keys(summary).length > 0) {
    summaryHTML = `
      <div class="summary-section">
        <h2>Summary</h2>
        <div class="summary-grid">
          ${Object.entries(summary)
            .filter(([key, value]) => typeof value !== 'object')
            .map(([key, value]) => `
              <div class="summary-card">
                <div class="label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div class="value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  let tableHTML = '';
  if (Array.isArray(records) && records.length > 0) {
    const firstRecord = records[0];
    const headers = Object.keys(firstRecord).filter(key => typeof firstRecord[key] !== 'object');

    tableHTML = `
      <div class="table-section">
        <h2>Details</h2>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${records.slice(0, 100).map(record => `
              <tr>
                ${headers.map(header => {
                  const value = record[header];
                  const displayValue = value instanceof Date
                    ? value.toLocaleDateString()
                    : typeof value === 'number'
                    ? value.toLocaleString()
                    : value !== null && value !== undefined
                    ? String(value)
                    : '-';
                  return `<td>${displayValue}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${records.length > 100 ? `<p class="note">Showing first 100 of ${records.length} records</p>` : ''}
      </div>
    `;
  }

  return `
    <div class="report-header">
      <h1>${title}</h1>
      <div class="date">Generated: ${new Date().toLocaleString()}</div>
    </div>
    ${summaryHTML}
    ${tableHTML}
  `;
}

/**
 * Log export to database
 */
async function logExport(
  reportId: string,
  reportType: string,
  format: string,
  filename: string,
  fileSize: number
): Promise<void> {
  try {
    // Note: You would need to create an ExportLog model in Prisma schema
    // For now, we'll just log it
    logger.info('Export logged:', { reportId, reportType, format, filename, fileSize });
  } catch (error) {
    logger.error('Error logging export:', error);
  }
}

export default {
  exportReportToPDF,
  exportDashboardToPDF
};
