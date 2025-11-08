# Playwright Browser Extensions Testing Guide

**Created:** January 7, 2025
**Purpose:** Enhanced testing capabilities for Material-UI components and complex React forms

---

## Overview

This guide explains how to use browser extensions with Playwright to improve testing capabilities, especially for Material-UI components that are challenging to automate with standard Playwright methods.

## Why Browser Extensions?

You mentioned: *"My question is for development/testing, because I see sometimes you have difficulties using Playwright"*

Indeed, Material-UI components like Autocomplete, DatePickers, and complex form interactions can be difficult to automate. Browser extensions help by:

1. **Adding test IDs automatically** to Material-UI components
2. **Exposing helper functions** directly in the browser context
3. **Providing visual feedback** during test execution
4. **Enabling debug mode** with Chrome DevTools
5. **Intercepting and modifying** component behavior for testing

---

## Setup Complete ✅

The following files have been created:

```
mentalspace-ehr-v2/
├── playwright-with-extensions.config.ts    # Enhanced Playwright config
├── setup-browser-extensions.js             # Setup script
├── test-extensions/                        # Browser extensions
│   ├── react-devtools/                    # React DevTools Helper
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   └── content.js
│   └── mui-helper/                        # Material-UI Testing Helper
│       ├── manifest.json
│       └── mui-helper.js
├── tests/
│   ├── helpers/
│   │   └── mui-test-helpers.ts            # MUI testing utilities
│   └── telehealth-with-helpers.spec.ts    # Example test with helpers
```

---

## How to Use

### 1. Run Tests with Extensions

```bash
# Standard run with extensions
npx playwright test --config=playwright-with-extensions.config.ts

# Run specific test with visual browser
npx playwright test tests/telehealth-with-helpers.spec.ts --headed

# Debug mode (slow actions + DevTools)
npx playwright test --config=playwright-with-extensions.config.ts --project=chromium-debug
```

### 2. Using MUI Test Helpers in Your Tests

```typescript
import { test, expect } from '@playwright/test';
import { MUITestHelpers } from './helpers/mui-test-helpers';

test('Create appointment with MUI components', async ({ page }) => {
  const muiHelper = new MUITestHelpers(page);

  // Login
  await page.goto('http://localhost:5175');
  // ... login steps ...

  // Use helper for Material-UI Autocomplete
  await muiHelper.selectAutocomplete('Client', 'Amanda Taylor');

  // Use helper for Material-UI DatePicker
  await muiHelper.selectDate('Appointment Date', new Date('2025-01-08'));

  // Use helper for Material-UI TimePicker
  await muiHelper.selectTime('Start Time', '14:00');

  // Use helper for Material-UI Select
  await muiHelper.selectDropdown('Service Location', 'Telehealth');

  // Submit and wait for response
  await muiHelper.submitFormAndWait('Create Appointment');

  // Check for success notification
  const success = await muiHelper.waitForSnackbar('Appointment created', 'success');
  expect(success).toBeTruthy();
});
```

### 3. Available Helper Methods

#### **Autocomplete Components**
```typescript
// Standard selection
await muiHelper.selectAutocomplete('Label', 'Option Text');

// With options
await muiHelper.selectAutocomplete('Label', 'Option Text', {
  exactMatch: true,        // Exact text matching
  waitForOptions: 3000,    // Wait time for dropdown
  clickTwice: true        // Some components need double-click
});

// Keyboard navigation
await muiHelper.selectAutocompleteByKeyboard('Label', 'Option Text');

// Force selection (last resort)
await muiHelper.forceSelectAutocomplete('fieldName', value, 'Display Text');

// Special handler for problematic client selection
await muiHelper.selectClientInAppointmentForm('Amanda Taylor');
```

#### **Date and Time Pickers**
```typescript
// Date selection
await muiHelper.selectDate('Date Label', new Date('2025-01-08'));

// Time selection
await muiHelper.selectTime('Time Label', '14:30');
```

#### **Dropdowns and Checkboxes**
```typescript
// Select dropdown
await muiHelper.selectDropdown('Status', 'SCHEDULED');

// Toggle checkbox
await muiHelper.toggleCheckbox('I agree to terms', true);
```

#### **Form Submission**
```typescript
// Submit and wait
await muiHelper.submitFormAndWait('Submit Button Text', true);
```

#### **Notifications**
```typescript
// Wait for Material-UI Snackbar
await muiHelper.waitForSnackbar('Success message', 'success');
```

#### **Complete Form Filling**
```typescript
// Fill entire appointment form
await muiHelper.fillAppointmentForm({
  appointmentType: 'Telehealth',
  client: 'Amanda Taylor',
  clinician: 'Dr. Sarah Johnson',
  date: new Date('2025-01-08'),
  startTime: '14:00',
  endTime: '15:00',
  serviceLocation: 'Telehealth',
  status: 'SCHEDULED',
  notes: 'Test appointment'
});
```

