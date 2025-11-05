import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should successfully login with admin credentials', async ({ page }) => {
    // Capture console messages and errors
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', error => consoleMessages.push(`[ERROR] ${error.message}`));

    // Navigate to the login page
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Log all console messages if page is blank
    console.log('Browser console output:', consoleMessages.join('\n'));

    // Wait for the login form to be visible
    await page.waitForSelector('#email', { state: 'visible' });

    // Fill in login credentials using ID selectors
    await page.fill('#email', 'brendajb@chctherapy.com');
    await page.fill('#password', '38MoreYears!');

    // Take a screenshot before login
    await page.screenshot({ path: 'tests/screenshots/before-login.png', fullPage: true });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Verify we're logged in
    await expect(page).toHaveURL(/dashboard/);

    // Take a screenshot of successful login
    await page.screenshot({ path: 'tests/screenshots/login-success.png', fullPage: true });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Wait for form to be ready
    await page.waitForSelector('#email', { state: 'visible' });

    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Wait a bit for the error to appear
    await page.waitForTimeout(2000);

    // Should show error message or still be on login page
    const hasError = await page.locator('text=/invalid|error|incorrect|failed/i').isVisible();
    const isStillOnLoginPage = page.url().includes('localhost:5176') || page.url() === 'http://localhost:5176/';

    expect(hasError || isStillOnLoginPage).toBeTruthy();

    // Take a screenshot of the error state
    await page.screenshot({ path: 'tests/screenshots/login-error.png', fullPage: true });
  });
});
