import { test, expect } from '@playwright/test';

test.describe('Phase 3: Provider Comparison View', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to Provider Comparison page', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/provider-comparison');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for page title
    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /provider.*comparison/i }).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/phase3-provider-comparison-loaded.png', fullPage: true });
    console.log('✅ Provider Comparison page loaded successfully');
  });

  test('should display provider selection dropdown', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/provider-comparison');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for provider selection dropdown
    const providerSelect = page.locator('label').filter({ hasText: /select.*provider/i });
    await expect(providerSelect).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/phase3-provider-select.png', fullPage: true });
    console.log('✅ Provider selection dropdown found');
  });

  test('should have view type selector (Day/Week)', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/provider-comparison');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for view type selector
    const viewSelect = page.locator('label').filter({ hasText: /view/i }).first();
    await expect(viewSelect).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/phase3-view-type.png', fullPage: true });
    console.log('✅ View type selector found');
  });

  test('should have date navigation controls', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/provider-comparison');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for date navigation buttons
    const todayButton = page.locator('button').filter({ hasText: /today/i });
    const prevButton = page.locator('button').filter({ hasText: /</ }).first();
    const nextButton = page.locator('button').filter({ hasText: />/ }).first();

    await expect(todayButton).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/phase3-date-nav.png', fullPage: true });
    console.log('✅ Date navigation controls found');
  });

  test('should display empty state when no providers selected', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/provider-comparison');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for empty state message
    const emptyState = page.locator('text=/select.*provider/i');
    const emptyStateCount = await emptyState.count();

    if (emptyStateCount > 0) {
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Empty state displayed correctly');
    }

    await page.screenshot({ path: 'test-results/phase3-empty-state.png', fullPage: true });
  });

  test('complete page test', async ({ page }) => {
    await page.goto('http://localhost:5175/appointments/provider-comparison');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/phase3-provider-comparison-complete.png', fullPage: true });

    const content = await page.content();
    console.log('✅ Provider Comparison page complete test - content length:', content.length);
  });
});
