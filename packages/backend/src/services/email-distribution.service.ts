import nodemailer from 'nodemailer';
import { PrismaClient } from '@mentalspace/database';
import * as reportsService from './reports.service';
import { exportReportToPDF } from './export-pdf.service';
import { exportReportToExcel } from './export-excel.service';
import fs from 'fs';

const prisma = new PrismaClient();

interface EmailOptions {
  reportId: string;
  reportType: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  format: 'PDF' | 'EXCEL' | 'CSV';
  scheduleName: string;
  user: any;
  includeCharts?: boolean;
}

// Create transporter
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Fallback to console if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email Distribution] SMTP credentials not configured, using console output');
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix'
    });
  }

  return nodemailer.createTransport(config);
};

export async function sendReportEmail(options: EmailOptions): Promise<void> {
  const {
    reportId,
    reportType,
    recipients,
    cc = [],
    bcc = [],
    format,
    scheduleName,
    user,
    includeCharts = true
  } = options;

  console.log(`[Email Distribution] Preparing to send ${reportType} report to ${recipients.length} recipients`);

  try {
    // Generate report content based on format
    const reportContent = await generateReportContent(reportId, reportType, format);

    // Generate HTML email template
    const htmlContent = generateEmailTemplate({
      reportType,
      scheduleName,
      userName: `${user.firstName} ${user.lastName}`,
      format
    });

    // Prepare attachments
    const attachments = [
      {
        filename: `report-${reportType}-${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`,
        content: reportContent,
        contentType: getContentType(format)
      }
    ];

    // Add inline charts if requested
    if (includeCharts && format === 'PDF') {
      // Charts would be embedded in the PDF
      // For HTML emails, we can add chart images as inline attachments
      const chartImages = await generateChartImages(reportId, reportType);
      chartImages.forEach((chart, index) => {
        attachments.push({
          filename: `chart-${index}.png`,
          content: chart,
          contentType: 'image/png',
          cid: `chart${index}@mentalspace.com` // Content ID for inline embedding
        } as any);
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Send email
    const mailOptions = {
      from: `"MentalSpace Reports" <${process.env.SMTP_USER || 'reports@mentalspace.com'}>`,
      to: recipients.join(', '),
      cc: cc.length > 0 ? cc.join(', ') : undefined,
      bcc: bcc.length > 0 ? bcc.join(', ') : undefined,
      subject: `${scheduleName} - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email Distribution] Email sent successfully: ${info.messageId}`);
    console.log(`[Email Distribution] Recipients: ${recipients.join(', ')}`);
  } catch (error) {
    console.error('[Email Distribution] Failed to send email:', error);
    throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateReportContent(
  reportId: string,
  reportType: string,
  format: 'PDF' | 'EXCEL' | 'CSV'
): Promise<Buffer> {
  console.log(`[Email Distribution] Generating ${format} report for ${reportType}`);

  try {
    // Generate report data based on report type
    let reportData: any = {};
    const defaultParams = { startDate: getDefaultStartDate(), endDate: new Date() };

    switch (reportType) {
      case 'credentialing':
        reportData = await reportsService.generateCredentialingReport(defaultParams);
        break;
      case 'training-compliance':
        reportData = await reportsService.generateTrainingComplianceReport(defaultParams);
        break;
      case 'policy-compliance':
        reportData = await reportsService.generatePolicyComplianceReport(defaultParams);
        break;
      case 'incident-analysis':
        reportData = await reportsService.generateIncidentAnalysisReport(defaultParams);
        break;
      case 'audit-trail':
        reportData = await reportsService.generateAuditTrailReport(defaultParams);
        break;
      default:
        // For other report types, use a basic structure
        reportData = {
          success: true,
          data: {
            summary: { reportType, generatedAt: new Date().toISOString() },
            records: []
          }
        };
    }

    if (!reportData.success) {
      throw new Error(`Failed to generate report: ${reportData.error || 'Unknown error'}`);
    }

    // Export to requested format
    let exportResult: { filepath: string };

    switch (format) {
      case 'PDF':
        exportResult = await exportReportToPDF(reportId, reportType, reportData.data);
        break;
      case 'EXCEL':
        exportResult = await exportReportToExcel(reportId, reportType, reportData.data);
        break;
      case 'CSV':
        // For CSV, create a simple CSV from the data
        const csvContent = generateCSVFromData(reportData.data);
        return Buffer.from(csvContent, 'utf-8');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Read the generated file into a buffer
    const fileBuffer = fs.readFileSync(exportResult.filepath);

    // Clean up the temporary file
    try {
      fs.unlinkSync(exportResult.filepath);
    } catch (cleanupError) {
      console.warn('[Email Distribution] Could not clean up temporary file:', cleanupError);
    }

    return fileBuffer;
  } catch (error) {
    console.error('[Email Distribution] Error generating report content:', error);
    // Return a placeholder if report generation fails
    const content = `Report: ${reportType}\nGenerated: ${new Date().toISOString()}\nFormat: ${format}\n\nError generating report. Please contact support.`;
    return Buffer.from(content, 'utf-8');
  }
}

function getDefaultStartDate(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 1); // Default to last month
  return date;
}

function generateCSVFromData(data: any): string {
  const records = data.credentials || data.records || data.policies || data.incidents ||
                  data.logs || [];

  if (!Array.isArray(records) || records.length === 0) {
    return 'No data available';
  }

  // Get headers from first record
  const firstRecord = records[0];
  const headers = Object.keys(firstRecord).filter(key =>
    typeof firstRecord[key] !== 'object' || firstRecord[key] === null
  );

  // Create CSV header row
  const csvRows = [headers.join(',')];

  // Create data rows
  records.forEach(record => {
    const values = headers.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

async function generateChartImages(reportId: string, reportType: string): Promise<Buffer[]> {
  // This would generate chart images for inline embedding
  // For now, return empty array
  console.log(`[Email Distribution] Generating chart images for ${reportType}`);

  // TODO: Integrate with chart generation service
  // This should generate chart images that can be embedded inline

  return [];
}

function generateEmailTemplate(options: {
  reportType: string;
  scheduleName: string;
  userName: string;
  format: string;
}): string {
  const { reportType, scheduleName, userName, format } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MentalSpace Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 3px solid #4F46E5;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #4F46E5;
        }
        .content {
          margin-bottom: 30px;
        }
        .report-info {
          background-color: #F3F4F6;
          border-left: 4px solid #4F46E5;
          padding: 15px;
          margin: 20px 0;
        }
        .report-info p {
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          font-size: 12px;
          color: #6B7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MentalSpace</div>
          <p style="color: #6B7280; margin-top: 5px;">Electronic Health Records</p>
        </div>

        <div class="content">
          <h2>Your Scheduled Report is Ready</h2>
          <p>Hello,</p>
          <p>Your scheduled report has been generated and is attached to this email.</p>

          <div class="report-info">
            <p><strong>Report Type:</strong> ${reportType}</p>
            <p><strong>Schedule Name:</strong> ${scheduleName}</p>
            <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Format:</strong> ${format}</p>
            <p><strong>Requested By:</strong> ${userName}</p>
          </div>

          <p>The report is attached to this email as a ${format} file. Please review the attached document for detailed information.</p>

          <p style="margin-top: 20px;">
            <strong>Note:</strong> This is an automated report delivery. If you wish to unsubscribe or modify your report schedule, please log in to your MentalSpace account.
          </p>
        </div>

        <div class="footer">
          <p>This email was sent by MentalSpace EHR System</p>
          <p>If you have questions, please contact your system administrator</p>
          <p style="margin-top: 10px;">
            <small>This email may contain confidential and privileged information. If you are not the intended recipient, please notify the sender immediately and delete this email.</small>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getContentType(format: string): string {
  switch (format) {
    case 'PDF':
      return 'application/pdf';
    case 'EXCEL':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'CSV':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

export async function sendTestEmail(recipient: string): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"MentalSpace Reports" <${process.env.SMTP_USER || 'reports@mentalspace.com'}>`,
      to: recipient,
      subject: 'MentalSpace - Test Email',
      html: `
        <h2>Test Email from MentalSpace</h2>
        <p>This is a test email to verify email delivery is working correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Distribution] Test email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email Distribution] Test email failed:', error);
    return false;
  }
}

export async function sendBulkReportEmails(
  reports: Array<{
    reportId: string;
    reportType: string;
    recipients: string[];
    format: 'PDF' | 'EXCEL' | 'CSV';
    scheduleName: string;
    user: any;
  }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const report of reports) {
    try {
      await sendReportEmail(report);
      sent++;
    } catch (error) {
      failed++;
      errors.push(`Failed to send ${report.reportType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { sent, failed, errors };
}

export async function validateEmailConfiguration(): Promise<{
  configured: boolean;
  valid: boolean;
  error?: string;
}> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return {
      configured: false,
      valid: false,
      error: 'SMTP credentials not configured in environment variables'
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      configured: true,
      valid: true
    };
  } catch (error) {
    return {
      configured: true,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
