
// Helper for Material-UI component testing
console.log('React DevTools Helper loaded');

// Add data-testid attributes to components that don't have them
document.addEventListener('DOMContentLoaded', () => {
  // Add test IDs to MUI Autocomplete components
  const autocompletes = document.querySelectorAll('.MuiAutocomplete-root');
  autocompletes.forEach((el, index) => {
    if (!el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', `mui-autocomplete-${index}`);
    }
  });

  // Add test IDs to MUI Select components
  const selects = document.querySelectorAll('.MuiSelect-root');
  selects.forEach((el, index) => {
    if (!el.getAttribute('data-testid')) {
      el.setAttribute('data-testid', `mui-select-${index}`);
    }
  });
});