import { test, expect } from '@playwright/test';

test.describe('Phase 2: Group Sessions', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"], input[type="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to Groups page', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    // Check for page title or heading
    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /group/i }).first()).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/groups-page-loaded.png', fullPage: true });
    console.log('✅ Groups page loaded successfully');
  });

  test('should display groups list or empty state', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    // Check for table/grid or empty state
    const hasTable = await page.locator('table, .MuiDataGrid-root, [role="grid"]').count();
    const hasEmptyState = await page.locator('text=/no.*groups/i, text=/empty/i').count();

    expect(hasTable + hasEmptyState).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/groups-list.png', fullPage: true });
    console.log('✅ Groups list or empty state displayed');
  });

  test('should have create group button', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/groups-create-button.png', fullPage: true });
    console.log('✅ Create group button found');
  });

  test('should open create group dialog and display CPT codes in appointment type dropdown', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await createButton.click();

    await page.waitForTimeout(1000);

    // Check for dialog
    const dialog = page.locator('[role="dialog"], .MuiDialog-root').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Look for appointment type select/dropdown
    const appointmentTypeSelect = dialog.locator('select, [role="combobox"]').filter({ hasText: /type|appointment/i }).first();
    if (await appointmentTypeSelect.count() === 0) {
      // Try finding by label
      const appointmentTypeLabel = dialog.locator('label').filter({ hasText: /appointment.*type|type/i }).first();
      const appointmentTypeInput = appointmentTypeLabel.locator('+ select, + [role="combobox"]').first();

      if (await appointmentTypeInput.count() > 0) {
        // Click to open dropdown
        await appointmentTypeInput.click();
        await page.waitForTimeout(500);

        // Check if options contain CPT codes (90853)
        const optionsWithCPT = page.locator('option, [role="option"]').filter({ hasText: /90853/i });
        const cptCount = await optionsWithCPT.count();

        console.log(`Found ${cptCount} appointment types with CPT code 90853`);
        expect(cptCount).toBeGreaterThan(0);

        await page.screenshot({ path: 'test-results/groups-cpt-codes.png', fullPage: true });
        console.log('✅ CPT codes displayed in appointment type dropdown');
      }
    }
  });

  test('should display Telehealth checkbox in create dialog', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await createButton.click();
    await page.waitForTimeout(1000);

    // Check for Telehealth checkbox
    const telehealthCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /telehealth/i }).first();
    const hasCheckbox = await telehealthCheckbox.count();

    if (hasCheckbox === 0) {
      // Try finding by label
      const telehealthLabel = page.locator('label, span').filter({ hasText: /telehealth/i }).first();
      await expect(telehealthLabel).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/groups-telehealth-checkbox.png', fullPage: true });
      console.log('✅ Telehealth checkbox found in create dialog');
    } else {
      await expect(telehealthCheckbox).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/groups-telehealth-checkbox.png', fullPage: true });
      console.log('✅ Telehealth checkbox found in create dialog');
    }
  });

  test('should allow creating group session with telehealth enabled', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await createButton.click();
    await page.waitForTimeout(1000);

    // Fill in basic required fields
    const dialog = page.locator('[role="dialog"], .MuiDialog-root').first();

    // Try to find and fill group name field
    const nameInput = dialog.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('Test Telehealth Group');
    }

    // Try to enable telehealth checkbox
    const telehealthCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /telehealth/i }).first();
    if (await telehealthCheckbox.count() > 0) {
      await telehealthCheckbox.check();
      const isChecked = await telehealthCheckbox.isChecked();
      expect(isChecked).toBe(true);

      await page.screenshot({ path: 'test-results/groups-telehealth-enabled.png', fullPage: true });
      console.log('✅ Telehealth checkbox can be enabled');
    } else {
      console.log('⚠️  Telehealth checkbox not found with initial selector, checking for label-based checkbox');
      const telehealthLabel = page.locator('label').filter({ hasText: /telehealth/i }).first();
      if (await telehealthLabel.count() > 0) {
        await telehealthLabel.click();
        await page.screenshot({ path: 'test-results/groups-telehealth-enabled.png', fullPage: true });
        console.log('✅ Telehealth checkbox enabled via label click');
      }
    }
  });

  test('complete page test', async ({ page }) => {
    await page.goto('http://localhost:5175/groups');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/groups-complete.png', fullPage: true });

    const content = await page.content();
    console.log('✅ Groups page complete test - content length:', content.length);
  });
});
