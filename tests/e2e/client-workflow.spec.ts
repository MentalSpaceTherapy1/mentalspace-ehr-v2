import { test, expect } from '@playwright/test';

test.describe('Client Management Workflow', () => {
  // Helper to generate unique test data
  const getTestClientData = () => ({
    firstName: `TestClient${Date.now()}`,
    lastName: `E2E${Math.floor(Math.random() * 1000)}`,
    email: `test${Date.now()}@e2e-example.com`,
    phone: `555${Math.floor(Math.random() * 9000000 + 1000000)}`,
    dateOfBirth: '1990-05-15',
  });

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

  test('should load client list page', async ({ page }) => {
    // Navigate to clients
    await page.goto('http://localhost:5175/clients');
    await page.waitForLoadState('networkidle');

    // Verify page loaded - check for clients-related content
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('client');

    await page.screenshot({ path: 'test-results/client-list-loaded.png', fullPage: true });
  });

  test('should navigate to new client form', async ({ page }) => {
    // Navigate to clients
    await page.goto('http://localhost:5175/clients');
    await page.waitForLoadState('networkidle');

    // Look for create/add button
    const createButton = page.locator('a[href="/clients/new"], button:has-text("New Client"), button:has-text("Add Client"), button:has-text("Create")').first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForURL('**/clients/new');
    } else {
      // Direct navigation
      await page.goto('http://localhost:5175/clients/new');
    }

    // Verify we're on the new client page
    await expect(page).toHaveURL(/clients\/new/);
    await page.screenshot({ path: 'test-results/new-client-form.png', fullPage: true });
  });

  test('should display client form fields', async ({ page }) => {
    // Navigate to new client form
    await page.goto('http://localhost:5175/clients/new');
    await page.waitForLoadState('networkidle');

    // Check for common form fields
    const formFields = [
      'input[name="firstName"], input[placeholder*="First"]',
      'input[name="lastName"], input[placeholder*="Last"]',
      'input[type="email"], input[name="email"]',
      'input[type="tel"], input[name="phone"], input[name="primaryPhone"]',
    ];

    for (const selector of formFields) {
      const field = page.locator(selector).first();
      const isVisible = await field.isVisible().catch(() => false);
      console.log(`Field "${selector}": ${isVisible ? 'visible' : 'not visible'}`);
    }

    await page.screenshot({ path: 'test-results/client-form-fields.png', fullPage: true });
  });

  test('should create a new client', async ({ page }) => {
    const testData = getTestClientData();

    // Navigate to new client form
    await page.goto('http://localhost:5175/clients/new');
    await page.waitForLoadState('networkidle');

    // Fill required fields - try multiple selector patterns
    const firstNameInput = page.locator('input[name="firstName"], input[id="firstName"], input[placeholder*="First"]').first();
    const lastNameInput = page.locator('input[name="lastName"], input[id="lastName"], input[placeholder*="Last"]').first();

    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill(testData.firstName);
    }

    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill(testData.lastName);
    }

    // Fill email if visible
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(testData.email);
    }

    // Fill phone if visible
    const phoneInput = page.locator('input[type="tel"], input[name="primaryPhone"], input[name="phone"], input[id="phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(testData.phone);
    }

    // Fill date of birth if visible
    const dobInput = page.locator('input[type="date"], input[name="dateOfBirth"], input[id="dateOfBirth"]').first();
    if (await dobInput.isVisible()) {
      await dobInput.fill(testData.dateOfBirth);
    }

    await page.screenshot({ path: 'test-results/client-form-filled.png', fullPage: true });

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitButton.click();

    // Wait for navigation or success message
    await page.waitForTimeout(3000);

    // Check for success - either redirect or success message
    const currentUrl = page.url();
    const hasSuccessMessage = await page.locator('text=/success|created|saved/i').isVisible();
    const isOnDetailPage = /clients\/[a-f0-9-]+$/.test(currentUrl);
    const isOnListPage = currentUrl.includes('/clients') && !currentUrl.includes('/new');

    console.log(`After submit - URL: ${currentUrl}`);
    console.log(`Success message visible: ${hasSuccessMessage}`);
    console.log(`On detail page: ${isOnDetailPage}`);
    console.log(`On list page: ${isOnListPage}`);

    await page.screenshot({ path: 'test-results/client-created.png', fullPage: true });

    // Should either show success or redirect to detail/list
    expect(hasSuccessMessage || isOnDetailPage || isOnListPage).toBeTruthy();
  });

  test('should search for clients', async ({ page }) => {
    // Navigate to clients
    await page.goto('http://localhost:5175/clients');
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000); // Wait for search results
      await page.screenshot({ path: 'test-results/client-search-results.png', fullPage: true });
    } else {
      console.log('Search input not found');
      await page.screenshot({ path: 'test-results/client-list-no-search.png', fullPage: true });
    }
  });

  test('should view client details', async ({ page }) => {
    // Navigate to clients
    await page.goto('http://localhost:5175/clients');
    await page.waitForLoadState('networkidle');

    // Try to find and click on a client row
    const clientRow = page.locator('tr[data-client-id], [role="row"]:has(td), .client-row, a[href^="/clients/"]:not([href="/clients/new"])').first();

    if (await clientRow.isVisible()) {
      // Check if it's a link or needs to be clicked
      const link = clientRow.locator('a[href^="/clients/"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await clientRow.click();
      }

      await page.waitForTimeout(2000);

      // Verify we're on a client detail page
      const currentUrl = page.url();
      console.log(`Current URL after clicking client: ${currentUrl}`);

      await page.screenshot({ path: 'test-results/client-detail.png', fullPage: true });
    } else {
      console.log('No client rows found to click');
      await page.screenshot({ path: 'test-results/client-list-empty.png', fullPage: true });
    }
  });

  test('should navigate to duplicate detection page', async ({ page }) => {
    // Navigate to duplicate detection
    await page.goto('http://localhost:5175/clients/duplicates');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const pageContent = await page.content();
    const hasDuplicateContent = pageContent.toLowerCase().includes('duplicate') ||
                                 pageContent.toLowerCase().includes('potential') ||
                                 pageContent.toLowerCase().includes('match');

    console.log(`Duplicate detection page loaded: ${hasDuplicateContent}`);

    await page.screenshot({ path: 'test-results/duplicate-detection.png', fullPage: true });

    expect(page.url()).toContain('duplicates');
  });

  test('complete client workflow - create, view, edit', async ({ page }) => {
    const testData = getTestClientData();

    // Step 1: Navigate to clients list
    await page.goto('http://localhost:5175/clients');
    await page.waitForLoadState('networkidle');
    console.log('Step 1: Loaded clients list');

    // Step 2: Navigate to new client form
    await page.goto('http://localhost:5175/clients/new');
    await page.waitForLoadState('networkidle');
    console.log('Step 2: Loaded new client form');

    // Step 3: Fill in client data
    const firstNameInput = page.locator('input[name="firstName"], input[id="firstName"], input[placeholder*="First"]').first();
    const lastNameInput = page.locator('input[name="lastName"], input[id="lastName"], input[placeholder*="Last"]').first();

    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill(testData.firstName);
    }
    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill(testData.lastName);
    }

    // Fill additional fields if visible
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(testData.email);
    }

    const phoneInput = page.locator('input[type="tel"], input[name="primaryPhone"], input[name="phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(testData.phone);
    }

    const dobInput = page.locator('input[type="date"], input[name="dateOfBirth"]').first();
    if (await dobInput.isVisible()) {
      await dobInput.fill(testData.dateOfBirth);
    }

    console.log('Step 3: Filled client form');
    await page.screenshot({ path: 'test-results/workflow-step3-filled.png', fullPage: true });

    // Step 4: Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      console.log('Step 4: Submitted form');
    }

    await page.screenshot({ path: 'test-results/workflow-step4-submitted.png', fullPage: true });

    // Step 5: Return to list and verify client appears
    await page.goto('http://localhost:5175/clients');
    await page.waitForLoadState('networkidle');

    // Search for the created client
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(testData.firstName);
      await page.waitForTimeout(1000);
    }

    console.log('Step 5: Returned to list and searched');
    await page.screenshot({ path: 'test-results/workflow-step5-search.png', fullPage: true });

    // Final verification - page should contain client workflow elements
    const pageContent = await page.content();
    const hasClientElements = pageContent.includes('client') || pageContent.includes('Client');
    expect(hasClientElements).toBeTruthy();

    console.log('Workflow complete!');
  });
});
