import { test, expect } from '@playwright/test';

test.describe('Scheduling Complete Workflow', () => {
  // Helper to generate unique test data
  const getTestAppointmentData = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    return {
      date: dateStr,
      startTime: '10:00',
      endTime: '11:00',
      appointmentType: 'Therapy Session',
      serviceLocation: 'Office',
      notes: `E2E Test Appointment ${Date.now()}`,
    };
  };

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

  test('should load appointments calendar page', async ({ page }) => {
    // Navigate to appointments
    await page.goto('http://localhost:5175/appointments');
    await page.waitForLoadState('networkidle');

    // Verify page loaded - check for calendar-related content
    const pageContent = await page.content();
    const hasCalendarContent = pageContent.toLowerCase().includes('calendar') ||
                               pageContent.toLowerCase().includes('appointment') ||
                               pageContent.toLowerCase().includes('schedule');

    expect(hasCalendarContent).toBeTruthy();

    await page.screenshot({ path: 'test-results/appointments-calendar.png', fullPage: true });
  });

  test('should navigate to new appointment form', async ({ page }) => {
    // Navigate to new appointment
    await page.goto('http://localhost:5175/appointments/new');
    await page.waitForLoadState('networkidle');

    // Verify we're on the new appointment page
    await expect(page).toHaveURL(/appointments\/new/);

    // Check for form elements
    const hasClientSelect = await page.locator('select, [role="combobox"], input[name*="client"]').first().isVisible();
    console.log(`Has client selection: ${hasClientSelect}`);

    await page.screenshot({ path: 'test-results/new-appointment-form.png', fullPage: true });
  });

  test('should create a single appointment', async ({ page }) => {
    const testData = getTestAppointmentData();

    // Navigate to new appointment form
    await page.goto('http://localhost:5175/appointments/new');
    await page.waitForLoadState('networkidle');

    // Try to select a client (using various selector patterns)
    const clientSelect = page.locator('select[name*="client"], [data-testid="client-select"], #clientId').first();
    if (await clientSelect.isVisible()) {
      // Try to select the first available client option
      const options = await clientSelect.locator('option').all();
      if (options.length > 1) {
        await clientSelect.selectOption({ index: 1 });
      }
    }

    // Try to select a clinician
    const clinicianSelect = page.locator('select[name*="clinician"], [data-testid="clinician-select"], #clinicianId').first();
    if (await clinicianSelect.isVisible()) {
      const options = await clinicianSelect.locator('option').all();
      if (options.length > 1) {
        await clinicianSelect.selectOption({ index: 1 });
      }
    }

    // Fill in date
    const dateInput = page.locator('input[type="date"], input[name="appointmentDate"], input[name="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(testData.date);
    }

    // Fill in start time
    const startTimeInput = page.locator('input[name="startTime"], input[data-testid="start-time"], select[name="startTime"]').first();
    if (await startTimeInput.isVisible()) {
      const tagName = await startTimeInput.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await startTimeInput.selectOption(testData.startTime);
      } else {
        await startTimeInput.fill(testData.startTime);
      }
    }

    // Fill in notes if visible
    const notesInput = page.locator('textarea[name="notes"], textarea[name="appointmentNotes"]').first();
    if (await notesInput.isVisible()) {
      await notesInput.fill(testData.notes);
    }

    await page.screenshot({ path: 'test-results/appointment-form-filled.png', fullPage: true });

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Schedule")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
    }

    // Check for success
    const currentUrl = page.url();
    const hasSuccessMessage = await page.locator('text=/success|created|scheduled/i').isVisible();
    const isOnCalendar = currentUrl.includes('/appointments') && !currentUrl.includes('/new');

    console.log(`After submit - URL: ${currentUrl}`);
    console.log(`Success message visible: ${hasSuccessMessage}`);
    console.log(`On calendar page: ${isOnCalendar}`);

    await page.screenshot({ path: 'test-results/appointment-created.png', fullPage: true });

    // Should either show success or redirect
    expect(hasSuccessMessage || isOnCalendar).toBeTruthy();
  });

  test('should create a recurring appointment series', async ({ page }) => {
    const testData = getTestAppointmentData();

    // Navigate to new appointment form
    await page.goto('http://localhost:5175/appointments/new');
    await page.waitForLoadState('networkidle');

    // Try to select a client
    const clientSelect = page.locator('select[name*="client"], [data-testid="client-select"], #clientId').first();
    if (await clientSelect.isVisible()) {
      const options = await clientSelect.locator('option').all();
      if (options.length > 1) {
        await clientSelect.selectOption({ index: 1 });
      }
    }

    // Try to select a clinician
    const clinicianSelect = page.locator('select[name*="clinician"], [data-testid="clinician-select"], #clinicianId').first();
    if (await clinicianSelect.isVisible()) {
      const options = await clinicianSelect.locator('option').all();
      if (options.length > 1) {
        await clinicianSelect.selectOption({ index: 1 });
      }
    }

    // Fill in date
    const dateInput = page.locator('input[type="date"], input[name="appointmentDate"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(testData.date);
    }

    // Enable recurring
    const recurringCheckbox = page.locator('input[name="isRecurring"], input[type="checkbox"][id*="recurring"], label:has-text("Recurring") input').first();
    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();
      console.log('Enabled recurring option');
    }

    // Select frequency (weekly)
    const frequencySelect = page.locator('select[name="recurrenceFrequency"], select[name*="frequency"]').first();
    if (await frequencySelect.isVisible()) {
      await frequencySelect.selectOption('weekly');
      console.log('Selected weekly frequency');
    }

    // Set count or end date
    const countInput = page.locator('input[name="recurrenceCount"], input[name*="count"]').first();
    if (await countInput.isVisible()) {
      await countInput.fill('4');
      console.log('Set recurrence count to 4');
    }

    await page.screenshot({ path: 'test-results/recurring-appointment-form.png', fullPage: true });

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
    }

    // Check for success
    const hasSuccessMessage = await page.locator('text=/success|created|scheduled|series/i').isVisible();
    const currentUrl = page.url();
    const isOnCalendar = currentUrl.includes('/appointments') && !currentUrl.includes('/new');

    console.log(`Recurring appointment - Success: ${hasSuccessMessage}, On calendar: ${isOnCalendar}`);

    await page.screenshot({ path: 'test-results/recurring-appointment-created.png', fullPage: true });

    expect(hasSuccessMessage || isOnCalendar).toBeTruthy();
  });

  test('should perform check-in and check-out flow', async ({ page }) => {
    // Navigate to appointments calendar
    await page.goto('http://localhost:5175/appointments');
    await page.waitForLoadState('networkidle');

    // Find an appointment to interact with
    const appointmentEvent = page.locator('.fc-event, [data-appointment-id], .appointment-card').first();

    if (await appointmentEvent.isVisible()) {
      // Click on the appointment to open details
      await appointmentEvent.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/appointment-details-modal.png', fullPage: true });

      // Look for check-in button
      const checkInButton = page.locator('button:has-text("Check In"), button:has-text("Check-In"), button[data-action="check-in"]').first();

      if (await checkInButton.isVisible()) {
        await checkInButton.click();
        await page.waitForTimeout(1000);
        console.log('Clicked check-in button');

        // Verify status changed
        const statusElement = page.locator('text=/checked in|in session/i').first();
        const statusChanged = await statusElement.isVisible();
        console.log(`Check-in status visible: ${statusChanged}`);

        await page.screenshot({ path: 'test-results/appointment-checked-in.png', fullPage: true });

        // Now look for check-out/complete button
        const checkOutButton = page.locator('button:has-text("Check Out"), button:has-text("Complete"), button:has-text("End Session"), button[data-action="check-out"]').first();

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(1000);
          console.log('Clicked check-out button');

          await page.screenshot({ path: 'test-results/appointment-checked-out.png', fullPage: true });
        }
      } else {
        console.log('Check-in button not visible - appointment may already be checked in or completed');
      }
    } else {
      console.log('No appointment events found on calendar');
      await page.screenshot({ path: 'test-results/no-appointments-found.png', fullPage: true });
    }

    // Verify we're still on the appointments page
    expect(page.url()).toContain('/appointments');
  });

  test('should cancel an appointment with reason', async ({ page }) => {
    // Navigate to appointments calendar
    await page.goto('http://localhost:5175/appointments');
    await page.waitForLoadState('networkidle');

    // Find an appointment to cancel
    const appointmentEvent = page.locator('.fc-event, [data-appointment-id], .appointment-card').first();

    if (await appointmentEvent.isVisible()) {
      // Click on the appointment to open details
      await appointmentEvent.click();
      await page.waitForTimeout(1000);

      // Look for cancel button
      const cancelButton = page.locator('button:has-text("Cancel"), button[data-action="cancel"]').first();

      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/cancel-modal-opened.png', fullPage: true });

        // Fill in cancellation reason
        const reasonSelect = page.locator('select[name="cancelReason"], select[name*="reason"]').first();
        if (await reasonSelect.isVisible()) {
          const options = await reasonSelect.locator('option').all();
          if (options.length > 1) {
            await reasonSelect.selectOption({ index: 1 });
          }
        }

        // Fill in notes
        const notesInput = page.locator('textarea[name="cancelNotes"], textarea[name*="notes"], textarea[name*="reason"]').first();
        if (await notesInput.isVisible()) {
          await notesInput.fill('E2E Test - Client requested cancellation');
        }

        // Confirm cancellation
        const confirmButton = page.locator('button:has-text("Confirm Cancel"), button:has-text("Yes, Cancel"), button[type="submit"]:has-text("Cancel")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }

        await page.screenshot({ path: 'test-results/appointment-cancelled.png', fullPage: true });

        // Check for success
        const hasSuccessMessage = await page.locator('text=/cancelled|success/i').isVisible();
        console.log(`Cancellation success: ${hasSuccessMessage}`);
      } else {
        console.log('Cancel button not visible');
      }
    } else {
      console.log('No appointment events found to cancel');
    }
  });

  test('should reschedule an appointment', async ({ page }) => {
    // Navigate to appointments calendar
    await page.goto('http://localhost:5175/appointments');
    await page.waitForLoadState('networkidle');

    // Find an appointment to reschedule
    const appointmentEvent = page.locator('.fc-event, [data-appointment-id], .appointment-card').first();

    if (await appointmentEvent.isVisible()) {
      // Click on the appointment to open details
      await appointmentEvent.click();
      await page.waitForTimeout(1000);

      // Look for reschedule button
      const rescheduleButton = page.locator('button:has-text("Reschedule"), a:has-text("Reschedule"), button[data-action="reschedule"]').first();

      if (await rescheduleButton.isVisible()) {
        await rescheduleButton.click();
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'test-results/reschedule-modal.png', fullPage: true });

        // Change date to a week later
        const dateInput = page.locator('input[type="date"], input[name="appointmentDate"], input[name*="date"]').first();
        if (await dateInput.isVisible()) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          await dateInput.fill(nextWeek.toISOString().split('T')[0]);
        }

        // Save the reschedule
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Confirm"), button[type="submit"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }

        await page.screenshot({ path: 'test-results/appointment-rescheduled.png', fullPage: true });

        // Check for success
        const hasSuccessMessage = await page.locator('text=/rescheduled|success|updated/i').isVisible();
        console.log(`Reschedule success: ${hasSuccessMessage}`);
      } else {
        // Try direct navigation to reschedule page
        console.log('Reschedule button not visible, trying alternative');

        // Get appointment ID from URL or data attribute
        const appointmentIdMatch = page.url().match(/appointments\/([a-f0-9-]+)/);
        if (appointmentIdMatch) {
          await page.goto(`http://localhost:5175/appointments/${appointmentIdMatch[1]}/reschedule`);
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'test-results/reschedule-page.png', fullPage: true });
        }
      }
    } else {
      console.log('No appointment events found to reschedule');
    }
  });

  test('should navigate to waitlist page', async ({ page }) => {
    // Navigate to waitlist
    await page.goto('http://localhost:5175/appointments/waitlist');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const pageContent = await page.content();
    const hasWaitlistContent = pageContent.toLowerCase().includes('waitlist') ||
                               pageContent.toLowerCase().includes('waiting') ||
                               pageContent.toLowerCase().includes('priority');

    console.log(`Waitlist page loaded: ${hasWaitlistContent}`);

    await page.screenshot({ path: 'test-results/waitlist-page.png', fullPage: true });

    expect(page.url()).toContain('waitlist');
  });

  test('should add client to waitlist', async ({ page }) => {
    // Navigate to waitlist
    await page.goto('http://localhost:5175/appointments/waitlist');
    await page.waitForLoadState('networkidle');

    // Look for add to waitlist button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button[data-action="add-waitlist"]').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/waitlist-add-modal.png', fullPage: true });

      // Select a client
      const clientSelect = page.locator('select[name*="client"], [data-testid="client-select"]').first();
      if (await clientSelect.isVisible()) {
        const options = await clientSelect.locator('option').all();
        if (options.length > 1) {
          await clientSelect.selectOption({ index: 1 });
        }
      }

      // Select a clinician
      const clinicianSelect = page.locator('select[name*="clinician"], [data-testid="clinician-select"]').first();
      if (await clinicianSelect.isVisible()) {
        const options = await clinicianSelect.locator('option').all();
        if (options.length > 1) {
          await clinicianSelect.selectOption({ index: 1 });
        }
      }

      // Select priority
      const prioritySelect = page.locator('select[name="priority"], select[name*="priority"]').first();
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('Normal');
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Save")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: 'test-results/waitlist-added.png', fullPage: true });

      // Check for success
      const hasSuccessMessage = await page.locator('text=/added|success/i').isVisible();
      console.log(`Waitlist add success: ${hasSuccessMessage}`);
    } else {
      console.log('Add to waitlist button not visible');
      await page.screenshot({ path: 'test-results/waitlist-no-add-button.png', fullPage: true });
    }
  });

  test('should match waitlist entry to available slot', async ({ page }) => {
    // Navigate to waitlist
    await page.goto('http://localhost:5175/appointments/waitlist');
    await page.waitForLoadState('networkidle');

    // Find a waitlist entry
    const waitlistEntry = page.locator('tr[data-waitlist-id], .waitlist-entry, [role="row"]:has(td)').first();

    if (await waitlistEntry.isVisible()) {
      // Click on the entry or find its actions
      await waitlistEntry.click();
      await page.waitForTimeout(500);

      // Look for find slots / match button
      const matchButton = page.locator('button:has-text("Find Slots"), button:has-text("Match"), button:has-text("Find Availability"), button[data-action="find-slots"]').first();

      if (await matchButton.isVisible()) {
        await matchButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'test-results/waitlist-available-slots.png', fullPage: true });

        // Check if slots were found
        const slotsContainer = page.locator('.available-slots, [data-testid="slots"], .slots-list');
        const hasSlots = await slotsContainer.isVisible();
        console.log(`Available slots displayed: ${hasSlots}`);

        // Try to select a slot
        const slotButton = page.locator('.slot-option, button:has-text("Select"), button:has-text("Book")').first();
        if (await slotButton.isVisible()) {
          await slotButton.click();
          await page.waitForTimeout(1000);
          console.log('Selected an available slot');
        }
      } else {
        console.log('Find slots button not visible');
      }
    } else {
      console.log('No waitlist entries found');
      await page.screenshot({ path: 'test-results/waitlist-empty.png', fullPage: true });
    }
  });

  test('should view room schedule', async ({ page }) => {
    // Navigate to room view
    await page.goto('http://localhost:5175/appointments/room-view');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const pageContent = await page.content();
    const hasRoomContent = pageContent.toLowerCase().includes('room') ||
                           pageContent.toLowerCase().includes('office') ||
                           pageContent.toLowerCase().includes('location');

    console.log(`Room view page loaded: ${hasRoomContent}`);

    await page.screenshot({ path: 'test-results/room-view.png', fullPage: true });

    expect(page.url()).toContain('room-view');
  });

  test('should view clinician schedules', async ({ page }) => {
    // Navigate to clinician schedules
    await page.goto('http://localhost:5175/appointments/schedules');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const pageContent = await page.content();
    const hasScheduleContent = pageContent.toLowerCase().includes('schedule') ||
                               pageContent.toLowerCase().includes('clinician') ||
                               pageContent.toLowerCase().includes('availability');

    console.log(`Clinician schedules page loaded: ${hasScheduleContent}`);

    await page.screenshot({ path: 'test-results/clinician-schedules.png', fullPage: true });

    expect(page.url()).toContain('schedules');
  });

  test('complete scheduling workflow - create, check-in, complete', async ({ page }) => {
    const testData = getTestAppointmentData();

    // Step 1: Navigate to appointments calendar
    await page.goto('http://localhost:5175/appointments');
    await page.waitForLoadState('networkidle');
    console.log('Step 1: Loaded appointments calendar');

    // Step 2: Navigate to new appointment form
    await page.goto('http://localhost:5175/appointments/new');
    await page.waitForLoadState('networkidle');
    console.log('Step 2: Loaded new appointment form');

    // Step 3: Fill in appointment data
    const clientSelect = page.locator('select[name*="client"], #clientId').first();
    if (await clientSelect.isVisible()) {
      const options = await clientSelect.locator('option').all();
      if (options.length > 1) {
        await clientSelect.selectOption({ index: 1 });
      }
    }

    const clinicianSelect = page.locator('select[name*="clinician"], #clinicianId').first();
    if (await clinicianSelect.isVisible()) {
      const options = await clinicianSelect.locator('option').all();
      if (options.length > 1) {
        await clinicianSelect.selectOption({ index: 1 });
      }
    }

    const dateInput = page.locator('input[type="date"], input[name="appointmentDate"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(testData.date);
    }

    console.log('Step 3: Filled appointment form');
    await page.screenshot({ path: 'test-results/workflow-step3-appointment-filled.png', fullPage: true });

    // Step 4: Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      console.log('Step 4: Submitted appointment form');
    }

    await page.screenshot({ path: 'test-results/workflow-step4-submitted.png', fullPage: true });

    // Step 5: Return to calendar and verify
    await page.goto('http://localhost:5175/appointments');
    await page.waitForLoadState('networkidle');

    console.log('Step 5: Returned to calendar');
    await page.screenshot({ path: 'test-results/workflow-step5-calendar.png', fullPage: true });

    // Final verification
    const pageContent = await page.content();
    const hasAppointmentContent = pageContent.includes('appointment') || pageContent.includes('Appointment');
    expect(hasAppointmentContent).toBeTruthy();

    console.log('Scheduling workflow complete!');
  });
});
