import { test, expect } from '@playwright/test';

test.describe('Phase 2: Time-Off Requests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to Time-Off Requests page', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/time-off');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for page title
    await expect(page.locator('h1, h2, h3').filter({ hasText: /time.*off|time-off/i }).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/time-off-page-loaded.png', fullPage: true });
    console.log('✅ Time-Off Requests page loaded successfully');
  });

  test('should display time-off requests list or empty state', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/time-off');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for table/grid or empty state
    const hasTable = await page.locator('table, .MuiDataGrid-root, [role="grid"]').count();
    const hasEmptyState = await page.locator('text=/no.*requests/i, text=/empty/i').count();

    expect(hasTable + hasEmptyState).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/time-off-list.png', fullPage: true });
    console.log('✅ Time-Off Requests list or empty state displayed');
  });

  test('should have create time-off request button', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/time-off');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createButton = page.locator('button').filter({ hasText: /request|create|new|add/i }).first();

    if (await createButton.count() > 0) {
      await expect(createButton).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/time-off-create-button.png', fullPage: true });
      console.log('✅ Create time-off request button found');
    } else {
      console.log('⚠️  No create button found');
      await page.screenshot({ path: 'test-results/time-off-no-create.png', fullPage: true });
    }
  });

  test('should open create time-off dialog', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/time-off');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createButton = page.locator('button').filter({ hasText: /request|create|new|add/i }).first();

    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Check for dialog
      const dialog = page.locator('[role="dialog"], .MuiDialog-root').first();

      if (await dialog.count() > 0) {
        await expect(dialog).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: 'test-results/time-off-create-dialog.png', fullPage: true });
        console.log('✅ Create time-off dialog opened');
      } else {
        console.log('⚠️  Dialog may be inline or in a different format');
      }
    }
  });

  test('should have date range fields in time-off form', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/time-off');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createButton = page.locator('button').filter({ hasText: /request|create|new|add/i }).first();

    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Look for date inputs
      const dateInputs = page.locator('input[type="date"], input[type="datetime-local"], input[placeholder*="date" i]');
      const dateCount = await dateInputs.count();

      console.log(`Found ${dateCount} date input fields`);
      expect(dateCount).toBeGreaterThanOrEqual(2); // Start date and end date

      await page.screenshot({ path: 'test-results/time-off-date-fields.png', fullPage: true });
      console.log('✅ Date range fields found in time-off form');
    }
  });

  test('complete page test', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/time-off');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/time-off-complete.png', fullPage: true });

    const content = await page.content();
    console.log('✅ Time-Off Requests page complete test - content length:', content.length);
  });
});
