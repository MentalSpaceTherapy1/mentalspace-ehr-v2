/**
 * Setup script for browser extensions used with Playwright testing
 * This script downloads and prepares browser extensions for testing Material-UI components
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Create directory for test extensions
const extensionsDir = path.join(__dirname, 'test-extensions');
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir);
}

console.log('📦 Setting up browser extensions for Playwright testing...\n');

// Extension configurations
const extensions = {
  'react-devtools': {
    description: 'React Developer Tools - Helps inspect React component tree',
    url: 'https://github.com/facebook/react/tree/main/packages/react-devtools-extensions',
    setup: () => {
      // Create a minimal React DevTools extension for testing
      const extDir = path.join(extensionsDir, 'react-devtools');
      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir);
      }

      // Create manifest.json
      const manifest = {
        "manifest_version": 3,
        "name": "React DevTools Helper",
        "version": "1.0",
        "description": "Helps with React component testing",
        "permissions": ["activeTab", "storage"],
        "action": {
          "default_popup": "popup.html"
        },
        "content_scripts": [{
          "matches": ["<all_urls>"],
          "js": ["content.js"],
          "run_at": "document_idle"
        }]
      };

      fs.writeFileSync(
        path.join(extDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Create popup.html
      const popupHtml = `<!DOCTYPE html>
<html>
<head><title>React DevTools Helper</title></head>
<body>
  <h3>React DevTools Helper</h3>
  <p>Active for testing</p>
</body>
</html>`;

      fs.writeFileSync(path.join(extDir, 'popup.html'), popupHtml);

      // Create content.js - Adds data attributes to help locate React components
      const contentJs = `
// Helper for Material-UI component testing
console.log('React DevTools Helper loaded');

// Add data-testid attributes to components that don't have them
document.addEventListener('DOMContentLoaded', () => {
  // Add test IDs to MUI Autocomplete components
  const autocompletes = document.querySelectorAll('.MuiAutocomplete-root');
  autocompletes.forEach((el, index) => {
    if (!el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', \`mui-autocomplete-\${index}\`);
    }
  });

  // Add test IDs to MUI Select components
  const selects = document.querySelectorAll('.MuiSelect-root');
  selects.forEach((el, index) => {
    if (!el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', \`mui-select-\${index}\`);
    }
  });
});`;

      fs.writeFileSync(path.join(extDir, 'content.js'), contentJs);
      console.log('✅ React DevTools Helper extension created');
    }
  },
  'mui-helper': {
    description: 'Material-UI Testing Helper - Adds test hooks to MUI components',
    setup: () => {
      const extDir = path.join(extensionsDir, 'mui-helper');
      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir);
      }

      // Create manifest.json
      const manifest = {
        "manifest_version": 3,
        "name": "MUI Testing Helper",
        "version": "1.0",
        "description": "Enhances Material-UI components for testing",
        "permissions": ["activeTab", "scripting"],
        "content_scripts": [{
          "matches": ["http://localhost:*/*"],
          "js": ["mui-helper.js"],
          "run_at": "document_idle",
          "all_frames": true
        }]
      };

      fs.writeFileSync(
        path.join(extDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Create mui-helper.js - Enhances MUI components for testing
      const muiHelper = `
console.log('MUI Testing Helper loaded');

// Helper functions exposed to window for Playwright
window.__muiTestHelpers = {
  // Get all MUI Autocomplete options
  getAutocompleteOptions: (labelText) => {
    const label = Array.from(document.querySelectorAll('label')).find(
      el => el.textContent.includes(labelText)
    );
    if (!label) return [];

    const input = document.getElementById(label.getAttribute('for'));
    if (!input) return [];

    // Trigger dropdown
    input.click();
    input.focus();

    setTimeout(() => {
      const options = Array.from(document.querySelectorAll('[role="option"]')).map(
        el => ({ text: el.textContent, value: el.getAttribute('data-value') })
      );
      return options;
    }, 500);
  },

  // Force set autocomplete value
  setAutocompleteValue: (labelText, value) => {
    const label = Array.from(document.querySelectorAll('label')).find(
      el => el.textContent.includes(labelText)
    );
    if (!label) return false;

    const input = document.getElementById(label.getAttribute('for'));
    if (!input) return false;

    // Set value and trigger change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(input, value);

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  },

  // Get form validation errors
  getFormErrors: () => {
    const errors = Array.from(document.querySelectorAll('.MuiFormHelperText-root.Mui-error')).map(
      el => ({ field: el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent, message: el.textContent })
    );
    return errors;
  },

  // Debug form state
  debugFormState: () => {
    const formControls = Array.from(document.querySelectorAll('.MuiFormControl-root'));
    return formControls.map(control => {
      const label = control.querySelector('label')?.textContent;
      const input = control.querySelector('input, textarea, select');
      const value = input?.value;
      const error = control.querySelector('.MuiFormHelperText-root.Mui-error')?.textContent;
      return { label, value, error };
    });
  }
};

// Auto-add test IDs to Material-UI components
const addTestIds = () => {
  // Autocompletes
  document.querySelectorAll('.MuiAutocomplete-root').forEach((el, i) => {
    const label = el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim();
    if (label && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', \`autocomplete-\${label.toLowerCase().replace(/\\s+/g, '-')}\`);
    }
  });

  // Select dropdowns
  document.querySelectorAll('.MuiSelect-root').forEach((el, i) => {
    const label = el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim();
    if (label && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', \`select-\${label.toLowerCase().replace(/\\s+/g, '-')}\`);
    }
  });

  // Date pickers
  document.querySelectorAll('.MuiDatePicker-root, .MuiDateTimePicker-root').forEach((el, i) => {
    const label = el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim();
    if (label && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', \`datepicker-\${label.toLowerCase().replace(/\\s+/g, '-')}\`);
    }
  });

  // Buttons
  document.querySelectorAll('button.MuiButton-root').forEach((el, i) => {
    const text = el.textContent?.trim();
    if (text && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', \`button-\${text.toLowerCase().replace(/\\s+/g, '-')}\`);
    }
  });
};

// Run on page load and mutations
addTestIds();
const observer = new MutationObserver(() => addTestIds());
observer.observe(document.body, { childList: true, subtree: true });
`;

      fs.writeFileSync(path.join(extDir, 'mui-helper.js'), muiHelper);
      console.log('✅ MUI Testing Helper extension created');
    }
  }
};

