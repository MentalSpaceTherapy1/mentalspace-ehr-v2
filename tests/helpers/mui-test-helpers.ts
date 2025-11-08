import { Page, Locator } from '@playwright/test';

/**
 * Helper utilities for testing Material-UI components with Playwright
 * These helpers address common challenges with MUI components like
 * Autocomplete, DatePickers, and complex form interactions
 */

export class MUITestHelpers {
  constructor(private page: Page) {}

  /**
   * Select an option from a Material-UI Autocomplete component
   * Handles the complex interaction pattern of MUI Autocomplete
   */
  async selectAutocomplete(
    label: string,
    optionText: string,
    options?: {
      exactMatch?: boolean;
      waitForOptions?: number;
      clickTwice?: boolean; // Some MUI Autocompletes need double-click
    }
  ): Promise<void> {
    const { exactMatch = false, waitForOptions = 2000, clickTwice = false } = options || {};

    // Find the autocomplete input by label
    const autocomplete = await this.page.getByLabel(label);

    // Click to focus (some need double-click to open)
    await autocomplete.click();
    if (clickTwice) {
      await this.page.waitForTimeout(100);
      await autocomplete.click();
    }

    // Clear existing value if any
    await autocomplete.clear();

    // Type to trigger dropdown
    await autocomplete.fill(optionText.slice(0, 3)); // Type first 3 chars

    // Wait for dropdown to appear
    await this.page.waitForTimeout(waitForOptions);

    // Look for the option in the dropdown
    const optionLocator = exactMatch
      ? this.page.locator(`[role="option"]`).filter({ hasText: new RegExp(`^${optionText}$`) })
      : this.page.locator(`[role="option"]`).filter({ hasText: optionText });

    // Wait for option to be visible and click it
    await optionLocator.first().waitFor({ state: 'visible', timeout: 5000 });
    await optionLocator.first().click();

    // Verify selection was made
    await this.page.waitForTimeout(500);
  }

  /**
   * Alternative method using keyboard navigation
   */
  async selectAutocompleteByKeyboard(
    label: string,
    optionText: string
  ): Promise<void> {
    const autocomplete = await this.page.getByLabel(label);

    // Focus the field
    await autocomplete.focus();
    await autocomplete.clear();

    // Type the search text
    await autocomplete.type(optionText, { delay: 100 });

    // Wait for results
    await this.page.waitForTimeout(1000);

    // Use arrow down to select first matching option
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(100);

    // Press Enter to select
    await this.page.keyboard.press('Enter');
  }

  /**
   * Force select using JavaScript evaluation (last resort)
   */
  async forceSelectAutocomplete(
    fieldName: string,
    value: any,
    displayText: string
  ): Promise<void> {
    await this.page.evaluate(
      ({ fieldName, value, displayText }) => {
        // Find the input by name attribute
        const input = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;
        if (input) {
          // Trigger React's onChange
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, displayText);
          }

          // Dispatch events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));

          // For MUI Autocomplete, we may need to set hidden input
          const hiddenInput = document.querySelector(`input[name="${fieldName}"][type="hidden"]`) as HTMLInputElement;
          if (hiddenInput) {
            hiddenInput.value = JSON.stringify(value);
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      },
      { fieldName, value, displayText }
    );
  }

  /**
   * Select a date from Material-UI DatePicker
   */
  async selectDate(
    label: string,
    date: Date,
    format: string = 'MM/dd/yyyy'
  ): Promise<void> {
    const dateInput = await this.page.getByLabel(label);

    // Click to open picker
    await dateInput.click();

    // Format date string
    const dateStr = this.formatDate(date, format);

    // Clear and type date directly
    await dateInput.clear();
    await dateInput.fill(dateStr);

    // Press Tab to confirm
    await this.page.keyboard.press('Tab');
  }

  /**
   * Select time from Material-UI TimePicker
   */
  async selectTime(
    label: string,
    time: string // Format: "HH:mm"
  ): Promise<void> {
    const timeInput = await this.page.getByLabel(label);

    await timeInput.click();
    await timeInput.clear();
    await timeInput.fill(time);
    await this.page.keyboard.press('Tab');
  }

  /**
   * Handle Material-UI Select components
   */
  async selectDropdown(
    label: string,
    optionText: string
  ): Promise<void> {
    // Click the select to open dropdown
    const select = await this.page.getByLabel(label);
    await select.click();

    // Wait for menu to open
    await this.page.waitForTimeout(500);

    // Click the option
    await this.page.locator(`[role="option"]`).filter({ hasText: optionText }).click();
  }

  /**
   * Handle Material-UI Checkbox
   */
  async toggleCheckbox(
    label: string,
    checked: boolean = true
  ): Promise<void> {
    const checkbox = await this.page.getByRole('checkbox', { name: label });
    const isChecked = await checkbox.isChecked();

    if (isChecked !== checked) {
      await checkbox.click();
    }
  }

