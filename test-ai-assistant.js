const { chromium } = require('playwright');

async function testAIAssistant() {
  console.log('🚀 Starting AI Scheduling Assistant Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('1️⃣  Logging in...');
    await page.goto('http://localhost:5176/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    console.log('✅ Logged in successfully\n');

    // Step 2: Navigate to AI Scheduling Assistant
    console.log('2️⃣  Navigating to AI Scheduling Assistant...');
    await page.goto('http://localhost:5176/appointments/ai-assistant');
    await page.waitForLoadState('networkidle');
    console.log('✅ AI Assistant page loaded\n');

    // Step 3: Take a screenshot
    await page.screenshot({ path: 'test-results/ai-assistant-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved: test-results/ai-assistant-loaded.png\n');

    // Step 4: Check for tabs
    const tabs = await page.locator('button[role="tab"]').count();
    console.log(`📋 Found ${tabs} tabs`);
    const tabLabels = await page.locator('button[role="tab"]').allTextContents();
    console.log(`   Tabs: ${tabLabels.join(', ')}\n`);

    // Step 5: Try natural language input
    console.log('3️⃣  Testing Natural Language Input...');
    const nlpInput = await page.locator('textarea').first();
    if (await nlpInput.isVisible()) {
      await nlpInput.fill('Schedule Sarah Anderson with Dr. Smith tomorrow at 2pm');
      console.log('✅ Entered natural language query\n');

      // Look for parse button
      const parseButton = await page.locator('button:has-text("Parse Request")').first();
      if (await parseButton.isVisible()) {
        await parseButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked Parse Request button\n');
        await page.screenshot({ path: 'test-results/ai-assistant-after-parse.png', fullPage: true });
      } else {
        console.log('⚠️  Parse Request button not found\n');
      }
    } else {
      console.log('⚠️  Natural language input not visible\n');
    }

    // Step 6: Test tabs
    console.log('4️⃣  Testing Tab Navigation...');
    for (let i = 0; i < tabs; i++) {
      const tab = await page.locator('button[role="tab"]').nth(i);
      const tabLabel = await tab.textContent();
      await tab.click();
      await page.waitForTimeout(500);
      console.log(`✅ Clicked tab: ${tabLabel?.trim()}`);
      await page.screenshot({ path: `test-results/ai-assistant-tab-${i}.png`, fullPage: true });
    }
    console.log('');

    // Step 7: Check for API calls
    console.log('5️⃣  Checking for API activity...');
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/ai-scheduling')) {
        requests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    // Wait a bit to capture any requests
    await page.waitForTimeout(2000);
    console.log(`📡 Found ${requests.length} AI scheduling API requests`);
    requests.forEach(req => console.log(`   ${req.method} ${req.url}`));
    console.log('');

    // Step 8: Final screenshot
    await page.screenshot({ path: 'test-results/ai-assistant-final.png', fullPage: true });
    console.log('📸 Final screenshot saved\n');

    console.log('✅ AI Scheduling Assistant test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Tabs found: ${tabs}`);
    console.log(`   - Natural language input: ${await nlpInput.isVisible() ? 'Yes' : 'No'}`);
    console.log(`   - API requests: ${requests.length}`);
    console.log('\n💡 Keep the browser open to review. Press Ctrl+C to close.');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'test-results/ai-assistant-error.png', fullPage: true });
    console.log('📸 Error screenshot saved');
  }
}

testAIAssistant();