// Set up each extension
Object.entries(extensions).forEach(([name, config]) => {
  console.log(`\n📌 ${config.description}`);
  config.setup();
});

// Create a simple test to verify extensions work
const testFile = `
import { test, expect } from '@playwright/test';
import { MUITestHelpers } from './helpers/mui-test-helpers';

test.describe('Telehealth System Testing with MUI Helpers', () => {
  test('Create appointment using MUI helpers', async ({ page }) => {
    const muiHelper = new MUITestHelpers(page);

    // Login
    await page.goto('http://localhost:5175');
    await page.fill('input[name="email"]', 'admin@mentalspace.com');
    await page.fill('input[name="password"]', 'SecureAdmin123!');
    await page.click('button[type="submit"]');

    // Navigate to appointments
    await page.waitForLoadState('networkidle');
    await page.click('text=Appointments');
    await page.click('text=New Appointment');

    // Fill appointment form using MUI helpers
    await muiHelper.fillAppointmentForm({
      appointmentType: 'Telehealth',
      client: 'Amanda Taylor',
      clinician: 'Dr. Sarah Johnson',
      date: new Date('2025-01-08'),
      startTime: '14:00',
      endTime: '15:00',
      serviceLocation: 'Telehealth',
      status: 'SCHEDULED',
      notes: 'Test telehealth appointment created with MUI helpers'
    });

    // Submit form
    await muiHelper.submitFormAndWait('Create Appointment', false);

    // Check for success
    const success = await muiHelper.waitForSnackbar('Appointment created successfully', 'success');
    expect(success).toBeTruthy();
  });

  test('Test telehealth session with helpers', async ({ page }) => {
    const muiHelper = new MUITestHelpers(page);

    // Use the appointment we created via direct DB insertion
    const appointmentId = 'cca89f1c-24b5-42a7-960f-8ae3939107c0';

    await page.goto(\`http://localhost:5175/telehealth/session/\${appointmentId}\`);

    // Check consent status
    const consentBadge = await page.locator('.consent-status-badge');
    const consentStatus = await consentBadge.textContent();

    if (consentStatus?.includes('Required')) {
      // Sign consent using helpers
      await page.click('text=Sign Consent');

      // Use MUI helper for checkboxes
      await muiHelper.toggleCheckbox('I understand this is a telehealth session', true);
      await muiHelper.toggleCheckbox('I consent to the use of telehealth technology', true);
      await muiHelper.toggleCheckbox('I am located in the state of Georgia', true);
      await muiHelper.toggleCheckbox('I understand technical issues may occur', true);

      // Sign
      await page.fill('input[name="signature"]', 'Test Client');
      await page.click('button:has-text("Submit Consent")');
    }

    // Test device and join session
    await page.click('text=Test Your Device');
    await page.waitForTimeout(2000);
    await page.click('text=Join Session');

    // Verify we're in the video session
    await expect(page.locator('.video-container')).toBeVisible({ timeout: 10000 });
  });
});
`;

fs.writeFileSync(path.join(__dirname, 'tests', 'telehealth-with-helpers.spec.ts'), testFile);

console.log('\n✅ Browser extensions setup complete!');
console.log('\n📝 How to use:');
console.log('1. Run tests with extensions:');
console.log('   npx playwright test --config=playwright-with-extensions.config.ts');
console.log('\n2. Run specific test with helpers:');
console.log('   npx playwright test tests/telehealth-with-helpers.spec.ts --headed');
console.log('\n3. Debug mode with extensions:');
console.log('   npx playwright test --config=playwright-with-extensions.config.ts --project=chromium-debug');
console.log('\n4. Use MUI helpers in your tests:');
console.log('   import { MUITestHelpers } from "./helpers/mui-test-helpers";');
console.log('   const muiHelper = new MUITestHelpers(page);');
console.log('\n💡 The extensions add data-testid attributes to Material-UI components');
console.log('   and expose helper functions via window.__muiTestHelpers');