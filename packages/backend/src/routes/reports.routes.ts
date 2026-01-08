import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  handleNaturalLanguageQuery,
  getQueryExamples,
  getSuggestions,
} from '../controllers/natural-language-reports.controller';
import {
  // Dashboard Quick Stats
  getReportQuickStats,

  // Financial Reports (15 reports)
  getRevenueByClinicianReport,
  getRevenueByCPTReport,
  getRevenueByPayerReport,
  getPaymentCollectionReport,
  getARAgingReport, // CRITICAL - AR Aging
  getClaimDenialAnalysisReport,
  getServiceLineProfitabilityReport,
  getPayerPerformanceScorecardReport,
  getRevenueVarianceReport,
  getCashFlowForecastReport,
  getWriteOffAnalysisReport,
  getFeeScheduleComplianceReport,
  getRevenueCycleMetricsReport,
  getFinancialSummaryDashboardReport,
  getBadDebtAnalysisReport,
  getContractualAdjustmentsReport,
  getRevenueByLocationReport,
  getRevenueByDiagnosisReport,
  getFinancialBenchmarkingReport,

  // Productivity Reports (2 reports)
  getKVRAnalysisReport,
  getSessionsPerDayReport,

  // Clinical Reports (10 reports)
  getTreatmentOutcomeTrendsReport,
  getDiagnosisDistributionReport,
  getTreatmentModalityEffectivenessReport,
  getCareGapIdentificationReport,
  getClinicalQualityMetricsReport,
  getPopulationHealthRiskStratificationReport,
  getProviderPerformanceComparisonReport,
  getClientProgressTrackingReport,
  getAssessmentScoreTrendsReport,
  getSupervisionHoursReport,

  // Operational Reports (10 reports)
  getSchedulingUtilizationHeatMapReport,
  getNoShowPatternAnalysisReport,
  getWaitTimeAnalyticsReport,
  getWorkflowEfficiencyMetricsReport,
  getResourceUtilizationTrackingReport,
  getClientFlowAnalysisReport,
  getRetentionRateTrackingReport,
  getReferralSourceAnalyticsReport,
  getCapacityPlanningReport,
  getBottleneckIdentificationReport,

  // Compliance Reports (5 reports)
  getUnsignedNotesReport,
  getMissingTreatmentPlansReport,
  getAuditTrailReport,
  getIncidentReportingReport,
  getGrantReportingTemplatesReport,
  getAccreditationReportsReport,
  getComplianceScorecardReport,

  // Demographics & Marketing Reports (5 reports)
  getClientDemographicsReport,
  getClientDemographicsDeepDiveReport,
  getPayerMixAnalysisReport,
  getMarketingCampaignROIReport,
  getClientSatisfactionAnalysisReport,
  getMarketShareAnalysisReport,

  // Additional Reports (5 reports)
  getStaffPerformanceDashboardReport,
  getTelehealthUtilizationReport,
  getCrisisInterventionReport,
  getMedicationManagementTrackingReport,
  getGroupTherapyAttendanceReport,

  // Module 9 Reports
  getCredentialingReport,
  getTrainingComplianceReport,
  getPolicyComplianceReport,
  getIncidentAnalysisReport,
  getPerformanceReport,
  getAttendanceReport,
  getFinancialReport,
  getVendorReport,
  getPracticeManagementDashboard
} from '../controllers/reports.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Quick stats for dashboard
router.get('/quick-stats', getReportQuickStats);

/**
 * NATURAL LANGUAGE REPORTS (AI-powered)
 * Query reports using plain English
 */
router.post('/natural-language', handleNaturalLanguageQuery);
router.get('/natural-language/examples', getQueryExamples);
router.get('/natural-language/suggest', getSuggestions);

/**
 * FINANCIAL REPORTS (15 routes)
 */
router.get('/revenue/by-clinician', getRevenueByClinicianReport);
router.get('/revenue/by-cpt', getRevenueByCPTReport);
router.get('/revenue/by-payer', getRevenueByPayerReport);
router.get('/revenue/collection', getPaymentCollectionReport);
router.get('/financial/ar-aging', getARAgingReport); // CRITICAL
router.get('/financial/claim-denial-analysis', getClaimDenialAnalysisReport);
router.get('/financial/service-line-profitability', getServiceLineProfitabilityReport);
router.get('/financial/payer-performance-scorecard', getPayerPerformanceScorecardReport);
router.get('/financial/revenue-variance', getRevenueVarianceReport);
router.get('/financial/cash-flow-forecast', getCashFlowForecastReport);
router.get('/financial/write-off-analysis', getWriteOffAnalysisReport);
router.get('/financial/fee-schedule-compliance', getFeeScheduleComplianceReport);
router.get('/financial/revenue-cycle-metrics', getRevenueCycleMetricsReport);
router.get('/financial/summary-dashboard', getFinancialSummaryDashboardReport);
router.get('/financial/bad-debt-analysis', getBadDebtAnalysisReport);
router.get('/financial/contractual-adjustments', getContractualAdjustmentsReport);
router.get('/financial/revenue-by-location', getRevenueByLocationReport);
router.get('/financial/revenue-by-diagnosis', getRevenueByDiagnosisReport);
router.get('/financial/benchmarking', getFinancialBenchmarkingReport);

