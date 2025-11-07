import { test, expect } from '@playwright/test';

test.describe('Phase 3: Room View', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to Room View page', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/room-view');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for page title
    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /room.*view/i }).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/phase3-room-view-loaded.png', fullPage: true });
    console.log('✅ Room View page loaded successfully');
  });

  test('should display view type selector', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/room-view');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for view type selector
    const viewSelect = page.locator('label').filter({ hasText: /view/i }).first();
    await expect(viewSelect).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/phase3-room-view-type.png', fullPage: true });
    console.log('✅ View type selector found');
  });

  test('should have date navigation controls', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/room-view');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for date navigation buttons
    const todayButton = page.locator('button').filter({ hasText: /today/i });
    await expect(todayButton).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/phase3-room-date-nav.png', fullPage: true });
    console.log('✅ Date navigation controls found');
  });

  test('should display summary statistics or empty state', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/room-view');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for summary statistics or empty state
    const hasSummary = await page.locator('text=/total.*room/i, text=/occupancy/i').count();
    const hasEmptyState = await page.locator('text=/no.*room/i, text=/no.*assignment/i').count();

    expect(hasSummary + hasEmptyState).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/phase3-room-summary.png', fullPage: true });
    console.log('✅ Room View summary or empty state displayed');
  });

  test('complete page test', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/room-view');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/phase3-room-view-complete.png', fullPage: true });

    const content = await page.content();
    console.log('✅ Room View page complete test - content length:', content.length);
  });
});
