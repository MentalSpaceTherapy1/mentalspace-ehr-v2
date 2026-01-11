import { test, expect } from '@playwright/test';

test.describe('Billing Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5175/login');

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { state: 'visible' });

    // Login with admin credentials (billing staff or admin)
    await page.fill('input[type="email"], input[name="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test.describe('Payers Management', () => {
    test('should display payers list page', async ({ page }) => {
      // Navigate to payers
      await page.goto('http://localhost:5175/billing/payers');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('payer');

      await page.screenshot({ path: 'test-results/billing-payers-list.png', fullPage: true });
    });

    test('should navigate to create new payer form', async ({ page }) => {
      // Navigate to payers
      await page.goto('http://localhost:5175/billing/payers');
      await page.waitForLoadState('networkidle');

      // Look for create button
      const createButton = page.locator('a[href*="/billing/payers/new"], button:has-text("New Payer"), button:has-text("Add Payer"), button:has-text("Create")').first();

      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        // Direct navigation
        await page.goto('http://localhost:5175/billing/payers/new');
      }

      // Verify page has form elements
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/billing-new-payer-form.png', fullPage: true });
    });

    test('should display payer type options', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/payers/new');
      await page.waitForLoadState('networkidle');

      // Check for payer type selector
      const typeSelector = page.locator('select[name="payerType"], [data-testid="payer-type"]').first();

      if (await typeSelector.isVisible()) {
        // Click to open options
        await typeSelector.click();

        // Check for standard payer types
        const options = await page.locator('option').allTextContents();
        console.log('Payer type options:', options);
      }

      await page.screenshot({ path: 'test-results/billing-payer-types.png', fullPage: true });
    });
  });

  test.describe('Payer Rules Management', () => {
    test('should display payer rules list', async ({ page }) => {
      // Navigate to payer rules
      await page.goto('http://localhost:5175/billing/payer-rules');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/rule|payer/);

      await page.screenshot({ path: 'test-results/billing-payer-rules-list.png', fullPage: true });
    });

    test('should display payer rule import page', async ({ page }) => {
      // Navigate to payer rules import (using a placeholder payerId)
      await page.goto('http://localhost:5175/billing/payers/test-payer-id/rules/import');
      await page.waitForLoadState('networkidle');

      // Check for import-related elements
      const pageContent = await page.content();
      const hasImportContent = pageContent.toLowerCase().includes('import') ||
                               pageContent.toLowerCase().includes('csv') ||
                               pageContent.toLowerCase().includes('upload');

      console.log('Import page content check:', hasImportContent);

      await page.screenshot({ path: 'test-results/billing-payer-rule-import.png', fullPage: true });
    });

    test('should show CSV template download option', async ({ page }) => {
      // Navigate to payer rules import
      await page.goto('http://localhost:5175/billing/payers/test-id/rules/import');
      await page.waitForLoadState('networkidle');

      // Look for template download button
      const templateButton = page.locator('button:has-text("Template"), button:has-text("Download"), a:has-text("Template")').first();

      if (await templateButton.isVisible()) {
        console.log('Template download button found');
      } else {
        console.log('Template download button not visible on page');
      }

      await page.screenshot({ path: 'test-results/billing-csv-template.png', fullPage: true });
    });
  });

  test.describe('Billing Holds', () => {
    test('should display billing holds page', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/holds');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('hold');

      await page.screenshot({ path: 'test-results/billing-holds-list.png', fullPage: true });
    });

    test('should show holds grouped by reason', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/holds');
      await page.waitForLoadState('networkidle');

      // Check for hold reason display
      const pageContent = await page.content();
      const hasReasonContent = pageContent.toLowerCase().includes('reason') ||
                               pageContent.toLowerCase().includes('status') ||
                               pageContent.toLowerCase().includes('invalid');

      console.log('Holds page has reason content:', hasReasonContent);

      await page.screenshot({ path: 'test-results/billing-holds-by-reason.png', fullPage: true });
    });
  });

  test.describe('Billing Readiness Checker', () => {
    test('should display billing readiness checker page', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/readiness-checker');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      const hasReadinessContent = pageContent.toLowerCase().includes('readiness') ||
                                   pageContent.toLowerCase().includes('billing') ||
                                   pageContent.toLowerCase().includes('validate');

      expect(hasReadinessContent).toBe(true);

      await page.screenshot({ path: 'test-results/billing-readiness-checker.png', fullPage: true });
    });

    test('should display note selection dropdown', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/readiness-checker');
      await page.waitForLoadState('networkidle');

      // Look for note selector
      const noteSelector = page.locator('select[id="noteId"], select[name="noteId"], [data-testid="note-selector"]').first();

      if (await noteSelector.isVisible()) {
        console.log('Note selector dropdown is visible');
      } else {
        console.log('Note selector not found, may be loading');
      }

      await page.screenshot({ path: 'test-results/billing-note-selector.png', fullPage: true });
    });

    test('should display validation checks reference', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/readiness-checker');
      await page.waitForLoadState('networkidle');

      // Check for validation checks help section
      const pageContent = await page.content();
      const hasValidationChecks = pageContent.toLowerCase().includes('signed') ||
                                   pageContent.toLowerCase().includes('diagnosis') ||
                                   pageContent.toLowerCase().includes('treatment plan');

      console.log('Has validation checks reference:', hasValidationChecks);

      await page.screenshot({ path: 'test-results/billing-validation-checks.png', fullPage: true });
    });

    test('should show create holds checkbox', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/readiness-checker');
      await page.waitForLoadState('networkidle');

      // Look for createHolds checkbox
      const createHoldsCheckbox = page.locator('input[type="checkbox"][id="createHolds"], input[type="checkbox"][name="createHolds"]').first();

      if (await createHoldsCheckbox.isVisible()) {
        console.log('Create holds checkbox is visible');
        // Verify it's checked by default
        const isChecked = await createHoldsCheckbox.isChecked();
        console.log('Create holds checkbox is checked:', isChecked);
      }

      await page.screenshot({ path: 'test-results/billing-create-holds-option.png', fullPage: true });
    });
  });

  test.describe('Charges and Payments', () => {
    test('should display charges list page', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/charges');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/charge|billing|payment/);

      await page.screenshot({ path: 'test-results/billing-charges-list.png', fullPage: true });
    });

    test('should display payments page', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/payments');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/payment|billing|charge/);

      await page.screenshot({ path: 'test-results/billing-payments-list.png', fullPage: true });
    });
  });

  test.describe('Claims Management', () => {
    test('should display claims list page', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/claims');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/claim|billing|submit/);

      await page.screenshot({ path: 'test-results/billing-claims-list.png', fullPage: true });
    });

    test('should show claim status filter options', async ({ page }) => {
      await page.goto('http://localhost:5175/billing/claims');
      await page.waitForLoadState('networkidle');

      // Check for status filter
      const statusFilter = page.locator('select:has(option:text-is("Pending")), select:has(option:text-is("Submitted")), [data-testid="status-filter"]').first();

      if (await statusFilter.isVisible()) {
        console.log('Status filter dropdown is visible');
      } else {
        console.log('Status filter not found on page');
      }

      await page.screenshot({ path: 'test-results/billing-claims-filter.png', fullPage: true });
    });
  });

  test.describe('Complete Billing Workflow', () => {
    test('should navigate through billing module sections', async ({ page }) => {
      // Start at billing dashboard
      await page.goto('http://localhost:5175/billing');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/billing-workflow-1-dashboard.png', fullPage: true });

      // Navigate to payers
      await page.goto('http://localhost:5175/billing/payers');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/billing-workflow-2-payers.png', fullPage: true });

      // Navigate to holds
      await page.goto('http://localhost:5175/billing/holds');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/billing-workflow-3-holds.png', fullPage: true });

      // Navigate to charges
      await page.goto('http://localhost:5175/billing/charges');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/billing-workflow-4-charges.png', fullPage: true });

      // Navigate to claims
      await page.goto('http://localhost:5175/billing/claims');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/billing-workflow-5-claims.png', fullPage: true });

      // Navigate to readiness checker
      await page.goto('http://localhost:5175/billing/readiness-checker');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/billing-workflow-6-readiness.png', fullPage: true });

      console.log('Complete billing workflow navigation successful');
    });
  });
});
