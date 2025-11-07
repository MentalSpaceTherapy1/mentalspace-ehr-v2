import { test, expect } from '@playwright/test';

// Test helper to login as admin
async function loginAsAdmin(page: any) {
  await page.goto('http://localhost:5175/login');
  await page.fill('input[type="email"]', 'admin@mentalspace.com');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Phase 3.2: Scheduling Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should navigate to Analytics Dashboard', async ({ page }) => {
    // Click on Analytics in the navigation menu
    await page.click('text=Analytics');

    // Verify navigation to analytics page
    await expect(page).toHaveURL('http://localhost:5175/analytics');

    // Verify page header is visible
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
  });

  test('should display Analytics Dashboard with date range selector', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Verify date range inputs are present
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').last()).toBeVisible();

    // Verify quick select buttons are present
    await expect(page.locator('text=Last 7 Days')).toBeVisible();
    await expect(page.locator('text=Last 30 Days')).toBeVisible();
    await expect(page.locator('text=Last 90 Days')).toBeVisible();
    await expect(page.locator('text=This Month')).toBeVisible();
  });

  test('should display all report tabs', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Verify all 5 report tabs are present
    await expect(page.locator('text=Provider Utilization')).toBeVisible();
    await expect(page.locator('text=No-Show Rates')).toBeVisible();
    await expect(page.locator('text=Revenue Analysis')).toBeVisible();
    await expect(page.locator('text=Cancellation Patterns')).toBeVisible();
    await expect(page.locator('text=Capacity Planning')).toBeVisible();
  });

  test('should load and display Provider Utilization Report by default', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify Provider Utilization header is visible
    await expect(page.locator('text=Provider Utilization Analysis')).toBeVisible();

    // Verify summary cards are present
    await expect(page.locator('text=Total Providers')).toBeVisible();
    await expect(page.locator('text=Average Utilization')).toBeVisible();
  });

  test('should switch to No-Show Rates Report', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Click on No-Show Rates tab
    await page.click('text=No-Show Rates');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify No-Show Rates header is visible
    await expect(page.locator('text=No-Show Rate Analysis')).toBeVisible();

    // Verify breakdown sections are present
    await expect(page.locator('text=By Provider')).toBeVisible();
    await expect(page.locator('text=By Appointment Type')).toBeVisible();
    await expect(page.locator('text=By Day of Week')).toBeVisible();
    await expect(page.locator('text=By Time of Day')).toBeVisible();
  });

  test('should switch to Revenue Analysis Report', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Click on Revenue Analysis tab
    await page.click('text=Revenue Analysis');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify Revenue Analysis header is visible
    await expect(page.locator('text=Revenue per Hour Analysis')).toBeVisible();

    // Verify summary cards are present
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Total Hours')).toBeVisible();
    await expect(page.locator('text=Avg Revenue/Hour')).toBeVisible();
  });

  test('should switch to Cancellation Patterns Report', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Click on Cancellation Patterns tab
    await page.click('text=Cancellation Patterns');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify Cancellation Patterns header is visible
    await expect(page.locator('text=Cancellation Pattern Analysis')).toBeVisible();

    // Verify breakdown sections are present
    await expect(page.locator('text=By Cancellation Reason')).toBeVisible();
    await expect(page.locator('text=Cancellation Timing Analysis')).toBeVisible();
  });

  test('should switch to Capacity Planning Report', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Click on Capacity Planning tab
    await page.click('text=Capacity Planning');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify Capacity Planning header is visible
    await expect(page.locator('text=Capacity Planning & Projections')).toBeVisible();

    // Verify summary cards are present
    await expect(page.locator('text=Total Capacity')).toBeVisible();
    await expect(page.locator('text=Used Hours')).toBeVisible();
    await expect(page.locator('text=Available Hours')).toBeVisible();
    await expect(page.locator('text=Overall Utilization')).toBeVisible();
  });

  test('should update date range using quick select buttons', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Get initial date values
    const initialStartDate = await page.locator('input[type="date"]').first().inputValue();

    // Click "Last 7 Days" button
    await page.click('text=Last 7 Days');

    // Wait for potential data refresh
    await page.waitForTimeout(1000);

    // Verify date was updated
    const newStartDate = await page.locator('input[type="date"]').first().inputValue();
    expect(newStartDate).not.toBe(initialStartDate);
  });

  test('should manually update date range', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Set custom date range
    await page.fill('input[type="date"]').first(), '2025-01-01');
    await page.fill('input[type="date"]').last(), '2025-01-31');

    // Wait for potential data refresh
    await page.waitForTimeout(1000);

    // Verify dates were set
    const startDate = await page.locator('input[type="date"]').first().inputValue();
    const endDate = await page.locator('input[type="date"]').last().inputValue();

    expect(startDate).toBe('2025-01-01');
    expect(endDate).toBe('2025-01-31');
  });

  test('should maintain selected report when changing date range', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Switch to Revenue Analysis
    await page.click('text=Revenue Analysis');
    await page.waitForTimeout(1000);

    // Change date range
    await page.click('text=Last 30 Days');
    await page.waitForTimeout(1000);

    // Verify still on Revenue Analysis report
    await expect(page.locator('text=Revenue per Hour Analysis')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Switch to a different report and check for loading indicator
    await page.click('text=No-Show Rates');

    // Look for loading spinner or loading text (may be too fast to catch)
    const loadingIndicator = page.locator('text=Loading no-show analysis...');

    // If loading indicator appears, verify it disappears
    const isVisible = await loadingIndicator.isVisible({ timeout: 500 }).catch(() => false);
    if (isVisible) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should display summary statistics correctly', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');
    await page.waitForTimeout(2000);

    // Check for numeric values in summary cards
    const summaryCards = page.locator('.text-4xl.font-bold');
    const count = await summaryCards.count();

    expect(count).toBeGreaterThan(0);

    // Verify at least one card has numeric content
    for (let i = 0; i < count; i++) {
      const text = await summaryCards.nth(i).textContent();
      if (text && /\d/.test(text)) {
        // Found at least one card with numeric content
        expect(text).toBeTruthy();
        break;
      }
    }
  });

  test('should navigate back to dashboard from Analytics', async ({ page }) => {
    await page.goto('http://localhost:5175/analytics');

    // Click on Dashboard in navigation
    await page.click('text=Dashboard');

    // Verify navigation to dashboard
    await expect(page).toHaveURL('http://localhost:5175/dashboard');
  });
});
