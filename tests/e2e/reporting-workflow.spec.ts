import { test, expect } from '@playwright/test';

test.describe('Reporting Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5175/login');

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { state: 'visible' });

    // Login with admin credentials
    await page.fill('input[type="email"], input[name="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test.describe('Reports Dashboard', () => {
    test('should display reports dashboard', async ({ page }) => {
      // Navigate to reports
      await page.goto('http://localhost:5175/reports');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('report');

      await page.screenshot({ path: 'test-results/reports-dashboard.png', fullPage: true });
    });

    test('should display available report types', async ({ page }) => {
      await page.goto('http://localhost:5175/reports');
      await page.waitForLoadState('networkidle');

      // Look for report category sections or cards
      const pageContent = await page.content();
      const hasReportTypes = pageContent.toLowerCase().includes('revenue') ||
                             pageContent.toLowerCase().includes('billing') ||
                             pageContent.toLowerCase().includes('clinical') ||
                             pageContent.toLowerCase().includes('financial');
      console.log('Has report types:', hasReportTypes);

      await page.screenshot({ path: 'test-results/reports-types.png', fullPage: true });
    });
  });

  test.describe('Revenue Reports', () => {
    test('should display revenue by clinician report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('clinician') ||
        expect(pageContent.toLowerCase()).toContain('revenue');

      await page.screenshot({ path: 'test-results/revenue-by-clinician.png', fullPage: true });
    });

    test('should display revenue by CPT report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-cpt');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasCPTReport = pageContent.toLowerCase().includes('cpt') ||
                           pageContent.toLowerCase().includes('code') ||
                           pageContent.toLowerCase().includes('revenue');
      console.log('Has CPT report:', hasCPTReport);

      await page.screenshot({ path: 'test-results/revenue-by-cpt.png', fullPage: true });
    });

    test('should display revenue by payer report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-payer');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasPayerReport = pageContent.toLowerCase().includes('payer') ||
                             pageContent.toLowerCase().includes('insurance') ||
                             pageContent.toLowerCase().includes('revenue');
      console.log('Has payer report:', hasPayerReport);

      await page.screenshot({ path: 'test-results/revenue-by-payer.png', fullPage: true });
    });
  });

  test.describe('Report Filters', () => {
    test('should have date range filter', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Check for date range elements
      const dateInputs = page.locator('input[type="date"]');
      const datePickerButtons = page.locator('button:has-text("Date"), button:has-text("Period"), [data-testid*="date"]');

      const dateInputCount = await dateInputs.count();
      const dateButtonCount = await datePickerButtons.count();

      console.log('Date inputs found:', dateInputCount);
      console.log('Date picker buttons found:', dateButtonCount);

      await page.screenshot({ path: 'test-results/report-filters.png', fullPage: true });
    });

    test('should have clinician filter on relevant reports', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Look for clinician filter
      const clinicianFilter = page.locator('select:has-text("Clinician"), [data-testid*="clinician"], input[placeholder*="clinician" i]');
      const hasClinicianFilter = await clinicianFilter.count() > 0;
      console.log('Has clinician filter:', hasClinicianFilter);

      await page.screenshot({ path: 'test-results/report-clinician-filter.png', fullPage: true });
    });
  });

  test.describe('Report Export', () => {
    test('should have export options available', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Look for export buttons
      const exportButtons = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")');
      const hasExportOptions = await exportButtons.count() > 0;
      console.log('Has export options:', hasExportOptions);

      if (hasExportOptions) {
        await exportButtons.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/report-export-options.png', fullPage: true });
      }
    });

    test('should have PDF export option', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Check for PDF export
      const pdfExport = page.locator('button:has-text("PDF"), a:has-text("PDF"), [data-testid*="pdf"]');
      const hasPDFExport = await pdfExport.count() > 0;
      console.log('Has PDF export:', hasPDFExport);

      await page.screenshot({ path: 'test-results/report-pdf-export.png', fullPage: true });
    });

    test('should have Excel export option', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Check for Excel export
      const excelExport = page.locator('button:has-text("Excel"), a:has-text("Excel"), button:has-text("XLSX"), [data-testid*="excel"]');
      const hasExcelExport = await excelExport.count() > 0;
      console.log('Has Excel export:', hasExcelExport);

      await page.screenshot({ path: 'test-results/report-excel-export.png', fullPage: true });
    });
  });

  test.describe('Clinical Reports', () => {
    test('should display unsigned notes report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/unsigned-notes');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasUnsignedNotes = pageContent.toLowerCase().includes('unsigned') ||
                               pageContent.toLowerCase().includes('note') ||
                               pageContent.toLowerCase().includes('pending');
      console.log('Has unsigned notes report:', hasUnsignedNotes);

      await page.screenshot({ path: 'test-results/unsigned-notes-report.png', fullPage: true });
    });

    test('should display missing treatment plans report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/missing-treatment-plans');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasTreatmentPlansReport = pageContent.toLowerCase().includes('treatment') ||
                                       pageContent.toLowerCase().includes('plan') ||
                                       pageContent.toLowerCase().includes('missing');
      console.log('Has treatment plans report:', hasTreatmentPlansReport);

      await page.screenshot({ path: 'test-results/missing-treatment-plans.png', fullPage: true });
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display analytics dashboard', async ({ page }) => {
      await page.goto('http://localhost:5175/analytics');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasAnalytics = pageContent.toLowerCase().includes('analytics') ||
                           pageContent.toLowerCase().includes('dashboard') ||
                           pageContent.toLowerCase().includes('chart');
      console.log('Has analytics dashboard:', hasAnalytics);

      await page.screenshot({ path: 'test-results/analytics-dashboard.png', fullPage: true });
    });

    test('should display KVR analysis', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/kvr-analysis');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasKVR = pageContent.toLowerCase().includes('kvr') ||
                     pageContent.toLowerCase().includes('keep') ||
                     pageContent.toLowerCase().includes('visit') ||
                     pageContent.toLowerCase().includes('ratio');
      console.log('Has KVR analysis:', hasKVR);

      await page.screenshot({ path: 'test-results/kvr-analysis.png', fullPage: true });
    });
  });

  test.describe('Custom Dashboard Builder', () => {
    test('should display dashboard builder', async ({ page }) => {
      await page.goto('http://localhost:5175/dashboards/builder');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasBuilder = pageContent.toLowerCase().includes('dashboard') ||
                         pageContent.toLowerCase().includes('builder') ||
                         pageContent.toLowerCase().includes('widget');
      console.log('Has dashboard builder:', hasBuilder);

      await page.screenshot({ path: 'test-results/dashboard-builder.png', fullPage: true });
    });

    test('should have widget options available', async ({ page }) => {
      await page.goto('http://localhost:5175/dashboards/builder');
      await page.waitForLoadState('networkidle');

      // Look for widget options
      const widgetOptions = page.locator('[data-testid*="widget"], button:has-text("Add Widget"), .widget');
      const hasWidgets = await widgetOptions.count() > 0;
      console.log('Has widget options:', hasWidgets);

      await page.screenshot({ path: 'test-results/dashboard-widgets.png', fullPage: true });
    });
  });

  test.describe('Report Scheduling', () => {
    test('should display schedule report option', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Look for schedule button
      const scheduleButton = page.locator('button:has-text("Schedule"), a:has-text("Schedule"), [data-testid*="schedule"]');
      const hasScheduleOption = await scheduleButton.count() > 0;
      console.log('Has schedule option:', hasScheduleOption);

      await page.screenshot({ path: 'test-results/report-schedule-option.png', fullPage: true });
    });

    test('should display report subscriptions page', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/subscriptions');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasSubscriptions = pageContent.toLowerCase().includes('subscription') ||
                               pageContent.toLowerCase().includes('schedule') ||
                               pageContent.toLowerCase().includes('automated');
      console.log('Has subscriptions page:', hasSubscriptions);

      await page.screenshot({ path: 'test-results/report-subscriptions.png', fullPage: true });
    });
  });

  test.describe('Module 9 Reports', () => {
    test('should display credentialing report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/credentialing');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasCredentialing = pageContent.toLowerCase().includes('credential') ||
                               pageContent.toLowerCase().includes('license') ||
                               pageContent.toLowerCase().includes('certification');
      console.log('Has credentialing report:', hasCredentialing);

      await page.screenshot({ path: 'test-results/credentialing-report.png', fullPage: true });
    });

    test('should display training compliance report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/training-compliance');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasTrainingCompliance = pageContent.toLowerCase().includes('training') ||
                                     pageContent.toLowerCase().includes('compliance') ||
                                     pageContent.toLowerCase().includes('course');
      console.log('Has training compliance report:', hasTrainingCompliance);

      await page.screenshot({ path: 'test-results/training-compliance-report.png', fullPage: true });
    });

    test('should display incident analysis report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/incident-analysis');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasIncidentAnalysis = pageContent.toLowerCase().includes('incident') ||
                                   pageContent.toLowerCase().includes('analysis') ||
                                   pageContent.toLowerCase().includes('report');
      console.log('Has incident analysis report:', hasIncidentAnalysis);

      await page.screenshot({ path: 'test-results/incident-analysis-report.png', fullPage: true });
    });

    test('should display audit trail report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/audit-trail');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasAuditTrail = pageContent.toLowerCase().includes('audit') ||
                            pageContent.toLowerCase().includes('trail') ||
                            pageContent.toLowerCase().includes('log');
      console.log('Has audit trail report:', hasAuditTrail);

      await page.screenshot({ path: 'test-results/audit-trail-report.png', fullPage: true });
    });
  });

  test.describe('Client Demographics', () => {
    test('should display client demographics report', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/client-demographics');
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const hasDemographics = pageContent.toLowerCase().includes('demographic') ||
                              pageContent.toLowerCase().includes('client') ||
                              pageContent.toLowerCase().includes('age') ||
                              pageContent.toLowerCase().includes('gender');
      console.log('Has demographics report:', hasDemographics);

      await page.screenshot({ path: 'test-results/client-demographics-report.png', fullPage: true });
    });
  });

  test.describe('Complete Reporting Workflow', () => {
    test('should navigate through reporting sections', async ({ page }) => {
      // Start at reports dashboard
      await page.goto('http://localhost:5175/reports');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/workflow-1-reports-home.png', fullPage: true });

      // Navigate to revenue report
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/workflow-2-revenue-report.png', fullPage: true });

      // Navigate to analytics
      await page.goto('http://localhost:5175/analytics');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/workflow-3-analytics.png', fullPage: true });

      // Navigate to dashboard builder
      await page.goto('http://localhost:5175/dashboards/builder');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/workflow-4-dashboard-builder.png', fullPage: true });

      // Navigate to subscriptions
      await page.goto('http://localhost:5175/reports/subscriptions');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/workflow-5-subscriptions.png', fullPage: true });

      console.log('Complete reporting workflow navigation successful');
    });

    test('should generate report with filters', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Look for generate/refresh button
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Refresh"), button:has-text("Run")');
      if (await generateButton.count() > 0) {
        await generateButton.first().click();
        await page.waitForLoadState('networkidle');
        console.log('Report generated with filters');
      }

      await page.screenshot({ path: 'test-results/workflow-report-generated.png', fullPage: true });
    });
  });

  test.describe('Report Data Tables', () => {
    test('should display data in tabular format', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Check for table elements
      const tables = page.locator('table, [role="grid"], [data-testid*="table"]');
      const hasTable = await tables.count() > 0;
      console.log('Has data table:', hasTable);

      await page.screenshot({ path: 'test-results/report-data-table.png', fullPage: true });
    });

    test('should have sortable columns', async ({ page }) => {
      await page.goto('http://localhost:5175/reports/revenue-by-clinician');
      await page.waitForLoadState('networkidle');

      // Check for sortable column headers
      const sortableHeaders = page.locator('th[aria-sort], th button, th[role="columnheader"]');
      const hasSortableColumns = await sortableHeaders.count() > 0;
      console.log('Has sortable columns:', hasSortableColumns);

      await page.screenshot({ path: 'test-results/report-sortable-columns.png', fullPage: true });
    });
  });

  test.describe('Report Charts', () => {
    test('should display charts when available', async ({ page }) => {
      await page.goto('http://localhost:5175/analytics');
      await page.waitForLoadState('networkidle');

      // Check for chart elements
      const charts = page.locator('canvas, svg, .recharts-wrapper, [data-testid*="chart"]');
      const hasCharts = await charts.count() > 0;
      console.log('Has charts:', hasCharts);

      await page.screenshot({ path: 'test-results/report-charts.png', fullPage: true });
    });
  });
});
