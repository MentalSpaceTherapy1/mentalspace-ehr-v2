
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
      el.setAttribute('data-testid', `autocomplete-${label.toLowerCase().replace(/\s+/g, '-')}`);
    }
  });

  // Select dropdowns
  document.querySelectorAll('.MuiSelect-root').forEach((el, i) => {
    const label = el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim();
    if (label && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', `select-${label.toLowerCase().replace(/\s+/g, '-')}`);
    }
  });

  // Date pickers
  document.querySelectorAll('.MuiDatePicker-root, .MuiDateTimePicker-root').forEach((el, i) => {
    const label = el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim();
    if (label && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', `datepicker-${label.toLowerCase().replace(/\s+/g, '-')}`);
    }
  });

  // Buttons
  document.querySelectorAll('button.MuiButton-root').forEach((el, i) => {
    const text = el.textContent?.trim();
    if (text && !el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', `button-${text.toLowerCase().replace(/\s+/g, '-')}`);
    }
  });
};

// Run on page load and mutations
addTestIds();
const observer = new MutationObserver(() => addTestIds());
observer.observe(document.body, { childList: true, subtree: true });