---

## Browser Extension Features

### 1. React DevTools Helper

Automatically adds `data-testid` attributes to components:
- `mui-autocomplete-0`, `mui-autocomplete-1`, etc.
- `mui-select-0`, `mui-select-1`, etc.

### 2. MUI Testing Helper

Exposes window functions for Playwright:

```javascript
// In Playwright, you can use these via page.evaluate():
await page.evaluate(() => {
  // Get all autocomplete options
  const options = window.__muiTestHelpers.getAutocompleteOptions('Client');

  // Force set a value
  window.__muiTestHelpers.setAutocompleteValue('Client', 'Amanda Taylor');

  // Get form validation errors
  const errors = window.__muiTestHelpers.getFormErrors();

  // Debug form state
  const formState = window.__muiTestHelpers.debugFormState();
});
```

---

## Configuration Options

### playwright-with-extensions.config.ts

Three project configurations available:

1. **chromium-with-extensions**: Standard testing with extensions
2. **chromium-debug**: Slow mode + DevTools for debugging
3. **chromium-headless**: CI/CD mode (no extensions)

Key settings:
- `actionTimeout: 15000` - Increased timeout for MUI interactions
- `headless: false` - Required for extensions to work
- `slowMo: 500` - Debug mode slows actions by 500ms

---

## Troubleshooting

### Problem: "Extensions not loading"
**Solution:** Extensions only work in headed mode (`--headed` flag)

### Problem: "Autocomplete not selecting value"
**Solution:** Try different strategies in order:
1. `selectAutocomplete()` - Standard method
2. `selectAutocompleteByKeyboard()` - Keyboard navigation
3. `forceSelectAutocomplete()` - JavaScript injection

### Problem: "Test running too fast"
**Solution:** Use debug mode:
```bash
npx playwright test --project=chromium-debug
```

### Problem: "Can't see what's happening"
**Solution:** Use headed mode with screenshots:
```bash
npx playwright test --headed --screenshot=on
```

---

## Testing the Appointment Creation Issue

With these new tools, we can better handle the problematic appointment form:

```typescript
test('Fix appointment creation with enhanced helpers', async ({ page }) => {
  const muiHelper = new MUITestHelpers(page);

  // Login and navigate
  await page.goto('http://localhost:5175');
  await page.fill('input[name="email"]', 'admin@mentalspace.com');
  await page.fill('input[name="password"]', 'SecureAdmin123!');
  await page.click('button[type="submit"]');

  await page.waitForLoadState('networkidle');
  await page.click('text=Appointments');
  await page.click('text=New Appointment');

  // Debug available options first
  await muiHelper.debugAutocompleteOptions('Client');

  // Use special client selection handler
  await muiHelper.selectClientInAppointmentForm('Amanda Taylor');

  // Fill rest of form
  await muiHelper.selectAutocomplete('Clinician', 'Dr. Sarah Johnson');
  await muiHelper.selectDate('Date', new Date());
  await muiHelper.selectTime('Start Time', '14:00');
  await muiHelper.selectTime('End Time', '15:00');
  await muiHelper.selectDropdown('Service Location', 'Telehealth');
  await muiHelper.selectDropdown('Status', 'SCHEDULED');

  // Submit
  await muiHelper.submitFormAndWait('Create Appointment');

  // If it fails, check errors
  const errors = await page.evaluate(() => {
    return window.__muiTestHelpers?.getFormErrors();
  });

  if (errors?.length) {
    console.log('Form validation errors:', errors);
  }
});
```

---

## Benefits Over Standard Playwright

1. **Better MUI Component Handling**: Specialized methods for each component type
2. **Multiple Selection Strategies**: Falls back to alternatives if primary method fails
3. **Debug Capabilities**: Visual feedback and slow mode for troubleshooting
4. **Form State Inspection**: Can query form validation state directly
5. **Automatic Test IDs**: Extensions add identifiers to components
6. **Browser Context Access**: Direct JavaScript execution for complex scenarios

---

## Next Steps

1. **Test telehealth with new helpers**:
   ```bash
   npx playwright test tests/telehealth-with-helpers.spec.ts --headed
   ```

2. **Debug appointment form issue**:
   ```bash
   npx playwright test --project=chromium-debug
   ```

3. **Add more test cases** using the MUI helpers

4. **Customize extensions** further if needed (edit files in `test-extensions/`)

---

## Summary

These browser extensions and helper utilities specifically address the Material-UI testing challenges you've observed. They provide multiple strategies for interacting with complex components and offer better debugging capabilities when tests fail.

The extensions work by:
- Injecting helper code into the page context
- Adding test identifiers to components
- Exposing utility functions for Playwright
- Providing visual feedback during test execution

This should significantly improve the reliability and debuggability of Playwright tests for your MentalSpace EHR application.