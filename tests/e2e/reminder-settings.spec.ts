import { test, expect } from '@playwright/test';

test.describe('Reminder Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5175/login');

    // Login
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard');

    // Navigate to reminder settings
    await page.goto('http://localhost:5175/settings/reminders');
    await page.waitForLoadState('networkidle');
  });

  test('should load reminder settings page', async ({ page }) => {
    // Check page title
    await expect(page.locator('text=Appointment Reminder Settings')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/reminder-settings-loaded.png', fullPage: true });
  });

  test('should display all reminder schedule toggles', async ({ page }) => {
    // Check for 5 reminder types
    const toggles = page.locator('input[type="checkbox"], .MuiSwitch-input');
    const count = await toggles.count();

    console.log(`Found ${count} toggles on the page`);

    // Should have at least 5 toggles for the reminder schedules
    expect(count).toBeGreaterThanOrEqual(5);

    await page.screenshot({ path: 'test-results/reminder-toggles.png', fullPage: true });
  });

  test('should display Twilio configuration section', async ({ page }) => {
    // Check for Twilio-related text
    await expect(page.locator('text=SMS Configuration (Twilio)')).toBeVisible();

    // Check for input fields
    const inputs = page.locator('input[type="text"], input[type="password"]');
    const inputCount = await inputs.count();

    console.log(`Found ${inputCount} input fields`);
    expect(inputCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/twilio-config.png', fullPage: true });
  });

  test('should display email configuration section', async ({ page }) => {
    // Check for Email-related text
    await expect(page.locator('text=Email Configuration (AWS SES)')).toBeVisible();

    await page.screenshot({ path: 'test-results/email-config.png', fullPage: true });
  });

  test('should have save button', async ({ page }) => {
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();

    await page.screenshot({ path: 'test-results/save-button.png', fullPage: true });
  });

  test('should toggle reminder schedules', async ({ page }) => {
    // Find first toggle and click it
    const firstToggle = page.locator('input[type="checkbox"], .MuiSwitch-input').first();

    // Get initial state
    const initialState = await firstToggle.isChecked();

    // Click to toggle
    await firstToggle.click();

    // Verify state changed
    const newState = await firstToggle.isChecked();
    expect(newState).toBe(!initialState);

    await page.screenshot({ path: 'test-results/toggle-changed.png', fullPage: true });
  });
});