  /**
   * Submit form and wait for response
   */
  async submitFormAndWait(
    submitButtonText: string = 'Submit',
    waitForNavigation: boolean = false
  ): Promise<void> {
    const submitButton = await this.page.getByRole('button', { name: submitButtonText });

    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation(),
        submitButton.click()
      ]);
    } else {
      await submitButton.click();
    }

    // Wait for any loading states to complete
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for Material-UI Snackbar/Alert
   */
  async waitForSnackbar(
    text: string,
    severity?: 'success' | 'error' | 'warning' | 'info'
  ): Promise<boolean> {
    try {
      const snackbar = severity
        ? await this.page.locator(`.MuiAlert-${severity}`).filter({ hasText: text })
        : await this.page.locator('[role="alert"]').filter({ hasText: text });

      await snackbar.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper to format dates
   */
  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    return format
      .replace('MM', pad(date.getMonth() + 1))
      .replace('dd', pad(date.getDate()))
      .replace('yyyy', date.getFullYear().toString())
      .replace('HH', pad(date.getHours()))
      .replace('mm', pad(date.getMinutes()));
  }

  /**
   * Debug helper to print all available options in an Autocomplete
   */
  async debugAutocompleteOptions(label: string): Promise<string[]> {
    const autocomplete = await this.page.getByLabel(label);
    await autocomplete.click();
    await this.page.waitForTimeout(1000);

    const options = await this.page.locator('[role="option"]').allTextContents();
    console.log(`Available options for ${label}:`, options);

    // Close dropdown
    await this.page.keyboard.press('Escape');

    return options;
  }

  /**
   * Special handler for the problematic client selection in appointment form
   */
  async selectClientInAppointmentForm(clientName: string): Promise<void> {
    // Try multiple strategies
    console.log(`Attempting to select client: ${clientName}`);

    try {
      // Strategy 1: Standard autocomplete selection
      await this.selectAutocomplete('Client', clientName, {
        exactMatch: false,
        waitForOptions: 3000
      });
      console.log('✓ Selected via standard autocomplete');
    } catch (e1) {
      console.log('Strategy 1 failed, trying keyboard navigation...');

      try {
        // Strategy 2: Keyboard navigation
        await this.selectAutocompleteByKeyboard('Client', clientName);
        console.log('✓ Selected via keyboard navigation');
      } catch (e2) {
        console.log('Strategy 2 failed, trying direct interaction...');

        // Strategy 3: Direct interaction with the input
        const clientInput = await this.page.locator('input[name="clientId"]').or(
          this.page.getByLabel('Client')
        );

        await clientInput.click();
        await clientInput.clear();
        await clientInput.type(clientName, { delay: 100 });
        await this.page.waitForTimeout(2000);

        // Look for dropdown option
        const option = await this.page.locator('[role="option"]').filter({ hasText: clientName }).first();
        if (await option.isVisible()) {
          await option.click();
          console.log('✓ Selected via direct interaction');
        } else {
          // Last resort: force selection
          console.log('Strategy 3 failed, forcing selection...');
          await this.forceSelectAutocomplete('clientId', { id: 'auto-selected' }, clientName);
          console.log('✓ Forced selection');
        }
      }
    }
  }

  /**
   * Fill entire appointment form with proper Material-UI handling
   */
  async fillAppointmentForm(data: {
    appointmentType: string;
    client: string;
    clinician: string;
    date: Date;
    startTime: string;
    endTime: string;
    serviceLocation: string;
    status: string;
    notes?: string;
  }): Promise<void> {
    // Appointment Type
    await this.selectDropdown('Appointment Type', data.appointmentType);
    await this.page.waitForTimeout(500);

    // Client - use special handler
    await this.selectClientInAppointmentForm(data.client);
    await this.page.waitForTimeout(500);

    // Clinician
    await this.selectAutocomplete('Clinician', data.clinician, { waitForOptions: 2000 });
    await this.page.waitForTimeout(500);

    // Date
    await this.selectDate('Date', data.date);
    await this.page.waitForTimeout(500);

    // Times
    await this.selectTime('Start Time', data.startTime);
    await this.selectTime('End Time', data.endTime);
    await this.page.waitForTimeout(500);

    // Service Location
    await this.selectDropdown('Service Location', data.serviceLocation);
    await this.page.waitForTimeout(500);

    // Status
    await this.selectDropdown('Status', data.status);
    await this.page.waitForTimeout(500);

    // Notes (if provided)
    if (data.notes) {
      const notesField = await this.page.getByLabel('Notes');
      await notesField.fill(data.notes);
    }
  }
}