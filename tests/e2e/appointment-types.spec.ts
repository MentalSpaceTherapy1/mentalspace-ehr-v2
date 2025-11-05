import { test, expect } from '@playwright/test';

test.describe('Appointment Types Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5175/login');

    // Login
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard');

    // Navigate to appointment types
    await page.goto('http://localhost:5175/settings/appointment-types');
    await page.waitForLoadState('networkidle');
  });

  test('should load appointment types page', async ({ page }) => {
    // Check page title
    await expect(page.locator('text=Appointment Types, text=Appointment Type')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/appointment-types-loaded.png', fullPage: true });
  });

  test('should display table of appointment types', async ({ page }) => {
    // Check for table or grid
    const table = page.locator('table, .MuiDataGrid-root, [role="grid"]');
    await expect(table).toBeVisible();

    await page.screenshot({ path: 'test-results/appointment-types-table.png', fullPage: true });
  });

  test('should have create button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")');
    await expect(createButton.first()).toBeVisible();

    await page.screenshot({ path: 'test-results/create-button.png', fullPage: true });
  });

  test('should open create dialog', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await createButton.click();

    // Wait for dialog
    await page.waitForTimeout(1000);

    // Check for dialog/modal
    const dialog = page.locator('[role="dialog"], .MuiDialog-root');
    await expect(dialog).toBeVisible();

    await page.screenshot({ path: 'test-results/create-dialog-opened.png', fullPage: true });
  });

  test('should display form fields in create dialog', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await createButton.click();

    // Wait for dialog
    await page.waitForTimeout(1000);

    // Check for input fields
    const inputs = page.locator('[role="dialog"] input, .MuiDialog-root input');
    const inputCount = await inputs.count();

    console.log(`Found ${inputCount} input fields in dialog`);
    expect(inputCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/form-fields.png', fullPage: true });
  });

  test('complete page test', async ({ page }) => {
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/appointment-types-complete.png', fullPage: true });

    // Log page content for debugging
    const content = await page.content();
    console.log('Page loaded successfully with content length:', content.length);
  });
});
