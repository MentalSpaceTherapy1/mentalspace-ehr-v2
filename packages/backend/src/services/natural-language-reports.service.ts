import logger from '../utils/logger';
import anthropicService from './ai/anthropic.service';
import {
  generateCredentialingReport,
  generateTrainingComplianceReport,
  generatePolicyComplianceReport,
  generateIncidentAnalysisReport,
  generatePerformanceReport,
  generateAttendanceReport,
  generateFinancialReport,
  generateVendorReport,
  generatePracticeManagementDashboard,
  generateAuditTrailReport,
} from './reports.service';

/**
 * Natural Language Reports Service
 * Allows users to query reports using plain English
 */

// Parsed query structure
interface ParsedQuery {
  reportType: string;
  parameters: Record<string, any>;
  dateRange: { start: string; end: string } | null;
  explanation: string;
  confidence: number;
}

// Natural language report result
interface NaturalLanguageReportResult {
  success: boolean;
  query: string;
  interpretation: ParsedQuery;
  data: any;
  summary?: string;
  error?: string;
}

// Report type mapping
const REPORT_TYPE_MAP: Record<string, string> = {
  'revenue': 'financial',
  'financial': 'financial',
  'money': 'financial',
  'budget': 'financial',
  'expenses': 'financial',
  'credentialing': 'credentialing',
  'credentials': 'credentialing',
  'licenses': 'credentialing',
  'certifications': 'credentialing',
  'training': 'training',
  'ceu': 'training',
  'compliance': 'training',
  'policy': 'policy',
  'policies': 'policy',
  'acknowledgment': 'policy',
  'incident': 'incident',
  'incidents': 'incident',
  'safety': 'incident',
  'performance': 'performance',
  'productivity': 'performance',
  'kpi': 'performance',
  'no-show': 'performance',
  'noshow': 'performance',
  'attendance': 'attendance',
  'group': 'attendance',
  'vendor': 'vendor',
  'vendors': 'vendor',
  'suppliers': 'vendor',
  'audit': 'audit',
  'activity': 'audit',
  'logs': 'audit',
  'dashboard': 'dashboard',
  'overview': 'dashboard',
  'summary': 'dashboard',
};

// System prompt for query parsing
const SYSTEM_PROMPT = `You are a report query parser for a mental health EHR system.
Parse the user's natural language query into structured report parameters.

Available report types:
- financial: Revenue, expenses, budget reports (params: startDate, endDate, department, category)
- credentialing: Staff credentials, licenses, expirations (params: startDate, endDate, credentialType, verificationStatus, userId, includeExpiringSoon, daysUntilExpiration)
- training: Training compliance, CEU tracking (params: startDate, endDate, trainingType, category, userId, department, includeExpired)
- policy: Policy acknowledgments, compliance (params: startDate, endDate, category, status, department)
- incident: Incident reports, investigations (params: startDate, endDate, incidentType, severity, investigationStatus, department)
- performance: Staff performance metrics, KPIs (params: startDate, endDate, userId, department, metricType)
- attendance: Group attendance records (params: startDate, endDate, groupId, clientId)
- vendor: Vendor contracts, spend (params: category, isActive, includePerformance)
- audit: Audit trail, user activity (params: startDate, endDate, userId, entityType, action, ipAddress)
- dashboard: Practice management overview (params: startDate, endDate)

Date parsing rules:
- "last month" = previous calendar month
- "this month" = current calendar month
- "last quarter" = previous 3 months
- "this quarter" = current quarter
- "this year" = January 1 to today
- "last year" = previous calendar year
- "last 30 days" = past 30 days from today
- "last 90 days" = past 90 days from today
- Specific dates should be in YYYY-MM-DD format

Output JSON only:
{
  "reportType": "financial|credentialing|training|policy|incident|performance|attendance|vendor|audit|dashboard",
  "parameters": { /* report-specific params */ },
  "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } | null,
  "explanation": "Brief explanation of how you interpreted the query",
  "confidence": 0.0-1.0
}`;

/**
 * Parse natural language query using Claude
 */
async function parseNaturalLanguageQuery(query: string): Promise<ParsedQuery> {
  const today = new Date();
  const userPrompt = `Today's date is ${today.toISOString().split('T')[0]}.

Parse this query: "${query}"

Return only valid JSON with no additional text.`;

  try {
    const response = await anthropicService.generateCompletion(
      SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.3, maxTokens: 1000 }
    );

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedQuery;

    // Validate report type
    if (!isValidReportType(parsed.reportType)) {
      throw new Error(`Unknown report type: ${parsed.reportType}`);
    }

    return parsed;
  } catch (error: any) {
    logger.error('Error parsing natural language query:', { error: error.message, query });
    throw new Error(`Failed to parse query: ${error.message}`);
  }
}

/**
 * Check if report type is valid
 */
function isValidReportType(reportType: string): boolean {
  const validTypes = [
    'financial', 'credentialing', 'training', 'policy',
    'incident', 'performance', 'attendance', 'vendor',
    'audit', 'dashboard'
  ];
  return validTypes.includes(reportType);
}

/**
 * Convert date range strings to Date objects
 */
function parseDateRange(dateRange: { start: string; end: string } | null): { startDate?: Date; endDate?: Date } {
  if (!dateRange) return {};

  return {
    startDate: dateRange.start ? new Date(dateRange.start) : undefined,
    endDate: dateRange.end ? new Date(dateRange.end) : undefined,
  };
}

