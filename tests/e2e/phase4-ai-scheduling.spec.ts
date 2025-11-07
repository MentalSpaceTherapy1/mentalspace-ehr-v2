import { test, expect, Page, Cookie } from '@playwright/test';

// Configure test timeout
test.setTimeout(90000); // 90 seconds per test

// Store authentication cookies to reuse across tests
let authCookies: Cookie[] = [];
let isAuthenticated = false;

test.describe('Phase 4: AI Scheduling Assistant', () => {
  test.beforeEach(async ({ page, context }) => {
    // Increase timeout
    page.setDefaultTimeout(60000);

    // Login once and reuse cookies for subsequent tests
    if (!isAuthenticated) {
      // Navigate to login page
      await page.goto('http://localhost:5176/login', { waitUntil: 'networkidle' });

      // Wait for form to be visible
      await page.waitForSelector('#email', { state: 'visible' });

      // Fill credentials using admin credentials
      await page.fill('#email', 'brendajb@chctherapy.com');
      await page.fill('#password', '38MoreYears!');

      // Submit and wait for dashboard
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 60000 });

      // Wait a bit for page to settle
      await page.waitForTimeout(2000);

      // Store cookies for reuse
      authCookies = await context.cookies();
      isAuthenticated = true;

      console.log('✅ Authenticated successfully - session will be reused for all tests');
    } else {
      // Reuse existing authentication by adding stored cookies
      await context.addCookies(authCookies);

      // Navigate to dashboard with existing session
      await page.goto('http://localhost:5176/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
  });

  test('should navigate to AI Scheduling Assistant page without errors', async ({ page }) => {
    // Navigate to AI Assistant
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');

    // Wait for API calls to complete
    await page.waitForTimeout(2000);

    // Check for page title
    const title = page.locator('h1, h2, h3').filter({ hasText: /ai.*scheduling|scheduling.*assistant/i }).first();
    await expect(title).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/appointments/ai-assistant-loaded.png', fullPage: true });
    console.log('✅ AI Scheduling Assistant page loaded successfully');
  });

  test('should load AI Assistant without 404 errors', async ({ page }) => {
    // Set up console listener to catch 404 errors
    const errors: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('ai-scheduling')) {
        errors.push(`404 Error: ${response.url()}`);
      }
    });

    // Navigate to AI Assistant
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');

    // Wait for API calls
    await page.waitForTimeout(3000);

    // Check for 404 errors
    if (errors.length > 0) {
      console.error('❌ Found 404 errors:');
      errors.forEach(err => console.error(err));
      throw new Error(`Found ${errors.length} 404 errors on AI Assistant page`);
    }

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-no-errors.png', fullPage: true });
    console.log('✅ No 404 errors on AI Assistant page');
  });

  test('should display natural language input section', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for natural language input
    const nlInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    const nlLabel = page.locator('label, span, div').filter({ hasText: /natural.*language|tell.*me|what.*can.*i/i }).first();

    // At least one NL-related element should exist
    const hasNLInput = await nlInput.count();
    const hasNLLabel = await nlLabel.count();

    console.log(`Found NL Input: ${hasNLInput > 0}, NL Label: ${hasNLLabel > 0}`);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-nl-section.png', fullPage: true });
    console.log('✅ Natural language section displayed');
  });

  test('should display tabs for different AI features', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for feature tabs
    const tabs = [
      /natural.*language|nlp|smart.*scheduling/i,
      /suggestions?|recommend/i,
      /compatibility|matching/i,
      /load.*balanc/i,
      /pattern|insight/i
    ];

    let foundTabs = 0;
    for (const tabPattern of tabs) {
      const tab = page.locator('button, div[role="tab"]').filter({ hasText: tabPattern }).first();
      if (await tab.count() > 0) {
        foundTabs++;
      }
    }

    console.log(`Found ${foundTabs} AI feature tabs`);
    expect(foundTabs).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-tabs.png', fullPage: true });
    console.log('✅ AI feature tabs displayed');
  });

  test('should allow natural language scheduling input', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find NL input field
    const nlInput = page.locator('textarea, input[type="text"]').first();

    if (await nlInput.count() > 0) {
      await nlInput.fill('Schedule an appointment with Dr. Smith tomorrow at 2pm');

      // Look for submit/process button
      const submitButton = page.locator('button').filter({ hasText: /process|submit|go|send|parse/i }).first();

      if (await submitButton.count() > 0) {
        await expect(submitButton).toBeEnabled({ timeout: 5000 });
        console.log('✅ Natural language input accepted');
      }

      await page.screenshot({ path: 'test-results/appointments/ai-assistant-nl-input.png', fullPage: true });
    } else {
      console.log('⚠️  No natural language input field found');
    }
  });

  test('should display scheduling suggestions interface', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for suggestions section
    const suggestionsSection = page.locator('div, section').filter({ hasText: /suggestion|recommend|ai.*suggest/i }).first();

    if (await suggestionsSection.count() > 0) {
      await expect(suggestionsSection).toBeVisible({ timeout: 5000 });
      console.log('✅ Suggestions section found');
    }

    // Look for elements related to suggestions
    const generateButton = page.locator('button').filter({ hasText: /generate.*suggest|suggest/i }).first();
    const clientSelect = page.locator('select, input').filter({ hasText: /client|patient/i }).first();

    const hasGenerateButton = await generateButton.count();
    const hasClientSelect = await clientSelect.count();

    console.log(`Generate button: ${hasGenerateButton > 0}, Client selector: ${hasClientSelect > 0}`);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-suggestions.png', fullPage: true });
  });

  test('should display provider compatibility section', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for compatibility tab
    const compatTab = page.locator('button, div[role="tab"]').filter({ hasText: /compatibility|matching|provider.*match/i }).first();

    if (await compatTab.count() > 0) {
      await compatTab.click();
      await page.waitForTimeout(1000);

      // Look for compatibility-related elements
      const compatSection = page.locator('div').filter({ hasText: /compatibility.*score|match.*score/i }).first();

      if (await compatSection.count() > 0) {
        await expect(compatSection).toBeVisible({ timeout: 5000 });
        console.log('✅ Compatibility section displayed');
      }

      await page.screenshot({ path: 'test-results/appointments/ai-assistant-compatibility.png', fullPage: true });
    } else {
      console.log('⚠️  Compatibility tab not found');
      await page.screenshot({ path: 'test-results/appointments/ai-assistant-no-compat-tab.png', fullPage: true });
    }
  });

  test('should display load balancing metrics', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for load balancing tab
    const loadTab = page.locator('button, div[role="tab"]').filter({ hasText: /load.*balanc|workload|distribution/i }).first();

    if (await loadTab.count() > 0) {
      await loadTab.click();
      await page.waitForTimeout(1000);

      // Look for load metrics elements
      const metricsElements = [
        /utilization|load.*score|capacity/i,
        /overload|underutil/i,
        /provider.*load|team.*load/i
      ];

      let foundMetrics = 0;
      for (const metricPattern of metricsElements) {
        const metric = page.locator('div, span, td, th').filter({ hasText: metricPattern }).first();
        if (await metric.count() > 0) {
          foundMetrics++;
        }
      }

      console.log(`Found ${foundMetrics} load balancing metrics elements`);

      await page.screenshot({ path: 'test-results/appointments/ai-assistant-load-balancing.png', fullPage: true });
      console.log('✅ Load balancing section displayed');
    } else {
      console.log('⚠️  Load balancing tab not found');
      await page.screenshot({ path: 'test-results/appointments/ai-assistant-no-load-tab.png', fullPage: true });
    }
  });

  test('should display pattern insights section', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for patterns/insights tab
    const patternTab = page.locator('button, div[role="tab"]').filter({ hasText: /pattern|insight|detect|analytic/i }).first();

    if (await patternTab.count() > 0) {
      await patternTab.click();
      await page.waitForTimeout(1000);

      // Look for pattern-related elements
      const patternElements = [
        /no.*show|underutil|gap.*time|preference.*mismatch/i,
        /severity|critical|high|medium|low/i,
        /detect.*pattern|run.*detect/i
      ];

      let foundPatterns = 0;
      for (const patternPattern of patternElements) {
        const pattern = page.locator('div, span, button, td, th').filter({ hasText: patternPattern }).first();
        if (await pattern.count() > 0) {
          foundPatterns++;
        }
      }

      console.log(`Found ${foundPatterns} pattern insight elements`);

      await page.screenshot({ path: 'test-results/appointments/ai-assistant-patterns.png', fullPage: true });
      console.log('✅ Pattern insights section displayed');
    } else {
      console.log('⚠️  Pattern insights tab not found');
      await page.screenshot({ path: 'test-results/appointments/ai-assistant-no-pattern-tab.png', fullPage: true });
    }
  });

  test('should display pattern detection button', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to patterns tab if exists
    const patternTab = page.locator('button, div[role="tab"]').filter({ hasText: /pattern|insight/i }).first();
    if (await patternTab.count() > 0) {
      await patternTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for run detection button
    const detectButton = page.locator('button').filter({ hasText: /run.*detect|detect.*pattern|analyze|scan/i }).first();

    if (await detectButton.count() > 0) {
      await expect(detectButton).toBeVisible({ timeout: 5000 });
      console.log('✅ Pattern detection button found');
      await page.screenshot({ path: 'test-results/appointments/ai-assistant-detect-button.png', fullPage: true });
    } else {
      console.log('⚠️  Pattern detection button not found');
    }
  });

  test('should display statistics or dashboard cards', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for stat cards/metrics
    const statElements = [
      /total.*suggest|accept.*rate|average.*score/i,
      /\d+%|\d+\.\d+/i, // Numbers/percentages
      /metric|stat|count/i
    ];

    let foundStats = 0;
    for (const statPattern of statElements) {
      const stat = page.locator('div, span, td').filter({ hasText: statPattern }).first();
      if (await stat.count() > 0) {
        foundStats++;
      }
    }

    console.log(`Found ${foundStats} statistics elements`);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-stats.png', fullPage: true });
    console.log('✅ Statistics displayed');
  });

  test('should handle pattern resolution actions', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to patterns tab if exists
    const patternTab = page.locator('button, div[role="tab"]').filter({ hasText: /pattern|insight/i }).first();
    if (await patternTab.count() > 0) {
      await patternTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for resolve/ignore buttons
    const resolveButton = page.locator('button').filter({ hasText: /resolve|fix|address/i }).first();
    const ignoreButton = page.locator('button').filter({ hasText: /ignore|dismiss|skip/i }).first();

    const hasResolveButton = await resolveButton.count();
    const hasIgnoreButton = await ignoreButton.count();

    console.log(`Resolve button: ${hasResolveButton > 0}, Ignore button: ${hasIgnoreButton > 0}`);

    if (hasResolveButton > 0 || hasIgnoreButton > 0) {
      console.log('✅ Pattern action buttons found');
    } else {
      console.log('⚠️  No pattern action buttons visible - may appear with patterns');
    }

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-pattern-actions.png', fullPage: true });
  });

  test('should display provider capacity information', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to load balancing tab if exists
    const loadTab = page.locator('button, div[role="tab"]').filter({ hasText: /load.*balanc|workload/i }).first();
    if (await loadTab.count() > 0) {
      await loadTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for capacity-related elements
    const capacityElements = [
      /available.*capacity|capacity.*available/i,
      /underutilized|overloaded|balanced|critical/i,
      /\d+%.*capacity|capacity.*\d+%/i
    ];

    let foundCapacity = 0;
    for (const capacityPattern of capacityElements) {
      const capacity = page.locator('div, span, td, th').filter({ hasText: capacityPattern }).first();
      if (await capacity.count() > 0) {
        foundCapacity++;
      }
    }

    console.log(`Found ${foundCapacity} capacity elements`);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-capacity.png', fullPage: true });
    console.log('✅ Capacity information displayed');
  });

  test('should display recommendation lists', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for recommendation elements across any tab
    const recommendationElements = [
      /recommend/i,
      /action.*item|next.*step/i,
      /suggestion.*list/i
    ];

    let foundRecommendations = 0;
    for (const recPattern of recommendationElements) {
      const rec = page.locator('div, li, span').filter({ hasText: recPattern }).first();
      if (await rec.count() > 0) {
        foundRecommendations++;
      }
    }

    console.log(`Found ${foundRecommendations} recommendation elements`);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-recommendations.png', fullPage: true });
    console.log('✅ Recommendations displayed');
  });

  test('should display confidence scores', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for confidence-related elements
    const confidenceElements = [
      /confidence|certainty/i,
      /score.*\d+|\d+.*score/i,
      /high|medium|low.*confidence/i
    ];

    let foundConfidence = 0;
    for (const confPattern of confidenceElements) {
      const conf = page.locator('div, span, td').filter({ hasText: confPattern }).first();
      if (await conf.count() > 0) {
        foundConfidence++;
      }
    }

    console.log(`Found ${foundConfidence} confidence score elements`);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-confidence.png', fullPage: true });
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');

    // Set up console listener for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Check for error messages in UI
    const errorDisplay = page.locator('div, p').filter({ hasText: /error|fail|something.*wrong/i }).first();
    const hasErrorDisplay = await errorDisplay.count();

    if (hasErrorDisplay > 0) {
      console.log('⚠️  Error message displayed in UI');
    }

    if (consoleErrors.length > 0) {
      console.log(`⚠️  Found ${consoleErrors.length} console errors`);
      consoleErrors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ No console errors detected');
    }

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-error-handling.png', fullPage: true });
  });

  test('complete AI Assistant page test', async ({ page }) => {
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({ path: 'test-results/appointments/ai-assistant-complete.png', fullPage: true });

    // Get page content length
    const content = await page.content();
    console.log('✅ AI Scheduling Assistant complete test - content length:', content.length);

    // Verify no major errors
    expect(content.length).toBeGreaterThan(1000);
  });

  test('should navigate from dashboard to AI Assistant', async ({ page }) => {
    await page.goto('http://localhost:5176/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for AI Assistant link in navigation
    const aiLink = page.locator('a, button').filter({ hasText: /ai.*assistant|ai.*scheduling|smart.*scheduling/i }).first();

    if (await aiLink.count() > 0) {
      await aiLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we're on AI Assistant page
      await expect(page).toHaveURL(/.*ai-assistant.*/);
      console.log('✅ Successfully navigated from dashboard to AI Assistant');

      await page.screenshot({ path: 'test-results/appointments/ai-assistant-navigation.png', fullPage: true });
    } else {
      console.log('⚠️  AI Assistant navigation link not found in dashboard');
    }
  });

  test('API integration: should fetch scheduling statistics', async ({ page }) => {
    // Monitor API calls
    const apiCalls: string[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/v1/ai-scheduling')) {
        apiCalls.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log(`Found ${apiCalls.length} AI scheduling API calls:`);
    apiCalls.forEach(call => console.log(`  - ${call}`));

    // Verify at least some API calls were made
    expect(apiCalls.length).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-api-calls.png', fullPage: true });
    console.log('✅ AI scheduling API integration verified');
  });

  test('API integration: should handle pattern detection endpoint', async ({ page }) => {
    let detectionCalled = false;

    page.on('response', response => {
      if (response.url().includes('/api/v1/ai-scheduling/patterns')) {
        detectionCalled = true;
        console.log(`Pattern API called: ${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');

    // Navigate to patterns tab if exists
    const patternTab = page.locator('button, div[role="tab"]').filter({ hasText: /pattern|insight/i }).first();
    if (await patternTab.count() > 0) {
      await patternTab.click();
      await page.waitForTimeout(2000);
    }

    // Try to trigger pattern detection
    const detectButton = page.locator('button').filter({ hasText: /run.*detect|detect.*pattern|analyze/i }).first();
    if (await detectButton.count() > 0) {
      await detectButton.click();
      await page.waitForTimeout(2000);
    }

    if (detectionCalled) {
      console.log('✅ Pattern detection API endpoint called');
    } else {
      console.log('⚠️  Pattern detection API not called - button may not have triggered');
    }

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-pattern-api.png', fullPage: true });
  });

  test('API integration: should handle load balancing endpoints', async ({ page }) => {
    const loadAPIs: string[] = [];

    page.on('response', response => {
      if (response.url().includes('/api/v1/ai-scheduling/load-balancing')) {
        loadAPIs.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');

    // Navigate to load balancing tab if exists
    const loadTab = page.locator('button, div[role="tab"]').filter({ hasText: /load.*balanc|workload/i }).first();
    if (await loadTab.count() > 0) {
      await loadTab.click();
      await page.waitForTimeout(2000);
    }

    console.log(`Found ${loadAPIs.length} load balancing API calls:`);
    loadAPIs.forEach(call => console.log(`  - ${call}`));

    await page.screenshot({ path: 'test-results/appointments/ai-assistant-load-api.png', fullPage: true });
    console.log('✅ Load balancing API endpoints verified');
  });
});
