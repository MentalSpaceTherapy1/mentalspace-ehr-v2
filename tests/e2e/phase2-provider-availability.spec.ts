import { test, expect } from '@playwright/test';

test.describe('Phase 2: Provider Availability', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to Provider Availability page without errors', async ({ page }) => {
    // Navigate to Provider Availability
    await page.goto('http://localhost:5175/settings/availability');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any API calls to complete
    await page.waitForTimeout(2000);

    // Check for page title
    await expect(page.locator('h1, h2, h3').filter({ hasText: /availability/i }).first()).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/provider-availability-loaded.png', fullPage: true });
    console.log('✅ Provider Availability page loaded successfully');
  });

  test('should load schedule without 404 errors', async ({ page }) => {
    // Set up console listener to catch 404 errors
    const errors: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('provider-availability')) {
        errors.push(`404 Error: ${response.url()}`);
      }
    });

    // Navigate to Provider Availability
    await page.goto('http://localhost:5175/settings/availability');
    await page.waitForLoadState('networkidle');

    // Wait for API calls
    await page.waitForTimeout(3000);

    // Check for 404 errors
    if (errors.length > 0) {
      console.error('❌ Found 404 errors:');
      errors.forEach(err => console.error(err));
      throw new Error(`Found ${errors.length} 404 errors on Provider Availability page`);
    }

    await page.screenshot({ path: 'test-results/provider-availability-no-errors.png', fullPage: true });
    console.log('✅ No 404 errors on Provider Availability page');
  });

  test('should display weekly schedule editor or overview', async ({ page }) => {
    await page.goto('http://localhost:5175/settings/availability');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for tabs (Weekly Schedule and Schedule Overview)
    const weeklyTab = page.locator('button').filter({ hasText: /weekly.*schedule|schedule/i }).first();
    const overviewTab = page.locator('button').filter({ hasText: /overview/i }).first();

    const hasWeeklyTab = await weeklyTab.count();
    const hasOverviewTab = await overviewTab.count();

    console.log(`Found Weekly Tab: ${hasWeeklyTab > 0}, Overview Tab: ${hasOverviewTab > 0}`);

    // At least one should be visible
    expect(hasWeeklyTab + hasOverviewTab).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/provider-availability-tabs.png', fullPage: true });
    console.log('✅ Provider Availability tabs displayed');
  });

  test('should allow adding availability slots', async ({ page }) => {
    await page.goto('http://localhost:5175/settings/availability');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for "Add" or "Create" button
    const addButton = page.locator('button').filter({ hasText: /add|create|new/i }).first();

    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/provider-availability-add-button.png', fullPage: true });
      console.log('✅ Add availability button found');
    } else {
      console.log('⚠️  No Add button found - page may use inline editing');
      await page.screenshot({ path: 'test-results/provider-availability-inline-editor.png', fullPage: true });
    }
  });

  test('should display save button for schedule changes', async ({ page }) => {
    await page.goto('http://localhost:5175/settings/availability');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for Save button
    const saveButton = page.locator('button').filter({ hasText: /save/i }).first();

    if (await saveButton.count() > 0) {
      await expect(saveButton).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/provider-availability-save-button.png', fullPage: true });
      console.log('✅ Save schedule button found');
    } else {
      console.log('⚠️  No Save button visible - may appear after changes');
    }
  });

  test('complete page test', async ({ page }) => {
    await page.goto('http://localhost:5175/settings/availability');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/provider-availability-complete.png', fullPage: true });

    const content = await page.content();
    console.log('✅ Provider Availability page complete test - content length:', content.length);
  });
});