/**
 * Execute the appropriate report based on parsed query
 */
async function executeReport(parsedQuery: ParsedQuery): Promise<any> {
  const { reportType, parameters, dateRange } = parsedQuery;
  const dates = parseDateRange(dateRange);

  const reportParams = {
    ...parameters,
    ...dates,
  };

  logger.info('Executing natural language report:', { reportType, reportParams });

  switch (reportType) {
    case 'financial':
      return generateFinancialReport(reportParams);

    case 'credentialing':
      return generateCredentialingReport(reportParams);

    case 'training':
      return generateTrainingComplianceReport(reportParams);

    case 'policy':
      return generatePolicyComplianceReport(reportParams);

    case 'incident':
      return generateIncidentAnalysisReport(reportParams);

    case 'performance':
      return generatePerformanceReport(reportParams);

    case 'attendance':
      return generateAttendanceReport(reportParams);

    case 'vendor':
      return generateVendorReport(reportParams as any);

    case 'audit':
      return generateAuditTrailReport(reportParams);

    case 'dashboard':
      return generatePracticeManagementDashboard(reportParams);

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

/**
 * Generate a human-readable summary of the report results
 */
async function generateResultSummary(
  query: string,
  reportType: string,
  data: any
): Promise<string> {
  try {
    const summaryPrompt = `You are summarizing report results for a mental health practice manager.
Be concise (2-3 sentences max) and highlight the most important findings.

Original query: "${query}"
Report type: ${reportType}

Report summary data:
${JSON.stringify(data?.data?.summary || data?.summary || {}, null, 2)}

Provide a brief, actionable summary.`;

    const summary = await anthropicService.generateCompletion(
      'You are a helpful report summarizer. Be concise and focus on key metrics.',
      summaryPrompt,
      { temperature: 0.5, maxTokens: 200 }
    );

    return summary.trim();
  } catch (error) {
    logger.warn('Could not generate summary, returning default');
    return 'Report generated successfully. Please review the data below.';
  }
}

/**
 * Main function: Process natural language report query
 */
export async function processNaturalLanguageQuery(
  query: string
): Promise<NaturalLanguageReportResult> {
  logger.info('Processing natural language report query:', { query });

  try {
    // Step 1: Parse the query
    const parsedQuery = await parseNaturalLanguageQuery(query);
    logger.info('Parsed query:', { parsedQuery });

    // Step 2: Check confidence - if too low, ask for clarification
    if (parsedQuery.confidence < 0.5) {
      return {
        success: false,
        query,
        interpretation: parsedQuery,
        data: null,
        error: `I'm not confident about this query. ${parsedQuery.explanation} Please try rephrasing or be more specific.`,
      };
    }

    // Step 3: Execute the report
    const reportData = await executeReport(parsedQuery);

    // Step 4: Generate summary
    const summary = await generateResultSummary(query, parsedQuery.reportType, reportData);

    return {
      success: true,
      query,
      interpretation: parsedQuery,
      data: reportData,
      summary,
    };

  } catch (error: any) {
    logger.error('Error processing natural language query:', { error: error.message, query });

    return {
      success: false,
      query,
      interpretation: {
        reportType: 'unknown',
        parameters: {},
        dateRange: null,
        explanation: 'Failed to parse query',
        confidence: 0,
      },
      data: null,
      error: error.message || 'Failed to process query. Please try a different phrasing.',
    };
  }
}

/**
 * Get example queries for each report type
 */
export function getExampleQueries(): Record<string, string[]> {
  return {
    financial: [
      'Show me revenue for last month',
      'What are our expenses by category this quarter?',
      'Budget utilization this year',
    ],
    credentialing: [
      'Which credentials are expiring in the next 90 days?',
      'Show me pending credential verifications',
      'Staff licenses by type',
    ],
    training: [
      'Training compliance by department',
      'Who has overdue mandatory training?',
      'CEU completion rates this year',
    ],
    policy: [
      'Policy acknowledgment status',
      'Which policies need review?',
      'Compliance rates by department',
    ],
    incident: [
      'Critical incidents this quarter',
      'Open incident investigations',
      'Incident trends over the last year',
    ],
    performance: [
      'No-show rates by clinician last month',
      'Top performing providers this quarter',
      'KPI summary for my team',
    ],
    attendance: [
      'Group attendance rates this month',
      'Which groups have low attendance?',
      'Client attendance history',
    ],
    vendor: [
      'Active vendor contracts',
      'Vendors with expiring contracts',
      'Vendor spend by category',
    ],
    audit: [
      'User activity in the last 7 days',
      'Who accessed client records today?',
      'Failed login attempts this week',
    ],
    dashboard: [
      'Practice overview for this month',
      'Key metrics summary',
      'Current compliance status',
    ],
  };
}

/**
 * Suggest report type based on keywords (for autocomplete)
 */
export function suggestReportType(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const suggestions: string[] = [];

  for (const [keyword, reportType] of Object.entries(REPORT_TYPE_MAP)) {
    if (lowerQuery.includes(keyword)) {
      if (!suggestions.includes(reportType)) {
        suggestions.push(reportType);
      }
    }
  }

  return suggestions.length > 0 ? suggestions : ['dashboard'];
}

export default {
  processNaturalLanguageQuery,
  getExampleQueries,
  suggestReportType,
};