/**
 * PRODUCTIVITY REPORTS (2 routes)
 */
router.get('/productivity/kvr-analysis', getKVRAnalysisReport);
router.get('/productivity/sessions-per-day', getSessionsPerDayReport);

/**
 * CLINICAL REPORTS (10 routes)
 */
router.get('/clinical/treatment-outcome-trends', getTreatmentOutcomeTrendsReport);
router.get('/clinical/diagnosis-distribution', getDiagnosisDistributionReport);
router.get('/clinical/treatment-modality-effectiveness', getTreatmentModalityEffectivenessReport);
router.get('/clinical/care-gap-identification', getCareGapIdentificationReport);
router.get('/clinical/quality-metrics', getClinicalQualityMetricsReport);
router.get('/clinical/population-health-risk-stratification', getPopulationHealthRiskStratificationReport);
router.get('/clinical/provider-performance-comparison', getProviderPerformanceComparisonReport);
router.get('/clinical/client-progress-tracking', getClientProgressTrackingReport);
router.get('/clinical/assessment-score-trends', getAssessmentScoreTrendsReport);
router.get('/clinical/supervision-hours', getSupervisionHoursReport);

/**
 * OPERATIONAL REPORTS (10 routes)
 */
router.get('/operational/scheduling-utilization-heat-map', getSchedulingUtilizationHeatMapReport);
router.get('/operational/no-show-pattern-analysis', getNoShowPatternAnalysisReport);
router.get('/operational/wait-time-analytics', getWaitTimeAnalyticsReport);
router.get('/operational/workflow-efficiency-metrics', getWorkflowEfficiencyMetricsReport);
router.get('/operational/resource-utilization-tracking', getResourceUtilizationTrackingReport);
router.get('/operational/client-flow-analysis', getClientFlowAnalysisReport);
router.get('/operational/retention-rate-tracking', getRetentionRateTrackingReport);
router.get('/operational/referral-source-analytics', getReferralSourceAnalyticsReport);
router.get('/operational/capacity-planning', getCapacityPlanningReport);
router.get('/operational/bottleneck-identification', getBottleneckIdentificationReport);

/**
 * COMPLIANCE REPORTS (5 routes)
 */
router.get('/compliance/unsigned-notes', getUnsignedNotesReport);
router.get('/compliance/missing-treatment-plans', getMissingTreatmentPlansReport);
router.get('/compliance/audit-trail', getAuditTrailReport);
router.get('/compliance/incident-reporting', getIncidentReportingReport);
router.get('/compliance/grant-reporting-templates', getGrantReportingTemplatesReport);
router.get('/compliance/accreditation-reports', getAccreditationReportsReport);
router.get('/compliance/compliance-scorecard', getComplianceScorecardReport);

/**
 * DEMOGRAPHICS & MARKETING REPORTS (5 routes)
 */
router.get('/demographics/client-demographics', getClientDemographicsReport);
router.get('/demographics/client-demographics-deep-dive', getClientDemographicsDeepDiveReport);
router.get('/demographics/payer-mix-analysis', getPayerMixAnalysisReport);
router.get('/marketing/campaign-roi', getMarketingCampaignROIReport);
router.get('/marketing/client-satisfaction-analysis', getClientSatisfactionAnalysisReport);
router.get('/marketing/market-share-analysis', getMarketShareAnalysisReport);

/**
 * ADDITIONAL REPORTS (5 routes)
 */
router.get('/additional/staff-performance-dashboard', getStaffPerformanceDashboardReport);
router.get('/additional/telehealth-utilization', getTelehealthUtilizationReport);
router.get('/additional/crisis-intervention', getCrisisInterventionReport);
router.get('/additional/medication-management-tracking', getMedicationManagementTrackingReport);
router.get('/additional/group-therapy-attendance', getGroupTherapyAttendanceReport);

/**
 * MODULE 9 REPORTS (10 routes)
 */
router.get('/module9/credentialing', getCredentialingReport);
router.get('/module9/training-compliance', getTrainingComplianceReport);
router.get('/module9/policy-compliance', getPolicyComplianceReport);
router.get('/module9/incident-analysis', getIncidentAnalysisReport);
router.get('/module9/performance', getPerformanceReport);
router.get('/module9/attendance', getAttendanceReport);
router.get('/module9/financial', getFinancialReport);
router.get('/module9/vendor', getVendorReport);
router.get('/module9/practice-management', getPracticeManagementDashboard);
router.get('/module9/audit-trail', getAuditTrailReport);

export default router;
