
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

    await page.goto(`http://localhost:5175/telehealth/session/${appointmentId}`);

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
