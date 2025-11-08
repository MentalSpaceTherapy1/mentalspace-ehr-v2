const { chromium } = require('playwright');

async function testTelehealthSession() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });

  try {
    console.log('🚀 Starting telehealth session test...\n');

    const context = await browser.newContext({
      permissions: ['camera', 'microphone', 'geolocation', 'notifications'],
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    // Navigate to login page
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"]', 'brendajb@chctherapy.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Logged in successfully\n');

    // Use the newly created appointment ID
    const appointmentId = '7d04ac6c-0c6f-4f90-8b2a-9fa5c0a20d19';
    console.log(`2. Navigating to telehealth session for appointment: ${appointmentId}`);

    // Navigate directly to telehealth session
    await page.goto(`http://localhost:5175/telehealth/session/${appointmentId}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'telehealth-session-initial.png' });
    console.log('📸 Screenshot saved: telehealth-session-initial.png\n');

    // Check if consent is required
    const consentRequired = await page.locator('text="Consent Required"').isVisible().catch(() => false);

    if (consentRequired) {
      console.log('3. Consent required - signing consent form...');

      // Click sign consent button
      await page.click('button:has-text("Sign Consent")');
      await page.waitForTimeout(1000);

      // Fill consent form
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      for (const checkbox of checkboxes) {
        await checkbox.check();
      }

      // Sign with name
      await page.fill('input[placeholder*="signature"], input[name="signature"]', 'Kevin Johnson');

      // Submit consent
      await page.click('button:has-text("Submit Consent")');
      await page.waitForTimeout(2000);
      console.log('✅ Consent signed\n');
    } else {
      console.log('✅ Consent already on file\n');
    }

    // Check for device test
    const testDeviceVisible = await page.locator('button:has-text("Test Your Device")').isVisible().catch(() => false);

    if (testDeviceVisible) {
      console.log('4. Testing device setup...');
      await page.click('button:has-text("Test Your Device")');
      await page.waitForTimeout(3000);

      // Take screenshot of device test
      await page.screenshot({ path: 'telehealth-device-test.png' });
      console.log('📸 Screenshot saved: telehealth-device-test.png');

      // Check if we can proceed
      const continueButton = await page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Join")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
      console.log('✅ Device test completed\n');
    }

    // Try to join session
    const joinButton = await page.locator('button:has-text("Join Session"), button:has-text("Enter Room"), button:has-text("Start Session")').first();

    if (await joinButton.isVisible()) {
      console.log('5. Joining telehealth session...');
      await joinButton.click();

      // Wait for video elements to appear
      await page.waitForTimeout(5000);

      // Check for video elements
      const videoElements = await page.locator('video').count();
      console.log(`📹 Found ${videoElements} video element(s)`);

      // Check for audio/video controls
      const muteButton = await page.locator('button[aria-label*="mute"], button:has-text("Mute"), button[title*="mute"]').isVisible().catch(() => false);
      const cameraButton = await page.locator('button[aria-label*="camera"], button:has-text("Camera"), button[title*="camera"]').isVisible().catch(() => false);

      console.log(`🎤 Mute button available: ${muteButton}`);
      console.log(`📷 Camera button available: ${cameraButton}`);

      // Take screenshot of active session
      await page.screenshot({ path: 'telehealth-session-active.png', fullPage: true });
      console.log('📸 Screenshot saved: telehealth-session-active.png\n');

      // Check for emergency contact
      const emergencyButton = await page.locator('button:has-text("Emergency"), button:has-text("911")').first();
      if (await emergencyButton.isVisible()) {
        console.log('🚨 Emergency button is available');
      }

      // Check for end session button
      const endButton = await page.locator('button:has-text("End Session"), button:has-text("Leave")').first();
      if (await endButton.isVisible()) {
        console.log('🔚 End session button is available\n');

        // End the session
        console.log('6. Ending telehealth session...');
        await endButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Session ended');
      }

    } else {
      console.log('⚠️ Could not find Join Session button');

      // Take screenshot of current state
      await page.screenshot({ path: 'telehealth-session-error.png', fullPage: true });
      console.log('📸 Screenshot saved: telehealth-session-error.png');

      // Get any error messages
      const errorText = await page.locator('.error, .alert-error, [role="alert"]').textContent().catch(() => null);
      if (errorText) {
        console.log('❌ Error message:', errorText);
      }
    }

    console.log('\n✅ Telehealth session test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    // Try to capture a screenshot on error
    try {
      const page = (await browser.contexts())[0]?.pages()[0];
      if (page) {
        await page.screenshot({ path: 'telehealth-test-error.png', fullPage: true });
        console.log('📸 Error screenshot saved: telehealth-test-error.png');
      }
    } catch (screenshotError) {
      console.log('Could not capture error screenshot');
    }
  } finally {
    await browser.close();
  }
}

// Run the test
testTelehealthSession().catch(console.error);